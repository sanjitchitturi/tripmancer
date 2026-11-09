"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { safeReturnPath } from "@/lib/identity";
import { login, signup } from "@/lib/account";

export function AuthForm({ mode, googleEnabled }: { mode: "login" | "signup"; googleEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeReturnPath(params.get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const googleError = {
    google_unavailable: "Google sign-in is not configured yet.",
    google_cancelled: "Google sign-in was cancelled. Try again when you are ready.",
    google_failed: "Google sign-in could not be completed. Try again.",
    google_account_exists: "An account already uses this email. Sign in with its existing method.",
  }[params.get("error") ?? ""];

  async function finish(task: () => Promise<string | null>) {
    setPending(true);
    setError(null);
    try {
      const message = await task();
      if (message) {
        setError(message);
        return;
      }
      router.push(next);
    } catch {
      setError("The account server is unavailable.");
    } finally {
      setPending(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === "signup" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    await finish(() => (mode === "signup" ? signup(name, email, password) : login(email, password)));
  }


  const isSignup = mode === "signup";

  return (
    <div className="auth-layout">
      <div className="auth-panel">
        <div className="auth-form">
          <h1 className="title">{isSignup ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-3 leading-7 text-muted">
            {isSignup
              ? "Save trips and your shortlist across devices."
              : "Log in with the email and password for your TripMancer account."}
          </p>

          <form className="mt-8 grid gap-5" onSubmit={submit}>
            {isSignup ? (
              <label className="block">
                <span className="label">Name</span>
                <input
                  className="field mt-2"
                  value={name}
                  autoComplete="name"
                  required
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
            ) : null}
            <label className="block">
              <span className="label">Email</span>
              <input
                className="field mt-2"
                type="email"
                inputMode="email"
                value={email}
                autoComplete="email"
                required
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="label">Password</span>
              <span className="relative mt-2 block">
                <input
                  className="field pr-20"
                  aria-label="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  required
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="field-reveal"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </span>
              {isSignup ? <span className="mt-2 block text-[13px] text-subtle">At least 8 characters.</span> : null}
            </label>
            {isSignup ? (
              <label className="block">
                <span className="label">Confirm password</span>
                <input
                  className="field mt-2"
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  autoComplete="new-password"
                  required
                  onChange={(event) => setConfirm(event.target.value)}
                />
              </label>
            ) : null}
            {error || googleError ? (
              <p className="rounded-[var(--radius)] border border-bad/30 bg-bad/10 px-4 py-3 text-[14px] text-bad" role="alert">
                {error ?? googleError}
              </p>
            ) : null}
            <button className="btn btn-primary btn-lg btn-block mt-1" type="submit" disabled={pending}>
              {pending ? "One moment…" : isSignup ? "Create account" : "Log in"}
            </button>
          </form>

          {googleEnabled ? <>
            <div className="my-6 flex items-center gap-3 text-[13px] text-subtle"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
            <a className="btn btn-quiet btn-lg btn-block" href={`/api/auth/google?next=${encodeURIComponent(next)}`}>Continue with Google</a>
          </> : null}

          {isSignup ? (
            <p className="mt-4 text-[13px] text-subtle">
              By creating an account, you acknowledge the <Link href="/privacy" className="underline">privacy notice</Link>.
            </p>
          ) : null}
          {!isSignup && <Link href="/recovery" className="nav-link mt-3">Recover your account</Link>}
          <p className="mt-8 text-[15px] text-muted">
            {isSignup ? "Already have an account? " : "New to TripMancer? "}
            <Link
              href={`/${isSignup ? "login" : "signup"}?next=${encodeURIComponent(next)}`}
              className="font-semibold text-fg underline-offset-4 hover:underline"
            >
              {isSignup ? "Log in" : "Create an account"}
            </Link>
          </p>
          <p className="mt-3 text-[15px]">
            <Link href="/plan" className="text-muted underline-offset-4 transition-colors hover:text-fg hover:underline">
              Plan a free trip without an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
