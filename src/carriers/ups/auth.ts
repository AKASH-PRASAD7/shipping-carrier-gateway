import type { OAuthToken } from "../../domain/types";
import { AuthError } from "../../domain/errors";

interface UPSAuthConfig {
  clientId: string;
  clientSecret: string;
  apiBaseUrl: string;
  httpTimeout: number;
}

/**
 * Manages UPS OAuth 2.0 token lifecycle.
 */
export class UPSAuth {
  private token: OAuthToken | null = null;
  private tokenRefreshBuffer: number = 60; // Refresh 60s before expiry

  constructor(private config: UPSAuthConfig) {}

  /**
   * Get a valid access token, acquiring or refreshing as needed.
   */
  async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.token && this.isTokenValid()) {
      return this.token.accessToken;
    }

    // Acquire new token
    const newToken = await this.acquireToken();
    this.token = newToken;
    return newToken.accessToken;
  }

  /**
   * Acquire a new token from UPS OAuth endpoint.
   */
  private async acquireToken(): Promise<OAuthToken> {
    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`,
    ).toString("base64");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.httpTimeout,
      );

      const response = await fetch(
        `${this.config.apiBaseUrl}/security/v1/oauth/token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${credentials}`,
          },
          body: "grant_type=client_credentials",
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token request failed: ${response.status} ${error}`);
      }

      const data = (await response.json()) as {
        access_token: string;
        token_type: string;
        expires_in: number;
      };

      return {
        accessToken: data.access_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
        issuedAt: new Date(),
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new AuthError("Token request timed out", error);
      }
      throw new AuthError(
        `Failed to acquire token: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Check if the cached token is still valid.
   * Returns false if token is expired or will expire within the buffer.
   */
  private isTokenValid(): boolean {
    if (!this.token) return false;

    const expiryTime =
      this.token.issuedAt.getTime() + this.token.expiresIn * 1000;
    const bufferTime = this.tokenRefreshBuffer * 1000;
    const now = Date.now();

    return now + bufferTime < expiryTime;
  }

  /**
   * Clear the cached token (useful for testing or forcing refresh).
   */
  clearToken(): void {
    this.token = null;
  }
}
