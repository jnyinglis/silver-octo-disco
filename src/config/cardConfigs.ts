import type { CardConfig, QueryContext } from '@/types/dashboard';
import { formatHours, formatNumber, formatPercent, formatScore } from '@/utils/linqHelpers';
import { toFilterContext, type QuerySpec, type Row } from '@/metricforge';

/**
 * Helper to run a MetricForge query with dashboard filters applied.
 */
function runFilteredQuery(ctx: QueryContext, spec: QuerySpec): Row[] {
  const filterCtx = toFilterContext(ctx.filters);
  const queryWithFilters: QuerySpec = {
    ...spec,
    where: filterCtx ?? spec.where,
  };
  return ctx.engine.runQuery(queryWithFilters);
}

/**
 * Helper to get a single metric value from a query result.
 */
function getMetricValue(rows: Row[], metric: string): number {
  if (rows.length === 0) return 0;
  const value = rows[0]?.[metric];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * Helper to sum a metric across all rows.
 */
function sumMetric(rows: Row[], metric: string): number {
  return rows.reduce((sum, row) => {
    const value = row[metric];
    return sum + (typeof value === 'number' && Number.isFinite(value) ? value : 0);
  }, 0);
}

export const cardConfigs: CardConfig[] = [
  {
    id: 'completed-total',
    title: 'Completed Certifications',
    summaryQuery: (ctx) => {
      // Query for completed count
      const completedRows = runFilteredQuery(ctx, {
        dimensions: ['status'],
        metrics: ['total_enrollments'],
      });

      const completedCount = completedRows.find((r) => r.status === 'completed')?.total_enrollments ?? 0;
      const activeCount = completedRows.find((r) => r.status === 'in-progress')?.total_enrollments ?? 0;

      return {
        label: 'Total completions',
        value: formatNumber(completedCount as number),
        trendLabel: `${formatNumber(activeCount as number)} active learners`
      };
    },
    detailQuery: (ctx) => {
      const { lookups, data, filters } = ctx;

      // For detail queries, we still need to work with the raw data
      // since we need to show individual enrollment rows
      let enrollments = data.enrollments.filter((e) => e.status === 'completed');

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        enrollments = enrollments.filter((e) => e.status === filters.status);
      }
      if (filters.department) {
        enrollments = enrollments.filter((e) =>
          lookups.usersById.get(e.userId)?.department === filters.department
        );
      }
      if (filters.courseCategory) {
        enrollments = enrollments.filter((e) =>
          lookups.coursesById.get(e.courseId)?.category === filters.courseCategory
        );
      }

      return enrollments
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
        .slice(0, 15)
        .map((enrollment) => ({
          Learner: lookups.usersById.get(enrollment.userId)?.fullName ?? 'Unknown',
          Department: lookups.usersById.get(enrollment.userId)?.department ?? 'N/A',
          Course: lookups.coursesById.get(enrollment.courseId)?.title ?? 'Unknown',
          Score: enrollment.score,
          Completed: enrollment.completedAt ? new Date(enrollment.completedAt).toLocaleDateString() : '—'
        }));
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
      // Query for completed average score
      const completedRows = runFilteredQuery(ctx, {
        dimensions: ['status'],
        metrics: ['avg_score', 'total_enrollments'],
      });

      const completed = completedRows.find((r) => r.status === 'completed');
      const failed = completedRows.find((r) => r.status === 'failed');
      const totalEnrollments = sumMetric(completedRows, 'total_enrollments');

      const avgScore = completed?.avg_score ?? 0;
      const failedCount = failed?.total_enrollments ?? 0;
      const failureRate = totalEnrollments > 0 ? failedCount / totalEnrollments : 0;

      return {
        label: 'Mean score (completed)',
        value: formatScore(avgScore as number),
        trendLabel: `${formatPercent(failureRate)} failure rate`
      };
    },
    detailQuery: (ctx) => {
      const { lookups, data, filters } = ctx;

      // Filter enrollments to exclude in-progress (original behavior)
      let enrollments = data.enrollments.filter((e) => e.status !== 'in-progress');

      // Apply dashboard filters
      if (filters.status && filters.status !== 'all') {
        enrollments = enrollments.filter((e) => e.status === filters.status);
      }
      if (filters.department) {
        enrollments = enrollments.filter((e) =>
          lookups.usersById.get(e.userId)?.department === filters.department
        );
      }

      // Group by department
      const deptData: Record<string, { totalScore: number; count: number; completions: number }> = {};
      enrollments.forEach((e) => {
        const dept = lookups.usersById.get(e.userId)?.department ?? 'Unknown';
        if (!deptData[dept]) {
          deptData[dept] = { totalScore: 0, count: 0, completions: 0 };
        }
        deptData[dept].totalScore += e.score;
        deptData[dept].count++;
        if (e.status === 'completed') {
          deptData[dept].completions++;
        }
      });

      return Object.entries(deptData)
        .map(([dept, data]) => ({
          Department: dept,
          AverageScore: data.count > 0 ? formatScore(data.totalScore / data.count) : 0,
          Completions: data.completions
        }))
        .sort((a, b) => (b.AverageScore as number) - (a.AverageScore as number));
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
      // Query completions grouped by category
      const allRows = runFilteredQuery(ctx, {
        dimensions: ['category', 'status'],
        metrics: ['total_enrollments', 'avg_score'],
      });

      // Get total enrollments (all statuses) for percentage calculation
      const totalEnrollments = sumMetric(allRows, 'total_enrollments');

      // Filter for completed only and aggregate by category
      const completedByCategory = allRows
        .filter((r) => r.status === 'completed')
        .reduce((acc, row) => {
          const cat = row.category as string;
          if (!acc[cat]) {
            acc[cat] = { completions: 0, avgScore: 0 };
          }
          acc[cat].completions += row.total_enrollments as number;
          acc[cat].avgScore = row.avg_score as number;
          return acc;
        }, {} as Record<string, { completions: number; avgScore: number }>);

      const categories = Object.entries(completedByCategory)
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.completions - a.completions);

      const top = categories[0];

      return {
        label: top ? `Leading: ${top.category}` : 'No completions',
        value: top ? formatNumber(top.completions) : 0,
        trendLabel: top && totalEnrollments ? `${formatPercent(top.completions / totalEnrollments)}` : undefined
      };
    },
    detailQuery: (ctx) => {
      // Query completions grouped by category
      const allRows = runFilteredQuery(ctx, {
        dimensions: ['category', 'status', 'userId'],
        metrics: ['total_enrollments', 'avg_score'],
      });

      // Filter for completed only and aggregate by category with unique learners
      const categoryData: Record<string, { completions: number; uniqueLearners: Set<string>; totalScore: number; scoreCount: number }> = {};

      allRows
        .filter((r) => r.status === 'completed')
        .forEach((row) => {
          const cat = row.category as string;
          const userId = row.userId as string;
          if (!categoryData[cat]) {
            categoryData[cat] = { completions: 0, uniqueLearners: new Set(), totalScore: 0, scoreCount: 0 };
          }
          categoryData[cat].completions += row.total_enrollments as number;
          categoryData[cat].uniqueLearners.add(userId);
          if (row.avg_score) {
            categoryData[cat].totalScore += (row.avg_score as number) * (row.total_enrollments as number);
            categoryData[cat].scoreCount += row.total_enrollments as number;
          }
        });

      return Object.entries(categoryData)
        .map(([category, data]) => ({
          Category: category,
          Completions: data.completions,
          UniqueLearners: data.uniqueLearners.size,
          AvgScore: data.scoreCount > 0 ? formatScore(data.totalScore / data.scoreCount) : 0
        }))
        .sort((a, b) => b.Completions - a.Completions);
    },
    filters: [
      { key: 'courseCategory', label: 'Category' },
      { key: 'status', label: 'Status' }
    ]
  },
  {
    id: 'learning-hours',
    title: 'Learning Hours Logged',
    summaryQuery: (ctx) => {
      // Query for hours metrics
      const rows = runFilteredQuery(ctx, {
        dimensions: [],
        metrics: ['total_hours_spent', 'total_planned_hours'],
      });

      const totalLogged = getMetricValue(rows, 'total_hours_spent');
      const totalPlanned = getMetricValue(rows, 'total_planned_hours');
      const utilization = totalPlanned > 0 ? totalLogged / totalPlanned : 0;

      return {
        label: 'Logged vs. planned hours',
        value: formatHours(totalLogged),
        trendLabel: `${formatPercent(utilization)} of planned`
      };
    },
    detailQuery: (ctx) => {
      const { lookups, data, filters } = ctx;

      // For detail queries, work with raw enrollment data joined with courses
      let enrollments = [...data.enrollments];

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        enrollments = enrollments.filter((e) => e.status === filters.status);
      }
      if (filters.department) {
        enrollments = enrollments.filter((e) =>
          lookups.usersById.get(e.userId)?.department === filters.department
        );
      }
      if (filters.courseCategory) {
        enrollments = enrollments.filter((e) =>
          lookups.coursesById.get(e.courseId)?.category === filters.courseCategory
        );
      }

      return enrollments
        .map((enrollment) => {
          const course = lookups.coursesById.get(enrollment.courseId);
          return {
            Learner: lookups.usersById.get(enrollment.userId)?.fullName ?? 'Unknown',
            Course: course?.title ?? 'Unknown',
            Status: enrollment.status,
            HoursSpent: Number(enrollment.hoursSpent.toFixed(1)),
            PlannedHours: course?.hours ?? 0
          };
        })
        .sort((a, b) => b.HoursSpent - a.HoursSpent)
        .slice(0, 15);
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
      // Query enrollments grouped by proctor
      const rows = runFilteredQuery(ctx, {
        dimensions: ['proctorFullName', 'status'],
        metrics: ['total_enrollments', 'avg_score'],
      });

      // Aggregate by proctor
      const proctorData: Record<string, { total: number; completions: number; totalScore: number; scoreCount: number }> = {};

      rows.forEach((row) => {
        const proctor = row.proctorFullName as string;
        if (!proctorData[proctor]) {
          proctorData[proctor] = { total: 0, completions: 0, totalScore: 0, scoreCount: 0 };
        }
        proctorData[proctor].total += row.total_enrollments as number;
        if (row.status === 'completed') {
          proctorData[proctor].completions += row.total_enrollments as number;
        }
        if (row.avg_score) {
          proctorData[proctor].totalScore += (row.avg_score as number) * (row.total_enrollments as number);
          proctorData[proctor].scoreCount += row.total_enrollments as number;
        }
      });

      const proctors = Object.entries(proctorData)
        .map(([proctor, data]) => ({
          proctor,
          ...data,
          avgScore: data.scoreCount > 0 ? data.totalScore / data.scoreCount : 0
        }))
        .sort((a, b) => b.total - a.total);

      const busiest = proctors[0];

      return {
        label: busiest ? `${busiest.proctor}` : 'No activity',
        value: busiest ? formatNumber(busiest.total) : 0,
        trendLabel: busiest ? `${formatPercent(busiest.completions / (busiest.total || 1))} completion rate` : undefined
      };
    },
    detailQuery: (ctx) => {
      // Query enrollments grouped by proctor
      const rows = runFilteredQuery(ctx, {
        dimensions: ['proctorFullName', 'status'],
        metrics: ['total_enrollments', 'avg_score'],
      });

      // Aggregate by proctor
      const proctorData: Record<string, { total: number; completions: number; totalScore: number; scoreCount: number }> = {};

      rows.forEach((row) => {
        const proctor = row.proctorFullName as string;
        if (!proctorData[proctor]) {
          proctorData[proctor] = { total: 0, completions: 0, totalScore: 0, scoreCount: 0 };
        }
        proctorData[proctor].total += row.total_enrollments as number;
        if (row.status === 'completed') {
          proctorData[proctor].completions += row.total_enrollments as number;
        }
        if (row.avg_score) {
          proctorData[proctor].totalScore += (row.avg_score as number) * (row.total_enrollments as number);
          proctorData[proctor].scoreCount += row.total_enrollments as number;
        }
      });

      return Object.entries(proctorData)
        .map(([proctor, data]) => ({
          Proctor: proctor,
          Sessions: data.total,
          Completions: data.completions,
          AvgScore: data.scoreCount > 0 ? formatScore(data.totalScore / data.scoreCount) : 0
        }))
        .sort((a, b) => b.Sessions - a.Sessions);
    },
    filters: [
      { key: 'status', label: 'Status' }
    ]
  }
];
