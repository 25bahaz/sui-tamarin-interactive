import Link from "next/link";
import { NftCard } from "@/components/NftCard";
import type { GalleryItem } from "@/app/api/gallery/route";

export const dynamic = "force-dynamic";

async function fetchGallery(): Promise<{
  items: GalleryItem[];
  error?: string;
}> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const res = await fetch(`${base.replace(/\/$/, "")}/api/gallery`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { items: [], error: body.error ?? `HTTP ${res.status}` };
  }
  return (await res.json()) as { items: GalleryItem[] };
}

export default async function GalleryPage() {
  const { items, error } = await fetchGallery();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium">Cut Creatures gallery</h1>
          <p className="text-sm text-muted-foreground">
            Every 5/5 submission, minted live from the host wallet.
          </p>
        </div>
        <Link
          href="/"
          className="text-xs text-muted-foreground underline decoration-dotted hover:text-accent"
        >
          ← home
        </Link>
      </header>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No one has minted yet. Be the first 5/5 of the day.
        </div>
      ) : (
        <ul className="flex flex-wrap justify-center gap-3 sm:justify-start">
          {/* width math: at mobile 2 cards per row (half minus half the gap) */}
          {items.map((item) => (
            <li
              key={item.nftId}
              className="w-[calc(50%-0.375rem)] sm:w-44 md:w-52 lg:w-56"
            >
              <NftCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
