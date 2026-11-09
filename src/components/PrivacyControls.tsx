"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/account";
import { useAccount } from "@/components/useAccount";

import { clearDeviceSaves } from "@/lib/sync";

export function PrivacyControls() {
  const router = useRouter();
  const account = useAccount();
  const signedIn = Boolean(account.session);
  const googleAccount = account.session?.provider === "google";
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function clearDeviceData() {
    await clearDeviceSaves();
    setMessage("Saved plans and shortlists were cleared from this browser.");
  }

  async function exportData() {
    const response = await fetch("/api/account", { cache: "no-store" });
    if (!response.ok) {
      setMessage("Your account data could not be exported. Try again.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tripmancer-account-data.json";
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Your account export was downloaded.");
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get("password");
    if (typeof password !== "string") return;
    setDeleting(true);
    setMessage("");
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(googleAccount ? { confirmation: password } : { password }),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setMessage(data?.error ?? "Your account could not be deleted.");
        return;
      }
      await clearDeviceData();
      await logout();
      router.replace("/");
      router.refresh();
    } catch {
      setMessage("Could not finish the request. Check your connection and try again.");
    } finally {
      setDeleting(false);
    }
  }

  if (!account.ready) return <div className="card mt-8 h-48" aria-busy="true" />;

  return <section className="card mt-8 p-5 sm:p-6">
    <h2 className="title-sm">Your data controls</h2>
    <p className="mt-2 text-muted">Plans saved without an account stay only in this browser. Clearing them cannot be undone.</p>
    <div className="mt-5 flex flex-wrap gap-3">
      <button type="button" className="btn btn-quiet" onClick={() => { if (window.confirm("Permanently clear the plans and shortlist saved in this browser?")) clearDeviceData(); }}>Clear this browser’s plans</button>
      {signedIn && <button type="button" className="btn btn-quiet" onClick={() => void exportData().catch(() => setMessage("Could not download your export. Try again."))}>Download my account data</button>}
    </div>
    {signedIn && <form className="mt-8 border-t border-line pt-6" onSubmit={deleteAccount}>
      <h3 className="font-semibold">Delete account and server data</h3>
      <p className="mt-2 text-muted">This permanently deletes your account, sessions, saved trips and shortlist. {googleAccount ? "Type DELETE to continue." : "Enter your password to continue."}</p>
      <label className="mt-4 block max-w-md">{googleAccount ? "Confirmation" : "Password"}<input className="field mt-2" name="password" type={googleAccount ? "text" : "password"} autoComplete={googleAccount ? "off" : "current-password"} required minLength={googleAccount ? 6 : 8} maxLength={200} /></label>
      <button className="btn btn-quiet mt-4" type="submit" disabled={deleting}>{deleting ? "Deleting…" : "Delete my account"}</button>
    </form>}
    {message && <p className="mt-4" role="status">{message}</p>}
  </section>;
}
