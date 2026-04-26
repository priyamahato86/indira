"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { findInsurer } from "@/lib/insurers";
import type {
  ApiAnalysis,
  ApiCase,
  ApiDiscrepancy,
  ApiShare,
} from "@/lib/serialize";
import PolicyChat from "./PolicyChat";
import ShareLinkPopover from "./ShareLinkPopover";

export type ReportMode = "owner" | "public";

const SEVERITY_COLOR: Record<ApiDiscrepancy["severity"], string> = {
  high: "#E5484D",
  medium: "#F6A93B",
  low: "#0F9D58",
};

const SEVERITY_LABEL: Record<ApiDiscrepancy["severity"], string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const CATEGORY_LABELS: Record<ApiDiscrepancy["category"], string> = {
  waiting_period: "Waiting period",
  exclusion: "Exclusion",
  sub_limit: "Sub-limit",
  ped: "Pre-existing disease",
  documentation: "Documentation",
  room_rent: "Room rent",
  pre_auth: "Pre-authorization",
  other: "Other",
};

const STATUS_LABEL: Record<ApiAnalysis["status"], string> = {
  APPROVED: "Approved",
  NEEDS_REVIEW: "Needs review",
  REJECTED: "Rejected",
};

function bandColor(band: ApiAnalysis["risk_band"]): string {
  if (band === "green") return "#0F9D58";
  if (band === "yellow") return "#F6A93B";
  return "#E5484D";
}

function bandGradient(band: ApiAnalysis["risk_band"]): string {
  if (band === "green") return "linear-gradient(135deg, #0F9D58 0%, #0B7C44 100%)";
  if (band === "yellow")
    return "linear-gradient(135deg, #F6A93B 0%, #C8821D 100%)";
  return "linear-gradient(135deg, #E5484D 0%, #B0353A 100%)";
}

