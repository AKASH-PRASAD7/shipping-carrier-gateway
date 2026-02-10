import type {
  RateRequest,
  RateResponse,
  RateQuote,
  Address,
  Package,
} from "../../domain/types";

/**
 * UPS API types (based on UPS Rating API documentation).
 * See: https://developer.ups.com/tag/Rating?loc=en_US
 */

interface UPSAddress {
  AddressLine: string;
  City: string;
  StateProvinceCode: string;
  PostalCode: string;
  CountryCode: string;
}

interface UPSPackageDimensions {
  Length: string;
  Width: string;
  Height: string;
  UnitOfMeasurement: {
    Code: string;
  };
}

interface UPSPackageWeight {
  UnitOfMeasurement: {
    Code: string;
  };
  Weight: string;
}

interface UPSShipment {
  Shipper: {
    Address: UPSAddress;
  };
  ShipTo: {
    Address: UPSAddress;
  };
  Package: {
    Dimensions: UPSPackageDimensions;
    PackageWeight: UPSPackageWeight;
  }[];
}

interface UPSRatingRequest {
  RatingOption: string;
  Shipment: UPSShipment;
}

interface UPSRate {
  ServiceType: string;
  ServiceTypeCode: string;
  TotalCharges: {
    CurrencyCode: string;
    MonetaryValue: string;
  };
  BaseServiceCharge?: {
    CurrencyCode: string;
    MonetaryValue: string;
  };
  SurchargesAndTaxes?: {
    CurrencyCode: string;
    MonetaryValue: string;
  };
  GuaranteedDaysToDelivery?: string;
}

interface UPSRatingResponse {
  RateResponse: {
    Response: {
      ResponseStatus: {
        Code: string;
        Description: string;
      };
    };
    RatedShipment: UPSRate[];
  };
}

/**
 * Convert a domain Address to UPS format.
 */
function mapAddressToUPS(address: Address): UPSAddress {
  return {
    AddressLine: address.street2
      ? `${address.street1}, ${address.street2}`
      : address.street1,
    City: address.city,
    StateProvinceCode: address.state,
    PostalCode: address.postalCode,
    CountryCode: address.countryCode,
  };
}

/**
 * Convert a domain Package to UPS format.
 */
function mapPackageToUPS(pkg: Package): {
  Dimensions: UPSPackageDimensions;
  PackageWeight: UPSPackageWeight;
} {
  return {
    Dimensions: {
      Length: String(pkg.length),
      Width: String(pkg.width),
      Height: String(pkg.height),
      UnitOfMeasurement: {
        Code: pkg.dimensionUnit,
      },
    },
    PackageWeight: {
      UnitOfMeasurement: {
        Code: pkg.weightUnit,
      },
      Weight: String(pkg.weight),
    },
  };
}

/**
 * Convert a domain RateRequest to UPS RatingServiceSelectionRequest format.
 */
export function mapRateRequestToUPS(request: RateRequest): UPSRatingRequest {
  const packages = request.packages.map((pkg) => mapPackageToUPS(pkg));

  return {
    RatingOption: "Rate",
    Shipment: {
      Shipper: {
        Address: mapAddressToUPS(request.origin),
      },
      ShipTo: {
        Address: mapAddressToUPS(request.destination),
      },
      Package: packages.map((pkg) => ({
        ...pkg,
      })),
    },
  };
}

/**
 * Parse a UPS rate into a domain RateQuote.
 */
function mapUPSRateToQuote(upsRate: UPSRate): RateQuote {
  const total = parseFloat(upsRate.TotalCharges.MonetaryValue);
  const baseCharge = upsRate.BaseServiceCharge
    ? parseFloat(upsRate.BaseServiceCharge.MonetaryValue)
    : total;
  const surcharges = upsRate.SurchargesAndTaxes
    ? parseFloat(upsRate.SurchargesAndTaxes.MonetaryValue)
    : 0;

  return {
    serviceCode: upsRate.ServiceTypeCode,
    serviceName: upsRate.ServiceType,
    cost: {
      baseCharge,
      surcharges: surcharges > 0 ? surcharges : undefined,
      taxes: surcharges > 0 ? surcharges : undefined,
      total,
      currency: (upsRate.TotalCharges.CurrencyCode as any) || "USD",
    },
    estimatedDays: upsRate.GuaranteedDaysToDelivery
      ? parseInt(upsRate.GuaranteedDaysToDelivery, 10)
      : undefined,
  };
}

/**
 * Convert a UPS RatingServiceSelectionResponse to domain RateResponse.
 */
export function mapUPSResponseToRateResponse(
  upsResponse: UPSRatingResponse,
): RateResponse {
  const rates = upsResponse.RateResponse.RatedShipment || [];

  return {
    carrier: "UPS",
    quotes: rates.map(mapUPSRateToQuote),
    requestedAt: new Date(),
  };
}
