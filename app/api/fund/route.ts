import { NextRequest } from "next/server";
import { Transaction } from "@mysten/sui/transactions";
import { isValidSuiAddress } from "@mysten/sui/utils";
import { loadServerKeypair, makeClient } from "@/lib/sui";
import { checkRateLimit } from "@/lib/rate-limit";

const FUND_AMOUNT_MIST = BigInt(200_000_000); // 0.20 SUI

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anon";
  const rl = checkRateLimit(`fund:${ip}`, 5, 60_000);
  if (!rl.ok) {
    return Response.json(
      { error: `Too many funding requests. Try again in ${Math.ceil((rl.retryAfterMs ?? 0) / 1000)}s.` },
      { status: 429 },
    );
  }

  let body: { address?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const address = body.address;
  if (!address || !isValidSuiAddress(address)) {
    return Response.json({ error: "Invalid Sui address" }, { status: 400 });
  }

  try {
    const client = makeClient();
    const sponsor = loadServerKeypair("SPONSOR_PRIVATE_KEY");

    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [FUND_AMOUNT_MIST]);
    tx.transferObjects([coin], address);

    const result = await client.signAndExecuteTransaction({
      signer: sponsor,
      transaction: tx,
      options: { showEffects: true },
    });

    return Response.json({
      digest: result.digest,
      amountMist: FUND_AMOUNT_MIST.toString(),
    });
  } catch (e) {
    return Response.json(
      { error: (e as Error).message ?? "Funding failed" },
      { status: 500 },
    );
  }
}
