import { Buffer } from 'buffer';
import * as Keychain from 'react-native-keychain';
import QuickCrypto from 'react-native-quick-crypto';
import { CONFIG } from '../../config';

const API_TIMEOUT_MS = 10_000;
const BACKOFF_MS = [1000, 2000, 4000] as const;

const KEYCHAIN_SERVICE_SESSION = 'nfc-split-wallet-session';
const KEYCHAIN_SERVICE_DEVICE = 'nfc-split-wallet-device-fingerprint';

export class NotAuthenticatedError extends Error {
  constructor(message = 'Missing local session. Please sign in again.') {
    super(message);
    this.name = 'NotAuthenticatedError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Session expired. Please login again.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Device mismatch detected. Security verification required.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ShareNotFoundError extends Error {
  constructor(message = 'Server share not found for this user.') {
    super(message);
    this.name = 'ShareNotFoundError';
  }
}

export class RateLimitError extends Error {
  constructor(message = 'Too many requests. Please wait and try again.') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ServerError extends Error {
  constructor(message = 'Server error. Please retry shortly.') {
    super(message);
    this.name = 'ServerError';
  }
}

type RegisterResponse = {
  userId: string;
  sessionToken: string;
};

type FetchShareResponse = {
  shareB: string;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeApiBase = (): string => CONFIG.apiBaseUrl.replace(/\/+$/, '');

const getKeychainPassword = async (service: string): Promise<string | null> => {
  const creds = await Keychain.getGenericPassword({ service });
  if (!creds || !creds.password) {
    return null;
  }
  return creds.password;
};

const setSession = async (userId: string, sessionToken: string): Promise<void> => {
  await Keychain.setGenericPassword(userId, sessionToken, {
    service: KEYCHAIN_SERVICE_SESSION,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
};

const generateDeviceFingerprint = (): string => {
  const randomBytes = (QuickCrypto as unknown as {
    randomBytes: (size: number) => Buffer;
  }).randomBytes;

  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  bytes.fill(0);

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const getOrCreateDeviceFingerprint = async (): Promise<string> => {
  const existing = await getKeychainPassword(KEYCHAIN_SERVICE_DEVICE);
  if (existing) {
    return existing;
  }

  const next = generateDeviceFingerprint();
  await Keychain.setGenericPassword('device', next, {
    service: KEYCHAIN_SERVICE_DEVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  return next;
};

const withTimeout = async (input: RequestInfo, init: RequestInit, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const shouldRetry = (status: number): boolean => status >= 500;

const parseJson = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  if (!text) {
    throw new ServerError('Empty response from server.');
  }

  return JSON.parse(text) as T;
};

const mapFetchStatusError = async (response: Response): Promise<Error> => {
  const bodyText = await response.text().catch(() => '');

  if (response.status === 401) {
    return new UnauthorizedError(bodyText || 'Session expired.');
  }
  if (response.status === 403) {
    return new ForbiddenError(bodyText || 'Device mismatch.');
  }
  if (response.status === 404) {
    return new ShareNotFoundError(bodyText || 'Share not found.');
  }
  if (response.status === 429) {
    return new RateLimitError(bodyText || 'Rate limited.');
  }
  if (response.status >= 500) {
    return new ServerError(bodyText || `Server error (${response.status}).`);
  }

  return new Error(bodyText || `Request failed with status ${response.status}.`);
};

// MOCK BACKEND ENDPOINTS:
// POST /api/user/register
//   Request:  { shareB: string(base64), ethAddress: string, solAddress: string, deviceFingerprint: string }
//   Response: { userId: string, sessionToken: string }
//
// POST /api/share/fetch
//   Headers:  { Authorization: Bearer <token> }
//   Request:  { userId: string, deviceFingerprint: string }
//   Response: { shareB: string(base64) }
//
// POST /api/share/update
//   Headers:  { Authorization: Bearer <token> }
//   Request:  { userId: string, newShareB: string(base64), deviceFingerprint: string }
//   Response: { success: boolean }
export const fetchShareB = async (userId: string): Promise<Buffer> => {
  const sessionToken = await getKeychainPassword(KEYCHAIN_SERVICE_SESSION);
  const deviceFingerprint = await getKeychainPassword(KEYCHAIN_SERVICE_DEVICE);

  if (!sessionToken || !deviceFingerprint) {
    throw new NotAuthenticatedError();
  }

  const endpoint = `${normalizeApiBase()}/api/share/fetch`;

  for (let attempt = 0; attempt < BACKOFF_MS.length; attempt += 1) {
    try {
      const response = await withTimeout(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({ userId, deviceFingerprint }),
        },
        API_TIMEOUT_MS,
      );

      if (response.ok) {
        const data = await parseJson<FetchShareResponse>(response);
        const shareBuffer = Buffer.from(data.shareB, 'base64');
        if (shareBuffer.length === 0) {
          shareBuffer.fill(0);
          throw new ShareNotFoundError('Received empty share payload from server.');
        }
        return shareBuffer;
      }

      const mappedError = await mapFetchStatusError(response);
      if (mappedError instanceof ServerError && attempt < BACKOFF_MS.length - 1) {
        await sleep(BACKOFF_MS[attempt]);
        continue;
      }
      throw mappedError;
    } catch (error) {
      const isNetworkLike = error instanceof TypeError || (error instanceof Error && error.name === 'AbortError');
      if (isNetworkLike && attempt < BACKOFF_MS.length - 1) {
        await sleep(BACKOFF_MS[attempt]);
        continue;
      }

      if (isNetworkLike) {
        throw new ServerError('Network error while fetching share.');
      }

      throw error instanceof Error ? error : new ServerError('Unknown fetch error.');
    }
  }

  throw new ServerError('Failed to fetch share after retries.');
};

export const registerUser = async (
  shareB: Buffer,
  ethAddress: string,
  solAddress: string,
): Promise<{ userId: string; sessionToken: string }> => {
  const deviceFingerprint = await getOrCreateDeviceFingerprint();
  const endpoint = `${normalizeApiBase()}/api/user/register`;

  for (let attempt = 0; attempt < BACKOFF_MS.length; attempt += 1) {
    try {
      const response = await withTimeout(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shareB: shareB.toString('base64'),
            ethAddress,
            solAddress,
            deviceFingerprint,
          }),
        },
        API_TIMEOUT_MS,
      );

      if (!response.ok) {
        const mappedError = await mapFetchStatusError(response);
        if (mappedError instanceof ServerError && attempt < BACKOFF_MS.length - 1) {
          await sleep(BACKOFF_MS[attempt]);
          continue;
        }
        throw mappedError;
      }

      const data = await parseJson<RegisterResponse>(response);
      if (!data.userId || !data.sessionToken) {
        throw new ServerError('Malformed register response.');
      }

      await setSession(data.userId, data.sessionToken);

      return {
        userId: data.userId,
        sessionToken: data.sessionToken,
      };
    } catch (error) {
      const isNetworkLike = error instanceof TypeError || (error instanceof Error && error.name === 'AbortError');
      if (isNetworkLike && attempt < BACKOFF_MS.length - 1) {
        await sleep(BACKOFF_MS[attempt]);
        continue;
      }

      if (isNetworkLike) {
        throw new ServerError('Network error while registering user.');
      }

      throw error instanceof Error ? error : new ServerError('Unknown register error.');
    }
  }

  throw new ServerError('Failed to register user after retries.');
};
