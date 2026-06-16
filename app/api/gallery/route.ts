import { getQuizConfig, makeClient } from "@/lib/sui";

export type GalleryItem = {
  nftId: string;
  participant: string;
  name: string;
  score: number;
  imageUrl?: string;
  digest: string;
  timestampMs?: number;
};

// Optional override: on-chain image_url points at the square IPFS folder
// (clean for Suiscan / wallets / marketplaces). For our own gallery we want
// the tight non-square originals. If NEXT_PUBLIC_GALLERY_GATEWAY is set, we
// rewrite each url to use it, preserving only the trailing /nft-N.png.
const GALLERY_GATEWAY = process.env.NEXT_PUBLIC_GALLERY_GATEWAY;

function displayImageUrl(onChainUrl: string | undefined): string | undefined {
  if (!onChainUrl) return undefined;
  if (!GALLERY_GATEWAY) return onChainUrl;
  const match = onChainUrl.match(/\/nft-\d+\.[a-zA-Z0-9]+$/);
  if (!match) return onChainUrl;
  return `${GALLERY_GATEWAY.replace(/\/$/, "")}${match[0]}`;
}

export async function GET() {
  try {
    const client = makeClient();
    const { packageId } = getQuizConfig();
    const eventType = `${packageId}::quiz_nft::NftMinted`;

    const events = await client.queryEvents({
      query: { MoveEventType: eventType },
      limit: 50,
      order: "descending",
    });

    const items: GalleryItem[] = [];
    for (const ev of events.data) {
      const f = ev.parsedJson as
        | {
            participant?: string;
            nft_id?: string;
            name?: string;
            score?: number | string;
          }
        | undefined;
      if (!f?.participant || !f.nft_id) continue;

      // Fetch image url lazily from the object itself (best-effort).
      let imageUrl: string | undefined;
      try {
        const obj = await client.getObject({
          id: f.nft_id,
          options: { showContent: true },
        });
        const fields = (obj.data?.content as { fields?: { image_url?: string } } | undefined)?.fields;
        imageUrl = fields?.image_url;
      } catch {
        // ignore
      }

      items.push({
        nftId: f.nft_id,
        participant: f.participant,
        name: String(f.name ?? ""),
        score: Number(f.score ?? 0),
        imageUrl: displayImageUrl(imageUrl),
        digest: ev.id.txDigest,
        timestampMs: ev.timestampMs ? Number(ev.timestampMs) : undefined,
      });
    }

    return Response.json({ items });
  } catch (e) {
    return Response.json(
      { error: (e as Error).message ?? "Gallery fetch failed", items: [] },
      { status: 500 },
    );
  }
}
