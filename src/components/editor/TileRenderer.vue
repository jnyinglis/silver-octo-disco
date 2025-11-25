<template>
  <article
    v-if="mode === 'preview'"
    class="tile-card"
    :class="{ 'tile-card--active': isActive }"
    @click="emit('select')"
  >
    <!-- Render as Card.vue style for preview mode -->
    <header class="tile-card__header">
      <div class="tile-card__titles">
        <h3>{{ tile.title }}</h3>
        <p v-if="filterBadges.length" class="tile-card__filters">
          <span v-for="filter in filterBadges" :key="filter" class="tile-card__filter">
            {{ filter }}
          </span>
        </p>
      </div>
      <span aria-hidden="true" class="tile-card__chevron">›</span>
    </header>

    <!-- KPI Display -->
    <div v-if="tile.type === 'kpi' && summaryData" class="tile-card__summary">
      <span class="tile-card__value">{{ formattedPrimaryValue }}</span>
      <span class="tile-card__label">{{ primaryLabel }}</span>
      <span v-if="formattedSecondaryValue" class="tile-card__trend">
        {{ formattedSecondaryValue }} {{ secondaryLabel }}
      </span>
    </div>

    <!-- Other tile types (placeholder for now) -->
    <div v-else class="tile-card__summary">
      <span class="tile-card__label">{{ tile.type }} preview</span>
    </div>
  </article>

  <!-- Edit mode: simple tile display -->
  <div v-else class="tile-editor" :class="{ 'tile-editor--active': isActive }">
    <div class="tile-editor__header">
      <span class="tile-editor__type">{{ tile.type }}</span>
      <span class="tile-editor__title">{{ tile.title }}</span>
    </div>
    <div class="tile-editor__content">
      <div v-if="tile.query?.metrics.length" class="tile-editor__metrics">
        <span v-for="metric in tile.query.metrics" :key="metric" class="tile-editor__metric">
          {{ metric }}
        </span>
      </div>
      <div v-if="tile.query?.dimensions?.length" class="tile-editor__dimensions">
        by {{ tile.query.dimensions.join(', ') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useSharedEditorState } from '@/composables/useEditorState';
import { generateFakeDatabase } from '@/utils/fakeDataGenerator';
import { createDashboardEngine } from '@/metricforge';
import type { TileConfig } from '@/types/dashboardSchema';
import type { Row } from '@/metricforge';
import { buildBuilderQuery, buildDSLQuery } from '@/utils/querySpecBuilder';

interface Props {
  tile: TileConfig;
  mode: 'edit' | 'preview';
  summaryData?: Row;
  isActive?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
});

const emit = defineEmits<{
  (event: 'select'): void;
}>();

const { globalFilters } = useSharedEditorState();

// Query execution for preview mode
const executedData = ref<Row | undefined>(undefined);
const sampleDb = generateFakeDatabase({ seed: 12345 });
const engine = createDashboardEngine(sampleDb);

// Execute query when tile changes (in preview mode)
watch(
  () => [props.tile, props.mode, globalFilters.value],
  () => {
    if (props.mode === 'preview') {
      executeQuery();
    }
  },
  { immediate: true, deep: true }
);

function executeQuery() {
  try {
    const queryBuilder =
      props.tile.queryMode === 'dsl'
        ? buildDSLQuery(props.tile.dslConfig, props.tile.appliedFilters, globalFilters.value)
        : buildBuilderQuery(props.tile.query, props.tile.appliedFilters, globalFilters.value);

    if (!queryBuilder) {
      executedData.value = undefined;
      return;
    }

    const results = engine.runQuery(queryBuilder.spec);
    executedData.value = results[0]; // Use first row for KPI summary
  } catch (e) {
    console.error('Query execution failed:', e);
    executedData.value = undefined;
  }
}

// Use executed data if in preview mode, otherwise use prop
const summaryData = computed(() => {
  return props.mode === 'preview' ? executedData.value : props.summaryData;
});

// Filter badges (from appliedFilters)
const filterBadges = computed(() => {
  if (!props.tile.appliedFilters) return [];
  // Convert filter keys to display labels
  return props.tile.appliedFilters.map((key) => {
    // Capitalize and format
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
  });
});

// Primary KPI
const primaryLabel = computed(() => {
  if (!props.tile.kpiDisplay) {
    return props.tile.query?.metrics[0] ?? '';
  }
  return props.tile.kpiDisplay.primaryLabel ?? props.tile.kpiDisplay.primaryMetric;
});

const formattedPrimaryValue = computed(() => {
  if (!summaryData.value || !props.tile.kpiDisplay) return '—';

  const metricName = props.tile.kpiDisplay.primaryMetric ?? props.tile.query?.metrics[0];
  if (!metricName) return '—';

  const value = summaryData.value[metricName];
  if (typeof value !== 'number') return String(value ?? '—');

  return formatByType(value, props.tile.kpiDisplay.primaryFormat ?? 'number');
});

// Secondary KPI
const secondaryLabel = computed(() => {
  if (!props.tile.kpiDisplay?.secondaryMetric) return '';
  return props.tile.kpiDisplay.secondaryLabel ?? props.tile.kpiDisplay.secondaryMetric;
});

const formattedSecondaryValue = computed(() => {
  if (!summaryData.value || !props.tile.kpiDisplay?.secondaryMetric) return '';

  const metricName = props.tile.kpiDisplay.secondaryMetric;
  const value = summaryData.value[metricName];
  if (typeof value !== 'number') return '';

  return formatByType(value, props.tile.kpiDisplay.secondaryFormat ?? 'number');
});

function formatByType(value: number, format: string): string {
  switch (format) {
    case 'percent':
      return `${(value * 100).toFixed(1)}%`;
    case 'hours':
      return `${value.toFixed(1)}h`;
    case 'score':
      return value.toFixed(0);
    case 'number':
    default:
      return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
}
</script>

<style scoped>
/* Preview Mode - Card.vue styling */
.tile-card {
  position: relative;
  background: white;
  border-radius: 1.25rem;
  padding: 1.5rem;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.12);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.tile-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
}

.tile-card--active {
  outline: 3px solid rgba(59, 130, 246, 0.5);
}

.tile-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.tile-card__titles h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #111827;
}

.tile-card__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin: 0.35rem 0 0;
  color: #6b7280;
  font-size: 0.75rem;
}

.tile-card__filter {
  background: #eff6ff;
  border-radius: 999px;
  padding: 0.15rem 0.65rem;
}

.tile-card__chevron {
  font-size: 1.5rem;
  color: #93c5fd;
  transition: transform 0.2s ease;
}

.tile-card:hover .tile-card__chevron {
  transform: translateX(6px);
}

.tile-card__summary {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.tile-card__value {
  font-size: 2.35rem;
  font-weight: 700;
  letter-spacing: -0.04em;
  color: #1d4ed8;
}

.tile-card__label {
  color: #6b7280;
  font-size: 0.95rem;
}

.tile-card__trend {
  color: #059669;
  font-size: 0.85rem;
  font-weight: 600;
}

/* Edit Mode - Simple tile display */
.tile-editor {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  flex-direction: column;
  min-height: 100px;
}

.tile-editor:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.tile-editor--active {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}

.tile-editor__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.tile-editor__type {
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

.tile-editor__title {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.875rem;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tile-editor__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tile-editor__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.tile-editor__metric {
  background: #f3f4f6;
  color: #4b5563;
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
}

.tile-editor__dimensions {
  font-size: 0.75rem;
  color: #6b7280;
}
</style>
