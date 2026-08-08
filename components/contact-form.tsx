"use client";

import { FormEvent, useState } from "react";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label>
          <span>Prénom & nom</span>
          <input name="name" placeholder="Votre nom complet" required autoComplete="name" />
        </label>
        <label>
          <span>Téléphone</span>
          <input name="phone" type="tel" placeholder="Votre numéro" autoComplete="tel" />
        </label>
      </div>
      <label>
        <span>E-mail</span>
        <input name="email" type="email" placeholder="votre@email.com" required autoComplete="email" />
      </label>
      <label>
        <span>Message</span>
        <textarea name="message" placeholder="Comment pouvons-nous vous aider ?" rows={5} required />
      </label>
      <button className="primary-button form-submit" type="submit">
        Envoyer le message
      </button>
      {sent && (
        <p className="form-success" role="status">
          Merci ! Votre demande a bien été préparée. Connectez ce formulaire à votre service d&apos;e-mail
          pour recevoir les messages.
        </p>
      )}
    </form>
  );
}
