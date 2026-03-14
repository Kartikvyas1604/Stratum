import { CONFIG } from '../config';
import {
  BackendFetchShareRequest,
  BackendFetchShareResponse,
  BackendRegisterRequest,
  BackendRegisterResponse,
} from '../types';

interface PostJsonOptions {
  retries?: number;
  retryDelayMs?: number;
}

const sleep = async (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableStatus = (status: number): boolean => status >= 500 || status === 429;

const postJson = async <TReq, TRes>(path: string, payload: TReq, options: PostJsonOptions = {}): Promise<TRes> => {
  const retries = options.retries ?? 0;
  const retryDelayMs = options.retryDelayMs ?? 350;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    let response: Response;

    try {
      response = await fetch(`${CONFIG.apiBaseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (_error) {
      if (attempt < retries) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }

      throw new Error(
        `Cannot reach backend API at ${CONFIG.apiBaseUrl}. Start backend with \"npm run backend:dev\" (or \"npm run start:backend\") and set src/config.ts apiBaseUrl to your current computer LAN IP when using a physical phone.`,
      );
    }

    if (!response.ok) {
      const errorBody = await response.text();

      if (attempt < retries && isRetryableStatus(response.status)) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }

      throw new Error(errorBody || `Request failed: ${response.status}`);
    }

    return (await response.json()) as TRes;
  }

  throw new Error('Backend request failed after retries.');
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
    });
  },
};
