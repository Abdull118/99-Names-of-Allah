import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import './App.css';
import islamicBackdrop from './images/islamicBackdrop.svg';
import { useWindowWidth } from './components/functions/useWindowWidth';
import { getIslamicExplanation } from './data/islamicExplanations';
import {
  calculateSM2,
  DEFAULT_CARD_STATE,
  getNextReviewDate,
  getNextUpcomingReviewDate,
} from './utils/sm2';

const API_URL = 'https://api.aladhan.com/v1/asmaAlHusna';
const NASEEH_WARMUP_URL = 'https://naseeh-islamic-mental-health-app.onrender.com/api';
const NASEEH_NOTIFY_API_URL = 'https://naseeh-islamic-mental-health-app.onrender.com/api/asmaulhusna';
const STORAGE_KEY = 'asma_flashcards_v2';
const ONBOARDING_KEY = 'asma_onboarding_seen_v1';
const COMING_SOON_CTA_DISMISSED_KEY = 'asma_coming_soon_cta_dismissed_v1';

const FLOATING_NAMES = [
  'Ar-Rahman',
  'Ar-Raheem',
  'Al-Malik',
  'As-Salam',
  'Al-Latif',
  'Al-Wadud',
  'Al-Hadi',
  'An-Nur',
  'Al-Hayy',
  'Al-Qayyum',
];

const MATCHING_THEMES = ['emerald', 'gold', 'ocean'];
const NASEEH_SHOWCASE = [
  {
    id: 'daily-home',
    title: 'Daily Home',
    subtitle: 'Grounded mornings and mindful evenings',
    body: 'A calming home feed built for Muslim wellbeing with reminders, prayer context, daily check-ins, and quick spiritual actions.',
    highlights: ['Daily goals', 'Mood check-ins', 'Prayer-linked reflection'],
    image: `${process.env.PUBLIC_URL}/naseeh/naseeh-home.png`,
  },
  {
    id: 'quran-learn',
    title: 'Quran & Learn',
    subtitle: 'Spiritual healing through sound',
    body: 'Curated recitations and lectures designed to support emotional resilience, reflection, and consistent spiritual growth.',
    highlights: ['Quran recitations', 'Lecture playlists', 'Emotion-specific tracks'],
    image: `${process.env.PUBLIC_URL}/naseeh/naseeh-quran-learn.png`,
  },
  {
    id: 'recitations',
    title: 'Emotion-Specific Recitations',
    subtitle: 'Listen with intention',
    body: 'Choose recitations for gratitude, peace, patience, and protection with organized categories and clean playback flow.',
    highlights: ['Daily recitation picks', 'Protection and peace', 'Structured listening'],
    image: `${process.env.PUBLIC_URL}/naseeh/naseeh-recitation-list.png`,
  },
  {
    id: 'dhikr',
    title: 'Morning & Evening Protection',
    subtitle: 'Dhikr with consistency in mind',
    body: 'Track progress, build streaks, and complete guided dhikr sessions with an interface made for focus and continuity.',
    highlights: ['Progress tracking', 'Simple loops', 'Habit reinforcement'],
    image: `${process.env.PUBLIC_URL}/naseeh/naseeh-dhikr-progress.png`,
  },
  {
    id: 'tasbih',
    title: 'Tasbih Counter',
    subtitle: 'Beautifully minimal and distraction-free',
    body: 'An interactive tasbih experience that keeps you centered while visually rewarding consistency and completion.',
    highlights: ['Loop counter', '33-count flow', 'Tap-to-begin ease'],
    image: `${process.env.PUBLIC_URL}/naseeh/naseeh-tasbih.png`,
  },
  {
    id: 'challenges',
    title: 'Spiritual Challenges',
    subtitle: 'Gamified growth with community support',
    body: 'Join challenge tracks focused on character, gratitude, and daily discipline while tracking participation and milestones.',
    highlights: ['Challenge tracks', 'Community participation', 'Progress milestones'],
    image: `${process.env.PUBLIC_URL}/naseeh/naseeh-challenges.png`,
  },
  {
    id: 'reflection',
    title: 'Reflection Moments',
    subtitle: 'Where faith meets mental clarity',
    body: 'Naseeh combines Islamic reminders with thoughtful daily reflection prompts to support emotional wellbeing over time.',
    highlights: ['Reflection prompts', 'Mental health support', 'Islam-first guidance'],
    image: `${process.env.PUBLIC_URL}/naseeh/naseeh-reflection.png`,
  },
];

