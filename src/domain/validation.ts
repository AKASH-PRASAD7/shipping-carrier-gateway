import { z } from "zod";
import type {
  DimensionUnit,
  WeightUnit,
  CurrencyCode,
  Address,
  Package,
  RateRequest,
} from "./types";

/**
 * Validate address structure.
 */
export const AddressSchema = z.object({
  street1: z.string().min(1),
  street2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(2).max(3),
  postalCode: z.string().min(1),
  countryCode: z.string().length(2).toUpperCase(),
  companyName: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
});

/**
 * Validate package dimensions and weight.
 */
export const PackageSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  dimensionUnit: z.enum(["IN", "CM"] as const),
  weight: z.number().positive(),
  weightUnit: z.enum(["LB", "KG"] as const),
});

/**
 * Validate rate request.
 */
export const RateRequestSchema = z.object({
  origin: AddressSchema,
  destination: AddressSchema,
  packages: PackageSchema.array().min(1),
  serviceCode: z.string().optional(),
});

/**
 * Parse and validate an address.
 */
export function validateAddress(data: unknown): Address {
  return AddressSchema.parse(data);
}

/**
 * Parse and validate a package.
 */
export function validatePackage(data: unknown): Package {
  return PackageSchema.parse(data);
}

/**
 * Parse and validate a rate request.
 */
export function validateRateRequest(data: unknown): RateRequest {
  return RateRequestSchema.parse(data);
}
