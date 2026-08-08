import type { Metadata } from "next";
import Image from "next/image";
import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = {
  title: "Galerie",
  description: "Explorez les créations et l'univers de K'nails Beauty Institut.",
};

const gallery = [
  {
    src: "/images/nails-signature.jpg",
    alt: "Manucure signature rose et or",
    className: "gallery-featured",
    label: "Style signature",
    title: "Minimalisme & détails dorés",
  },
  {
    src: "/images/french-manucure.jpg",
    alt: "French manucure rose poudré",
    className: "gallery-small",
  },
  {
    src: "/images/salon-interior.jpg",
    alt: "Intérieur lumineux de l'institut",
    className: "gallery-small",
  },
  {
    src: "/images/manicure-tools.jpg",
    alt: "Outils de manucure et vernis premium",
    className: "gallery-wide-small",
  },
  {
    src: "/images/botanical-nail-art.jpg",
    alt: "Nail art botanique aux feuilles dorées",
    className: "gallery-wide-large",
  },
];

const socialImages = [
  { src: "/images/berry-coffee.jpg", alt: "Manucure couleur baie et tasse de café" },
  { src: "/images/matte-blush-nail.jpg", alt: "Ongle rose poudré au fini mat" },
  { src: "/images/spa-products.jpg", alt: "Produits de soin utilisés à l'institut" },
  { src: "/images/berry-manicure.jpg", alt: "Manucure rouge baie" },
];

export default function GaleriePage() {
  return (
    <main className="page-main gallery-page">
      <PageHeading title="L'Art Sublimé">
        Explorez une sélection de nos plus belles créations, imaginées avec précision, des produits
        premium et un goût affirmé pour l&apos;élégance.
      </PageHeading>

      <section className="gallery-grid content-shell" aria-label="Sélection de créations">
        {gallery.map((item, index) => (
          <article className={`gallery-card ${item.className}`} key={item.src}>
            <Image
              src={item.src}
              alt={item.alt}
              fill
              sizes="(max-width: 768px) 100vw, 66vw"
              loading={index < 2 ? "eager" : undefined}
            />
            <div className="gallery-hover" />
            {item.title && (
              <div className="gallery-caption">
                <span>{item.label}</span>
                <h2>{item.title}</h2>
              </div>
            )}
          </article>
        ))}
      </section>

      <section className="social-section">
        <div className="content-shell">
          <div className="social-heading">
            <div>
              <h2>Journal Social</h2>
              <p>
                <span className="heart-icon" aria-hidden="true">♥</span>
                Retrouvez nos inspirations quotidiennes @knails_institut
              </p>
            </div>
            <a href="https://www.instagram.com" target="_blank" rel="noreferrer">
              Voir le profil
            </a>
          </div>
          <div className="social-grid">
            {socialImages.map((item) => (
              <a
                className="social-card"
                href="https://www.instagram.com"
                target="_blank"
                rel="noreferrer"
                key={item.src}
                aria-label="Voir cette inspiration sur Instagram"
              >
                <Image src={item.src} alt={item.alt} fill sizes="(max-width: 768px) 50vw, 25vw" />
                <span className="social-overlay" aria-hidden="true">♥</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
