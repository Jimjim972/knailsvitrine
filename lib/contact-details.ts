export const CONTACT_LOCATION = {
  formatted: "N°371, Chemin La Hubert, Saint-Joseph 97212, Martinique",
  streetAddress: "N°371, Chemin La Hubert",
  addressLocality: "Saint-Joseph",
  postalCode: "97212",
  addressRegion: "Martinique",
  addressCountry: "FR",
} as const;

export const CONTACT_ADDRESS = CONTACT_LOCATION.formatted;

export const CONTACT_OPENING_HOURS = [
  {
    days: "Lundi – mardi",
    hours: "09h00 – 17h00",
    schemaDays: ["https://schema.org/Monday", "https://schema.org/Tuesday"],
    opens: "09:00",
    closes: "17:00",
  },
  { days: "Mercredi", hours: "Fermé" },
  {
    days: "Jeudi – vendredi",
    hours: "09h00 – 17h00",
    schemaDays: ["https://schema.org/Thursday", "https://schema.org/Friday"],
    opens: "09:00",
    closes: "17:00",
  },
  {
    days: "Samedi",
    hours: "08h00 – 12h00",
    schemaDays: ["https://schema.org/Saturday"],
    opens: "08:00",
    closes: "12:00",
  },
  { days: "Dimanche", hours: "Fermé" },
] as const;
