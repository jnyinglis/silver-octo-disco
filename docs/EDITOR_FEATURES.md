# Dashboard Editor Features Guide

This document explains the comprehensive features available in the MetricForge Dashboard Editor, focusing on the advanced tile configuration, filtering, and drill-down capabilities.

## Table of Contents

- [Overview](#overview)
- [Editor Modes](#editor-modes)
- [Two-KPI Tile Configuration](#two-kpi-tile-configuration)
- [Query Modes](#query-modes)
- [Applied Filters](#applied-filters)
- [Detail View (Drill-down)](#detail-view-drill-down)
- [Complete Workflow Example](#complete-workflow-example)
- [Technical Implementation](#technical-implementation)

---

## Overview

The Dashboard Editor provides a complete visual interface for building analytics dashboards with:

- **Two-KPI metric cards** - Display primary and secondary metrics with custom formatting
- **Dual query modes** - Visual builder or DSL (Domain-Specific Language) queries
- **Dynamic filtering** - Apply global filters to specific tiles
- **Drill-down capability** - Click tiles to view detailed data tables
- **Live preview** - See exactly how your dashboard will look

---

## Editor Modes

The editor operates in two distinct modes:

### Edit Mode
- **Purpose**: Configure tiles, queries, and layout
- **Interface**: Three-panel layout (palette, canvas, config panel)
- **Features**: Drag-and-drop, visual query builder, property editors

### Preview Mode
- **Purpose**: View dashboard as end-users will see it
- **Interface**: Full dashboard with Card.vue styling
- **Features**: Click tiles to open drill-down, see applied filters in action
- **Styling**: Matches production dashboard exactly (1.25rem radius, prominent shadows)

**Switch modes** using the toolbar buttons at the top of the editor.

---

## Two-KPI Tile Configuration

Dashboard tiles can display **two metrics simultaneously** - a primary metric (large, prominent) and a secondary metric (smaller, contextual).

### Configuration Options

#### Primary KPI
- **Metric**: Select from available metrics in your query
- **Label**: Custom display text (e.g., "Total Completions")
- **Format**: Choose number format:
  - `number` - Standard number with thousands separator
  - `percent` - Percentage (value × 100 with % symbol)
  - `hours` - Time in hours (value with 'h' suffix)
  - `score` - Integer score (no decimals)

#### Secondary KPI (Optional)
- **Metric**: Select a different metric for trend/context
- **Label**: Custom display text (e.g., "vs. last month")
- **Format**: Independent formatting from primary metric

### Visual Display

```
┌─────────────────────────────┐
│  Tile Title            >    │
│                             │
│         1,234              │  ← Primary KPI (large)
│    Total Completions       │  ← Primary Label
│                             │
│    +15% vs. last month     │  ← Secondary KPI (green trend)
└─────────────────────────────┘
```

### Location in UI

1. Select a KPI tile in the canvas
2. In the right sidebar, find the **"KPI Display"** section
3. Configure primary metric, label, and format
4. Toggle **"Show secondary metric"** checkbox to add trend data
5. Configure secondary metric details

---

## Query Modes

Each tile supports **two query modes** for maximum flexibility:

### Visual Builder Mode

**Best for**: Non-technical users, quick setup, simple queries

**Features**:
- Point-and-click metric selection
- Dropdown dimension pickers
- Visual filter editor
- Auto-validation

**Example Configuration**:
```
Metrics: total_enrollments, completion_rate
Dimensions: department, status
Where: status = "active"
Limit: 100
```

### DSL Query Mode

**Best for**: Power users, complex queries, custom calculations

**Features**:
- Full MetricForge DSL syntax
- Parameter binding with `:param` syntax
- Custom metric expressions
- Multi-line editor with monospace font

**Example DSL**:
```
metrics: total_enrollments, completion_rate
dimensions: department, status
where: status == :status && department == :department
having: total_enrollments > 10
order: total_enrollments desc
limit: 100
```

### Switching Query Modes

1. Select a tile
2. In the config panel, find the **query mode toggle**
3. Click **"Visual Builder"** or **"DSL Query"**
4. When switching from builder → DSL, existing query is converted
5. When switching from DSL → builder, you'll start fresh

**Note**: DSL queries are auto-wrapped in `query tile_<id> { ... }` blocks internally.

---

## Applied Filters

Applied filters allow you to selectively apply **global dashboard filters** to individual tiles.

### How It Works

1. **Global Filters**: The dashboard has global filter state (department, status, category, etc.)
2. **Applied Filters**: Each tile chooses which global filters to respect
3. **Runtime Injection**: Filter values are injected into queries at execution time

### Configuration

In the tile config panel, find the **"Applied Filters"** section:

```
☐ department
☑ status
☐ courseCategory
☐ search
```

Check the filters that should apply to this tile.

### Example Scenario

**Global Filters**:
- `department: "Engineering"`
- `status: "active"`

**Tile A** (Applied filters: `status`):
- Query executes with `where: { status: "active" }`

**Tile B** (Applied filters: `department`, `status`):
- Query executes with `where: { department: "Engineering", status: "active" }`

**Tile C** (No applied filters):
- Query executes without filter injection

### Preview Mode Display

When in **Preview Mode**, a blue banner shows active filter values:

```
┌─────────────────────────────────────────────────────┐
│ Active Filters:  department: Engineering            │
│                  status: active                      │
│                  courseCategory: Technical           │
└─────────────────────────────────────────────────────┘
```

### DSL Parameter Binding

For DSL queries, filters are injected as parameters:

**DSL Query**:
```
where: status == :status && department == :department
```

**Runtime** (with applied filters):
```javascript
{
  status: "active",
  department: "Engineering"
}
```

---

## Detail View (Drill-down)

Detail views provide **drill-down capability** - click a tile to see detailed data in a table.

### Configuration

In the tile config panel, find the **"Detail View (Drill-down)"** section:

#### 1. Enable Drill-down
```
☑ Enable drill-down on click
```

#### 2. Configure Detail Query

Choose query mode for the detail view:

**Visual Builder**:
- Select metrics and dimensions for detail table
- Add where clauses for filtering
- Configure column list (one per line)

**DSL Mode**:
- Write custom DSL query for detail data
- Use parameter binding for dynamic filters

#### 3. Inherit Filters

```
☑ Inherit parent filters
```

When enabled, the detail view inherits applied filters from the parent tile.

#### 4. Column Configuration

**Specify columns** to display (optional):
```
department
status
total_enrollments
completion_rate
last_updated
```

**Custom column labels** (optional):
```javascript
{
  "total_enrollments": "Total Enrolled",
  "completion_rate": "% Complete"
}
```

### Detail Modal Display

When you click a tile in preview mode:

```
┌─────────────────────────────────────────────────────┐
│  Tile Title - Details                          ×    │
│  Filtered by department: Engineering, status: active │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────┬────────┬──────────┬───────────┐   │
│  │ Department │ Status │ Enrolled │ % Complete│   │
│  ├────────────┼────────┼──────────┼───────────┤   │
│  │ Engineering│ active │   1,234  │   87.5%   │   │
│  │ Marketing  │ active │     856  │   92.1%   │   │
│  │ Sales      │ active │     643  │   78.3%   │   │
│  └────────────┴────────┴──────────┴───────────┘   │
│                                                      │
│                                        3 rows        │
└─────────────────────────────────────────────────────┘
```

**Features**:
- Scrollable table with sticky header
- Formatted values (numbers, percentages, etc.)
- Row count footer
- Filter info display
- Click outside or close button to dismiss

---

## Complete Workflow Example

Here's a complete example of building a filtered, drill-down enabled KPI tile:

### Step 1: Add a KPI Tile

1. In **Edit Mode**, click the **KPI** tile in the palette
2. Tile appears on canvas: "New KPI"

### Step 2: Configure Basic Query

**Visual Builder Mode**:
1. Select metrics: `total_enrollments`, `completion_rate`
2. Add dimensions: `department` (for filtering)
3. Set where clause: `status = "active"` (base filter)

### Step 3: Configure Two-KPI Display

**Primary KPI**:
- Metric: `total_enrollments`
- Label: "Total Active Enrollments"
- Format: `number`

**Secondary KPI**:
- ☑ Show secondary metric
- Metric: `completion_rate`
- Label: "Average Completion"
- Format: `percent`

### Step 4: Apply Global Filters

**Applied Filters**:
- ☑ department
- ☑ status
- ☐ courseCategory

This tile will now respond to department and status filter changes.

### Step 5: Configure Detail View

**Enable drill-down**:
- ☑ Enable drill-down on click
- ☑ Inherit parent filters

**Detail Query** (Visual Builder):
- Metrics: `total_enrollments`, `completion_rate`, `avg_score`
- Dimensions: `department`, `course_name`, `status`

**Columns**:
```
department
course_name
total_enrollments
completion_rate
avg_score
```

**Column Labels**:
```json
{
  "course_name": "Course",
  "total_enrollments": "Enrolled",
  "completion_rate": "Complete %",
  "avg_score": "Avg. Score"
}
```

### Step 6: Preview and Test

1. Click **Preview Mode** in toolbar
2. See filter banner: `department: Engineering, status: active`
3. Observe tile displays filtered data
4. Click tile to open detail modal
5. Verify detail table shows correct filtered data
6. Check modal header shows: "Filtered by department: Engineering, status: active"

---

## Technical Implementation

### Architecture Overview

```
DashboardEditor.vue
├── Toolbar (mode switcher, actions)
├── Filter Status Banner (preview mode)
├── EditorCanvas.vue
│   ├── TileRenderer.vue (preview mode)
│   │   └── Query execution with filter injection
│   └── DetailViewModal.vue (drill-down)
│       └── Independent query execution
└── Sidebar
    ├── TileConfigPanel.vue
    │   ├── Query mode switcher
    │   ├── KPI Display section
    │   ├── Applied Filters section
    │   └── Detail View section
    └── TilePreview.vue
        └── Live preview with filters
```

### Filter Injection Flow

1. **Global Filters** stored in `useEditorState` composable
2. **Tile Configuration** specifies `appliedFilters: ['department', 'status']`
3. **Runtime Execution**:
   ```javascript
   const mergedWhere = { ...(query.where ?? {}) };

   appliedFilters.forEach((filterKey) => {
     const filterValue = globalFilters.value[filterKey];
     if (filterValue && filterValue !== 'all' && filterValue !== '') {
       mergedWhere[filterKey] = filterValue;
     }
   });

   const results = engine.runQuery({
     metrics: query.metrics,
     dimensions: query.dimensions,
     where: mergedWhere
   });
   ```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| `useEditorState.ts` | Global state, filter values, tile CRUD |
| `TileConfigPanel.vue` | Configuration UI for all tile properties |
| `TileRenderer.vue` | Dual-mode rendering (edit/preview) with query execution |
| `TilePreview.vue` | Sidebar preview with filter injection |
| `DetailViewModal.vue` | Drill-down modal with inherited filters |
| `EditorCanvas.vue` | Canvas layout, modal management, tile placement |

### Data Schema

```typescript
interface TileConfig {
  // Basic properties
  id: string;
  title: string;
  type: 'kpi' | 'table' | 'chart';

  // Query configuration
  queryMode?: 'builder' | 'dsl';
  query?: QueryBinding;          // Builder mode
  dslConfig?: DSLQueryConfig;     // DSL mode

  // KPI display
  kpiDisplay?: {
    primaryMetric: string;
    primaryLabel?: string;
    primaryFormat?: 'number' | 'percent' | 'hours' | 'score';
    secondaryMetric?: string;
    secondaryLabel?: string;
    secondaryFormat?: 'number' | 'percent' | 'hours' | 'score';
  };

  // Filtering
  appliedFilters?: string[];      // e.g., ['department', 'status']

  // Drill-down
  detailView?: {
    mode: 'builder' | 'dsl';
    builderConfig?: QueryBinding;
    dslConfig?: DSLQueryConfig;
    columns?: string[];
    columnLabels?: Record<string, string>;
    inheritFilters?: boolean;     // Default: true
  };

  // Layout
  layout?: {
    colSpan?: number;
    rowSpan?: number;
    minH?: number;
  };
}
```

---

## Best Practices

### When to Use Two KPIs

✅ **Good use cases**:
- Primary metric + trend (e.g., "1,234 enrollments" + "▲ 15% vs. last month")
- Value + rate (e.g., "1,234 completions" + "87.5% completion rate")
- Current + target (e.g., "1,234 current" + "1,500 target")

❌ **Avoid**:
- Two unrelated metrics
- Both metrics at equal importance (use two separate tiles)

### When to Use DSL vs Builder

**Use Builder** when:
- Creating simple metric queries
- Working with non-technical users
- Need visual validation

**Use DSL** when:
- Complex filtering logic
- Custom calculations
- Parameter binding requirements
- Having clauses on aggregates

### Applied Filters Strategy

**Apply filters when**:
- Tile should respond to dashboard-level filters
- You want consistent filtering across multiple tiles

**Don't apply filters when**:
- Tile should show global/unfiltered data (e.g., "Total across all departments")
- Tile has its own independent filtering logic

### Detail View Design

**Good detail views**:
- Show row-level data that aggregates to the summary metric
- Include dimensions for context
- Inherit filters to maintain consistency
- Limit to 10-15 columns max for readability

**Poor detail views**:
- Completely different metrics than summary
- No relationship to parent tile
- Too many columns (horizontal scroll)

---

## Troubleshooting

### Filters Not Working

**Check**:
1. Is the filter checkbox **checked** in Applied Filters section?
2. Is the global filter value set (not empty or 'all')?
3. In preview mode, does the blue banner show the filter?
4. Does your query have the dimension needed for filtering?

### Detail View Not Opening

**Check**:
1. Is "Enable drill-down on click" **checked**?
2. Are you in **Preview Mode** (not Edit Mode)?
3. Does the detail query have metrics configured?
4. Check browser console for query errors

### Preview Shows Wrong Data

**Check**:
1. Verify query configuration in tile config panel
2. Check if applied filters are affecting results
3. Look at the merged where clause in browser console
4. Ensure metric names match your data model

### DSL Query Errors

**Common issues**:
- Syntax errors (use `==` not `=` for comparison)
- Missing parameter bindings (`:paramName`)
- Incorrect metric/dimension names
- Missing required clauses (metrics or dimensions)

---

## Future Enhancements

Potential features for future development:

- [ ] Custom global filter UI (dropdowns, date pickers)
- [ ] DSL syntax highlighting and autocomplete
- [ ] Detail view export to CSV
- [ ] Named queries and custom metrics UI
- [ ] Filter presets and saved views
- [ ] Real-time query validation
- [ ] Query performance metrics
- [ ] Drill-down navigation (detail → further detail)

---

## Summary

The Dashboard Editor provides enterprise-grade analytics dashboard building with:

✨ **Two-KPI tiles** for rich metric display
🔄 **Dual query modes** (builder + DSL) for flexibility
🎯 **Smart filtering** with selective filter application
📊 **Drill-down capability** for detailed exploration
👀 **Live preview** matching production exactly

All features work together seamlessly to create powerful, interactive dashboards.
