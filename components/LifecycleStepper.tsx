"use client";

import { motion } from "framer-motion";
import { explorerTxUrl } from "@/lib/sui";

export type StepKey =
  | "sign"
  | "submit"
  | "consensus"
  | "commit"
  | "execute"
  | "finality"
  | "checkpoint";

export type StepState = {
  status: "pending" | "active" | "done";
  detail?: string;
};

export type LifecycleState = {
  [K in StepKey]: StepState;
} & {
  digest?: string;
  checkpointNumber?: string;
};

export const STEP_ORDER: StepKey[] = [
  "sign",
  "submit",
  "consensus",
  "commit",
  "execute",
  "finality",
  "checkpoint",
];

const STEP_META: Record<StepKey, { title: string; what: string }> = {
  sign: {
    title: "Sign",
    what: "Ed25519 signature over the tx bytes happens entirely in your browser.",
  },
  submit: {
    title: "Submit",
    what: "Signed bytes leave your device for a Sui fullnode.",
  },
  consensus: {
    title: "Consensus",
    what: "Validators sequence the tx (Mysticeti for shared objects).",
  },
  commit: {
    title: "Commit",
    what: "The certified tx is durably recorded by the validator network.",
  },
  execute: {
    title: "Execute",
    what: "Move VM runs your call against the current object state.",
  },
  finality: {
    title: "Finality",
    what: "Effects published the outcome is the canonical result of this tx.",
  },
  checkpoint: {
    title: "Checkpoint",
    what: "Tx is anchored in a numbered checkpoint, externally verifiable forever.",
  },
};

export function initialLifecycle(): LifecycleState {
  return STEP_ORDER.reduce(
    (acc, k) => ({ ...acc, [k]: { status: "pending" } }),
    {} as LifecycleState,
  );
}

export function LifecycleStepper({ state }: { state: LifecycleState }) {
  return (
    <ol className="space-y-2">
      {STEP_ORDER.map((k, i) => {
        const s = state[k];
        const meta = STEP_META[k];
        const isDone = s.status === "done";
        const isActive = s.status === "active";
        return (
          <li
            key={k}
            className={`relative overflow-hidden rounded-xl border p-3 transition ${
              isDone
                ? "border-primary/60 bg-primary/10"
                : isActive
                  ? "border-accent bg-accent/10"
                  : "border-border bg-card/40 opacity-70"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="lifecycle-glow"
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-accent/30 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
              />
            )}
            <div className="relative flex items-baseline gap-3">
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-mono ${
                  isDone
                    ? "bg-primary text-primary-foreground"
                    : isActive
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? "✓" : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-medium text-card-foreground">{meta.title}</h3>
                  {s.detail && (
                    <span className="font-mono text-xs text-muted-foreground">
                      {s.detail}
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {meta.what}
                </p>
              </div>
            </div>
          </li>
        );
      })}
      {state.digest && (
        <li className="pt-1 text-xs text-muted-foreground">
          digest:{" "}
          <a
            href={explorerTxUrl(state.digest)}
            target="_blank"
            rel="noreferrer"
            className="font-mono underline decoration-dotted hover:text-accent"
          >
            {state.digest.slice(0, 10)}…{state.digest.slice(-6)}
          </a>
          {state.checkpointNumber && (
            <span className="ml-3">checkpoint #{state.checkpointNumber}</span>
          )}
        </li>
      )}
    </ol>
  );
}
