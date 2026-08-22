import WebApp from '@twa-dev/sdk';

/**
 * Telegram Mini App helpers.
 * Every call is guarded — in a plain browser (no window.Telegram) these are no-ops.
 */

export const tg = (): typeof WebApp | null => {
  try {
    return (window as unknown as { Telegram?: { WebApp?: typeof WebApp } }).Telegram?.WebApp ?? null;
  } catch {
    return null;
  }
};

/** True when actually running inside a Telegram client. */
export const isTelegram = (): boolean => {
  const app = tg();
  if (!app) return false;
  try {
    // 'unknown' platform = regular browser tab
    return Boolean(app.initDataUnsafe?.user) || (app.platform !== 'unknown' && Boolean(app.initData));
  } catch {
    return false;
  }
};

let initialized = false;

export function initTelegram(): void {
  if (initialized) return;
  initialized = true;
  try {
    const app = tg();
    if (!app) return;
    app.ready();
    app.expand();
    try { app.enableClosingConfirmation(); } catch { /* older clients */ }
    try { app.setHeaderColor('#05070A'); } catch { /* optional */ }
    try { app.setBackgroundColor('#05070A'); } catch { /* optional */ }
    if (isTelegram()) {
      try { app.disableVerticalSwipes?.(); } catch { /* optional */ }
    }
  } catch {
    /* non-telegram environment */
  }
}

/** Telegram username (or first_name fallback) for passwordless auto-login. Null outside Telegram. */
export function getTelegramUsername(): string | null {
  try {
    const u = tg()?.initDataUnsafe?.user;
    if (!u) return null;
    return u.username || u.first_name || null;
  } catch {
    return null;
  }
}

/** Light impact — tabs, preset chips, toggles. */
export function hapticLight(): void {
  try {
    tg()?.HapticFeedback?.impactOccurred('light');
  } catch { /* noop */ }
}

/** Success notification — bet placed, round won. */
export function hapticSuccess(): void {
  try {
    tg()?.HapticFeedback?.notificationOccurred('success');
  } catch { /* noop */ }
}

/** Warning notification — errors / insufficient funds. */
export function hapticWarning(): void {
  try {
    tg()?.HapticFeedback?.notificationOccurred('warning');
  } catch { /* noop */ }
}