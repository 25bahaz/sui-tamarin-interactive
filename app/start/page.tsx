"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { AddressBadge } from "@/components/AddressBadge";
import { StepProgress } from "@/components/StepProgress";
import { loadIdentity, saveIdentity, updateIdentity } from "@/lib/storage";
import { explorerTxUrl } from "@/lib/sui";

type Phase =
  | "init"
  | "ready"
  | "funding"
  | "funded"
  | "error";

export default function StartPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("init");
  const [address, setAddress] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [fundDigest, setFundDigest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const existing = loadIdentity();
    if (existing) {
      setAddress(existing.address);
      setName(existing.name ?? "");
      if (existing.fundedDigest) {
        setFundDigest(existing.fundedDigest);
        setPhase("funded");
      } else {
        setPhase("ready");
      }
      return;
    }
    const kp = new Ed25519Keypair();
    const addr = kp.getPublicKey().toSuiAddress();
    const sk = kp.getSecretKey();
    saveIdentity({ address: addr, privateKey: sk });
    setAddress(addr);
    setPhase("ready");
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setError(null);
    setPhase("funding");
    updateIdentity({ name: name.trim() });
    try {
      const res = await fetch("/api/fund", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = (await res.json()) as { digest?: string; error?: string };
      if (!res.ok || !data.digest) {
        throw new Error(data.error ?? "Funding failed");
      }
      setFundDigest(data.digest);
      updateIdentity({ fundedDigest: data.digest });
      setPhase("funded");
    } catch (err) {
      setError((err as Error).message);
      setPhase("error");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-8">
      <StepProgress currentIndex={0} />
      <header>
        <h1 className="text-2xl font-medium">Your new Sui address</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generated locally in your browser. The private key never leaves this device.
        </p>
      </header>

      {phase === "init" ? (
        <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Generating keypair…
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Address
          </div>
          <div className="mt-1 break-all font-mono text-sm">{address}</div>
          <div className="mt-3">
            <AddressBadge address={address} />
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="text-sm font-medium">
            What name should appear in the gallery?
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            placeholder="e.g. bahadir"
            disabled={phase === "funding" || phase === "funded"}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        {phase !== "funded" && (
          <button
            type="submit"
            disabled={phase === "funding" || phase === "init"}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {phase === "funding" ? "Funding from sponsor…" : "Fund my address"}
          </button>
        )}

        {error && (
          <div className="overflow-hidden break-all rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive-foreground">
            {error}
          </div>
        )}

        {fundDigest && (
          <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-xs">
            <div className="font-medium text-foreground">Funded ✓</div>
            <a
              href={explorerTxUrl(fundDigest)}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block font-mono underline decoration-dotted hover:text-accent"
            >
              {fundDigest.slice(0, 10)}…{fundDigest.slice(-6)}
            </a>
          </div>
        )}

        {phase === "funded" && (
          <button
            type="button"
            onClick={() => router.push("/quiz")}
            className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90"
          >
            Start the quiz →
          </button>
        )}
      </form>
    </main>
  );
}
