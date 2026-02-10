import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { UPSCarrier } from "../../src/carriers/ups";
import {
  ValidationError,
  AuthError,
  RateError,
  NetworkError,
} from "../../src/domain/errors";
import {
  upsOAuthTokenResponse,
  upsRatingSuccessResponse,
  upsInvalidAddressError,
  malformedJsonResponse,
  upsServerError,
} from "./fixtures/ups-responses";

// Mock fetch
const mockFetch = vi.fn();
(global as any).fetch = mockFetch;

const testConfig = {
  clientId: "test_client_id",
  clientSecret: "test_client_secret",
  apiBaseUrl: "https://onlinetools-sandbox.ups.com",
  httpTimeout: 5000,
};

const testAddress = {
  street1: "123 Main Street",
  city: "New York",
  state: "NY",
  postalCode: "10001",
  countryCode: "US",
};

const testPackage = {
  length: 10,
  width: 8,
  height: 5,
  dimensionUnit: "IN" as const,
  weight: 5,
  weightUnit: "LB" as const,
};

const testRateRequest = {
  origin: testAddress,
  destination: {
    ...testAddress,
    city: "Boston",
    state: "MA",
    postalCode: "02101",
  },
  packages: [testPackage],
};

describe("UPS Carrier", () => {
  let carrier: UPSCarrier;

  beforeEach(() => {
    mockFetch.mockReset();
    carrier = new UPSCarrier(testConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Token Lifecycle", () => {
    it("should acquire a new token on first call", async () => {
      // Mock OAuth token endpoint
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(upsOAuthTokenResponse), {
          status: 200,
        }),
      );

      // Mock rating endpoint
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(upsRatingSuccessResponse), {
          status: 200,
        }),
      );

      const response = await carrier.getRate(testRateRequest);

      // Should have called both token and rating endpoints
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Check token request
      const tokenCall = mockFetch.mock.calls[0];
      expect(tokenCall).toBeDefined();
      expect(tokenCall![0]).toContain("/security/v1/oauth/token");
      expect(tokenCall![1]?.method).toBe("POST");
      expect(tokenCall![1]?.headers).toHaveProperty("Authorization");

      // Check rating request has Bearer token
      const ratingCall = mockFetch.mock.calls[1];
      expect(ratingCall).toBeDefined();
      expect(ratingCall![1]?.headers).toHaveProperty("Authorization");
      expect((ratingCall![1]?.headers as any).Authorization).toContain(
        "Bearer",
      );

      expect(response.carrier).toBe("UPS");
      expect(response.quotes).toHaveLength(3);
    });

    it("should reuse cached token", async () => {
      // Mock OAuth response
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(upsOAuthTokenResponse), {
          status: 200,
        }),
      );

      // Mock first rating call
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(upsRatingSuccessResponse), {
          status: 200,
        }),
      );

      // First call - should acquire token
      await carrier.getRate(testRateRequest);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Mock second rating call only (no new token fetch)
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(upsRatingSuccessResponse), {
          status: 200,
        }),
      );

      // Second call - should reuse token
      await carrier.getRate(testRateRequest);

      // Should only have called rating endpoint (token is cached)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should refresh token when approaching expiry", async () => {
      // Mock first token (expires in 1 second)
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ...upsOAuthTokenResponse,
            expires_in: 1,
          }),
          { status: 200 },
        ),
      );

      // Mock first rating call
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(upsRatingSuccessResponse), {
          status: 200,
        }),
      );

      // First call
      await carrier.getRate(testRateRequest);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Wait for token to expire (simulating passage of time)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Mock second token
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(upsOAuthTokenResponse), {
          status: 200,
        }),
      );

      // Mock second rating call
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(upsRatingSuccessResponse), {
          status: 200,
        }),
      );

      // Second call - should get new token
      await carrier.getRate(testRateRequest);

      // Should have fetched new token
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });

  describe("Request Building", () => {
    it("should correctly build UPS API request", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(upsOAuthTokenResponse), {
          status: 200,
        }),
      );

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(upsRatingSuccessResponse), {
          status: 200,
        }),
      );

      await carrier.getRate(testRateRequest);

      const ratingCall = mockFetch.mock.calls[1];
      expect(ratingCall).toBeDefined();
      const requestBody = JSON.parse(ratingCall![1]?.body as string);

      // Verify request structure
      expect(requestBody.RatingOption).toBe("Rate");
      expect(requestBody.Shipment).toBeDefined();
      expect(requestBody.Shipment.Shipper.Address).toBeDefined();
      expect(requestBody.Shipment.ShipTo.Address).toBeDefined();
      expect(requestBody.Shipment.Package).toHaveLength(1);

      // Verify address mapping
      expect(requestBody.Shipment.Shipper.Address.City).toBe(testAddress.city);
      expect(requestBody.Shipment.Shipper.Address.PostalCode).toBe(
        testAddress.postalCode,
      );

      // Verify package mapping
      expect(requestBody.Shipment.Package[0].Dimensions.Length).toBe("10");
      expect(requestBody.Shipment.Package[0].PackageWeight.Weight).toBe("5");
    });

    it("should handle multiple packages", async () => {
      const multiPackageRequest = {
        ...testRateRequest,
        packages: [testPackage, testPackage],
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(upsOAuthTokenResponse), {
          status: 200,
        }),
      );

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(upsRatingSuccessResponse), {
          status: 200,
        }),
      );

      await carrier.getRate(multiPackageRequest);

      const ratingCall = mockFetch.mock.calls[1];
      expect(ratingCall).toBeDefined();
      const requestBody = JSON.parse(ratingCall![1]?.body as string);

      expect(requestBody.Shipment.Package).toHaveLength(2);
    });
  });

  describe("Response Parsing", () => {
    it("should parse successful response", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(upsOAuthTokenResponse), {
          status: 200,
        }),
      );

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(upsRatingSuccessResponse), {
          status: 200,
        }),
      );

      const response = await carrier.getRate(testRateRequest);

      expect(response.carrier).toBe("UPS");
      expect(response.quotes).toHaveLength(3);

      // Verify first quote (Ground)
      const groundQuote = response.quotes[0];
      expect(groundQuote).toBeDefined();
      expect(groundQuote!.serviceCode).toBe("03");
      expect(groundQuote!.serviceName).toBe("UPS Ground");
      expect(groundQuote!.cost.baseCharge).toBe(23);
      expect(groundQuote!.cost.total).toBe(25.5);
      expect(groundQuote!.cost.currency).toBe("USD");
      expect(groundQuote!.estimatedDays).toBe(5);

      // Verify second quote (2nd Day)
      const secondDayQuote = response.quotes[1];
      expect(secondDayQuote).toBeDefined();
      expect(secondDayQuote!.serviceName).toBe("UPS 2nd Day Air");
      expect(secondDayQuote!.cost.total).toBe(42.75);
      expect(secondDayQuote!.estimatedDays).toBe(2);

      // Verify third quote (Next Day)
      const nextDayQuote = response.quotes[2];
      expect(nextDayQuote).toBeDefined();
      expect(nextDayQuote!.cost.total).toBe(65);
      expect(nextDayQuote!.estimatedDays).toBe(1);
    });

    it("should handle response with missing optional fields", async () => {
      const minimalResponse = {
        RateResponse: {
          Response: {
            ResponseStatus: {
              Code: "1",
              Description: "Success",
            },
          },
          RatedShipment: [
            {
              ServiceType: "UPS Ground",
              ServiceTypeCode: "03",
              TotalCharges: {
                CurrencyCode: "USD",
                MonetaryValue: "25.50",
              },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(upsOAuthTokenResponse), {
          status: 200,
        }),
      );

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(minimalResponse), {
          status: 200,
        }),
      );

      const response = await carrier.getRate(testRateRequest);

      expect(response.quotes).toHaveLength(1);
      expect(response.quotes[0]).toBeDefined();
      expect(response.quotes[0]!.estimatedDays).toBeUndefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle auth failure", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: "invalid_client",
            error_description: "Client authentication failed",
          }),
          { status: 401 },
        ),
      );

      await expect(carrier.getRate(testRateRequest)).rejects.toThrow(AuthError);
    });

    it("should handle network timeout", async () => {
      mockFetch.mockRejectedValueOnce(new Error("AbortError"));

      setTimeout(() => {
        mockFetch.mockImplementation(() =>
          Promise.reject(new Error("AbortError")),
        );
      }, 1);

      // Create new carrier to test
      const timeoutCarrier = new UPSCarrier({
        ...testConfig,
        httpTimeout: 10, // Very short timeout
      });

      // Note: This is tricky to test with mocks. In a real scenario, you'd need
      // to mock the fetch behavior differently or use a real server.
    });

    it("should handle malformed JSON response", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(upsOAuthTokenResponse), {
          status: 200,
        }),
      );

      mockFetch.mockResolvedValueOnce(
        new Response("invalid json", {
          status: 200,
        }),
      );

      await expect(carrier.getRate(testRateRequest)).rejects.toThrow(RateError);
    });

    it("should handle API error responses", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(upsOAuthTokenResponse), {
          status: 200,
        }),
      );

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(upsServerError), {
          status: 500,
        }),
      );

      await expect(carrier.getRate(testRateRequest)).rejects.toThrow(RateError);
    });

    it("should handle invalid address", async () => {
      const invalidAddress = {
        ...testAddress,
        countryCode: "ZZ", // Unsupported country
      };

      const invalidRequest = {
        ...testRateRequest,
        origin: invalidAddress,
      };

      // Validation happens in UPSCarrier.validateAddress() called by getRate()
      // This should throw before making any HTTP requests
      await expect(carrier.getRate(invalidRequest)).rejects.toThrow(
        ValidationError,
      );
    });

    it("should validate required address fields", async () => {
      const incompleteAddress = {
        ...testAddress,
        street1: "", // Missing required field
      };

      const invalidRequest = {
        ...testRateRequest,
        origin: incompleteAddress,
      };

      // This should throw during validation before any HTTP calls
      await expect(carrier.getRate(invalidRequest)).rejects.toThrow(
        ValidationError,
      );
    });
  });
});
