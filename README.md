# Shipping Carrier Integration Service

A TypeScript-based shipping carrier integration service that provides rate shopping, authentication, and extensible architecture for integrating with multiple shipping carriers (UPS, FedEx, USPS, DHL, etc.).

## Overview

This service wraps the UPS Rating API with a clean, normalized API that abstracts away carrier-specific complexities. It's designed as a production-ready module that can be extended to support additional carriers and operations over time.

### Key Features

- **Extensible Architecture**: Add new carriers (FedEx, USPS, DHL) without touching existing code
- **OAuth 2.0 Authentication**: Automatic token acquisition, caching, and transparent refresh
- **Strong Typing**: Full TypeScript support with domain models and validation schemas
- **Error Handling**: Structured, actionable errors with context
- **Rate Shopping**: Fetch and normalize quotes from one or multiple carriers
- **Integration Tested**: Comprehensive tests with stubbed API responses

## Architecture

### Design Pattern: Adapter

Each carrier implements a common `Carrier` interface:

```typescript
interface Carrier {
  name: string;
  getRate(request: RateRequest): Promise<RateResponse>;
  validateAddress(address: Address): Promise<void>;
}
```

This allows new carriers to plug in seamlessly. Adding FedEx requires only:

1. A new `src/carriers/fedex/` directory
2. Implementation of the `Carrier` interface
3. Authentication and request/response mapping

### Directory Structure

```
src/
├── domain/              # Core domain types and errors
│   ├── types.ts         # RateRequest, RateResponse, Address, Package, etc.
│   ├── errors.ts        # CarrierError, ValidationError, AuthError, etc.
│   └── validation.ts    # Zod schemas for runtime validation
├── carriers/            # Carrier implementations (adapter pattern)
│   ├── types.ts         # Carrier interface contract
│   ├── ups/             # UPS integration
│   │   ├── auth.ts      # OAuth 2.0 token management
│   │   ├── client.ts    # HTTP client
│   │   ├── mapper.ts    # Domain ↔ UPS API translation
│   │   └── index.ts     # Carrier implementation
│   └── index.ts         # Carrier factory
├── services/            # High-level business logic
│   └── rateService.ts   # Rate shopping orchestrator
├── config/
│   └── index.ts         # Environment configuration
└── index.ts             # Public API exports

tests/
├── integration/         # End-to-end tests with stubbed APIs
│   ├── fixtures/        # Real UPS API response examples
│   ├── ups.test.ts      # UPS integration tests
│   └── rateService.test.ts  # Service layer tests
└── unit/
    └── validation.test.ts   # Validation schema tests
```

## Getting Started

### Installation

```bash
bun install
```

### Configuration

1. Copy `.env.example` to `.env` and fill in your UPS OAuth credentials:

```bash
cp .env.example .env
```

2. Edit `.env` with your credentials:
   - `UPS_CLIENT_ID`: From UPS developer portal
   - `UPS_CLIENT_SECRET`: From UPS developer portal
   - `UPS_API_BASE_URL`: `https://onlinetools-sandbox.ups.com` (sandbox) or `https://onlinetools.ups.com` (production)

### Running Tests

```bash
# Run all tests
bun test

# Run with UI
bun test --ui

# Run specific test file
bun test tests/integration/ups.test.ts
```

### Type Checking

```bash
bun run build
```

### Example Usage

```typescript
import { RateService, CarrierFactory, config } from "./src/index.js";

// Create carriers from configuration
const carriers = CarrierFactory.createCarriers({
  ups: {
    clientId: config.ups.clientId,
    clientSecret: config.ups.clientSecret,
    apiBaseUrl: config.ups.apiBaseUrl,
    httpTimeout: config.http.timeout,
  },
});

const rateService = new RateService(carriers);

// Request rates
const rates = await rateService.getRate({
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
      dimensionUnit: "IN",
      weight: 5,
      weightUnit: "LB",
    },
  ],
});

// rates is an array of RateResponse objects
// Each contains normalized quotes from the carrier
```

## Design Decisions

### 1. Layered Architecture

- **Domain Layer**: Carrier-agnostic types and validation
- **Carrier Layer**: Carrier-specific implementations (auth, HTTP, mapping)
- **Service Layer**: High-level business logic (rate shopping, orchestration)

This separation ensures that:

- New carriers don't affect domain logic
- Domain types never leak to the caller (always normalized)
- Carriers are testable in isolation

### 2. OAuth Token Management

Tokens are cached in memory with automatic refresh:

- Tokens are reused until expiry
- Refresh happens `TOKEN_REFRESH_BUFFER` seconds before expiry (default 60s)
- Transparent to the caller—no manual token management needed
- In production, consider using Redis or a persistent store for distributed systems

### 3. Validation First

Input is validated **before** making API calls using Zod schemas:

- Fails fast with clear error messages
- Prevents invalid requests from reaching the carrier
- Type-safe parsing

### 4. Error Handling

Structured error classes hierarchy:

- `CarrierError` (base): message, code, original cause
- `ValidationError`: Input validation failures
- `AuthError`: OAuth/authentication failures
- `NetworkError`: Timeouts, connection issues
- `RateError`: API errors, malformed responses

