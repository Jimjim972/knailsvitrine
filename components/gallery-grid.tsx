import type { PublicGalleryPhoto } from "@/lib/gallery/types";
import { PublicGalleryCard } from "./gallery-image";

const classes = { featured: "gallery-featured", small: "gallery-small", wide_small: "gallery-wide-small", wide_large: "gallery-wide-large" } as const;

export function GalleryGrid({ photos }: { photos: PublicGalleryPhoto[] }) {
  const main = photos.filter((photo) => photo.variant !== "social");
  if (main.length === 0) return null;
  return <section className="gallery-grid content-shell" aria-label="Sélection de créations">
    {main.map((photo, index) => <PublicGalleryCard key={photo.id} className={`gallery-card ${classes[photo.variant as keyof typeof classes] ?? "gallery-small"}`} src={photo.imageUrl} alt={photo.altText} width={photo.width} height={photo.height} sizes="(max-width: 768px) 100vw, 66vw" eager={index < 2} title={photo.title} label={photo.label} externalUrl={photo.externalUrl} />)}
  </section>;
}
