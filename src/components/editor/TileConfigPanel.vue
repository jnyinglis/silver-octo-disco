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

      <!-- Query Binding -->
      <section class="config-panel__section">
        <h4 class="config-panel__section-title">Query Binding</h4>

        <MetricPicker
          :model-value="selectedTile.query.metrics"
          :recommended-metrics="currentTemplate?.recommendedMetrics ?? []"
          @update:model-value="updateQuery('metrics', $event)"
        />

        <DimensionPicker
          :model-value="selectedTile.query.dimensions ?? []"
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
                :checked="(selectedTile.query.transforms ?? []).includes(transform)"
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
            :value="selectedTile.query.limit"
            placeholder="No limit"
            min="1"
            @input="updateQuery('limit', parseLimit(($event.target as HTMLInputElement).value))"
          />
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
</style>
