<template>
  <aside class="config-panel" v-if="selectedTile">
    <header class="config-panel__header">
      <h3>Configure Tile</h3>
      <button class="config-panel__close" @click="selectTile(null)">Close</button>
    </header>

    <div class="config-panel__content">
      <!-- Basic Info -->
      <section class="config-panel__section">
        <h4 class="config-panel__section-title">Basic Info</h4>
        <div class="config-panel__field">
          <label>Title</label>
          <input
            type="text"
            :value="selectedTile.title"
            @input="updateField('title', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="config-panel__field">
          <label>Type</label>
          <select
            :value="selectedTile.type"
            @change="updateField('type', ($event.target as HTMLSelectElement).value)"
          >
            <option value="kpi">KPI</option>
            <option value="table">Table</option>
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
            <option value="combo">Combo Chart</option>
            <option value="text">Text</option>
            <option value="comparison">Comparison</option>
          </select>
        </div>
      </section>

      <!-- Query Configuration -->
      <section class="config-panel__section">
        <h4 class="config-panel__section-title">Query Configuration</h4>

        <!-- Query Mode Switcher -->
        <div class="config-panel__field">
          <label>Query Mode</label>
          <div class="config-panel__mode-switch">
            <button
              type="button"
              class="config-panel__mode-btn"
              :class="{ 'config-panel__mode-btn--active': currentQueryMode === 'builder' }"
              @click="switchQueryMode('builder')"
            >
              Visual Builder
            </button>
            <button
              type="button"
              class="config-panel__mode-btn"
              :class="{ 'config-panel__mode-btn--active': currentQueryMode === 'dsl' }"
              @click="switchQueryMode('dsl')"
            >
              DSL Query
            </button>
          </div>
        </div>

        <!-- Visual Builder Mode -->
        <template v-if="currentQueryMode === 'builder'">
          <MetricPicker
            :model-value="selectedTile.query?.metrics ?? []"
            :recommended-metrics="currentTemplate?.recommendedMetrics ?? []"
            @update:model-value="updateQuery('metrics', $event)"
          />

          <DimensionPicker
            :model-value="selectedTile.query?.dimensions ?? []"
            :recommended-dimensions="currentTemplate?.recommendedDimensions ?? []"
            @update:model-value="updateQuery('dimensions', $event)"
          />

          <!-- Transforms -->
          <div class="config-panel__field">
            <label>Context Transforms</label>
            <div class="config-panel__checkboxes">
              <label
                v-for="transform in availableTransforms"
                :key="transform"
                class="config-panel__checkbox"
              >
                <input
                  type="checkbox"
                  :checked="(selectedTile.query?.transforms ?? []).includes(transform)"
                  @change="toggleTransform(transform)"
                />
                {{ transform }}
              </label>
            </div>
          </div>

          <!-- Limit -->
          <div class="config-panel__field">
            <label>Limit</label>
            <input
              type="number"
              :value="selectedTile.query?.limit"
              placeholder="No limit"
              min="1"
              @input="updateQuery('limit', parseLimit(($event.target as HTMLInputElement).value))"
            />
          </div>
        </template>

        <!-- DSL Mode -->
        <template v-else>
          <div class="config-panel__field">
            <label>Query DSL</label>
            <textarea
              class="config-panel__dsl-editor"
              :value="selectedTile.dslConfig?.queryString ?? ''"
              @input="updateDSLQuery(($event.target as HTMLTextAreaElement).value)"
              placeholder="metrics: total_enrollments&#10;dimensions: department, status&#10;where: status == :status"
              rows="8"
            ></textarea>
            <small class="config-panel__hint">
              Query will be auto-wrapped in: query tile_{{ selectedTile.id }} { ... }
            </small>
          </div>

          <!-- DSL Parameters -->
          <div class="config-panel__field">
            <label>Parameters (JSON)</label>
            <textarea
              class="config-panel__params-editor"
              :value="dslParametersJson"
              @input="updateDSLParameters(($event.target as HTMLTextAreaElement).value)"
              placeholder='{ "status": "completed" }'
              rows="3"
            ></textarea>
            <small class="config-panel__hint">
              Values for :param placeholders in query
            </small>
          </div>
        </template>
      </section>

      <!-- KPI Display Configuration (only for KPI tiles) -->
      <section v-if="selectedTile.type === 'kpi'" class="config-panel__section">
        <h4 class="config-panel__section-title">KPI Display</h4>

        <!-- Primary KPI -->
        <div class="config-panel__field">
          <label>Primary Metric</label>
          <select
            :value="selectedTile.kpiDisplay?.primaryMetric ?? selectedTile.query.metrics[0]"
            @change="updateKPIDisplay('primaryMetric', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">Select metric...</option>
            <option
              v-for="metric in selectedTile.query.metrics"
              :key="metric"
              :value="metric"
            >
              {{ metric }}
            </option>
          </select>
        </div>

        <div class="config-panel__field">
          <label>Primary Label</label>
          <input
            type="text"
            :value="selectedTile.kpiDisplay?.primaryLabel ?? ''"
            placeholder="e.g., Total completions"
            @input="updateKPIDisplay('primaryLabel', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div class="config-panel__field">
          <label>Primary Format</label>
          <select
            :value="selectedTile.kpiDisplay?.primaryFormat ?? 'number'"
            @change="updateKPIDisplay('primaryFormat', ($event.target as HTMLSelectElement).value)"
          >
            <option value="number">Number</option>
            <option value="percent">Percent</option>
            <option value="hours">Hours</option>
            <option value="score">Score</option>
          </select>
        </div>

        <!-- Secondary KPI -->
        <div class="config-panel__field">
          <label>
            <input
              type="checkbox"
              :checked="!!selectedTile.kpiDisplay?.secondaryMetric"
              @change="toggleSecondaryKPI"
            />
            Show secondary metric (trend)
          </label>
        </div>

        <template v-if="selectedTile.kpiDisplay?.secondaryMetric">
          <div class="config-panel__field">
            <label>Secondary Metric</label>
            <select
              :value="selectedTile.kpiDisplay.secondaryMetric"
              @change="updateKPIDisplay('secondaryMetric', ($event.target as HTMLSelectElement).value)"
            >
              <option value="">Select metric...</option>
              <option
                v-for="metric in selectedTile.query.metrics"
                :key="metric"
                :value="metric"
              >
                {{ metric }}
              </option>
            </select>
          </div>

          <div class="config-panel__field">
            <label>Secondary Label</label>
            <input
              type="text"
              :value="selectedTile.kpiDisplay.secondaryLabel ?? ''"
              placeholder="e.g., active learners"
              @input="updateKPIDisplay('secondaryLabel', ($event.target as HTMLInputElement).value)"
            />
          </div>

          <div class="config-panel__field">
            <label>Secondary Format</label>
            <select
              :value="selectedTile.kpiDisplay.secondaryFormat ?? 'number'"
              @change="updateKPIDisplay('secondaryFormat', ($event.target as HTMLSelectElement).value)"
            >
              <option value="number">Number</option>
              <option value="percent">Percent</option>
              <option value="hours">Hours</option>
              <option value="score">Score</option>
            </select>
          </div>
        </template>
      </section>

      <!-- Applied Filters -->
      <section class="config-panel__section">
        <h4 class="config-panel__section-title">Applied Filters</h4>
        <p class="config-panel__description">
          Select which global dashboard filters should apply to this tile
        </p>
        <div class="config-panel__checkboxes">
          <label
            v-for="filterKey in availableFilters"
            :key="filterKey"
            class="config-panel__checkbox"
          >
            <input
              type="checkbox"
              :checked="(selectedTile.appliedFilters ?? []).includes(filterKey)"
              @change="toggleAppliedFilter(filterKey)"
            />
            {{ formatFilterLabel(filterKey) }}
          </label>
        </div>
      </section>

      <!-- Layout -->
      <section class="config-panel__section">
        <h4 class="config-panel__section-title">Layout</h4>
        <div class="config-panel__row">
          <div class="config-panel__field">
            <label>Column Span</label>
            <input
              type="number"
              :value="selectedTile.layout?.colSpan ?? 4"
              min="1"
              max="12"
              @input="updateLayout('colSpan', parseInt(($event.target as HTMLInputElement).value) || 4)"
            />
          </div>
          <div class="config-panel__field">
            <label>Row Span</label>
            <input
              type="number"
              :value="selectedTile.layout?.rowSpan ?? 2"
              min="1"
              max="8"
              @input="updateLayout('rowSpan', parseInt(($event.target as HTMLInputElement).value) || 2)"
            />
          </div>
        </div>
      </section>

      <!-- Detail View (Drill-down) -->
      <section class="config-panel__section">
        <h4 class="config-panel__section-title">Detail View (Drill-down)</h4>

        <div class="config-panel__field">
          <label>
            <input
              type="checkbox"
              :checked="!!selectedTile.detailView"
              @change="toggleDetailView"
            />
            Enable drill-down on click
          </label>
        </div>

        <template v-if="selectedTile.detailView">
          <!-- Inherit Filters -->
          <div class="config-panel__field">
            <label>
              <input
                type="checkbox"
                :checked="selectedTile.detailView.inheritFilters !== false"
                @change="updateDetailView('inheritFilters', !selectedTile.detailView.inheritFilters)"
              />
              Inherit parent tile filters
            </label>
          </div>

          <!-- Detail Query Mode -->
          <div class="config-panel__field">
            <label>Detail Query Mode</label>
            <div class="config-panel__mode-switch">
              <button
                type="button"
                class="config-panel__mode-btn"
                :class="{ 'config-panel__mode-btn--active': detailQueryMode === 'builder' }"
                @click="updateDetailView('mode', 'builder')"
              >
                Visual Builder
              </button>
              <button
                type="button"
                class="config-panel__mode-btn"
                :class="{ 'config-panel__mode-btn--active': detailQueryMode === 'dsl' }"
                @click="updateDetailView('mode', 'dsl')"
              >
                DSL Query
              </button>
            </div>
          </div>

          <!-- Builder Mode for Detail View -->
          <template v-if="detailQueryMode === 'builder'">
            <div class="config-panel__field">
              <label>Columns (Dimensions)</label>
              <textarea
                class="config-panel__textarea"
                :value="detailColumnsText"
                @input="updateDetailColumns(($event.target as HTMLTextAreaElement).value)"
                placeholder="userFullName&#10;department&#10;courseTitle&#10;score&#10;completedAt"
                rows="5"
              ></textarea>
              <small class="config-panel__hint">
                One dimension per line
              </small>
            </div>
          </template>

          <!-- DSL Mode for Detail View -->
          <template v-else>
            <div class="config-panel__field">
              <label>Detail Query DSL</label>
              <textarea
                class="config-panel__dsl-editor"
                :value="selectedTile.detailView.dslConfig?.queryString ?? ''"
                @input="updateDetailDSL(($event.target as HTMLTextAreaElement).value)"
                placeholder="dimensions: userFullName, department, courseTitle&#10;where: status == :status"
                rows="6"
              ></textarea>
            </div>
          </template>
        </template>
      </section>

      <!-- Validation Errors -->
      <section v-if="tileErrors.length" class="config-panel__section config-panel__section--errors">
        <h4 class="config-panel__section-title">Validation Issues</h4>
        <ul class="config-panel__errors">
          <li v-for="(error, i) in tileErrors" :key="i">{{ error }}</li>
        </ul>
      </section>
    </div>
  </aside>

  <aside class="config-panel config-panel--empty" v-else>
    <p>Select a tile to configure</p>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSharedEditorState } from '@/composables/useEditorState';
