"use client";

import { useState } from "react";

export function AddressBadge({
  address,
  network = "testnet",
}: {
  address: string;
  network?: string;
}) {
  const [copied, setCopied] = useState(false);
  if (!address) return null;
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  const url = `https://suiexplorer.com/address/${address}?network=${network}`;

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-mono">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="underline decoration-dotted hover:text-accent"
      >
        {short}
      </a>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground"
        onClick={async () => {
          await navigator.clipboard.writeText(address);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
      >
        {copied ? "✓" : "copy"}
      </button>
    </span>
  );
}
