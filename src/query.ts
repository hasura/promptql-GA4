import { BetaAnalyticsDataClient, protos } from "@google-analytics/data";
import { GoogleAuthConfig } from "./google_auth";
import {
  QueryRequest,
  QueryResponse,
  RowSet,
  Field,
} from "@hasura/ndc-sdk-typescript";

// type RunReportRequest = protos.google.analytics.data.v1beta.IRunReportRequest;

interface LiteralDateRange {
  type: "literal";
  value: any;
}

interface QueryArguments {
  [key: string]: unknown;
  dateRange?: LiteralDateRange;
}

export async function runQuery(
  client: BetaAnalyticsDataClient,
  property_id: string,
  domain: string,
  request: QueryRequest,
): Promise<QueryResponse> {
  const fields: Record<string, Field> = request.query?.fields || {};
  const limit = request.query?.limit || 10000;
  const args: QueryArguments = request.arguments || {};

  console.log("*************args from request***********");
  console.log(args);
  // Track requested fields
  const requestedDimensions: Record<string, string> = {};
  const requestedMetrics: Record<string, string> = {};

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (fieldDef.type === "column") {
      const columnName = fieldDef.column;
      if (columnName.startsWith("dimension_")) {
        requestedDimensions[fieldName] = columnName.replace("dimension_", "");
      } else if (columnName.startsWith("metric_")) {
        requestedMetrics[fieldName] = columnName.replace("metric_", "");
      }
    }
  }

  // Handle date range with new structure
  let startDate = "7daysAgo";
  let endDate = "today";

  if (args.dateRange && args.dateRange.type === "literal") {
    const dateRangeValue = args.dateRange.value;

    // Support both snake_case and camelCase keys
    const rawStart = dateRangeValue.start_date || dateRangeValue.startDate;
    const rawEnd = dateRangeValue.end_date || dateRangeValue.endDate;

    startDate = convertDateFormat(rawStart);
    endDate = convertDateFormat(rawEnd);
  }

  // // Build GA4 API request
  // const ga4Request: RunReportRequest = {
  //   property: `properties/${configuration.property_id}`,
  //   dateRanges: [{ startDate, endDate }],
  //   dimensions: Object.values(requestedDimensions).map(name => ({ name })),
  //   metrics: Object.values(requestedMetrics).map(name => ({ name })),
  //   limit
  // };

  const ga4Request: protos.google.analytics.data.v1beta.IRunReportRequest = {
    property: `properties/${property_id}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [
      ...Object.values(requestedDimensions).map((name) => ({ name })),
      { name: "hostName" }, // Must include hostName dimension
    ],
    metrics: Object.values(requestedMetrics).map((name) => ({ name })),
    limit,
    dimensionFilter: {
      filter: {
        fieldName: "hostName",
        stringFilter: {
          value: domain,
          matchType: "EXACT",
        },
      },
    },
  };

  // Execute GA4 API call
  const [response] = await client.runReport(ga4Request);

  // Validate response (NEW)
  const expectedDimensions = Object.keys(requestedDimensions).length;
  const expectedMetrics = Object.keys(requestedMetrics).length;
  const errors: string[] = [];

  if (!response.rows || response.rows.length === 0) {
    errors.push("No rows in GA4 response");
  } else {
    response.rows.forEach((row, index) => {
      const actualDimensions = row.dimensionValues?.length || 0;
      const actualMetrics = row.metricValues?.length || 0;

      if (actualDimensions < expectedDimensions) {
        errors.push(
          `Row ${index} missing dimensions: expected ${expectedDimensions}, got ${actualDimensions}`,
        );
      }
      if (actualMetrics < expectedMetrics) {
        errors.push(
          `Row ${index} missing metrics: expected ${expectedMetrics}, got ${actualMetrics}`,
        );
      }
    });
  }

  if (errors.length > 0) {
    throw new Error(`GA4 response validation failed: ${errors.join("; ")}`);
  }

  // Map to requested fields
  const rowSet: RowSet = {
    rows:
      response.rows?.map((row) => {
        const result: Record<string, any> = {};

        // Map dimensions
        Object.entries(requestedDimensions).forEach(
          ([fieldName, ga4Dim], index) => {
            result[fieldName] = row.dimensionValues?.[index]?.value || null;
          },
        );

        // Map metrics
        Object.entries(requestedMetrics).forEach(
          ([fieldName, ga4Metric], index) => {
            result[fieldName] = row.metricValues?.[index]?.value || null;
          },
        );

        return result;
      }) || [],
  };

  return [rowSet];
}

function convertDateFormat(dateStr: string): string {
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  // YYYY-MM-DDTHH:MM:SS format
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateStr)) {
    return dateStr.slice(0, 10);
  }

  // MM/DD/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const [month, day, year] = dateStr.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  throw new Error(`Unsupported date format: ${dateStr}`);
}
