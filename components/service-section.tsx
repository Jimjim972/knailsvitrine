import Image from "next/image";
import Link from "next/link";

export type Service = {
  name: string;
  description: string;
  price: string;
  duration: string;
  badge?: string;
};

type ServiceSectionProps = {
  eyebrow: string;
  title: string;
  image: string;
  imageAlt: string;
  imageTitle: string;
  imageCaption: string;
  services: Service[];
  reverse?: boolean;
  eager?: boolean;
};

export function ServiceSection({
  eyebrow,
  title,
  image,
  imageAlt,
  imageTitle,
  imageCaption,
  services,
  reverse = false,
  eager = false,
}: ServiceSectionProps) {
  return (
    <section className="service-section content-shell">
      <div className="section-title">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>

      <div className={reverse ? "service-layout reverse" : "service-layout"}>
        <div className="service-visual">
          <Image
            src={image}
            alt={imageAlt}
            fill
            sizes="(max-width: 900px) 100vw, 33vw"
            loading={eager ? "eager" : undefined}
          />
          <div className="image-caption">
            <h3>{imageTitle}</h3>
            <p>{imageCaption}</p>
          </div>
        </div>

        <div className="service-list">
          {services.map((service) => (
            <article className="service-card" key={service.name}>
              {service.badge && <span className="badge">{service.badge}</span>}
              <div className="service-copy">
                <h3>{service.name}</h3>
                <p>{service.description}</p>
              </div>
              <div className="service-action">
                <div>
                  <strong>{service.price}</strong>
                  <span>{service.duration}</span>
                </div>
                <Link href="/contact" aria-label={`Réserver ${service.name}`}>
                  Réserver
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
