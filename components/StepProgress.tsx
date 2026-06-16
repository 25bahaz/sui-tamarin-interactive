export type Step = {
  key: string;
  label: string;
};

export const JOURNEY_STEPS: Step[] = [
  { key: "address", label: "Address & Fund" },
  { key: "answer", label: "Answer" },
  { key: "submit", label: "Submit on-chain" },
  { key: "claim", label: "Claim NFT" },
];

export function StepProgress({
  currentIndex,
  steps = JOURNEY_STEPS,
}: {
  currentIndex: number;
  steps?: Step[];
}) {
  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center gap-2">
        {steps.map((s, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <li key={s.key} className="flex flex-1 items-center gap-2">
              <div
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-mono transition ${
                  done
                    ? "bg-primary text-primary-foreground"
                    : active
                      ? "bg-accent text-accent-foreground ring-2 ring-accent/40"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={`hidden text-xs sm:inline ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`h-px flex-1 ${
                    done ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-2 text-xs text-muted-foreground sm:hidden">
        Step {currentIndex + 1} of {steps.length} — {steps[currentIndex]?.label}
      </div>
    </nav>
  );
}
