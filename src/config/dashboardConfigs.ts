import type { DashboardConfig } from '@/types/dashboardSchema';

export const sampleDashboard: DashboardConfig = {
  id: 'learning-overview',
  title: 'Learning overview',
  version: '1.0.0',
  status: 'draft',
  layout: { columns: 12, gutter: 24 },
  tiles: [
    {
      id: 'kpi-completions',
      title: 'Completions',
      type: 'kpi',
      query: {
        metrics: ['total_enrollments'],
        dimensions: ['status'],
        where: { status: 'completed' },
      },
      layout: { colSpan: 4, rowSpan: 2 },
    },
    {
      id: 'kpi-score',
      title: 'Avg score',
      type: 'kpi',
      query: {
        metrics: ['avg_score'],
        dimensions: ['status'],
        where: { status: 'completed' },
      },
      layout: { colSpan: 4, rowSpan: 2 },
    },
    {
      id: 'kpi-hours',
      title: 'Hour utilization',
      type: 'kpi',
      query: {
        metrics: ['hour_utilization'],
      },
      layout: { colSpan: 4, rowSpan: 2 },
    },
    {
      id: 'trend-completions',
      title: 'Completions by completion date',
      type: 'line',
      query: {
        metrics: ['total_enrollments'],
        dimensions: ['completedAt'],
        transforms: ['ytd'],
      },
      layout: { colSpan: 12, rowSpan: 4 },
    },
    {
      id: 'breakdown-department',
      title: 'Department breakdown',
      type: 'bar',
      query: {
        metrics: ['total_enrollments'],
        dimensions: ['department', 'status'],
      },
      interactions: [
        {
          sourceEvent: 'select',
          targetTileIds: ['leaderboard'],
          dimension: 'department',
        },
      ],
      layout: { colSpan: 6, rowSpan: 4 },
    },
    {
      id: 'leaderboard',
      title: 'Top learners',
      type: 'table',
      query: {
        metrics: ['total_enrollments', 'avg_score'],
        dimensions: ['userFullName', 'department', 'status'],
        sort: [
          { field: 'avg_score', direction: 'desc' },
          { field: 'total_enrollments', direction: 'desc' },
        ],
        limit: 50,
      },
      layout: { colSpan: 6, rowSpan: 4 },
    },
  ],
};
