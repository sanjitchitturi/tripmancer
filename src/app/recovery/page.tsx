"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAccount } from "@/components/useAccount";

export default function RecoveryPage() {
  const account = useAccount();
  const [key, setKey] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const signedIn = Boolean(account.session);
  const googleAccount = account.session?.provider === "google";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setBusy(true);
    setKey("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/recovery", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "Recovery failed. Try again."); return; }
      form.reset();
      if (result.key) { setKey(result.key); setMessage("Store this key in your password manager."); }
      else setMessage("Password changed. Log in with your new password and generate a new recovery key.");
    } catch {
      setMessage("The server could not be reached. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!account.ready) return <p className="wrap page" role="status">Loading account…</p>;
  return <section className="wrap page">
    <div className="card mx-auto max-w-lg p-6">
      <h1 className="title">{signedIn ? "Recovery key" : "Recover your account"}</h1>
      <p className="mt-3 text-muted">{googleAccount ? "This account uses Google sign-in, so it does not need a TripMancer recovery key." : signedIn ? "Generate a one-time password reset key. Generating a new key replaces your previous one." :
        "Use the recovery key you saved from your trip library. A successful reset signs out your active sessions."}</p>
      {!googleAccount && <form className="mt-6 grid gap-4" onSubmit={submit}>
        {!signedIn && <>
          <label>Email<input className="field mt-1" type="email" name="email" autoComplete="email" required /></label>
          <label>Recovery key<input className="field mt-1" name="key" type="password" autoComplete="off" required /></label>
        </>}
        <label>{signedIn ? "Current password" : "New password"}<input className="field mt-1" type="password" name="password" minLength={8} maxLength={200}
          autoComplete={signedIn ? "current-password" : "new-password"} required /></label>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Working…" : signedIn ? "Generate recovery key" : "Reset password"}</button>
      </form>}
      <p className="mt-4" role="status">{message}</p>
      {key && signedIn && <code className="tile block select-all break-all p-3">{key}</code>}
      <Link className="chip mt-4" href={signedIn ? "/trips" : "/login"}>{signedIn ? "Back to trips" : "Log in"}</Link>
    </div>
  </section>;
}
