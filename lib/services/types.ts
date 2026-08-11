import type { ServiceCategoryCode, ServicePriceType } from "./constants.ts";

export type PublicService = {
  id: string;
  name: string;
  description: string;
  category: ServiceCategoryCode;
  priceLabel: string;
  durationLabel: string | null;
  badge: string | null;
  displayOrder: number;
  createdAt: string;
};

export type AdminService = {
  id: string;
  name: string;
  description: string;
  category: ServiceCategoryCode;
  categoryLabel: string;
  priceType: ServicePriceType;
  priceMinorUnits: number | null;
  durationMinutes: number | null;
  badge: string | null;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ServiceFormValues = {
  name: string;
  description: string;
  category: string;
  priceType: string;
  price: string;
  durationMinutes: string;
  badge: string;
  displayOrder: string;
  active: string;
};

export type ServiceFieldErrors = Partial<Record<keyof ServiceFormValues | "serviceId", string[]>>;

export type ServiceActionState =
  | { status: "idle"; values?: ServiceFormValues }
  | { status: "validation"; fieldErrors: ServiceFieldErrors; values: ServiceFormValues }
  | { status: "session_expired"; message: string; values?: ServiceFormValues }
  | { status: "unavailable" | "internal"; message: string; correlationId: string; values?: ServiceFormValues }
  | { status: "not_found"; message: string }
  | { status: "success"; message: string; serviceId: string };

export const INITIAL_SERVICE_ACTION_STATE: ServiceActionState = { status: "idle" };

export type PublicServiceGroups = Record<ServiceCategoryCode, PublicService[]>;
