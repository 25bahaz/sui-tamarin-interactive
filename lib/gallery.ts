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
function displayImageUrl(onChainUrl: string | undefined): string | undefined {
  const galleryGateway = process.env.NEXT_PUBLIC_GALLERY_GATEWAY;
  if (!onChainUrl) return undefined;
  if (!galleryGateway) return onChainUrl;
  const match = onChainUrl.match(/\/nft-\d+\.[a-zA-Z0-9]+$/);
  if (!match) return onChainUrl;
  return `${galleryGateway.replace(/\/$/, "")}${match[0]}`;
}

export async function fetchGalleryItems(): Promise<GalleryItem[]> {
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

    let imageUrl: string | undefined;
    try {
      const obj = await client.getObject({
        id: f.nft_id,
        options: { showContent: true },
      });
      const fields = (obj.data?.content as { fields?: { image_url?: string } } | undefined)?.fields;
      imageUrl = fields?.image_url;
    } catch {
      // ignore — fall back to no image
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

  return items;
}
