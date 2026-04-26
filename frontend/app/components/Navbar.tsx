"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BrandLogo from "./BrandLogo";

const navLinks = [
  { label: "How it works", href: "#how" },
  { label: "Features", href: "#features" },
  { label: "Insurers", href: "#insurers" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar({ userEmail }: { userEmail?: string }) {

  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[color:var(--color-line)]">
      <nav className="max-w-[1280px] mx-auto flex items-center justify-between px-6 md:px-10 h-16">
        <Link
          href="/"
          className="group"
          aria-label="Indira home"
        >
          <BrandLogo size={36} withWordmark wordmarkSize={20} priority />
        </Link>

        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-[14px] font-medium text-[color:var(--color-ink)] hover:text-[color:var(--color-brand)] transition-colors"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-3">
          {userEmail ? (
            <>
              <Link
                href="/signup"
                className="inline-flex items-center rounded-lg bg-[color:var(--color-brand)] px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-[color:var(--color-brand-hover)]"
              >
                Audit my claim
              </Link>
              <ProfileMenu email={userEmail} />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-[14px] font-medium text-[color:var(--color-ink)] hover:text-[color:var(--color-brand)] transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center rounded-lg bg-[color:var(--color-brand)] px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-[color:var(--color-brand-hover)]"
              >
                Audit my claim
              </Link>
            </>
          )}
        </div>


        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden flex flex-col gap-1.5 p-2"
        >
          <span className="block h-0.5 w-6 bg-[color:var(--color-ink)]" />
          <span className="block h-0.5 w-6 bg-[color:var(--color-ink)]" />
          <span className="block h-0.5 w-6 bg-[color:var(--color-ink)]" />
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-[color:var(--color-line)] bg-white">
          <ul className="px-6 py-4 flex flex-col gap-3">
            {navLinks.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-2 text-[15px] font-medium text-[color:var(--color-ink)]"
                >
                  {l.label}
                </a>
              </li>
            ))}
            {userEmail ? (
              <li className="pt-2 mt-2 border-t border-[color:var(--color-line)] flex flex-col gap-2">
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 py-2"
                >
                  <span className="w-9 h-9 rounded-full bg-[color:var(--color-brand-subtle)] text-[color:var(--color-brand)] flex items-center justify-center text-[13px] font-semibold">
                    {userEmail[0]?.toUpperCase()}
                  </span>
                  <span className="flex flex-col min-w-0">
                    <span className="text-[12px] uppercase tracking-wider text-[color:var(--color-muted)] font-bold">
                      Signed in
                    </span>
                    <span className="text-[14px] text-[color:var(--color-ink)] truncate">
                      {userEmail}
                    </span>
                  </span>
                </Link>
              </li>
            ) : (
              <li>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="block py-2 text-[15px] font-medium text-[color:var(--color-ink)]"
                >
                  Sign in
                </Link>
              </li>
            )}
            <li>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex w-full justify-center items-center rounded-lg bg-[color:var(--color-brand)] px-4 py-2.5 text-[14px] font-semibold text-white"
              >
                Audit my claim
              </Link>
            </li>

          </ul>
        </div>
      )}
    </header>
  );
}

function ProfileMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const initial = email[0]?.toUpperCase() ?? "?";

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore — fall through to client refresh anyway
    }
    setOpen(false);
    router.refresh();
    router.push("/");
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="w-9 h-9 rounded-full bg-[color:var(--color-brand-subtle)] text-[color:var(--color-brand)] flex items-center justify-center text-[14px] font-semibold border border-transparent hover:border-[color:var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)]/30 transition-colors"
      >
        {initial}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-xl border border-[color:var(--color-line)] bg-white shadow-xl overflow-hidden z-50"
        >
          <div className="px-4 py-3 border-b border-[color:var(--color-line)] flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-[color:var(--color-brand-subtle)] text-[color:var(--color-brand)] flex items-center justify-center text-[14px] font-semibold shrink-0">
              {initial}
            </span>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted)] font-bold">
                Signed in as
              </div>
              <div className="text-[13px] text-[color:var(--color-ink)] truncate">
                {email}
              </div>
            </div>
          </div>
          <ul className="py-1">
            <li>
              <Link
                href="/dashboard"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface-alt)] transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 12l9-9 9 9M5 10v10h14V10"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/policies"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface-alt)] transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 3h10l3 4v14H4V7l3-4z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 12h8M8 16h5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                My policies
              </Link>
            </li>
          </ul>
          <div className="border-t border-[color:var(--color-line)] py-1">
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              disabled={signingOut}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface-alt)] transition-colors disabled:opacity-60 text-left"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 17l5-5-5-5M21 12H10"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

