import { UPSAuth } from "./auth";
import { NetworkError, RateError } from "../../domain/errors";

interface UPSClientConfig {
  apiBaseUrl: string;
  httpTimeout: number;
  auth: UPSAuth;
}

/**
 * UPS API client.
 */
export class UPSClient {
  constructor(private config: UPSClientConfig) {}

  /**
   * Call UPS Rating API.
   */
  async post(endpoint: string, body: object): Promise<unknown> {
    const token = await this.config.auth.getAccessToken();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.httpTimeout,
      );

      const response = await fetch(`${this.config.apiBaseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle error responses
      if (!response.ok) {
        let details;
        try {
          details = await response.json();
        } catch {
          details = await response.text();
        }

        throw new RateError(
          `API request failed: ${response.status}`,
          response.status,
          details,
        );
      }

      // Parse response
      let data;
      try {
        data = await response.json();
      } catch (error) {
        throw new RateError(
          `Failed to parse response JSON`,
          undefined,
          undefined,
          error instanceof Error ? error : undefined,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof RateError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new NetworkError("Request timed out");
      }

      throw new NetworkError(
        `Network error: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
