import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { ServiceSection, type Service } from "@/components/service-section";

export const metadata: Metadata = {
  title: "Nos Services",
  description: "Découvrez les prestations de K'nails Beauty Institut.",
};

const nailServices: Service[] = [
  {
    name: "Manucure Russe",
    description:
      "Préparation méticuleuse de l'ongle et des cuticules pour un rendu net et une repousse retardée.",
    price: "45 €",
    duration: "45 min",
  },
  {
    name: "Pose Vernis Semi-Permanent",
    description:
      "Couleur éclatante et tenue impeccable jusqu'à 3 semaines. Large choix de teintes premium.",
    price: "35 €",
    duration: "30 min",
    badge: "Populaire",
  },
  {
    name: "Pose Complète Gel (Chablons)",
    description: "Rallongement sur-mesure pour une forme parfaite et une solidité optimale.",
    price: "75 €",
    duration: "90 min",
  },
];

const bodyServices: Service[] = [
  {
    name: "Modelage Relaxant Sur-Mesure",
    description:
      "Massage profond aux huiles précieuses pour dénouer les tensions et apaiser l'esprit.",
    price: "85 €",
    duration: "60 min",
  },
  {
    name: "Gommage Corps Éclat",
    description: "Exfoliation douce pour une peau soyeuse, lumineuse et parfaitement hydratée.",
    price: "50 €",
    duration: "40 min",
  },
];

const faceServices: Service[] = [
  {
    name: 'Soin Signature "Glow"',
    description:
      "Soin complet hydratant et illuminateur. Nettoyage profond, modelage et masque spécifique.",
    price: "95 €",
    duration: "75 min",
  },
  {
    name: "Lifting Colombien (Visage)",
    description:
      "Technique non invasive pour raffermir, lisser les ridules et redessiner l'ovale du visage.",
    price: "120 €",
    duration: "60 min",
    badge: "Nouveau",
  },
  {
    name: "Beauté du Regard",
    description:
      "Rehaussement et teinture pour un regard intensifié naturellement, sans mascara.",
    price: "65 €",
    duration: "60 min",
  },
];

export default function ServicesPage() {
  return (
    <main className="page-main">
      <PageHeading title="Nos Prestations">
        Découvrez notre carte de soins, une invitation à la détente et à la mise en beauté. Chaque
        prestation est réalisée avec une attention méticuleuse pour un résultat luxueux.
      </PageHeading>

      <ServiceSection
        eyebrow="L'Art de la Perfection"
        title="Onglerie & Manucure"
        image="/images/nails-signature.jpg"
        imageAlt="Manucure rose poudré avec détails dorés"
        imageTitle="Signature K'nails"
        imageCaption="L'élégance jusqu'au bout des ongles."
        services={nailServices}
        eager
      />
      <ServiceSection
        eyebrow="Détente Absolue"
        title="Soins du Corps"
        image="/images/spa-massage.jpg"
        imageAlt="Soin relaxant des mains dans un spa"
        imageTitle="Rituels Corps"
        imageCaption="Une parenthèse de bien-être."
        services={bodyServices}
        reverse
      />
      <ServiceSection
        eyebrow="Soins Premium"
        title="Esthétique & Visage"
        image="/images/skincare.jpg"
        imageAlt="Produits cosmétiques premium sur un décor rose"
        imageTitle="Soins Visage"
        imageCaption="Des protocoles experts pour sublimer votre peau."
        services={faceServices}
      />
    </main>
  );
}
