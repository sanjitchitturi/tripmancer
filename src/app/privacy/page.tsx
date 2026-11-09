import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { PrivacyControls } from "@/components/PrivacyControls";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How TripMancer handles account and trip-planning data.",
};

export default function PrivacyPage() {
  return <PrivacyScreen />;
}

function PrivacyScreen() {
  const contact = process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL;
  return <article className="wrap page">
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow">Privacy</p>
      <h1 className="display mt-3">Your plans are yours.</h1>
      <p className="lede mt-5">Updated 6 November 2026. This notice describes the data handled by this deployment of TripMancer.</p>

      <div className="mt-10 grid gap-8">
        <Notice title="Data we handle">
          <p>Accounts contain a name, email address, sign-in method, hashed session token and, for password accounts, a password hash and optional recovery-key hash. Google sign-in stores the Google account identifier needed to recognize the account, not a Google access token. Saved trips can contain departure city, destination, dates, traveler count, interests, budget and packing or booking checklist choices. Guest plans and shortlists stay in browser storage until you clear them.</p>
        </Notice>
        <Notice title="Why we use it">
          <p>Account and trip data is used to authenticate you and save plans you ask us to keep. We do not run advertising, behavioral profiling, sale of personal data, or automated decisions with legal or similarly significant effects.</p>
        </Notice>
        <Notice title="Storage and sharing">
          <p>Account data is stored in Supabase Postgres. The app is hosted by Vercel. If you choose Google sign-in, Google authenticates you and returns basic identity information needed to create the account. Destination images and typefaces are served by TripMancer. Booking, insurance, eSIM and travel-money buttons open independent providers, whose privacy practices apply once you leave TripMancer. We do not send account data to those providers.</p>
        </Notice>
        <Notice title="Retention">
          <p>Account data remains until you delete the account. Expired sessions are unusable and failed-login records are pruned after one day. Deleting an account removes its sessions, trips, shortlist and recovery key. Backups may retain deleted records for the provider’s backup cycle.</p>
        </Notice>
        <Notice title="Cookies and local storage">
          <p>Signed-in accounts use one essential, HTTP-only session cookie named <code>tm_session</code>, retained for up to 30 days. Browser storage holds guest plans only. There are no analytics or advertising cookies in this app.</p>
        </Notice>
        <Notice title="Your choices and rights">
          <p>Use the controls below to export or delete your account data and clear browser-only plans. Depending on where you live, privacy laws may also provide rights to access, correct, restrict or object to certain processing. Contact the deployment operator for requests that the controls do not cover.</p>
          {contact ? <p className="mt-3">Privacy contact: <a className="underline" href={`mailto:${contact}`}>{contact}</a></p> : <p className="mt-3">A privacy contact email has not yet been configured for this deployment.</p>}
        </Notice>
        <Notice title="Security">
          <p>Passwords use salted scrypt hashes. Session and recovery credentials are stored as hashes. Google identity tokens are verified on the server for issuer, audience, signature, expiration and nonce before an account is created or signed in. Connections to the production database verify TLS certificates. The app applies cross-site write protection, input limits and account-level access checks.</p>
        </Notice>
      </div>
      <PrivacyControls />
      <p className="mt-8 text-muted">For how estimates and booking links work, see <Link href="/company" className="underline">About TripMancer</Link>.</p>
    </div>
  </article>;
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className="title-sm">{title}</h2><div className="mt-3 max-w-[70ch] leading-7 text-muted">{children}</div></section>;
}
