# Sui · Tamarin · Interactive

A live, in-presentation demo for your Sui transaction-lifecycle formal-verification talk. Attendees scan a QR, mint a fresh address in-browser, get funded by your sponsor wallet, take a 5-question quiz, watch the **Sign → Submit → Consensus → Commit → Execute → Finality → Checkpoint** lifecycle play out against real Sui Testnet RPC, and — if they go 5/5 — get a Cut Creature NFT minted to their new address.

## Pieces

- `move/` — `quiz_nft` Move package. One module: `Quiz` (shared), `CutCreatureNFT`, `HostCap`. On-chain one-time submit + one-time mint enforcement.
- `lib/sui.ts` — `SuiJsonRpcClient` factory, keypair loader, explorer URL helpers.
- `lib/quiz-data.ts` — the 5 placeholder questions. Edit these for your talk; if you change `correctIndex` values, re-run `create_quiz` with the new key.
- `app/api/fund/route.ts` — sponsor wallet drips ~0.20 SUI to a new address. IP rate-limit 5/min.
- `app/api/mint/route.ts` — verifies on-chain that the submit tx emitted `SubmissionAccepted` for the recipient, then mints from `HOST_PRIVATE_KEY`.
- `app/api/gallery/route.ts` — reads `NftMinted` events for the gallery.
- `components/LifecycleStepper.tsx` — the 7-step animation driven off real RPC signals.

## One-time setup

### 1. Publish the Move package

```bash
sui client switch --env testnet
cd move
sui move build
sui move test                # optional
sui client publish --gas-budget 100000000
```

From the publish output, copy two values:

- the **package ID** → `NEXT_PUBLIC_PACKAGE_ID`
- the new **`HostCap` object id** owned by your wallet (you'll need it for the next call)

### 2. Create the shared `Quiz` object

Choose the 5-byte answer key matching the `correctIndex` of each question in `lib/quiz-data.ts`. With the defaults that's `[1, 1, 1, 1, 1]`.

```bash
sui client call \
  --package <PACKAGE_ID> \
  --module quiz_nft \
  --function create_quiz \
  --args <HOST_CAP_OBJECT_ID> "[1,1,1,1,1]" \
  --gas-budget 50000000
```

Copy the new **shared `Quiz` object id** from the `Object Changes` output → `NEXT_PUBLIC_QUIZ_OBJECT_ID`.

### 3. Fund your sponsor wallet

Hit the Sui Testnet faucet (Discord `#testnet-faucet`, the wallet, or `sui client faucet`) for the address whose private key you'll set as `SPONSOR_PRIVATE_KEY`. ~5 SUI is plenty for a 30-person session.

For a demo it's fine to use the same wallet for `SPONSOR_PRIVATE_KEY` and `HOST_PRIVATE_KEY`, but the `HOST_PRIVATE_KEY` wallet **must own the `HostCap`** (i.e. it's the wallet that published the package).

### 4. Export the bech32 private key

```bash
sui keytool export --key-identity <address-or-alias>
```

That prints a `suiprivkey1...` string. Drop it into `.env.local`.

### 5. Fill `.env.local`

Copy `.env.example` → `.env.local` and fill in everything.

### 6. Expose your dev server to the room

```bash
npm run dev
# in another terminal
ngrok http 3000
```

Set `NEXT_PUBLIC_SITE_URL` to the ngrok URL (e.g. `https://abc-1-2-3.ngrok.app`) and restart `npm run dev` so the QR encodes the public URL.

## Run

```bash
npm install
npm run dev
```

Then open the projector on `/` (the landing page renders the big QR), and let attendees scan.

## Routes at runtime

| Route | Use |
|---|---|
| `/` | Big QR + intro copy, put this on the projector |
| `/start` | Browser generates Ed25519 keypair, asks for name, calls `/api/fund` |
| `/quiz` | 5 questions → signs and submits a real Move call → lifecycle stepper plays |
| `/gallery` | Live grid of every minted NFT (queryEvents under the hood) |

## Lifecycle stepper — what the 7 phases actually map to

The Sui RPC does not expose all 7 phases as discrete transitions — we animate them as the underlying signals progressively arrive. Each step lights up at this moment:

| Step | Signal |
|---|---|
| **Sign** | `keypair.signTransaction(bytes)` resolves (client-side only) |
| **Submit** | `executeTransactionBlock` returns a digest |
| **Consensus** | First non-null effects in that response |
| **Commit** | Same response, effects present |
| **Execute** | `effects.status` populated |
| **Finality** | `effects.status.status === "success"` and `SubmissionAccepted` event found |
| **Checkpoint** | Polled `getTransactionBlock` finally returns a non-null `checkpoint` field (usually 2–6s — this is real Sui finality latency) |

The labels match the conceptual phases from your Tamarin model, so when each step lights up you can name the Tamarin rule that fired.

## Editing the quiz for your talk

Open `lib/quiz-data.ts` and edit the 5 entries. Then:

1. Update `correctIndex` for each question.
2. Re-call `create_quiz` with the new 5-byte key (Move byte vector).
3. Update `NEXT_PUBLIC_QUIZ_OBJECT_ID`.

Old `Quiz` objects keep their submission history forever — perfect for "we showed this same flow at the last talk."

## Security notes (intentional limits)

- The ephemeral private key lives in `localStorage`. It funds and signs throwaway addresses; do not move real funds to those addresses.
- `SPONSOR_PRIVATE_KEY` and `HOST_PRIVATE_KEY` are server-only. The funding endpoint is IP-rate-limited (5/min) to slow casual abuse; behind ngrok every attendee shares your one IP, so the 5/min is per-room, not per-attendee — increase it in `lib/rate-limit.ts` if needed.
- Mint authorization isn't trusted from the client — `/api/mint` re-verifies the on-chain event for the recipient before calling `mint_nft`.

## Move tests

```bash
cd move && sui move test
```

Covers: perfect score allows mint, double-submit aborts with code `1`.
