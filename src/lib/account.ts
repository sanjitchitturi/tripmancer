import { cleanEmail, cleanName, passwordIssue } from "@/lib/identity";
import { sanitizeInput } from "@/lib/share";
import { connectSession, getRemote, logoutRemote, subscribeRemote, type Session } from "@/lib/sync";
import type { PlanInput } from "@/lib/types";

export type { Session };

export interface Trial {
  started: boolean;
  destination: string | null;
  input: PlanInput | null;
  imported: boolean;
}

export interface AccountSnapshot {
  ready: boolean;
  session: Session | null;
  trial: Trial;
}

const TRIAL = "tripmancer.trial";
const CHANGE = "tripmancer-account";

const emptyTrial: Trial = { started: false, destination: null, input: null, imported: false };
const serverSnapshot: AccountSnapshot = { ready: false, session: null, trial: emptyTrial };
let accountView: { remote: ReturnType<typeof getRemote>; key: string; snapshot: AccountSnapshot } | null = null;

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE));
}

export function subscribeAccount(onChange: () => void) {
  const unsub = subscribeRemote(onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    unsub();
    window.removeEventListener(CHANGE, onChange);
  };
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadTrial(): Trial {
  const trial = readJson<Trial>(TRIAL);
  if (!trial || typeof trial !== "object") return emptyTrial;
  return {
    started: Boolean(trial.started),
    destination: typeof trial.destination === "string" ? trial.destination : null,
    input: trial.input ? sanitizeInput(trial.input) : null,
    imported: Boolean(trial.imported),
  };
}

export function getServerAccount(): AccountSnapshot {
  return serverSnapshot;
}

export function getAccountSnapshot(): AccountSnapshot {
  if (typeof window === "undefined") return serverSnapshot;
  const remote = getRemote();
  if (!remote.ready) return serverSnapshot;
  const trial = loadTrial();
  const key = JSON.stringify(trial);
  if (accountView?.remote === remote && accountView.key === key) return accountView.snapshot;
  const snapshot = { ready: true, session: remote.session, trial };
  accountView = { remote, key, snapshot };
  return snapshot;
}

export function saveTrialInput(input: PlanInput) {
  if (typeof window === "undefined" || getRemote().session || !input.destinationSlug) return;
  const trial = loadTrial();
  if (JSON.stringify(input) === JSON.stringify(trial.input)) return;
  const next = { ...trial, started: true, imported: false, destination: input.destinationSlug, input };
  writeJson(TRIAL, next);
  accountView = null;
  emit();
}

async function postAuth(path: string, body: unknown): Promise<{ user: Session } | { error: string }> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as { user?: Session; error?: string } | null;
  if (!response.ok || !data?.user?.email || !data.user.name) {
    return { error: data?.error ?? "The account server is unavailable." };
  }
  return { user: { email: data.user.email, name: data.user.name, provider: data.user.provider === "google" ? "google" : "password" } };
}

export async function signup(name: string, email: string, password: string): Promise<string | null> {
  if (!cleanName(name)) return "Add your name.";
  if (!cleanEmail(email)) return "Use a real email.";
  const issue = passwordIssue(password);
  if (issue) return issue;
  try {
    const result = await postAuth("/api/auth/signup", { name, email, password });
    if ("error" in result) return result.error;
    await connectSession(result.user);
    return null;
  } catch {
    return "The account server is unavailable.";
  }
}

export async function login(email: string, password: string): Promise<string | null> {
  if (!cleanEmail(email)) return "Use a real email.";
  const issue = passwordIssue(password);
  if (issue && password.length < 8) return "Email or password does not match.";
  try {
    const result = await postAuth("/api/auth/login", { email, password });
    if ("error" in result) return result.error;
    await connectSession(result.user);
    return null;
  } catch {
    return "The account server is unavailable.";
  }
}

export function logout() {
  accountView = null;
  return logoutRemote();
}

export function normalizePhone(value: string): string | null {
  const digits = value.trim().replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}