const detectMobilePlatform = () => {
  if (typeof navigator === 'undefined') {
    return 'desktop';
  }

  const userAgent = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(userAgent);

  if (isIOS) {
    return 'ios';
  }

  if (isAndroid) {
    return 'android';
  }

  return 'desktop';
};

const isStandaloneMode = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const iosStandalone = window.navigator.standalone === true;
  const mediaStandalone = window.matchMedia
    ? window.matchMedia('(display-mode: standalone)').matches
    : false;

  return iosStandalone || mediaStandalone;
};

const shuffle = (arr) => {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const getMeaningText = (card) => {
  if (typeof card.en === 'string') {
    return card.en;
  }

  if (card.en && typeof card.en.meaning === 'string') {
    return card.en.meaning;
  }

  if (typeof card.translation === 'string') {
    return card.translation;
  }

  return 'Meaning unavailable';
};

const normalizeCard = (item, index) => {
  const number = Number(item.number || index + 1);
  const normalizedCardData = {
    ...DEFAULT_CARD_STATE,
    ...(item.cardData || {}),
  };

  if (!item.cardData?.stage) {
    const hadReviewProgress = (item.cardData?.repetitions || 0) > 0 || (item.cardData?.interval || 0) > 0;
    normalizedCardData.stage = hadReviewProgress ? 'review' : 'learning';
  }

  // Backward compatibility for older localStorage records.
  if (!normalizedCardData.lastReviewedDate && normalizedCardData.lastPassedDate) {
    normalizedCardData.lastReviewedDate = normalizedCardData.lastPassedDate;
  }

  return {
    ...item,
    number,
    name: item.name || 'Name unavailable',
    transliteration: item.transliteration || `Name ${number}`,
    en: item.en || { meaning: item.meaning || 'Meaning unavailable' },
    cardData: normalizedCardData,
    userNote: typeof item.userNote === 'string' ? item.userNote : '',
    nextReview: item.nextReview || new Date().toISOString(),
  };
};

const loadCardsFromStorage = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    return null;
  }

  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed.map((card, index) => normalizeCard(card, index));
  } catch (error) {
    console.error('Failed to parse saved data', error);
    return null;
  }
};

const saveCardsToStorage = (cards) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
};

const fetchCards = async () => {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch names of Allah');
  }

  const payload = await response.json();
  const items = Array.isArray(payload.data) ? payload.data : [];

  return items.map((item, index) =>
    normalizeCard(
      {
        ...item,
        cardData: { ...DEFAULT_CARD_STATE },
        nextReview: new Date().toISOString(),
      },
      index
    )
  );
};

const warmUpNaseehServer = () => {
  // Fire-and-forget ping to reduce cold-start delays on the Render-hosted API.
  fetch(NASEEH_WARMUP_URL, {
    method: 'GET',
    mode: 'no-cors',
    cache: 'no-store',
    keepalive: true,
  }).catch(() => {
    // Warmup failures should never block or impact this app.
  });
};

