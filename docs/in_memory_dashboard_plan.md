# In-Memory Semantic Dashboard Plan

## Goals and Constraints
- Provide configurable dashboards powered exclusively by the in-memory semantic metrics engine defined in `PRD.md`.
- No SQL pushdown or external warehouses; all data lives in local JSON/JS objects and is processed with the semantic engine.
- Prioritize fast iteration, clear governance of semantic assets, and repeatable UI patterns inspired by enterprise BI tools.

## Architecture Overview
- **Data store**: in-memory collections (facts, dimensions) loaded from static fixtures or API responses, wrapped by a `DataStore` module responsible for reloads and cache invalidation.
- **Semantic layer**: existing dimension/fact/metric definitions remain the single source of truth. All dashboard queries compile to semantic engine `runQuery` calls using metric-level grain and context transforms.
- **Execution**: query planning is limited to filter normalization, metric dependency resolution, and context transform application—no SQL compilation.
- **Caching**: memoize results per `(metric set, filters, row dimensions)` and invalidate on datastore reload or semantic definition changes.

## Dashboard Schema (Declarative)
Define dashboards as JSON/YAML configs (e.g., `config/dashboards/*.json`) with:
- **Layout**: grid slots with responsive breakpoints, sizing tokens, and theming options.
- **Tiles**: type (`kpi`, `table`, `line`, `bar`, `combo`, `text`), query binding, formatting presets, and refresh behavior.
- **Queries**: structured as semantic requests `{ rows, filters, metrics, fact }`; support optional time comparison windows by attaching named context transforms (e.g., `ytd`, `lastYear`).
- **Interactions**: declarative mappings (tile → filter events) constrained to allowed semantic dimensions; drill targets can route to another dashboard config or emit row-level detail requests to the engine.
- **Access**: optional role tags per tile/metric to hide or disable unauthorized visuals.

## Semantic-Aware Visual Editor
- **Palette of cards**: predefined card templates (`kpi`, `table`, `line`, `bar`, `combo`, `text`, `comparison`) with built-in capabilities (sorting, thresholds, trend sparkline, conditional formatting) and schema defaults.
- **Semantic discovery**: editor fetches available facts, dimensions, metrics, formats, and allowed context transforms directly from the semantic engine. Add an engine capability to expose a typed `introspect()` API that returns these artifacts, their compatible grains, and guardrail metadata (access roles, default filters).
- **Guided binding**: card editors present only compatible dimensions/metrics (e.g., time dimensions for line charts) and auto-apply semantic defaults like `format`, `timeGrain`, and enforced filters (tenant/role). Include inline previews powered by the in-memory engine for fast iteration.
- **Validation**: real-time schema validation against the dashboard config model (missing bindings, unsupported interactions, metric/dimension availability) and lint hints for performance (e.g., over-broad row sets) before saving.
- **Versioned configs**: editor saves dashboard definitions as versioned JSON/YAML, supports draft vs. published states, and writes through to the same config store used by the renderer.

### Editor Workflow Example
1. Designer selects a card type from the palette; the editor queries `introspect()` to list compatible metrics/dimensions.
2. Designer binds fields, adds filters, and configures interactions (e.g., cross-filter on `customer_id`). Inline preview runs the semantic engine with sample filters.
3. Editor runs validation (schema + permissions) and surfaces warnings (missing format, disallowed dimension) before commit.
4. On save, the validated config is versioned and stored; published versions trigger renderer reloads with cache invalidation signals from the semantic layer.

## Rendering and State Management
- **Renderer**: React/Vue component registry that maps tile types to visual components, with a `TileController` handling loading states, errors, and refresh cadence.
- **Interaction bus**: lightweight event emitter scoped to a dashboard instance to propagate filter/drill events across tiles; persists state to URL or local storage for shareability.
- **Data flow**: tiles request data via a `DashboardQueryService` that wraps semantic engine calls, applies cache, and injects enforced filters (e.g., tenant, role-based row filters).
- **Formatting**: leverage semantic metric metadata (`format`, labels) to format values and enrich dimension labels using in-memory lookups.

## Governance and Observability (In-Memory)
- **Catalog**: expose semantic definitions and lineage (metric → fact/transform dependencies) via a local API or panel; track certification flags and owners in definitions.
- **Auditing**: log query executions with context (metrics, filters, cache hit/miss) to an in-memory log buffer with optional export.
- **Validation**: CLI task to lint dashboard configs against semantic definitions (unknown metrics/dimensions, disallowed interactions, missing formats).

## Performance Considerations (No SQL)
- Prefer columnar-friendly in-memory shapes (arrays of records) and batched evaluations to minimize repeated scans.
- Use grouping primitives (e.g., LINQ or custom reducers) to pre-aggregate common grains; cache intermediate groupings for reuse across tiles.
- Apply filter normalization early (range simplification, deduped equality lists) to reduce evaluation work.

## Delivery Steps
1. Add `DataStore` module with reload hooks and cache invalidation signals.
2. Implement `DashboardQueryService` that adapts dashboard query configs to semantic engine calls with memoization and enforced filters.
3. Define dashboard schema types, validators, and sample configs demonstrating KPIs, trends, comparisons, and drills.
4. Build renderer components and interaction bus aligned with the schema; ensure accessibility and theming options.
5. Add CLI validation/lint commands and lightweight observability hooks (catalog, query logs, cache metrics).
6. Document operational workflows (reload data, update semantic definitions, publish dashboard configs) and governance policies.
