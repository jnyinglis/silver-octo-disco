import type { DashboardConfig, TileConfig, TileType } from '@/types/dashboardSchema';
import type { SemanticIntrospection } from '@/metricforge/engine';
import { introspectSemanticModel } from '@/metricforge';

export interface CardTemplate {
  type: TileType;
  label: string;
  recommendedMetrics: string[];
  recommendedDimensions: string[];
  defaultLimit?: number;
}

export const DEFAULT_TRANSFORMS = ['ytd', 'lastYear', 'rolling30d'];

export function buildCardPalette(introspection: SemanticIntrospection = introspectSemanticModel()): CardTemplate[] {
  const timeDimensions = introspection.dimensions
    .map((d) => d.name)
    .filter((name) => name.toLowerCase().includes('date') || name.toLowerCase().includes('at'));

  return [
    {
      type: 'kpi',
      label: 'KPI',
      recommendedMetrics: ['total_enrollments', 'avg_score'],
      recommendedDimensions: [],
    },
    {
      type: 'table',
      label: 'Detail table',
      recommendedMetrics: ['total_enrollments', 'avg_score'],
      recommendedDimensions: ['department', 'category', 'status'],
      defaultLimit: 50,
    },
    {
      type: 'line',
      label: 'Trend',
      recommendedMetrics: ['total_enrollments', 'hour_utilization'],
      recommendedDimensions: timeDimensions,
    },
    {
      type: 'bar',
      label: 'Breakdown',
      recommendedMetrics: ['total_enrollments'],
      recommendedDimensions: ['department', 'category', 'difficulty'],
    },
  ];
}

export function suggestBindings(
  template: CardTemplate,
  introspection: SemanticIntrospection = introspectSemanticModel()
): Partial<TileConfig> {
  const metric = template.recommendedMetrics.find((m) =>
    introspection.metrics.some((metric) => metric.name === m)
  );

  const dimension = template.recommendedDimensions.find((dim) =>
    introspection.dimensions.some((d) => d.name === dim)
  );

  const query = {
    metrics: metric ? [metric] : [],
    dimensions: dimension ? [dimension] : undefined,
    transforms: dimension && template.type === 'line' ? DEFAULT_TRANSFORMS.slice(0, 1) : undefined,
    limit: template.defaultLimit,
  } as TileConfig['query'];

  return {
    type: template.type,
    query,
  };
}

export function hydrateDraftDashboard(
  draft: DashboardConfig,
  palette: CardTemplate[] = buildCardPalette()
): DashboardConfig {
  const tiles = draft.tiles.map((tile) => {
    const template = palette.find((item) => item.type === tile.type);
    if (!template) return tile;
    const suggested = suggestBindings(template);
    const mergedQuery = {
      metrics: tile.query.metrics?.length
        ? tile.query.metrics
        : suggested.query?.metrics ?? [],
      dimensions: tile.query.dimensions?.length
        ? tile.query.dimensions
        : suggested.query?.dimensions,
      transforms: tile.query.transforms ?? suggested.query?.transforms,
      where: tile.query.where ?? suggested.query?.where,
      sort: tile.query.sort ?? suggested.query?.sort,
      limit: tile.query.limit ?? suggested.query?.limit,
    } satisfies TileConfig['query'];
    return {
      ...suggested,
      ...tile,
      query: mergedQuery,
      layout: tile.layout ?? { colSpan: 4, rowSpan: 3, minH: 2 },
    } as TileConfig;
  });

  return { ...draft, tiles };
}
