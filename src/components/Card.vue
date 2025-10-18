<template>
  <article class="card" :class="{ 'card--active': props.isActive }" @click="() => emit('select')">
    <header class="card__header">
      <div class="card__titles">
        <h3>{{ props.title }}</h3>
        <p v-if="props.filters?.length" class="card__filters">
          <span v-for="filter in props.filters" :key="filter.key" class="card__filter">{{ filter.label }}</span>
        </p>
      </div>
      <span aria-hidden="true" class="card__chevron">›</span>
    </header>
    <div class="card__summary">
      <span class="card__value">{{ props.summary.value }}</span>
      <span class="card__label">{{ props.summary.label }}</span>
      <span v-if="props.summary.trendLabel" class="card__trend">{{ props.summary.trendLabel }}</span>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { CardFilterMeta, CardSummaryResult } from '@/types/dashboard';

interface Props {
  title: string;
  summary: CardSummaryResult;
  isActive?: boolean;
  filters?: CardFilterMeta[];
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false
});
const emit = defineEmits<{
  (event: 'select'): void;
}>();
</script>

<style scoped>
.card {
  position: relative;
  background: white;
  border-radius: 1.25rem;
  padding: 1.5rem;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.12);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
}

.card--active {
  outline: 3px solid rgba(59, 130, 246, 0.5);
}

.card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.card__titles h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #111827;
}

.card__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin: 0.35rem 0 0;
  color: #6b7280;
  font-size: 0.75rem;
}

.card__filter {
  background: #eff6ff;
  border-radius: 999px;
  padding: 0.15rem 0.65rem;
}

.card__chevron {
  font-size: 1.5rem;
  color: #93c5fd;
  transition: transform 0.2s ease;
}

.card:hover .card__chevron {
  transform: translateX(6px);
}

.card__summary {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.card__value {
  font-size: 2.35rem;
  font-weight: 700;
  letter-spacing: -0.04em;
  color: #1d4ed8;
}

.card__label {
  color: #6b7280;
  font-size: 0.95rem;
}

.card__trend {
  color: #059669;
  font-size: 0.85rem;
  font-weight: 600;
}
</style>
