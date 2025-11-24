<template>
  <div class="tile-preview" v-if="selectedTile">
    <header class="tile-preview__header">
      <h4>Preview</h4>
      <button class="tile-preview__refresh" @click="refresh">Refresh</button>
    </header>

    <div class="tile-preview__content">
      <div v-if="loading" class="tile-preview__loading">
        Loading preview...
      </div>

      <div v-else-if="error" class="tile-preview__error">
        {{ error }}
      </div>

      <div v-else-if="!selectedTile.query.metrics.length" class="tile-preview__empty">
        Select at least one metric to see preview
      </div>

      <!-- KPI Preview -->
      <div v-else-if="selectedTile.type === 'kpi'" class="tile-preview__kpi">
        <span class="tile-preview__kpi-value">{{ formatValue(previewData[0]) }}</span>
        <span class="tile-preview__kpi-label">{{ selectedTile.query.metrics[0] }}</span>
      </div>

      <!-- Table Preview -->
      <div v-else-if="selectedTile.type === 'table'" class="tile-preview__table-wrapper">
        <table class="tile-preview__table">
          <thead>
            <tr>
              <th v-for="col in previewColumns" :key="col">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in previewData.slice(0, 5)" :key="i">
              <td v-for="col in previewColumns" :key="col">
                {{ formatCell(row[col]) }}
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="previewData.length > 5" class="tile-preview__more">
          +{{ previewData.length - 5 }} more rows
        </p>
      </div>

      <!-- Chart Preview (simplified) -->
      <div v-else class="tile-preview__chart">
        <div class="tile-preview__chart-bars">
          <div
            v-for="(row, i) in previewData.slice(0, 6)"
            :key="i"
            class="tile-preview__chart-bar"
            :style="{ height: getBarHeight(row) }"
          >
            <span class="tile-preview__chart-label">{{ getBarLabel(row) }}</span>
          </div>
        </div>
        <p class="tile-preview__chart-note">
          {{ previewData.length }} data points
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useSharedEditorState } from '@/composables/useEditorState';
import { generateFakeDatabase } from '@/utils/fakeDataGenerator';
import { createDashboardEngine } from '@/metricforge';
import type { Row } from 'metricforge/src/semanticEngine';

const { selectedTile } = useSharedEditorState();

const loading = ref(false);
const error = ref<string | null>(null);
const previewData = ref<Row[]>([]);

const previewColumns = computed(() => {
  if (!previewData.value.length) return [];
  return Object.keys(previewData.value[0]);
});

// Use sample data for preview
const sampleDb = generateFakeDatabase({ seed: 12345 });
const engine = createDashboardEngine(sampleDb);

async function refresh() {
  if (!selectedTile.value) return;

  loading.value = true;
  error.value = null;

  try {
    // Small delay to show loading state
    await new Promise((r) => setTimeout(r, 100));

    const query = selectedTile.value.query;
    if (!query.metrics.length) {
      previewData.value = [];
      return;
    }

    const spec = {
      metrics: query.metrics,
      dimensions: query.dimensions,
      where: query.where,
    };

    let results = engine.runQuery(spec);

    // Apply limit
    if (query.limit && results.length > query.limit) {
      results = results.slice(0, query.limit);
    }

    previewData.value = results;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Preview failed';
    previewData.value = [];
  } finally {
    loading.value = false;
  }
}

// Debounced refresh on tile changes
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  () => selectedTile.value ? JSON.stringify(selectedTile.value.query) : null,
  () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(refresh, 300);
  },
  { immediate: true }
);

function formatValue(row: Row | undefined): string {
  if (!row || !selectedTile.value) return '—';
  const metric = selectedTile.value.query.metrics[0];
  const value = row[metric];
  if (typeof value === 'number') {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(value ?? '—');
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(value);
}

function getBarHeight(row: Row): string {
  if (!selectedTile.value) return '10%';
  const metric = selectedTile.value.query.metrics[0];
  const value = row[metric];
  if (typeof value !== 'number') return '10%';

  const maxVal = Math.max(
    ...previewData.value
      .slice(0, 6)
      .map((r) => (typeof r[metric] === 'number' ? r[metric] as number : 0))
  );
  return `${Math.max(10, (value / maxVal) * 100)}%`;
}

function getBarLabel(row: Row): string {
  if (!selectedTile.value?.query.dimensions?.length) return '';
  const dim = selectedTile.value.query.dimensions[0];
  const val = row[dim];
  return String(val ?? '').slice(0, 10);
}
</script>

<style scoped>
.tile-preview {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.tile-preview__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.tile-preview__header h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.tile-preview__refresh {
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  cursor: pointer;
  color: #4b5563;
}

.tile-preview__refresh:hover {
  background: #f9fafb;
}

.tile-preview__content {
  padding: 1rem;
  min-height: 120px;
}

.tile-preview__loading,
.tile-preview__error,
.tile-preview__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  color: #9ca3af;
  font-size: 0.875rem;
}

.tile-preview__error {
  color: #dc2626;
}

.tile-preview__kpi {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100px;
}

.tile-preview__kpi-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
}

.tile-preview__kpi-label {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.tile-preview__table-wrapper {
  overflow-x: auto;
}

.tile-preview__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
}

.tile-preview__table th,
.tile-preview__table td {
  padding: 0.375rem 0.5rem;
  text-align: left;
  border-bottom: 1px solid #f3f4f6;
}

.tile-preview__table th {
  font-weight: 600;
  color: #374151;
  background: #f9fafb;
}

.tile-preview__table td {
  color: #4b5563;
}

.tile-preview__more {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: #9ca3af;
  text-align: center;
}

.tile-preview__chart {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tile-preview__chart-bars {
  display: flex;
  align-items: flex-end;
  gap: 0.25rem;
  height: 80px;
}

.tile-preview__chart-bar {
  flex: 1;
  background: linear-gradient(to top, #3b82f6, #60a5fa);
  border-radius: 0.25rem 0.25rem 0 0;
  position: relative;
  min-width: 20px;
}

.tile-preview__chart-label {
  position: absolute;
  bottom: -1.25rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.625rem;
  color: #6b7280;
  white-space: nowrap;
}

.tile-preview__chart-note {
  margin: 1rem 0 0;
  font-size: 0.75rem;
  color: #9ca3af;
  text-align: center;
}
</style>
