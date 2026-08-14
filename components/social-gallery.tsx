import type { PublicGalleryPhoto } from "@/lib/gallery/types";
import { PublicGalleryCard } from "./gallery-image";

export function SocialGallery({ photos }: { photos: PublicGalleryPhoto[] }) {
  const social = photos.filter((photo) => photo.variant === "social"); if (social.length === 0) return null;
  return <section className="social-section"><div className="content-shell"><div className="social-heading"><div><h2>Journal Social</h2><p><span className="heart-icon" aria-hidden="true">♥</span>Retrouvez nos inspirations quotidiennes</p></div></div>
    <div className="social-grid">{social.map((photo) => <PublicGalleryCard key={photo.id} className="social-card" src={photo.imageUrl} alt={photo.altText} width={photo.width} height={photo.height} sizes="(max-width: 768px) 50vw, 25vw" title={photo.title} externalUrl={photo.externalUrl} social />)}</div>
  </div></section>;
}
