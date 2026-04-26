"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import BrandLogo from "@/app/components/BrandLogo";

type Mode = "login" | "signup";

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/dashboard/policies";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${isSignup ? "signup" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-[color:var(--color-surface)]">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center mb-8 text-[color:var(--color-ink)]"
        >
          <BrandLogo size={36} withWordmark wordmarkSize={20} priority />
        </Link>

        <div className="bg-white border border-[color:var(--color-line)] rounded-2xl p-8 shadow-sm">
          <h1 className="text-[24px] font-semibold tracking-tight">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-[14px] text-[color:var(--color-muted)]">
            {isSignup
              ? "Start auditing your claims in under a minute."
              : "Sign in to your Indira vault."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-[13px] font-medium mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[color:var(--color-line)] px-3.5 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)] focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={isSignup ? 6 : undefined}
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[color:var(--color-line)] px-3.5 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)] focus:border-transparent"
                placeholder={isSignup ? "At least 6 characters" : ""}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-[13px] text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[color:var(--color-brand)] hover:bg-[color:var(--color-brand-hover)] disabled:opacity-60 px-4 py-2.5 text-[14px] font-semibold text-white transition-colors"
            >
              {loading
                ? "Please wait…"
                : isSignup
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[color:var(--color-line)] text-[13px] text-center text-[color:var(--color-muted)]">
            {isSignup ? (
              <>
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-[color:var(--color-brand)] hover:underline"
                >
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New to Indira?{" "}
                <Link
                  href="/signup"
                  className="font-medium text-[color:var(--color-brand)] hover:underline"
                >
                  Create an account
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

