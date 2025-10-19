import Enumerable from 'linq';
import type { DashboardFilters, Enrollment, MiniDatabase, QueryContext, QueryLookups } from '@/types/dashboard';

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
  Enumerable
});

/**
 * Returns an Enumerable filtered according to global dashboard filters.
 * Consumers can continue chaining LINQ operations without touching raw arrays.
 */
export const filteredEnrollments = (ctx: QueryContext): Enumerable.IEnumerable<Enrollment> => {
  const { filters, lookups } = ctx;

  let query = Enumerable.from(ctx.data.enrollments);

  if (filters.status && filters.status !== 'all') {
    query = query.where((enrollment) => enrollment.status === filters.status);
  }

  if (filters.department) {
    query = query.where((enrollment) => lookups.usersById.get(enrollment.userId)?.department === filters.department);
  }

  if (filters.courseCategory) {
    query = query.where((enrollment) => lookups.coursesById.get(enrollment.courseId)?.category === filters.courseCategory);
  }

  if (filters.search) {
    const lowered = filters.search.toLowerCase();
    query = query.where((enrollment) => {
      const user = lookups.usersById.get(enrollment.userId);
      const course = lookups.coursesById.get(enrollment.courseId);
      return (
        user?.fullName.toLowerCase().includes(lowered ?? '') ||
        course?.title.toLowerCase().includes(lowered ?? '')
      );
    });
  }

  return query;
};

export const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

export const formatNumber = (value: number): string => value.toLocaleString();

export const formatHours = (value: number): string => `${value.toFixed(1)} hrs`;

