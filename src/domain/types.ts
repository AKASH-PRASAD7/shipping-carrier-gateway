export type DimensionUnit = "IN" | "CM";
export type WeightUnit = "LB" | "KG";
export type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "AUD";

/**
 * Physical address (origin or destination).
 */
export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string; // State/province code (e.g., "CA", "ON")
  postalCode: string;
  countryCode: string; // ISO 3166-1 alpha-2 (e.g., "US", "CA")
  companyName?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

/**
 * Package physical specs.
 */
export interface Package {
  length: number;
  width: number;
  height: number;
  dimensionUnit: DimensionUnit;
  weight: number;
  weightUnit: WeightUnit;
}

/**
 * Rate quote request.
 */
export interface RateRequest {
  origin: Address;
  destination: Address;
  packages: Package[];
  serviceCode?: string; // Optional: filter to specific service (e.g., "UPS_GROUND")
}

/**
 * Cost breakdown for a single service option.
 */
export interface RateCost {
  baseCharge: number;
  surcharges?: number;
  taxes?: number;
  total: number;
  currency: CurrencyCode;
}

/**
 * Single service quote.
 */
export interface RateQuote {
  serviceCode: string; // Carrier-specific code (e.g., "UPS_GROUND")
  serviceName: string; // Human-readable name (e.g., "UPS Ground")
  cost: RateCost;
  estimatedDays?: number; // Days to delivery
  warnings?: string[];
}

/**
 * Rate response from a carrier.
 */
export interface RateResponse {
  carrier: string; // e.g., "UPS"
  quotes: RateQuote[];
  requestedAt: Date;
  expiresAt?: Date;
}

/**
 * OAuth 2.0 token response.
 */
export interface OAuthToken {
  accessToken: string;
  tokenType: string;
  expiresIn: number; // Seconds
  issuedAt: Date;
}
