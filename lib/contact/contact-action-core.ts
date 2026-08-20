import {
  contactFormValues,
  validateContactValues,
  type ContactActionState,
} from "../validations/contact.ts";

export async function executeContactSubmission(
  formData: FormData,
): Promise<ContactActionState> {
  const values = contactFormValues(formData);
  const publicValues = {
    name: values.name,
    phone: values.phone,
    email: values.email,
    message: values.message,
  };
  const validation = validateContactValues(values);

  if (!validation.success) {
    return {
      phase: "error",
      errorKind: "validation",
      fieldErrors: validation.fieldErrors,
      submissionId: values.submissionId,
      values: publicValues,
    };
  }

  return {
    phase: "authorized",
    submissionId: validation.data.submissionId,
    submission: validation.data,
  };
}
