import { act, fireEvent, render, screen } from '@testing-library/react';
jest.mock('@vercel/analytics/react', () => ({
  Analytics: () => null,
}), { virtual: true });
import App from './App';

const sampleResponse = {
  data: [
    {
      number: 1,
      name: 'الرَّحْمَن',
      transliteration: 'Ar-Rahman',
      en: { meaning: 'The Beneficent' },
    },
    {
      number: 2,
      name: 'الرَّحِيم',
      transliteration: 'Ar-Raheem',
      en: { meaning: 'The Merciful' },
    },
  ],
};

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => sampleResponse,
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('renders flashcard title and can reveal card meaning', async () => {
  render(<App />);

  expect(screen.getByText(/99 Names of Allah/i)).toBeInTheDocument();
  expect(screen.getByText(/By Naseeh/i)).toBeInTheDocument();
  expect(screen.getByText(/Quick Start/i)).toBeInTheDocument();
  expect(screen.getAllByText(/custom review algorithm/i).length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: /Try Matching Game/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Start Flashcards/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/Add To Home Screen/i)).not.toBeInTheDocument();
  expect(await screen.findByText(/due tomorrow/i)).toBeInTheDocument();
  expect(await screen.findByText(/Learning/i)).toBeInTheDocument();
  expect(await screen.findByText(/Reviewing today/i)).toBeInTheDocument();

  const revealButton = await screen.findByRole('button', { name: /reveal meaning/i });
  fireEvent.click(revealButton);

  expect(await screen.findByText(/The Beneficent/i)).toBeInTheDocument();
});

test('opens menu and switches to matching game', async () => {
  render(<App />);

  const menuButton = screen.getByRole('button', { name: /toggle menu/i });
  fireEvent.click(menuButton);

  const matchingButton = await screen.findByRole('button', { name: /Arabic-English Matching/i });
  fireEvent.click(matchingButton);

  expect(await screen.findByRole('button', { name: /Start Flashcards/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Try Matching Game/i })).not.toBeInTheDocument();
  expect(await screen.findByText(/Mixed matching board/i)).toBeInTheDocument();
  expect((await screen.findAllByText(/The Beneficent|The Merciful/i)).length).toBeGreaterThan(0);
});

test('opens menu and navigates to coming soon page', async () => {
  render(<App />);

  const menuButton = screen.getByRole('button', { name: /toggle menu/i });
  fireEvent.click(menuButton);

  const comingSoonButton = await screen.findByRole('button', { name: /Coming Soon!/i });
  fireEvent.click(comingSoonButton);

  expect(await screen.findByText(/^Naseeh$/i)).toBeInTheDocument();
  expect(screen.getByText(/Apple App Store/i)).toBeInTheDocument();
  expect(screen.getByText(/Google Play Store/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Get Notified/i })).toBeInTheDocument();
});

test('opens get notified modal and validates email input', async () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /toggle menu/i }));
  fireEvent.click(await screen.findByRole('button', { name: /Coming Soon!/i }));
  fireEvent.click(await screen.findByRole('button', { name: /Get Notified/i }));

  expect(screen.getByRole('dialog')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'invalid-email' } });
  fireEvent.click(screen.getByRole('button', { name: /^Submit$/i }));
  expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'test@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: /^Submit$/i }));
  expect(await screen.findByText(/Saved successfully/i)).toBeInTheDocument();
});

test('shows the coming soon CTA toast after one minute and allows dismissal', async () => {
  jest.useFakeTimers();

  render(<App />);
  await screen.findByText(/due tomorrow/i);

  act(() => {
    jest.advanceTimersByTime(61000);
  });

  expect(screen.getByText(/Explore Naseeh: Coming Soon/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Dismiss/i }));
  expect(screen.queryByText(/Explore Naseeh: Coming Soon/i)).not.toBeInTheDocument();
  expect(localStorage.getItem('asma_coming_soon_cta_dismissed_v1')).toBe('1');

  jest.useRealTimers();
});

test('shows onboarding only once after user dismisses it', async () => {
  const firstRender = render(<App />);

  expect(screen.getByText(/Quick Start/i)).toBeInTheDocument();
  await screen.findByText(/due tomorrow/i);
  fireEvent.click(screen.getByRole('button', { name: /Try Matching Game/i }));
  expect(screen.queryByText(/Quick Start/i)).not.toBeInTheDocument();

  firstRender.unmount();
  render(<App />);

  expect(screen.queryByText(/Quick Start/i)).not.toBeInTheDocument();
});
