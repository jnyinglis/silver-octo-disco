import { describe, expect, it } from 'vitest';
import sampleDataJson from '@/data/sampleData.json';
import { cardConfigs } from '@/config/cardConfigs';
import { createQueryContext } from '@/utils/linqHelpers';
import type { DashboardFilters, MiniDatabase } from '@/types/dashboard';

const sampleData = sampleDataJson as MiniDatabase;

const filters: DashboardFilters = { status: 'all' };
const context = createQueryContext(sampleData, filters);

describe('card configuration queries', () => {
  it('computes completion totals from sample data', () => {
    const card = cardConfigs.find((config) => config.id === 'completed-total');
    expect(card).toBeDefined();

    const summary = card!.summaryQuery(context);
    expect(summary.value).toBe('1');
    expect(summary.trendLabel).toBe('1 active learners');

    const details = card!.detailQuery(context);
    expect(details).toHaveLength(1);
    expect(details[0].Learner).toBe('Alice Johnson');
  });

  it('groups average score by department', () => {
    const card = cardConfigs.find((config) => config.id === 'average-score');
    expect(card).toBeDefined();

    const summary = card!.summaryQuery(context);
    expect(summary.value).toBe(91);
    expect(summary.trendLabel).toBe('0% failure rate');

    const details = card!.detailQuery(context);
    expect(details).toEqual([
      {
        Department: 'Engineering',
        AverageScore: 91,
        Completions: 1
      }
    ]);
  });

  it('identifies leading category and proctor', () => {
    const categoryCard = cardConfigs.find((config) => config.id === 'category-leaders');
    const proctorCard = cardConfigs.find((config) => config.id === 'proctor-utilization');

    expect(categoryCard).toBeDefined();
    expect(proctorCard).toBeDefined();

    const categorySummary = categoryCard!.summaryQuery(context);
    expect(categorySummary.label).toBe('Leading: Security');
    expect(categorySummary.value).toBe('1');
    expect(categorySummary.trendLabel).toBe('50%');

    const categoryDetails = categoryCard!.detailQuery(context);
    expect(categoryDetails).toEqual([
      {
        Category: 'Security',
        Completions: 1,
        UniqueLearners: 1,
        AvgScore: 91
      }
    ]);

    const proctorSummary = proctorCard!.summaryQuery(context);
    expect(proctorSummary.label).toBe('Olivia Roberts');
    expect(proctorSummary.value).toBe('2');
    expect(proctorSummary.trendLabel).toBe('50% completion rate');

    const proctorDetails = proctorCard!.detailQuery(context);
    expect(proctorDetails).toEqual([
      {
        Proctor: 'Olivia Roberts',
        Sessions: 2,
        Completions: 1,
        AvgScore: 76.5
      }
    ]);
  });

  it('aggregates learning hours with joins', () => {
    const card = cardConfigs.find((config) => config.id === 'learning-hours');

    expect(card).toBeDefined();

    const summary = card!.summaryQuery(context);
    expect(summary.value).toBe('8.0 hrs');
    expect(summary.trendLabel).toBe('80% of planned');

    const details = card!.detailQuery(context);
    expect(details).toEqual([
      {
        Learner: 'Alice Johnson',
        Course: 'Security Essentials 1',
        Status: 'completed',
        HoursSpent: 5.5,
        PlannedHours: 6
      },
      {
        Learner: 'Benjamin Ortiz',
        Course: 'Leadership Essentials 1',
        Status: 'in-progress',
        HoursSpent: 2.5,
        PlannedHours: 4
      }
    ]);
  });
});
