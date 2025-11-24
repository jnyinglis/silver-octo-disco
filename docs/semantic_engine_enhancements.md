# Semantic Engine Enhancements for Visual Editor

This document outlines proposed enhancements to the MetricForge semantic engine that would improve the dashboard editor experience.

## Current State

The `introspectSemanticModel()` function currently returns:
- **metrics**: name, label, description, baseFact, format, kind
- **dimensions**: name, label, table
- **facts**: list of fact table names
- **attributes**: list of attribute names
- **contextTransforms**: list of available transforms (ytd, lastYear, rolling30d)

## Proposed Enhancements

### 1. Dimension Type Hints

**Problem:** The editor currently guesses dimension types by name pattern matching (e.g., looking for "date" or "at" in the name to identify time dimensions). This is fragile and error-prone.

**Solution:** Add explicit type information to dimension definitions.

```typescript
interface DimensionDefinition {
  name: string;
  label: string;
  table: string;
  // NEW fields:
  type: 'categorical' | 'temporal' | 'numeric' | 'identifier';
  filterable?: boolean;
  sortable?: boolean;
}
```

**Editor benefits:**
- Automatically suggest time dimensions for line/trend charts
- Suggest categorical dimensions for bar charts and breakdowns
- Hide identifier dimensions (like IDs) from user-facing selectors
- Enable/disable filter and sort controls appropriately

---

### 2. Dimension Value Sampling

**Problem:** The editor needs to show valid filter values (e.g., dropdown of departments), but currently must run ad-hoc queries to get these values.

**Solution:** Add a method to sample unique values for a dimension.

```typescript
// New method on SemanticEngine
engine.sampleDimensionValues(
  dimension: string,
  options?: {
    limit?: number;
    filter?: Record<string, unknown>;
  }
): unknown[]
```

**Editor benefits:**
- Populate filter dropdowns without custom queries
- Show autocomplete suggestions in filter builders
- Validate user-entered filter values

---

### 3. Metric-Dimension Compatibility

**Problem:** Not all metric + dimension combinations are meaningful. For example, a "completion rate" metric might not make sense when broken down by certain dimensions.

**Solution:** Add compatibility metadata to metric definitions.

```typescript
interface MetricDefinition {
  // ... existing fields
  // NEW fields:
  compatibleDimensions?: string[];    // If set, only these dimensions are valid
  incompatibleDimensions?: string[];  // These dimensions should be avoided
  recommendedDimensions?: string[];   // Suggested dimensions for this metric
}
```

**Editor benefits:**
- Hide or warn on invalid metric + dimension combinations
- Pre-select recommended dimensions when a metric is chosen
- Improve query validation with semantic awareness

---

### 4. Chart Type Recommendations

**Problem:** The editor doesn't know which visualization types work best with different metrics and dimensions.

**Solution:** Add chart type recommendations to both metrics and dimensions.

```typescript
interface MetricDefinition {
  // NEW field:
  recommendedCharts?: TileType[];  // e.g., ['kpi', 'line', 'bar']
}

interface DimensionDefinition {
  // NEW field:
  recommendedCharts?: TileType[];  // e.g., temporal → ['line'], categorical → ['bar', 'table']
}
```

**Editor benefits:**
- Smart defaults when creating new tiles
- Suggest chart types based on selected metrics/dimensions
- Warn when chart type doesn't match data characteristics

---

### 5. Query Validation

**Problem:** Invalid queries fail at execution time with cryptic errors. The editor should catch issues earlier.

**Solution:** Add a validation method that checks query specs without executing them.

```typescript
interface QueryValidation {
  valid: boolean;
  errors: string[];      // Critical issues that will cause failure
  warnings: string[];    // Non-critical issues (e.g., performance concerns)
  suggestions?: string[]; // Improvement recommendations
}

// New method on SemanticEngine
engine.validateQuery(spec: QuerySpec): QueryValidation
```

**Example validations:**
- Unknown metric or dimension names
- Metric requires dimensions that aren't included
- Query will return too many rows (performance warning)
- Filter uses invalid operator for dimension type

**Editor benefits:**
- Real-time validation feedback in the config panel
- Prevent invalid configurations from being saved
- Guide users toward valid configurations

---

### 6. Format Helpers

**Problem:** The editor's preview component duplicates formatting logic that should live in the semantic layer.

**Solution:** Provide centralized formatting utilities based on metric metadata.

