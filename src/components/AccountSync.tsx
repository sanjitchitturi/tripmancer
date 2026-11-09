"use client";

import { useEffect } from "react";
import { startSync } from "@/lib/sync";

export function AccountSync() {
  useEffect(() => {
    startSync();
  }, []);
  return null;
}
