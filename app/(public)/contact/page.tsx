import type { Metadata } from "next";
import Image from "next/image";
import { ContactForm } from "@/components/contact-form";
import { PageHeading } from "@/components/page-heading";
import { CONTACT_ADDRESS, CONTACT_OPENING_HOURS } from "@/lib/contact-details";

export const metadata: Metadata = {
  title: "Contact & Rendez-vous",
  description: "Contactez K'nails Beauty Institut et préparez votre prochain rendez-vous.",
};

export default function ContactPage() {
  return (
    <main className="page-main contact-page content-shell">
      <PageHeading title="Contact & Rendez-vous">
        Prenez le temps de vous chouchouter. Laissez-nous un message ou réservez directement votre
        moment de détente.
      </PageHeading>

      <div className="contact-grid">
        <section className="contact-panel">
          <h2>Envoyez-nous un message</h2>
          <ContactForm />
        </section>

        <aside className="contact-sidebar">
          <section className="info-card">
            <h2>Informations pratiques</h2>
            <div className="info-row">
              <span className="info-icon" aria-hidden="true">⌖</span>
              <div>
                <h3>Adresse</h3>
                <p>{CONTACT_ADDRESS}</p>
              </div>
            </div>
            <div className="info-row">
              <span className="info-icon" aria-hidden="true">☎</span>
              <div>
                <h3>Téléphone</h3>
                <a href="tel:+33123456789">+33 1 23 45 67 89</a>
              </div>
            </div>
            <div className="info-row">
              <span className="info-icon" aria-hidden="true">◷</span>
              <div>
                <h3>Horaires</h3>
                {CONTACT_OPENING_HOURS.map(({ days, hours }) => (
                  <p key={days}>{days} : {hours}</p>
                ))}
              </div>
            </div>
          </section>

          <div className="map-card">
            <Image
              src="/images/map-saint-joseph.webp"
              alt="Plan stylisé de Saint-Joseph en Martinique"
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
            />
            <span className="map-tint" />
          </div>
        </aside>
      </div>
    </main>
  );
}
