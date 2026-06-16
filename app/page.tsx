import Link from "next/link";

const STEPS = [
  {
    title: "An address, just for today",
    body: "Your browser generates a new fresh Sui Ed25519 keypair locally. The private key never leaves this device. You pick a name to display in the gallery.",
  },
  {
    title: "Funded by the host",
    body: "My sponsor wallet drips ~0.20 SUI to your new address so you can pay gas. One tap, one real on-chain transaction.",
  },
  {
    title: "Five questions",
    body: "Quick multiple-choice on today's Tamarin model. Your answers are signed locally and submitted on-chain as a single Move call one submission per address, enforced by the VM.",
  },
  {
    title: "Watch finality happen",
    body: "Sign → Submit → Consensus → Commit → Execute → Finality → Checkpoint plays out against real Sui Testnet RPC, with the actual digest and checkpoint number.",
  },
  {
    title: "5/5 = claim a Cut Creature",
    body: "Perfect score? Tap Claim and the host wallet mints you a Cut Creature NFT. Every minted NFT lives in the gallery for the rest of the day.",
  },
];

export default function WelcomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-5 py-10">
      <header className="flex flex-col gap-3">
        <span className="self-start rounded-full border border-border bg-card px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
          Sui · Tamarin · Interactive
        </span>
        <h1 className="text-3xl font-medium leading-tight sm:text-4xl">
          Send a real Sui transaction.
          <br />
          Watch finality happen, end to end.
        </h1>
        <p className="text-muted-foreground">
          A 90-second interactive built around todey&apos;s formal-verification
          talk. Everything you&apos;re about to do is on real Sui Testnet; no
          accounts, no wallet install.
        </p>
      </header>

      <ol className="space-y-3">
        {STEPS.map((s, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-mono text-primary-foreground">
              {i + 1}
            </span>
            <div className="min-w-0">
              <h2 className="font-medium text-card-foreground">{s.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-col items-center gap-3">
        <Link
          href="/start"
          className="w-full rounded-lg bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground transition hover:opacity-90 sm:w-auto sm:px-8"
        >
          Begin →
        </Link>
        <Link
          href="/gallery"
          className="text-xs text-muted-foreground underline decoration-dotted hover:text-accent"
        >
          or peek at the gallery first
        </Link>
      </div>
    </main>
  );
}
