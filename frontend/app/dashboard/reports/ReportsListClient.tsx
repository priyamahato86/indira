"use client";

import Link from "next/link";
import { useState } from "react";
import { findInsurer } from "@/lib/insurers";
import { useTranslate } from "@/hooks/useTranslate";
import type { ApiAnalysis, ApiCase } from "@/lib/serialize";

function bandColor(band: ApiAnalysis["risk_band"]): string {
  if (band === "green") return "#0F9D58";
  if (band === "yellow") return "#F6A93B";
  return "#E5484D";
}

function bandPill(band: ApiAnalysis["risk_band"]): string {
  if (band === "green")
    return "bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]";
  if (band === "yellow")
    return "bg-[#FEF7E0] text-[#B06000] border border-[#FAD28B]";
  return "bg-[#FCE8E6] text-[#C5221F] border border-[#F9C2CB]";
}

const STATUS_LABEL: Record<ApiAnalysis["status"], string> = {
  APPROVED: "Approved",
  NEEDS_REVIEW: "Needs review",
  REJECTED: "Rejected",
};

// All static UI strings to translate
const UI_STRINGS = [
  "Reports",
  "Insurance check reports",
  "Every case you've analysed against your policy. Click any report to open the full breakdown.",
  "Total reports",
  "Avg risk score",
  "High risk",
  "Clean claims",
  "All reports",
  "report",
  "reports",
  "No reports yet",
  "Run an insurance check on a case to generate a report. You'll see all your analysed claims here.",
  "Go to cases",
  "All clear",
  "issue",
  "issues",
  "high",
  "View →",
  "Switch to Hindi",
  "Switch to English",
];

