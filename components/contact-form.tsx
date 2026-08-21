"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { submitContactAction } from "@/app/(public)/contact/_actions/contact-actions";
import { submitContactToNetlify } from "@/lib/contact/netlify-forms-client";
import {
  EMPTY_CONTACT_DRAFT,
  validateContactDraft,
  type ContactActionState,
  type ContactDraft,
  type ContactFieldErrors,
} from "@/lib/validations/contact";

const INITIAL_ACTION_STATE: ContactActionState = {
  phase: "idle",
  values: EMPTY_CONTACT_DRAFT,
  submissionId: "",
  fieldErrors: {},
};

const FIELD_ORDER = ["name", "phone", "email", "message"] as const;
type EditableField = (typeof FIELD_ORDER)[number];
type VisiblePhase = "idle" | "pending" | "success" | "error";

const ERROR_MESSAGES = {
  network: "Vérifiez votre connexion, puis réessayez l’envoi.",
  timeout: "Nous n'avons pas pu confirmer la réception de votre message. Vérifiez votre connexion avant de réessayer.",
  provider: "Le service d’envoi est momentanément indisponible. Veuillez réessayer.",
  unexpected: "L’envoi n’a pas pu aboutir. Veuillez réessayer dans quelques instants.",
  validation: "Corrigez les champs indiqués avant de réessayer.",
} as const;

function newSubmissionId() {
  return crypto.randomUUID();
}

