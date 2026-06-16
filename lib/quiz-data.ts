// IMPORTANT: the `correctIndex` array must match the on-chain answer_key
// passed to `create_quiz`. The current on-chain key is [1, 3, 2, 1, 3].
//
// If you change a correctIndex below, you must re-run `create_quiz` with the
// new 5-byte key and update NEXT_PUBLIC_QUIZ_OBJECT_ID. Otherwise on-chain
// scoring will diverge from what the UI suggests.

export type QuizQuestion = {
  id: number;
  prompt: string;
  options: string[];
  correctIndex: number;
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    prompt: "What language are Sui smart contracts written in?",
    options: [
    "Solidity",
    "Move",
    "Rust",
    "Go",
    ],
    correctIndex: 1,
  },
  {
    id: 2,
    prompt: "What happens before a transaction reaches validators?",
    options: [
    "A checkpoint is created",
    "Consensus is executed",
    "The transaction is finalized",
    "The user signs the transaction",
    ],
    correctIndex: 3,
  },
  {
    id: 3,
    prompt: "Why are checkpoints useful in Sui?",
    options: [
    "They reduce gas costs",
    "They create new object IDs",
    "They provide a publicly verifiable record of finalized transactions",
    "They grant ownership permissions",
    ],
    correctIndex: 2,
  },
  {
    id: 4,
    prompt: "Why is Tamarin used in this project?",
    options: [
    "To create NFTs",
    "To formally verify security properties",
    "To improve network speed",
    "To reduce storage costs",
    ],
    correctIndex: 1,
  },
  {
    id: 5,
    prompt: "What do validators do after receiving a transaction?",
    options: [
    "Delete old objects",
    "Generate checkpoints locally",
    "Create wallet keys",
    "Verify and execute the transaction",
    ],
    correctIndex: 3,
  }
];


// The on-chain answer key derived from the correctIndex values above.
// Pass this 5-byte vector to `create_quiz`.
export function expectedAnswerKey(): number[] {
  return QUIZ_QUESTIONS.map((q) => q.correctIndex);
}
