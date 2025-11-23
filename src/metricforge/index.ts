/**
 * MetricForge integration module for the dashboard.
 *
 * This module provides the semantic metrics layer that replaces
 * direct LINQ usage with a grain-agnostic metrics engine.
 */

export { dashboardSchema } from './schema';
export {
  createDashboardEngine,
  toInMemoryDb,
  toFilterContext,
  buildQuery,
  runQuery,
  SemanticEngine,
  f,
  Expr,
  aggregateMetric,
  buildMetricFromExpr,
} from './engine';

export type { QuerySpec, Row, InMemoryDb } from './engine';
