import { faker } from '@faker-js/faker';
import type {
  Course,
  CourseCategory,
  Department,
  Enrollment,
  EnrollmentStatus,
  MiniDatabase,
  Proctor,
  User
} from '@/types/dashboard';

export interface FakeDataOptions {
  seed?: number;
  counts?: {
    users?: number;
    courses?: number;
    proctors?: number;
    enrollments?: number;
  };
}

const departmentPool: Department[] = [
  'Engineering',
  'Customer Success',
  'People Operations',
  'Finance',
  'Security'
];

const categoryPool: CourseCategory[] = ['Compliance', 'Security', 'Leadership', 'Technology', 'Sales'];
const statusPool: EnrollmentStatus[] = ['completed', 'in-progress', 'failed'];
const difficultyPool: Course['difficulty'][] = ['Beginner', 'Intermediate', 'Advanced'];

const randomFrom = <T>(items: T[]): T => faker.helpers.arrayElement(items);

export const generateFakeDatabase = (options: FakeDataOptions = {}): MiniDatabase => {
  const { seed = 123, counts } = options;
  const totalUsers = counts?.users ?? 24;
  const totalCourses = counts?.courses ?? 12;
  const totalProctors = counts?.proctors ?? 6;
  const totalEnrollments = counts?.enrollments ?? 120;

  faker.seed(seed);

  const users: User[] = Array.from({ length: totalUsers }).map(() => ({
    id: faker.string.uuid(),
    fullName: faker.person.fullName(),
    department: randomFrom(departmentPool),
    role: faker.person.jobTitle(),
    location: faker.location.city()
  }));

  const courses: Course[] = Array.from({ length: totalCourses }).map(() => ({
    id: faker.string.uuid(),
    title: `${randomFrom(categoryPool)} Essentials ${faker.number.int({ min: 1, max: 3 })}`,
    category: randomFrom(categoryPool),
    difficulty: randomFrom(difficultyPool),
    hours: faker.number.int({ min: 3, max: 12 })
  }));

  const proctors: Proctor[] = Array.from({ length: totalProctors }).map(() => ({
    id: faker.string.uuid(),
    fullName: faker.person.fullName(),
    location: faker.location.city()
  }));

  const enrollments: Enrollment[] = Array.from({ length: totalEnrollments }).map(() => {
    const status = faker.helpers.weightedArrayElement<EnrollmentStatus>([
      { value: 'completed', weight: 0.55 },
      { value: 'in-progress', weight: 0.35 },
      { value: 'failed', weight: 0.1 }
    ]);

    const course = randomFrom(courses);
    const user = randomFrom(users);
    const proctor = randomFrom(proctors);

    const completedAt =
      status === 'completed'
        ? faker.date.recent({ days: 120 }).toISOString()
        : status === 'failed'
        ? faker.date.past({ years: 1 }).toISOString()
        : undefined;

    return {
      id: faker.string.uuid(),
      userId: user.id,
      courseId: course.id,
      proctorId: proctor.id,
      status,
      score: faker.number.int({ min: status === 'completed' ? 70 : 40, max: 100 }),
      completedAt,
      hoursSpent: faker.number.float({ min: 1, max: course.hours, fractionDigits: 1 })
    } satisfies Enrollment;
  });

  return {
    users,
    courses,
    proctors,
    enrollments
  } satisfies MiniDatabase;
};
