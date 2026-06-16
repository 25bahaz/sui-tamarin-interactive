import { NextRequest } from "next/server";
import { Transaction } from "@mysten/sui/transactions";
import { isValidSuiAddress } from "@mysten/sui/utils";
import { getQuizConfig, loadServerKeypair, makeClient } from "@/lib/sui";

const NFT_GATEWAY =
  process.env.NEXT_PUBLIC_NFT_GATEWAY ??
  "https://amethyst-chemical-swift-668.mypinata.cloud/ipfs/bafybeig3mfpbftdeunhb5pjzny2yd7rjozsz7ti6vq75vjc34by4zxzckm";
const NFT_COUNT = Number(process.env.NEXT_PUBLIC_NFT_COUNT ?? 20);

function pickNftImageUrl(recipient: string): string {
  // Deterministic 1-based index from the address so the same address always
  // gets the same Cut Creature.
  const idx = (parseInt(recipient.slice(2, 10), 16) % NFT_COUNT) + 1;
  return `${NFT_GATEWAY.replace(/\/$/, "")}/nft-${idx}.png`;
}

export async function POST(req: NextRequest) {
  let body: { submitDigest?: string; recipient?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { submitDigest, recipient, name } = body;
  if (!submitDigest || typeof submitDigest !== "string") {
    return Response.json({ error: "Missing submitDigest" }, { status: 400 });
  }
  if (!recipient || !isValidSuiAddress(recipient)) {
    return Response.json({ error: "Invalid recipient address" }, { status: 400 });
  }
  if (!name || typeof name !== "string" || name.length === 0 || name.length > 64) {
    return Response.json({ error: "Invalid name" }, { status: 400 });
  }

  try {
    const client = makeClient();
    const { packageId, quizObjectId } = getQuizConfig();

    // Verify on-chain that the submit tx exists and emitted SubmissionAccepted
    // for this recipient. Bumped timeout to ride out testnet indexer lag.
    const tx = await client.waitForTransaction({
      digest: submitDigest,
      options: { showEvents: true, showEffects: true },
      timeout: 120_000,
      pollInterval: 1_000,
    });

    if (tx.effects?.status?.status !== "success") {
      return Response.json(
        { error: "Submission tx did not succeed on-chain" },
        { status: 400 },
      );
    }

    const acceptedType = `${packageId}::quiz_nft::SubmissionAccepted`;
    const accepted = (tx.events ?? []).find((e) => {
      if (e.type !== acceptedType) return false;
      const fields = e.parsedJson as { participant?: string; score?: number | string } | undefined;
      return fields?.participant === recipient && Number(fields?.score) === 5;
    });
    if (!accepted) {
      return Response.json(
        { error: "No SubmissionAccepted event found for this recipient in that digest" },
        { status: 400 },
      );
    }

    const host = loadServerKeypair("HOST_PRIVATE_KEY");
    const mintTx = new Transaction();

    // Prefer HOST_CAP from env (set after publish); fall back to looking it up
    // among the host wallet's owned objects.
    let capId = process.env.HOST_CAP;
    if (!capId) {
      const hostAddress = host.getPublicKey().toSuiAddress();
      const owned = await client.getOwnedObjects({
        owner: hostAddress,
        filter: { StructType: `${packageId}::quiz_nft::HostCap` },
        options: { showType: true },
      });
      capId = owned.data[0]?.data?.objectId;
    }
    if (!capId) {
      return Response.json(
        { error: "No HostCap found. Set HOST_CAP env or ensure HOST_PRIVATE_KEY is the wallet that published the package." },
        { status: 500 },
      );
    }

    const imageUrl = pickNftImageUrl(recipient);

    mintTx.moveCall({
      target: `${packageId}::quiz_nft::mint_nft`,
      arguments: [
        mintTx.object(capId),
        mintTx.object(quizObjectId),
        mintTx.pure.address(recipient),
        mintTx.pure.string(name),
        mintTx.pure.string(imageUrl),
      ],
    });

    const result = await client.signAndExecuteTransaction({
      signer: host,
      transaction: mintTx,
      options: { showEffects: true, showEvents: true, showObjectChanges: true },
    });

    if (result.effects?.status?.status !== "success") {
      return Response.json(
        { error: "Mint tx failed: " + (result.effects?.status?.error ?? "unknown") },
        { status: 500 },
      );
    }

    const mintedType = `${packageId}::quiz_nft::CutCreatureNFT`;
    const created = (result.objectChanges ?? []).find(
      (c) => c.type === "created" && c.objectType === mintedType,
    );
    const nftId = created && "objectId" in created ? created.objectId : undefined;

    return Response.json({
      digest: result.digest,
      nftId,
    });
  } catch (e) {
    return Response.json(
      { error: (e as Error).message ?? "Mint failed" },
      { status: 500 },
    );
  }
}