const formatDate = (date) => {
  if (!date) {
    return 'No upcoming review';
  }

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const getStartOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const getDayKey = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isCardDueAt = (card, referenceDate) => {
  const nextReview = new Date(card.nextReview);
  return !Number.isNaN(nextReview.getTime()) && nextReview <= referenceDate;
};

const getCardReviewedDayKey = (card) => (
  card.cardData?.lastReviewedDate || card.cardData?.lastPassedDate || null
);

const findNextCardIndexByPriority = (cardsArray, referenceDate = new Date()) => {
  const todayKey = getDayKey(referenceDate);
  let nextQuickRepeatIndex = null;
  let nextQuickRepeatTime = Number.POSITIVE_INFINITY;
  let nextReviewingIndex = null;
  let nextReviewingTime = Number.POSITIVE_INFINITY;
  let nextNewIndex = null;
  let nextNewTime = Number.POSITIVE_INFINITY;

  cardsArray.forEach((card, index) => {
    const nextReview = new Date(card.nextReview);
    if (Number.isNaN(nextReview.getTime()) || nextReview > referenceDate) {
      return;
    }

    const reviewTime = nextReview.getTime();
    const hasReviewedToday = getCardReviewedDayKey(card) === todayKey;
    const isQuickRepeat = Number.isFinite(Number(card.cardData?.nextIntervalMinutes))
      && Number(card.cardData?.nextIntervalMinutes) > 0;

    if (isQuickRepeat) {
      if (reviewTime < nextQuickRepeatTime) {
        nextQuickRepeatTime = reviewTime;
        nextQuickRepeatIndex = index;
      }
      return;
    }

    if (hasReviewedToday) {
      if (reviewTime < nextReviewingTime) {
        nextReviewingTime = reviewTime;
        nextReviewingIndex = index;
      }
      return;
    }

    if (reviewTime < nextNewTime) {
      nextNewTime = reviewTime;
      nextNewIndex = index;
    }
  });

  return nextQuickRepeatIndex ?? nextReviewingIndex ?? nextNewIndex;
};

const buildMatchingRound = (sourceCards, pairCount) => {
  const cardsToUse = shuffle(sourceCards).slice(0, pairCount);

  const tokens = cardsToUse.flatMap((card) => ([
    {
      uid: `${card.number}-ar`,
      id: card.number,
      type: 'arabic',
      label: card.name,
      subtitle: card.transliteration,
      tilt: `${Math.floor(Math.random() * 9) - 4}deg`,
      stagger: `${(Math.random() * 0.24).toFixed(2)}s`,
    },
    {
      uid: `${card.number}-en`,
      id: card.number,
      type: 'meaning',
      label: getMeaningText(card),
      subtitle: '',
      tilt: `${Math.floor(Math.random() * 9) - 4}deg`,
      stagger: `${(Math.random() * 0.24).toFixed(2)}s`,
    },
  ]));

  const theme = MATCHING_THEMES[Math.floor(Math.random() * MATCHING_THEMES.length)];

  return {
    tokens: shuffle(tokens),
    pairTotal: cardsToUse.length,
    theme,
  };
};

const FloatingElements = () => {
  const floatingWords = useMemo(
    () =>
      shuffle(FLOATING_NAMES)
        .slice(0, 8)
        .map((name, index) => ({
          id: `${name}-${index}`,
          name,
          className: `float-slot-${index + 1}`,
          duration: `${10 + (index % 4) * 2}s`,
          delay: `${(index * 0.42).toFixed(2)}s`,
        })),
    []
  );

  return (
    <div className="floating-elements" aria-hidden="true">
      {floatingWords.map((item) => (
        <span
          key={item.id}
          className={`float-item ${item.className}`}
          style={{ '--float-duration': item.duration, '--float-delay': item.delay }}
        >
          {item.name}
        </span>
      ))}
    </div>
  );
};

const IntroTooltip = ({
  onClose,
  onStartFlashcards,
  onTryMatching,
  devicePlatform,
  canPromptInstall,
  onPromptInstall,
  installPromptStatus,
  isInstalledStandalone,
  activeView,
}) => {
  const showInstallHelp = (devicePlatform === 'android' || devicePlatform === 'ios')
    && !isInstalledStandalone;
  const isFlashcardsView = activeView === 'flashcards';
  const isMatchingView = activeView === 'matching';

  const viewSpecificDescription = isFlashcardsView
    ? 'Asma al Husna Flashcards use a custom review algorithm that tracks your due cards and schedules the next best time to review them.'
    : 'Matching mode helps reinforce memory by quickly connecting each Arabic name with its English meaning on a randomized board.';

  return (
    <section className="intro-tooltip" role="status" aria-live="polite">
      <h2>Quick Start</h2>
      <p>
        {viewSpecificDescription}
      </p>
      {showInstallHelp && (
        <div className="install-hint">
          <h3>Add To Home Screen</h3>
          {devicePlatform === 'android' && (
            <>
              <p>
                Install this app on Android for faster access and full-screen practice.
              </p>
              {canPromptInstall ? (
                <button className="primary install-btn" onClick={onPromptInstall}>
                  Add To Home Screen
                </button>
              ) : (
                <p className="install-note">
                  Open your browser menu, then choose <strong>Install app</strong> or
                  <strong> Add to Home screen</strong>.
                </p>
              )}
              {installPromptStatus === 'dismissed' && (
                <p className="install-note">Install was dismissed. You can still add it from the browser menu.</p>
              )}
            </>
          )}
          {devicePlatform === 'ios' && (
            <p className="install-note">
              In Safari: tap <strong>Share</strong> then tap <strong>Add to Home Screen</strong>.
            </p>
          )}
        </div>
      )}
      <div className="intro-actions">
        {isFlashcardsView && (
          <button className="primary" onClick={onTryMatching}>Try Matching Game</button>
        )}
        {isMatchingView && (
          <button className="secondary" onClick={onStartFlashcards}>Start Flashcards</button>
        )}
        {!isFlashcardsView && !isMatchingView && (
          <button className="secondary" onClick={onClose}>Got It</button>
        )}
      </div>
    </section>
  );
};

const ComingSoonPromptToast = ({ onGoToComingSoon, onDismiss }) => {
  return (
    <aside className="coming-soon-toast" role="status" aria-live="polite">
      <div>
        <p className="toast-label">New</p>
        <p className="toast-title">Explore Naseeh: Coming Soon</p>
      </div>
      <div className="toast-actions">
        <button className="toast-link" onClick={onGoToComingSoon}>
          Check It Out
        </button>
        <button className="toast-dismiss" aria-label="Dismiss coming soon prompt" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </aside>
  );
};

const NotifyModal = ({
  isOpen,
  email,
  onChangeEmail,
  onClose,
  onSubmit,
  error,
  status,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="notify-modal-layer" role="dialog" aria-modal="true" aria-labelledby="notify-title">
      <div className="notify-modal-overlay" onClick={onClose} />
      <div className="notify-modal">
        <h3 id="notify-title">Get Notified</h3>
        <p>
          Share your email and we will notify you when Naseeh is ready on the App Store and Google Play.
        </p>

        <form onSubmit={onSubmit}>
          <label htmlFor="notify-email">Email address</label>
          <input
            id="notify-email"
            type="email"
            value={email}
            onChange={(event) => onChangeEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          {!!error && <p className="notify-error">{error}</p>}
          {status === 'saved' && (
            <p className="notify-success">
              Saved successfully. You are now on the early access list.
            </p>
          )}

          <div className="notify-actions">
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SideMenu = ({ isOpen, onClose, activeView, setActiveView }) => {
  const goToView = (view) => {
    setActiveView(view);
    onClose();
  };

  return (
    <>
      <div className={`menu-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <aside className={`side-menu ${isOpen ? 'open' : ''}`}>
        <h2>Practice Modes</h2>
        <button
          className={activeView === 'flashcards' ? 'active' : ''}
          onClick={() => goToView('flashcards')}
        >
          Asma al Husna Flashcards
        </button>
        <button
          className={activeView === 'matching' ? 'active' : ''}
          onClick={() => goToView('matching')}
        >
          Arabic-English Matching
        </button>
        <button
          className={activeView === 'comingSoon' ? 'active' : ''}
          onClick={() => goToView('comingSoon')}
        >
          Coming Soon!
        </button>
      </aside>
    </>
  );
};

const FlashcardView = ({
  card,
  newCount,
  dueTomorrowCount,
  reviewingCount,
  upcomingReviewDate,
  onGrade,
  onNoteChange,
}) => {
  const [flipped, setFlipped] = useState(false);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    setFlipped(false);
  }, [card?.number]);

  useEffect(() => {
    setNoteText(card?.userNote || '');
  }, [card?.number, card?.userNote]);

  if (!card) {
    return (
      <section className="panel empty-panel">
        <div className="panel-head">
          <span className="badge">{newCount} new cards</span>
          <span className="badge muted">{dueTomorrowCount} due tomorrow</span>
          <span className="badge muted">Reviewing {reviewingCount}</span>
        </div>
        <h3>All caught up</h3>
        <p>You have no new or review cards right now. Your next review is {formatDate(upcomingReviewDate)}.</p>
      </section>
    );
  }

  const explanation = getIslamicExplanation(card.number, card.transliteration);

  return (
    <section className="panel">
      <div className="panel-head">
        <span className="badge">{newCount} new cards</span>
        <span className="badge muted">{dueTomorrowCount} due tomorrow</span>
        <span className="badge muted">Reviewing {reviewingCount}</span>
        <span className="badge muted">Card {card.number} / 99</span>
      </div>
      <div className={`flashcard ${flipped ? 'flipped' : ''}`}>
        <div className="flashcard-face flashcard-front">
          <p className="arabic-name">{card.name}</p>
          <p className="transliteration">{card.transliteration}</p>
          <button className="primary" onClick={() => setFlipped(true)}>
            Reveal Meaning
          </button>
        </div>

        <div className="flashcard-face flashcard-back">
          <p className="meaning">{getMeaningText(card)}</p>
          <p className="explanation">{explanation}</p>
          <div className="notes-wrap">
            <label htmlFor={`notes-${card.number}`}>Your Notes</label>
            <textarea
              id={`notes-${card.number}`}
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              onBlur={() => onNoteChange(noteText)}
              placeholder="Add your notes from the Ramadan Asma ul Husna series..."
            />
          </div>

          <div className="grade-grid">
            <button className="grade very-hard" onClick={() => onGrade(1)}>
              Very Hard
            </button>
            <button className="grade hard" onClick={() => onGrade(2)}>
              Hard
            </button>
            <button className="grade good" onClick={() => onGrade(4)}>
              Good
            </button>
            <button className="grade easy" onClick={() => onGrade(5)}>
              Easy
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

const MatchingGameView = ({ cards, pairCount }) => {
  const [round, setRound] = useState({ tokens: [], pairTotal: 0, theme: 'emerald' });
  const [selectedTokenUids, setSelectedTokenUids] = useState([]);
  const [matchedIds, setMatchedIds] = useState([]);
  const [attempts, setAttempts] = useState(0);
  const [wrongTokenUids, setWrongTokenUids] = useState([]);

  const startRound = useCallback(() => {
    if (!cards.length) {
      return;
    }

    setRound(buildMatchingRound(cards, pairCount));
    setSelectedTokenUids([]);
    setMatchedIds([]);
    setAttempts(0);
    setWrongTokenUids([]);
  }, [cards, pairCount]);

  useEffect(() => {
    startRound();
  }, [startRound]);

  const tokenLookup = useMemo(() => {
    return round.tokens.reduce((accumulator, token) => {
      accumulator[token.uid] = token;
      return accumulator;
    }, {});
  }, [round.tokens]);

  useEffect(() => {
    if (selectedTokenUids.length !== 2) {
      return undefined;
    }

    const [firstUid, secondUid] = selectedTokenUids;
    const first = tokenLookup[firstUid];
    const second = tokenLookup[secondUid];

    if (!first || !second) {
      setSelectedTokenUids([]);
      return undefined;
    }

    setAttempts((prev) => prev + 1);

    const matched = first.id === second.id && first.type !== second.type;

    if (matched) {
      setMatchedIds((prev) => (prev.includes(first.id) ? prev : [...prev, first.id]));
      setSelectedTokenUids([]);
      return undefined;
    }

    setWrongTokenUids([firstUid, secondUid]);
    const timer = setTimeout(() => {
      setSelectedTokenUids([]);
      setWrongTokenUids([]);
    }, 620);

    return () => clearTimeout(timer);
  }, [selectedTokenUids, tokenLookup]);

  const handleTokenClick = (token) => {
    if (matchedIds.includes(token.id)) {
      return;
    }

    if (selectedTokenUids.includes(token.uid)) {
      return;
    }

    setSelectedTokenUids((prev) => {
      if (prev.length >= 2) {
        return prev;
      }

      return [...prev, token.uid];
    });
  };

  const completed = matchedIds.length > 0 && matchedIds.length === round.pairTotal;
  const accuracy = attempts === 0 ? 100 : Math.round((matchedIds.length / attempts) * 100);

  return (
    <section className="panel">
      <div className="panel-head">
        <span className="badge">{matchedIds.length} / {round.pairTotal || pairCount} matched</span>
        <span className="badge muted">Accuracy {accuracy}%</span>
        <span className="badge muted">Mixed matching board</span>
      </div>

      <div className={`matching-board theme-${round.theme}`}>
        {round.tokens.map((token) => {
          const isSelected = selectedTokenUids.includes(token.uid);
          const isMatched = matchedIds.includes(token.id);
          const isWrong = wrongTokenUids.includes(token.uid);

          return (
            <button
              key={token.uid}
              className={`match-item ${isSelected ? 'selected' : ''} ${isMatched ? 'matched' : ''} ${isWrong ? 'wrong' : ''}`}
              onClick={() => handleTokenClick(token)}
              disabled={isMatched}
              style={{ '--tilt': token.tilt, '--stagger': token.stagger }}
            >
              <span className="match-kind">{token.type === 'arabic' ? 'Arabic' : 'Meaning'}</span>
              <span className={`match-label ${token.type === 'arabic' ? 'match-arabic' : ''}`}>{token.label}</span>
              {!!token.subtitle && <span className="match-subtitle">{token.subtitle}</span>}
            </button>
          );
        })}
      </div>

      <div className="matching-footer">
        <button className="secondary" onClick={startRound}>New Random Set</button>
        {completed && <p className="complete-note">Excellent. You matched this full set.</p>}
      </div>
    </section>
  );
};

const ComingSoonView = ({ onOpenNotifyModal }) => {
  const [imageErrors, setImageErrors] = useState({});

  const handleImageError = (id) => {
    setImageErrors((prev) => ({
      ...prev,
      [id]: true,
    }));
  };

  return (
    <section className="coming-page">
      <div className="coming-hero">
        <p className="coming-kicker">Coming Soon</p>
        <h2>Naseeh</h2>
        <p className="coming-tagline">
          An Islamic mental wellbeing app designed for daily growth.
        </p>
        <p className="coming-summary">
          Naseeh helps Muslims strengthen emotional and spiritual wellbeing through meaningful goals,
          guided challenges, timely reminders, and an Islamic AI companion tailored to faith-based support.
        </p>
        <div className="coming-cta-row">
          <button className="primary coming-notify-btn" onClick={onOpenNotifyModal}>
            Get Notified
          </button>
        </div>
        <div className="store-row">
          <span className="store-pill">Apple App Store</span>
          <span className="store-pill">Google Play Store</span>
        </div>
      </div>

      <div className="coming-track">
        {NASEEH_SHOWCASE.map((item, index) => (
          <article className="coming-section" key={item.id}>
            <div className={`coming-section-inner ${index % 2 === 0 ? '' : 'reverse'}`}>
              <div className="coming-copy">
                <p className="coming-subtitle">{item.subtitle}</p>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <div className="coming-highlights">
                  {item.highlights.map((highlight) => (
                    <span className="highlight-chip" key={`${item.id}-${highlight}`}>
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>

              <div className="phone-shell">
                {!imageErrors[item.id] ? (
                  <img
                    src={item.image}
                    alt={`${item.title} preview from the Naseeh app`}
                    loading="lazy"
                    onError={() => handleImageError(item.id)}
                  />
                ) : (
                  <div className="phone-fallback">
                    <p>Preview Image</p>
                    <strong>{item.title}</strong>
                    <span>Add screenshot in `public/naseeh/` using the configured filename.</span>
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

const App = () => {
  const windowWidth = useWindowWidth();
  const [cards, setCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState('flashcards');
  const [showIntroTooltip, setShowIntroTooltip] = useState(false);
  const [devicePlatform, setDevicePlatform] = useState('desktop');
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [installPromptStatus, setInstallPromptStatus] = useState('idle');
  const [isInstalledStandalone, setIsInstalledStandalone] = useState(false);
  const [showComingSoonToast, setShowComingSoonToast] = useState(false);
  const [isComingSoonToastDismissed, setIsComingSoonToastDismissed] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyError, setNotifyError] = useState('');
  const [notifyStatus, setNotifyStatus] = useState('idle');
  const [referenceTime, setReferenceTime] = useState(() => new Date());

  useEffect(() => {
    warmUpNaseehServer();
    setDevicePlatform(detectMobilePlatform());
    setIsInstalledStandalone(isStandaloneMode());

    const seenOnboarding = localStorage.getItem(ONBOARDING_KEY);
    if (!seenOnboarding) {
      setShowIntroTooltip(true);
    }

    const comingSoonDismissed = localStorage.getItem(COMING_SOON_CTA_DISMISSED_KEY) === '1';
    setIsComingSoonToastDismissed(comingSoonDismissed);
  }, []);

  useEffect(() => {
    if (devicePlatform !== 'android') {
      return undefined;
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event);
    };

    const handleInstalled = () => {
      setIsInstalledStandalone(true);
      setInstallPromptStatus('installed');
      setDeferredInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [devicePlatform]);

  useEffect(() => {
    const initializeCards = async () => {
      setIsLoading(true);
      setError('');

      const storedCards = loadCardsFromStorage();
      if (storedCards?.length) {
        const now = new Date();
        setReferenceTime(now);
        setCards(storedCards);
        setCurrentCardIndex(findNextCardIndexByPriority(storedCards, now));
        setIsLoading(false);
        return;
      }

      try {
        const fetchedCards = await fetchCards();
        const now = new Date();
        setReferenceTime(now);
        setCards(fetchedCards);
        setCurrentCardIndex(findNextCardIndexByPriority(fetchedCards, now));
        saveCardsToStorage(fetchedCards);
      } catch (fetchError) {
        setError('Unable to load cards right now. Please try again.');
        console.error(fetchError);
      } finally {
        setIsLoading(false);
      }
    };

    initializeCards();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setReferenceTime(new Date());
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!cards.length) {
      return;
    }

    const nextDueIndex = findNextCardIndexByPriority(cards, referenceTime);
    setCurrentCardIndex((previousIndex) => (previousIndex === nextDueIndex ? previousIndex : nextDueIndex));
  }, [cards, referenceTime]);

  useEffect(() => {
    if (activeView === 'comingSoon') {
      setShowComingSoonToast(false);
      return undefined;
    }

    if (isComingSoonToastDismissed || showComingSoonToast || showNotifyModal) {
      return undefined;
    }

    if (activeView !== 'flashcards' && activeView !== 'matching') {
      return undefined;
    }

    const timer = setTimeout(() => {
      setShowComingSoonToast(true);
    }, 60000);

    return () => clearTimeout(timer);
  }, [activeView, isComingSoonToastDismissed, showComingSoonToast, showNotifyModal]);

  const reviewingCount = useMemo(() => {
    const todayKey = getDayKey(referenceTime);
    return cards.filter((card) => (
      isCardDueAt(card, referenceTime) && getCardReviewedDayKey(card) === todayKey
    )).length;
  }, [cards, referenceTime]);

  const newCount = useMemo(() => {
    const todayKey = getDayKey(referenceTime);
    return cards.filter((card) => (
      isCardDueAt(card, referenceTime) && getCardReviewedDayKey(card) !== todayKey
    )).length;
  }, [cards, referenceTime]);

  const dueTomorrowCount = useMemo(() => {
    const now = referenceTime;
    const tomorrowStart = getStartOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    const dayAfterTomorrowStart = getStartOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2));

    return cards.filter((card) => {
      const reviewDate = new Date(card.nextReview);
      return reviewDate >= tomorrowStart && reviewDate < dayAfterTomorrowStart;
    }).length;
  }, [cards, referenceTime]);

  const upcomingReviewDate = useMemo(
    () => getNextUpcomingReviewDate(cards, referenceTime),
    [cards, referenceTime]
  );

  const currentCard = useMemo(() => {
    if (currentCardIndex === null || currentCardIndex < 0 || currentCardIndex >= cards.length) {
      return null;
    }

    return cards[currentCardIndex];
  }, [cards, currentCardIndex]);

  const handleCardGrade = (quality) => {
    if (currentCardIndex === null) {
      return;
    }

    const currentCardData = cards[currentCardIndex];
    const updatedSm2 = calculateSM2(currentCardData.cardData, quality);
    const todayKey = getDayKey(new Date());
    const nextCardData = {
      ...updatedSm2,
      lastReviewedDate: todayKey,
      lastPassedDate: quality >= 4
        ? todayKey
        : (currentCardData.cardData?.lastPassedDate || null),
    };
    const updatedCard = {
      ...currentCardData,
      cardData: nextCardData,
      nextReview: getNextReviewDate(nextCardData).toISOString(),
    };

    const updatedCards = cards.map((card, index) => (
      index === currentCardIndex ? updatedCard : card
    ));

    const now = new Date();
    setReferenceTime(now);
    setCards(updatedCards);
    saveCardsToStorage(updatedCards);
    setCurrentCardIndex(findNextCardIndexByPriority(updatedCards, now));
  };

  const updateCurrentCardNote = (noteText) => {
    if (currentCardIndex === null) {
      return;
    }

    const sanitizedNote = noteText || '';
    const updatedCards = cards.map((card, index) => (
      index === currentCardIndex ? { ...card, userNote: sanitizedNote } : card
    ));

    setCards(updatedCards);
    saveCardsToStorage(updatedCards);
  };

  const dismissTooltip = () => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setShowIntroTooltip(false);
  };

  const tryMatchingFromTooltip = () => {
    setActiveView('matching');
    dismissTooltip();
  };

  const startFlashcardsFromTooltip = () => {
    setActiveView('flashcards');
    dismissTooltip();
  };

  const promptInstall = async () => {
    if (!deferredInstallPrompt) {
      return;
    }

    try {
      setInstallPromptStatus('prompting');
      deferredInstallPrompt.prompt();
      const userChoice = await deferredInstallPrompt.userChoice;

      if (userChoice?.outcome === 'accepted') {
        setInstallPromptStatus('accepted');
      } else {
        setInstallPromptStatus('dismissed');
      }
    } catch (error) {
      setInstallPromptStatus('dismissed');
    }

    setDeferredInstallPrompt(null);
  };

  const dismissComingSoonToast = () => {
    localStorage.setItem(COMING_SOON_CTA_DISMISSED_KEY, '1');
    setIsComingSoonToastDismissed(true);
    setShowComingSoonToast(false);
  };

  const openComingSoonFromToast = () => {
    setActiveView('comingSoon');
    dismissComingSoonToast();
  };

  const openNotifyModal = () => {
    setNotifyError('');
    setNotifyStatus('idle');
    setShowNotifyModal(true);
  };

  const closeNotifyModal = () => {
    setShowNotifyModal(false);
    setNotifyError('');
  };

  const submitNotifyEmail = async (event) => {
    event.preventDefault();
    const normalizedEmail = notifyEmail.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setNotifyError('Please enter a valid email address.');
      setNotifyStatus('idle');
      return;
    }

    try {
      setNotifyError('');
      setNotifyStatus('submitting');

      const response = await fetch(NASEEH_NOTIFY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit notify email');
      }

      setNotifyStatus('saved');
      setNotifyEmail('');
    } catch (error) {
      setNotifyStatus('idle');
      setNotifyError('Could not submit right now. Please try again.');
    }
  };

  const pairCount = windowWidth < 680 ? 6 : windowWidth < 1000 ? 8 : 10;
  const heroDescription = activeView === 'matching'
    ? 'Strengthen recall by matching Arabic names with English meanings in a randomized board designed for fast reinforcement.'
    : 'Practice Asma al Husna with a custom review algorithm that tracks due cards and schedules your next reviews intelligently.';

  return (
    <div className="app-shell" style={{ '--hero-bg': `url(${islamicBackdrop})` }}>
      <FloatingElements />

      <header className="top-bar">
        <button
          className={`menu-button ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>

        <div>
          <p className="kicker">Asma ul Husna</p>
          <h1>99 Names of Allah</h1>
          <p className="byline">By Naseeh</p>
        </div>
      </header>

      <SideMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      <main className="content">
        {showIntroTooltip && (
          <IntroTooltip
            onClose={dismissTooltip}
            onStartFlashcards={startFlashcardsFromTooltip}
            onTryMatching={tryMatchingFromTooltip}
            devicePlatform={devicePlatform}
            canPromptInstall={Boolean(deferredInstallPrompt)}
            onPromptInstall={promptInstall}
            installPromptStatus={installPromptStatus}
            isInstalledStandalone={isInstalledStandalone}
            activeView={activeView}
          />
        )}

        {activeView !== 'comingSoon' && (
          <section className="hero-card">
            <p>{heroDescription}</p>
          </section>
        )}

        {activeView !== 'comingSoon' && isLoading && <p className="status">Loading your study deck...</p>}
        {activeView !== 'comingSoon' && !!error && <p className="status error">{error}</p>}

        {!isLoading && !error && activeView === 'flashcards' && (
          <FlashcardView
            card={currentCard}
            newCount={newCount}
            dueTomorrowCount={dueTomorrowCount}
            reviewingCount={reviewingCount}
            upcomingReviewDate={upcomingReviewDate}
            onGrade={handleCardGrade}
            onNoteChange={updateCurrentCardNote}
          />
        )}

        {!isLoading && !error && activeView === 'matching' && (
          <MatchingGameView cards={cards} pairCount={pairCount} />
        )}

        {activeView === 'comingSoon' && (
          <ComingSoonView onOpenNotifyModal={openNotifyModal} />
        )}
      </main>

      {showComingSoonToast && (
        <ComingSoonPromptToast
          onGoToComingSoon={openComingSoonFromToast}
          onDismiss={dismissComingSoonToast}
        />
      )}

      <NotifyModal
        isOpen={showNotifyModal}
        email={notifyEmail}
        onChangeEmail={setNotifyEmail}
        onClose={closeNotifyModal}
        onSubmit={submitNotifyEmail}
        error={notifyError}
        status={notifyStatus}
      />

      <Analytics />
    </div>
  );
};

export default App;
