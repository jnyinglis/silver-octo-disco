import type { DashboardFilters } from './dashboard';
import type { SemanticIntrospection } from '@/metricforge/engine';

export type TileType = 'kpi' | 'table' | 'line' | 'bar' | 'combo' | 'text' | 'comparison';

export type QueryMode = 'builder' | 'dsl';

export type MetricFormat = 'number' | 'percent' | 'hours' | 'score';

// Legacy query binding (visual builder)
export interface QueryBinding {
  fact?: string;
  metrics: string[];
  dimensions?: string[];
  where?: Record<string, unknown>;
  transforms?: string[];
  limit?: number;
  sort?: { field: string; direction: 'asc' | 'desc' }[];
}

// DSL query configuration
export interface DSLQueryConfig {
  queryString: string;              // Query body (auto-wrapped in "query { ... }")
  parameters?: Record<string, unknown>;  // Parameter bindings for :param placeholders
  namedQuery?: string;              // Reference to dashboard-level named query
}

// KPI display configuration (for two-KPI tiles)
export interface KPIDisplay {
  // Primary KPI
  primaryMetric: string;            // Metric name
  primaryLabel?: string;            // Display label (e.g., "Total completions")
  primaryFormat?: MetricFormat;     // Display format

  // Secondary KPI (trend/context)
  secondaryMetric?: string;
  secondaryLabel?: string;          // e.g., "active learners"
  secondaryFormat?: MetricFormat;
}

// Detail view configuration (drill-down)
export interface DetailViewConfig {
  mode: QueryMode;                  // 'builder' or 'dsl'

  // Visual builder
  builderConfig?: QueryBinding;

  // DSL query
  dslConfig?: DSLQueryConfig;

  // Display options
  columns?: string[];               // Which columns to show
  columnLabels?: Record<string, string>; // Custom column headers
  inheritFilters?: boolean;         // Inherit parent tile's appliedFilters (default: true)
}

export interface TileInteraction {
  sourceEvent: 'click' | 'select' | 'filter';
  targetTileIds: string[];
  dimension: string;
}

export interface TileConfig {
  id: string;
  title: string;
  type: TileType;

  // Query configuration - supports two modes
  queryMode?: QueryMode;            // Default: 'builder' for backward compatibility
  query?: QueryBinding;             // Legacy/builder mode (kept for backward compatibility)
  dslConfig?: DSLQueryConfig;       // DSL mode

  // KPI-specific display (only for type='kpi')
  kpiDisplay?: KPIDisplay;

  // Global filter references
  appliedFilters?: string[];        // e.g., ['department', 'status']

  // Detail drill-down
  detailView?: DetailViewConfig;

  // Layout and other configs
  layout?: { colSpan?: number; rowSpan?: number; minH?: number };
  refreshSeconds?: number;
  roles?: string[];
  interactions?: TileInteraction[];
}

// Custom metric definition (user-defined metrics)
export interface CustomMetricDefinition {
  name: string;
  label?: string;                   // Display name
  description?: string;             // Tooltip/help text
  baseFact: string;                 // Base fact table
  dsl: string;                      // Expression: 'sum(amount)' or 'metric_a / metric_b'
  metricFilter?: string;            // Optional where clause: 'status == "active"'
  format?: MetricFormat;
}

// Custom dimension definition (user-defined dimensions)
export interface CustomDimensionDefinition {
  name: string;
  label?: string;
  table: string;
  attribute?: string;               // Source attribute if derived
}

export interface DashboardConfig {
  id: string;
  title: string;
  version: string;
  status: 'draft' | 'published';

  // Custom semantic layer extensions
  customMetrics?: CustomMetricDefinition[];
  customDimensions?: CustomDimensionDefinition[];
  namedQueries?: Record<string, string>; // Query name -> DSL query block

  // Data and filters
  filters?: DashboardFilters;
  layout?: { columns?: number; gutter?: number };
  tiles: TileConfig[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const ensureArray = <T>(value: T | T[] | undefined): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

export function validateDashboardConfig(
  config: DashboardConfig,
  introspection: SemanticIntrospection
): ValidationResult {
  const errors: string[] = [];
  const tileIds = new Set<string>();
  const knownMetrics = new Set(introspection.metrics.map((metric) => metric.name));
  const knownDimensions = new Set(introspection.dimensions.map((dim) => dim.name));

  // Add custom metrics to known set
  config.customMetrics?.forEach((m) => knownMetrics.add(m.name));
  config.customDimensions?.forEach((d) => knownDimensions.add(d.name));

  if (!config.id) errors.push('Dashboard config requires an id.');
  if (!config.title) errors.push('Dashboard config requires a title.');
  if (!config.version) errors.push('Dashboard config requires a version.');

  config.tiles.forEach((tile) => {
    if (tileIds.has(tile.id)) errors.push(`Duplicate tile id: ${tile.id}`);
    tileIds.add(tile.id);

    // Determine query mode (default to 'builder' for backward compatibility)
    const queryMode = tile.queryMode ?? 'builder';

    // Validate builder mode
    if (queryMode === 'builder' && tile.query) {
      tile.query.metrics.forEach((metric) => {
        if (!knownMetrics.has(metric)) {
          errors.push(`Tile ${tile.id} references unknown metric: ${metric}`);
        }
      });

      ensureArray(tile.query.dimensions).forEach((dimension) => {
        if (!knownDimensions.has(dimension)) {
          errors.push(`Tile ${tile.id} references unknown dimension: ${dimension}`);
        }
      });
    }

    // Validate DSL mode
    if (queryMode === 'dsl') {
      if (!tile.dslConfig?.queryString && !tile.dslConfig?.namedQuery) {
        errors.push(`Tile ${tile.id} uses DSL mode but has no queryString or namedQuery`);
      }
      if (tile.dslConfig?.namedQuery && !config.namedQueries?.[tile.dslConfig.namedQuery]) {
        errors.push(
          `Tile ${tile.id} references unknown named query: ${tile.dslConfig.namedQuery}`
        );
      }
    }

    // Validate KPI display
    if (tile.type === 'kpi' && tile.kpiDisplay) {
      // primaryMetric is optional if there's at least one metric in query.metrics to fall back to
      if (!tile.kpiDisplay.primaryMetric && (!tile.query?.metrics || tile.query.metrics.length === 0)) {
        errors.push(`Tile ${tile.id} is a KPI tile but has no primaryMetric configured and no metrics in query`);
      }
    }

    // Validate interactions
    ensureArray(tile.interactions).forEach((interaction) => {
      interaction.targetTileIds.forEach((target) => {
        if (target === tile.id) {
          errors.push(`Tile ${tile.id} should not target itself for interactions.`);
        }
      });
      if (!knownDimensions.has(interaction.dimension)) {
        errors.push(
          `Tile ${tile.id} interaction uses unknown dimension: ${interaction.dimension}`
        );
      }
    });
  });

  // Validate interaction target IDs exist
  config.tiles.forEach((tile) => {
    ensureArray(tile.interactions).forEach((interaction) => {
      interaction.targetTileIds.forEach((target) => {
        if (!tileIds.has(target)) {
          errors.push(`Interaction references missing tile id: ${target}`);
        }
      });
    });
  });

  return { valid: errors.length === 0, errors };
}
