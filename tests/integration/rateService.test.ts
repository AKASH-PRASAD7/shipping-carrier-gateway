import { describe, it, expect, beforeEach, vi } from "vitest";
import { RateService } from "../../src/services/rateService";
import { ValidationError } from "../../src/domain/errors";
import type { Carrier } from "../../src/carriers/types";
import type {
  RateRequest,
  RateResponse,
  Address,
} from "../../src/domain/types";

// Mock carrier
class MockCarrier implements Carrier {
  name = "MockCarrier";

  async getRate(request: RateRequest): Promise<RateResponse> {
    return {
      carrier: "MockCarrier",
      quotes: [
        {
          serviceCode: "MOCK_001",
          serviceName: "Mock Service",
          cost: {
            baseCharge: 10,
            total: 12,
            currency: "USD",
          },
        },
      ],
      requestedAt: new Date(),
    };
  }

  async validateAddress(address: Address): Promise<void> {
    if (!address.street1 || !address.city) {
      throw new ValidationError("Missing required address fields");
    }
  }
}

describe("RateService", () => {
  let rateService: RateService;
  let mockCarrier: MockCarrier;

  const testAddress = {
    street1: "123 Main Street",
    city: "New York",
    state: "NY",
    postalCode: "10001",
    countryCode: "US",
  };

  const testRequest: RateRequest = {
    origin: testAddress,
    destination: {
      ...testAddress,
      city: "Boston",
    },
    packages: [
      {
        length: 10,
        width: 8,
        height: 5,
        dimensionUnit: "IN",
        weight: 5,
        weightUnit: "LB",
      },
    ],
  };

  beforeEach(() => {
    mockCarrier = new MockCarrier();
    const carriers = new Map([["MockCarrier", mockCarrier]]);
    rateService = new RateService(carriers);
  });

  it("should require at least one carrier", () => {
    expect(() => new RateService(new Map())).toThrow();
  });

  it("should validate rate request before calling carrier", async () => {
    const invalidRequest = {
      origin: testAddress,
      destination: testAddress,
      packages: [], // Empty packages - invalid
    };

    await expect(rateService.getRate(invalidRequest as any)).rejects.toThrow(
      ValidationError,
    );
  });

  it("should return rates from all carriers when no carrier specified", async () => {
    const mockCarrier2 = new MockCarrier();
    mockCarrier2.name = "MockCarrier2";

    const carriers = new Map([
      ["MockCarrier", mockCarrier],
      ["MockCarrier2", mockCarrier2],
    ]);

    const service = new RateService(carriers);
    const results = await service.getRate(testRequest);

    expect(results).toHaveLength(2);
  });

  it("should return rates from specific carrier when specified", async () => {
    const mockCarrier2 = new MockCarrier();
    mockCarrier2.name = "MockCarrier2";

    const carriers = new Map([
      ["MockCarrier", mockCarrier],
      ["MockCarrier2", mockCarrier2],
    ]);

    const service = new RateService(carriers);
    const results = await service.getRate(testRequest, "MockCarrier");

    expect(results).toHaveLength(1);
    expect(results[0]).toBeDefined();
    expect(results[0]!.carrier).toBe("MockCarrier");
  });

  it("should throw error for unknown carrier", async () => {
    await expect(
      rateService.getRate(testRequest, "UnknownCarrier"),
    ).rejects.toThrow(ValidationError);
  });

  it("should validate both origin and destination addresses", async () => {
    const validateSpy = vi.spyOn(mockCarrier, "validateAddress");

    await rateService.getRate(testRequest);

    expect(validateSpy).toHaveBeenCalledTimes(2);
    expect(validateSpy).toHaveBeenCalledWith(testAddress);
  });

  it("should throw validation error if address validation fails", async () => {
    const invalidRequest = {
      ...testRequest,
      origin: {
        ...testAddress,
        street1: "", // Invalid
      },
    };

    await expect(rateService.getRate(invalidRequest)).rejects.toThrow(
      ValidationError,
    );
  });

  it("should list available carriers", () => {
    const carriers = rateService.getAvailableCarriers();
    expect(carriers).toContain("MockCarrier");
  });

  it("should propagate carrier errors", async () => {
    const errorCarrier: Carrier = {
      name: "ErrorCarrier",
      getRate: vi.fn().mockRejectedValue(new Error("Network error")),
      validateAddress: vi.fn(),
    };

    const carriers = new Map([["ErrorCarrier", errorCarrier]]);
    const service = new RateService(carriers);

    await expect(service.getRate(testRequest)).rejects.toThrow("Network error");
  });
});
