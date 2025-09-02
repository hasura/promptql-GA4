import {
  Connector,
  Capabilities,
  SchemaResponse,
  QueryRequest,
  QueryResponse,
  ExplainResponse,
  MutationRequest, // Add missing import
  MutationResponse, // Add missing import
} from "@hasura/ndc-sdk-typescript";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { GoogleAuth } from "google-auth-library";
import { getSchema, GA4Metadata } from "./schema";
import { runQuery } from "./query";
import { readFile } from "fs/promises";
import { parseGoogleAuth } from "./google_auth";

export type GA4Configuration = {
  metadata: GA4Metadata;
};

interface GA4State {
  analyticsDataClient: BetaAnalyticsDataClient;
  property_id: string;
  domain: string;
}

export class GA4Connector implements Connector<GA4Configuration, GA4State> {
  async parseConfiguration(
    configurationPath: string,
  ): Promise<GA4Configuration> {
    try {
      // 1. Read file content
      const content = await readFile(configurationPath, "utf-8");

      // 2. Parse JSON
      const config = JSON.parse(content);

      // 3. Validate required fields
      if (!config.metadata) {
        throw new Error("Missing required configuration parameters");
      }

      return config;
    } catch (error: any) {
      throw new Error(`Invalid configuration: ${error.message}`);
    }
  }

  async tryInitState(
    _configuration: GA4Configuration,
    _metrics: Record<string, any>,
  ): Promise<GA4State> {
    try {
      const serviceAccount = await parseGoogleAuth();
      // credentials is already an object - no need to parse!
      const credentials = serviceAccount.credentials;

      const analyticsDataClient = initClient(credentials);

      return {
        analyticsDataClient,
        property_id: serviceAccount.property_id,
        domain: serviceAccount.domain,
      };
    } catch (error: any) {
      throw new Error(`GA4 client initialization failed: ${error.message}`);
    }
  }

  async fetchMetrics(): Promise<undefined> {
    return undefined;
  }

  getCapabilities(): Capabilities {
    return {
      query: {
        aggregates: {},
        variables: {},
        nested_fields: {
          filter_by: {},
          order_by: {},
          aggregates: {},
        },
        exists: {
          nested_collections: {},
        },
      },
      mutation: {},
      relationships: {},
    };
  }

  // @ts-ignore
  async getSchema(configuration: GA4Configuration): Promise<SchemaResponse> {
    return getSchema(configuration.metadata);
  }

  async query(
    configuration: GA4Configuration,
    state: GA4State,
    request: QueryRequest,
  ): Promise<QueryResponse> {
    return runQuery(
      state.analyticsDataClient,
      state.property_id,
      state.domain,
      request,
    );
  }

  async queryExplain(
    configuration: GA4Configuration,
    state: GA4State,
    request: QueryRequest,
  ): Promise<ExplainResponse> {
    return {
      details: {},
    };
  }

  async mutation(
    configuration: GA4Configuration,
    state: GA4State,
    request: MutationRequest, // Correct type
  ): Promise<MutationResponse> {
    // Correct return type
    throw new Error("Mutations are not supported for GA4 connector");
  }

  async mutationExplain(
    configuration: GA4Configuration,
    state: GA4State,
    request: MutationRequest, // Correct type
  ): Promise<ExplainResponse> {
    throw new Error("Mutations are not supported for GA4 connector");
  }
}

export function initClient(credentials: any): BetaAnalyticsDataClient {
  const auth = new GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });

  return new BetaAnalyticsDataClient({
    auth: auth,
  });
}
