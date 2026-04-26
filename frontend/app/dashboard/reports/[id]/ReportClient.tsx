"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { useTranslate } from "@/hooks/useTranslate";
import type { ApiAnalysis, ApiCase, ApiDiscrepancy } from "@/lib/serialize";

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

// All static UI strings
const UI_STRINGS = [
  "All reports",
  "Claim report",
  "Re-run analysis",
  "Re-running…",
  "No report yet",
  "Run an analysis on this case first.",
  "Go to case",
  "Status",
  "Approval confidence",
  "Discrepancies",
  "High severity",
  "All checks passed",
  "Nothing critical",
  "Risk score",
  "out of 100",
  "Band",
  "Severity breakdown",
  "No issues",
  "High",
  "Medium",
  "Low",
  "By category",
  "Executive summary",
  "Last analysed",
  "Coverage check",
  "No exclusions triggered",
  "Within sum insured & sub-limits",
  "Waiting periods satisfied",
  "Documentation appears complete",
  "Pass",
  "No discrepancies were flagged against your policy.",
  "Issue",
  "Suggested action",
  "flagged",
  "Confidence",
  "None",
  "Approved",
  "Needs review",
  "Rejected",
  "Reading hospital documents",
  "Extracting policy clauses",
  "Cross-referencing with AI",
  "Generating discrepancy report",
  "Analysing your claim",
  "This can take up to a minute on first run",
  "Running",
  "Done",
  "Switch to Hindi",
  "Switch to English",
];

function bandColor(band: ApiAnalysis["risk_band"]): string {
  if (band === "green") return "#0F9D58";
  if (band === "yellow") return "#F6A93B";
  return "#E5484D";
}

function bandGradient(band: ApiAnalysis["risk_band"]): string {
  if (band === "green")
    return "linear-gradient(135deg, #0F9D58 0%, #0B7C44 100%)";
  if (band === "yellow")
    return "linear-gradient(135deg, #F6A93B 0%, #C8821D 100%)";
  return "linear-gradient(135deg, #E5484D 0%, #B0353A 100%)";
}

export default function ReportClient({ initial }: { initial: ApiCase }) {
  const [caseData, setCaseData] = useState<ApiCase>(initial);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<"en" | "hi">("en");

  const t = useTranslate(UI_STRINGS, lang);

  const insurer = caseData.policy
    ? findInsurer(caseData.policy.insurer)
    : undefined;

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

  if (!analysis) {
    return (
      <div className="space-y-6">
        <BackLink t={t} />
        <div className="border border-dashed border-line bg-white p-16 text-center">
          <h1 className="text-[20px] font-semibold">
            {t["No report yet"] ?? "No report yet"}
          </h1>
          <p className="mt-2 text-[14px] text-muted">
            {t["Run an analysis on this case first."] ??
              "Run an analysis on this case first."}
          </p>
          <Link
            href={`/dashboard/cases/${caseData.id}`}
            className="mt-6 inline-flex rounded-lg bg-brand hover:bg-brand-hover px-4 py-2.5 text-[14px] font-semibold text-white"
          >
            {t["Go to case"] ?? "Go to case"}
          </Link>
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
      {/* Top bar: back link + language toggle */}
      <div className="flex items-center justify-between">
        <BackLink t={t} />
        <button
          onClick={() => setLang((l) => (l === "en" ? "hi" : "en"))}
          className="flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-[13px] font-semibold hover:bg-surface transition-colors shadow-sm"
        >
          <span className="text-[16px]">{lang === "en" ? "🇮🇳" : "🇬🇧"}</span>
          {lang === "en"
            ? (t["Switch to Hindi"] ?? "Switch to Hindi")
            : (t["Switch to English"] ?? "Switch to English")}
        </button>
      </div>

      <Hero
        caseData={caseData}
        analysis={analysis}
        insurerAccent={insurer?.accent}
        insurerShort={insurer?.short}
        onRerun={rerun}
        running={running}
        t={t}
        lang={lang}
      />

      {error && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      {running && <AnalysisLoader t={t} />}

      <StatGrid analysis={analysis} highCount={highCount} t={t} />

      {isClean ? (
        <CleanCoveragePanel analysis={analysis} t={t} />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-px bg-line border border-line">
            <div className="lg:col-span-2 bg-white">
              <RiskGauge analysis={analysis} t={t} />
            </div>
            <div className="lg:col-span-3 bg-white">
              <SeverityDonut discrepancies={analysis.discrepancies} t={t} />
            </div>
          </div>

          <CategoryBars discrepancies={analysis.discrepancies} t={t} lang={lang} />
        </>
      )}

      {analysis.summary && (
        <section className="border border-line bg-white">
          <SectionLabel label={t["Executive summary"] ?? "Executive summary"} />
          <SummaryText summary={analysis.summary} lang={lang} />
        </section>
      )}

      {analysis.discrepancies.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">
              {t["Discrepancies"] ?? "Discrepancies"}
            </h2>
            <span className="text-[13px] text-muted">
              {analysis.discrepancies.length} {t["flagged"] ?? "flagged"}
            </span>
          </div>
          <div className="border border-line bg-white">
            {analysis.discrepancies.map((d, i) => (
              <DiscrepancyCard
                key={i}
                d={d}
                index={i + 1}
                isLast={i === analysis.discrepancies.length - 1}
                t={t}
                lang={lang}
              />
            ))}
          </div>
        </section>
      )}

      <p className="text-[12px] text-muted text-center pt-2">
        {t["Last analysed"] ?? "Last analysed"}{" "}
        {new Date(analysis.analyzed_at).toLocaleString(
          lang === "hi" ? "hi-IN" : "en-GB",
        )}
      </p>
    </div>
  );
}

function BackLink({ t }: { t: Record<string, string> }) {
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
      {t["All reports"] ?? "All reports"}
    </Link>
  );
}

