import { CONFIG } from '../config';
import {
  BackendFetchShareRequest,
  BackendFetchShareResponse,
  BackendRegisterRequest,
  BackendRegisterResponse,
} from '../types';

const postJson = async <TReq, TRes>(path: string, payload: TReq): Promise<TRes> => {
  const response = await fetch(`${CONFIG.apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || `Request failed: ${response.status}`);
  }

  return (await response.json()) as TRes;
};

export const backendApi = {
  registerUser(payload: BackendRegisterRequest): Promise<BackendRegisterResponse> {
    return postJson<BackendRegisterRequest, BackendRegisterResponse>('/api/user/register', payload);
  },

  fetchShareB(payload: BackendFetchShareRequest): Promise<BackendFetchShareResponse> {
    return postJson<BackendFetchShareRequest, BackendFetchShareResponse>('/api/share/fetch', payload);
  },

  updateShareB(payload: {
    userId: string;
    deviceFingerprint: string;
    sessionToken: string;
    nextShareB: string;
  }): Promise<{ success: boolean }> {
    return postJson('/api/share/update', payload);
  },
};
