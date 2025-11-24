/**
 * AST Extractor Utility
 *
 * Extracts and transforms MetricForge AST structures into
 * renderable tree nodes for visualization.
 */

import type { QueryBinding } from '@/types/dashboardSchema';
import type { MetricDefinition } from '@/metricforge/engine';
import { semanticMetricCatalog, semanticDimensionCatalog } from '@/metricforge';

/**
 * Node types in the logical plan AST
 */
export type PlanNodeType =
  | 'query'
  | 'scan'
  | 'filter'
  | 'join'
  | 'aggregate'
  | 'project'
  | 'sort'
  | 'limit'
  | 'metric'
  | 'dimension'
  | 'literal'
  | 'attr_ref'
  | 'metric_ref'
  | 'call'
  | 'binary_op'
  | 'window'
  | 'transform';

/**
 * A node in the logical plan visualization tree
 */
export interface PlanNode {
  id: string;
  type: PlanNodeType;
  label: string;
  description?: string;
  metadata?: Record<string, unknown>;
  children: PlanNode[];
  collapsed?: boolean;
}

/**
 * Mapping of node types to display colors
 */
export const nodeTypeColors: Record<PlanNodeType, string> = {
  query: '#1e40af',      // blue-800
  scan: '#166534',       // green-800
  filter: '#9a3412',     // orange-800
  join: '#7c2d12',       // orange-900
  aggregate: '#6b21a8',  // purple-800
  project: '#0369a1',    // sky-700
  sort: '#0f766e',       // teal-700
  limit: '#475569',      // slate-600
  metric: '#7c3aed',     // violet-600
  dimension: '#0891b2',  // cyan-600
  literal: '#64748b',    // slate-500
  attr_ref: '#0d9488',   // teal-600
  metric_ref: '#8b5cf6', // violet-500
  call: '#c026d3',       // fuchsia-600
  binary_op: '#ea580c',  // orange-600
  window: '#2563eb',     // blue-600
  transform: '#dc2626',  // red-600
};

/**
 * Mapping of node types to icons (using unicode symbols)
 */
export const nodeTypeIcons: Record<PlanNodeType, string> = {
  query: '?',
  scan: '⊞',
  filter: '⧫',
  join: '⋈',
  aggregate: 'Σ',
  project: 'π',
  sort: '↕',
  limit: '⊤',
  metric: 'μ',
  dimension: '◈',
  literal: '#',
  attr_ref: '@',
  metric_ref: '→',
  call: 'ƒ',
  binary_op: '⊕',
  window: '▭',
  transform: '⟳',
};

let nodeIdCounter = 0;

function generateNodeId(): string {
  return `node_${++nodeIdCounter}`;
}

/**
 * Reset the node ID counter (useful for testing)
 */
export function resetNodeIdCounter(): void {
  nodeIdCounter = 0;
}

/**
 * Build a logical plan tree from a QueryBinding configuration
 */
