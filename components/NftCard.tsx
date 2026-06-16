import { explorerAddressUrl, explorerObjectUrl, shortAddr } from "@/lib/sui";
import type { GalleryItem } from "@/lib/gallery";

export function NftCard({ item }: { item: GalleryItem }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      {item.imageUrl ? (
        <div className="w-full overflow-hidden rounded-lg bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={item.name}
            className="block h-auto w-full"
          />
        </div>
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-muted text-muted-foreground">
          ◆
        </div>
      )}
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <h3 className="truncate font-medium text-card-foreground">
          {item.name || "anon"}
        </h3>
        <span className="rounded-full bg-secondary/20 px-2 py-0.5 text-xs font-mono text-secondary-foreground">
          {item.score}/5
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <a
          href={explorerAddressUrl(item.participant)}
          target="_blank"
          rel="noreferrer"
          className="font-mono underline decoration-dotted hover:text-accent"
        >
          {shortAddr(item.participant)}
        </a>
        <a
          href={explorerObjectUrl(item.nftId)}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-dotted hover:text-accent"
        >
          object →
        </a>
      </div>
    </div>
  );
}