export default function ReportClient({
  initial,
  mode = "owner",
}: {
  initial: ApiCase;
  mode?: ReportMode;
}) {
  const [caseData, setCaseData] = useState<ApiCase>(initial);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const printedRef = useRef(false);

  const insurer = caseData.policy
    ? findInsurer(caseData.policy.insurer)
    : undefined;

  function updateShare(share: ApiShare | null) {
    setCaseData((prev) => ({ ...prev, share }));
  }

  async function rerun() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseData.id}/analyze`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Analysis failed");
        return;
      }
      setCaseData(data.case);
    } catch {
      setError("Network error.");
    } finally {
      setRunning(false);
    }
  }

  const analysis = caseData.analysis;

  useEffect(() => {
    if (mode !== "owner" || printedRef.current || !analysis) return;
    if (searchParams?.get("print") !== "1") return;
    printedRef.current = true;
    const t = setTimeout(() => {
      window.print();
      router.replace(`/dashboard/reports/${caseData.id}`);
    }, 350);
    return () => clearTimeout(t);
  }, [mode, analysis, searchParams, router, caseData.id]);

  if (!analysis) {
    return (
      <div className="space-y-6">
        {mode === "owner" && <BackLink />}
        <div className="border border-dashed border-line bg-white p-16 text-center">
          <h1 className="text-[20px] font-semibold">No report yet</h1>
          <p className="mt-2 text-[14px] text-muted">
            {mode === "owner"
              ? "Run an analysis on this case first."
              : "This report has not been generated yet. Please check back later."}
          </p>
          {mode === "owner" && (
            <Link
              href={`/dashboard/cases/${caseData.id}`}
              className="mt-6 inline-flex rounded-lg bg-brand hover:bg-brand-hover px-4 py-2.5 text-[14px] font-semibold text-white"
            >
              Go to case
            </Link>
          )}
        </div>
      </div>
    );
  }

  const highCount = analysis.discrepancies.filter(
    (d) => d.severity === "high",
  ).length;
  const isClean =
    analysis.discrepancies.length === 0 || analysis.status === "APPROVED";

  return (
    <div className="space-y-6">
      {mode === "owner" ? (
        <div data-print-hide>
          <BackLink />
        </div>
      ) : (
        <PublicViewerBanner />
      )}

      <Hero
        caseData={caseData}
        analysis={analysis}
        insurerAccent={insurer?.accent}
        insurerShort={insurer?.short}
        onRerun={rerun}
        running={running}
        mode={mode}
        share={caseData.share}
        onShareChange={updateShare}
      />

      {error && (
        <div
          data-print-hide
          className="border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700"
        >
          {error}
        </div>
      )}

      {running && (
        <div data-print-hide>
          <AnalysisLoader />
        </div>
      )}

      <InsightStrip analysis={analysis} />

      <StatGrid analysis={analysis} highCount={highCount} />

      {!isClean && (
        <TopPriorityCard
          analysis={analysis}
          onJump={() => {
            const el = document.getElementById("discrepancies");
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      )}

      {isClean ? (
        <CleanCoveragePanel analysis={analysis} />
      ) : (
        <>
          <CoverageMap discrepancies={analysis.discrepancies} />

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-px bg-line border border-line rounded-2xl overflow-hidden shadow-sm">
            <div className="lg:col-span-2 bg-white">
              <RiskGauge analysis={analysis} />
            </div>
            <div className="lg:col-span-3 bg-white">
              <SeverityDonut discrepancies={analysis.discrepancies} />
            </div>
          </div>

          <CategoryBars discrepancies={analysis.discrepancies} />
        </>
      )}

      {analysis.summary && <ExecutiveSummary text={analysis.summary} />}

      {analysis.discrepancies.length > 0 && (
        <section id="discrepancies" className="scroll-mt-8">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                Action plan
              </h2>
              <p className="text-[13px] text-ink-soft mt-1">
                Sorted by severity — fix high items first
              </p>
            </div>
            <span className="text-[13px] text-muted">
              {analysis.discrepancies.length} flagged
            </span>
          </div>
          <div className="border border-line bg-white rounded-2xl overflow-hidden shadow-sm">
            {sortBySeverity(analysis.discrepancies).map((d, i, arr) => (
              <DiscrepancyCard
                key={i}
                d={d}
                index={i + 1}
                isLast={i === arr.length - 1}
              />
            ))}
          </div>
        </section>
      )}

      <DocumentHealth caseData={caseData} />

      {mode === "owner" && (
        <div data-print-hide>
          <PolicyChat caseData={caseData} />
        </div>
      )}

      <p className="text-[12px] text-muted text-center pt-2">
        Last analysed {new Date(analysis.analyzed_at).toLocaleString()}
      </p>
    </div>
  );
}

function PublicViewerBanner() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <Image
          src="/logo.png"
          alt="Indira"
          width={32}
          height={32}
          className="rounded-lg shrink-0 bg-white border border-line"
          style={{ objectFit: "contain" }}
        />
        <div className="min-w-0">
          <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-brand">
            Indira · Shared report
          </div>
          <div className="text-[12px] text-muted truncate">
            You are viewing a read-only claim report shared with you.
          </div>
        </div>
      </div>
      <a
        href="/"
        className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white px-3 py-1.5 text-[12px] font-semibold shrink-0"
      >
        Try Indira
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12h14M13 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/reports"
      className="text-[13px] text-muted hover:text-ink inline-flex items-center gap-1"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
          d="M15 18l-6-6 6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      All reports
    </Link>
  );
}

function Hero({
  caseData,
  analysis,
  insurerAccent,
  insurerShort,
  onRerun,
  running,
  mode,
  share,
  onShareChange,
}: {
  caseData: ApiCase;
  analysis: ApiAnalysis;
  insurerAccent?: string;
  insurerShort?: string;
  onRerun: () => void;
  running: boolean;
  mode: ReportMode;
  share: ApiShare | null;
  onShareChange: (share: ApiShare | null) => void;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const accent = bandColor(analysis.risk_band);

  useEffect(() => {
    if (mode !== "owner") return;
    if (typeof window === "undefined") return;
    if (window.location.hash === "#share") {
      setShareOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [mode]);

  function handleDownload() {
    setTimeout(() => window.print(), 50);
  }

  const confidence = 100 - analysis.risk_score;

  return (
    <header
      data-print-hero
      className="relative overflow-hidden text-white p-8 sm:p-10 rounded-2xl shadow-lg"
      style={{ background: bandGradient(analysis.risk_band) }}
    >
      <HeroDecor />
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-8">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] opacity-90">
            <span>Claim report</span>
            {insurerShort && (
              <>
                <span className="opacity-60">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: insurerAccent }}
                  />
                  {insurerShort}
                </span>
              </>
            )}
          </div>
          <h1 className="mt-3 text-[40px] sm:text-[48px] font-bold leading-[1.05] tracking-[-0.02em]">
            {caseData.patient_name}
          </h1>
          {caseData.diagnosis && (
            <p className="mt-2 text-[16px] sm:text-[18px] opacity-90 leading-snug">
              {caseData.diagnosis}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Chip>{STATUS_LABEL[analysis.status]}</Chip>
            {caseData.hospital && <Chip>{caseData.hospital}</Chip>}
            {caseData.admission_date && (
              <Chip>Admitted {caseData.admission_date}</Chip>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-5 shrink-0">
        {mode === "owner" ? (
          <div data-print-hide className="flex flex-wrap items-center gap-2 justify-end">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-white/95 px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap shadow-sm"
              style={{ color: accent }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Download PDF
            </button>
            <button
              ref={shareButtonRef}
              onClick={() => setShareOpen((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-white/95 px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap shadow-sm relative"
              style={{ color: accent }}
            >
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
              {share ? "Link active" : "Share link"}
              {share && (
                <span
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-success border-2 border-white"
                  aria-hidden
                />
              )}
            </button>
            {shareOpen && (
              <ShareLinkPopover
                caseId={caseData.id}
                initialShare={share}
                onShareChange={onShareChange}
                onClose={() => setShareOpen(false)}
                anchorRef={shareButtonRef}
              />
            )}
            <button
              onClick={onRerun}
              disabled={running}
              className="rounded-lg bg-white text-ink hover:bg-white/95 disabled:opacity-60 px-5 py-2.5 text-[13px] font-semibold whitespace-nowrap shadow-sm"
              style={{ color: accent }}
            >
              {running ? "Re-running…" : "Re-run analysis"}
            </button>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.1em] bg-white/20 backdrop-blur-sm border border-white/25">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path
                d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 1 0-5.66-5.66L11.5 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 1 0 5.66 5.66L12.5 17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Shared report
          </span>
        )}
        <HeroScoreDisc
          score={analysis.risk_score}
          confidence={confidence}
          band={analysis.risk_band}
        />
        </div>
      </div>
    </header>
  );
}

function HeroDecor() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.85) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          maskImage:
            "radial-gradient(ellipse at top right, black 0%, transparent 65%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at top right, black 0%, transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-32 w-56 h-56 rounded-full bg-white/10 blur-3xl"
      />
    </>
  );
}

function HeroScoreDisc({
  score,
  confidence,
  band,
}: {
  score: number;
  confidence: number;
  band: ApiAnalysis["risk_band"];
}) {
  const SIZE = 132;
  const STROKE = 9;
  const r = (SIZE - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return (
    <div className="relative shrink-0 hidden sm:flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={r}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={STROKE}
            fill="none"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={r}
            stroke="white"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            fill="none"
            style={{
              transition: "stroke-dasharray 600ms ease-out",
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.12))",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[44px] font-bold leading-none tracking-[-0.03em]">
            {score}
          </div>
          <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] opacity-90 mt-0.5">
            Risk · {band}
          </div>
        </div>
      </div>
      <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/25 backdrop-blur-sm">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 12l5 5L21 4"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-[10.5px] font-bold uppercase tracking-[0.08em]">
          {confidence}% approval
        </span>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm border border-white/25">
      {children}
    </span>
  );
}

const FIXABLE_CATEGORIES: ReadonlySet<ApiDiscrepancy["category"]> = new Set([
  "documentation",
  "pre_auth",
  "room_rent",
  "sub_limit",
]);

function buildHeadlineInsight(analysis: ApiAnalysis): {
  headline: string;
  detail: string;
} {
  const total = analysis.discrepancies.length;
  const high = analysis.discrepancies.filter((d) => d.severity === "high").length;
  const fixable = analysis.discrepancies.filter((d) =>
    FIXABLE_CATEGORIES.has(d.category),
  ).length;
  const confidence = 100 - analysis.risk_score;

  if (analysis.status === "APPROVED" || total === 0) {
    return {
      headline: "Your claim looks ready to file.",
      detail: `No deal-breaker clauses tripped — approval confidence is ${confidence}%.`,
    };
  }
  if (analysis.status === "REJECTED") {
    return {
      headline:
        high > 0
          ? `${high} high-severity issue${high > 1 ? "s" : ""} likely to trigger rejection.`
          : "Your claim is at high risk of rejection.",
      detail:
        fixable > 0
          ? `${fixable} of these can be resolved with documentation or pre-auth fixes before filing.`
          : "Most flagged issues are policy exclusions — consider an alternative policy or appeal.",
    };
  }
  return {
    headline: `${total} issue${total > 1 ? "s" : ""} need attention before filing.`,
    detail:
      high > 0
        ? `${high} high-severity item${high > 1 ? "s" : ""} need a direct fix; the rest can be queued for review.`
        : `Approval confidence is ${confidence}% — small clarifications could push this much higher.`,
  };
}

function InsightStrip({ analysis }: { analysis: ApiAnalysis }) {
  const { headline, detail } = buildHeadlineInsight(analysis);
  const accent = bandColor(analysis.risk_band);
  const total = analysis.discrepancies.length;
  const high = analysis.discrepancies.filter((d) => d.severity === "high").length;
  const fixable = analysis.discrepancies.filter((d) =>
    FIXABLE_CATEGORIES.has(d.category),
  ).length;

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-line bg-white p-6 sm:p-7 shadow-sm"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1.5"
        style={{ backgroundColor: accent }}
      />
      <div className="flex flex-wrap items-start justify-between gap-6 pl-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
            At a glance
          </div>
          <h2 className="mt-1.5 text-[22px] sm:text-[24px] font-semibold tracking-tight leading-snug">
            {headline}
          </h2>
          <p className="mt-2 text-[14px] text-ink-soft leading-relaxed max-w-2xl">
            {detail}
          </p>
        </div>
        {total > 0 && (
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <InsightChip
              value={String(total)}
              label="Issues"
              accent="var(--color-ink)"
            />
            <InsightChip
              value={high === 0 ? "0" : String(high)}
              label="High"
              accent={high > 0 ? "#E5484D" : "var(--color-muted)"}
            />
            <InsightChip
              value={String(fixable)}
              label="Fixable"
              accent={fixable > 0 ? "#0F9D58" : "var(--color-muted)"}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function InsightChip({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent: string;
}) {
  return (
    <div className="min-w-[64px] rounded-lg border border-line bg-surface px-3 py-2 text-center">
      <div
        className="text-[20px] font-bold leading-none tracking-tight tabular-nums"
        style={{ color: accent }}
      >
        {value}
      </div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
        {label}
      </div>
    </div>
  );
}

function TopPriorityCard({
  analysis,
  onJump,
}: {
  analysis: ApiAnalysis;
  onJump: () => void;
}) {
  const top = useMemo(() => {
    const order: Record<ApiDiscrepancy["severity"], number> = {
      high: 0,
      medium: 1,
      low: 2,
    };
    return [...analysis.discrepancies].sort(
      (a, b) => order[a.severity] - order[b.severity],
    )[0];
  }, [analysis.discrepancies]);
  if (!top) return null;
  const accent = SEVERITY_COLOR[top.severity];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06]"
        style={{ background: `linear-gradient(135deg, ${accent}, transparent 70%)` }}
      />
      <div className="relative grid grid-cols-1 md:grid-cols-12 gap-0">
        <div
          className="md:col-span-3 p-6 flex flex-col justify-center text-white"
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, ${shade(accent, -18)} 100%)`,
          }}
        >
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-90">
            Fix this first
          </div>
          <div className="mt-2 text-[36px] font-bold leading-none tracking-tight">
            #1
          </div>
          <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.08em] opacity-90">
            {SEVERITY_LABEL[top.severity]} priority
          </div>
        </div>
        <div className="md:col-span-9 p-6 sm:p-7">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
            <span style={{ color: accent }}>● {SEVERITY_LABEL[top.severity]}</span>
            <span>·</span>
            <span>{CATEGORY_LABELS[top.category]}</span>
          </div>
          <h3 className="mt-2 text-[20px] font-semibold tracking-tight leading-snug">
            {top.title}
          </h3>
          {top.suggested_action && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-brand-subtle border border-[color:var(--color-brand)]/20 px-4 py-3 text-[14px] leading-relaxed">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className="mt-0.5 shrink-0 text-brand"
              >
                <path
                  d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand mb-0.5">
                  Recommended next step
                </div>
                <p className="text-ink-soft">{top.suggested_action}</p>
              </div>
            </div>
          )}
          <button
            onClick={onJump}
            className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:text-brand-hover"
          >
            See all {analysis.discrepancies.length} issue
            {analysis.discrepancies.length === 1 ? "" : "s"}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

