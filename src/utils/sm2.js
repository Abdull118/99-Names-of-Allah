export const DEFAULT_CARD_STATE = {
  repetitions: 0,
  interval: 0,
  easiness: 2.5,
  stage: 'learning',
  learningStep: 0,
  nextIntervalMinutes: null,
  nextIntervalDays: null,
  lastReviewedDate: null,
  lastPassedDate: null,
};

const MIN_EASINESS_FACTOR = 1.3;

export const clampQuality = (quality) => {
  if (!Number.isFinite(quality)) {
    return 0;
  }

  if (quality < 0) {
    return 0;
  }

  if (quality > 5) {
    return 5;
  }

  return Math.round(quality);
};

export const calculateSM2 = (cardState, quality) => {
  const safeState = {
    ...DEFAULT_CARD_STATE,
    ...cardState,
  };

  const q = clampQuality(quality);
  const repetitions = Number.isFinite(safeState.repetitions) ? safeState.repetitions : 0;
  const interval = Number.isFinite(safeState.interval) ? safeState.interval : 0;
  const easiness = Number.isFinite(safeState.easiness)
    ? safeState.easiness
    : DEFAULT_CARD_STATE.easiness;
  const stage = safeState.stage === 'review' ? 'review' : 'learning';
  const learningStep = Number.isFinite(safeState.learningStep) ? safeState.learningStep : 0;

  let nextRepetitions;
  let nextInterval;
  let nextStage = stage;
  let nextLearningStep = learningStep;
  let nextIntervalMinutes = null;
  let nextIntervalDays = null;

  if (stage === 'learning') {
    if (q <= 1) {
      nextRepetitions = 0;
      nextInterval = 0;
      nextStage = 'learning';
      nextLearningStep = 0;
      nextIntervalMinutes = 1;
    } else if (q === 2) {
      nextRepetitions = 0;
      nextInterval = 0;
      nextStage = 'learning';
      nextLearningStep = Math.max(0, learningStep);
      nextIntervalMinutes = 5;
    } else if (q === 5) {
      nextRepetitions = 2;
      nextInterval = 4;
      nextStage = 'review';
      nextLearningStep = 0;
      nextIntervalDays = 4;
    } else if (learningStep === 0) {
      nextRepetitions = 0;
      nextInterval = 0;
      nextStage = 'learning';
      nextLearningStep = 1;
      nextIntervalMinutes = 10;
    } else {
      nextRepetitions = 1;
      nextInterval = 1;
      nextStage = 'review';
      nextLearningStep = 0;
      nextIntervalDays = 1;
    }
  } else if (q < 3) {
    nextRepetitions = 0;
    nextInterval = 1;
    nextStage = 'review';
    nextLearningStep = 0;
    nextIntervalDays = 1;
  } else if (repetitions === 0) {
    nextRepetitions = 1;
    nextInterval = 1;
    nextStage = 'review';
    nextLearningStep = 0;
    nextIntervalDays = 1;
  } else if (repetitions === 1) {
    nextRepetitions = 2;
    nextInterval = 6;
    nextStage = 'review';
    nextLearningStep = 0;
    nextIntervalDays = 6;
  } else {
    nextRepetitions = repetitions + 1;
    nextInterval = Math.max(1, Math.round(interval * easiness));
    nextStage = 'review';
    nextLearningStep = 0;
    nextIntervalDays = nextInterval;
  }

  const adjustedEasiness = easiness +
    (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  return {
    repetitions: nextRepetitions,
    interval: nextInterval,
    easiness: Math.max(MIN_EASINESS_FACTOR, Number(adjustedEasiness.toFixed(2))),
    stage: nextStage,
    learningStep: nextLearningStep,
    nextIntervalMinutes,
    nextIntervalDays,
  };
};

export const getNextReviewDate = (scheduleData, baseDate = new Date()) => {
  const nextReview = new Date(baseDate);

  const intervalMinutes = Number(scheduleData?.nextIntervalMinutes);
  if (Number.isFinite(intervalMinutes) && intervalMinutes > 0) {
    nextReview.setMinutes(nextReview.getMinutes() + intervalMinutes);
    return nextReview;
  }

  const intervalDays = Number(scheduleData?.nextIntervalDays ?? scheduleData?.interval);
  const days = Math.max(1, intervalDays || 1);
  nextReview.setDate(nextReview.getDate() + days);
  return nextReview;
};

const toSafeDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const findNextDueCardIndex = (cardsArray, referenceDate = new Date()) => {
  let dueIndex = null;
  let earliestDueTime = Number.POSITIVE_INFINITY;

  cardsArray.forEach((card, index) => {
    const parsedDate = toSafeDate(card.nextReview);
    if (!parsedDate || parsedDate > referenceDate) {
      return;
    }

    const dueTime = parsedDate.getTime();
    if (dueTime < earliestDueTime) {
      earliestDueTime = dueTime;
      dueIndex = index;
    }
  });

  return dueIndex;
};

export const getNextUpcomingReviewDate = (cardsArray, referenceDate = new Date()) => {
  let nearestFuture = null;

  cardsArray.forEach((card) => {
    const parsedDate = toSafeDate(card.nextReview);
    if (!parsedDate || parsedDate <= referenceDate) {
      return;
    }

    if (!nearestFuture || parsedDate < nearestFuture) {
      nearestFuture = parsedDate;
    }
  });

  return nearestFuture;
};
