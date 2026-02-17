import {
  calculateSM2,
  findNextDueCardIndex,
  getNextReviewDate,
} from './sm2';

describe('SM-2 learning steps', () => {
  test('very hard schedules 1 minute repeat', () => {
    const result = calculateSM2({ stage: 'learning', learningStep: 0, easiness: 2.5 }, 1);

    expect(result.stage).toBe('learning');
    expect(result.learningStep).toBe(0);
    expect(result.nextIntervalMinutes).toBe(1);
  });

  test('hard schedules 5 minute repeat', () => {
    const result = calculateSM2({ stage: 'learning', learningStep: 0, easiness: 2.5 }, 2);

    expect(result.stage).toBe('learning');
    expect(result.nextIntervalMinutes).toBe(5);
  });

  test('first good schedules 10 minute repeat', () => {
    const result = calculateSM2({ stage: 'learning', learningStep: 0, easiness: 2.5 }, 4);

    expect(result.stage).toBe('learning');
    expect(result.learningStep).toBe(1);
    expect(result.nextIntervalMinutes).toBe(10);
  });

  test('second consecutive good schedules 1 day and graduates to review', () => {
    const result = calculateSM2({ stage: 'learning', learningStep: 1, easiness: 2.5 }, 4);

    expect(result.stage).toBe('review');
    expect(result.repetitions).toBe(1);
    expect(result.interval).toBe(1);
    expect(result.nextIntervalDays).toBe(1);
  });

  test('easy in learning schedules 4 days and graduates to review', () => {
    const result = calculateSM2({ stage: 'learning', learningStep: 0, easiness: 2.5 }, 5);

    expect(result.stage).toBe('review');
    expect(result.interval).toBe(4);
    expect(result.nextIntervalDays).toBe(4);
  });
});

describe('SM-2 review mode', () => {
  test('after graduating, review follows standard schedule', () => {
    const result = calculateSM2({ stage: 'review', repetitions: 1, interval: 1, easiness: 2.5 }, 5);

    expect(result.stage).toBe('review');
    expect(result.repetitions).toBe(2);
    expect(result.interval).toBe(6);
    expect(result.nextIntervalDays).toBe(6);
  });

  test('review lapse resets to 1 day', () => {
    const result = calculateSM2({ stage: 'review', repetitions: 4, interval: 18, easiness: 2.2 }, 2);

    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(1);
    expect(result.nextIntervalDays).toBe(1);
  });

  test('easiness factor never drops below 1.3', () => {
    const result = calculateSM2({ stage: 'review', repetitions: 3, interval: 20, easiness: 1.3 }, 0);

    expect(result.easiness).toBe(1.3);
  });
});

describe('review date helpers', () => {
  test('adds interval in minutes for learning cards', () => {
    const baseDate = new Date('2026-01-01T00:00:00.000Z');
    const nextReview = getNextReviewDate({ nextIntervalMinutes: 10 }, baseDate);

    expect(nextReview.toISOString()).toBe('2026-01-01T00:10:00.000Z');
  });

  test('adds interval in days for review cards', () => {
    const baseDate = new Date('2026-01-01T00:00:00.000Z');
    const nextReview = getNextReviewDate({ nextIntervalDays: 6 }, baseDate);

    expect(nextReview.toISOString()).toBe('2026-01-07T00:00:00.000Z');
  });

  test('finds earliest due card index', () => {
    const referenceDate = new Date('2026-01-10T12:00:00.000Z');

    const cards = [
      { nextReview: '2026-01-11T08:00:00.000Z' },
      { nextReview: '2026-01-09T08:00:00.000Z' },
      { nextReview: '2026-01-10T07:00:00.000Z' },
    ];

    expect(findNextDueCardIndex(cards, referenceDate)).toBe(1);
  });
});
