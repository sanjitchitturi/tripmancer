import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <SignupForm />
    </Suspense>
  );
}

async function SignupForm() {
  await connection();
  return <AuthForm mode="signup" googleEnabled={googleConfigured()} />;
}

function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}
