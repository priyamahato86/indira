"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ApiCase } from "@/lib/serialize";

function IndiraAvatar({ size = 28 }: { size?: number }) {
  return (
    <Image
      src="/logo.png"
      alt="Indira"
      width={size}
      height={size}
      className="rounded-full shrink-0 bg-brand-subtle"
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  ts: number;
};

type EmailDraft = {
  subject: string;
  body: string;
  to_hint: string;
  insurer: string;
};

const SUGGESTIONS = [
  "Is this diagnosis covered under my policy?",
  "What's the room rent limit?",
  "Are there any waiting periods that apply?",
  "Which exclusions could affect this claim?",
  "What documents am I missing?",
];

function makeId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export default function PolicyChat({ caseData }: { caseData: ApiCase }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = {
      id: makeId(),
      role: "user",
      content: trimmed,
      ts: Date.now(),
    };

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/cases/${caseData.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, history }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not get an answer.");
        return;
      }
      const assistantMsg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: String(data.answer ?? "").trim(),
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void send(input);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <section className="border border-line bg-white overflow-hidden">
      <header className="flex items-center justify-between gap-4 px-7 py-5 border-b border-line bg-gradient-to-r from-brand-subtle to-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shadow-sm">
            <IndiraAvatar size={40} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold tracking-tight">
              Ask Indira about this policy
            </h2>
            <p className="text-[12.5px] text-muted leading-snug">
              Coverage, exclusions, waiting periods, claim eligibility — answers
              grounded in your uploaded documents.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setEmailOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand bg-white text-brand hover:bg-brand hover:text-white transition-colors px-3 py-1.5 text-[12.5px] font-semibold shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 6h16v12H4z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="m4 7 8 6 8-6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
            Draft email
          </button>
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
            <span className="relative inline-flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-success opacity-60 animate-ping" />
              <span className="relative w-2 h-2 rounded-full bg-success" />
            </span>
            Live
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="px-5 sm:px-7 py-6 max-h-[520px] min-h-[280px] overflow-y-auto bg-surface scrollbar-auto"
      >
        {!hasMessages && !sending && <EmptyState onPick={(q) => void send(q)} />}

        <div className="space-y-4">
          {messages.map((m) => (
            <Bubble key={m.id} msg={m} />
          ))}
          {sending && <TypingBubble />}
        </div>
      </div>

      {error && (
        <div className="px-7 py-2.5 border-t border-red-100 bg-red-50 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="border-t border-line bg-white px-3 sm:px-4 py-3"
      >
        <div className="flex items-end gap-2 rounded-xl border border-line bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 transition-colors px-3 py-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask anything about this policy or claim…"
            disabled={sending}
            maxLength={1000}
            className="flex-1 resize-none bg-transparent outline-none text-[14px] placeholder:text-muted py-1.5 max-h-32 disabled:opacity-60 scrollbar-pretty"
            style={{
              minHeight: "1.5rem",
            }}
          />
          <button
            type="submit"
            disabled={sending || input.trim().length === 0}
            className="shrink-0 rounded-lg bg-brand hover:bg-brand-hover disabled:bg-line disabled:text-muted text-white px-3.5 py-2 text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors"
            aria-label="Send"
          >
            {sending ? (
              <>
                <Spinner />
                <span className="hidden sm:inline">Thinking</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Send</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </>
            )}
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-muted">
          Press <kbd className="px-1 py-0.5 rounded bg-surface-alt border border-line text-[10px]">Enter</kbd> to send,{" "}
          <kbd className="px-1 py-0.5 rounded bg-surface-alt border border-line text-[10px]">Shift</kbd>+
          <kbd className="px-1 py-0.5 rounded bg-surface-alt border border-line text-[10px]">Enter</kbd> for a new line.
        </p>
      </form>

      {emailOpen && (
        <DraftEmailModal
          caseId={caseData.id}
          onClose={() => setEmailOpen(false)}
        />
      )}
    </section>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="text-center py-6">
      <div className="mx-auto w-14 h-14 rounded-full bg-brand-subtle text-brand flex items-center justify-center mb-4">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3a9 9 0 1 0 6.7 15.05L21 21l-2.95-2.3A9 9 0 0 0 12 3z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M9.5 10.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5v.2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="12" cy="17" r="0.9" fill="currentColor" />
        </svg>
      </div>
      <h3 className="text-[15px] font-semibold tracking-tight">
        What would you like to know?
      </h3>
      <p className="mt-1 text-[13px] text-muted max-w-md mx-auto">
        I can explain anything in your policy and how it applies to this claim.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="text-[12.5px] px-3 py-1.5 rounded-full border border-line bg-white hover:border-brand hover:bg-brand-subtle hover:text-brand text-ink-soft transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] rounded-2xl rounded-tr-md bg-brand text-white px-4 py-2.5 text-[14px] leading-relaxed shadow-sm whitespace-pre-wrap">
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5">
        <IndiraAvatar size={28} />
      </div>
      <div className="max-w-[82%] rounded-2xl rounded-tl-md bg-white border border-line px-4 py-2.5 text-[14px] leading-relaxed text-ink-soft shadow-sm">
        <FormattedAnswer text={msg.content} />
      </div>
    </div>
  );
}

function FormattedAnswer({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-2.5">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => /^\s*[-*•]\s+/.test(l));
        if (isList) {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {lines.map((l, j) => (
                <li key={j}>{l.replace(/^\s*[-*•]\s+/, "")}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {block}
          </p>
        );
      })}
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5">
        <IndiraAvatar size={28} />
      </div>
      <div className="rounded-2xl rounded-tl-md bg-white border border-line px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <Dot delay="0ms" />
          <Dot delay="160ms" />
          <Dot delay="320ms" />
        </div>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-muted/70 animate-bounce"
      style={{ animationDelay: delay, animationDuration: "1s" }}
    />
  );
}

function DraftEmailModal({
  caseId,
  onClose,
}: {
  caseId: string;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void generate("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function generate(extraInstruction: string) {
    setLoading(true);
    setErr(null);
    setCopied(false);
    try {
      const res = await fetch(`/api/cases/${caseId}/draft-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: extraInstruction }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Could not draft an email.");
        return;
      }
      const d = data.draft as EmailDraft;
      setDraft(d);
      setSubject(d.subject);
      setBody(d.body);
    } catch {
      setErr("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyAll() {
    const text = `Subject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErr("Could not copy to clipboard.");
    }
  }

  function openInMail() {
    const params = new URLSearchParams({
      subject,
      body,
    });
    window.location.href = `mailto:?${params.toString()}`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white border border-line shadow-2xl rounded-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-line bg-gradient-to-r from-brand-subtle to-white">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-brand">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 6h16v12H4z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="m4 7 8 6 8-6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
              Email draft
            </div>
            <h3 className="mt-1 text-[18px] font-semibold tracking-tight">
              {draft
                ? `Email to ${draft.insurer}`
                : "Drafting your email…"}
            </h3>
            {draft?.to_hint && (
              <p className="mt-1 text-[12px] text-muted">
                Suggested recipient: {draft.to_hint}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1.5 hover:bg-surface-alt text-muted hover:text-ink transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 scrollbar-pretty">
          {loading ? (
            <DraftSkeleton />
          ) : err ? (
            <div className="border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 rounded">
              {err}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-muted mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-line focus:border-brand focus:ring-2 focus:ring-brand/15 outline-none px-3 py-2 text-[14px] font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-muted mb-1.5">
                  Body
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={12}
                  className="w-full rounded-lg border border-line focus:border-brand focus:ring-2 focus:ring-brand/15 outline-none px-3 py-2.5 text-[14px] leading-relaxed font-mono whitespace-pre-wrap resize-y min-h-[200px] scrollbar-pretty"
                />
              </div>
            </>
          )}

          <div className="border-t border-line pt-4">
            <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-muted mb-1.5">
              Refine with instructions (optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="e.g. make it more formal, add request for written rejection reason"
                disabled={loading}
                className="flex-1 rounded-lg border border-line focus:border-brand focus:ring-2 focus:ring-brand/15 outline-none px-3 py-2 text-[13px] disabled:opacity-60"
              />
              <button
                onClick={() => void generate(instruction)}
                disabled={loading}
                className="shrink-0 rounded-lg border border-line hover:border-brand hover:text-brand bg-white px-3 py-2 text-[13px] font-semibold disabled:opacity-60 inline-flex items-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Spinner />
                    Drafting
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M4 12a8 8 0 0 1 14-5.3L20 4M20 4v5h-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M20 12a8 8 0 0 1-14 5.3L4 20M4 20v-5h5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Regenerate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 px-6 py-4 border-t border-line bg-surface">
          <p className="text-[11px] text-muted">
            Review carefully before sending — placeholders like [Your Name] need
            to be filled in.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={copyAll}
              disabled={loading || !!err || !body}
              className="rounded-lg border border-line hover:border-brand hover:text-brand bg-white px-3 py-2 text-[13px] font-semibold disabled:opacity-60 inline-flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12l4 4 10-10"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
            <button
              onClick={openInMail}
              disabled={loading || !!err || !body}
              className="rounded-lg bg-brand hover:bg-brand-hover text-white px-3.5 py-2 text-[13px] font-semibold disabled:opacity-60 inline-flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 6h16v12H4z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="m4 7 8 6 8-6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
              Open in mail app
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function DraftSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div>
        <div className="h-3 w-16 bg-surface-alt rounded mb-2" />
        <div className="h-9 w-full bg-surface-alt rounded-lg" />
      </div>
      <div>
        <div className="h-3 w-16 bg-surface-alt rounded mb-2" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-surface-alt rounded" />
          <div className="h-3 w-[92%] bg-surface-alt rounded" />
          <div className="h-3 w-[85%] bg-surface-alt rounded" />
          <div className="h-3 w-[95%] bg-surface-alt rounded" />
          <div className="h-3 w-[70%] bg-surface-alt rounded" />
          <div className="h-3 w-[88%] bg-surface-alt rounded" />
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      width="14"
      height="14"
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
