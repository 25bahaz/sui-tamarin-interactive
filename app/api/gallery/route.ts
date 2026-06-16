import { fetchGalleryItems, type GalleryItem } from "@/lib/gallery";

export type { GalleryItem };

export async function GET() {
  try {
    const items = await fetchGalleryItems();
    return Response.json({ items });
  } catch (e) {
    return Response.json(
      { error: (e as Error).message ?? "Gallery fetch failed", items: [] },
      { status: 500 },
    );
  }
}
