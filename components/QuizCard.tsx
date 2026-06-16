"use client";

import type { QuizQuestion } from "@/lib/quiz-data";

export function QuizCard({
  question,
  index,
  total,
  selected,
  onSelect,
}: {
  question: QuizQuestion;
  index: number;
  total: number;
  selected: number | null;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        Question {index + 1} of {total}
      </div>
      <h2 className="mt-2 text-lg font-medium leading-snug text-card-foreground">
        {question.prompt}
      </h2>
      <ul className="mt-4 space-y-2">
        {question.options.map((opt, i) => {
          const active = selected === i;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background hover:border-accent"
                }`}
              >
                <span className="mr-2 font-mono text-xs text-muted-foreground">
                  {String.fromCharCode(65 + i)}.
                </span>
                {opt}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
