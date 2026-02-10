export type {
  Address,
  Package,
  RateRequest,
  RateQuote,
  RateCost,
  RateResponse,
  OAuthToken,
  DimensionUnit,
  WeightUnit,
  CurrencyCode,
} from "./domain/types";

// Error classes
export {
  CarrierError,
  ValidationError,
  AuthError,
  NetworkError,
  RateError,
} from "./domain/errors";

// Validation
export {
  validateAddress,
  validatePackage,
  validateRateRequest,
} from "./domain/validation";

// Carriers
export type { Carrier } from "./carriers/types";
export { UPSCarrier } from "./carriers/ups";
export { CarrierFactory } from "./carriers";

// Services
export { RateService } from "./services/rateService";

// Configuration
export { config } from "./config";
