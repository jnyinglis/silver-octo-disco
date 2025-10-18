<template>
  <section v-if="isLoaded" class="dashboard">
    <div class="toolbar">
      <div class="toolbar__filters">
        <label class="field">
          <span>Status</span>
          <select v-model="filters.status">
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="in-progress">In Progress</option>
            <option value="failed">Failed</option>
          </select>
        </label>
        <label class="field">
          <span>Department</span>
          <select v-model="filters.department">
            <option :value="undefined">All</option>
            <option v-for="department in availableDepartments" :key="department" :value="department">
              {{ department }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>Course Category</span>
          <select v-model="filters.courseCategory">
            <option :value="undefined">All</option>
            <option v-for="category in availableCategories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </label>
        <label class="field field--search">
          <span>Search</span>
          <input v-model="filters.search" type="search" placeholder="Search learner or course" />
        </label>
      </div>
      <div class="toolbar__actions">
        <label class="field">
          <span>Data source</span>
          <select v-model="dataMode">
            <option value="generated">Generated dataset (faker)</option>
            <option value="sample">Static sample (JSON)</option>
          </select>
        </label>
        <button class="toolbar__refresh" type="button" @click="regenerate()">{{ regenerateLabel }}</button>
      </div>
    </div>

    <section class="cards-grid">
      <Card
        v-for="card in summaries"
        :key="card.config.id"
        :title="card.config.title"
        :summary="card.summary"
        :is-active="activeCardId === card.config.id"
        :filters="card.config.filters"
        @select="() => selectCard(card.config.id)"
      />
    </section>

    <section class="details" v-if="activeDetailRows.length">
      <header class="details__header">
        <h2>{{ activeCard?.title }}</h2>
        <button type="button" class="details__close" @click="clearSelection">Close</button>
      </header>
      <div class="details__table-wrapper">
        <table class="details__table">
          <thead>
            <tr>
              <th v-for="column in detailColumns" :key="column">{{ column }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in activeDetailRows" :key="index">
              <td v-for="column in detailColumns" :key="column">
                {{ row[column] ?? '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
  <section v-else class="dashboard dashboard--loading">
    <p>Loading dashboard…</p>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, watchEffect } from 'vue';
import Card from '@/components/Card.vue';
import { cardConfigs } from '@/config/cardConfigs';
import sampleDataJson from '@/data/sampleData.json';
import type {
  CardConfig,
  CardDetailRow,
  CardSummaryResult,
  DashboardFilters,
  MiniDatabase
} from '@/types/dashboard';
import { createQueryContext } from '@/utils/linqHelpers';
import { generateFakeDatabase } from '@/utils/fakeDataGenerator';

type DataMode = 'generated' | 'sample';

const sampleData = sampleDataJson as MiniDatabase;

const data = ref<MiniDatabase | null>(null);
const dataMode = ref<DataMode>('generated');
const lastSeed = ref<number>(202_401);
const filters = reactive<DashboardFilters>({ status: 'all', search: '' });
const activeCardId = ref<string | null>(null);

const isLoaded = computed(() => data.value !== null);

const availableDepartments = computed(() =>
  data.value ? Array.from(new Set(data.value.users.map((user) => user.department))).sort() : []
);

const availableCategories = computed(() =>
  data.value ? Array.from(new Set(data.value.courses.map((course) => course.category))).sort() : []
);

watch(availableDepartments, (departments) => {
  if (filters.department && !departments.includes(filters.department)) {
    filters.department = undefined;
  }
});

watch(availableCategories, (categories) => {
  if (filters.courseCategory && !categories.includes(filters.courseCategory)) {
    filters.courseCategory = undefined;
  }
});

const context = computed(() => (data.value ? createQueryContext(data.value, filters) : null));

const summaries = computed(() => {
  if (!context.value) {
    return [] as { config: CardConfig; summary: CardSummaryResult }[];
  }

  return cardConfigs.map((config) => ({
    config,
    summary: config.summaryQuery(context.value!)
  }));
});

const activeCard = computed(() => cardConfigs.find((card) => card.id === activeCardId.value) ?? null);

const activeDetailRows = ref<CardDetailRow[]>([]);
const detailColumns = computed(() => (activeDetailRows.value[0] ? Object.keys(activeDetailRows.value[0]) : []));

const selectCard = (id: string) => {
  activeCardId.value = id;
};

const clearSelection = () => {
  activeCardId.value = null;
  activeDetailRows.value = [];
};

const runDetailQuery = () => {
  if (!context.value || !activeCard.value) {
    activeDetailRows.value = [];
    return;
  }

  activeDetailRows.value = activeCard.value.detailQuery(context.value);
};

watchEffect(runDetailQuery);

const loadGeneratedData = (seed = lastSeed.value) => {
  lastSeed.value = seed;
  data.value = generateFakeDatabase({ seed });
};

const loadSampleData = () => {
  data.value = JSON.parse(JSON.stringify(sampleData)) as MiniDatabase;
};

const loadDataForMode = (mode: DataMode) => {
  if (mode === 'generated') {
    loadGeneratedData();
  } else {
    loadSampleData();
  }
};

watch(
  dataMode,
  (mode) => {
    loadDataForMode(mode);
    clearSelection();
  },
  { immediate: true }
);

const regenerate = () => {
  if (dataMode.value === 'generated') {
    const randomSeed = Math.floor(Math.random() * 1_000_000);
    loadGeneratedData(randomSeed);
  } else {
    loadSampleData();
  }
  clearSelection();
};

const regenerateLabel = computed(() =>
  dataMode.value === 'generated' ? 'Regenerate data' : 'Reload sample'
);
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.dashboard--loading {
  align-items: center;
  justify-content: center;
  min-height: 40vh;
  color: #6b7280;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  justify-content: space-between;
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}

.toolbar__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
}

.toolbar__actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-end;
}

.toolbar__actions .field select {
  min-width: 16rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #4b5563;
}

.field select,
.field input {
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  padding: 0.5rem 0.75rem;
  min-width: 10rem;
  font-size: 0.95rem;
}

.field--search input {
  min-width: 15rem;
}

.toolbar__refresh {
  align-self: flex-start;
  background: #1d4ed8;
  color: white;
  border: none;
  border-radius: 999px;
  padding: 0.65rem 1.5rem;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s ease;
}

.toolbar__refresh:hover {
  background: #1e40af;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
}

.details {
  background: white;
  border-radius: 1.25rem;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
  overflow: hidden;
}

.details__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.details__close {
  background: transparent;
  border: none;
  color: #2563eb;
  font-weight: 600;
  cursor: pointer;
}

.details__table-wrapper {
  max-height: 340px;
  overflow: auto;
}

.details__table {
  width: 100%;
  border-collapse: collapse;
}

.details__table th,
.details__table td {
  padding: 0.75rem 1.5rem;
  text-align: left;
  border-bottom: 1px solid #f3f4f6;
}

.details__table tbody tr:hover {
  background: #f8fafc;
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar__actions {
    align-items: stretch;
  }

  .toolbar__refresh {
    width: 100%;
  }
}
</style>
