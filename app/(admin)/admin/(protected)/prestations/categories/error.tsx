"use client";

export default function ServiceCategoriesError({ retry }: { error: Error & { digest?: string }; retry: () => void }) { return <main className="admin-main content-shell"><section className="admin-error-state" aria-labelledby="categories-error-title"><h1 className="admin-title" id="categories-error-title">Catégories indisponibles</h1><p>La liste ne peut pas être chargée pour le moment.</p><button className="admin-button primary" type="button" onClick={retry}>Réessayer</button></section></main>; }
