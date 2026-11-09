import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <LoginForm />
    </Suspense>
  );
}

async function LoginForm() {
  await connection();
  return <AuthForm mode="login" googleEnabled={googleConfigured()} />;
}

function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}
