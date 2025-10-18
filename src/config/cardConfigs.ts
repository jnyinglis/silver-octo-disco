import Enumerable from 'linq';
import type { CardConfig } from '@/types/dashboard';
import {
  average,
  filteredEnrollments,
  formatHours,
  formatNumber,
  formatPercent,
  sortDescending,
  sum
} from '@/utils/linqHelpers';

export const cardConfigs: CardConfig[] = [
  {
    id: 'completed-total',
    title: 'Completed Certifications',
    summaryQuery: (ctx) => {
      const completed = filteredEnrollments(ctx).where((enrollment) => enrollment.status === 'completed');
      const completedCount = completed.count();
      const activeCount = filteredEnrollments(ctx).where((enrollment) => enrollment.status === 'in-progress').count();

      return {
        label: 'Total completions',
        value: formatNumber(completedCount),
        trendLabel: `${formatNumber(activeCount)} active learners`
      };
    },
    detailQuery: (ctx) => {
      const { lookups } = ctx;

      return filteredEnrollments(ctx)
        .where((enrollment) => enrollment.status === 'completed')
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
      const scores = filteredEnrollments(ctx)
        .where((enrollment) => enrollment.status === 'completed')
        .select((enrollment) => enrollment.score);

      const value = average(scores);

      const failedShare = filteredEnrollments(ctx)
        .where((enrollment) => enrollment.status === 'failed')
        .count();
      const total = filteredEnrollments(ctx).count();
      const failureRate = total === 0 ? 0 : failedShare / total;

      return {
        label: 'Mean score (completed)',
        value,
        trendLabel: `${formatPercent(failureRate)} failure rate`
      };
    },
    detailQuery: (ctx) => {
      const { lookups } = ctx;

      return filteredEnrollments(ctx)
        .where((enrollment) => enrollment.status !== 'in-progress')
        .groupBy(
          (enrollment) => lookups.usersById.get(enrollment.userId)?.department ?? 'Unknown',
          undefined,
          (key, group) => ({
            Department: key,
            AverageScore: average(group.select((enrollment) => enrollment.score)),
            Completions: group.where((enrollment) => enrollment.status === 'completed').count()
          })
        )
        .orderByDescending((result) => result.AverageScore)
        .toArray();
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
      const categories = filteredEnrollments(ctx)
        .where((enrollment) => enrollment.status === 'completed')
        .groupBy(
          (enrollment) => ctx.lookups.coursesById.get(enrollment.courseId)?.category ?? 'Unknown',
          undefined,
          (key, group) => ({
            category: key,
            completions: group.count()
          })
        )
        .orderByDescending((result) => result.completions)
        .toArray();

      const top = categories[0];
      const share = filteredEnrollments(ctx).count();

      return {
        label: top ? `Leading: ${top.category}` : 'No completions',
        value: top ? formatNumber(top.completions) : 0,
        trendLabel: top && share ? `${formatPercent(top.completions / share)}` : undefined
      };
    },
    detailQuery: (ctx) =>
      filteredEnrollments(ctx)
        .where((enrollment) => enrollment.status === 'completed')
        .groupBy(
          (enrollment) => ctx.lookups.coursesById.get(enrollment.courseId)?.category ?? 'Unknown',
          undefined,
          (key, group) => ({
            Category: key,
            Completions: group.count(),
            UniqueLearners: group
              .select((enrollment) => enrollment.userId)
              .distinct()
              .count(),
            AvgScore: average(group.select((enrollment) => enrollment.score))
          })
        )
        .orderByDescending((result) => result.Completions)
        .toArray(),
    filters: [
      { key: 'courseCategory', label: 'Category' },
      { key: 'status', label: 'Status' }
    ]
  },
  {
    id: 'learning-hours',
    title: 'Learning Hours Logged',
    summaryQuery: (ctx) => {
      const joined = filteredEnrollments(ctx).join(
        Enumerable.from(ctx.data.courses),
        (enrollment) => enrollment.courseId,
        (course) => course.id,
        (enrollment, course) => ({ enrollment, course })
      );

      const totalLogged = sum(joined.select((item) => item.enrollment.hoursSpent));
      const totalPlanned = sum(joined.select((item) => item.course.hours));
      const utilization = totalPlanned === 0 ? 0 : totalLogged / totalPlanned;

      return {
        label: 'Logged vs. planned hours',
        value: formatHours(totalLogged),
        trendLabel: `${formatPercent(utilization)} of planned`
      };
    },
    detailQuery: (ctx) => {
      const { lookups } = ctx;

      return filteredEnrollments(ctx)
        .join(
          Enumerable.from(ctx.data.courses),
          (enrollment) => enrollment.courseId,
          (course) => course.id,
          (enrollment, course) => ({
            Learner: lookups.usersById.get(enrollment.userId)?.fullName ?? 'Unknown',
            Course: course.title,
            Status: enrollment.status,
            HoursSpent: Number(enrollment.hoursSpent.toFixed(1)),
            PlannedHours: course.hours
          })
        )
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
      const perProctor = filteredEnrollments(ctx)
        .groupBy(
          (enrollment) => ctx.lookups.proctorsById.get(enrollment.proctorId)?.fullName ?? 'Unknown',
          undefined,
          (key, group) => ({
            proctor: key,
            total: group.count(),
            completions: group.where((enrollment) => enrollment.status === 'completed').count()
          })
        )
        .toArray();

      const busiest = sortDescending(Enumerable.from(perProctor), (item) => item.total).firstOrDefault();

      return {
        label: busiest ? `${busiest.proctor}` : 'No activity',
        value: busiest ? formatNumber(busiest.total) : 0,
        trendLabel: busiest ? `${formatPercent(busiest.completions / (busiest.total || 1))} completion rate` : undefined
      };
    },
    detailQuery: (ctx) =>
      filteredEnrollments(ctx)
        .groupBy(
          (enrollment) => ctx.lookups.proctorsById.get(enrollment.proctorId)?.fullName ?? 'Unknown',
          undefined,
          (key, group) => ({
            Proctor: key,
            Sessions: group.count(),
            Completions: group.where((enrollment) => enrollment.status === 'completed').count(),
            AvgScore: average(group.select((enrollment) => enrollment.score))
          })
        )
        .orderByDescending((result) => result.Sessions)
        .toArray(),
    filters: [
      { key: 'status', label: 'Status' }
    ]
  }
];
