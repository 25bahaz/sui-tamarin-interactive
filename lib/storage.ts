"use client";

const KEY = "sui-tamarin:identity:v1";

export type StoredIdentity = {
  address: string;
  privateKey: string;
  name?: string;
  fundedDigest?: string;
  submittedDigest?: string;
  nftId?: string;
};

export function loadIdentity(): StoredIdentity | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredIdentity;
  } catch {
    return null;
  }
}

export function saveIdentity(next: StoredIdentity) {
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function updateIdentity(patch: Partial<StoredIdentity>) {
  const cur = loadIdentity();
  if (!cur) return;
  saveIdentity({ ...cur, ...patch });
}

export function clearIdentity() {
  window.localStorage.removeItem(KEY);
}
