import {
  SemanticEngine,
  InMemoryDb,
  QuerySpec,
  Row,
  f,
  aggregateMetric,
  buildMetricFromExpr,
  Expr,
} from 'metricforge/src/semanticEngine';
import { dashboardSchema } from './schema';
import type { MiniDatabase, DashboardFilters } from '@/types/dashboard';

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

  // Register all metrics programmatically for better control

  // Total enrollments count - use count(*) pattern for row counting
  engine.registerMetric(
    buildMetricFromExpr({
      name: 'total_enrollments',
      baseFact: 'fact_enrollments',
      expr: Expr.count('*'),
    })
  );

  // Score metrics - use numeric attributes
  engine.registerMetric(
    aggregateMetric('total_score', 'fact_enrollments', 'score', 'sum')
  );

  engine.registerMetric(
    aggregateMetric('avg_score', 'fact_enrollments', 'score', 'avg')
  );

  // Hours metrics
  engine.registerMetric(
    aggregateMetric('total_hours_spent', 'fact_enrollments', 'hoursSpent', 'sum')
  );

  // Total planned hours - this sums courseHours from the joined course dimension
  engine.registerMetric(
    aggregateMetric('total_planned_hours', 'fact_enrollments', 'courseHours', 'sum')
  );

  // Hour utilization (derived)
  engine.registerMetric(
    buildMetricFromExpr({
      name: 'hour_utilization',
      baseFact: 'fact_enrollments',
      expr: Expr.div(Expr.metric('total_hours_spent'), Expr.metric('total_planned_hours')),
    })
  );

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
  QuerySpec,
  Row,
  f,
  Expr,
  aggregateMetric,
  buildMetricFromExpr,
};

export type { InMemoryDb };
