"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { QuizCard } from "@/components/QuizCard";
import {
  LifecycleStepper,
  initialLifecycle,
  type LifecycleState,
} from "@/components/LifecycleStepper";
import { AddressBadge } from "@/components/AddressBadge";
import { StepProgress } from "@/components/StepProgress";
import { QUIZ_QUESTIONS } from "@/lib/quiz-data";
import { loadIdentity, updateIdentity } from "@/lib/storage";
import { makeClient, explorerTxUrl, explorerObjectUrl } from "@/lib/sui";

// answering → submitting → resulted → claiming → claimed
type Phase = "answering" | "submitting" | "resulted" | "claiming" | "claimed" | "error";

export default function QuizPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    QUIZ_QUESTIONS.map(() => null),
  );
  const [phase, setPhase] = useState<Phase>("answering");
  const [lifecycle, setLifecycle] = useState<LifecycleState>(initialLifecycle);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [submitDigest, setSubmitDigest] = useState<string | null>(null);
  const [nftId, setNftId] = useState<string | null>(null);
  const [mintDigest, setMintDigest] = useState<string | null>(null);
  const [identity, setIdentity] = useState<{ address: string; name?: string } | null>(null);
  const cfgRef = useRef<{ packageId: string; quizObjectId: string } | null>(null);

  useEffect(() => {
    const id = loadIdentity();
    if (!id || !id.fundedDigest) {
      router.replace("/start");
      return;
    }
    setIdentity({ address: id.address, name: id.name });
    if (id.nftId) {
      setNftId(id.nftId);
      setScore(5);
      setSubmitDigest(id.submittedDigest ?? null);
      setPhase("claimed");
    } else if (id.submittedDigest) {
      // already submitted but didn't claim let them try again
      setSubmitDigest(id.submittedDigest);
    }
    fetch("/api/quiz-config")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        cfgRef.current = d;
      })
      .catch((e) => setError(e.message));
  }, [router]);

  function patchLife(patch: Partial<LifecycleState>) {
    setLifecycle((s) => ({ ...s, ...patch }));
  }

  async function onSubmitQuiz() {
    if (answers.some((a) => a === null)) {
      setError("Pick an answer for every question first.");
      return;
    }
    setError(null);
    setPhase("submitting");

    try {
      const id = loadIdentity();
      const cfg = cfgRef.current;
      if (!id || !cfg) throw new Error("Missing identity or config");

      const keypair = Ed25519Keypair.fromSecretKey(id.privateKey);
      const client = makeClient();

      const tx = new Transaction();
      tx.setSender(id.address);
      tx.moveCall({
        target: `${cfg.packageId}::quiz_nft::submit`,
        arguments: [
          tx.object(cfg.quizObjectId),
          tx.pure.string(id.name ?? "anon"),
          tx.pure.vector("u8", answers.map((a) => a ?? 0)),
        ],
      });

      patchLife({ sign: { status: "active" } });
      const built = await tx.build({ client });
      const sig = await keypair.signTransaction(built);
      patchLife({ sign: { status: "done" }, submit: { status: "active" } });

      const exec = await client.executeTransactionBlock({
        transactionBlock: built,
        signature: sig.signature,
        options: { showEffects: true, showEvents: true },
      });
      const digest = exec.digest;
      setSubmitDigest(digest);
      patchLife({
        digest,
        submit: { status: "done", detail: "digest received" },
        consensus: { status: "active" },
      });

      if (exec.effects) {
        patchLife({
          consensus: { status: "done" },
          commit: { status: "done" },
          execute: { status: "active" },
        });
      }
      if (exec.effects?.status?.status !== "success") {
        throw new Error(
          "submit tx failed: " + (exec.effects?.status?.error ?? "unknown"),
        );
      }
      patchLife({
        execute: { status: "done" },
        finality: { status: "active" },
      });

      const recordedType = `${cfg.packageId}::quiz_nft::SubmissionRecorded`;
      const recorded = (exec.events ?? []).find((e) => e.type === recordedType);
      const computedScore = Number(
        (recorded?.parsedJson as { score?: number | string } | undefined)?.score ?? 0,
      );
      setScore(computedScore);
      patchLife({
        finality: { status: "done", detail: `score ${computedScore}/5` },
        checkpoint: { status: "active" },
      });

      // Poll for checkpoint inclusion. The JSON-RPC indexer can lag a few
      // seconds behind execution, so "tx not found" early on is expected —
      // swallow it and keep polling. Checkpoint inclusion is the only step
      // we'll accept timing out on; everything before this is already final.
      let cpNum: string | undefined;
      const started = Date.now();
      const CHECKPOINT_TIMEOUT_MS = 90_000;
      while (Date.now() - started < CHECKPOINT_TIMEOUT_MS) {
        try {
          const b = await client.getTransactionBlock({
            digest,
            options: { showEffects: false },
          });
          if (b.checkpoint) {
            cpNum = b.checkpoint;
            break;
          }
        } catch (err) {
          // "Could not find the referenced transaction" — indexer not caught
          // up yet. Keep polling.
          if (process.env.NODE_ENV !== "production") {
            console.debug("checkpoint poll, retrying:", (err as Error).message);
          }
        }
        await new Promise((r) => setTimeout(r, 1000));
      }

      if (cpNum) {
        patchLife({
          checkpoint: { status: "done", detail: `#${cpNum}` },
          checkpointNumber: cpNum,
        });
      } else {
        // Don't fail the whole flow — the tx is already final, just the
        // checkpoint field hasn't landed in the indexer yet. Let them claim.
        patchLife({
          checkpoint: { status: "done", detail: "indexer lag — view on explorer" },
        });
      }

      updateIdentity({ submittedDigest: digest });
      setPhase("resulted");
    } catch (e) {
      setError((e as Error).message);
      setPhase("error");
    }
  }

  async function onClaim() {
    if (!submitDigest || !identity) return;
    setError(null);
    setPhase("claiming");
    try {
      const mintRes = await fetch("/api/mint", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          submitDigest,
          recipient: identity.address,
          name: identity.name ?? "anon",
        }),
      });
      const mintData = (await mintRes.json()) as {
        digest?: string;
        nftId?: string;
        error?: string;
      };
      if (!mintRes.ok || !mintData.nftId) {
        throw new Error(mintData.error ?? "Mint failed");
      }
      setNftId(mintData.nftId);
      setMintDigest(mintData.digest ?? null);
      updateIdentity({ nftId: mintData.nftId });
      setPhase("claimed");
    } catch (e) {
      setError((e as Error).message);
      setPhase("resulted"); // back to results so they can retry
    }
  }

  const stepIndex = (() => {
    switch (phase) {
      case "answering":
        return 1; // Answer
      case "submitting":
        return 2; // Submit on-chain
      case "resulted":
      case "claiming":
        return 3; // Claim
      case "claimed":
        return 3;
      case "error":
        return 2;
    }
  })();

  if (!identity) {
    return (
      <main className="mx-auto max-w-md px-5 py-8 text-sm text-muted-foreground">
        Loading…
      </main>
    );
  }

  const perfect = score === 5;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-8">
      <StepProgress currentIndex={stepIndex} />
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-medium">
          {phase === "answering" || phase === "error" ? "Five questions" : "On-chain"}
        </h1>
        <AddressBadge address={identity.address} />
      </header>

      {phase === "answering" || (phase === "error" && score === null) ? (
        <>
          <ol className="space-y-3">
            {QUIZ_QUESTIONS.map((q, i) => (
              <li key={q.id}>
                <QuizCard
                  question={q}
                  index={i}
                  total={QUIZ_QUESTIONS.length}
                  selected={answers[i]}
                  onSelect={(choice) =>
                    setAnswers((prev) => {
                      const next = [...prev];
                      next[i] = choice;
                      return next;
                    })
                  }
                />
              </li>
            ))}
          </ol>
          {error && (
            <div className="overflow-hidden break-all rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={onSubmitQuiz}
            className="rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Sign &amp; submit on-chain
          </button>
          <p className="text-center text-xs text-muted-foreground">
            One submission per address enforced by the Move VM.
          </p>
        </>
      ) : (
        <section className="space-y-4">
          {phase === "claimed" && !lifecycle.digest ? (
            <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm">
              <h2 className="text-lg font-medium">You&apos;ve already claimed</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                This browser&apos;s address has already submitted and minted on-chain. To take the
                quiz again as a new attendee, clear site storage or open an incognito tab.
              </p>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-medium">Transaction lifecycle</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Each step lights up when its on-chain signal arrives. Checkpoint
                  inclusion usually takes 2–6 seconds that&apos;s real Sui finality
                  latency, not a fake animation.
                </p>
              </div>
              <LifecycleStepper state={lifecycle} />
            </>
          )}

          {(phase === "resulted" || phase === "claiming" || phase === "claimed") &&
            score !== null && (
              <div className="rounded-xl border border-border bg-card p-4 text-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Final score
                </div>
                <div className="mt-1 text-3xl font-medium">{score}/5</div>

                {perfect && phase === "resulted" && (
                  <>
                    <p className="mt-3 text-sm">
                      Perfect score. Tap below and the host wallet will mint a
                      Cut Creature NFT directly to your address.
                    </p>
                    <button
                      type="button"
                      onClick={onClaim}
                      className="mt-3 w-full rounded-lg bg-accent px-4 py-3 text-sm font-medium text-accent-foreground transition hover:opacity-90"
                    >
                      Claim your Cut Creature →
                    </button>
                  </>
                )}

                {perfect && phase === "claiming" && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Minting from host wallet…
                  </p>
                )}

                {!perfect && phase === "resulted" && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Not a perfect score no NFT this round. Your submission is
                    still recorded on-chain forever, and you can show it off in
                    the gallery.
                  </p>
                )}

                {phase === "claimed" && nftId && (
                  <div className="mt-3 space-y-1">
                    <div className="text-xs text-muted-foreground">
                      Minted ✓ your NFT object:
                    </div>
                    <a
                      href={explorerObjectUrl(nftId)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs underline decoration-dotted hover:text-accent"
                    >
                      {nftId.slice(0, 12)}…{nftId.slice(-6)}
                    </a>
                    {mintDigest && (
                      <div className="text-xs">
                        mint tx:{" "}
                        <a
                          href={explorerTxUrl(mintDigest)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono underline decoration-dotted hover:text-accent"
                        >
                          {mintDigest.slice(0, 10)}…{mintDigest.slice(-6)}
                        </a>
                      </div>
                    )}
                  </div>
                )}
                {phase === 'claimed' || phase === 'resulted' ? 
                <Link
                  href="/gallery"
                  className="mt-4 inline-block w-full rounded-lg border border-border bg-background px-3 py-2 text-center text-xs font-medium transition hover:border-accent"
                >
                  See the gallery →
                </Link> : <></>
                }
              </div>
            )}

          {error && (
            <div className="overflow-hidden break-all rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs">
              {error}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
