export const upsOAuthTokenResponse = {
  access_token: "test_token_abc123xyz789",
  token_type: "Bearer",
  expires_in: 3600,
};

/**
 * UPS Rating API successful response with two service options.
 */
export const upsRatingSuccessResponse = {
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
        BaseServiceCharge: {
          CurrencyCode: "USD",
          MonetaryValue: "23.00",
        },
        SurchargesAndTaxes: {
          CurrencyCode: "USD",
          MonetaryValue: "2.50",
        },
        GuaranteedDaysToDelivery: "5",
      },
      {
        ServiceType: "UPS 2nd Day Air",
        ServiceTypeCode: "02",
        TotalCharges: {
          CurrencyCode: "USD",
          MonetaryValue: "42.75",
        },
        BaseServiceCharge: {
          CurrencyCode: "USD",
          MonetaryValue: "40.00",
        },
        SurchargesAndTaxes: {
          CurrencyCode: "USD",
          MonetaryValue: "2.75",
        },
        GuaranteedDaysToDelivery: "2",
      },
      {
        ServiceType: "UPS Next Day Air",
        ServiceTypeCode: "01",
        TotalCharges: {
          CurrencyCode: "USD",
          MonetaryValue: "65.00",
        },
        BaseServiceCharge: {
          CurrencyCode: "USD",
          MonetaryValue: "62.00",
        },
        SurchargesAndTaxes: {
          CurrencyCode: "USD",
          MonetaryValue: "3.00",
        },
        GuaranteedDaysToDelivery: "1",
      },
    ],
  },
};

/**
 * UPS API error response - invalid address.
 */
export const upsInvalidAddressError = {
  response: {
    errors: [
      {
        code: "1001",
        message: "Invalid address",
        detail: "Postal code is invalid",
      },
    ],
  },
};

/**
 * Malformed JSON response.
 */
export const malformedJsonResponse = "{invalid json}";

/**
 * UPS API 500 error response.
 */
export const upsServerError = {
  response: {
    errors: [
      {
        code: "5000",
        message: "Internal server error",
      },
    ],
  },
};
