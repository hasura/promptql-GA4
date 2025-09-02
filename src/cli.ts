#!/usr/bin/env node

import { GA4Configuration, initClient } from "./connector";
import { parseGoogleAuth } from "./google_auth";
import { Command } from "commander";
import { writeFile } from "fs/promises";

async function generateConfiguration(): Promise<GA4Configuration> {
  // 1. Parse Google Auth config
  const googleAuthConfig = await parseGoogleAuth();
  // 2. Get credentials from Google Auth config
  const credentials = googleAuthConfig.credentials;
  // 3. Get property_id from Google Auth config
  const property_id = googleAuthConfig.property_id;

  // 4. Get metadata from GA4 API
  const analyticsDataClient = initClient(credentials);
  const [metadata] = await analyticsDataClient.getMetadata({
    name: `properties/${property_id}/metadata`,
  });

  return {
    metadata,
  };
}

const program = new Command();

// Add program name and description
program
  .name("ga4-connector-cli")
  .description("CLI to generate configuration for GA4 connector");

// Add update command with --output flag. It is required
program
  .command("update")
  .description("Update configuration")
  .requiredOption("-o, --output <path>", "output file path")
  .action(async (options: any) => {
    try {
      const output = options.output;
      const config = await generateConfiguration();
      await writeFile(output, JSON.stringify(config, null, 2));
      console.log(`Configuration generated successfully at ${output}`);
    } catch (error: any) {
      console.error(`Error generating configuration: ${error.message}`);
    }
  });

// Parse command line arguments
program.parseAsync();
