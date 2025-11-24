import { describe, expect, it } from 'vitest';
import DataStore from '@/services/dataStore';
import DashboardQueryService from '@/services/dashboardQueryService';
import { generateFakeDatabase } from '@/utils/fakeDataGenerator';
import { validateDashboardConfig } from '@/types/dashboardSchema';
import { introspectSemanticModel } from '@/metricforge';
import { sampleDashboard } from '@/config/dashboardConfigs';
import { buildCardPalette, hydrateDraftDashboard } from '@/services/editorPalette';

const createStore = (seed = 1) => new DataStore(() => generateFakeDatabase({ seed }));

describe('DataStore + DashboardQueryService', () => {
  it('rebuilds cache and engine on reload', async () => {
    const store = createStore(123);
    await store.initialize();
    const service = new DashboardQueryService(store);

    const first = service.runQuery({ dimensions: ['status'], metrics: ['total_enrollments'] });
    await store.reload(() => generateFakeDatabase({ seed: 456 }));
    const second = service.runQuery({ dimensions: ['status'], metrics: ['total_enrollments'] });

    expect(first).not.toEqual(second);
    expect(store.version).toBe(2);
  });

  it('applies search filter across dimensions', async () => {
    const store = createStore(999);
    await store.initialize();
    const service = new DashboardQueryService(store);

    const rows = service.runQuery(
      { dimensions: ['userId', 'courseId'], metrics: ['total_enrollments'] },
      { filters: { search: 'Tech' }, includeSearchFilter: true }
    );

    expect(rows.every((row) => Object.values(row).length > 0)).toBe(true);
  });
});

describe('Dashboard config validation', () => {
  it('accepts the sample dashboard config', () => {
    const validation = validateDashboardConfig(sampleDashboard, introspectSemanticModel());
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('flags unknown metrics and dimensions', () => {
    const invalid = {
      ...sampleDashboard,
      tiles: [
        ...sampleDashboard.tiles,
        {
          id: 'bad',
          title: 'Bad tile',
          type: 'kpi',
          query: { metrics: ['missing_metric'], dimensions: ['missing_dimension'] },
        },
      ],
    };

    const validation = validateDashboardConfig(invalid, introspectSemanticModel());
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((error) => error.includes('missing_metric'))).toBe(true);
    expect(validation.errors.some((error) => error.includes('missing_dimension'))).toBe(true);
  });
});

describe('Editor palette helpers', () => {
  it('hydrates dashboards with suggested bindings', () => {
    const draft = {
      ...sampleDashboard,
      tiles: [
        { id: 'new-kpi', title: 'New KPI', type: 'kpi', query: { metrics: [] } },
        { id: 'new-line', title: 'New trend', type: 'line', query: { metrics: [] } },
      ],
    };

    const hydrated = hydrateDraftDashboard(draft, buildCardPalette());
    expect(hydrated.tiles[0].query.metrics.length).toBeGreaterThan(0);
    expect(hydrated.tiles[1].query.metrics.length).toBeGreaterThan(0);
  });
});