export function ContactForm() {
  const [actionState, formAction, actionPending] = useActionState(submitContactAction, INITIAL_ACTION_STATE);
  const [values, setValues] = useState<ContactDraft>(EMPTY_CONTACT_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});
  const [phase, setPhase] = useState<VisiblePhase>("idle");
  const [errorKind, setErrorKind] = useState<keyof typeof ERROR_MESSAGES>("unexpected");
  const fieldRefs = useRef<Record<EditableField, HTMLInputElement | HTMLTextAreaElement | null>>({
    name: null,
    phone: null,
    email: null,
    message: null,
  });
  const submissionIdRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const attemptRef = useRef(0);
  const processedActionAttemptRef = useRef(0);

  useEffect(() => {
    if (actionState.phase === "idle" || actionState.submissionId !== submissionIdRef.current) return;
    const attempt = attemptRef.current;
    if (processedActionAttemptRef.current === attempt) return;

    const reconciliation = window.setTimeout(() => {
      if (attempt !== attemptRef.current) return;
      processedActionAttemptRef.current = attempt;

      if (actionState.phase === "authorized") {
        void submitContactToNetlify(actionState.submission, actionState.formName)
          .then((result) => {
            if (attempt !== attemptRef.current) return;
            inFlightRef.current = false;

            if (result.ok) {
              setValues(EMPTY_CONTACT_DRAFT);
              setFieldErrors({});
              setPhase("success");
              submissionIdRef.current = null;
              return;
            }

            setErrorKind(result.errorKind);
            setPhase("error");
          })
          .catch(() => {
            if (attempt !== attemptRef.current) return;
            inFlightRef.current = false;
            setErrorKind("unexpected");
            setPhase("error");
          });
        return;
      }

      inFlightRef.current = false;
      setValues(actionState.values);
      setFieldErrors(actionState.fieldErrors);
      setErrorKind(actionState.errorKind);
      setPhase("error");

      if (actionState.errorKind === "validation") {
        const firstInvalid = FIELD_ORDER.find((field) => actionState.fieldErrors[field]?.length);
        if (firstInvalid) requestAnimationFrame(() => fieldRefs.current[firstInvalid]?.focus());
      }
    }, 0);

    return () => window.clearTimeout(reconciliation);
  }, [actionState]);

  function handleChange(field: EditableField) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const nextValues = { ...values, [field]: event.target.value };
      setValues(nextValues);

      if (!inFlightRef.current) {
        attemptRef.current += 1;
        submissionIdRef.current = null;
        if (phase === "success" || (phase === "error" && errorKind !== "validation")) setPhase("idle");
      }

      if (fieldErrors[field]?.length) {
        const result = validateContactDraft(nextValues);
        setFieldErrors((current) => {
          const next = { ...current };
          const updatedError = result.success ? undefined : result.fieldErrors[field];
          if (updatedError?.length) next[field] = updatedError;
          else delete next[field];
          return next;
        });
      }
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlightRef.current) return;

    const validation = validateContactDraft(values);
    if (!validation.success) {
      setFieldErrors(validation.fieldErrors);
      setErrorKind("validation");
      setPhase("error");
      const firstInvalid = FIELD_ORDER.find((field) => validation.fieldErrors[field]?.length);
      if (firstInvalid) requestAnimationFrame(() => fieldRefs.current[firstInvalid]?.focus());
      return;
    }

    const submissionId = submissionIdRef.current ?? newSubmissionId();
    submissionIdRef.current = submissionId;
    const payload = new FormData(event.currentTarget);
    payload.set("submission-id", submissionId);

    inFlightRef.current = true;
    attemptRef.current += 1;
    setFieldErrors({});
    setPhase("pending");
    startTransition(() => formAction(payload));
  }

  const pending = phase === "pending" || actionPending;
  const liveRole = phase === "error" ? "alert" : "status";
  const liveMessage = phase === "pending"
    ? "Envoi du message en cours…"
    : phase === "success"
      ? "Merci, votre message a bien été envoyé."
      : phase === "error"
        ? ERROR_MESSAGES[errorKind]
        : "";

  function describedBy(field: EditableField, helperId: string) {
    return [helperId, fieldErrors[field]?.length ? `${field}-error` : null].filter(Boolean).join(" ");
  }

  return (
    <form className="contact-form" action={formAction} onSubmit={handleSubmit} noValidate aria-busy={pending}>
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="contact-name">Prénom &amp; nom</label>
          <input
            ref={(element) => { fieldRefs.current.name = element; }}
            id="contact-name"
            name="name"
            value={values.name}
            onChange={handleChange("name")}
            placeholder="Votre nom complet"
            autoComplete="name"
            aria-required="true"
            aria-invalid={fieldErrors.name?.length ? "true" : undefined}
            aria-describedby={describedBy("name", "name-help")}
            readOnly={pending}
          />
          <p className="form-help" id="name-help">2 à 120 caractères · {values.name.trim().length}/120</p>
          {fieldErrors.name?.[0] && <p className="form-field-error" id="name-error">{fieldErrors.name[0]}</p>}
        </div>
        <div className="form-field">
          <label htmlFor="contact-phone">Téléphone <span className="form-optional">(facultatif)</span></label>
          <input
            ref={(element) => { fieldRefs.current.phone = element; }}
            id="contact-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            value={values.phone}
            onChange={handleChange("phone")}
            placeholder="Votre numéro"
            autoComplete="tel"
            aria-invalid={fieldErrors.phone?.length ? "true" : undefined}
            aria-describedby={describedBy("phone", "phone-help")}
            readOnly={pending}
          />
          <p className="form-help" id="phone-help">6 à 30 caractères si renseigné · {values.phone.trim().length}/30</p>
          {fieldErrors.phone?.[0] && <p className="form-field-error" id="phone-error">{fieldErrors.phone[0]}</p>}
        </div>
      </div>
      <div className="form-field">
        <label htmlFor="contact-email">E-mail</label>
        <input
          ref={(element) => { fieldRefs.current.email = element; }}
          id="contact-email"
          name="email"
          type="email"
          value={values.email}
          onChange={handleChange("email")}
          placeholder="votre@email.com"
          autoComplete="email"
          aria-required="true"
          aria-invalid={fieldErrors.email?.length ? "true" : undefined}
          aria-describedby={describedBy("email", "email-help")}
          readOnly={pending}
        />
        <p className="form-help" id="email-help">Adresse complète · {values.email.trim().length}/254</p>
        {fieldErrors.email?.[0] && <p className="form-field-error" id="email-error">{fieldErrors.email[0]}</p>}
      </div>
      <div className="form-field">
        <label htmlFor="contact-message">Message</label>
        <textarea
          ref={(element) => { fieldRefs.current.message = element; }}
          id="contact-message"
          name="message"
          value={values.message}
          onChange={handleChange("message")}
          placeholder="Comment pouvons-nous vous aider ?"
          rows={5}
          aria-required="true"
          aria-invalid={fieldErrors.message?.length ? "true" : undefined}
          aria-describedby={describedBy("message", "message-help")}
          readOnly={pending}
        />
        <p className="form-help" id="message-help">10 à 2 000 caractères · {values.message.trim().length}/2 000</p>
        {fieldErrors.message?.[0] && <p className="form-field-error" id="message-error">{fieldErrors.message[0]}</p>}
      </div>
      <div hidden>
        <input name="bot-field" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <button className="primary-button form-submit" type="submit" disabled={pending}>
        {pending ? "Envoi en cours…" : "Envoyer le message"}
      </button>
      <p
        className={`form-feedback form-feedback-${phase}`}
        role={liveRole}
        aria-live={phase === "error" ? "assertive" : "polite"}
        aria-atomic="true"
      >
        {liveMessage}
      </p>
    </form>
  );
}
