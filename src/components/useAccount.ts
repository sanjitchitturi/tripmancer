"use client";

import { useSyncExternalStore } from "react";
import { getAccountSnapshot, getServerAccount, subscribeAccount } from "@/lib/account";

export function useAccount() {
  return useSyncExternalStore(subscribeAccount, getAccountSnapshot, getServerAccount);
}
