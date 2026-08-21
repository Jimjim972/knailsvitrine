import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { GalleryGrid } from "@/components/gallery-grid";
import { SocialGallery } from "@/components/social-gallery";
import { getPublicGalleryPhotos } from "@/lib/data/gallery";
import { partitionPublicGalleryPhotos } from "@/lib/gallery/mappers";
import { buildPageMetadata } from "@/lib/site/metadata";

export const metadata: Metadata = buildPageMetadata("/galerie");

export default async function GaleriePage() {
  const photos = await getPublicGalleryPhotos();
  const { main: mainPhotos, social: socialPhotos, empty } = partitionPublicGalleryPhotos(photos);
  return <main className="page-main gallery-page"><PageHeading title="L'Art Sublimé">Explorez une sélection de nos plus belles créations, imaginées avec précision, des produits premium et un goût affirmé pour l&apos;élégance.</PageHeading>
    {empty
      ? <section className="content-shell public-empty-state"><h2>Galerie en préparation</h2><p>Nos prochaines créations seront bientôt disponibles.</p></section>
      : <><GalleryGrid photos={mainPhotos} /><SocialGallery photos={socialPhotos} /></>}
  </main>;
}
