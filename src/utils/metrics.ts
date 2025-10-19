import Enumerable from 'linq';
import type { CourseCategory, Enrollment, EnrollmentStatus, QueryContext } from '@/types/dashboard';
import { filteredEnrollments } from './linqHelpers';

export type MetricFn<T> = (ctx: QueryContext) => T;

const enrollments: MetricFn<Enumerable.IEnumerable<Enrollment>> = (ctx) => filteredEnrollments(ctx);

const enrollmentsByStatus = (status: EnrollmentStatus): MetricFn<Enumerable.IEnumerable<Enrollment>> =>
  (ctx) => enrollments(ctx).where((enrollment) => enrollment.status === status);

const completedEnrollments = enrollmentsByStatus('completed');
const activeEnrollments = enrollmentsByStatus('in-progress');
const failedEnrollments = enrollmentsByStatus('failed');

const safeAverage = (values: Enumerable.IEnumerable<number>, precision = 1): number => {
  const average = values.average();
  if (!Number.isFinite(average)) {
    return 0;
  }
  return Number(average.toFixed(precision));
};

const categoryFromEnrollment = (ctx: QueryContext) =>
  (enrollment: Enrollment): CourseCategory | 'Unknown' =>
    ctx.lookups.coursesById.get(enrollment.courseId)?.category ?? 'Unknown';

const joinEnrollmentsWithCourses: MetricFn<Enumerable.IEnumerable<{ enrollment: Enrollment; course: { id: string; title: string; hours: number; category: CourseCategory } }>> =
  (ctx) =>
    enrollments(ctx).join(
      Enumerable.from(ctx.data.courses),
      (enrollment) => enrollment.courseId,
      (course) => course.id,
      (enrollment, course) => ({
        enrollment,
        course
      })
    );

const categoryLeaderboard = (
  ctx: QueryContext
): Array<{ category: string; completions: number; uniqueLearners: number; averageScore: number }> =>
  completedEnrollments(ctx)
    .groupBy(
      categoryFromEnrollment(ctx),
      undefined,
      (key, group) => ({
        category: key,
        completions: group.count(),
        uniqueLearners: group
          .select((enrollment) => enrollment.userId)
          .distinct()
          .count(),
        averageScore: safeAverage(group.select((enrollment) => enrollment.score))
      })
    )
    .orderByDescending((result) => result.completions)
    .toArray();

const proctorSummary = (
  ctx: QueryContext
): Array<{ proctor: string; total: number; completions: number; averageScore: number }> =>
  enrollments(ctx)
    .groupBy(
      (enrollment) => ctx.lookups.proctorsById.get(enrollment.proctorId)?.fullName ?? 'Unknown',
      undefined,
      (key, group) => ({
        proctor: key,
        total: group.count(),
        completions: group.where((enrollment) => enrollment.status === 'completed').count(),
        averageScore: safeAverage(group.select((enrollment) => enrollment.score))
      })
    )
    .orderByDescending((result) => result.total)
    .toArray();

const totalEnrollmentCount: MetricFn<number> = (ctx) => enrollments(ctx).count();
const completedEnrollmentCount: MetricFn<number> = (ctx) => completedEnrollments(ctx).count();
const activeEnrollmentCount: MetricFn<number> = (ctx) => activeEnrollments(ctx).count();
const failedEnrollmentCount: MetricFn<number> = (ctx) => failedEnrollments(ctx).count();

const failureRate: MetricFn<number> = (ctx) => {
  const total = totalEnrollmentCount(ctx);
  if (total === 0) {
    return 0;
  }
  return failedEnrollmentCount(ctx) / total;
};

const completedAverageScore: MetricFn<number> = (ctx) =>
  safeAverage(completedEnrollments(ctx).select((enrollment) => enrollment.score));

const departmentAverages = (
  ctx: QueryContext
): Array<{ department: string; averageScore: number; completions: number }> =>
  enrollments(ctx)
    .where((enrollment) => enrollment.status !== 'in-progress')
    .groupBy(
      (enrollment) => ctx.lookups.usersById.get(enrollment.userId)?.department ?? 'Unknown',
      undefined,
      (key, group) => ({
        department: key,
        averageScore: safeAverage(group.select((enrollment) => enrollment.score)),
        completions: group.where((enrollment) => enrollment.status === 'completed').count()
      })
    )
    .orderByDescending((result) => result.averageScore)
    .toArray();

const totalLoggedHours: MetricFn<number> = (ctx) => enrollments(ctx).sum((enrollment) => enrollment.hoursSpent);

const totalPlannedHours: MetricFn<number> = (ctx) =>
  joinEnrollmentsWithCourses(ctx).sum(({ course }) => course.hours);

const hourUtilization: MetricFn<number> = (ctx) => {
  const planned = totalPlannedHours(ctx);
  if (planned === 0) {
    return 0;
  }
  return totalLoggedHours(ctx) / planned;
};

export const metrics = {
  enrollments: {
    all: enrollments,
    byStatus: enrollmentsByStatus,
    completed: completedEnrollments,
    active: activeEnrollments,
    failed: failedEnrollments,
    counts: {
      total: totalEnrollmentCount,
      completed: completedEnrollmentCount,
      active: activeEnrollmentCount,
      failed: failedEnrollmentCount
    },
    failureRate
  },
  scores: {
    completedAverage: completedAverageScore,
    byDepartment: departmentAverages
  },
  categories: {
    leaderboard: categoryLeaderboard
  },
  hours: {
    joined: joinEnrollmentsWithCourses,
    totalLogged: totalLoggedHours,
    totalPlanned: totalPlannedHours,
    utilization: hourUtilization
  },
  proctors: {
    summary: proctorSummary
  }
} as const;

export const getMetric = <T>(metric: MetricFn<T>, ctx: QueryContext): T => metric(ctx);

