<template>
  <div class="metric-picker">
    <label class="metric-picker__label">{{ label }}</label>
    <div class="metric-picker__search">
      <input
        v-model="search"
        type="text"
        placeholder="Search metrics..."
        class="metric-picker__input"
      />
    </div>
    <div class="metric-picker__list">
      <label
        v-for="metric in filteredMetrics"
        :key="metric.name"
        class="metric-picker__item"
        :class="{
          'metric-picker__item--selected': modelValue.includes(metric.name),
          'metric-picker__item--recommended': recommendedMetrics.includes(metric.name),
        }"
      >
        <input
          type="checkbox"
          :checked="modelValue.includes(metric.name)"
          @change="toggle(metric.name)"
        />
        <div class="metric-picker__item-content">
          <span class="metric-picker__item-name">{{ metric.label }}</span>
          <span class="metric-picker__item-id">{{ metric.name }}</span>
        </div>
        <span v-if="metric.format" class="metric-picker__format">{{ metric.format }}</span>
        <span
          v-if="recommendedMetrics.includes(metric.name)"
          class="metric-picker__recommended"
        >
          Recommended
        </span>
      </label>
      <p v-if="filteredMetrics.length === 0" class="metric-picker__empty">
        No metrics found
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSharedEditorState } from '@/composables/useEditorState';

const props = withDefaults(defineProps<{
  modelValue: string[];
  label?: string;
  recommendedMetrics?: string[];
}>(), {
  label: 'Metrics',
  recommendedMetrics: () => [],
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
}>();

const { introspection } = useSharedEditorState();
const search = ref('');

const filteredMetrics = computed(() => {
  const query = search.value.toLowerCase();
  let metrics = introspection.metrics;

  if (query) {
    metrics = metrics.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.label.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query)
    );
  }

  // Sort recommended first
  return [...metrics].sort((a, b) => {
    const aRec = props.recommendedMetrics.includes(a.name) ? 0 : 1;
    const bRec = props.recommendedMetrics.includes(b.name) ? 0 : 1;
    return aRec - bRec;
  });
});

function toggle(name: string) {
  const current = [...props.modelValue];
  const index = current.indexOf(name);
  if (index >= 0) {
    current.splice(index, 1);
  } else {
    current.push(name);
  }
  emit('update:modelValue', current);
}
</script>

<style scoped>
.metric-picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.metric-picker__label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric-picker__search {
  position: relative;
}

.metric-picker__input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.metric-picker__input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.metric-picker__list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 0.25rem;
}

.metric-picker__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background 0.1s ease;
}

.metric-picker__item:hover {
  background: #f9fafb;
}

.metric-picker__item--selected {
  background: #eff6ff;
}

.metric-picker__item--recommended {
  border-left: 2px solid #10b981;
}

.metric-picker__item input[type="checkbox"] {
  flex-shrink: 0;
}

.metric-picker__item-content {
  flex: 1;
  min-width: 0;
}

.metric-picker__item-name {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
}

.metric-picker__item-id {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
}

.metric-picker__format {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  background: #f3f4f6;
  color: #4b5563;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

.metric-picker__recommended {
  font-size: 0.625rem;
  font-weight: 600;
  background: #d1fae5;
  color: #047857;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

.metric-picker__empty {
  padding: 1rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
}
</style>
