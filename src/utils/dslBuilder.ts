import type { DashboardConfig, CustomMetricDefinition, DSLQueryConfig } from '@/types/dashboardSchema';

/**
 * Build a complete DSL file from dashboard configuration.
 * Includes custom metric declarations and named queries.
 */
export function buildDashboardDSL(dashboard: DashboardConfig): string {
  const parts: string[] = [];

  // Add custom metric declarations
  if (dashboard.customMetrics && dashboard.customMetrics.length > 0) {
    const metricDecls = dashboard.customMetrics
      .map((m) => buildMetricDeclaration(m))
      .join('\n\n');
    parts.push(metricDecls);
  }

  // Add named queries
  if (dashboard.namedQueries && Object.keys(dashboard.namedQueries).length > 0) {
    const queries = Object.values(dashboard.namedQueries).join('\n\n');
    parts.push(queries);
  }

  return parts.join('\n\n');
}

/**
 * Build a metric declaration from CustomMetricDefinition.
 * Format: metric <name> on <baseFact> [where <filter>] = <expr>
 */
export function buildMetricDeclaration(metric: CustomMetricDefinition): string {
  const whereClause = metric.metricFilter ? ` where ${metric.metricFilter}` : '';
  return `metric ${metric.name} on ${metric.baseFact}${whereClause} = ${metric.dsl}`;
}

/**
 * Build a query block for a tile.
 * Auto-wraps the query body in "query <name> { ... }"
 */
export function buildTileQuery(tileId: string, config: DSLQueryConfig): string {
  // If using named query, just return the reference (handled elsewhere)
  if (config.namedQuery) {
    return config.namedQuery;
  }

  // Wrap inline query string
  const queryName = `tile_${tileId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  return `query ${queryName} {\n${indentLines(config.queryString)}\n}`;
}

/**
 * Indent each line of a string by 2 spaces.
 */
function indentLines(text: string): string {
  return text
    .split('\n')
    .map((line) => (line.trim() ? `  ${line}` : line))
    .join('\n');
}

/**
 * Format a where clause object into DSL syntax.
 * Example: { status: 'completed', year: 2024 } => "status == 'completed' and year == 2024"
 */
export function formatWhereClause(where: Record<string, unknown>): string {
  return Object.entries(where)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key} == "${value}"`;
      }
      return `${key} == ${value}`;
    })
    .join(' and ');
}

/**
 * Merge global filters into DSL parameters.
 * Used at runtime to inject filter values.
 */
export function mergeFilterParameters(
  tileParams: Record<string, unknown> | undefined,
  appliedFilters: string[] | undefined,
  globalFilters: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...tileParams };

  appliedFilters?.forEach((filterKey) => {
    if (globalFilters[filterKey] !== undefined && globalFilters[filterKey] !== 'all') {
      // Only merge if not already explicitly set
      if (merged[filterKey] === undefined) {
        merged[filterKey] = globalFilters[filterKey];
      }
    }
  });

  return merged;
}