```typescript
// New method on SemanticEngine or standalone utility
engine.formatValue(metricName: string, value: number): string

// Examples:
// 'percentage' format: 0.852 → "85.2%"
// 'hours' format: 12.5 → "12.5 hrs"
// 'integer' format: 1234 → "1,234"
// 'score' format: 87.333 → "87.3"
// 'ratio' format: 1.25 → "1.25x"
```

**Editor benefits:**
- Consistent formatting across preview and production views
- Single source of truth for display logic
- Easier to add new format types

---

### 7. Metric Dependencies Graph

**Problem:** Derived metrics (like `hour_utilization = total_hours_spent / total_planned_hours`) depend on other metrics. The editor has no visibility into these relationships.

**Solution:** Expose metric dependencies in the definition and provide a lookup method.

```typescript
interface MetricDefinition {
  // NEW field:
  dependsOn?: string[];  // e.g., ['total_hours_spent', 'total_planned_hours']
}

// New method on SemanticEngine
engine.getMetricDependencies(metric: string): string[]
engine.getMetricLineage(metric: string): MetricDefinition[]  // Full dependency tree
```

**Editor benefits:**
- Display metric lineage in the config panel
- Warn if a derived metric's dependencies are unavailable
- Help users understand how metrics are calculated

---

### 8. Schema-Driven Filter Operators

**Problem:** Different dimension types support different filter operators. The editor doesn't know which operators are valid for each dimension.

**Solution:** Define valid operators per dimension.

```typescript
type FilterOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'between' | 'contains' | 'startsWith';

interface DimensionDefinition {
  // NEW field:
  operators?: FilterOperator[];
}

// Defaults by type:
// - categorical: ['eq', 'neq', 'in']
// - temporal: ['eq', 'gt', 'lt', 'gte', 'lte', 'between']
// - numeric: ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'between']
// - identifier: ['eq', 'in']
```

**Editor benefits:**
- Filter builder shows only valid operators
- Prevent invalid filter configurations
- Better UX for building complex filters

---

## Implementation Priority

| Enhancement | Effort | Impact | Priority |
|-------------|--------|--------|----------|
| Dimension `type` field | Low | High | **P0** |
| `sampleDimensionValues()` | Low | High | **P0** |
| `formatValue()` helper | Low | Medium | **P1** |
| `validateQuery()` | Medium | High | **P1** |
| `recommendedCharts` | Low | Medium | **P2** |
| Metric-dimension compatibility | Medium | Medium | **P2** |
| Filter operators | Low | Medium | **P2** |
| Metric dependencies | Medium | Low | **P3** |

---

## Example Enhanced Introspection Response

```typescript
const introspection = engine.introspect();

// Enhanced metrics
introspection.metrics = [
  {
    name: 'total_enrollments',
    label: 'Total enrollments',
    description: 'Count of enrollment rows across the fact table.',
    baseFact: 'fact_enrollments',
    kind: 'count',
    format: 'integer',
    recommendedCharts: ['kpi', 'bar', 'line'],
    recommendedDimensions: ['department', 'category', 'status'],
  },
  {
    name: 'hour_utilization',
    label: 'Hour utilization',
    description: 'Ratio of actual hours spent vs planned.',
    baseFact: 'fact_enrollments',
    kind: 'expression',
    format: 'ratio',
    dependsOn: ['total_hours_spent', 'total_planned_hours'],
    recommendedCharts: ['kpi', 'bar'],
    incompatibleDimensions: ['completedAt'],  // Time series doesn't make sense
  },
];

// Enhanced dimensions
introspection.dimensions = [
  {
    name: 'department',
    label: 'Department',
    table: 'dim_users',
    type: 'categorical',
    filterable: true,
    sortable: true,
    operators: ['eq', 'neq', 'in'],
    recommendedCharts: ['bar', 'table'],
  },
  {
    name: 'completedAt',
    label: 'Completed At',
    table: 'fact_enrollments',
    type: 'temporal',
    filterable: true,
    sortable: true,
    operators: ['eq', 'gt', 'lt', 'gte', 'lte', 'between'],
    recommendedCharts: ['line'],
  },
];
```

---

## Migration Path

These enhancements are additive and backward-compatible:

1. All new fields are optional
2. Existing code continues to work without changes
3. Editor can progressively adopt enhancements as they become available
4. Default behaviors can be inferred when metadata is missing

## Related Files

- `src/metricforge/engine.ts` - Main engine implementation
- `src/metricforge/schema.ts` - Schema definitions
- `src/services/editorPalette.ts` - Editor integration point
- `src/composables/useEditorState.ts` - Editor state management
