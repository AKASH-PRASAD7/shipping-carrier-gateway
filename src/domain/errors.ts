export class CarrierError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly originalError?: Error,
  ) {
    super(message);
    this.name = "CarrierError";
    Object.setPrototypeOf(this, CarrierError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      originalError: this.originalError?.message,
    };
  }
}

/**
 * Validation error for malformed input.
 */
export class ValidationError extends CarrierError {
  constructor(message: string, originalError?: Error) {
    super("VALIDATION_ERROR", message, originalError);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Authentication error (token acquisition, refresh, etc.).
 */
export class AuthError extends CarrierError {
  constructor(message: string, originalError?: Error) {
    super("AUTH_ERROR", message, originalError);
    this.name = "AuthError";
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

/**
 * Network-related error (timeouts, connection failures).
 */
export class NetworkError extends CarrierError {
  constructor(
    message: string,
    readonly statusCode?: number,
    originalError?: Error,
  ) {
    super("NETWORK_ERROR", message, originalError);
    this.name = "NetworkError";
    Object.setPrototypeOf(this, NetworkError.prototype);
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
    };
  }
}

/**
 * Rate operation error (malformed response, API errors, etc.).
 */
export class RateError extends CarrierError {
  constructor(
    message: string,
    readonly statusCode?: number,
    readonly details?: unknown,
    originalError?: Error,
  ) {
    super("RATE_ERROR", message, originalError);
    this.name = "RateError";
    Object.setPrototypeOf(this, RateError.prototype);
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}
