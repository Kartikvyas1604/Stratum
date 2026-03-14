import { CONFIG } from '../config';
import { NativeModules, Platform } from 'react-native';
import {
  BackendFetchShareRequest,
  BackendFetchShareResponse,
  BackendRegisterRequest,
  BackendRegisterResponse,
} from '../types';

interface PostJsonOptions {
  retries?: number;
  retryDelayMs?: number;
  requestTimeoutMs?: number;
}

const sleep = async (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableStatus = (status: number): boolean => status >= 500 || status === 429;

let activeApiBaseUrl: string | null = null;

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, '');

const extractHostFromMetroScript = (): string | null => {
  try {
    const scriptUrl = (NativeModules as any)?.SourceCode?.scriptURL as string | undefined;
    if (!scriptUrl) {
      return null;
    }

    const match = scriptUrl.match(/^https?:\/\/([^/:]+)(?::\d+)?\//i);
    return match?.[1] ?? null;
  } catch (_err) {
    return null;
  }
};

const getApiBaseUrlCandidates = (): string[] => {
  const candidates = new Set<string>();

  if (activeApiBaseUrl) {
    candidates.add(normalizeBaseUrl(activeApiBaseUrl));
  }

  candidates.add(normalizeBaseUrl(CONFIG.apiBaseUrl));

  const metroHost = extractHostFromMetroScript();
  if (metroHost) {
    candidates.add(`http://${metroHost}:4000`);
  }

  // Common local development routes.
  candidates.add('http://127.0.0.1:4000');
  candidates.add('http://localhost:4000');

  // Android emulator special host mappings.
  if (Platform.OS === 'android') {
    candidates.add('http://10.0.2.2:4000');
    candidates.add('http://10.0.3.2:4000');
  }

  return Array.from(candidates);
};

const postJson = async <TReq, TRes>(path: string, payload: TReq, options: PostJsonOptions = {}): Promise<TRes> => {
  const retries = options.retries ?? 0;
  const retryDelayMs = options.retryDelayMs ?? 350;
  const requestTimeoutMs = options.requestTimeoutMs ?? 5000;
  const baseUrls = getApiBaseUrlCandidates();
  const failures: string[] = [];

  for (const baseUrl of baseUrls) {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      let response: Response;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

      try {
        response = await fetch(`${baseUrl}${path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch (_error) {
        clearTimeout(timeoutId);
        if (attempt < retries) {
          await sleep(retryDelayMs * (attempt + 1));
          continue;
        }

        failures.push(`${baseUrl} (network/timeout)`);
        break;
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();

        if (attempt < retries && isRetryableStatus(response.status)) {
          await sleep(retryDelayMs * (attempt + 1));
          continue;
        }

        failures.push(`${baseUrl} (HTTP ${response.status})`);
        // If request reached server and failed with non-retryable response, bubble exact server error.
        if (!isRetryableStatus(response.status)) {
          throw new Error(errorBody || `Request failed: ${response.status}`);
        }

        break;
      }

      activeApiBaseUrl = baseUrl;
      return (await response.json()) as TRes;
    }
  }

  const attempted = failures.length > 0 ? failures.join(', ') : baseUrls.join(', ');
  throw new Error(
    `Cannot reach backend API. Attempted: ${attempted}. Start backend with "npm run backend:dev" and keep phone + laptop on same Wi-Fi.`,
  );
};

export const backendApi = {
  registerUser(payload: BackendRegisterRequest): Promise<BackendRegisterResponse> {
    /*
      Endpoint: POST /api/user/register
      Request:
      {
        deviceFingerprint: string,
        shareB: string (base64)
      }
      Response:
      {
        userId: string,
        sessionToken: string
      }
    */
    return postJson<BackendRegisterRequest, BackendRegisterResponse>('/api/user/register', payload);
  },

  fetchShareB(payload: BackendFetchShareRequest): Promise<BackendFetchShareResponse> {
    /*
      Endpoint: POST /api/share/fetch
      Request:
      {
        userId: string,
        deviceFingerprint: string,
        sessionToken: string
      }
      Response:
      {
        shareB: string (base64)
      }
    */
    return postJson<BackendFetchShareRequest, BackendFetchShareResponse>('/api/share/fetch', payload, {
      retries: 2,
      retryDelayMs: 400,
      requestTimeoutMs: 5000,
    });
  },

  updateShareB(payload: {
    userId: string;
    deviceFingerprint: string;
    sessionToken: string;
    nextShareB: string;
  }): Promise<{ success: boolean }> {
    /*
      Endpoint: POST /api/share/update
      Request:
      {
        userId: string,
        deviceFingerprint: string,
        sessionToken: string,
        nextShareB: string (base64)
      }
      Response:
      {
        success: boolean
      }
    */
    return postJson('/api/share/update', payload, {
      retries: 1,
      retryDelayMs: 400,
      requestTimeoutMs: 5000,
    });
  },
};