import MetricPicker from './MetricPicker.vue';
import DimensionPicker from './DimensionPicker.vue';
import type { TileConfig } from '@/types/dashboardSchema';

const {
  selectedTile,
  selectedTileId,
  selectTile,
  updateTile,
  updateTileQuery,
  validation,
  palette,
  introspection,
} = useSharedEditorState();

const availableTransforms = computed(() => introspection.contextTransforms);

const currentTemplate = computed(() =>
  palette.find((p) => p.type === selectedTile.value?.type)
);

const tileErrors = computed(() => {
  if (!selectedTileId.value) return [];
  return validation.value.errors.filter((e) =>
    e.includes(selectedTileId.value!)
  );
});

const currentQueryMode = computed(() => {
  return selectedTile.value?.queryMode ?? 'builder';
});

const dslParametersJson = computed(() => {
  const params = selectedTile.value?.dslConfig?.parameters;
  if (!params || Object.keys(params).length === 0) return '';
  return JSON.stringify(params, null, 2);
});

const availableFilters = computed(() => {
  // Common dashboard filters
  return ['department', 'status', 'courseCategory', 'search'];
});

const detailQueryMode = computed(() => {
  return selectedTile.value?.detailView?.mode ?? 'builder';
});

const detailColumnsText = computed(() => {
  const columns = selectedTile.value?.detailView?.builderConfig?.dimensions;
  if (!columns || columns.length === 0) return '';
  return columns.join('\n');
});

