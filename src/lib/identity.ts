export function cleanName(name: string): string | null {
  const value = name.trim().replace(/\s+/g, " ");
  if (value.length < 2 || value.length > 80) return null;
  if (/[\u0000-\u001f]/.test(value)) return null;
  return value;
}

export function cleanEmail(email: string): string | null {
  const value = email.trim().toLowerCase();
  if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
  return value;
}

export function passwordIssue(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (password.length > 200) return "Use a shorter password.";
  return null;
}

export function safeReturnPath(value: string | null): string {
  if (!value) return "/plan";
  try {
    const url = new URL(value, "https://trip.invalid");
    const allowed = /^\/(?:plan|explore|privacy|recovery|trips(?:\/[a-f0-9-]{36})?|destinations\/[a-z0-9-]+)$/;
    if (url.origin === "https://trip.invalid" && allowed.test(url.pathname)) return url.pathname + url.search;
  } catch {
    // An invalid return address falls back to the planner.
  }
  return "/plan";
}
