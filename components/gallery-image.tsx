"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const subscribeToHydration = () => () => undefined;
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function GalleryImage({ src, alt, width, height, sizes, eager = false }: { src: string; alt: string; width: number; height: number; sizes: string; eager?: boolean }) {
  const [available, setAvailable] = useState(true); if (!available) return null;
  return <Image src={src} alt={alt} fill sizes={sizes} loading={eager ? "eager" : "lazy"} unoptimized onError={() => setAvailable(false)} data-source-width={width} data-source-height={height} />;
}

export function PublicGalleryCard({ src, alt, width, height, sizes, eager = false, className, title, label, externalUrl, social = false }: { src: string; alt: string; width: number; height: number; sizes: string; eager?: boolean; className: string; title?: string | null; label?: string | null; externalUrl?: string | null; social?: boolean }) {
  const hydrated = useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot);
  const [available, setAvailable] = useState(true); const [shouldLoad, setShouldLoad] = useState(eager); const target = useRef<HTMLElement | null>(null);
  const setTarget = useCallback((node: HTMLElement | null) => { target.current = node; }, []);
  useEffect(() => {
    if (!hydrated || eager || shouldLoad) return;
    let observer: IntersectionObserver | null = null;
    const observe = () => {
      if (observer || !target.current) return;
      observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setShouldLoad(true); observer?.disconnect(); } }, { rootMargin: "800px 0px" });
      observer.observe(target.current);
    };
    if (window.scrollY > 0) observe(); else window.addEventListener("scroll", observe, { once: true, passive: true });
    return () => { window.removeEventListener("scroll", observe); observer?.disconnect(); };
  }, [eager, hydrated, shouldLoad]);
  if (!available) return null;
  const image = hydrated && shouldLoad ? <Image src={src} alt={alt} fill sizes={sizes} loading={eager ? "eager" : "lazy"} unoptimized onError={() => setAvailable(false)} data-source-width={width} data-source-height={height} /> : null;
  if (social) {
    const content = <>{image}<span className="social-overlay" aria-hidden="true">♥</span></>;
    return externalUrl ? <a ref={setTarget} className={className} href={externalUrl} target="_blank" rel="noreferrer" aria-label={`Ouvrir ${title ?? alt}`}>{content}</a> : <article ref={setTarget} className={className}>{content}</article>;
  }
  const content = <>{image}<div className="gallery-hover" />{(title || label) && <div className="gallery-caption">{label && <span>{label}</span>}{title && <h2>{title}</h2>}</div>}</>;
  return externalUrl
    ? <a ref={setTarget} className={className} href={externalUrl} target="_blank" rel="noreferrer" aria-label={`Ouvrir ${title ?? alt}`}>{content}</a>
    : <article ref={setTarget} className={className}>{content}</article>;
}
