import {
  SemanticEngine,
  f,
  aggregateMetric,
  buildMetricFromExpr,
  Expr,
} from 'metricforge/src/semanticEngine';
import type {
  InMemoryDb,
  QuerySpec,
  Row,
} from 'metricforge/src/semanticEngine';
import { dashboardSchema } from './schema';
import type { MiniDatabase, DashboardFilters } from '@/types/dashboard';

export interface MetricDefinition {
  name: string;
  label: string;
  description: string;
  baseFact: string;
  format?: 'integer' | 'hours' | 'percentage' | 'score' | 'ratio';
  kind: 'count' | 'sum' | 'avg' | 'expression';
  sourceAttribute?: string;
  buildExpr?: () => ReturnType<typeof Expr.metric> | ReturnType<typeof Expr.div>;
}

export interface DimensionDefinition {
  name: string;
  label: string;
  table: string;
}

export interface SemanticIntrospection {
  metrics: MetricDefinition[];
  dimensions: DimensionDefinition[];
  facts: string[];
  attributes: string[];
  contextTransforms: string[];
}

const metricDefinitions: MetricDefinition[] = [
  {
    name: 'total_enrollments',
    label: 'Total enrollments',
    description: 'Count of enrollment rows across the fact table.',
    baseFact: 'fact_enrollments',
    kind: 'count',
    format: 'integer',
  },
  {
    name: 'total_score',
    label: 'Total score',
    description: 'Sum of learner scores.',
    baseFact: 'fact_enrollments',
    kind: 'sum',
    sourceAttribute: 'score',
    format: 'integer',
  },
  {
    name: 'avg_score',
    label: 'Average score',
    description: 'Average assessment score across enrollments.',
    baseFact: 'fact_enrollments',
    kind: 'avg',
    sourceAttribute: 'score',
    format: 'score',
  },
  {
    name: 'total_hours_spent',
    label: 'Hours spent',
    description: 'Total time spent on courses by learners.',
    baseFact: 'fact_enrollments',
    kind: 'sum',
    sourceAttribute: 'hoursSpent',
    format: 'hours',
  },
  {
    name: 'total_planned_hours',
    label: 'Planned hours',
    description: 'Sum of planned course duration for enrollments.',
    baseFact: 'fact_enrollments',
    kind: 'sum',
    sourceAttribute: 'courseHours',
    format: 'hours',
  },
  {
    name: 'hour_utilization',
    label: 'Hour utilization',
    description: 'Ratio of actual hours spent vs planned.',
    baseFact: 'fact_enrollments',
    kind: 'expression',
    buildExpr: () => Expr.div(Expr.metric('total_hours_spent'), Expr.metric('total_planned_hours')),
    format: 'ratio',
  },
];

const toTitleCase = (value: string): string =>
  value
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[a-z]/, (m) => m.toUpperCase());

const dimensionDefinitions: DimensionDefinition[] = Object.keys(dashboardSchema.attributes).map(
  (attribute) => ({
    name: attribute,
    label: toTitleCase(attribute),
    table: dashboardSchema.attributes[attribute]?.table ?? 'unknown',
  })
);

/**
 * Convert the dashboard's MiniDatabase format to MetricForge's InMemoryDb format.
 * Maps the domain tables to the semantic layer naming convention.
 */
export function toInMemoryDb(data: MiniDatabase): InMemoryDb {
  return {
    tables: {
      fact_enrollments: data.enrollments,
      dim_users: data.users,
      dim_courses: data.courses,
      dim_proctors: data.proctors,
    },
  };
}

/**
 * Create a SemanticEngine instance configured for the dashboard.
 * This is the main entry point for metric evaluation.
 */
export function createDashboardEngine(data: MiniDatabase): SemanticEngine {
  const db = toInMemoryDb(data);

  const engine = SemanticEngine.fromSchema(dashboardSchema, db);

  metricDefinitions.forEach((definition) => registerMetric(engine, definition));

  return engine;
}

/**
 * Convert dashboard filters to MetricForge filter context.
 */
export function toFilterContext(filters: DashboardFilters): Record<string, any> | undefined {
  const filterObj: Record<string, any> = {};

  if (filters.status && filters.status !== 'all') {
    filterObj.status = filters.status;
  }

  if (filters.department) {
    filterObj.department = filters.department;
  }

  if (filters.courseCategory) {
    filterObj.category = filters.courseCategory;
  }

  // Search filter requires special handling - not directly supported
  // We'll handle this separately in queries

  return Object.keys(filterObj).length > 0 ? filterObj : undefined;
}

/**
 * Build a QuerySpec from dimensions and metrics with optional filters.
 */
export function buildQuery(
  dimensions: string[],
  metrics: string[],
  filters?: DashboardFilters
): QuerySpec {
  const spec: QuerySpec = {
    dimensions,
    metrics,
  };

  if (filters) {
    const filterCtx = toFilterContext(filters);
    if (filterCtx) {
      spec.where = filterCtx;
    }
  }

  return spec;
}

/**
 * Helper to run a query and return typed results.
 */
export function runQuery<T extends Row = Row>(
  engine: SemanticEngine,
  spec: QuerySpec
): T[] {
  return engine.runQuery(spec) as T[];
}

/**
 * Re-export commonly used types and utilities from MetricForge.
 */
export {
  SemanticEngine,
  f,
  Expr,
  aggregateMetric,
  buildMetricFromExpr,
};

export type { InMemoryDb, QuerySpec, Row };

function registerMetric(engine: SemanticEngine, metric: MetricDefinition): void {
  if (metric.kind === 'count') {
    engine.registerMetric(
      buildMetricFromExpr({
        name: metric.name,
        baseFact: metric.baseFact,
        expr: Expr.count('*'),
      })
    );
    return;
  }

  if (metric.kind === 'sum' || metric.kind === 'avg') {
    if (!metric.sourceAttribute) {
      throw new Error(`Metric ${metric.name} is missing a sourceAttribute.`);
    }
    engine.registerMetric(
      aggregateMetric(
        metric.name,
        metric.baseFact,
        metric.sourceAttribute,
        metric.kind
      )
    );
    return;
  }

  if (metric.kind === 'expression') {
    engine.registerMetric(
      buildMetricFromExpr({
        name: metric.name,
        baseFact: metric.baseFact,
        expr: metric.buildExpr?.() ?? Expr.metric(metric.name),
      })
    );
  }
}

export function introspectSemanticModel(): SemanticIntrospection {
  return {
    metrics: metricDefinitions,
    dimensions: dimensionDefinitions,
    facts: Object.keys(dashboardSchema.facts),
    attributes: Object.keys(dashboardSchema.attributes),
    contextTransforms: ['ytd', 'lastYear', 'rolling30d'],
  };
}

export const semanticMetricCatalog = metricDefinitions;
export const semanticDimensionCatalog = dimensionDefinitions;
