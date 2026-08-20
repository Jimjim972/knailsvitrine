"use server";

import { executeContactSubmission } from "../../../../lib/contact/contact-action-core";
import type { ContactActionState } from "../../../../lib/validations/contact";

export async function submitContactAction(
  _previousState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  return executeContactSubmission(formData);
}
