import type { Carrier } from "./types";
import { UPSCarrier } from "./ups";

interface CarrierFactoryConfig {
  ups?: {
    clientId: string;
    clientSecret: string;
    apiBaseUrl: string;
    httpTimeout: number;
  };
}

/**
 * Create carriers based on configuration.
 */
export class CarrierFactory {
  static createCarriers(config: CarrierFactoryConfig): Map<string, Carrier> {
    const carriers = new Map<string, Carrier>();

    if (config.ups) {
      carriers.set("UPS", new UPSCarrier(config.ups));
    }

    // Future: add FedEx, USPS, DHL, etc.
    // if (config.fedex) {
    //   carriers.set("FEDEX", new FedExCarrier(config.fedex));
    // }

    return carriers;
  }
}