function updateField<K extends keyof TileConfig>(field: K, value: TileConfig[K]) {
  if (!selectedTileId.value) return;
  updateTile(selectedTileId.value, { [field]: value });
}

function updateQuery<K extends keyof TileConfig['query']>(
  field: K,
  value: TileConfig['query'][K]
) {
  if (!selectedTileId.value) return;
  updateTileQuery(selectedTileId.value, { [field]: value });
}

function updateLayout(field: 'colSpan' | 'rowSpan' | 'minH', value: number) {
  if (!selectedTileId.value || !selectedTile.value) return;
  updateTile(selectedTileId.value, {
    layout: { ...selectedTile.value.layout, [field]: value },
  });
}

function toggleTransform(transform: string) {
  if (!selectedTile.value) return;
  const current = selectedTile.value.query.transforms ?? [];
  const index = current.indexOf(transform);
  if (index >= 0) {
    updateQuery('transforms', current.filter((t) => t !== transform));
  } else {
    updateQuery('transforms', [...current, transform]);
  }
}

function parseLimit(value: string): number | undefined {
  const num = parseInt(value);
  return isNaN(num) || num < 1 ? undefined : num;
}

function updateKPIDisplay<K extends keyof NonNullable<TileConfig['kpiDisplay']>>(
  field: K,
  value: NonNullable<TileConfig['kpiDisplay']>[K]
) {
  if (!selectedTileId.value || !selectedTile.value) return;
  const currentKPI = selectedTile.value.kpiDisplay ?? {};
  updateTile(selectedTileId.value, {
    kpiDisplay: { ...currentKPI, [field]: value },
  });
}

