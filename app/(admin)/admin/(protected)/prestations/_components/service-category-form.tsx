"use client";

import Link from "next/link";
import { useActionState } from "react";
import { INITIAL_SERVICE_CATEGORY_ACTION_STATE } from "@/lib/services/types";
import { createServiceCategoryAction } from "../_actions/service-category-actions";

export function ServiceCategoryForm() {
  const [state, formAction, pending] = useActionState(createServiceCategoryAction, INITIAL_SERVICE_CATEGORY_ACTION_STATE);
  const values = "values" in state ? state.values : undefined;
  const errors = state.status === "validation" ? state.fieldErrors : {};

  return <form className="admin-service-form" action={formAction} noValidate data-action-status={state.status}>
    <fieldset><legend>Catégorie</legend>
      <div className="admin-field">
        <label htmlFor="name">Nom</label>
        <span className="admin-field-control"><input id="name" name="name" required minLength={2} maxLength={80} autoFocus defaultValue={values?.name ?? ""} aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? "name-error" : undefined} /></span>
        {errors.name && <span className="admin-field-error" id="name-error">{errors.name[0]}</span>}
      </div>
      <div className="admin-field">
        <label htmlFor="displayOrder">Ordre d’affichage</label>
        <span className="admin-field-control"><input id="displayOrder" name="displayOrder" type="number" min={0} step={1} defaultValue={values?.displayOrder ?? "0"} aria-invalid={errors.displayOrder ? true : undefined} aria-describedby={errors.displayOrder ? "displayOrder-error" : undefined} /></span>
        {errors.displayOrder && <span className="admin-field-error" id="displayOrder-error">{errors.displayOrder[0]}</span>}
      </div>
      <p className="admin-help">La catégorie apparaîtra dans cet ordre dès qu’elle contiendra une prestation active. Son visuel utilisera automatiquement l’univers générique de l’institut.</p>
    </fieldset>
    {state.status !== "idle" && state.status !== "validation" && <p className={state.status === "success" ? "admin-status success" : "admin-status error"} role={state.status === "success" ? "status" : "alert"}>{state.message}</p>}
    {pending && <p className="admin-status" role="status">Création en cours…</p>}
    <div className="admin-form-actions"><Link className="admin-button secondary" href="/admin/prestations">Annuler</Link><button className="admin-button primary" type="submit" disabled={pending}>{pending ? "Création…" : "Créer la catégorie"}</button></div>
  </form>;
}
