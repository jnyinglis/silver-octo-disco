<template>
  <div class="filter-config">
    <header class="filter-config__header">
      <h4>Dashboard Filters</h4>
      <button class="filter-config__add" @click="addFilter">+ Add Filter</button>
    </header>

    <div v-if="!filters.length" class="filter-config__empty">
      No filters configured. Click "Add Filter" to create one.
    </div>

    <div v-else class="filter-config__list">
      <div
        v-for="(filter, index) in filters"
        :key="filter.key"
        class="filter-config__item"
      >
        <div class="filter-config__item-header">
          <input
            v-model="filter.label"
            class="filter-config__input"
            placeholder="Filter Label"
            @input="onChange"
          />
          <button
            class="filter-config__delete"
            title="Delete filter"
            @click="deleteFilter(index)"
          >
            ×
          </button>
        </div>

        <div class="filter-config__item-row">
          <div class="filter-config__field">
            <label>Key</label>
            <input
              v-model="filter.key"
              class="filter-config__input filter-config__input--small"
              placeholder="filterKey"
              @input="onChange"
            />
          </div>

          <div class="filter-config__field">
            <label>Type</label>
            <select
              v-model="filter.type"
              class="filter-config__select"
              @change="onChange"
            >
              <option value="select">Select</option>
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
            </select>
          </div>
        </div>

        <div v-if="filter.type === 'select'" class="filter-config__item-row">
          <div class="filter-config__field filter-config__field--full">
            <label>Options (comma-separated)</label>
            <input
              :value="filter.options?.join(', ') ?? ''"
              class="filter-config__input"
              placeholder="Option1, Option2, Option3"
              @input="updateOptions(filter, $event)"
            />
          </div>
        </div>

        <div class="filter-config__item-row">
          <div class="filter-config__field">
            <label>Default Value</label>
            <input
              v-if="filter.type === 'select'"
              :value="filter.defaultValue"
              class="filter-config__input filter-config__input--small"
              placeholder="Default"
              @input="(e) => { filter.defaultValue = (e.target as HTMLInputElement).value; onChange(); }"
            />
            <input
              v-else
              :value="filter.defaultValue"
              :type="filter.type === 'number' ? 'number' : filter.type === 'date' ? 'date' : 'text'"
              class="filter-config__input filter-config__input--small"
              placeholder="Default"
              @input="(e) => { filter.defaultValue = (e.target as HTMLInputElement).value; onChange(); }"
            />
          </div>

          <div class="filter-config__field filter-config__field--checkbox">
            <label>
              <input
                v-model="filter.required"
                type="checkbox"
                @change="onChange"
              />
              Required
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useSharedEditorState } from '@/composables/useEditorState';
import type { FilterDefinition } from '@/types/dashboardSchema';

const { dashboard, updateDashboard } = useSharedEditorState();

const filters = ref<FilterDefinition[]>(
  dashboard.value.availableFilters ?? []
);

// Watch for external changes to dashboard filters
watch(
  () => dashboard.value.availableFilters,
  (newFilters) => {
    if (newFilters && JSON.stringify(newFilters) !== JSON.stringify(filters.value)) {
      filters.value = newFilters;
    }
  }
);

function addFilter() {
  filters.value.push({
    key: `filter${filters.value.length + 1}`,
    label: 'New Filter',
    type: 'text',
    defaultValue: '',
    required: false,
  });
  onChange();
}

function deleteFilter(index: number) {
  filters.value.splice(index, 1);
  onChange();
}

function updateOptions(filter: FilterDefinition, event: Event) {
  const input = event.target as HTMLInputElement;
  filter.options = input.value
    .split(',')
    .map((opt) => opt.trim())
    .filter(Boolean);
  onChange();
}

function onChange() {
  updateDashboard({ availableFilters: [...filters.value] });
}
</script>

<style scoped>
.filter-config {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-config__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.filter-config__header h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.filter-config__add {
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 0.375rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.filter-config__add:hover {
  background: #1d4ed8;
}

.filter-config__empty {
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
  padding: 2rem 1rem;
}

.filter-config__list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-config__item {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: #f9fafb;
}

.filter-config__item-header {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.filter-config__item-row {
  display: flex;
  gap: 0.75rem;
}

.filter-config__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.filter-config__field--full {
  flex: 1 1 100%;
}

.filter-config__field--checkbox {
  justify-content: flex-end;
}

.filter-config__field--checkbox label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #4b5563;
  cursor: pointer;
}

.filter-config__field label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
}

.filter-config__input {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background: white;
}

.filter-config__input:focus {
  outline: none;
  border-color: #3b82f6;
  ring: 2px;
  ring-color: rgba(59, 130, 246, 0.1);
}

.filter-config__input--small {
  font-size: 0.8125rem;
}

.filter-config__select {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
}

.filter-config__select:focus {
  outline: none;
  border-color: #3b82f6;
}

.filter-config__delete {
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 0.375rem;
  width: 1.75rem;
  height: 1.75rem;
  font-size: 1.25rem;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.filter-config__delete:hover {
  background: #fecaca;
}
</style>