function toggleSecondaryKPI() {
  if (!selectedTileId.value || !selectedTile.value) return;
  const currentKPI = selectedTile.value.kpiDisplay ?? {};

  if (currentKPI.secondaryMetric) {
    // Remove secondary KPI
    updateTile(selectedTileId.value, {
      kpiDisplay: {
        ...currentKPI,
        secondaryMetric: undefined,
        secondaryLabel: undefined,
        secondaryFormat: undefined,
      },
    });
  } else {
    // Add secondary KPI with second metric if available
    const secondMetric = selectedTile.value.query?.metrics[1];
    updateTile(selectedTileId.value, {
      kpiDisplay: {
        ...currentKPI,
        secondaryMetric: secondMetric ?? '',
        secondaryFormat: 'number',
      },
    });
  }
}

function switchQueryMode(mode: 'builder' | 'dsl') {
  if (!selectedTileId.value) return;
  updateTile(selectedTileId.value, { queryMode: mode });
}

function updateDSLQuery(queryString: string) {
  if (!selectedTileId.value || !selectedTile.value) return;
  const currentDSL = selectedTile.value.dslConfig ?? {};
  updateTile(selectedTileId.value, {
    dslConfig: { ...currentDSL, queryString },
  });
}

function updateDSLParameters(jsonString: string) {
  if (!selectedTileId.value || !selectedTile.value) return;
  try {
    const parameters = jsonString.trim() ? JSON.parse(jsonString) : {};
    const currentDSL = selectedTile.value.dslConfig ?? { queryString: '' };
    updateTile(selectedTileId.value, {
      dslConfig: { ...currentDSL, parameters },
    });
  } catch (e) {
    // Invalid JSON - ignore for now, user is still typing
    console.warn('Invalid JSON parameters:', e);
  }
}

