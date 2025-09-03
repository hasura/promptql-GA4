import {
  Expression,
  ComparisonTarget,
  ComparisonValue,
} from "@hasura/ndc-sdk-typescript";
import { protos } from "@google-analytics/data";

// Types for parsed filters
export interface ParsedFilter {
  columnName: string;
  operator: string;
  value: any;
  isDimension: boolean;
  isMetric: boolean;
}

export interface FilterParseResult {
  dimensionFilters: ParsedFilter[];
  metricFilters: ParsedFilter[];
  errors: string[];
}

// GA4 Filter types
type GA4Filter = protos.google.analytics.data.v1beta.IFilter;
type GA4FilterExpression =
  protos.google.analytics.data.v1beta.IFilterExpression;

// Supported operators
export const SUPPORTED_OPERATORS = {
  EQUAL: "_eq",
} as const;

export type SupportedOperator =
  (typeof SUPPORTED_OPERATORS)[keyof typeof SUPPORTED_OPERATORS];

// Validation functions
export function isSupportedOperator(
  operator: string,
): operator is SupportedOperator {
  return Object.values(SUPPORTED_OPERATORS).includes(
    operator as SupportedOperator,
  );
}

export function validateFilterSupport(operator: string): {
  isSupported: boolean;
  error?: string;
} {
  if (!isSupportedOperator(operator)) {
    return {
      isSupported: false,
      error: `Operator '${operator}' is not supported. Only '${SUPPORTED_OPERATORS.EQUAL}' (equal) is currently supported.`,
    };
  }
  return { isSupported: true };
}

/**
 * Parse NDC Expression AST to extract dimension and metric filters
 * Currently only supports 'equal' operator (_eq)
 */