export default function ReportsListClient({
  initial,
}: {
  initial: ApiCase[];
}) {
  const [lang, setLang] = useState<"en" | "hi">("en");
  const t = useTranslate(UI_STRINGS, lang);

  const total = initial.length;
  const counts = initial.reduce(
    (acc, c) => {
      const band = c.analysis?.risk_band ?? "yellow";
      acc[band] = (acc[band] ?? 0) + 1;
      return acc;
    },
    { green: 0, yellow: 0, red: 0 } as Record<
      ApiAnalysis["risk_band"],
      number
    >,
  );

  const avgScore = total
    ? Math.round(
      initial.reduce((sum, c) => sum + (c.analysis?.risk_score ?? 0), 0) /
      total,
    )
    : 0;

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-brand">
            {t["Reports"] ?? "Reports"}
          </div>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-tight">
            {t["Insurance check reports"] ?? "Insurance check reports"}
          </h1>
          <p className="mt-1 text-[14px] text-muted">
            {t["Every case you've analysed against your policy. Click any report to open the full breakdown."] ??
              "Every case you've analysed against your policy. Click any report to open the full breakdown."}
          </p>
        </div>

        {/* Language Toggle */}
        <button
          onClick={() => setLang((l) => (l === "en" ? "hi" : "en"))}
          className="flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-[13px] font-semibold hover:bg-surface transition-colors shadow-sm"
        >
          <span className="text-[16px]">{lang === "en" ? "🇮🇳" : "🇬🇧"}</span>
          {lang === "en"
            ? (t["Switch to Hindi"] ?? "Switch to Hindi")
            : (t["Switch to English"] ?? "Switch to English")}
        </button>
      </header>

      {total === 0 ? (
        <EmptyState t={t} />
      ) : (
        <>
          <section className="border border-line bg-white">
            <div className="grid grid-cols-2 md:grid-cols-4">
              <Stat label={t["Total reports"] ?? "Total reports"} value={String(total)} />
              <Stat
                label={t["Avg risk score"] ?? "Avg risk score"}
                value={String(avgScore)}
                accent={bandColor(
                  avgScore >= 70 ? "red" : avgScore >= 40 ? "yellow" : "green",
                )}
              />
              <Stat
                label={t["High risk"] ?? "High risk"}
                value={String(counts.red)}
                accent="#E5484D"
                hint={`${counts.red} of ${total}`}
              />
              <Stat
                label={t["Clean claims"] ?? "Clean claims"}
                value={String(counts.green)}
                accent="#0F9D58"
                hint={`${counts.green} of ${total}`}
                last
              />
            </div>
          </section>

          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">
                {t["All reports"] ?? "All reports"}
              </h2>
              <span className="text-[13px] text-muted">
                {total}{" "}
                {total === 1
                  ? (t["report"] ?? "report")
                  : (t["reports"] ?? "reports")}
              </span>
            </div>
            <div className="border border-line bg-white">
              {initial.map((c, i) => (
                <ReportRow
                  key={c.id}
                  caseData={c}
                  isLast={i === initial.length - 1}
                  t={t}
                  lang={lang}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
  last,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
  last?: boolean;
}) {
  return (
    <div
      className={`px-7 py-7 ${last ? "" : "border-r border-line"} border-b border-line md:border-b-0`}
    >
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
        {label}
      </div>
      <div
        className="mt-1.5 text-[44px] font-bold leading-none tracking-tight"
        style={{ color: accent ?? "var(--color-ink)" }}
      >
        {value}
      </div>
      {hint && <div className="mt-1.5 text-[12px] text-muted">{hint}</div>}
    </div>
  );
}

function ReportRow({
  caseData,
  isLast,
  t,
  lang,
}: {
  caseData: ApiCase;
  isLast: boolean;
  t: Record<string, string>;
  lang: "en" | "hi";
}) {
  // Translate dynamic patient/diagnosis strings per-row
  const rowStrings = [
    caseData.patient_name,
    caseData.diagnosis ?? "",
  ];
  const rowT = useTranslate(rowStrings, lang);

  const analysis = caseData.analysis!;
  const insurer = caseData.policy
    ? findInsurer(caseData.policy.insurer)
    : undefined;
  // Always use a fixed locale to avoid SSR/client hydration mismatch.
  // "en-GB" gives "26 Apr 2026" consistently on server and client.
  const analysed = new Date(analysis.analyzed_at).toLocaleDateString(
    lang === "hi" ? "hi-IN" : "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
  const issues = analysis.discrepancies.length;
  const highCount = analysis.discrepancies.filter(
    (d) => d.severity === "high",
  ).length;

  // Translate status labels
  const statusStrings = Object.values(STATUS_LABEL);
  const statusT = useTranslate(statusStrings, lang);

  return (
    <Link
      href={`/dashboard/reports/${caseData.id}`}
      className={`grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-surface transition-colors ${isLast ? "" : "border-b border-line"
        }`}
    >
      <div className="col-span-12 md:col-span-4 min-w-0">
        <div className="text-[15px] font-semibold truncate">
          {rowT[caseData.patient_name] ?? caseData.patient_name}
        </div>
        {caseData.diagnosis && (
          <div className="mt-0.5 text-[13px] text-muted truncate">
            {rowT[caseData.diagnosis] ?? caseData.diagnosis}
          </div>
        )}
      </div>

      <div className="col-span-6 md:col-span-2 min-w-0">
        {insurer && (
          <div className="inline-flex items-center gap-1.5 text-[13px]">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: insurer.accent }}
            />
            <span className="font-medium truncate">{insurer.short}</span>
          </div>
        )}
      </div>

      <div className="col-span-6 md:col-span-2">
        {analysis.status === "APPROVED" ? (
          <div className="flex items-baseline gap-1.5">
            <span className="text-[24px] font-bold leading-none tracking-tight text-[#0F9D58]">
              {100 - analysis.risk_score}%
            </span>
          </div>
        ) : (
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-[24px] font-bold leading-none tracking-tight"
              style={{ color: bandColor(analysis.risk_band) }}
            >
              {analysis.risk_score}
            </span>
            <span className="text-[12px] text-muted">/ 100</span>
          </div>
        )}
        <div
          className="mt-1 text-[11px] uppercase tracking-wider"
          style={{
            color:
              analysis.status === "APPROVED" ? "#0F9D58" : "var(--color-muted)",
          }}
        >
          {analysis.status === "APPROVED"
            ? lang === "hi"
              ? "विश्वास"
              : "Confidence"
            : (statusT[STATUS_LABEL[analysis.status]] ??
              STATUS_LABEL[analysis.status])}
        </div>
      </div>

      <div className="col-span-6 md:col-span-2">
        {issues === 0 ? (
          <div className="text-[13px] text-[#0F9D58] font-semibold inline-flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#0F9D58" opacity="0.15" />
              <path
                d="M8 12.5l2.5 2.5L16 9"
                stroke="#0F9D58"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t["All clear"] ?? "All clear"}
          </div>
        ) : (
          <div className="text-[13px]">
            <span className="font-semibold">{issues}</span>{" "}
            <span className="text-muted">
              {issues === 1
                ? (t["issue"] ?? "issue")
                : (t["issues"] ?? "issues")}
            </span>
          </div>
        )}
        {highCount > 0 && (
          <div className="mt-0.5 text-[11px] uppercase tracking-wider font-bold text-[#C5221F]">
            {highCount} {t["high"] ?? "high"}
          </div>
        )}
      </div>

      <div className="col-span-6 md:col-span-2 flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase rounded-full ${bandPill(analysis.risk_band)}`}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "currentColor" }}
          />
          {analysis.risk_band}
        </span>
        <div className="text-right">
          <div className="text-[11px] text-muted">{analysed}</div>
          <div className="text-[12px] font-semibold text-brand mt-0.5">
            {t["View →"] ?? "View →"}
          </div>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ t }: { t: Record<string, string> }) {
  return (
    <div className="border border-dashed border-line bg-white px-12 py-20 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-brand-subtle flex items-center justify-center mb-5">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 3v18h18" />
          <path d="M7 14l3-3 3 3 5-5" />
        </svg>
      </div>
      <h2 className="text-[20px] font-semibold">
        {t["No reports yet"] ?? "No reports yet"}
      </h2>
      <p className="mt-1.5 text-[14px] text-muted max-w-md mx-auto">
        {t["Run an insurance check on a case to generate a report. You'll see all your analysed claims here."] ??
          "Run an insurance check on a case to generate a report. You'll see all your analysed claims here."}
      </p>
      <Link
        href="/dashboard/cases"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand hover:bg-brand-hover px-4 py-2.5 text-[14px] font-semibold text-white"
      >
        {t["Go to cases"] ?? "Go to cases"}
      </Link>
    </div>
  );
}