import {
  CONTACT_LOCATION,
  CONTACT_OPENING_HOURS,
} from "../contact-details.ts";
import { CANONICAL_ORIGIN } from "./deployment-context.ts";
import { SITE_NAME } from "./metadata.ts";

const OPEN_DAYS = CONTACT_OPENING_HOURS.flatMap((entry) =>
  "schemaDays" in entry && "opens" in entry && "closes" in entry
    ? [{ schemaDays: entry.schemaDays, opens: entry.opens, closes: entry.closes }]
    : [],
);

export const LOCAL_BUSINESS_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "BeautySalon",
  "@id": `${CANONICAL_ORIGIN}/#institut`,
  name: SITE_NAME,
  url: CANONICAL_ORIGIN,
  address: {
    "@type": "PostalAddress",
    streetAddress: CONTACT_LOCATION.streetAddress,
    addressLocality: CONTACT_LOCATION.addressLocality,
    postalCode: CONTACT_LOCATION.postalCode,
    addressRegion: CONTACT_LOCATION.addressRegion,
    addressCountry: CONTACT_LOCATION.addressCountry,
  },
  openingHoursSpecification: OPEN_DAYS.map(({ schemaDays, opens, closes }) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: schemaDays,
    opens,
    closes,
  })),
} as const;

export function serializeStructuredData(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
