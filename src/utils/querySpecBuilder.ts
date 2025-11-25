import type { DSLQueryConfig, QueryBinding } from '@/types/dashboardSchema';
import type { QuerySpec } from '@/metricforge';
import { mergeFilterParameters } from './dslBuilder';

export interface QueryBuildResult {
  spec: QuerySpec;
  limit?: number;
}

export function buildBuilderQuery(
  query: QueryBinding | undefined,
  appliedFilters: string[] | undefined,
  globalFilters: Record<string, unknown>
): QueryBuildResult | null {
  if (!query || !query.metrics.length) {
    return null;
  }

  const mergedWhere = { ...(query.where ?? {}) } as Record<string, unknown>;

  if (appliedFilters) {
    appliedFilters.forEach((filterKey) => {
      const filterValue = globalFilters[filterKey];
      if (filterValue && filterValue !== 'all' && filterValue !== '') {
        mergedWhere[filterKey] = filterValue;
      }
    });
  }

  const spec: QuerySpec = {
    metrics: query.metrics,
    dimensions: query.dimensions,
  };

  if (Object.keys(mergedWhere).length > 0) {
    spec.where = mergedWhere;
  }

  return { spec, limit: query.limit };
}

export function buildDSLQuery(
  config: DSLQueryConfig | undefined,
  appliedFilters: string[] | undefined,
  globalFilters: Record<string, unknown>
): QueryBuildResult | null {
  if (!config || !config.queryString) return null;

  const params = mergeFilterParameters(config.parameters, appliedFilters, globalFilters);
  const source = substituteParams(config.queryString, params);

  const metrics = extractList(source, 'metrics');
  if (!metrics.length) return null;

  const dimensions = extractList(source, 'dimensions');
  const where = parseWhereClause(extractSection(source, 'where'));
  const limit = parseLimit(source);

  const spec: QuerySpec = {
    metrics,
    dimensions,
  };

  if (Object.keys(where).length > 0) {
    spec.where = where;
  }

  return { spec, limit };
}

function substituteParams(text: string, params: Record<string, unknown>): string {
  return text.replace(/:([a-zA-Z0-9_]+)/g, (match, key) => {
    const value = params[key];
    if (value === undefined) return match;
    if (typeof value === 'string') return `"${value}"`;
    return String(value);
  });
}

function extractList(text: string, label: string): string[] {
  const match = text.match(new RegExp(`${label}\s*:\\s*([^\n]+)`, 'i'));
  if (!match) return [];
  return match[1]
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function extractSection(text: string, label: string): string | undefined {
  const match = text.match(new RegExp(`${label}\s*:\\s*([^\n]+)`, 'i'));
  return match ? match[1].trim() : undefined;
}

function parseWhereClause(whereText: string | undefined): Record<string, unknown> {
  if (!whereText) return {};

  const conditions = whereText.split(/\band\b|&&/i);
  const where: Record<string, unknown> = {};

  conditions.forEach((cond) => {
    const [rawKey, rawValue] = cond.split(/==|=/);
    if (!rawKey || rawValue === undefined) return;

    const key = rawKey.trim();
    const valueText = rawValue.trim().replace(/^\"|\"$/g, '').replace(/^'|'$/g, '');

    const numericValue = Number(valueText);
    where[key] = Number.isNaN(numericValue) ? valueText : numericValue;
  });

  return where;
}

function parseLimit(text: string): number | undefined {
  const match = text.match(/limit\s*:\s*(\d+)/i);
  if (!match) return undefined;
  return Number.parseInt(match[1], 10);
}
