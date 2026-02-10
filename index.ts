/**
 * Example usage of the Shipping Carrier Integration Service.
 */

import { RateService, CarrierFactory, config } from "./src/index.js";

async function main() {
  // Create carriers from configuration
  const carriers = CarrierFactory.createCarriers({
    ups: {
      clientId: config.ups.clientId,
      clientSecret: config.ups.clientSecret,
      apiBaseUrl: config.ups.apiBaseUrl,
      httpTimeout: config.http.timeout,
    },
  });

  // Create rate service
  const rateService = new RateService(carriers);

  // Available carriers
  console.log("Available carriers:", rateService.getAvailableCarriers());

  // Example rate request
  const rateRequest = {
    origin: {
      street1: "100 Summit Lake Drive",
      city: "Woburn",
      state: "MA",
      postalCode: "01801",
      countryCode: "US",
    },
    destination: {
      street1: "123 Main Street",
      city: "New York",
      state: "NY",
      postalCode: "10001",
      countryCode: "US",
    },
    packages: [
      {
        length: 10,
        width: 8,
        height: 5,
        dimensionUnit: "IN" as const,
        weight: 5,
        weightUnit: "LB" as const,
      },
    ],
  };

  try {
    console.log("\nRequesting rates...");
    const rates = await rateService.getRate(rateRequest, "UPS");
    console.log("\nRates received:");
    console.log(JSON.stringify(rates, null, 2));
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
  }
}

main();