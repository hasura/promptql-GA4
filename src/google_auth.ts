import { readFile } from "fs/promises";
import { getUserMountedFilePath } from "./path";

const DEFAULT_GOOGLE_AUTH_CONFIG_FILEPATH = "google_auth_config.json";

export interface GoogleAuthConfig {
  property_id: string;
  domain: string;
  credentials: any;
}

export async function parseGoogleAuth(): Promise<GoogleAuthConfig> {
  // GOOGLE_AUTH_CONFIG_FILEPATH env var
  let filePath =
    process.env.GOOGLE_AUTH_CONFIG_FILEPATH ||
    DEFAULT_GOOGLE_AUTH_CONFIG_FILEPATH;

  let configDir = getUserMountedFilePath();

  // Ensure proper pathing. Remove leading slash if present
  if (filePath.startsWith("/")) {
    filePath = filePath.slice(1);
  }
  if (filePath.startsWith("./")) {
    filePath = filePath.slice(2);
  }

  // Remove trailing slash if present
  if (configDir.endsWith("/")) {
    configDir = configDir.slice(0, -1);
  }

  const fullPath = configDir + "/" + filePath;

  try {
    // 1. Read file content
    const content = await readFile(fullPath, "utf-8");

    // 2. Parse JSON
    const config = JSON.parse(content);

    // 3. Validate required fields
    if (!config.property_id || !config.credentials) {
      throw new Error("Missing required configuration parameters");
    }

    return config;
  } catch (error: any) {
    throw new Error(`Invalid configuration: ${error.message}`);
  }
}
