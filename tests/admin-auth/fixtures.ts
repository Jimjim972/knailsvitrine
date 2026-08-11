import { expect, type Page } from "@playwright/test";

type FixtureName =
  | "ADMIN"
  | "NON_ADMIN"
  | "REVOCABLE_ADMIN"
  | "EXPIRABLE_ADMIN"
  | "ROLE_REMOVABLE_ADMIN"
  | "LOGOUT_ERROR_ADMIN";

export function authFixture(name: FixtureName) {
  const email = process.env[`AUTH_E2E_${name}_EMAIL`];
  const password = process.env[`AUTH_E2E_${name}_PASSWORD`];
  const userId = process.env[`AUTH_E2E_${name}_ID`];
  if (!email || !password || !userId) throw new Error("Missing ephemeral auth fixture");
  return { email, password, userId };
}

export async function submitLogin(page: Page, email: string, password: string) {
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

export async function expectAdminHome(page: Page) {
  await expect(page).toHaveURL(/\/admin(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: "Administration", exact: true })).toBeVisible();
}