export function parsePredicateFilters(
  predicate: Expression | null | undefined,
): FilterParseResult {
  const result: FilterParseResult = {
    dimensionFilters: [],
    metricFilters: [],
    errors: [],
  };

  if (!predicate) {
    return result;
  }

  try {
    parseExpressionRecursive(predicate, result);
  } catch (error) {
    result.errors.push(
      `Failed to parse predicate: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return result;
}

/**
 * Recursively parse Expression AST
 */
function parseExpressionRecursive(
  expression: Expression,
  result: FilterParseResult,
): void {
  switch (expression.type) {
    case "and":
      // Process all expressions in AND
      expression.expressions.forEach((expr) =>
        parseExpressionRecursive(expr, result),
      );
      break;

    case "or":
      // For now, we'll process OR expressions but note that GA4 has limitations
      // GA4 supports OR within dimension filters but structure is complex
      result.errors.push(
        "OR expressions are not fully supported yet - processing individual conditions",
      );
      expression.expressions.forEach((expr) =>
        parseExpressionRecursive(expr, result),
      );
      break;

    case "not":
      result.errors.push("NOT expressions are not supported in GA4 filters");
      break;

    case "binary_comparison_operator":
      parseBinaryComparison(expression, result);
      break;

    case "exists":
      result.errors.push("EXISTS expressions are not supported in GA4 filters");
      break;

    case "unary_comparison_operator":
      result.errors.push(
        "Unary comparison operators are not supported in GA4 filters",
      );
      break;

    default:
      result.errors.push(
        `Unknown expression type: ${(expression as any).type}`,
      );
  }
}

/**
 * Parse binary comparison operator (e.g., column = value)
 */
function parseBinaryComparison(
  expression: {
    column: ComparisonTarget;
    operator: string;
    value: ComparisonValue;
  },
  result: FilterParseResult,
): void {
  // Validate operator support
  const validation = validateFilterSupport(expression.operator);
  if (!validation.isSupported) {
    result.errors.push(
      validation.error || `Unsupported operator: ${expression.operator}`,
    );
    return;
  }

  // Extract column information
  const columnInfo = extractColumnInfo(expression.column);
  if (!columnInfo) {
    result.errors.push(
      "Failed to extract column information from comparison target",
    );
    return;
  }

  // Extract value
  const value = extractComparisonValue(expression.value);
  if (value === null || value === undefined) {
    result.errors.push("Failed to extract value from comparison");
    return;
  }

  // Create parsed filter
  const filter: ParsedFilter = {
    columnName: columnInfo.name,
    operator: expression.operator,
    value: value,
    isDimension: columnInfo.isDimension,
    isMetric: columnInfo.isMetric,
  };

  // Add to appropriate filter list
  if (filter.isDimension) {
    result.dimensionFilters.push(filter);
  } else if (filter.isMetric) {
    result.metricFilters.push(filter);
  } else {
    result.errors.push(
      `Column ${columnInfo.name} is neither a dimension nor a metric`,
    );
  }
}

/**
 * Extract column information from ComparisonTarget
 */
function extractColumnInfo(
  target: ComparisonTarget,
): { name: string; isDimension: boolean; isMetric: boolean } | null {
  let columnName: string;

  if (target.type === "column") {
    columnName = target.name;
  } else if (target.type === "root_collection_column") {
    columnName = target.name;
  } else {
    return null;
  }

  // Determine if it's a dimension or metric based on column name prefix
  const isDimension = columnName.startsWith("dimension_");
  const isMetric = columnName.startsWith("metric_");

  return {
    name: columnName,
    isDimension,
    isMetric,
  };
}

/**
 * Extract value from ComparisonValue
 */
function extractComparisonValue(value: ComparisonValue): any {
  switch (value.type) {
    case "scalar":
      return value.value;
    case "variable":
      // Variables are not supported in this implementation
      return null;
    case "column":
      // Column comparisons are not supported in this implementation
      return null;
    default:
      return null;
  }
}

/**
 * Build GA4 filter structures from parsed filters
 */
export function buildGA4Filters(
  parseResult: FilterParseResult,
  existingDimensionFilter?: GA4FilterExpression,
): {
  dimensionFilter?: GA4FilterExpression;
  metricFilter?: GA4FilterExpression;
  errors: string[];
} {
  const errors: string[] = [...parseResult.errors];
  let dimensionFilter: GA4FilterExpression | undefined;
  let metricFilter: GA4FilterExpression | undefined;

  // Build dimension filters
  if (parseResult.dimensionFilters.length > 0) {
    dimensionFilter = buildDimensionFilter(
      parseResult.dimensionFilters,
      existingDimensionFilter,
      errors,
    );
  } else if (existingDimensionFilter) {
    dimensionFilter = existingDimensionFilter;
  }

  // Build metric filters
  if (parseResult.metricFilters.length > 0) {
    metricFilter = buildMetricFilter(parseResult.metricFilters, errors);
  }

  return {
    dimensionFilter,
    metricFilter,
    errors,
  };
}

/**
 * Build GA4 dimension filter
 */
function buildDimensionFilter(
  filters: ParsedFilter[],
  existingFilter?: GA4FilterExpression,
  errors: string[] = [],
): GA4FilterExpression | undefined {
  const filterExpressions: GA4Filter[] = [];

  // Add existing filter if present
  if (existingFilter?.filter) {
    filterExpressions.push(existingFilter.filter);
  }

  // Convert parsed filters to GA4 filters
  for (const filter of filters) {
    const ga4Filter = createGA4DimensionFilter(filter, errors);
    if (ga4Filter) {
      filterExpressions.push(ga4Filter);
    }
  }

  if (filterExpressions.length === 0) {
    return undefined;
  }

  if (filterExpressions.length === 1) {
    return { filter: filterExpressions[0] };
  }

  // Multiple filters - combine with AND
  return {
    andGroup: {
      expressions: filterExpressions.map((filter) => ({ filter })),
    },
  };
}

/**
 * Build GA4 metric filter
 */
function buildMetricFilter(
  filters: ParsedFilter[],
  errors: string[] = [],
): GA4FilterExpression | undefined {
  const filterExpressions: GA4Filter[] = [];

  // Convert parsed filters to GA4 filters
  for (const filter of filters) {
    const ga4Filter = createGA4MetricFilter(filter, errors);
    if (ga4Filter) {
      filterExpressions.push(ga4Filter);
    }
  }

  if (filterExpressions.length === 0) {
    return undefined;
  }

  if (filterExpressions.length === 1) {
    return { filter: filterExpressions[0] };
  }

  // Multiple filters - combine with AND
  return {
    andGroup: {
      expressions: filterExpressions.map((filter) => ({ filter })),
    },
  };
}

/**
 * Create GA4 dimension filter from parsed filter
 */
function createGA4DimensionFilter(
  filter: ParsedFilter,
  errors: string[],
): GA4Filter | null {
  // Remove dimension_ prefix to get GA4 field name
  const fieldName = filter.columnName.replace("dimension_", "");

  // Only support string filters with EXACT match for now
  if (typeof filter.value !== "string") {
    errors.push(
      `Dimension filter value must be a string, got: ${typeof filter.value}`,
    );
    return null;
  }

  return {
    fieldName,
    stringFilter: {
      value: String(filter.value),
      matchType: "EXACT" as const,
    },
  };
}

/**
 * Create GA4 metric filter from parsed filter
 */
function createGA4MetricFilter(
  filter: ParsedFilter,
  errors: string[],
): GA4Filter | null {
  // Remove metric_ prefix to get GA4 field name
  const fieldName = filter.columnName.replace("metric_", "");

  // Convert value to number for metric filters
  const numericValue = Number(filter.value);
  if (isNaN(numericValue)) {
    errors.push(`Metric filter value must be numeric, got: ${filter.value}`);
    return null;
  }

  return {
    fieldName,
    numericFilter: {
      operation: "EQUAL" as const,
      value: {
        doubleValue: numericValue,
      },
    },
  };
}
