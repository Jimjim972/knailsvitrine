"use client";

export default function GalleryError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main className="admin-main content-shell"><section className="admin-error-state" aria-labelledby="gallery-error-title"><h1 className="admin-title" id="gallery-error-title">Galerie indisponible</h1><p>La liste ne peut pas être chargée pour le moment.</p><button className="admin-button primary" type="button" onClick={retry}>Réessayer</button></section></main>;
}
