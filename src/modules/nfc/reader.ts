import { Buffer } from 'buffer';
import NfcManager, { Ndef, NfcEvents, NfcTech } from 'react-native-nfc-manager';

const WALLET_SHARE_MIME_TYPE = 'application/x-wallet-share';
const READ_TIMEOUT_MS = 30_000;
const TAP_DEBOUNCE_MS = 2_000;

let nfcStarted = false;

export class NFCNotSupportedError extends Error {
  constructor(message = 'NFC is not supported on this device.') {
    super(message);
    this.name = 'NFCNotSupportedError';
  }
}

export class NFCDisabledError extends Error {
  constructor(message = 'NFC is disabled. Please enable NFC in system settings.') {
    super(message);
    this.name = 'NFCDisabledError';
  }
}

export class NFCTimeoutError extends Error {
  constructor(message = 'NFC read timed out. Please tap card again.') {
    super(message);
    this.name = 'NFCTimeoutError';
  }
}

export class NFCReadError extends Error {
  constructor(message = 'Failed to read NFC card.') {
    super(message);
    this.name = 'NFCReadError';
  }
}

export class NFCInvalidPayloadError extends Error {
  constructor(message = 'Invalid NFC payload. Wallet share record not found or corrupted.') {
    super(message);
    this.name = 'NFCInvalidPayloadError';
  }
}

type NdefRecordLike = {
  type?: number[] | Uint8Array;
  payload?: number[] | Uint8Array;
};

type TagLike = {
  ndefMessage?: NdefRecordLike[];
};

const ensureNfcReady = async (): Promise<void> => {
  const supported = await NfcManager.isSupported();
  if (!supported) {
    throw new NFCNotSupportedError();
  }

  const enabled = await NfcManager.isEnabled();
  if (!enabled) {
    throw new NFCDisabledError();
  }

  if (!nfcStarted) {
    await NfcManager.start();
    nfcStarted = true;
  }
};

const decodeRecordType = (record: NdefRecordLike): string => {
  if (!record.type) {
    return '';
  }

  try {
    return Ndef.util.bytesToString(record.type);
  } catch (_error) {
    try {
      return Buffer.from(record.type).toString('utf8');
    } catch (_innerError) {
      return '';
    }
  }
};

const extractShareAFromTag = (tag: unknown): Buffer => {
  const nfcTag = (tag ?? {}) as TagLike;
  const records = nfcTag.ndefMessage ?? [];

  if (records.length === 0) {
    throw new NFCInvalidPayloadError('No NDEF records found on card.');
  }

  const walletRecord = records.find((record) => decodeRecordType(record) === WALLET_SHARE_MIME_TYPE);

  if (!walletRecord?.payload) {
    throw new NFCInvalidPayloadError('Wallet share record not found on card.');
  }

  const shareA = Buffer.from(walletRecord.payload);
  if (shareA.length <= 32) {
    shareA.fill(0);
    throw new NFCInvalidPayloadError('Wallet share payload is too small.');
  }

  return shareA;
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new NFCTimeoutError());
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export const readShareAFromCard = async (): Promise<Buffer> => {
  await ensureNfcReady();

  try {
    await withTimeout(NfcManager.requestTechnology(NfcTech.Ndef), READ_TIMEOUT_MS);
    const tag = await withTimeout(NfcManager.getTag(), READ_TIMEOUT_MS);
    return extractShareAFromTag(tag);
  } catch (error) {
    if (
      error instanceof NFCNotSupportedError
      || error instanceof NFCDisabledError
      || error instanceof NFCTimeoutError
      || error instanceof NFCInvalidPayloadError
    ) {
      throw error;
    }

    throw new NFCReadError(error instanceof Error ? error.message : 'Unknown NFC read error.');
  } finally {
    await NfcManager.cancelTechnologyRequest().catch(() => undefined);
  }
};

export const listenForCard = (
  onCardDetected: (shareA: Buffer) => void,
  onError: (err: Error) => void,
): (() => void) => {
  let active = true;
  let lastTapAt = 0;

  const setup = async (): Promise<void> => {
    try {
      await ensureNfcReady();

      NfcManager.setEventListener(NfcEvents.DiscoverTag, (tag: unknown) => {
        if (!active) {
          return;
        }

        const now = Date.now();
        if (now - lastTapAt < TAP_DEBOUNCE_MS) {
          return;
        }
        lastTapAt = now;

        try {
          const shareA = extractShareAFromTag(tag);
          onCardDetected(shareA);
        } catch (error) {
          onError(error instanceof Error ? error : new NFCReadError('Unknown card parse error.'));
        }
      });

      await NfcManager.registerTagEvent();
    } catch (error) {
      onError(error instanceof Error ? error : new NFCReadError('Unknown NFC listener error.'));
    }
  };

  setup().catch((error) => {
    onError(error instanceof Error ? error : new NFCReadError('Unknown NFC setup error.'));
  });

  return () => {
    active = false;
    NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
    NfcManager.unregisterTagEvent().catch(() => undefined);
  };
};
