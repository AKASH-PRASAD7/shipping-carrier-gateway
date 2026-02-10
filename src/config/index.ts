import * as dotenv from "dotenv";

// Load .env file if present
dotenv.config();

interface Config {
  ups: {
    clientId: string;
    clientSecret: string;
    apiBaseUrl: string;
  };
  http: {
    timeout: number;
  };
  token: {
    refreshBuffer: number;
  };
}

/**
 * Load configuration from environment variables.
 */
function loadConfig(): Config {
  const clientId = process.env.UPS_CLIENT_ID;
  const clientSecret = process.env.UPS_CLIENT_SECRET;
  const apiBaseUrl = process.env.UPS_API_BASE_URL;

  if (!clientId || !clientSecret || !apiBaseUrl) {
    throw new Error(
      "Missing required UPS configuration. Set: UPS_CLIENT_ID, UPS_CLIENT_SECRET, UPS_API_BASE_URL",
    );
  }

  return {
    ups: {
      clientId,
      clientSecret,
      apiBaseUrl,
    },
    http: {
      timeout: parseInt(process.env.HTTP_TIMEOUT || "10000", 10),
    },
    token: {
      refreshBuffer: parseInt(process.env.TOKEN_REFRESH_BUFFER || "60", 10),
    },
  };
}

export const config = loadConfig();
