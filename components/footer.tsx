import Link from "next/link";
import { cacheLife } from "next/cache";

async function getCurrentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function Footer() {
  const currentYear = await getCurrentYear();
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <p className="footer-brand">K&apos;nails Beauty Institut</p>
          <p className="footer-tagline">L&apos;excellence de la beauté, à votre service.</p>
        </div>
        <div className="footer-column">
          <h2>Explorer</h2>
          <Link href="/services">Nos services</Link>
          <Link href="/galerie">Galerie</Link>
        </div>
        <div className="footer-column">
          <h2>Nous contacter</h2>
          <Link href="/contact">Contact & rendez-vous</Link>
          <p>123 Avenue de la Beauté, Paris</p>
          <a href="tel:+33123456789">+33 1 23 45 67 89</a>
        </div>
        <div className="footer-column">
          <h2>Horaires</h2>
          <p>Mar – Sam : 10h00 – 19h00</p>
          <p>Fermé le lundi et le dimanche</p>
        </div>
      </div>
      <p className="copyright">© {currentYear} K&apos;nails Beauty Institut. Tous droits réservés.</p>
    </footer>
  );
}
