<template>
  <div class="plan-visualizer" v-if="selectedTile">
    <header class="plan-visualizer__header">
      <h4>Logical Plan</h4>
      <div class="plan-visualizer__actions">
        <button
          class="plan-visualizer__btn"
          :class="{ 'plan-visualizer__btn--active': showSummary }"
          @click="showSummary = !showSummary"
          title="Toggle summary"
        >
          Info
        </button>
        <button
          class="plan-visualizer__btn"
          @click="expandAll"
          title="Expand all nodes"
        >
          Expand
        </button>
        <button
          class="plan-visualizer__btn"
          @click="collapseAll"
          title="Collapse all nodes"
        >
          Collapse
        </button>
      </div>
    </header>

    <div class="plan-visualizer__content">
      <!-- No metrics selected -->
      <div v-if="!hasMetrics" class="plan-visualizer__empty">
        Select at least one metric to see the logical plan
      </div>

      <!-- Summary panel -->
      <div v-else-if="showSummary" class="plan-visualizer__summary">
        <div class="plan-visualizer__summary-item">
          <span class="plan-visualizer__summary-label">Total Nodes</span>
          <span class="plan-visualizer__summary-value">{{ summary.totalNodes }}</span>
        </div>
        <div class="plan-visualizer__summary-item">
          <span class="plan-visualizer__summary-label">Metrics</span>
          <span class="plan-visualizer__summary-value">{{ summary.metricCount }}</span>
        </div>
        <div class="plan-visualizer__summary-item">
          <span class="plan-visualizer__summary-label">Dimensions</span>
          <span class="plan-visualizer__summary-value">{{ summary.dimensionCount }}</span>
        </div>
        <div class="plan-visualizer__summary-item">
          <span class="plan-visualizer__summary-label">Has Filters</span>
          <span class="plan-visualizer__summary-value">{{ summary.hasFilters ? 'Yes' : 'No' }}</span>
        </div>
        <div class="plan-visualizer__summary-item">
          <span class="plan-visualizer__summary-label">Has Joins</span>
          <span class="plan-visualizer__summary-value">{{ summary.hasJoins ? 'Yes' : 'No' }}</span>
        </div>
        <div class="plan-visualizer__summary-item">
          <span class="plan-visualizer__summary-label">Has Transforms</span>
          <span class="plan-visualizer__summary-value">{{ summary.hasTransforms ? 'Yes' : 'No' }}</span>
        </div>
      </div>

      <!-- AST Tree -->
      <div v-else class="plan-visualizer__tree" :key="treeKey">
        <AstNode :node="logicalPlan" :depth="0" />
      </div>

      <!-- Legend -->
      <div class="plan-visualizer__legend">
        <div class="plan-visualizer__legend-title">Node Types</div>
        <div class="plan-visualizer__legend-grid">
          <div
            v-for="item in legendItems"
            :key="item.type"
            class="plan-visualizer__legend-item"
          >
            <span
              class="plan-visualizer__legend-icon"
              :style="{ background: item.color }"
            >
              {{ item.icon }}
            </span>
            <span class="plan-visualizer__legend-label">{{ item.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="plan-visualizer plan-visualizer--empty" v-else>
    <p>Select a tile to see its logical plan</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useSharedEditorState } from '@/composables/useEditorState';
import AstNode from './AstNode.vue';
import {
  buildLogicalPlan,
  getPlanSummary,
  nodeTypeColors,
  nodeTypeIcons,
  type PlanNode,
  type PlanNodeType,
} from '@/services/astExtractor';

const { selectedTile } = useSharedEditorState();

const showSummary = ref(false);
const treeKey = ref(0);

const hasMetrics = computed(() =>
  selectedTile.value && selectedTile.value.query.metrics.length > 0
);

const logicalPlan = computed<PlanNode>(() => {
  if (!selectedTile.value || !hasMetrics.value) {
    return {
      id: 'empty',
      type: 'query',
      label: 'Empty Query',
      children: [],
    };
  }
  return buildLogicalPlan(selectedTile.value.query);
});

const summary = computed(() => getPlanSummary(logicalPlan.value));

// Force re-render tree when query changes
watch(
  () => selectedTile.value ? JSON.stringify(selectedTile.value.query) : null,
  () => {
    treeKey.value++;
  }
);

const legendItems = computed(() => {
  const relevantTypes: Array<{ type: PlanNodeType; label: string }> = [
    { type: 'scan', label: 'Scan' },
    { type: 'join', label: 'Join' },
    { type: 'filter', label: 'Filter' },
    { type: 'aggregate', label: 'Aggregate' },
    { type: 'metric', label: 'Metric' },
    { type: 'call', label: 'Function' },
    { type: 'binary_op', label: 'Operation' },
    { type: 'dimension', label: 'Dimension' },
  ];

  return relevantTypes.map(({ type, label }) => ({
    type,
    label,
    color: nodeTypeColors[type],
    icon: nodeTypeIcons[type],
  }));
});

function expandAll() {
  treeKey.value++;
  // The tree will re-render with all nodes expanded by default
}

function collapseAll() {
  // We'd need to pass a prop to collapse all - for now just toggle summary
  showSummary.value = true;
}
</script>

<style scoped>
.plan-visualizer {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  max-height: 400px;
  overflow: hidden;
}

.plan-visualizer--empty {
  align-items: center;
  justify-content: center;
  min-height: 150px;
  color: #9ca3af;
  font-size: 0.875rem;
}

.plan-visualizer__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.plan-visualizer__header h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.plan-visualizer__actions {
  display: flex;
  gap: 0.25rem;
}

.plan-visualizer__btn {
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.6875rem;
  cursor: pointer;
  color: #4b5563;
  transition: all 0.15s;
}

.plan-visualizer__btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.plan-visualizer__btn--active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #2563eb;
}

.plan-visualizer__content {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.plan-visualizer__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  color: #9ca3af;
  font-size: 0.875rem;
}

.plan-visualizer__summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.plan-visualizer__summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: #f9fafb;
  border-radius: 0.5rem;
}

.plan-visualizer__summary-label {
  font-size: 0.75rem;
  color: #6b7280;
}

.plan-visualizer__summary-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
}

.plan-visualizer__tree {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.plan-visualizer__legend {
  padding-top: 0.5rem;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.plan-visualizer__legend-title {
  font-size: 0.6875rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.375rem;
}

.plan-visualizer__legend-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.plan-visualizer__legend-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.plan-visualizer__legend-icon {
  width: 1rem;
  height: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  border-radius: 0.1875rem;
  font-size: 0.625rem;
  font-weight: 600;
}

.plan-visualizer__legend-label {
  font-size: 0.6875rem;
  color: #6b7280;
}
</style>
