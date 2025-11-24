<template>
  <div
    class="editor-canvas"
    :class="{ 'editor-canvas--preview': mode === 'preview' }"
    :style="gridStyle"
    @dragover.prevent="mode === 'edit' ? onDragOver : undefined"
    @drop="mode === 'edit' ? onDrop : undefined"
  >
    <!-- Preview Mode: Use TileRenderer with Card styling -->
    <template v-if="mode === 'preview'">
      <TileRenderer
        v-for="tile in dashboard.tiles"
        :key="tile.id"
        :tile="tile"
        :mode="mode"
        :style="getTileStyle(tile)"
        @select="handleTileClick(tile)"
      />
    </template>

    <!-- Detail View Modal -->
    <DetailViewModal
      v-if="detailViewTile"
      :tile="detailViewTile"
      @close="closeDetailView"
    />

    <!-- Edit Mode: Use simple tile display -->
    <template v-else>
      <div
        v-for="tile in dashboard.tiles"
        :key="tile.id"
        class="editor-canvas__tile"
        :class="{
          'editor-canvas__tile--selected': tile.id === selectedTileId,
        }"
        :style="getTileStyle(tile)"
        @click="selectTile(tile.id)"
      >
        <div class="editor-canvas__tile-header">
          <span class="editor-canvas__tile-type">{{ tile.type }}</span>
          <span class="editor-canvas__tile-title">{{ tile.title }}</span>
        </div>
        <div class="editor-canvas__tile-content">
          <div class="editor-canvas__tile-metrics">
            <span
              v-for="metric in tile.query?.metrics ?? []"
              :key="metric"
              class="editor-canvas__metric-badge"
            >
              {{ metric }}
            </span>
          </div>
          <div v-if="tile.query?.dimensions?.length" class="editor-canvas__tile-dimensions">
            by {{ tile.query.dimensions.join(', ') }}
          </div>
        </div>
        <div class="editor-canvas__tile-actions">
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
    </template>

    <div v-if="dashboard.tiles.length === 0" class="editor-canvas__empty">
      <p>{{ mode === 'preview' ? 'No tiles configured' : 'Drag tiles from the palette or click to add' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useSharedEditorState } from '@/composables/useEditorState';
import TileRenderer from './TileRenderer.vue';
import DetailViewModal from './DetailViewModal.vue';
import type { TileConfig } from '@/types/dashboardSchema';
import type { CardTemplate } from '@/services/editorPalette';

interface Props {
  mode?: 'edit' | 'preview';
}

const props = withDefaults(defineProps<Props>(), {
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

// Detail view modal state
const detailViewTile = ref<TileConfig | null>(null);

function handleTileClick(tile: TileConfig) {
  if (props.mode === 'preview' && tile.detailView) {
    detailViewTile.value = tile;
  } else {
    selectTile(tile.id);
  }
}

function closeDetailView() {
  detailViewTile.value = null;
}

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

/* Preview mode styling - match dashboard view */
.editor-canvas--preview {
  background: #f3f4f6;
  border: none;
  padding: 2rem;
  border-radius: 0;
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
