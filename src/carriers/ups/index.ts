import type { Carrier } from "../types";
import type { RateRequest, RateResponse, Address } from "../../domain/types";
import { ValidationError } from "../../domain/errors";
import { UPSAuth } from "./auth";
import { UPSClient } from "./client";
import { mapRateRequestToUPS, mapUPSResponseToRateResponse } from "./mapper";

interface UPSCarrierConfig {
  clientId: string;
  clientSecret: string;
  apiBaseUrl: string;
  httpTimeout: number;
}

/**
 * UPS carrier implementation.
 */
export class UPSCarrier implements Carrier {
  readonly name = "UPS";
  private auth: UPSAuth;
  private client: UPSClient;

  constructor(config: UPSCarrierConfig) {
    this.auth = new UPSAuth(config);
    this.client = new UPSClient({
      apiBaseUrl: config.apiBaseUrl,
      httpTimeout: config.httpTimeout,
      auth: this.auth,
    });
  }

  /**
   * Get shipping rates from UPS.
   */
  async getRate(request: RateRequest): Promise<RateResponse> {
    // Validate addresses first
    await this.validateAddress(request.origin);
    await this.validateAddress(request.destination);

    // Map domain request to UPS format
    const upsRequest = mapRateRequestToUPS(request);

    // Call UPS API
    const response = await this.client.post(
      "/rating/v2/Shop/Rates",
      upsRequest,
    );

    // Map UPS response back to domain format
    return mapUPSResponseToRateResponse(response as any);
  }

  /**
   * Validate an address (basic validation for UPS).
   * UPS supports US and some international addresses.
   */
  async validateAddress(address: Address): Promise<void> {
    // Basic validation for supported countries
    const supportedCountries = [
      "US",
      "CA",
      "MX",
      "GB",
      "DE",
      "FR",
      "JP",
      "CN",
      "AU",
    ];

    if (!supportedCountries.includes(address.countryCode)) {
      throw new ValidationError(
        `UPS does not support addresses in ${address.countryCode}`,
      );
    }

    // Check required fields
    if (
      !address.street1 ||
      !address.city ||
      !address.state ||
      !address.postalCode
    ) {
      throw new ValidationError(
        "Address must include street1, city, state, and postalCode",
      );
    }
  }
}
