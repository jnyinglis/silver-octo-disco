<template>
  <div class="dashboard-editor">
    <!-- Toolbar -->
    <header class="editor-toolbar">
      <div class="editor-toolbar__left">
        <input
          type="text"
          class="editor-toolbar__title"
          :value="dashboard.title"
          @input="updateDashboard({ title: ($event.target as HTMLInputElement).value })"
          placeholder="Dashboard title"
        />
        <span class="editor-toolbar__status" :class="`editor-toolbar__status--${dashboard.status}`">
          {{ dashboard.status }}
        </span>
        <span v-if="isDirty" class="editor-toolbar__dirty">Unsaved changes</span>
      </div>

      <div class="editor-toolbar__center">
        <button
          class="editor-toolbar__mode"
          :class="{ 'editor-toolbar__mode--active': mode === 'edit' }"
          @click="mode = 'edit'"
        >
          Edit
        </button>
        <button
          class="editor-toolbar__mode"
          :class="{ 'editor-toolbar__mode--active': mode === 'preview' }"
          @click="mode = 'preview'"
        >
          Preview
        </button>
      </div>

      <div class="editor-toolbar__right">
        <button
          class="editor-toolbar__btn"
          :disabled="!canUndo"
          title="Undo"
          @click="undo"
        >
          Undo
        </button>
        <button
          class="editor-toolbar__btn"
          :disabled="!canRedo"
          title="Redo"
          @click="redo"
        >
          Redo
        </button>
        <button class="editor-toolbar__btn" @click="onSaveDraft">
          Save Draft
        </button>
        <button class="editor-toolbar__btn" @click="onExport">
          Export JSON
        </button>
        <button class="editor-toolbar__btn" @click="showImport = true">
          Import
        </button>
        <button
          class="editor-toolbar__btn editor-toolbar__btn--primary"
          :disabled="!validation.valid"
          @click="onPublish"
        >
          Publish
        </button>
      </div>
    </header>

    <!-- Validation Banner -->
    <div v-if="!validation.valid" class="editor-validation">
      <strong>Validation errors:</strong>
      {{ validation.errors.slice(0, 3).join('; ') }}
      <span v-if="validation.errors.length > 3">
        (+{{ validation.errors.length - 3 }} more)
      </span>
    </div>

    <!-- Main Content -->
    <div class="editor-main" v-if="mode === 'edit'">
      <!-- Left: Palette -->
      <div class="editor-main__palette">
        <TilePalette />
      </div>

      <!-- Center: Canvas -->
      <div class="editor-main__canvas">
        <EditorCanvas />
      </div>

      <!-- Right: Config Panel + Preview -->
      <div class="editor-main__sidebar">
        <TileConfigPanel />
        <TilePreview />
      </div>
    </div>

    <!-- Preview Mode -->
    <div class="editor-preview" v-else>
      <p class="editor-preview__note">Preview mode - showing configured layout</p>
      <EditorCanvas />
    </div>

    <!-- Import Modal -->
    <div v-if="showImport" class="editor-modal" @click.self="showImport = false">
      <div class="editor-modal__content">
        <h3>Import Dashboard JSON</h3>
        <textarea
          v-model="importJson"
          placeholder="Paste dashboard JSON here..."
          rows="10"
        ></textarea>
        <div class="editor-modal__actions">
          <button @click="showImport = false">Cancel</button>
          <button class="editor-modal__primary" @click="onImport">Import</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSharedEditorState, resetEditorInstance } from '@/composables/useEditorState';
import TilePalette from './TilePalette.vue';
import EditorCanvas from './EditorCanvas.vue';
import TileConfigPanel from './TileConfigPanel.vue';
import TilePreview from './TilePreview.vue';

const {
  dashboard,
  isDirty,
  validation,
  canUndo,
  canRedo,
  undo,
  redo,
  updateDashboard,
  saveDraft,
  exportJson,
  importJson: doImport,
  loadDraft,
} = useSharedEditorState();

const mode = ref<'edit' | 'preview'>('edit');
const showImport = ref(false);
const importJson = ref('');

// Try to load existing draft on mount
loadDraft();

function onSaveDraft() {
  saveDraft();
  alert('Draft saved!');
}

function onExport() {
  const json = exportJson();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${dashboard.value.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function onImport() {
  if (!importJson.value.trim()) return;
  const success = doImport(importJson.value);
  if (success) {
    showImport.value = false;
    importJson.value = '';
  } else {
    alert('Failed to import JSON. Check console for details.');
  }
}

function onPublish() {
  if (!validation.value.valid) {
    alert('Cannot publish: validation errors exist');
    return;
  }
  updateDashboard({ status: 'published' });
  const json = exportJson();
  console.log('Published dashboard:', json);
  alert('Dashboard published! JSON logged to console.');
}
</script>

<style scoped>
.dashboard-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f1f5f9;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  gap: 1rem;
}

.editor-toolbar__left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.editor-toolbar__title {
  font-size: 1.125rem;
  font-weight: 600;
  border: none;
  background: transparent;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  min-width: 200px;
}

.editor-toolbar__title:focus {
  outline: none;
  background: #f9fafb;
}

.editor-toolbar__status {
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
}

.editor-toolbar__status--draft {
  background: #fef3c7;
  color: #92400e;
}

.editor-toolbar__status--published {
  background: #d1fae5;
  color: #047857;
}

.editor-toolbar__dirty {
  font-size: 0.75rem;
  color: #dc2626;
}

.editor-toolbar__center {
  display: flex;
  background: #f3f4f6;
  border-radius: 0.5rem;
  padding: 0.25rem;
}

.editor-toolbar__mode {
  padding: 0.375rem 1rem;
  border: none;
  background: transparent;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: #6b7280;
}

.editor-toolbar__mode--active {
  background: white;
  color: #1f2937;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.editor-toolbar__right {
  display: flex;
  gap: 0.5rem;
}

.editor-toolbar__btn {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
}

.editor-toolbar__btn:hover:not(:disabled) {
  background: #f9fafb;
}

.editor-toolbar__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.editor-toolbar__btn--primary {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
}

.editor-toolbar__btn--primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.editor-validation {
  background: #fef2f2;
  color: #dc2626;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  border-bottom: 1px solid #fecaca;
}

.editor-main {
  display: grid;
  grid-template-columns: 220px 1fr 320px;
  gap: 1.5rem;
  padding: 1.5rem;
  flex: 1;
  overflow: hidden;
}

.editor-main__palette {
  overflow-y: auto;
}

.editor-main__canvas {
  overflow-y: auto;
}

.editor-main__sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
}

.editor-preview {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.editor-preview__note {
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.editor-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.editor-modal__content {
  background: white;
  padding: 1.5rem;
  border-radius: 0.75rem;
  width: 90%;
  max-width: 500px;
}

.editor-modal__content h3 {
  margin: 0 0 1rem;
}

.editor-modal__content textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-family: monospace;
  font-size: 0.875rem;
  resize: vertical;
}

.editor-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

.editor-modal__actions button {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 0.5rem;
  cursor: pointer;
}

.editor-modal__primary {
  background: #2563eb !important;
  border-color: #2563eb !important;
  color: white;
}
</style>
