# MetricForge Integration Technical Documentation

This document provides a comprehensive technical overview of the MetricForge semantic metrics engine integration in the Dashboard POC.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Semantic Model](#semantic-model)
4. [Metrics Engine](#metrics-engine)
5. [Query Execution](#query-execution)
6. [Dashboard Integration](#dashboard-integration)
7. [Migration from LINQ](#migration-from-linq)
8. [API Reference](#api-reference)
9. [Examples](#examples)

---

## Overview

### What is MetricForge?

MetricForge is a **grain-agnostic semantic metrics engine** built in TypeScript. It provides a declarative layer for defining and computing metrics over relational data without hard-coding aggregation granularity into metric definitions.

### Key Benefits

| Feature | Description |
|---------|-------------|
| **Grain-Agnostic Metrics** | Metrics work at any aggregation level—the query defines the grain, not the metric |
| **Automatic Joins** | The engine handles fact-to-dimension joins automatically based on schema definitions |
| **Declarative Definitions** | Metrics are defined using expression builders or DSL syntax |
| **Filter Propagation** | Filters are automatically applied across facts and dimensions |
| **Type Safety** | Full TypeScript support with exported types |

### Why MetricForge over Direct LINQ?

The previous implementation used LINQ directly for each query, requiring:
- Manual join logic in every query
- Repeated filter application code
- Hardcoded aggregation patterns
- No separation between metric definitions and query execution

MetricForge provides:
- Centralized metric definitions
- Reusable query patterns
- Semantic layer abstraction
- Consistent aggregation behavior

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Dashboard UI                             │
│                      (Vue Components)                            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Card Configs                              │
│              (summaryQuery / detailQuery)                        │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      QueryContext                                │
│         { data, filters, lookups, engine }                       │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MetricForge Engine                            │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Schema     │  │   Metrics    │  │   Query Executor     │   │
│  │  (Facts,     │  │  (Registered │  │  (runQuery,          │   │
│  │  Dimensions, │  │   via Expr   │  │   filter, group,     │   │
│  │  Joins)      │  │   builders)  │  │   aggregate)         │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      InMemoryDb                                  │
│           { fact_enrollments, dim_users, ... }                   │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/
├── metricforge/
│   ├── index.ts          # Public API exports
│   ├── engine.ts         # Engine factory and utilities
│   └── schema.ts         # Semantic schema definitions
├── config/
│   └── cardConfigs.ts    # Dashboard card configurations (uses engine)
├── types/
│   └── dashboard.ts      # TypeScript types (includes QueryContext)
└── utils/
    └── linqHelpers.ts    # Context creation and formatters
```

---

## Semantic Model

### Schema Definition

The semantic schema (`src/metricforge/schema.ts`) defines the logical structure of the data:

```typescript
export const dashboardSchema: Schema = {
  facts: {
    fact_enrollments: { table: 'fact_enrollments' },
  },
  dimensions: {
    dim_users: { table: 'dim_users' },
    dim_courses: { table: 'dim_courses' },
    dim_proctors: { table: 'dim_proctors' },
  },
  attributes,
  joins: [
    { fact: 'fact_enrollments', dimension: 'dim_users',
      factKey: 'userId', dimensionKey: 'id' },
    { fact: 'fact_enrollments', dimension: 'dim_courses',
      factKey: 'courseId', dimensionKey: 'id' },
    { fact: 'fact_enrollments', dimension: 'dim_proctors',
      factKey: 'proctorId', dimensionKey: 'id' },
  ],
};
```

### Logical Attributes

Attributes map semantic names to physical table/column locations:

```typescript
const attributes: Record<string, LogicalAttribute> = {
  // Fact attributes (enrollments)
  enrollmentId: { table: 'fact_enrollments', column: 'id' },
  userId: { table: 'fact_enrollments' },
  courseId: { table: 'fact_enrollments' },
  proctorId: { table: 'fact_enrollments' },
  status: { table: 'fact_enrollments' },
  score: { table: 'fact_enrollments' },
  completedAt: { table: 'fact_enrollments' },
  hoursSpent: { table: 'fact_enrollments' },

  // Dimension attributes (users)
  userFullName: { table: 'dim_users', column: 'fullName' },
  department: { table: 'dim_users' },

  // Dimension attributes (courses)
  courseTitle: { table: 'dim_courses', column: 'title' },
  category: { table: 'dim_courses' },
  courseHours: { table: 'dim_courses', column: 'hours' },

  // Dimension attributes (proctors)
  proctorFullName: { table: 'dim_proctors', column: 'fullName' },
};
```

### Data Model Diagram

```
                    ┌─────────────────────┐
                    │     dim_users       │
                    ├─────────────────────┤
                    │ id (PK)             │
                    │ fullName            │
                    │ department          │
                    │ role                │
                    │ location            │
                    └──────────┬──────────┘
                               │
                               │ userId
                               ▼
┌─────────────────┐   ┌─────────────────────┐   ┌─────────────────┐
│   dim_courses   │   │  fact_enrollments   │   │  dim_proctors   │
├─────────────────┤   ├─────────────────────┤   ├─────────────────┤
│ id (PK)         │◄──│ courseId (FK)       │   │ id (PK)         │
│ title           │   │ id (PK)             │──►│ fullName        │
│ category        │   │ userId (FK)         │   │ location        │
│ difficulty      │   │ proctorId (FK)      │   └─────────────────┘
│ hours           │   │ status              │
└─────────────────┘   │ score               │
                      │ completedAt         │
                      │ hoursSpent          │
                      └─────────────────────┘
```

---

## Metrics Engine

### Engine Creation

The engine is created via `createDashboardEngine()` in `src/metricforge/engine.ts`:

```typescript
export function createDashboardEngine(data: MiniDatabase): SemanticEngine {
  const db = toInMemoryDb(data);
  const engine = SemanticEngine.fromSchema(dashboardSchema, db);

  // Register metrics...

  return engine;
}
```

### Registered Metrics

| Metric Name | Type | Expression | Description |
|-------------|------|------------|-------------|
| `total_enrollments` | Count | `count(*)` | Total number of enrollment records |
| `total_score` | Sum | `sum(score)` | Sum of all scores |
| `avg_score` | Average | `avg(score)` | Average score across enrollments |
| `total_hours_spent` | Sum | `sum(hoursSpent)` | Total logged learning hours |
| `total_planned_hours` | Sum | `sum(courseHours)` | Total planned hours (from courses) |
| `hour_utilization` | Derived | `total_hours_spent / total_planned_hours` | Hour utilization ratio |

### Metric Definition Patterns

**Simple Aggregate (using aggregateMetric):**
```typescript
engine.registerMetric(
  aggregateMetric('avg_score', 'fact_enrollments', 'score', 'avg')
);
```

**Count All Rows (using Expr.count):**
```typescript
engine.registerMetric(
  buildMetricFromExpr({
    name: 'total_enrollments',
    baseFact: 'fact_enrollments',
    expr: Expr.count('*'),
  })
);
```

**Derived Metric (using Expr.div):**
```typescript
engine.registerMetric(
  buildMetricFromExpr({
    name: 'hour_utilization',
    baseFact: 'fact_enrollments',
    expr: Expr.div(
      Expr.metric('total_hours_spent'),
      Expr.metric('total_planned_hours')
    ),
  })
);
```

### Expression Builders (Expr API)

| Builder | Description | Example |
|---------|-------------|---------|
| `Expr.count(attr)` | Count aggregation | `Expr.count('*')` |
| `Expr.sum(attr)` | Sum aggregation | `Expr.sum('score')` |
| `Expr.avg(attr)` | Average aggregation | `Expr.avg('score')` |
| `Expr.min(attr)` | Minimum value | `Expr.min('score')` |
| `Expr.max(attr)` | Maximum value | `Expr.max('score')` |
| `Expr.metric(name)` | Reference another metric | `Expr.metric('total_score')` |
| `Expr.div(left, right)` | Division | `Expr.div(a, b)` |
| `Expr.mul(left, right)` | Multiplication | `Expr.mul(a, b)` |
| `Expr.add(left, right)` | Addition | `Expr.add(a, b)` |
| `Expr.sub(left, right)` | Subtraction | `Expr.sub(a, b)` |

---

## Query Execution

### QuerySpec Structure

```typescript
interface QuerySpec {
  dimensions: string[];    // Logical attributes for grouping (grain)
  metrics: string[];       // Metric names to compute
  where?: FilterContext;   // Pre-aggregation filters
  having?: Function;       // Post-aggregation filters
}
```

### Query Examples

**Query by Status:**
```typescript
const result = engine.runQuery({
  dimensions: ['status'],
  metrics: ['total_enrollments', 'avg_score'],
});
// Returns: [
//   { status: 'completed', total_enrollments: 66, avg_score: 85.2 },
//   { status: 'in-progress', total_enrollments: 42, avg_score: 71.8 },
//   { status: 'failed', total_enrollments: 12, avg_score: 52.1 }
// ]
```

**Query by Category and Status:**
```typescript
const result = engine.runQuery({
  dimensions: ['category', 'status'],
  metrics: ['total_enrollments'],
});
// Returns grouped results by category × status combinations
```

**Query with No Dimensions (Grand Total):**
```typescript
const result = engine.runQuery({
  dimensions: [],
  metrics: ['total_enrollments', 'avg_score'],
});
// Returns: [{ total_enrollments: 120, avg_score: 76.5 }]
```

**Query with Filters:**
```typescript
const result = engine.runQuery({
  dimensions: ['department'],
  metrics: ['total_enrollments'],
  where: { status: 'completed' },
});
// Returns only completed enrollments grouped by department
```

### Filter Context

Filters are converted from dashboard filters to MetricForge format:

```typescript
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

  return Object.keys(filterObj).length > 0 ? filterObj : undefined;
}
```

---

## Dashboard Integration

### QueryContext

The `QueryContext` interface provides access to both raw data and the MetricForge engine:

```typescript
interface QueryContext {
  data: MiniDatabase;        // Raw data for detail queries
  filters: DashboardFilters; // Current filter state
  lookups: QueryLookups;     // Map-based lookups for joins
  engine: SemanticEngine;    // MetricForge engine instance
}
```

### Card Configuration Pattern

Cards use a hybrid approach:
- **Summary queries**: Use MetricForge for aggregated metrics
- **Detail queries**: May use raw data for row-level details

```typescript
{
  id: 'completed-total',
  title: 'Completed Certifications',
  summaryQuery: (ctx) => {
    // Use MetricForge for aggregation
    const rows = ctx.engine.runQuery({
      dimensions: ['status'],
      metrics: ['total_enrollments'],
    });

    const completed = rows.find(r => r.status === 'completed');
    return {
      label: 'Total completions',
      value: formatNumber(completed?.total_enrollments ?? 0),
    };
  },
  detailQuery: (ctx) => {
    // Use raw data for individual records
    return ctx.data.enrollments
      .filter(e => e.status === 'completed')
      .map(e => ({ /* row details */ }));
  },
}
```

### Helper Function: runFilteredQuery

```typescript
function runFilteredQuery(ctx: QueryContext, spec: QuerySpec): Row[] {
  const filterCtx = toFilterContext(ctx.filters);
  const queryWithFilters: QuerySpec = {
    ...spec,
    where: filterCtx ?? spec.where,
  };
  return ctx.engine.runQuery(queryWithFilters);
}
```

---

## Migration from LINQ

### Before (Direct LINQ)

```typescript
// Old approach - manual LINQ chains
const completedEnrollments = Enumerable.from(ctx.data.enrollments)
  .where(e => e.status === 'completed')
  .join(
    Enumerable.from(ctx.data.courses),
    e => e.courseId,
    c => c.id,
    (e, c) => ({ enrollment: e, course: c })
  )
  .groupBy(
    item => item.course.category,
    null,
    (key, group) => ({
      category: key,
      count: group.count(),
      avgScore: group.average(x => x.enrollment.score)
    })
  )
  .toArray();
```

### After (MetricForge)

```typescript
// New approach - declarative query
const result = engine.runQuery({
  dimensions: ['category'],
  metrics: ['total_enrollments', 'avg_score'],
  where: { status: 'completed' },
});
```

### Key Differences

| Aspect | LINQ Approach | MetricForge Approach |
|--------|---------------|----------------------|
| **Joins** | Manual `.join()` calls | Automatic via schema |
| **Filters** | Inline `.where()` chains | Declarative `where` property |
| **Grouping** | Manual `.groupBy()` | Automatic via `dimensions` |
| **Aggregation** | Manual aggregate functions | Predefined metrics |
| **Reusability** | Copy/paste code | Registered metrics |
| **Grain** | Hardcoded in query | Dynamic via dimensions |

---

## API Reference

### Engine Module (`src/metricforge/engine.ts`)

#### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `createDashboardEngine` | `(data: MiniDatabase) => SemanticEngine` | Creates configured engine |
| `toInMemoryDb` | `(data: MiniDatabase) => InMemoryDb` | Converts data format |
| `toFilterContext` | `(filters: DashboardFilters) => Record<string, any>` | Converts filters |
| `buildQuery` | `(dimensions, metrics, filters?) => QuerySpec` | Builds query spec |
| `runQuery` | `(engine, spec) => Row[]` | Executes query |

#### Re-exported from MetricForge

| Export | Type | Description |
|--------|------|-------------|
| `SemanticEngine` | Class | Main engine class |
| `f` | Object | Filter helpers (eq, lt, gt, etc.) |
| `Expr` | Object | Expression builders |
| `aggregateMetric` | Function | Simple aggregate metric factory |
| `buildMetricFromExpr` | Function | Expression-based metric factory |

#### Types

| Type | Description |
|------|-------------|
| `QuerySpec` | Query specification interface |
| `Row` | Generic row type (`Record<string, any>`) |
| `InMemoryDb` | Database format (`{ tables: {...} }`) |

### Schema Module (`src/metricforge/schema.ts`)

| Export | Type | Description |
|--------|------|-------------|
| `dashboardSchema` | `Schema` | Complete semantic schema |

---

## Examples

### Example 1: Computing Failure Rate

```typescript
const summaryQuery = (ctx: QueryContext) => {
  const rows = runFilteredQuery(ctx, {
    dimensions: ['status'],
    metrics: ['total_enrollments'],
  });

  const total = rows.reduce((sum, r) => sum + (r.total_enrollments as number), 0);
  const failed = rows.find(r => r.status === 'failed')?.total_enrollments ?? 0;
  const failureRate = total > 0 ? failed / total : 0;

  return {
    label: 'Failure Rate',
    value: formatPercent(failureRate),
  };
};
```

### Example 2: Department Leaderboard

```typescript
const detailQuery = (ctx: QueryContext) => {
  const rows = runFilteredQuery(ctx, {
    dimensions: ['department'],
    metrics: ['total_enrollments', 'avg_score'],
  });

  return rows
    .sort((a, b) => (b.avg_score as number) - (a.avg_score as number))
    .map(row => ({
      Department: row.department,
      Enrollments: row.total_enrollments,
      AverageScore: formatScore(row.avg_score as number),
    }));
};
```

### Example 3: Hours Utilization with Derived Metric

```typescript
const summaryQuery = (ctx: QueryContext) => {
  const rows = runFilteredQuery(ctx, {
    dimensions: [],
    metrics: ['total_hours_spent', 'total_planned_hours', 'hour_utilization'],
  });

  const row = rows[0];
  return {
    label: 'Hours Logged',
    value: formatHours(row?.total_hours_spent ?? 0),
    trendLabel: `${formatPercent(row?.hour_utilization ?? 0)} of planned`,
  };
};
```

---

## Troubleshooting

### Common Issues

**Issue: Metric returns `undefined`**
- Check that the attribute exists in the schema
- For count metrics, use `Expr.count('*')` instead of counting string columns
- Verify the baseFact is correctly specified

**Issue: Dimension not appearing in results**
- Ensure the attribute is defined in the schema
- Check that a join path exists from the fact to the dimension table

**Issue: Type import errors during build**
- Use `import type` for interfaces: `import type { QuerySpec } from '...'`
- Use `export type` when re-exporting: `export type { QuerySpec }`

---

## Future Enhancements

1. **DSL Support**: Enable metric definitions via DSL syntax
2. **Caching**: Add query result caching for repeated queries
3. **Validation**: Runtime validation of metric dependencies
4. **Time Intelligence**: Add support for period-over-period comparisons
5. **Table Transforms**: Support for lookup table transformations

---

## References

- [MetricForge Repository](https://github.com/jnyinglis/MetricForge)
- [LINQ.js Documentation](https://github.com/nicobobb/linq)
- [Semantic Layer Design Patterns](https://en.wikipedia.org/wiki/Semantic_layer)
