import type { Metadata } from "next";
import { Suspense } from "react";
import { io } from "next/cache";
import { PageHeading } from "@/components/page-heading";
import { ServiceSection } from "@/components/service-section";
import { getPublicServices } from "@/lib/data/services";
import { SERVICE_CATEGORY_BY_CODE } from "@/lib/services/constants";

export const metadata: Metadata = { title: "Nos Services", description: "Découvrez les prestations de K'nails Beauty Institut." };

export default function ServicesPage() {
  return <main className="page-main"><PageHeading title="Nos Prestations">Découvrez notre carte de soins, une invitation à la détente et à la mise en beauté. Chaque prestation est réalisée avec une attention méticuleuse pour un résultat luxueux.</PageHeading><Suspense fallback={<div className="content-shell public-services-loading" role="status" aria-label="Chargement des prestations"><span /><span /><span /></div>}><PublicServiceSections /></Suspense></main>;
}

async function PublicServiceSections() {
  await io();
  const services = await getPublicServices();
  return <>
    <ServiceSection eyebrow="L'Art de la Perfection" title={SERVICE_CATEGORY_BY_CODE.onglerie_manucure.publicLabel} image="/images/nails-signature.jpg" imageAlt="Manucure rose poudré avec détails dorés" imageTitle="Signature K'nails" imageCaption="L'élégance jusqu'au bout des ongles." services={services.onglerie_manucure} eager />
    <ServiceSection eyebrow="Détente Absolue" title={SERVICE_CATEGORY_BY_CODE.soins_corps.publicLabel} image="/images/spa-massage.jpg" imageAlt="Soin relaxant des mains dans un spa" imageTitle="Rituels Corps" imageCaption="Une parenthèse de bien-être." services={services.soins_corps} reverse />
    <ServiceSection eyebrow="Soins Premium" title={SERVICE_CATEGORY_BY_CODE.esthetique_visage.publicLabel} image="/images/skincare.jpg" imageAlt="Produits cosmétiques premium sur un décor rose" imageTitle="Soins Visage" imageCaption="Des protocoles experts pour sublimer votre peau." services={services.esthetique_visage} />
  </>;
}
