import type { Metadata } from "next";
import { Suspense } from "react";
import { io } from "next/cache";
import { PageHeading } from "@/components/page-heading";
import { ServiceSection } from "@/components/service-section";
import { getPublicServices } from "@/lib/data/services";
import { getServiceCategoryPresentation } from "@/lib/services/constants";

export const metadata: Metadata = { title: "Nos Services", description: "Découvrez les prestations de K'nails Beauty Institut." };

export default function ServicesPage() {
  return <main className="page-main"><PageHeading title="Nos Prestations">Découvrez notre carte de soins, une invitation à la détente et à la mise en beauté. Chaque prestation est réalisée avec une attention méticuleuse pour un résultat luxueux.</PageHeading><Suspense fallback={<div className="content-shell public-services-loading" role="status" aria-label="Chargement des prestations"><span /><span /><span /></div>}><PublicServiceSections /></Suspense></main>;
}

async function PublicServiceSections() {
  await io();
  const sections = (await getPublicServices()).filter((section) => section.services.length > 0);
  return <>{sections.map(({ category, services }, index) => {
    const presentation = getServiceCategoryPresentation(category.code, category.name);
    return <ServiceSection key={category.code} {...presentation} title={category.name} services={services} reverse={index % 2 === 1} eager={index === 0} />;
  })}</>;
}
