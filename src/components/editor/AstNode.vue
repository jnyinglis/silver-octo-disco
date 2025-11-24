<template>
  <div class="ast-node" :class="{ 'ast-node--collapsed': isCollapsed }">
    <div
      class="ast-node__header"
      :style="{ '--node-color': nodeColor }"
      @click="toggleCollapse"
    >
      <span class="ast-node__toggle" v-if="hasChildren">
        {{ isCollapsed ? '▶' : '▼' }}
      </span>
      <span class="ast-node__toggle ast-node__toggle--empty" v-else></span>

      <span class="ast-node__icon" :title="node.type">{{ nodeIcon }}</span>
      <span class="ast-node__label">{{ node.label }}</span>

      <span class="ast-node__badge" v-if="childCount > 0 && isCollapsed">
        {{ childCount }}
      </span>
    </div>

    <div class="ast-node__description" v-if="node.description && !isCollapsed">
      {{ node.description }}
    </div>

    <div class="ast-node__children" v-if="hasChildren && !isCollapsed">
      <div
        class="ast-node__connector"
        v-for="(child, index) in node.children"
        :key="child.id"
        :class="{ 'ast-node__connector--last': index === node.children.length - 1 }"
      >
        <div class="ast-node__line"></div>
        <AstNode :node="child" :depth="depth + 1" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { PlanNode } from '@/services/astExtractor';
import { nodeTypeColors, nodeTypeIcons } from '@/services/astExtractor';

const props = withDefaults(defineProps<{
  node: PlanNode;
  depth?: number;
}>(), {
  depth: 0,
});

const isCollapsed = ref(props.node.collapsed ?? false);

const hasChildren = computed(() => props.node.children.length > 0);
const childCount = computed(() => props.node.children.length);
const nodeColor = computed(() => nodeTypeColors[props.node.type] ?? '#64748b');
const nodeIcon = computed(() => nodeTypeIcons[props.node.type] ?? '•');

function toggleCollapse() {
  if (hasChildren.value) {
    isCollapsed.value = !isCollapsed.value;
  }
}
</script>

<style scoped>
.ast-node {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.8125rem;
  line-height: 1.4;
}

.ast-node__header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.15s;
  border-left: 3px solid var(--node-color);
  background: rgba(0, 0, 0, 0.02);
}

.ast-node__header:hover {
  background: rgba(0, 0, 0, 0.06);
}

.ast-node__toggle {
  width: 1rem;
  font-size: 0.625rem;
  color: #9ca3af;
  flex-shrink: 0;
  text-align: center;
}

.ast-node__toggle--empty {
  visibility: hidden;
}

.ast-node__icon {
  width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--node-color);
  color: white;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.ast-node__label {
  font-weight: 500;
  color: #1f2937;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ast-node__badge {
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  background: #e5e7eb;
  color: #6b7280;
  border-radius: 999px;
  flex-shrink: 0;
}

.ast-node__description {
  font-size: 0.75rem;
  color: #6b7280;
  padding: 0.125rem 0.5rem 0.25rem 2.625rem;
  font-style: italic;
}

.ast-node__children {
  margin-left: 1rem;
  padding-left: 0.5rem;
  border-left: 1px dashed #d1d5db;
}

.ast-node__connector {
  position: relative;
  margin-top: 0.25rem;
}

.ast-node__connector--last > .ast-node__line {
  height: 0.75rem;
}

.ast-node__line {
  position: absolute;
  left: -0.5rem;
  top: 0;
  width: 0.5rem;
  height: 100%;
  border-bottom: 1px dashed #d1d5db;
  border-left: 1px dashed transparent;
}

.ast-node--collapsed .ast-node__header {
  opacity: 0.85;
}
</style>
