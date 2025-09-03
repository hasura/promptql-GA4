import { protos } from "@google-analytics/data";
import {
  SchemaResponse,
  CollectionInfo,
  Type,
  ObjectType,
  ScalarType,
} from "@hasura/ndc-sdk-typescript";

export type GA4Metadata = protos.google.analytics.data.v1beta.IMetadata;

export async function getSchema(
  metadata: GA4Metadata
): Promise<SchemaResponse> {
  try {
    // const [metadata] = await client.getMetadata({
    //   name: `properties/${property_id}/metadata`
    // });

    // Define scalar types with proper representation
    const scalarTypes: Record<string, any> = {
      String: {
        representation: { type: "string" } as const, // Use const assertion
        aggregate_functions: {},
        comparison_operators: { _eq: { type: "equal" } },
      },
      Float: {
        representation: { type: "number" } as const, // Use const assertion
        aggregate_functions: {
          sum: { result_type: { type: "named", name: "Float" } },
          avg: { result_type: { type: "named", name: "Float" } },
        },
        comparison_operators: {
          _eq: { type: "equal" },
          _gt: { type: "greater_than" },
        },
      },
    };

    // Define DateRangeInput as an object type
    const dateRangeType: ObjectType = {
      fields: {
        startDate: {
          type: {
            type: "named",
            name: "String",
          },
          description:
            "Supported formats: YYYY-MM-DD, YYYY-MM-DDTHH:MM:SS, MM/DD/YYYY.",
        },
        endDate: {
          type: {
            type: "named",
            name: "String",
          },
          description:
            "Supported formats: YYYY-MM-DD, YYYY-MM-DDTHH:MM:SS, MM/DD/YYYY.",
        },
      },
    };

    // Define AnalyticsRow type for collection fields
    const analyticsRowType: ObjectType = {
      fields: {},
    };

    // Add dimensions to AnalyticsRow
    metadata.dimensions?.forEach((d) => {
      analyticsRowType.fields[`dimension_${d.apiName}`] = {
        type: { type: "named", name: "String" },
      };
    });

    // Add metrics to AnalyticsRow
    metadata.metrics?.forEach((m) => {
      analyticsRowType.fields[`metric_${m.apiName}`] = {
        type: { type: "named", name: "Float" },
      };
    });

    return {
      scalar_types: scalarTypes,
      object_types: {
        DateRangeInput: dateRangeType,
        AnalyticsRow: analyticsRowType, // Define row type
      },
      collections: [
        {
          name: "analytics",
          description: "GA4 analytics data",
          type: "AnalyticsRow", // Reference row type
          arguments: {
            dateRange: {
              type: {
                type: "named",
                name: "DateRangeInput",
              },
              description: "Date range for report",
            },
          },
          foreign_keys: {},
          uniqueness_constraints: {},
        } as CollectionInfo,
      ],
      functions: [],
      procedures: [],
    };
  } catch (error) {
    throw new Error(`GA4 metadata fetch failed: ${error}`);
  }
}
