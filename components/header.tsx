"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  { href: "/services", label: "Services" },
  { href: "/galerie", label: "Galerie" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="nav-shell">
        <Link className="brand" href="/services" onClick={() => setIsOpen(false)}>
          <span className="brand-logo" aria-hidden="true">
            <Image
              src="/images/knails-logo.png"
              alt=""
              fill
              sizes="64px"
              loading="eager"
            />
          </span>
          <span>K&apos;nails Beauty Institut</span>
        </Link>

        <nav className="desktop-nav" aria-label="Navigation principale">
          {navigation.map((item) => (
            <Link
              className={pathname === item.href ? "nav-link active" : "nav-link"}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link className="primary-button header-cta" href="/contact">
          Réserver
        </Link>

        <button
          className="menu-button"
          type="button"
          aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((value) => !value)}
        >
          <span className="menu-glyph" aria-hidden="true">{isOpen ? "×" : "☰"}</span>
        </button>
      </div>

      {isOpen && (
        <nav className="mobile-nav" aria-label="Navigation mobile">
          {navigation.map((item) => (
            <Link
              className={pathname === item.href ? "nav-link active" : "nav-link"}
              href={item.href}
              key={item.href}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link className="primary-button" href="/contact" onClick={() => setIsOpen(false)}>
            Réserver
          </Link>
        </nav>
      )}
    </header>
  );
}
