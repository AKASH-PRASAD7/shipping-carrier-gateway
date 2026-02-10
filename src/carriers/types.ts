import type { RateRequest, RateResponse, Address } from "../domain/types";

/**
 * Contract that all carriers must implement.
 * Allows pluggable carrier implementations.
 */
export interface Carrier {
  /**
   * Human-readable carrier name (e.g., "UPS", "FedEx").
   */
  name: string;

  /**
   * Get shipping rates for the given request.
   * @param request Rate request with origin, destination, packages
   * @returns Rate quotes from this carrier
   * @throws CarrierError on auth failures, network issues, or API errors
   */
  getRate(request: RateRequest): Promise<RateResponse>;

  /**
   * Validate that an address is valid for this carrier.
   * @param address Address to validate
   * @throws ValidationError if address is invalid
   */
  validateAddress(address: Address): Promise<void>;
}
