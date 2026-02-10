import type { Carrier } from "../carriers/types";
import type { RateRequest, RateResponse } from "../domain/types";
import { validateRateRequest } from "../domain/validation";
import { ValidationError } from "../domain/errors";

/**
 * Rate service that orchestrates carriers.
 */
export class RateService {
  constructor(private carriers: Map<string, Carrier>) {
    if (carriers.size === 0) {
      throw new Error("RateService requires at least one carrier");
    }
  }

  /**
   * Get shipping rates from one or more carriers.
   * @param request Rate request with origin, destination, packages
   * @param carrierName Optional: specify a specific carrier. If not provided, uses all available carriers.
   * @returns Array of rate responses from the selected carrier(s)
   * @throws ValidationError if request is invalid
   * @throws CarrierError if API calls fail
   */
  async getRate(
    request: RateRequest,
    carrierName?: string,
  ): Promise<RateResponse[]> {
    // Validate input early
    let validatedRequest: RateRequest;
    try {
      validatedRequest = validateRateRequest(request);
    } catch (error) {
      throw new ValidationError(
        `Invalid rate request: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }

    // Validate carrier
    if (carrierName) {
      if (!this.carriers.has(carrierName)) {
        throw new ValidationError(`Carrier not found: ${carrierName}`);
      }
    }

    // Validate addresses with carriers
    const carriersToUse = carrierName
      ? [this.carriers.get(carrierName)!]
      : Array.from(this.carriers.values());

    for (const carrier of carriersToUse) {
      await carrier.validateAddress(validatedRequest.origin);
      await carrier.validateAddress(validatedRequest.destination);
    }

    // Call carrier(s)
    const promises = carriersToUse.map((carrier) =>
      carrier.getRate(validatedRequest),
    );
    const results = await Promise.all(promises);

    return results;
  }

  /**
   * Get all available carriers.
   */
  getAvailableCarriers(): string[] {
    return Array.from(this.carriers.keys());
  }
}
