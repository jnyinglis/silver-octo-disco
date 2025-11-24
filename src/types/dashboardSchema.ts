import type { DashboardFilters } from './dashboard';
import type { SemanticIntrospection } from '@/metricforge/engine';

export type TileType = 'kpi' | 'table' | 'line' | 'bar' | 'combo' | 'text' | 'comparison';

export interface QueryBinding {
  fact?: string;
  metrics: string[];
  dimensions?: string[];
  where?: Record<string, unknown>;
  transforms?: string[];
  limit?: number;
  sort?: { field: string; direction: 'asc' | 'desc' }[];
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
  query: QueryBinding;
  layout?: { colSpan?: number; rowSpan?: number; minH?: number };
  refreshSeconds?: number;
  roles?: string[];
  interactions?: TileInteraction[];
}

export interface DashboardConfig {
  id: string;
  title: string;
  version: string;
  status: 'draft' | 'published';
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

  if (!config.id) errors.push('Dashboard config requires an id.');
  if (!config.title) errors.push('Dashboard config requires a title.');
  if (!config.version) errors.push('Dashboard config requires a version.');

  config.tiles.forEach((tile) => {
    if (tileIds.has(tile.id)) errors.push(`Duplicate tile id: ${tile.id}`);
    tileIds.add(tile.id);

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