function shade(hex: string, percent: number): string {
  const h = hex.replace("#", "");
  const num = parseInt(h, 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + (255 * percent) / 100));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + (255 * percent) / 100));
  const b = Math.max(0, Math.min(255, (num & 0xff) + (255 * percent) / 100));
  return `#${[r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("")}`;
}

const COVERAGE_CATEGORIES: {
  id: ApiDiscrepancy["category"];
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "waiting_period",
    label: "Waiting period",
    icon: (
      <path
        d="M12 7v5l3 3M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "exclusion",
    label: "Exclusions",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 5l14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },
  {
    id: "sub_limit",
    label: "Sub-limit",
    icon: (
      <path
        d="M3 12h6l3-8 3 16 3-8h3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "ped",
    label: "Pre-existing",
    icon: (
      <>
        <path
          d="M20 12c0 5-4 9-8 9s-8-4-8-9c0-3 2-6 5-7l3 3 3-3c3 1 5 4 5 7z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  {
    id: "documentation",
    label: "Documentation",
    icon: (
      <>
        <path
          d="M7 3h7l5 5v13H7z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M14 3v6h5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </>
    ),
  },
  {
    id: "room_rent",
    label: "Room rent",
    icon: (
      <>
        <path
          d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.8" />
      </>
    ),
  },
  {
    id: "pre_auth",
    label: "Pre-authorization",
    icon: (
      <>
        <path
          d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9 12l2 2 4-4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  {
    id: "other",
    label: "Other",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5v.2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="12" cy="17" r="0.9" fill="currentColor" />
      </>
    ),
  },
];

function CoverageMap({
  discrepancies,
}: {
  discrepancies: ApiDiscrepancy[];
}) {
  const flagged = useMemo(() => {
    const map: Record<string, ApiDiscrepancy[]> = {};
    for (const d of discrepancies) {
      (map[d.category] ??= []).push(d);
    }
    return map;
  }, [discrepancies]);

  const flaggedCount = COVERAGE_CATEGORIES.filter(
    (c) => (flagged[c.id]?.length ?? 0) > 0,
  ).length;
  const passCount = COVERAGE_CATEGORIES.length - flaggedCount;

  return (
    <section className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 sm:px-7 py-4 border-b border-line">
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
            Coverage health map
          </h2>
          <p className="text-[12px] text-muted mt-0.5">
            Eight policy areas checked against this claim
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.06em]">
          <span className="inline-flex items-center gap-1.5 text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            {passCount} pass
          </span>
          <span className="inline-flex items-center gap-1.5 text-danger">
            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
            {flaggedCount} flagged
          </span>
        </div>
      </div>
      <ul className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-line">
        {COVERAGE_CATEGORIES.map((cat) => {
          const items = flagged[cat.id] ?? [];
          const isFlagged = items.length > 0;
          const topSev = items.reduce<ApiDiscrepancy["severity"] | null>(
            (acc, d) => {
              const order: Record<ApiDiscrepancy["severity"], number> = {
                high: 3,
                medium: 2,
                low: 1,
              };
              if (!acc) return d.severity;
              return order[d.severity] > order[acc] ? d.severity : acc;
            },
            null,
          );
          const accent = isFlagged && topSev ? SEVERITY_COLOR[topSev] : "#0F9D58";
          return (
            <li
              key={cat.id}
              className="bg-white p-5 flex flex-col gap-3 min-h-[112px] relative"
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: isFlagged
                      ? `${accent}1A`
                      : "rgba(15,157,88,0.10)",
                    color: accent,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    {cat.icon}
                  </svg>
                </div>
                {isFlagged ? (
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {items.length}
                  </span>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-success"
                  >
                    <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
                    <path
                      d="M8 12.5l2.5 2.5L16 9"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <div>
                <div className="text-[13px] font-semibold tracking-tight">
                  {cat.label}
                </div>
                <div
                  className="text-[10.5px] font-bold uppercase tracking-[0.08em] mt-0.5"
                  style={{ color: isFlagged ? accent : "#0F9D58" }}
                >
                  {isFlagged
                    ? `${SEVERITY_LABEL[topSev!]} flagged`
                    : "Clear"}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DocumentHealth({ caseData }: { caseData: ApiCase }) {
  const docs = caseData.documents ?? [];
  if (docs.length === 0) return null;
  const parsedCount = docs.filter((d) => d.parsed).length;

  return (
    <section className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 sm:px-7 py-4 border-b border-line">
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
            Document health
          </h2>
          <p className="text-[12px] text-muted mt-0.5">
            {parsedCount}/{docs.length} indexed and ready for analysis
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] ${
            parsedCount === docs.length ? "text-success" : "text-warn"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              parsedCount === docs.length ? "bg-success" : "bg-warn"
            }`}
          />
          {parsedCount === docs.length ? "All ready" : "Partial"}
        </span>
      </div>
      <ul className="divide-y divide-line">
        {docs.map((d) => (
          <li
            key={d.id}
            className="flex items-center gap-3 px-6 sm:px-7 py-3.5 text-[13px]"
          >
            <span
              className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                d.parsed
                  ? "bg-[#E6F4EA] text-success"
                  : "bg-surface-alt text-muted"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 3h7l5 5v13H7z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path d="M14 3v6h5" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{d.original_name}</div>
              <div className="text-[11px] text-muted uppercase tracking-wider">
                {d.doc_type.replace(/_/g, " ")}
              </div>
            </div>
            <span
              className={`text-[10.5px] font-bold uppercase tracking-[0.08em] shrink-0 ${
                d.parsed ? "text-success" : "text-muted"
              }`}
            >
              {d.parsed ? "Indexed" : "Pending"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function sortBySeverity(items: ApiDiscrepancy[]): ApiDiscrepancy[] {
  const order: Record<ApiDiscrepancy["severity"], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  return [...items].sort((a, b) => order[a.severity] - order[b.severity]);
}

function ExecutiveSummary({ text }: { text: string }) {
  return (
    <section className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
      <div className="px-7 py-4 border-b border-line">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
          Executive summary
        </h2>
      </div>
      <div className="relative px-7 py-7">
        <svg
          aria-hidden
          width="44"
          height="44"
          viewBox="0 0 24 24"
          fill="none"
          className="absolute top-5 left-5 text-brand-subtle"
        >
          <path
            d="M7 7c-2 0-3 1-3 3s1 3 3 3c-1 1-2 3-2 4M17 7c-2 0-3 1-3 3s1 3 3 3c-1 1-2 3-2 4"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="relative pl-12 text-[15px] leading-relaxed text-ink-soft">
          {text}
        </p>
      </div>
    </section>
  );
}

function StatGrid({
  analysis,
  highCount,
}: {
  analysis: ApiAnalysis;
  highCount: number;
}) {
  const total = analysis.discrepancies.length;
  const confidence = 100 - analysis.risk_score;
  const accent = bandColor(analysis.risk_band);
  return (
    <section className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-4">
        <StatCell
          label="Status"
          value={STATUS_LABEL[analysis.status]}
          accent={accent}
          icon={<StatusIcon status={analysis.status} color={accent} />}
        />
        <StatCell
          label="Approval confidence"
          value={`${confidence}%`}
          accent={accent}
          hint={`Risk score ${analysis.risk_score}/100`}
          icon={<ConfidenceIcon color={accent} />}
        />
        <StatCell
          label="Discrepancies"
          value={total === 0 ? "None" : String(total)}
          accent={total === 0 ? "#0F9D58" : undefined}
          hint={total === 0 ? "All checks passed" : "Across categories"}
          muted={total === 0}
          icon={
            <DiscrepancyIcon
              color={total === 0 ? "#0F9D58" : "var(--color-ink)"}
            />
          }
        />
        <StatCell
          label="High severity"
          value={highCount === 0 ? "None" : String(highCount)}
          accent={
            highCount > 0
              ? "#E5484D"
              : total === 0
                ? "#0F9D58"
                : undefined
          }
          hint={highCount === 0 ? "Nothing critical" : "Resolve these first"}
          muted={highCount === 0}
          icon={
            <SeverityIcon
              color={
                highCount > 0
                  ? "#E5484D"
                  : total === 0
                    ? "#0F9D58"
                    : "var(--color-muted)"
              }
            />
          }
          last
        />
      </div>
    </section>
  );
}

function ConfidenceIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill={color} opacity="0.15" />
      <path
        d="M12 7v5l3 2"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DiscrepancyIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill={color} opacity="0.12" />
      <path
        d="M9 9l6 6M9 15l6-6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SeverityIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M10.3 3.5 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0z"
        fill={color}
        opacity="0.15"
      />
      <path
        d="M10.3 3.5 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 9v4M12 17h.01"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StatusIcon({
  status,
  color,
}: {
  status: ApiAnalysis["status"];
  color: string;
}) {
  if (status === "APPROVED") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill={color} opacity="0.15" />
        <path
          d="M8 12.5l2.5 2.5L16 9"
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status === "REJECTED") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill={color} opacity="0.15" />
        <path
          d="M9 9l6 6M15 9l-6 6"
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill={color} opacity="0.15" />
      <path
        d="M12 8v5"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.5" r="1.2" fill={color} />
    </svg>
  );
}

function StatCell({
  label,
  value,
  suffix,
  accent,
  hint,
  icon,
  muted,
  last,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent?: string;
  hint?: string;
  icon?: React.ReactNode;
  muted?: boolean;
  last?: boolean;
}) {
  const isShort = muted || /^[A-Za-z]/.test(value);
  return (
    <div
      className={`relative px-6 py-6 group transition-colors hover:bg-surface ${
        last ? "" : "md:border-r border-line"
      } border-b border-line md:border-b-0`}
    >
      {accent && (
        <span
          aria-hidden
          className="absolute top-0 left-0 right-0 h-0.5 transition-opacity opacity-70 group-hover:opacity-100"
          style={{ backgroundColor: accent }}
        />
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">
          {label}
        </div>
        {icon && <div className="shrink-0 -mt-0.5">{icon}</div>}
      </div>
      <div
        className={`mt-3 font-bold leading-none tracking-[-0.02em] tabular-nums ${
          isShort ? "text-[26px]" : "text-[40px]"
        }`}
        style={{ color: accent ?? "var(--color-ink)" }}
      >
        {value}
        {suffix && (
          <span className="ml-1 text-[14px] font-normal text-muted tracking-normal">
            {suffix}
          </span>
        )}
      </div>
      {hint && <div className="mt-2 text-[12px] text-muted">{hint}</div>}
    </div>
  );
}

function CleanCoveragePanel({ analysis }: { analysis: ApiAnalysis }) {
  const confidence = 100 - analysis.risk_score;
  const checks = [
    "No exclusions triggered",
    "Within sum insured & sub-limits",
    "Waiting periods satisfied",
    "Documentation appears complete",
  ];
  return (
    <section className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-5">
        <div className="lg:col-span-2 p-8 flex flex-col items-center justify-center text-center bg-[#F1FAF4] border-b lg:border-b-0 lg:border-r border-line">
          <div className="relative w-24 h-24 mb-4">
            <svg
              width="96"
              height="96"
              viewBox="0 0 96 96"
              fill="none"
              className="absolute inset-0"
            >
              <circle
                cx="48"
                cy="48"
                r="44"
                stroke="#CEEAD6"
                strokeWidth="4"
              />
              <circle
                cx="48"
                cy="48"
                r="44"
                stroke="#0F9D58"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${(confidence / 100) * 276} 276`}
                transform="rotate(-90 48 48)"
              />
              <path
                d="M34 48l10 10 18-22"
                stroke="#0F9D58"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
          <div className="text-[40px] font-bold leading-none tracking-tight text-[#0F9D58]">
            {confidence}%
          </div>
          <div className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
            Approval confidence
          </div>
          <p className="mt-3 text-[13px] text-ink-soft max-w-[220px]">
            No discrepancies were flagged against your policy.
          </p>
        </div>
        <div className="lg:col-span-3 p-2">
          <SectionLabel label="Coverage check" />
          <ul className="px-2 py-2">
            {checks.map((c) => (
              <li
                key={c}
                className="flex items-center gap-3 px-5 py-3 text-[14px]"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="shrink-0"
                >
                  <circle cx="12" cy="12" r="10" fill="#0F9D58" opacity="0.15" />
                  <path
                    d="M8 12.5l2.5 2.5L16 9"
                    stroke="#0F9D58"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{c}</span>
                <span className="ml-auto text-[11px] uppercase tracking-wider font-bold text-[#0F9D58]">
                  Pass
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-7 py-4 border-b border-line">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
        {label}
      </h2>
    </div>
  );
}

function RiskGauge({ analysis }: { analysis: ApiAnalysis }) {
  const color = bandColor(analysis.risk_band);
  const data = [{ name: "risk", value: analysis.risk_score, fill: color }];
  return (
    <div className="h-full flex flex-col">
      <SectionLabel label="Risk score" />
      <div className="flex-1 px-7 py-6">
        <div className="relative h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="58%"
              innerRadius="68%"
              outerRadius="100%"
              barSize={20}
              data={data}
              startAngle={210}
              endAngle={-30}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                angleAxisId={0}
                tick={false}
              />
              <RadialBar
                background={{ fill: "#F1F3F4" }}
                dataKey="value"
                cornerRadius={2}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div
              className="text-[56px] font-bold leading-none tracking-[-0.02em]"
              style={{ color }}
            >
              {analysis.risk_score}
            </div>
            <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
              out of 100
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
            Band
          </span>
          <span
            className="text-[11px] font-bold uppercase tracking-[0.08em]"
            style={{ color }}
          >
            ● {analysis.risk_band}
          </span>
        </div>
      </div>
    </div>
  );
}

function SeverityDonut({
  discrepancies,
}: {
  discrepancies: ApiDiscrepancy[];
}) {
  const data = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 } as Record<
      ApiDiscrepancy["severity"],
      number
    >;
    for (const d of discrepancies) counts[d.severity] += 1;
    return (["high", "medium", "low"] as const)
      .map((s) => ({
        key: s,
        name: SEVERITY_LABEL[s],
        value: counts[s],
        color: SEVERITY_COLOR[s],
      }))
      .filter((x) => x.value > 0);
  }, [discrepancies]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="h-full flex flex-col">
      <SectionLabel label="Severity breakdown" />
      <div className="flex-1 px-7 py-6 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
        {data.length === 0 ? (
          <div className="col-span-2 h-[220px] flex items-center justify-center text-[13px] text-muted">
            No issues
          </div>
        ) : (
          <>
            <div className="relative h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={90}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {data.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 0,
                      border: "1px solid #E5E5E5",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-[36px] font-bold leading-none tracking-tight">
                  {total}
                </div>
                <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                  total
                </div>
              </div>
            </div>
            <ul className="space-y-3">
              {(["high", "medium", "low"] as const).map((s) => {
                const found = data.find((d) => d.key === s);
                const value = found?.value ?? 0;
                const pct = total ? Math.round((value / total) * 100) : 0;
                return (
                  <li key={s}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="inline-flex items-center gap-2 text-[12px] font-semibold">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: SEVERITY_COLOR[s] }}
                        />
                        {SEVERITY_LABEL[s]}
                      </span>
                      <span className="text-[12px] tabular-nums text-muted">
                        {value} · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-surface-alt overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: SEVERITY_COLOR[s],
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function CategoryBars({
  discrepancies,
}: {
  discrepancies: ApiDiscrepancy[];
}) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of discrepancies) {
      const k = CATEGORY_LABELS[d.category];
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [discrepancies]);

  if (data.length === 0) return null;

  return (
    <section className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
      <SectionLabel label="By category" />
      <div className="px-7 py-6">
        <div style={{ height: Math.max(140, data.length * 44) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 24, bottom: 0, left: 0 }}
            >
              <XAxis
                type="number"
                hide
                domain={[0, "dataMax"]}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fontSize: 12, fill: "#1A1A1A", fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 0,
                  border: "1px solid #E5E5E5",
                }}
              />
              <Bar
                dataKey="value"
                fill="var(--color-brand)"
                radius={[0, 0, 0, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function DiscrepancyCard({
  d,
  index,
  isLast,
}: {
  d: ApiDiscrepancy;
  index: number;
  isLast: boolean;
}) {
  const sevColor = SEVERITY_COLOR[d.severity];
  return (
    <article
      className={`flex transition-colors hover:bg-surface ${
        isLast ? "" : "border-b border-line"
      }`}
    >
      <div className="w-1.5 shrink-0" style={{ backgroundColor: sevColor }} />
      <div className="flex-1 p-6 sm:p-7 min-w-0">
        <div className="flex items-start gap-4">
          <PriorityBadge index={index} color={sevColor} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap text-[10px] font-bold uppercase tracking-[0.1em]">
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${sevColor}1A`,
                  color: sevColor,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: sevColor }}
                />
                {SEVERITY_LABEL[d.severity]}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-alt text-muted">
                {CATEGORY_LABELS[d.category]}
              </span>
              {FIXABLE_CATEGORIES.has(d.category) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E6F4EA] text-success">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 12l5 5L21 4"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Fixable
                </span>
              )}
            </div>
            <h3 className="mt-2.5 text-[19px] sm:text-[20px] font-semibold leading-snug tracking-tight">
              {d.title}
            </h3>
            <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-soft">
              {d.detail}
            </p>
            {d.policy_clause && (
              <blockquote
                className="mt-4 relative pl-4 pr-3 py-3 bg-surface rounded-md text-[13px] italic text-muted border-l-2"
                style={{ borderLeftColor: sevColor }}
              >
                <span
                  aria-hidden
                  className="absolute -top-2 left-2 px-1.5 text-[9px] font-bold uppercase tracking-[0.1em] bg-white text-muted"
                >
                  Policy clause
                </span>
                <span className="not-italic">“</span>
                {d.policy_clause}
                <span className="not-italic">”</span>
              </blockquote>
            )}
            {d.suggested_action && (
              <div className="mt-4 px-4 py-3.5 bg-brand-subtle border border-[color:var(--color-brand)]/15 rounded-lg text-[14px] flex items-start gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div className="min-w-0">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-brand block mb-1">
                    Recommended action
                  </span>
                  <span className="text-ink-soft leading-relaxed">
                    {d.suggested_action}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function PriorityBadge({ index, color }: { index: number; color: string }) {
  return (
    <div className="shrink-0 hidden sm:flex flex-col items-center pt-1">
      <div
        className="w-10 h-10 flex items-center justify-center font-bold text-white text-[15px] tabular-nums"
        style={{
          backgroundColor: color,
          clipPath:
            "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
        }}
      >
        {index}
      </div>
      <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
        Priority
      </span>
    </div>
  );
}

const LOADER_STEPS = [
  "Reading hospital documents",
  "Extracting policy clauses",
  "Cross-referencing with AI",
  "Generating discrepancy report",
];

function AnalysisLoader() {
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStep((s) => Math.min(s + 1, LOADER_STEPS.length - 1));
    }, 9000);
    const elapsedTimer = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => {
      clearInterval(stepTimer);
      clearInterval(elapsedTimer);
    };
  }, []);

  return (
    <div className="border border-line bg-white">
      <div className="px-6 py-7 flex flex-col items-center text-center border-b border-line">
        <div className="relative w-12 h-12 mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-brand-subtle" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand animate-spin" />
        </div>
        <h3 className="text-[16px] font-semibold tracking-tight">
          Analysing your claim
        </h3>
        <p className="mt-1 text-[13px] text-muted">
          This can take up to a minute on first run · {formatElapsed(elapsed)}
        </p>
      </div>
      <ul className="divide-y divide-line">
        {LOADER_STEPS.map((label, i) => {
          const isDone = i < step;
          const isActive = i === step;
          return (
            <li
              key={label}
              className="px-6 py-3 flex items-center gap-3 text-[13px]"
            >
              <span className="w-5 h-5 shrink-0 flex items-center justify-center">
                {isDone ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-brand"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="currentColor"
                      opacity="0.15"
                    />
                    <path
                      d="M8 12l3 3 5-6"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : isActive ? (
                  <span className="relative inline-flex w-3 h-3">
                    <span className="absolute inset-0 rounded-full bg-brand opacity-60 animate-ping" />
                    <span className="relative w-3 h-3 rounded-full bg-brand" />
                  </span>
                ) : (
                  <span className="w-3 h-3 rounded-full border border-line bg-white" />
                )}
              </span>
              <span
                className={
                  isActive
                    ? "font-semibold text-ink"
                    : isDone
                      ? "text-ink"
                      : "text-muted"
                }
              >
                {label}
              </span>
              {isActive && (
                <span className="ml-auto text-[11px] uppercase tracking-wider font-bold text-brand">
                  Running
                </span>
              )}
              {isDone && (
                <span className="ml-auto text-[11px] uppercase tracking-wider text-muted">
                  Done
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatElapsed(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}
