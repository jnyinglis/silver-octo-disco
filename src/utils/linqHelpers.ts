import type { DashboardFilters, MiniDatabase, QueryContext, QueryLookups } from '@/types/dashboard';
import { createDashboardEngine } from '@/metricforge';

export const createLookups = (data: MiniDatabase): QueryLookups => ({
  usersById: new Map(data.users.map((user) => [user.id, user])),
  coursesById: new Map(data.courses.map((course) => [course.id, course])),
  proctorsById: new Map(data.proctors.map((proctor) => [proctor.id, proctor]))
});

export const createQueryContext = (
  data: MiniDatabase,
  filters: DashboardFilters
): QueryContext => ({
  data,
  filters,
  lookups: createLookups(data),
  engine: createDashboardEngine(data)
});

export const formatPercent = (value: number): string => {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value * 100)}%`;
};

export const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString();
};

export const formatHours = (value: number): string => {
  if (!Number.isFinite(value)) return '0.0 hrs';
  return `${value.toFixed(1)} hrs`;
};

export const formatScore = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(1));
};
