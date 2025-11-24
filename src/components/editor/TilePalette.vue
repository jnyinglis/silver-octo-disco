<template>
  <aside class="tile-palette">
    <h3 class="tile-palette__title">Add Tile</h3>
    <div class="tile-palette__list">
      <button
        v-for="template in palette"
        :key="template.type"
        class="tile-palette__item"
        :draggable="true"
        @dragstart="onDragStart($event, template)"
        @click="onAdd(template)"
      >
        <span class="tile-palette__icon">{{ getIcon(template.type) }}</span>
        <span class="tile-palette__label">{{ template.label }}</span>
        <span class="tile-palette__hint">{{ getHint(template) }}</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useSharedEditorState } from '@/composables/useEditorState';
import type { CardTemplate } from '@/services/editorPalette';

const emit = defineEmits<{
  (e: 'add', template: CardTemplate): void;
}>();

const { palette, addTile } = useSharedEditorState();

const icons: Record<string, string> = {
  kpi: '#',
  table: '=',
  line: '~',
  bar: '|',
  combo: '+',
  text: 'T',
  comparison: '<>',
};

function getIcon(type: string): string {
  return icons[type] ?? '?';
}

function getHint(template: CardTemplate): string {
  const metrics = template.recommendedMetrics.slice(0, 2).join(', ');
  return metrics ? `e.g. ${metrics}` : '';
}

function onDragStart(event: DragEvent, template: CardTemplate) {
  event.dataTransfer?.setData('application/json', JSON.stringify(template));
  event.dataTransfer!.effectAllowed = 'copy';
}

function onAdd(template: CardTemplate) {
  addTile(template);
  emit('add', template);
}
</script>

<style scoped>
.tile-palette {
  background: white;
  border-radius: 0.75rem;
  padding: 1rem;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
}

.tile-palette__title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tile-palette__list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tile-palette__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  cursor: grab;
  text-align: left;
  transition: all 0.15s ease;
}

.tile-palette__item:hover {
  background: #eff6ff;
  border-color: #3b82f6;
}

.tile-palette__item:active {
  cursor: grabbing;
}

.tile-palette__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 0.375rem;
  font-weight: 700;
  font-size: 0.875rem;
}

.tile-palette__label {
  font-weight: 500;
  color: #1f2937;
  flex: 1;
}

.tile-palette__hint {
  font-size: 0.75rem;
  color: #9ca3af;
  max-width: 8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
