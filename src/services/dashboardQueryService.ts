import type { DashboardFilters } from '@/types/dashboard';
import DataStore from './dataStore';
import { createDashboardEngine, toFilterContext } from '@/metricforge';
import type { QuerySpec, Row, SemanticEngine } from 'metricforge/src/semanticEngine';
import { createLookups } from '@/utils/linqHelpers';

export interface QueryExecutionOptions {
  filters?: DashboardFilters;
  enforcedFilters?: Record<string, unknown>;
  includeSearchFilter?: boolean;
  useCache?: boolean;
}

const normalize = (value: unknown) => JSON.stringify(value ?? null);

export default class DashboardQueryService {
  private dataStore: DataStore;
  private engine: SemanticEngine;
  private cache = new Map<string, Row[]>();
  private cacheVersion = 0;

  constructor(dataStore: DataStore) {
    this.dataStore = dataStore;
    this.engine = createDashboardEngine(this.dataStore.current);
    this.cacheVersion = dataStore.version;

    this.dataStore.subscribe((data) => {
      this.engine = createDashboardEngine(data);
      this.cache.clear();
      this.cacheVersion = dataStore.version;
    });
  }

  runQuery(spec: QuerySpec, options: QueryExecutionOptions = {}): Row[] {
    const filters = options.filters;
    const enforcedFilters = options.enforcedFilters;
    const useCache = options.useCache ?? true;

    const mergedFilters = this.mergeFilters(filters, enforcedFilters);
    const decoratedSpec: QuerySpec = {
      ...spec,
      where: mergedFilters ?? spec.where,
    };

    const cacheKey = `${normalize(decoratedSpec)}::${this.cacheVersion}`;
    if (useCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let rows = this.engine.runQuery(decoratedSpec);
    if (options.includeSearchFilter && filters?.search) {
      rows = this.applySearch(rows, filters.search);
    }

    if (useCache) {
      this.cache.set(cacheKey, rows);
    }

    return rows;
  }

  private mergeFilters(
    filters?: DashboardFilters,
    enforcedFilters?: Record<string, unknown>
  ): Record<string, unknown> | undefined {
    const filterCtx = filters ? toFilterContext(filters) : undefined;
    const result = {
      ...(filterCtx ?? {}),
      ...(enforcedFilters ?? {}),
    } as Record<string, unknown>;

    return Object.keys(result).length ? result : undefined;
  }

  private applySearch<T extends Row>(rows: T[], term: string): T[] {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return rows;

    const lookups = createLookups(this.dataStore.current);
    const match = (value: unknown): boolean =>
      typeof value === 'string' && value.toLowerCase().includes(normalized);

    return rows.filter((row) => {
      const values = Object.values(row).flatMap((value) => {
        if (typeof value === 'string') return [value];
        if (typeof value === 'number') return [value.toString()];
        return [];
      });

      const foreignValues: string[] = [];
      if ('userId' in row && typeof row.userId === 'string') {
        const user = lookups.usersById.get(row.userId);
        if (user) foreignValues.push(user.fullName, user.department, user.role, user.location);
      }
      if ('courseId' in row && typeof row.courseId === 'string') {
        const course = lookups.coursesById.get(row.courseId);
        if (course) foreignValues.push(course.title, course.category, course.difficulty);
      }
      if ('proctorId' in row && typeof row.proctorId === 'string') {
        const proctor = lookups.proctorsById.get(row.proctorId);
        if (proctor) foreignValues.push(proctor.fullName, proctor.location);
      }

      return [...values, ...foreignValues].some((value) => match(value));
    });
  }
}
