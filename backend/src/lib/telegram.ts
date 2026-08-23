import crypto from 'crypto';

export interface TelegramUserPayload {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

/**
 * Verifies Telegram Mini App initData per official spec:
 * secret = HMAC_SHA256(key="WebAppData", data=botToken)
 * hash   = HMAC_SHA256(key=secret,     data=dataCheckString)
 */
export function verifyInitData(initData: string, botToken: string): { ok: boolean; user: TelegramUserPayload | null } {
  if (!initData || !botToken) return { ok: false, user: null };

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { ok: false, user: null };

  const authDate = Number(params.get('auth_date') || 0);
  if (!authDate || Math.floor(Date.now() / 1000) - authDate > MAX_AUTH_AGE_SECONDS) {
    return { ok: false, user: null };
  }

  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computed = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computed !== hash) return { ok: false, user: null };

  try {
    const user = JSON.parse(params.get('user') || 'null') as TelegramUserPayload | null;
    if (!user || typeof user.id !== 'number') return { ok: false, user: null };
    return { ok: true, user };
  } catch {
    return { ok: false, user: null };
  }
}

/** Stable username derived from a verified Telegram account (e.g. tg_12345678). */
export function telegramUsername(user: TelegramUserPayload): string {
  return user.username?.trim().toLowerCase() || `tg_${user.id}`;
}