export function buildLogicalPlan(query: QueryBinding): PlanNode {
  resetNodeIdCounter();
  const children: PlanNode[] = [];

  // 1. Scan node - represents reading from the fact table
  const factTable = query.fact ?? 'fact_enrollments';
  const scanNode: PlanNode = {
    id: generateNodeId(),
    type: 'scan',
    label: `Scan: ${factTable}`,
    description: `Read all rows from ${factTable}`,
    metadata: { table: factTable },
    children: [],
  };

  // 2. Join nodes - dimension lookups
  const dimensions = query.dimensions ?? [];
  const joinNodes: PlanNode[] = [];
  const dimensionTables = new Set<string>();

  dimensions.forEach((dim) => {
    const dimDef = semanticDimensionCatalog.find((d) => d.name === dim);
    if (dimDef && dimDef.table !== factTable && !dimensionTables.has(dimDef.table)) {
      dimensionTables.add(dimDef.table);
      joinNodes.push({
        id: generateNodeId(),
        type: 'join',
        label: `Join: ${dimDef.table}`,
        description: `Lookup dimension attributes from ${dimDef.table}`,
        metadata: { table: dimDef.table, dimension: dim },
        children: [],
      });
    }
  });

  // 3. Filter node - WHERE conditions
  let filterNode: PlanNode | null = null;
  if (query.where && Object.keys(query.where).length > 0) {
    const conditions = Object.entries(query.where)
      .map(([key, value]) => `${key} = ${JSON.stringify(value)}`)
      .join(' AND ');
    filterNode = {
      id: generateNodeId(),
      type: 'filter',
      label: 'Filter',
      description: conditions,
      metadata: { conditions: query.where },
      children: [],
    };
  }

  // 4. Aggregate node - with metric expressions
  const metricNodes: PlanNode[] = query.metrics.map((metricName) => {
    const metricDef = semanticMetricCatalog.find((m) => m.name === metricName);
    return buildMetricExpressionTree(metricName, metricDef);
  });

  const dimensionNodes: PlanNode[] = dimensions.map((dim) => ({
    id: generateNodeId(),
    type: 'dimension',
    label: dim,
    description: `Group by ${dim}`,
    children: [],
  }));

  const aggregateNode: PlanNode = {
    id: generateNodeId(),
    type: 'aggregate',
    label: 'Aggregate',
    description: dimensions.length > 0
      ? `Group by: ${dimensions.join(', ')}`
      : 'Grand total (no grouping)',
    metadata: { dimensions, metrics: query.metrics },
    children: [...dimensionNodes, ...metricNodes],
  };

  // 5. Transform nodes - context transforms like YTD, lastYear
  const transformNodes: PlanNode[] = (query.transforms ?? []).map((t) => ({
    id: generateNodeId(),
    type: 'transform',
    label: `Transform: ${t}`,
    description: getTransformDescription(t),
    metadata: { transform: t },
    children: [],
  }));

  // 6. Sort node
  let sortNode: PlanNode | null = null;
  if (query.sort && query.sort.length > 0) {
    const sortDesc = query.sort
      .map((s) => `${s.field} ${s.direction.toUpperCase()}`)
      .join(', ');
    sortNode = {
      id: generateNodeId(),
      type: 'sort',
      label: 'Sort',
      description: sortDesc,
      metadata: { sort: query.sort },
      children: [],
    };
  }

  // 7. Limit node
  let limitNode: PlanNode | null = null;
  if (query.limit !== undefined) {
    limitNode = {
      id: generateNodeId(),
      type: 'limit',
      label: `Limit: ${query.limit}`,
      description: `Return at most ${query.limit} rows`,
      metadata: { limit: query.limit },
      children: [],
    };
  }

  // 8. Project node - final output columns
  const outputColumns = [...dimensions, ...query.metrics];
  const projectNode: PlanNode = {
    id: generateNodeId(),
    type: 'project',
    label: 'Project',
    description: `Output: ${outputColumns.join(', ')}`,
    metadata: { columns: outputColumns },
    children: [],
  };

  // Build the tree bottom-up (execution order)
  // Scan → Joins → Filter → Aggregate → Transforms → Sort → Limit → Project
  children.push(scanNode);
  children.push(...joinNodes);
  if (filterNode) children.push(filterNode);
  children.push(aggregateNode);
  children.push(...transformNodes);
  if (sortNode) children.push(sortNode);
  if (limitNode) children.push(limitNode);
  children.push(projectNode);

  // Root query node
  return {
    id: generateNodeId(),
    type: 'query',
    label: 'Query Plan',
    description: `Compute ${query.metrics.length} metric(s) with ${dimensions.length} dimension(s)`,
    metadata: {
      metrics: query.metrics,
      dimensions,
      hasFilter: !!filterNode,
      hasSort: !!sortNode,
      hasLimit: !!limitNode,
    },
    children,
  };
}

/**
 * Build a tree representation of a metric's expression
 */
