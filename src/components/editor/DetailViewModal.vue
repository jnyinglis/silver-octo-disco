<template>
  <div class="detail-modal" @click.self="emit('close')">
    <div class="detail-modal__content">
      <!-- Header -->
      <header class="detail-modal__header">
        <div>
          <h2>{{ tile.title }} - Details</h2>
          <p v-if="filterInfo" class="detail-modal__filter-info">
            {{ filterInfo }}
          </p>
        </div>
        <button class="detail-modal__close" @click="emit('close')" title="Close">
          ×
        </button>
      </header>

      <!-- Loading State -->
      <div v-if="loading" class="detail-modal__loading">
        Loading details...
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="detail-modal__error">
        {{ error }}
      </div>

      <!-- Empty State -->
      <div v-else-if="!detailData.length" class="detail-modal__empty">
        No data available
      </div>

      <!-- Data Table -->
      <div v-else class="detail-modal__table-wrapper">
        <table class="detail-modal__table">
          <thead>
            <tr>
              <th v-for="col in displayColumns" :key="col">
                {{ getColumnLabel(col) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in detailData" :key="i">
              <td v-for="col in displayColumns" :key="col">
                {{ formatCell(row[col]) }}
              </td>
            </tr>
          </tbody>
        </table>
        <div class="detail-modal__footer">
          {{ detailData.length }} row{{ detailData.length !== 1 ? 's' : '' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSharedEditorState } from '@/composables/useEditorState';
import { generateFakeDatabase } from '@/utils/fakeDataGenerator';
import { createDashboardEngine } from '@/metricforge';
import type { TileConfig } from '@/types/dashboardSchema';
import type { Row } from '@/metricforge';

interface Props {
  tile: TileConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (event: 'close'): void;
}>();

const { globalFilters } = useSharedEditorState();

const loading = ref(true);
const error = ref<string | null>(null);
const detailData = ref<Row[]>([]);

const sampleDb = generateFakeDatabase({ seed: 12345 });
const engine = createDashboardEngine(sampleDb);

// Determine which columns to display
const displayColumns = computed(() => {
  if (!detailData.value.length) return [];

  const detailView = props.tile.detailView;

  // If columns are explicitly configured, use those
  if (detailView?.columns && detailView.columns.length > 0) {
    return detailView.columns;
  }

  // Otherwise, use all columns from the data
  return Object.keys(detailData.value[0]);
});

// Get column label (use custom label if configured)
function getColumnLabel(column: string): string {
  const customLabel = props.tile.detailView?.columnLabels?.[column];
  if (customLabel) return customLabel;

  // Format column name: camelCase -> Title Case
  return column
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// Generate filter info text
const filterInfo = computed(() => {
  const detailView = props.tile.detailView;
  if (!detailView?.inheritFilters || !props.tile.appliedFilters?.length) {
    return '';
  }

  const activeFilters = props.tile.appliedFilters
    .filter((key) => {
      const value = globalFilters.value[key];
      return value && value !== 'all' && value !== '';
    })
    .map((key) => `${key}: ${globalFilters.value[key]}`);

  return activeFilters.length > 0
    ? `Filtered by ${activeFilters.join(', ')}`
    : '';
});

// Execute detail query
async function executeDetailQuery() {
  loading.value = true;
  error.value = null;

  try {
    const detailView = props.tile.detailView;

    if (!detailView) {
      error.value = 'No detail view configured';
      return;
    }

    // For now, we only support builder mode
    // DSL mode would require parsing and executing DSL queries
    if (detailView.mode === 'dsl') {
      error.value = 'DSL mode not yet implemented for detail view';
      return;
    }

    const query = detailView.builderConfig;
    if (!query || !query.metrics.length) {
      error.value = 'No metrics configured for detail view';
      return;
    }

    // Build where clause with inherited filters
    const mergedWhere = { ...(query.where ?? {}) };

    if (detailView.inheritFilters && props.tile.appliedFilters) {
      props.tile.appliedFilters.forEach((filterKey) => {
        const filterValue = globalFilters.value[filterKey];
        if (filterValue && filterValue !== 'all' && filterValue !== '') {
          mergedWhere[filterKey] = filterValue;
        }
      });
    }

    const spec = {
      metrics: query.metrics,
      dimensions: query.dimensions,
      where: mergedWhere,
    };

    const results = engine.runQuery(spec);

    // Apply limit if specified
    if (query.limit && results.length > query.limit) {
      detailData.value = results.slice(0, query.limit);
    } else {
      detailData.value = results;
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Query execution failed';
    detailData.value = [];
  } finally {
    loading.value = false;
  }
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(value);
}

onMounted(() => {
  executeDetailQuery();
});
</script>

<style scoped>
.detail-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 2rem;
}

.detail-modal__content {
  background: white;
  border-radius: 1rem;
  width: 100%;
  max-width: 1200px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
}

.detail-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.detail-modal__header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
}

.detail-modal__filter-info {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.detail-modal__close {
  background: none;
  border: none;
  font-size: 2rem;
  line-height: 1;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  transition: all 0.15s;
}

.detail-modal__close:hover {
  background: #f3f4f6;
  color: #374151;
}

.detail-modal__loading,
.detail-modal__error,
.detail-modal__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #9ca3af;
  font-size: 0.875rem;
}

.detail-modal__error {
  color: #dc2626;
}

.detail-modal__table-wrapper {
  flex: 1;
  overflow: auto;
  padding: 1.5rem 2rem;
}

.detail-modal__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.detail-modal__table th,
.detail-modal__table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #f3f4f6;
}

.detail-modal__table th {
  position: sticky;
  top: 0;
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.detail-modal__table td {
  color: #4b5563;
}

.detail-modal__table tbody tr:hover {
  background: #fafafa;
}

.detail-modal__footer {
  padding: 1rem 2rem;
  border-top: 1px solid #e5e7eb;
  font-size: 0.875rem;
  color: #6b7280;
  text-align: right;
}
</style>
