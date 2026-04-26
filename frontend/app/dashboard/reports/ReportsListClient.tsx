"use client";

import Link from "next/link";
import { findInsurer } from "@/lib/insurers";
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

export default function ReportsListClient({
  initial,
}: {
  initial: ApiCase[];
}) {
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
            Reports
          </div>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-tight">
            Insurance check reports
          </h1>
          <p className="mt-1 text-[14px] text-muted">
            Every case you&apos;ve analysed against your policy. Click any
            report to open the full breakdown.
          </p>
        </div>
      </header>

      {total === 0 ? (
        <EmptyState />
      ) : (
        <>
          <section className="border border-line bg-white">
            <div className="grid grid-cols-2 md:grid-cols-4">
              <Stat label="Total reports" value={String(total)} />
              <Stat
                label="Avg risk score"
                value={String(avgScore)}
                accent={bandColor(
                  avgScore >= 70 ? "red" : avgScore >= 40 ? "yellow" : "green",
                )}
              />
              <Stat
                label="High risk"
                value={String(counts.red)}
                accent="#E5484D"
                hint={`${counts.red} of ${total}`}
              />
              <Stat
                label="Clean claims"
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
                All reports
              </h2>
              <span className="text-[13px] text-muted">
                {total} {total === 1 ? "report" : "reports"}
              </span>
            </div>
            <div className="border border-line bg-white">
              {initial.map((c, i) => (
                <ReportRow
                  key={c.id}
                  caseData={c}
                  isLast={i === initial.length - 1}
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
      {hint && (
        <div className="mt-1.5 text-[12px] text-muted">{hint}</div>
      )}
    </div>
  );
}

function ReportRow({
  caseData,
  isLast,
}: {
  caseData: ApiCase;
  isLast: boolean;
}) {
  const analysis = caseData.analysis!;
  const insurer = caseData.policy
    ? findInsurer(caseData.policy.insurer)
    : undefined;
  const analysed = new Date(analysis.analyzed_at).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const issues = analysis.discrepancies.length;
  const highCount = analysis.discrepancies.filter(
    (d) => d.severity === "high",
  ).length;
  const detailHref = `/dashboard/reports/${caseData.id}`;

  return (
    <div
      className={`relative grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-surface transition-colors ${
        isLast ? "" : "border-b border-line"
      }`}
    >
      <Link
        href={detailHref}
        aria-label={`Open report for ${caseData.patient_name}`}
        className="absolute inset-0 z-0"
      />

      <div className="col-span-12 md:col-span-4 min-w-0 relative z-10 pointer-events-none">
        <div className="text-[15px] font-semibold truncate">
          {caseData.patient_name}
        </div>
        {caseData.diagnosis && (
          <div className="mt-0.5 text-[13px] text-muted truncate">
            {caseData.diagnosis}
          </div>
        )}
      </div>

      <div className="col-span-6 md:col-span-2 min-w-0 relative z-10 pointer-events-none">
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

      <div className="col-span-6 md:col-span-2 relative z-10 pointer-events-none">
        {analysis.status === "APPROVED" ? (
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-[24px] font-bold leading-none tracking-tight text-[#0F9D58]"
            >
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
              analysis.status === "APPROVED"
                ? "#0F9D58"
                : "var(--color-muted)",
          }}
        >
          {analysis.status === "APPROVED" ? "Confidence" : STATUS_LABEL[analysis.status]}
        </div>
      </div>

      <div className="col-span-6 md:col-span-2 relative z-10 pointer-events-none">
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
            All clear
          </div>
        ) : (
          <div className="text-[13px]">
            <span className="font-semibold">{issues}</span>{" "}
            <span className="text-muted">
              {issues === 1 ? "issue" : "issues"}
            </span>
          </div>
        )}
        {highCount > 0 && (
          <div className="mt-0.5 text-[11px] uppercase tracking-wider font-bold text-[#C5221F]">
            {highCount} high
          </div>
        )}
      </div>

      <div className="col-span-6 md:col-span-2 flex items-center justify-between gap-3 relative z-10">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase rounded-full pointer-events-none ${bandPill(analysis.risk_band)}`}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "currentColor" }}
          />
          {analysis.risk_band}
        </span>
        <div className="flex items-center gap-1.5">
          <RowIconLink
            href={`${detailHref}?print=1`}
            label="Download PDF"
            external
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6 14h12v7H6z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </RowIconLink>
          <RowIconLink
            href={`${detailHref}#share`}
            label="Share link"
            active={Boolean(caseData.share)}
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
          </RowIconLink>
          <div className="text-right ml-2">
            <div className="text-[11px] text-muted">{analysed}</div>
            <Link
              href={detailHref}
              className="text-[12px] font-semibold text-brand mt-0.5 hover:text-brand-hover inline-flex"
              onClick={(e) => e.stopPropagation()}
            >
              View →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function RowIconLink({
  href,
  label,
  children,
  external,
  active,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  external?: boolean;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onClick={(e) => e.stopPropagation()}
      title={label}
      aria-label={label}
      className={`relative w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
        active
          ? "bg-brand-subtle border-brand text-brand"
          : "bg-white border-line text-muted hover:border-brand hover:text-brand hover:bg-brand-subtle"
      }`}
    >
      {children}
      {active && (
        <span
          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-success border border-white"
          aria-hidden
        />
      )}
    </Link>
  );
}

function EmptyState() {
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
      <h2 className="text-[20px] font-semibold">No reports yet</h2>
      <p className="mt-1.5 text-[14px] text-muted max-w-md mx-auto">
        Run an insurance check on a case to generate a report. You&apos;ll see
        all your analysed claims here.
      </p>
      <Link
        href="/dashboard/cases"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand hover:bg-brand-hover px-4 py-2.5 text-[14px] font-semibold text-white"
      >
        Go to cases
      </Link>
    </div>
  );
}
