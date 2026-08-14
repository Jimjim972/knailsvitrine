"use client";

import Link from "next/link";
import { cloneElement, isValidElement, useActionState, useState, type ReactElement, type ReactNode } from "react";
import { minorUnitsToDecimal } from "@/lib/services/price";
import { INITIAL_SERVICE_ACTION_STATE, type AdminService, type ServiceCategory, type ServiceFormValues } from "@/lib/services/types";
import { createServiceAction, updateServiceAction } from "../_actions/service-actions";

type Props = { mode: "create" | "edit"; service?: AdminService; categories: ServiceCategory[] };

export function ServiceForm({ mode, service, categories }: Props) {
  const action = mode === "create" ? createServiceAction : updateServiceAction;
  const [state, formAction, pending] = useActionState(action, INITIAL_SERVICE_ACTION_STATE);
  const retainedValues = "values" in state ? state.values : undefined;
  const initialType = retainedValues?.priceType ?? service?.priceType ?? "fixed";
  const [priceType, setPriceType] = useState(initialType);
  const value = (key: Exclude<keyof ServiceFormValues, "active">, fallback: string) => retainedValues?.[key] ?? fallback;
  const initialPrice = value("price", service?.priceMinorUnits === null || service?.priceMinorUnits === undefined ? "" : minorUnitsToDecimal(service.priceMinorUnits));
  const [price, setPrice] = useState(initialType === "quote" ? "" : initialPrice);
  const errors = state.status === "validation" ? state.fieldErrors : {};

  return (
    <form className="admin-service-form" action={formAction} noValidate data-action-status={state.status}>
      {service && <input type="hidden" name="serviceId" value={service.id} />}
      <fieldset><legend>Prestation</legend>
        <Field label="Nom" name="name" error={errors.name}><input id="name" name="name" required minLength={2} maxLength={120} autoFocus defaultValue={value("name", service?.name ?? "")} /></Field>
        <Field label="Description" name="description" error={errors.description}><textarea id="description" name="description" required maxLength={1000} rows={6} defaultValue={value("description", service?.description ?? "")} /></Field>
        <Field label="Catégorie" name="category" error={errors.category}><select id="category" name="category" required disabled={categories.length === 0} defaultValue={value("category", service?.category ?? categories[0]?.code ?? "")}>{categories.length === 0 ? <option value="">Créez d’abord une catégorie</option> : categories.map((category) => <option key={category.code} value={category.code}>{category.name}</option>)}</select></Field>
        <Link className="admin-text-action" href="/admin/prestations/categories/nouvelle">Créer une nouvelle catégorie</Link>
      </fieldset>
      <fieldset><legend>Tarif et durée</legend>
        <Field label="Type de tarif" name="priceType" error={errors.priceType}><select id="priceType" name="priceType" value={priceType} onChange={(event) => { const nextType = event.target.value; setPriceType(nextType); if (nextType === "quote") setPrice(""); }}><option value="fixed">Prix fixe</option><option value="starting_at">À partir de</option><option value="quote">Sur devis</option></select></Field>
        <Field label="Montant (€)" name="price" error={errors.price}><input id="price" name="price" inputMode="decimal" disabled={priceType === "quote"} required={priceType !== "quote"} value={price} onChange={(event) => setPrice(event.target.value)} /></Field>
        <Field label="Durée (minutes), facultative" name="durationMinutes" error={errors.durationMinutes}><input id="durationMinutes" name="durationMinutes" type="number" min={5} max={600} step={1} defaultValue={value("durationMinutes", service?.durationMinutes?.toString() ?? "")} /></Field>
        <Field label="Badge, facultatif" name="badge" error={errors.badge}><input id="badge" name="badge" maxLength={40} defaultValue={value("badge", service?.badge ?? "")} /></Field>
      </fieldset>
      <fieldset><legend>Publication</legend>
        <Field label="Ordre d’affichage" name="displayOrder" error={errors.displayOrder}><input id="displayOrder" name="displayOrder" type="number" min={0} step={1} defaultValue={value("displayOrder", service?.displayOrder.toString() ?? "0")} /></Field>
        <input type="hidden" name="active" value="false" />
        <label className="admin-checkbox"><input name="active" type="checkbox" value="true" defaultChecked={retainedValues ? retainedValues.active === "true" : service?.active ?? true} /><span>Prestation active et visible publiquement</span></label>
      </fieldset>
      {state.status !== "idle" && state.status !== "validation" && <p className={state.status === "success" ? "admin-status success" : "admin-status error"} role={state.status === "success" ? "status" : "alert"}>{state.message}</p>}
      {pending && <p className="admin-status" role="status">Enregistrement en cours…</p>}
      <div className="admin-form-actions"><Link className="admin-button secondary" href="/admin/prestations">Annuler</Link><button className="admin-button primary" type="submit" disabled={pending || categories.length === 0}>{pending ? "Enregistrement…" : mode === "create" ? "Créer la prestation" : "Enregistrer"}</button></div>
    </form>
  );
}

function Field({ label, name, error, children }: { label: string; name: string; error?: string[]; children: ReactNode }) {
  const errorId = `${name}-error`;
  const control = isValidElement(children) ? cloneElement(children as ReactElement<{ "aria-describedby"?: string; "aria-invalid"?: boolean }>, { "aria-describedby": error ? errorId : undefined, "aria-invalid": error ? true : undefined }) : children;
  return <div className="admin-field"><label htmlFor={name}>{label}</label><span className="admin-field-control">{control}</span>{error ? <span className="admin-field-error" id={errorId}>{error[0]}</span> : null}</div>;
}
