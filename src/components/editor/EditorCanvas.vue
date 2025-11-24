<template>
  <div
    class="editor-canvas"
    :class="`editor-canvas--${mode}`"
    :style="gridStyle"
    @dragover.prevent="mode === 'edit' && onDragOver($event)"
    @drop="mode === 'edit' ? onDrop($event) : undefined"
  >
    <div
      v-for="tile in dashboard.tiles"
      :key="tile.id"
      class="editor-canvas__tile"
      :class="{
        'editor-canvas__tile--selected': tile.id === selectedTileId,
      }"
      :style="getTileStyle(tile)"
    >
      <TileRenderer
        :tile="tile"
        :mode="mode"
        :is-active="tile.id === selectedTileId"
        @select="selectTile(tile.id)"
      />

      <div v-if="mode === 'edit'" class="editor-canvas__tile-actions">
        <button
          class="editor-canvas__action"
          title="Duplicate"
          @click.stop="duplicateTile(tile.id)"
        >
          D
        </button>
        <button
          class="editor-canvas__action editor-canvas__action--danger"
          title="Delete"
          @click.stop="deleteTile(tile.id)"
        >
          X
        </button>
      </div>
    </div>

    <div v-if="dashboard.tiles.length === 0" class="editor-canvas__empty">
      <p>Drag tiles from the palette or click to add</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSharedEditorState } from '@/composables/useEditorState';
import type { TileConfig } from '@/types/dashboardSchema';
import type { CardTemplate } from '@/services/editorPalette';
import TileRenderer from './TileRenderer.vue';

const props = withDefaults(defineProps<{ mode?: 'edit' | 'preview' }>(), {
  mode: 'edit',
});

const {
  dashboard,
  selectedTileId,
  selectTile,
  addTile,
  deleteTile,
  duplicateTile,
  palette,
} = useSharedEditorState();

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${dashboard.value.layout?.columns ?? 12}, 1fr)`,
  gap: `${dashboard.value.layout?.gutter ?? 24}px`,
}));

function getTileStyle(tile: TileConfig) {
  return {
    gridColumn: `span ${tile.layout?.colSpan ?? 4}`,
    gridRow: `span ${tile.layout?.rowSpan ?? 2}`,
  };
}

function onDragOver(event: DragEvent) {
  event.dataTransfer!.dropEffect = 'copy';
}

function onDrop(event: DragEvent) {
  const data = event.dataTransfer?.getData('application/json');
  if (!data) return;

  try {
    const template = JSON.parse(data) as CardTemplate;
    addTile(template);
  } catch (e) {
    console.error('Failed to parse dropped tile:', e);
  }
}
</script>

<style scoped>
.editor-canvas {
  display: grid;
  min-height: 400px;
  background: #f8fafc;
  border: 2px dashed #d1d5db;
  border-radius: 0.75rem;
  padding: 1rem;
  position: relative;
}

.editor-canvas--preview {
  background: transparent;
  border: none;
  padding: 0;
}

.editor-canvas__tile {
  position: relative;
  display: flex;
  width: 100%;
  min-height: 100px;
}

.editor-canvas__tile-actions {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.editor-canvas__tile:hover .editor-canvas__tile-actions {
  opacity: 1;
}

.editor-canvas__action {
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.625rem;
  font-weight: 700;
  color: #4b5563;
}

.editor-canvas__action:hover {
  background: #e5e7eb;
}

.editor-canvas__action--danger:hover {
  background: #fee2e2;
  color: #dc2626;
}

.editor-canvas__empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 0.875rem;
}
</style>