function buildMetricExpressionTree(
  metricName: string,
  metricDef: MetricDefinition | undefined
): PlanNode {
  if (!metricDef) {
    return {
      id: generateNodeId(),
      type: 'metric',
      label: metricName,
      description: 'Unknown metric',
      children: [],
    };
  }

  const children: PlanNode[] = [];

  switch (metricDef.kind) {
    case 'count':
      children.push({
        id: generateNodeId(),
        type: 'call',
        label: 'count(*)',
        description: 'Count all rows',
        metadata: { function: 'count', argument: '*' },
        children: [],
      });
      break;

    case 'sum':
    case 'avg':
      if (metricDef.sourceAttribute) {
        children.push({
          id: generateNodeId(),
          type: 'call',
          label: `${metricDef.kind}(${metricDef.sourceAttribute})`,
          description: `${metricDef.kind.toUpperCase()} aggregation`,
          metadata: { function: metricDef.kind, attribute: metricDef.sourceAttribute },
          children: [
            {
              id: generateNodeId(),
              type: 'attr_ref',
              label: metricDef.sourceAttribute,
              description: `Reference to attribute: ${metricDef.sourceAttribute}`,
              children: [],
            },
          ],
        });
      }
      break;

    case 'expression':
      // For derived metrics, we show a simplified representation
      // The actual expression is built dynamically via buildExpr()
      children.push({
        id: generateNodeId(),
        type: 'binary_op',
        label: 'Derived Expression',
        description: metricDef.description,
        children: parseExpressionPlaceholders(metricDef),
      });
      break;
  }

  return {
    id: generateNodeId(),
    type: 'metric',
    label: metricName,
    description: metricDef.description,
    metadata: {
      kind: metricDef.kind,
      baseFact: metricDef.baseFact,
      format: metricDef.format,
    },
    children,
  };
}

/**
 * Parse expression placeholders for derived metrics
 * This creates a simplified representation based on known patterns
 */
function parseExpressionPlaceholders(metricDef: MetricDefinition): PlanNode[] {
  // For hour_utilization, we know it's total_hours_spent / total_planned_hours
  if (metricDef.name === 'hour_utilization') {
    return [
      {
        id: generateNodeId(),
        type: 'binary_op',
        label: '/',
        description: 'Division',
        children: [
          {
            id: generateNodeId(),
            type: 'metric_ref',
            label: 'total_hours_spent',
            description: 'Reference to metric',
            children: [],
          },
          {
            id: generateNodeId(),
            type: 'metric_ref',
            label: 'total_planned_hours',
            description: 'Reference to metric',
            children: [],
          },
        ],
      },
    ];
  }

  // Generic placeholder for other expressions
  return [
    {
      id: generateNodeId(),
      type: 'call',
      label: 'Expression',
      description: 'Computed expression',
      children: [],
    },
  ];
}

/**
 * Get human-readable description for a context transform
 */
function getTransformDescription(transform: string): string {
  const descriptions: Record<string, string> = {
    ytd: 'Year-to-date: Filter to current calendar year',
    lastYear: 'Same period in previous year for comparison',
    rolling30d: 'Rolling 30-day window',
    rolling7d: 'Rolling 7-day window',
    mtd: 'Month-to-date: Filter to current calendar month',
    qtd: 'Quarter-to-date: Filter to current calendar quarter',
  };
  return descriptions[transform] ?? `Apply ${transform} transform`;
}

/**
 * Flatten a plan tree into a list of nodes (for searching/filtering)
 */
export function flattenPlanTree(node: PlanNode): PlanNode[] {
  const result: PlanNode[] = [node];
  for (const child of node.children) {
    result.push(...flattenPlanTree(child));
  }
  return result;
}

/**
 * Count total nodes in a plan tree
 */
export function countPlanNodes(node: PlanNode): number {
  return flattenPlanTree(node).length;
}

/**
 * Get a summary of the logical plan
 */
export function getPlanSummary(plan: PlanNode): {
  totalNodes: number;
  hasFilters: boolean;
  hasJoins: boolean;
  hasTransforms: boolean;
  metricCount: number;
  dimensionCount: number;
} {
  const allNodes = flattenPlanTree(plan);
  return {
    totalNodes: allNodes.length,
    hasFilters: allNodes.some((n) => n.type === 'filter'),
    hasJoins: allNodes.some((n) => n.type === 'join'),
    hasTransforms: allNodes.some((n) => n.type === 'transform'),
    metricCount: allNodes.filter((n) => n.type === 'metric').length,
    dimensionCount: allNodes.filter((n) => n.type === 'dimension').length,
  };
}
