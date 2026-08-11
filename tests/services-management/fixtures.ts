export const SERVICE_CATEGORIES = [
  { code: "onglerie_manucure", title: "Onglerie & Manucure", image: "/images/nails-signature.jpg", imageAlt: "Manucure rose poudré avec détails dorés", imageTitle: "Signature K'nails", imageCaption: "L'élégance jusqu'au bout des ongles." },
  { code: "soins_corps", title: "Soins du Corps", image: "/images/spa-massage.jpg", imageAlt: "Soin relaxant des mains dans un spa", imageTitle: "Rituels Corps", imageCaption: "Une parenthèse de bien-être." },
  { code: "esthetique_visage", title: "Esthétique & Visage", image: "/images/skincare.jpg", imageAlt: "Produits cosmétiques premium sur un décor rose", imageTitle: "Soins Visage", imageCaption: "Des protocoles experts pour sublimer votre peau." },
] as const;

export const INITIAL_SERVICES = [
  { category: "onglerie_manucure", order: 0, name: "Manucure Russe", description: "Préparation méticuleuse de l'ongle et des cuticules pour un rendu net et une repousse retardée.", price: "45 €", duration: "45 min", badge: null },
  { category: "onglerie_manucure", order: 1, name: "Pose Vernis Semi-Permanent", description: "Couleur éclatante et tenue impeccable jusqu'à 3 semaines. Large choix de teintes premium.", price: "35 €", duration: "30 min", badge: "Populaire" },
  { category: "onglerie_manucure", order: 2, name: "Pose Complète Gel (Chablons)", description: "Rallongement sur-mesure pour une forme parfaite et une solidité optimale.", price: "75 €", duration: "90 min", badge: null },
  { category: "soins_corps", order: 0, name: "Modelage Relaxant Sur-Mesure", description: "Massage profond aux huiles précieuses pour dénouer les tensions et apaiser l'esprit.", price: "85 €", duration: "60 min", badge: null },
  { category: "soins_corps", order: 1, name: "Gommage Corps Éclat", description: "Exfoliation douce pour une peau soyeuse, lumineuse et parfaitement hydratée.", price: "50 €", duration: "40 min", badge: null },
  { category: "esthetique_visage", order: 0, name: 'Soin Signature "Glow"', description: "Soin complet hydratant et illuminateur. Nettoyage profond, modelage et masque spécifique.", price: "95 €", duration: "75 min", badge: null },
  { category: "esthetique_visage", order: 1, name: "Lifting Colombien (Visage)", description: "Technique non invasive pour raffermir, lisser les ridules et redessiner l'ovale du visage.", price: "120 €", duration: "60 min", badge: "Nouveau" },
  { category: "esthetique_visage", order: 2, name: "Beauté du Regard", description: "Rehaussement et teinture pour un regard intensifié naturellement, sans mascara.", price: "65 €", duration: "60 min", badge: null },
] as const;

export const PUBLIC_SERVICES_CTA = { label: "Réserver", href: "/contact" } as const;
