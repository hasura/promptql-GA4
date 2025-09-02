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
  const filePath =
    process.env.GOOGLE_AUTH_CONFIG_FILEPATH ||
    DEFAULT_GOOGLE_AUTH_CONFIG_FILEPATH;
  const fullPath = getUserMountedFilePath() + filePath;

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
