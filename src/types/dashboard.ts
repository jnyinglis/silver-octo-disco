import type { Enumerable } from 'linq';

export interface User {
  id: string;
  fullName: string;
  department: Department;
  role: string;
  location: string;
}

export type Department = 'Engineering' | 'Customer Success' | 'People Operations' | 'Finance' | 'Security';

export interface Course {
  id: string;
  title: string;
  category: CourseCategory;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  hours: number;
}

export type CourseCategory = 'Compliance' | 'Security' | 'Leadership' | 'Technology' | 'Sales';

export interface Proctor {
  id: string;
  fullName: string;
  location: string;
}

export type EnrollmentStatus = 'completed' | 'in-progress' | 'failed';

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  proctorId: string;
  status: EnrollmentStatus;
  score: number;
  completedAt?: string;
  hoursSpent: number;
}

export interface MiniDatabase {
  users: User[];
  courses: Course[];
  proctors: Proctor[];
  enrollments: Enrollment[];
}

export interface DashboardFilters {
  department?: Department;
  courseCategory?: CourseCategory;
  status?: EnrollmentStatus | 'all';
  search?: string;
}

export interface CardFilterMeta {
  key: keyof DashboardFilters;
  label: string;
}

export interface QueryLookups {
  usersById: Map<string, User>;
  coursesById: Map<string, Course>;
  proctorsById: Map<string, Proctor>;
}

export interface QueryContext {
  data: MiniDatabase;
  filters: DashboardFilters;
  lookups: QueryLookups;
  Enumerable: typeof Enumerable;
}

export interface CardSummaryResult {
  label: string;
  value: string | number;
  trendLabel?: string;
}

export interface CardDetailRow {
  [key: string]: string | number | undefined | null;
}

export interface CardConfig<TSummary = CardSummaryResult, TDetail = CardDetailRow> {
  id: string;
  title: string;
  summaryQuery: (ctx: QueryContext) => TSummary;
  detailQuery: (ctx: QueryContext) => TDetail[];
  filters?: CardFilterMeta[];
  component?: string;
}
