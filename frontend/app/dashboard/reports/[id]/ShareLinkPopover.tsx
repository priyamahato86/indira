"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ApiShare } from "@/lib/serialize";

type Position = { top: number; left: number; width: number };

const POPOVER_MAX_WIDTH = 380;
const VIEWPORT_PADDING = 12;

export default function ShareLinkPopover({
  caseId,
  initialShare,
  onShareChange,
  onClose,
  anchorRef,
}: {
  caseId: string;
  initialShare: ApiShare | null;
  onShareChange: (share: ApiShare | null) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const [share, setShare] = useState<ApiShare | null>(initialShare);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pos, setPos] = useState<Position | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    function recompute() {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const width = Math.min(POPOVER_MAX_WIDTH, vw - VIEWPORT_PADDING * 2);
      const desiredLeft = rect.right - width;
      const left = Math.max(
        VIEWPORT_PADDING,
        Math.min(desiredLeft, vw - width - VIEWPORT_PADDING),
      );
      const top = rect.bottom + 8;
      setPos({ top, left, width });
    }
    recompute();
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
    };
  }, [anchorRef]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, anchorRef]);

  function buildUrl(token: string): string {
    if (typeof window === "undefined") return `/r/${token}`;
    return `${window.location.origin}/r/${token}`;
  }

  async function enable() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/share`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Could not create share link.");
        return;
      }
      const next: ApiShare | null = data.case?.share ?? null;
      setShare(next);
      onShareChange(next);
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/share`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Could not revoke link.");
        return;
      }
      setShare(null);
      onShareChange(null);
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(buildUrl(share.token));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setErr("Could not copy link.");
    }
  }

  if (!mounted || !pos) return null;

  const url = share ? buildUrl(share.token) : "";

  const popover = (
    <div
      ref={rootRef}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 60,
        color: "var(--color-ink)",
      }}
      className="bg-white border border-line rounded-xl shadow-2xl p-5 animate-[fadeIn_120ms_ease-out]"
      role="dialog"
      aria-modal="false"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand">
            Share report
          </div>
          <h3 className="mt-0.5 text-[15px] font-semibold tracking-tight">
            {share ? "Public link active" : "Create a public link"}
          </h3>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 -mr-1 -mt-1 rounded-md p-1 text-muted hover:text-ink hover:bg-surface-alt"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {!share ? (
        <>
          <p className="text-[12.5px] text-muted leading-relaxed">
            Generate a secret link anyone can use to view this report —
            read-only, no account needed. You can revoke it anytime.
          </p>
          <button
            onClick={enable}
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-brand hover:bg-brand-hover text-white px-3.5 py-2.5 text-[13px] font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <Spinner /> Creating
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 1 0-5.66-5.66L11.5 7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 1 0 5.66 5.66L12.5 17"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                Create share link
              </>
            )}
          </button>
        </>
      ) : (
        <>
          <div className="flex items-stretch gap-2">
            <input
              type="text"
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 rounded-lg border border-line bg-surface px-3 py-2 text-[12.5px] font-mono text-ink-soft outline-none focus:border-brand"
            />
            <button
              onClick={copy}
              className="shrink-0 rounded-lg bg-brand hover:bg-brand-hover text-white px-3 py-2 text-[12.5px] font-semibold inline-flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12l4 4 10-10"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="9"
                      y="9"
                      width="11"
                      height="11"
                      rx="1.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M5 15V5a1 1 0 0 1 1-1h10"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>

          <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-[#FEF7E0] border border-[#FAD28B] text-[11.5px] text-[#7B4A00] leading-snug">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className="mt-0.5 shrink-0"
            >
              <path
                d="M12 9v4M12 17h.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M10.3 3.5 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
            Anyone with this link can view the full report. Disable it the
            moment you no longer need to share.
          </div>

          <button
            onClick={disable}
            disabled={loading}
            className="mt-3 w-full rounded-lg border border-line hover:border-danger hover:text-danger bg-white px-3 py-2 text-[12.5px] font-semibold text-ink-soft disabled:opacity-60 inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            {loading ? (
              <>
                <Spinner /> Working
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Disable share link
              </>
            )}
          </button>
        </>
      )}

      {err && (
        <p className="mt-3 text-[12px] text-danger leading-snug">{err}</p>
      )}
    </div>
  );

  return createPortal(popover, document.body);
}

function Spinner() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
