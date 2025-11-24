<template>
  <div class="dimension-picker">
    <label class="dimension-picker__label">{{ label }}</label>
    <div class="dimension-picker__search">
      <input
        v-model="search"
        type="text"
        placeholder="Search dimensions..."
        class="dimension-picker__input"
      />
    </div>
    <div class="dimension-picker__list">
      <label
        v-for="dim in filteredDimensions"
        :key="dim.name"
        class="dimension-picker__item"
        :class="{
          'dimension-picker__item--selected': modelValue.includes(dim.name),
          'dimension-picker__item--recommended': recommendedDimensions.includes(dim.name),
        }"
      >
        <input
          type="checkbox"
          :checked="modelValue.includes(dim.name)"
          @change="toggle(dim.name)"
        />
        <div class="dimension-picker__item-content">
          <span class="dimension-picker__item-name">{{ dim.label }}</span>
          <span class="dimension-picker__item-id">{{ dim.name }}</span>
        </div>
        <span class="dimension-picker__table">{{ dim.table }}</span>
        <span
          v-if="recommendedDimensions.includes(dim.name)"
          class="dimension-picker__recommended"
        >
          Recommended
        </span>
      </label>
      <p v-if="filteredDimensions.length === 0" class="dimension-picker__empty">
        No dimensions found
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
  recommendedDimensions?: string[];
}>(), {
  label: 'Dimensions',
  recommendedDimensions: () => [],
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
}>();

const { introspection } = useSharedEditorState();
const search = ref('');

const filteredDimensions = computed(() => {
  const query = search.value.toLowerCase();
  let dimensions = introspection.dimensions;

  if (query) {
    dimensions = dimensions.filter(
      (d) =>
        d.name.toLowerCase().includes(query) ||
        d.label.toLowerCase().includes(query) ||
        d.table.toLowerCase().includes(query)
    );
  }

  // Sort recommended first
  return [...dimensions].sort((a, b) => {
    const aRec = props.recommendedDimensions.includes(a.name) ? 0 : 1;
    const bRec = props.recommendedDimensions.includes(b.name) ? 0 : 1;
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
.dimension-picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dimension-picker__label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dimension-picker__search {
  position: relative;
}

.dimension-picker__input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.dimension-picker__input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.dimension-picker__list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 0.25rem;
}

.dimension-picker__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background 0.1s ease;
}

.dimension-picker__item:hover {
  background: #f9fafb;
}

.dimension-picker__item--selected {
  background: #eff6ff;
}

.dimension-picker__item--recommended {
  border-left: 2px solid #10b981;
}

.dimension-picker__item input[type="checkbox"] {
  flex-shrink: 0;
}

.dimension-picker__item-content {
  flex: 1;
  min-width: 0;
}

.dimension-picker__item-name {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
}

.dimension-picker__item-id {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
}

.dimension-picker__table {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  background: #fef3c7;
  color: #92400e;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

.dimension-picker__recommended {
  font-size: 0.625rem;
  font-weight: 600;
  background: #d1fae5;
  color: #047857;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

.dimension-picker__empty {
  padding: 1rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
}
</style>