/** Translates the summary paragraph */
function SummaryText({
  summary,
  lang,
}: {
  summary: string;
  lang: "en" | "hi";
}) {
  const translated = useTranslate([summary], lang);
  return (
    <p className="px-7 py-6 text-[15px] leading-relaxed text-ink-soft">
      {translated[summary] ?? summary}
    </p>
  );
}

function Hero({
  caseData,
  analysis,
  insurerAccent,
  insurerShort,
  onRerun,
  running,
  t,
  lang,
}: {
  caseData: ApiCase;
  analysis: ApiAnalysis;
  insurerAccent?: string;
  insurerShort?: string;
  onRerun: () => void;
  running: boolean;
  t: Record<string, string>;
  lang: "en" | "hi";
}) {
  // Translate patient name, diagnosis, hospital, admission date label
  const dynamicStrings = [
    caseData.patient_name,
    caseData.diagnosis ?? "",
    caseData.hospital ?? "",
    caseData.admission_date ? `Admitted ${caseData.admission_date}` : "",
    STATUS_LABEL[analysis.status],
  ].filter(Boolean);
  const dT = useTranslate(dynamicStrings, lang);

  return (
    <header
      className="relative overflow-hidden text-white p-8 sm:p-10"
      style={{ background: bandGradient(analysis.risk_band) }}
    >
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] opacity-80">
            <span>{t["Claim report"] ?? "Claim report"}</span>
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
            {dT[caseData.patient_name] ?? caseData.patient_name}
          </h1>
          {caseData.diagnosis && (
            <p className="mt-2 text-[16px] sm:text-[18px] opacity-90 leading-snug">
              {dT[caseData.diagnosis] ?? caseData.diagnosis}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Chip>
              {dT[STATUS_LABEL[analysis.status]] ??
                STATUS_LABEL[analysis.status]}
            </Chip>
            {caseData.hospital && (
              <Chip>{dT[caseData.hospital] ?? caseData.hospital}</Chip>
            )}
            {caseData.admission_date && (
              <Chip>
                {dT[`Admitted ${caseData.admission_date}`] ??
                  `Admitted ${caseData.admission_date}`}
              </Chip>
            )}
          </div>
        </div>
        <button
          onClick={onRerun}
          disabled={running}
          className="rounded-lg bg-white text-ink hover:bg-white/90 disabled:opacity-60 px-5 py-2.5 text-[13px] font-semibold whitespace-nowrap shadow-sm"
          style={{ color: bandColor(analysis.risk_band) }}
        >
          {running
            ? (t["Re-running…"] ?? "Re-running…")
            : (t["Re-run analysis"] ?? "Re-run analysis")}
        </button>
      </div>
    </header>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm border border-white/25">
      {children}
    </span>
  );
}

function StatGrid({
  analysis,
  highCount,
  t,
}: {
  analysis: ApiAnalysis;
  highCount: number;
  t: Record<string, string>;
}) {
  const total = analysis.discrepancies.length;
  const confidence = 100 - analysis.risk_score;
  const accent = bandColor(analysis.risk_band);
  return (
    <section className="border border-line bg-white">
      <div className="grid grid-cols-2 md:grid-cols-4">
        <StatCell
          label={t["Status"] ?? "Status"}
          value={t[STATUS_LABEL[analysis.status]] ?? STATUS_LABEL[analysis.status]}
          accent={accent}
          icon={<StatusIcon status={analysis.status} color={accent} />}
        />
        <StatCell
          label={t["Approval confidence"] ?? "Approval confidence"}
          value={`${confidence}%`}
          accent={accent}
          hint={`${t["Risk score"] ?? "Risk score"} ${analysis.risk_score}/100`}
        />
        <StatCell
          label={t["Discrepancies"] ?? "Discrepancies"}
          value={
            total === 0 ? (t["None"] ?? "None") : String(total)
          }
          accent={total === 0 ? "#0F9D58" : undefined}
          hint={
            total === 0 ? (t["All checks passed"] ?? "All checks passed") : undefined
          }
          muted={total === 0}
        />
        <StatCell
          label={t["High severity"] ?? "High severity"}
          value={
            highCount === 0 ? (t["None"] ?? "None") : String(highCount)
          }
          accent={
            highCount > 0
              ? "#E5484D"
              : total === 0
                ? "#0F9D58"
                : undefined
          }
          hint={
            highCount === 0
              ? (t["Nothing critical"] ?? "Nothing critical")
              : undefined
          }
          muted={highCount === 0}
          last
        />
      </div>
    </section>
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
  const isShort = muted || /^[A-Za-z\u0900-\u097F]/.test(value);
  return (
    <div
      className={`px-7 py-7 ${last ? "" : "md:border-r border-line"} border-b border-line md:border-b-0`}
    >
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
        {label}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        {icon}
        <div
          className={`font-bold leading-none tracking-tight ${isShort ? "text-[26px]" : "text-[44px]"}`}
          style={{ color: accent ?? "var(--color-ink)" }}
        >
          {value}
          {suffix && (
            <span className="ml-1 text-[14px] font-normal text-muted tracking-normal">
              {suffix}
            </span>
          )}
        </div>
      </div>
      {hint && <div className="mt-2 text-[12px] text-muted">{hint}</div>}
    </div>
  );
}

function CleanCoveragePanel({
  analysis,
  t,
}: {
  analysis: ApiAnalysis;
  t: Record<string, string>;
}) {
  const confidence = 100 - analysis.risk_score;
  const checks = [
    "No exclusions triggered",
    "Within sum insured & sub-limits",
    "Waiting periods satisfied",
    "Documentation appears complete",
  ];
  return (
    <section className="border border-line bg-white overflow-hidden">
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
              <circle cx="48" cy="48" r="44" stroke="#CEEAD6" strokeWidth="4" />
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
            {t["Approval confidence"] ?? "Approval confidence"}
          </div>
          <p className="mt-3 text-[13px] text-ink-soft max-w-[220px]">
            {t["No discrepancies were flagged against your policy."] ??
              "No discrepancies were flagged against your policy."}
          </p>
        </div>
        <div className="lg:col-span-3 p-2">
          <SectionLabel label={t["Coverage check"] ?? "Coverage check"} />
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
                <span>{t[c] ?? c}</span>
                <span className="ml-auto text-[11px] uppercase tracking-wider font-bold text-[#0F9D58]">
                  {t["Pass"] ?? "Pass"}
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

function RiskGauge({
  analysis,
  t,
}: {
  analysis: ApiAnalysis;
  t: Record<string, string>;
}) {
  const color = bandColor(analysis.risk_band);
  const data = [{ name: "risk", value: analysis.risk_score, fill: color }];
  return (
    <div className="h-full flex flex-col">
      <SectionLabel label={t["Risk score"] ?? "Risk score"} />
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
              {t["out of 100"] ?? "out of 100"}
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
            {t["Band"] ?? "Band"}
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
  t,
}: {
  discrepancies: ApiDiscrepancy[];
  t: Record<string, string>;
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
        name: t[SEVERITY_LABEL[s]] ?? SEVERITY_LABEL[s],
        value: counts[s],
        color: SEVERITY_COLOR[s],
      }))
      .filter((x) => x.value > 0);
  }, [discrepancies, t]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="h-full flex flex-col">
      <SectionLabel label={t["Severity breakdown"] ?? "Severity breakdown"} />
      <div className="flex-1 px-7 py-6 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
        {data.length === 0 ? (
          <div className="col-span-2 h-[220px] flex items-center justify-center text-[13px] text-muted">
            {t["No issues"] ?? "No issues"}
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
                        {t[SEVERITY_LABEL[s]] ?? SEVERITY_LABEL[s]}
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
  t,
  lang,
}: {
  discrepancies: ApiDiscrepancy[];
  t: Record<string, string>;
  lang: "en" | "hi";
}) {
  const categoryKeys = Object.values(CATEGORY_LABELS);
  const catT = useTranslate(categoryKeys, lang);

  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of discrepancies) {
      const original = CATEGORY_LABELS[d.category];
      const label = catT[original] ?? original;
      counts[label] = (counts[label] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [discrepancies, catT]);

  if (data.length === 0) return null;

  return (
    <section className="border border-line bg-white">
      <SectionLabel label={t["By category"] ?? "By category"} />
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
                width={160}
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
  t,
  lang,
}: {
  d: ApiDiscrepancy;
  index: number;
  isLast: boolean;
  t: Record<string, string>;
  lang: "en" | "hi";
}) {
  // Translate the dynamic discrepancy content
  const dynamicStrings = [
    d.title,
    d.detail,
    d.policy_clause ?? "",
    d.suggested_action ?? "",
  ].filter(Boolean);
  const dT = useTranslate(dynamicStrings, lang);

  const sevColor = SEVERITY_COLOR[d.severity];
  return (
    <article className={`flex ${isLast ? "" : "border-b border-line"}`}>
      <div className="w-1 shrink-0" style={{ backgroundColor: sevColor }} />
      <div className="flex-1 p-7 min-w-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.1em]">
              <span className="text-muted">
                {t["Issue"] ?? "Issue"} {index}
              </span>
              <span style={{ color: sevColor }}>
                ● {t[SEVERITY_LABEL[d.severity]] ?? SEVERITY_LABEL[d.severity]}
              </span>
              <span className="text-muted">·</span>
              <span className="text-muted">
                {t[CATEGORY_LABELS[d.category]] ?? CATEGORY_LABELS[d.category]}
              </span>
            </div>
            <h3 className="mt-2 text-[20px] font-semibold leading-snug tracking-tight">
              {dT[d.title] ?? d.title}
            </h3>
          </div>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          {dT[d.detail] ?? d.detail}
        </p>
        {d.policy_clause && (
          <blockquote
            className="mt-4 px-4 py-3 bg-surface text-[13px] italic text-muted border-l-2"
            style={{ borderLeftColor: sevColor }}
          >
            "{dT[d.policy_clause] ?? d.policy_clause}"
          </blockquote>
        )}
        {d.suggested_action && (
          <div className="mt-4 px-4 py-3 bg-brand-subtle border-l-2 border-brand text-[14px] flex items-start gap-2.5">
            <svg
              width="18"
              height="18"
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
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-brand block mb-0.5">
                {t["Suggested action"] ?? "Suggested action"}
              </span>
              <span className="text-ink-soft">
                {dT[d.suggested_action] ?? d.suggested_action}
              </span>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

const LOADER_STEPS = [
  "Reading hospital documents",
  "Extracting policy clauses",
  "Cross-referencing with AI",
  "Generating discrepancy report",
];

function AnalysisLoader({ t }: { t: Record<string, string> }) {
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
          {t["Analysing your claim"] ?? "Analysing your claim"}
        </h3>
        <p className="mt-1 text-[13px] text-muted">
          {t["This can take up to a minute on first run"] ??
            "This can take up to a minute on first run"}{" "}
          · {formatElapsed(elapsed)}
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
                {t[label] ?? label}
              </span>
              {isActive && (
                <span className="ml-auto text-[11px] uppercase tracking-wider font-bold text-brand">
                  {t["Running"] ?? "Running"}
                </span>
              )}
              {isDone && (
                <span className="ml-auto text-[11px] uppercase tracking-wider text-muted">
                  {t["Done"] ?? "Done"}
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