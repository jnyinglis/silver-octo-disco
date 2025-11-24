import { ref, computed, watch, shallowRef } from 'vue';
import type { DashboardConfig, TileConfig, ValidationResult } from '@/types/dashboardSchema';
import { validateDashboardConfig } from '@/types/dashboardSchema';
import { introspectSemanticModel } from '@/metricforge';
import { buildCardPalette, suggestBindings, type CardTemplate } from '@/services/editorPalette';

const STORAGE_KEY = 'dashboard-editor-draft';
const MAX_HISTORY = 50;

function createEmptyDashboard(): DashboardConfig {
  return {
    id: `dashboard-${Date.now()}`,
    title: 'Untitled Dashboard',
    version: '1.0.0',
    status: 'draft',
    layout: { columns: 12, gutter: 24 },
    tiles: [],
  };
}

function generateTileId(): string {
  return `tile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useEditorState() {
  const introspection = introspectSemanticModel();
  const palette = buildCardPalette(introspection);

  // Core state
  const dashboard = ref<DashboardConfig>(createEmptyDashboard());
  const selectedTileId = ref<string | null>(null);
  const isDirty = ref(false);

  // History for undo/redo
  const history = shallowRef<string[]>([]);
  const historyIndex = ref(-1);

  // Computed
  const selectedTile = computed(() =>
    dashboard.value.tiles.find((t) => t.id === selectedTileId.value) ?? null
  );

  const validation = computed<ValidationResult>(() =>
    validateDashboardConfig(dashboard.value, introspection)
  );

  const canUndo = computed(() => historyIndex.value > 0);
  const canRedo = computed(() => historyIndex.value < history.value.length - 1);

  // Save snapshot to history
  function saveSnapshot() {
    const snapshot = JSON.stringify(dashboard.value);
    const newHistory = history.value.slice(0, historyIndex.value + 1);
    newHistory.push(snapshot);

    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    } else {
      historyIndex.value++;
    }

    history.value = newHistory;
    isDirty.value = true;
  }

  // Initialize history with current state
  function initHistory() {
    history.value = [JSON.stringify(dashboard.value)];
    historyIndex.value = 0;
    isDirty.value = false;
  }

  // Undo/Redo
  function undo() {
    if (!canUndo.value) return;
    historyIndex.value--;
    dashboard.value = JSON.parse(history.value[historyIndex.value]);
    isDirty.value = true;
  }

  function redo() {
    if (!canRedo.value) return;
    historyIndex.value++;
    dashboard.value = JSON.parse(history.value[historyIndex.value]);
    isDirty.value = true;
  }

  // Tile CRUD operations
  function addTile(template: CardTemplate, position?: { col: number; row: number }) {
    const suggested = suggestBindings(template, introspection);
    const newTile: TileConfig = {
      id: generateTileId(),
      title: `New ${template.label}`,
      type: template.type,
      query: suggested.query ?? { metrics: [] },
      layout: {
        colSpan: template.type === 'kpi' ? 4 : 6,
        rowSpan: template.type === 'kpi' ? 2 : 4,
        minH: 2,
      },
    };

    dashboard.value.tiles.push(newTile);
    selectedTileId.value = newTile.id;
    saveSnapshot();
  }

  function updateTile(tileId: string, updates: Partial<TileConfig>) {
    const index = dashboard.value.tiles.findIndex((t) => t.id === tileId);
    if (index === -1) return;

    dashboard.value.tiles[index] = {
      ...dashboard.value.tiles[index],
      ...updates,
    };
    saveSnapshot();
  }

  function updateTileQuery(tileId: string, queryUpdates: Partial<TileConfig['query']>) {
    const tile = dashboard.value.tiles.find((t) => t.id === tileId);
    if (!tile) return;

    updateTile(tileId, {
      query: { ...tile.query, ...queryUpdates },
    });
  }

  function deleteTile(tileId: string) {
    dashboard.value.tiles = dashboard.value.tiles.filter((t) => t.id !== tileId);
    if (selectedTileId.value === tileId) {
      selectedTileId.value = null;
    }
    saveSnapshot();
  }

  function duplicateTile(tileId: string) {
    const tile = dashboard.value.tiles.find((t) => t.id === tileId);
    if (!tile) return;

    const newTile: TileConfig = {
      ...JSON.parse(JSON.stringify(tile)),
      id: generateTileId(),
      title: `${tile.title} (copy)`,
    };

    dashboard.value.tiles.push(newTile);
    selectedTileId.value = newTile.id;
    saveSnapshot();
  }

  function reorderTiles(fromIndex: number, toIndex: number) {
    const tiles = [...dashboard.value.tiles];
    const [moved] = tiles.splice(fromIndex, 1);
    tiles.splice(toIndex, 0, moved);
    dashboard.value.tiles = tiles;
    saveSnapshot();
  }

  // Selection
  function selectTile(tileId: string | null) {
    selectedTileId.value = tileId;
  }

  // Dashboard metadata
  function updateDashboard(updates: Partial<Omit<DashboardConfig, 'tiles'>>) {
    dashboard.value = { ...dashboard.value, ...updates };
    saveSnapshot();
  }

  // Persistence
  function saveDraft() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboard.value));
    isDirty.value = false;
  }

  function loadDraft(): boolean {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        dashboard.value = JSON.parse(saved);
        initHistory();
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  function clearDraft() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function loadConfig(config: DashboardConfig) {
    dashboard.value = JSON.parse(JSON.stringify(config));
    selectedTileId.value = null;
    initHistory();
  }

  function newDashboard() {
    dashboard.value = createEmptyDashboard();
    selectedTileId.value = null;
    initHistory();
  }

  function exportJson(): string {
    return JSON.stringify(dashboard.value, null, 2);
  }

  function importJson(json: string): boolean {
    try {
      const parsed = JSON.parse(json) as DashboardConfig;
      const result = validateDashboardConfig(parsed, introspection);
      if (!result.valid) {
        console.warn('Import validation errors:', result.errors);
      }
      loadConfig(parsed);
      return true;
    } catch (e) {
      console.error('Failed to import JSON:', e);
      return false;
    }
  }

  // Initialize
  initHistory();

  return {
    // State
    dashboard,
    selectedTileId,
    selectedTile,
    isDirty,
    validation,

    // Introspection data
    introspection,
    palette,

    // History
    canUndo,
    canRedo,
    undo,
    redo,

    // Tile operations
    addTile,
    updateTile,
    updateTileQuery,
    deleteTile,
    duplicateTile,
    reorderTiles,
    selectTile,

    // Dashboard operations
    updateDashboard,
    newDashboard,
    loadConfig,

    // Persistence
    saveDraft,
    loadDraft,
    clearDraft,
    exportJson,
    importJson,
  };
}

// Singleton instance for shared state across components
let editorInstance: ReturnType<typeof useEditorState> | null = null;

export function useSharedEditorState() {
  if (!editorInstance) {
    editorInstance = useEditorState();
  }
  return editorInstance;
}

export function resetEditorInstance() {
  editorInstance = null;
}
