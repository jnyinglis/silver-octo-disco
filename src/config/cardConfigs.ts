import type { CardConfig } from '@/types/dashboard';
import { formatHours, formatNumber, formatPercent } from '@/utils/linqHelpers';
import { metrics } from '@/utils/metrics';

export const cardConfigs: CardConfig[] = [
  {
    id: 'completed-total',
    title: 'Completed Certifications',
    summaryQuery: (ctx) => {
      const completedCount = metrics.enrollments.counts.completed(ctx);
      const activeCount = metrics.enrollments.counts.active(ctx);

      return {
        label: 'Total completions',
        value: formatNumber(completedCount),
        trendLabel: `${formatNumber(activeCount)} active learners`
      };
    },
    detailQuery: (ctx) => {
      const { lookups } = ctx;

      return metrics.enrollments.completed(ctx)
        .orderByDescending((enrollment) => enrollment.completedAt ?? '')
        .select((enrollment) => ({
          Learner: lookups.usersById.get(enrollment.userId)?.fullName ?? 'Unknown',
          Department: lookups.usersById.get(enrollment.userId)?.department ?? 'N/A',
          Course: lookups.coursesById.get(enrollment.courseId)?.title ?? 'Unknown',
          Score: enrollment.score,
          Completed: enrollment.completedAt ? new Date(enrollment.completedAt).toLocaleDateString() : '—'
        }))
        .take(15)
        .toArray();
    },
    filters: [
      { key: 'department', label: 'Department' },
      { key: 'courseCategory', label: 'Category' },
      { key: 'status', label: 'Status' }
    ]
  },
  {
    id: 'average-score',
    title: 'Average Score',
    summaryQuery: (ctx) => {
      const value = metrics.scores.completedAverage(ctx);
      const failureRate = metrics.enrollments.failureRate(ctx);

      return {
        label: 'Mean score (completed)',
        value,
        trendLabel: `${formatPercent(failureRate)} failure rate`
      };
    },
    detailQuery: (ctx) => {
      return metrics.scores.byDepartment(ctx).map((entry) => ({
        Department: entry.department,
        AverageScore: entry.averageScore,
        Completions: entry.completions
      }));
    },
    filters: [
      { key: 'department', label: 'Department' },
      { key: 'status', label: 'Status' }
    ]
  },
  {
    id: 'category-leaders',
    title: 'Top Course Categories',
    summaryQuery: (ctx) => {
      const categories = metrics.categories.leaderboard(ctx);
      const top = categories[0];
      const share = metrics.enrollments.counts.total(ctx);

      return {
        label: top ? `Leading: ${top.category}` : 'No completions',
        value: top ? formatNumber(top.completions) : 0,
        trendLabel: top && share ? `${formatPercent(top.completions / share)}` : undefined
      };
    },
    detailQuery: (ctx) =>
      metrics.categories.leaderboard(ctx).map((entry) => ({
        Category: entry.category,
        Completions: entry.completions,
        UniqueLearners: entry.uniqueLearners,
        AvgScore: entry.averageScore
      })),
    filters: [
      { key: 'courseCategory', label: 'Category' },
      { key: 'status', label: 'Status' }
    ]
  },
  {
    id: 'learning-hours',
    title: 'Learning Hours Logged',
    summaryQuery: (ctx) => {
      const totalLogged = metrics.hours.totalLogged(ctx);
      const utilization = metrics.hours.utilization(ctx);

      return {
        label: 'Logged vs. planned hours',
        value: formatHours(totalLogged),
        trendLabel: `${formatPercent(utilization)} of planned`
      };
    },
    detailQuery: (ctx) => {
      const { lookups } = ctx;

      return metrics.hours
        .joined(ctx)
        .select(({ enrollment, course }) => ({
          Learner: lookups.usersById.get(enrollment.userId)?.fullName ?? 'Unknown',
          Course: course.title,
          Status: enrollment.status,
          HoursSpent: Number(enrollment.hoursSpent.toFixed(1)),
          PlannedHours: course.hours
        }))
        .orderByDescending((row) => row.HoursSpent)
        .take(15)
        .toArray();
    },
    filters: [
      { key: 'department', label: 'Department' },
      { key: 'courseCategory', label: 'Category' },
      { key: 'status', label: 'Status' }
    ]
  },
  {
    id: 'proctor-utilization',
    title: 'Proctor Utilization',
    summaryQuery: (ctx) => {
      const perProctor = metrics.proctors.summary(ctx);
      const busiest = perProctor[0];

      return {
        label: busiest ? `${busiest.proctor}` : 'No activity',
        value: busiest ? formatNumber(busiest.total) : 0,
        trendLabel: busiest ? `${formatPercent(busiest.completions / (busiest.total || 1))} completion rate` : undefined
      };
    },
    detailQuery: (ctx) =>
      metrics.proctors.summary(ctx).map((entry) => ({
        Proctor: entry.proctor,
        Sessions: entry.total,
        Completions: entry.completions,
        AvgScore: entry.averageScore
      })),
    filters: [
      { key: 'status', label: 'Status' }
    ]
  }
];