All errors include the original cause for debugging.

### 5. Extensibility

Adding a new carrier (e.g., FedEx) requires only:

1. Implement the `Carrier` interface
2. Implement auth (OAuth, API key, etc.)
3. Implement HTTP client
4. Implement request/response mappers
5. No changes to domain, service, or config layers

Adding a new operation (e.g., label purchase, tracking) requires:

1. Add a method to the `Carrier` interface
2. Implement in each carrier
3. Optionally add service layer methods

### 6. Testing Strategy

- **Integration tests** use **stubbed HTTP responses** based on real UPS API examples
- No live API calls needed—all tests are deterministic
- Tests verify:
  - Request building (domain → UPS API format)
  - Response parsing (UPS API → domain format)
  - Token lifecycle (acquisition, reuse, refresh)
  - Error paths (4xx, 5xx, timeouts, malformed JSON)

## Project Structure Rationale

### Why Interfaces?

The `Carrier` interface ensures contract-based design. New carriers must implement this interface, making it clear what's required and enabling type-safe polymorphism.

### Why Separate Mapper?

Keeps the carrier implementation clean:

- Mapper handles all UPS API quirks
- Easy to update if UPS API changes
- Easy to test in isolation

### Why Zod Validation?

- Runtime validation (catches issues at runtime, not just compile-time)
- Clear error messages for debugging
- Type-safe parsing with `parse()` and `safeParse()`
- Becomes the source of truth for request shape

### Why Domain Types?

- Single source of truth for internal API shape
- Never expose UPS-specific types to callers
- Normalize across carriers (FedEx might use different field names)
- Future: easy to support multi-carrier aggregation

## API Reference

### RateService

```typescript
class RateService {
  // Get rates from one or more carriers
  getRate(request: RateRequest, carrierName?: string): Promise<RateResponse[]>;

  // List available carriers
  getAvailableCarriers(): string[];
}
```

### RateRequest

```typescript
interface RateRequest {
  origin: Address; // Shipper address
  destination: Address; // Recipient address
  packages: Package[]; // Array of packages
  serviceCode?: string; // Optional: filter to specific service
}
```

### RateResponse

```typescript
interface RateResponse {
  carrier: string; // e.g., "UPS"
  quotes: RateQuote[]; // Available service options
  requestedAt: Date;
  expiresAt?: Date;
}
```

### RateQuote

```typescript
interface RateQuote {
  serviceCode: string; // e.g., "03" (UPS Ground)
  serviceName: string; // e.g., "UPS Ground"
  cost: RateCost; // Cost breakdown
  estimatedDays?: number; // Days to delivery
  warnings?: string[];
}
```

### Error Classes

All errors extend `CarrierError`:

```typescript
class CarrierError extends Error {
  code: string;              // Error code (e.g., "VALIDATION_ERROR")
  message: string;           // Human-readable message
  originalError?: Error;     // Original error for debugging
}

class ValidationError extends CarrierError {...}
class AuthError extends CarrierError {...}
class NetworkError extends CarrierError {...}
class RateError extends CarrierError {...}
```

## Improvements for Production

### Short Term

- [ ] **Retry Logic**: Exponential backoff for network errors
- [ ] **Request Logging**: Log all requests/responses (with sensitive data redacted)
- [ ] **Metrics**: Track API response times, error rates
- [ ] **Rate Limiting**: Implement request queue to avoid overwhelming carriers
- [ ] **Address Validation**: Leverage carrier-specific address validation APIs

### Medium Term

- [ ] **Multi-Carrier Aggregation**: Compare quotes across carriers
- [ ] **Persistent Token Storage**: Redis-backed token cache for distributed systems
- [ ] **Label Purchase**: Implement `purchaseLabel()` operation
- [ ] **Tracking**: Implement `getTracking()` operation
- [ ] **Webhook Events**: Notify on shipment status changes
- [ ] **Caching**: Cache rates for identical requests (with TTL)

### Long Term

- [ ] **Additional Carriers**: FedEx, USPS, DHL, international carriers
- [ ] **Webhooks & Events**: Event-driven architecture
- [ ] **GraphQL API**: GraphQL schema alongside REST
- [ ] **Observability**: Distributed tracing (OpenTelemetry)
- [ ] **Analytics**: Shipment analytics, cost reporting
- [ ] **Rate Negotiation**: Support for negotiated rates

## Testing

The project includes comprehensive integration tests:

- **Token Lifecycle**: Acquisition, caching, refresh
- **Request Building**: Domain → UPS API format mapping
- **Response Parsing**: UPS API → domain format parsing
- **Error Handling**: Network errors, timeouts, malformed JSON, API errors
- **Address Validation**: Invalid addresses, unsupported countries

All tests use **stubbed HTTP responses** based on real UPS API examples. No live API calls are made during testing.

```bash
# Run tests
bun test

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

## Dependencies

- **zod**: Runtime validation and schema parsing
- **dotenv**: Environment variable loading
- **vitest**: Fast unit testing framework (optional, for development)
- **@types/node**: TypeScript types for Node.js APIs
