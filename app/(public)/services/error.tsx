"use client";

export default function PublicServicesError({ retry }: { error: Error & { digest?: string }; retry: () => void }) { return <main className="page-main"><section className="page-heading public-services-error" aria-labelledby="public-services-error-title"><h1 id="public-services-error-title">Prestations indisponibles</h1><p>Notre carte de soins ne peut pas être chargée pour le moment.</p><button className="primary-button" type="button" onClick={retry}>Réessayer</button></section></main>; }
