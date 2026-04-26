"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import BrandLogo, { Wordmark } from "@/app/components/BrandLogo";

function PoliciesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function CasesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <rect x="8" y="14" width="8" height="4" rx="1" />
    </svg>
  );
}

function CompareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v18" />
      <path d="M5 7h4l-3 6h6l-3-6" />
      <path d="M15 7h4l-3 6h6l-3-6" />
      <path d="M5 21h14" />
    </svg>
  );
}

function ReportsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <path d="M7 14l3-3 3 3 5-5" />
      <circle cx="7" cy="14" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="13" cy="14" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="18" cy="9" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const tabs = [
  { href: "/dashboard/policies", label: "Policies", icon: PoliciesIcon },
  { href: "/dashboard/cases", label: "Cases", icon: CasesIcon },
  { href: "/dashboard/reports", label: "Reports", icon: ReportsIcon },
  { href: "/dashboard/compare", label: "Compare", icon: CompareIcon },
];

export default function DashboardNav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobile top header */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-line px-5 h-16 shrink-0">
        <Link
          href="/"
          className="group"
          aria-label="Indira home"
        >
          <BrandLogo size={32} withWordmark wordmarkSize={18} />
        </Link>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="p-2 flex flex-col gap-1.5"
          aria-label="Toggle menu"
        >
          <span className="block h-0.5 w-6 bg-ink" />
          <span className="block h-0.5 w-6 bg-ink" />
          <span className="block h-0.5 w-6 bg-ink" />
        </button>
      </div>

      {/* Sidebar (mobile sheet + desktop) */}
      <aside
        className={`
          ${menuOpen ? "block" : "hidden"}
          md:flex flex-col w-full md:w-[260px] shrink-0 z-40
          bg-gradient-to-b from-white to-[#FAFBFD]
          border-r border-line md:h-screen
        `}
      >
        {/* Brand header */}
        <div className="hidden md:flex items-center px-6 h-[72px] shrink-0 border-b border-line">
          <Link
            href="/"
            className="flex items-center gap-3 group"
            aria-label="Indira home"
          >
            <BrandLogo size={38} />
            <div className="flex flex-col leading-none">
              <Wordmark size={22} />
              <span className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                Claim · Audit · Appeal
              </span>
            </div>
          </Link>
        </div>

        {/* Section eyebrow */}
        <div className="px-6 pt-6 pb-2 hidden md:block">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
            Workspace
          </span>
        </div>

        <nav className="flex-1 px-3 md:px-3 pb-4 space-y-0.5 overflow-y-auto">
          {tabs.map((t) => {
            const active =
              t.href === "/dashboard/policies"
                ? pathname === t.href ||
                  pathname.startsWith("/dashboard/policies/")
                : pathname.startsWith(t.href);
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                onClick={() => setMenuOpen(false)}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-150 ${
                  active
                    ? "bg-brand-subtle text-brand"
                    : "text-muted hover:bg-surface hover:text-ink"
                }`}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-brand"
                  />
                )}
                <Icon
                  className={`w-[18px] h-[18px] ${
                    active ? "text-brand" : "text-muted"
                  }`}
                />
                <span className="flex-1">{t.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-line shrink-0">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white border border-line">
            <span
              className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-white text-[13px] font-bold"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-brand) 0%, #1B52D9 100%)",
              }}
            >
              {email[0]?.toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted leading-none mb-1">
                Signed in
              </div>
              <div className="truncate text-[13px] font-medium text-ink">
                {email}
              </div>
            </div>
            <button
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
              className="w-8 h-8 shrink-0 inline-flex items-center justify-center text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOutIcon className="w-[16px] h-[16px]" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
