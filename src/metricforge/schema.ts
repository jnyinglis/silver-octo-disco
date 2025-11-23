import type { Schema, LogicalAttribute } from 'metricforge/src/semanticEngine';

/**
 * Logical attributes map semantic names to physical table/column locations.
 * Column defaults to the attribute ID when not specified.
 */
const attributes: Record<string, LogicalAttribute> = {
  // Enrollment (fact) attributes
  enrollmentId: { table: 'fact_enrollments', column: 'id' },
  userId: { table: 'fact_enrollments' },
  courseId: { table: 'fact_enrollments' },
  proctorId: { table: 'fact_enrollments' },
  status: { table: 'fact_enrollments' },
  score: { table: 'fact_enrollments' },
  completedAt: { table: 'fact_enrollments' },
  hoursSpent: { table: 'fact_enrollments' },

  // User (dimension) attributes
  userFullName: { table: 'dim_users', column: 'fullName' },
  department: { table: 'dim_users' },
  userRole: { table: 'dim_users', column: 'role' },
  userLocation: { table: 'dim_users', column: 'location' },

  // Course (dimension) attributes
  courseTitle: { table: 'dim_courses', column: 'title' },
  category: { table: 'dim_courses' },
  difficulty: { table: 'dim_courses' },
  courseHours: { table: 'dim_courses', column: 'hours' },

  // Proctor (dimension) attributes
  proctorFullName: { table: 'dim_proctors', column: 'fullName' },
  proctorLocation: { table: 'dim_proctors', column: 'location' },
};

/**
 * Dashboard semantic schema defining facts, dimensions, attributes, and joins.
 */
export const dashboardSchema: Schema = {
  facts: {
    fact_enrollments: { table: 'fact_enrollments' },
  },
  dimensions: {
    dim_users: { table: 'dim_users' },
    dim_courses: { table: 'dim_courses' },
    dim_proctors: { table: 'dim_proctors' },
  },
  attributes,
  joins: [
    {
      fact: 'fact_enrollments',
      dimension: 'dim_users',
      factKey: 'userId',
      dimensionKey: 'id',
    },
    {
      fact: 'fact_enrollments',
      dimension: 'dim_courses',
      factKey: 'courseId',
      dimensionKey: 'id',
    },
    {
      fact: 'fact_enrollments',
      dimension: 'dim_proctors',
      factKey: 'proctorId',
      dimensionKey: 'id',
    },
  ],
};