function toggleAppliedFilter(filterKey: string) {
  if (!selectedTileId.value || !selectedTile.value) return;
  const current = selectedTile.value.appliedFilters ?? [];
  const index = current.indexOf(filterKey);

  if (index >= 0) {
    updateTile(selectedTileId.value, {
      appliedFilters: current.filter((f) => f !== filterKey),
    });
  } else {
    updateTile(selectedTileId.value, {
      appliedFilters: [...current, filterKey],
    });
  }
}

function formatFilterLabel(key: string): string {
  // Convert camelCase to Title Case
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function toggleDetailView() {
  if (!selectedTileId.value || !selectedTile.value) return;

  if (selectedTile.value.detailView) {
    // Disable detail view
    updateTile(selectedTileId.value, { detailView: undefined });
  } else {
    // Enable detail view with defaults
    updateTile(selectedTileId.value, {
      detailView: {
        mode: 'builder',
        inheritFilters: true,
        builderConfig: {
          metrics: [],
          dimensions: [],
        },
      },
    });
  }
}

function updateDetailView<K extends keyof NonNullable<TileConfig['detailView']>>(
  field: K,
  value: NonNullable<TileConfig['detailView']>[K]
) {
  if (!selectedTileId.value || !selectedTile.value?.detailView) return;
  const currentDetail = selectedTile.value.detailView;
  updateTile(selectedTileId.value, {
    detailView: { ...currentDetail, [field]: value },
  });
}

function updateDetailColumns(text: string) {
  if (!selectedTileId.value || !selectedTile.value?.detailView) return;
  const dimensions = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const currentDetail = selectedTile.value.detailView;
  updateTile(selectedTileId.value, {
    detailView: {
      ...currentDetail,
      builderConfig: {
        ...(currentDetail.builderConfig ?? {}),
        metrics: [],
        dimensions,
      },
    },
  });
}

function updateDetailDSL(queryString: string) {
  if (!selectedTileId.value || !selectedTile.value?.detailView) return;
  const currentDetail = selectedTile.value.detailView;
  updateTile(selectedTileId.value, {
    detailView: {
      ...currentDetail,
      dslConfig: { queryString },
    },
  });
}
</script>

<style scoped>
.config-panel {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  max-height: 100%;
  overflow: hidden;
}

.config-panel--empty {
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #9ca3af;
}

.config-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.config-panel__header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.config-panel__close {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 0.875rem;
}

.config-panel__close:hover {
  color: #1f2937;
}

.config-panel__content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.config-panel__section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.config-panel__section--errors {
  background: #fef2f2;
  padding: 0.75rem;
  border-radius: 0.5rem;
}

.config-panel__section-title {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.config-panel__description {
  margin: 0.5rem 0 0.75rem;
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.4;
}

.config-panel__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.config-panel__field label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #4b5563;
}

.config-panel__field input,
.config-panel__field select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.config-panel__field input:focus,
.config-panel__field select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.config-panel__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.config-panel__checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.config-panel__checkbox {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: #4b5563;
  cursor: pointer;
}

.config-panel__errors {
  margin: 0;
  padding-left: 1rem;
  font-size: 0.75rem;
  color: #dc2626;
}

.config-panel__errors li {
  margin-bottom: 0.25rem;
}

/* Query Mode Switcher */
.config-panel__mode-switch {
  display: flex;
  background: #f3f4f6;
  border-radius: 0.5rem;
  padding: 0.25rem;
  gap: 0.25rem;
}

.config-panel__mode-btn {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #6b7280;
  transition: all 0.15s;
}

.config-panel__mode-btn:hover {
  color: #374151;
}

.config-panel__mode-btn--active {
  background: white;
  color: #1f2937;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* DSL Editor */
.config-panel__dsl-editor,
.config-panel__params-editor {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
  resize: vertical;
}

.config-panel__dsl-editor:focus,
.config-panel__params-editor:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.config-panel__hint {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.6875rem;
  color: #9ca3af;
  font-style: italic;
}

/* Textarea */
.config-panel__textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
  resize: vertical;
}

.config-panel__textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}
</style>
