import { Buffer } from 'buffer';
import * as bip39 from 'bip39';
import NfcManager, { Ndef, NfcTech } from 'react-native-nfc-manager';
import QuickCrypto from 'react-native-quick-crypto';
import * as Keychain from 'react-native-keychain';
import { derivePath } from 'ed25519-hd-key';
import { Keypair } from '@solana/web3.js';
import { CONFIG } from '../../config';

const WALLET_SHARE_MIME_TYPE = 'application/x-wallet-share';
const KDF_ITERATIONS = 310000;
const KDF_KEY_LENGTH = 32;
const RETRY_DELAYS_MS = [1000, 2000, 4000] as const;

const KEYCHAIN_SERVICE_DEVICE = 'nfc-split-wallet-device-fingerprint';
const KEYCHAIN_SERVICE_SESSION = 'nfc-split-wallet-session';

class NFCNotSupportedError extends Error {
  constructor() {
    super('NFC is not supported on this device.');
    this.name = 'NFCNotSupportedError';
  }
}

class NFCDisabledError extends Error {
  constructor() {
    super('NFC is disabled. Please enable NFC in system settings.');
    this.name = 'NFCDisabledError';
  }
}

class TagReadOnlyError extends Error {
  constructor() {
    super('NFC tag is read-only.');
    this.name = 'TagReadOnlyError';
  }
}

class TagTooSmallError extends Error {
  constructor(requiredBytes: number, availableBytes: number) {
    super(`NFC tag too small. Required ${requiredBytes} bytes, available ${availableBytes} bytes.`);
    this.name = 'TagTooSmallError';
  }
}

class WriteVerificationError extends Error {
  constructor() {
    super('NFC write verification failed.');
    this.name = 'WriteVerificationError';
  }
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const toHex = (bytes: Buffer<ArrayBufferLike>): string => bytes.toString('hex');

const generateDeviceFingerprint = (): string => {
  try {
    const randomBytes = (QuickCrypto as unknown as {
      randomBytes: (size: number) => Buffer;
    }).randomBytes;
    const bytes = randomBytes(16) as Buffer<ArrayBufferLike>;
    // UUID v4 formatting from secure random bytes.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.toString('hex');
    bytes.fill(0);
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch (error) {
    throw new Error(`Failed to generate device fingerprint: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const getOrCreateDeviceFingerprint = async (): Promise<string> => {
  const existing = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE_DEVICE });
  if (existing && existing.password) {
    return existing.password;
  }

  const next = generateDeviceFingerprint();
  await Keychain.setGenericPassword('device', next, {
    service: KEYCHAIN_SERVICE_DEVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  return next;
};

const deriveAddresses = (mnemonic: string): {
  ethAddress: string;
  ethPrivateKey: Buffer<ArrayBufferLike>;
  solAddress: string;
  solPrivateKey: Uint8Array;
  seed: Buffer<ArrayBufferLike>;
} => {
  let seed = Buffer.alloc(0) as Buffer<ArrayBufferLike>;
  let ethPrivateKey = Buffer.alloc(0) as Buffer<ArrayBufferLike>;
  let solPrivateKey = new Uint8Array(0);

  try {
    const { hdkey } = require('ethereumjs-wallet') as { hdkey: { fromMasterSeed: (seedBuffer: Buffer) => { derivePath: (path: string) => { getWallet: () => { getPrivateKey: () => Buffer; getAddressString: () => string } } } } };

    const nacl = require('tweetnacl') as typeof import('tweetnacl');

    // ETH uses secp256k1 via BIP32. SOL uses Ed25519.
    // Both are derived from same BIP39 seed but different paths and curves.
    seed = bip39.mnemonicToSeedSync(mnemonic);

    const ethWallet = hdkey
      .fromMasterSeed(seed)
      .derivePath("m/44'/60'/0'/0/0")
      .getWallet();

    ethPrivateKey = Buffer.from(ethWallet.getPrivateKey());
    const ethAddress = ethWallet.getAddressString();

    const solDerived = derivePath("m/44'/501'/0'/0'", seed.toString('hex'));
    const solKeyPair = nacl.sign.keyPair.fromSeed(solDerived.key);
    solPrivateKey = Uint8Array.from(solKeyPair.secretKey);
    const solAddress = Keypair.fromSecretKey(solPrivateKey).publicKey.toBase58();

    return {
      ethAddress,
      ethPrivateKey,
      solAddress,
      solPrivateKey,
      seed,
    };
  } catch (error) {
    seed.fill(0);
    ethPrivateKey.fill(0);
    solPrivateKey.fill(0);
    throw new Error(`Failed to derive wallet keys: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const encryptMnemonicToBlob = (mnemonic: string): Buffer => {
  let salt = Buffer.alloc(0) as Buffer<ArrayBufferLike>;
  let iv = Buffer.alloc(0) as Buffer<ArrayBufferLike>;
  let key = Buffer.alloc(0) as Buffer<ArrayBufferLike>;
  let ciphertext = Buffer.alloc(0) as Buffer<ArrayBufferLike>;
  let authTag = Buffer.alloc(0) as Buffer<ArrayBufferLike>;

  try {
    const randomBytes = (QuickCrypto as unknown as {
      randomBytes: (size: number) => Buffer;
      pbkdf2Sync: (password: string, saltBytes: Buffer, iterations: number, keyLen: number, digest: string) => Buffer;
      createCipheriv: (algorithm: string, keyBytes: Buffer, ivBytes: Buffer) => {
        update: (data: Buffer, inputEncoding?: BufferEncoding) => Buffer;
        final: () => Buffer;
        getAuthTag: () => Buffer;
      };
    }).randomBytes;

    const pbkdf2Sync = (QuickCrypto as unknown as {
      pbkdf2Sync: (password: string, saltBytes: Buffer, iterations: number, keyLen: number, digest: string) => Buffer;
    }).pbkdf2Sync;

    const createCipheriv = (QuickCrypto as unknown as {
      createCipheriv: (algorithm: string, keyBytes: Buffer, ivBytes: Buffer) => {
        update: (data: Buffer, inputEncoding?: BufferEncoding) => Buffer;
        final: () => Buffer;
        getAuthTag: () => Buffer;
      };
    }).createCipheriv;

    salt = randomBytes(32) as Buffer<ArrayBufferLike>;
    iv = randomBytes(16) as Buffer<ArrayBufferLike>;
    key = pbkdf2Sync(mnemonic, salt, KDF_ITERATIONS, KDF_KEY_LENGTH, 'sha512') as Buffer<ArrayBufferLike>;

    const cipher = createCipheriv('aes-256-gcm', key, iv);
    ciphertext = Buffer.concat([cipher.update(Buffer.from(mnemonic, 'utf8')), cipher.final()]);
    authTag = cipher.getAuthTag() as Buffer<ArrayBufferLike>;

    // AES-GCM provides both confidentiality and integrity.
    // The authTag means any tampering with ciphertext will cause
    // decryption to throw, not silently produce garbage.
    const jsonBlob = {
      ciphertext: toHex(ciphertext),
      iv: toHex(iv),
      salt: toHex(salt),
      authTag: toHex(authTag),
    };

    return Buffer.from(JSON.stringify(jsonBlob), 'utf8');
  } catch (error) {
    throw new Error(`Failed to encrypt mnemonic: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    salt.fill(0);
    iv.fill(0);
    key.fill(0);
    ciphertext.fill(0);
    authTag.fill(0);
  }
};

const splitBlobToShares = (encryptedBlob: Buffer): { shareA: Buffer; shareB: Buffer } => {
  try {
    const sss = require('shamirs-secret-sharing') as {
      split: (secret: Buffer, options: { shares: number; threshold: number }) => Uint8Array[];
    };

    // Shamir uses polynomial interpolation over GF(256).
    // Neither share leaks information about the secret.
    // This is NOT the same as splitting a file in half.
    const shares = sss.split(encryptedBlob, { shares: 2, threshold: 2 });
    if (!shares || shares.length !== 2) {
      throw new Error('Shamir split did not produce exactly 2 shares.');
    }

    return {
      shareA: Buffer.from(shares[0]),
      shareB: Buffer.from(shares[1]),
    };
  } catch (error) {
    throw new Error(`Failed to split encrypted blob: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const writeShareAToNfc = async (shareA: Buffer): Promise<void> => {
  const supported = await NfcManager.isSupported();
  if (!supported) {
    throw new NFCNotSupportedError();
  }

  const enabled = await NfcManager.isEnabled();
  if (!enabled) {
    throw new NFCDisabledError();
  }

  await NfcManager.start();

  let writeBuffer = Buffer.alloc(0);
  let expectedPayload = Buffer.alloc(0);

  try {
    await NfcManager.requestTechnology(NfcTech.Ndef);

    expectedPayload = Buffer.from(shareA);

    const record = Ndef.record(
      Ndef.TNF_MIME_MEDIA,
      WALLET_SHARE_MIME_TYPE,
      [],
      Array.from(expectedPayload),
    );

    const encodedMessage = Ndef.encodeMessage([record]);
    if (!encodedMessage) {
      throw new Error('Failed to encode NDEF message.');
    }

    writeBuffer = Buffer.from(encodedMessage);

    const tagBeforeWrite = await NfcManager.getTag();
    const isWritable = Boolean((tagBeforeWrite as { isWritable?: boolean } | null)?.isWritable ?? true);
    const maxSize = (tagBeforeWrite as { maxSize?: number } | null)?.maxSize;

    if (!isWritable) {
      throw new TagReadOnlyError();
    }

    if (typeof maxSize === 'number' && writeBuffer.length > maxSize) {
      throw new TagTooSmallError(writeBuffer.length, maxSize);
    }

    await NfcManager.ndefHandler.writeNdefMessage(Array.from(writeBuffer));

    const tagAfterWrite = await NfcManager.getTag();
    const ndefMessage = (tagAfterWrite as { ndefMessage?: Array<{ type: number[]; payload: number[] }> } | null)?.ndefMessage ?? [];

    const walletRecord = ndefMessage.find((item) => {
      const typeText = Buffer.from(item.type).toString('utf8');
      return typeText === WALLET_SHARE_MIME_TYPE;
    });

    if (!walletRecord) {
      throw new WriteVerificationError();
    }

    const readPayload = Buffer.from(walletRecord.payload);
    const isSame = readPayload.length === expectedPayload.length && readPayload.equals(expectedPayload);
    readPayload.fill(0);

    if (!isSame) {
      throw new WriteVerificationError();
    }
  } catch (error) {
    if (
      error instanceof NFCNotSupportedError
      || error instanceof NFCDisabledError
      || error instanceof TagReadOnlyError
      || error instanceof TagTooSmallError
      || error instanceof WriteVerificationError
    ) {
      throw error;
    }

    throw new Error(`Failed to write Share A to NFC card: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    writeBuffer.fill(0);
    expectedPayload.fill(0);
    await NfcManager.cancelTechnologyRequest().catch(() => undefined);
  }
};

const registerShareB = async (
  shareB: Buffer,
  ethAddress: string,
  solAddress: string,
  deviceFingerprint: string,
): Promise<void> => {
  const endpoint = `${CONFIG.apiBaseUrl.replace(/\/+$/, '')}/api/user/register`;

  let responseData: { userId?: string; sessionToken?: string } | null = null;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
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
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }

      responseData = (await response.json()) as { userId?: string; sessionToken?: string };
      if (!responseData.userId || !responseData.sessionToken) {
        throw new Error('Malformed register response.');
      }

      await Keychain.setGenericPassword(responseData.userId, responseData.sessionToken, {
        service: KEYCHAIN_SERVICE_SESSION,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });

      return;
    } catch (error) {
      if (attempt === RETRY_DELAYS_MS.length - 1) {
        throw new Error(`Failed to register Share B: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
};

export const setupWallet = async (password: string): Promise<{ ethAddress: string; solAddress: string }> => {
  let mnemonic = '';
  let seed = Buffer.alloc(0) as Buffer<ArrayBufferLike>;
  let ethPrivateKey = Buffer.alloc(0) as Buffer<ArrayBufferLike>;
  let solPrivateKey = new Uint8Array(0);
  let encryptedBlob = Buffer.alloc(0) as Buffer<ArrayBufferLike>;
  let shareA = Buffer.alloc(0) as Buffer<ArrayBufferLike>;
  let shareB = Buffer.alloc(0) as Buffer<ArrayBufferLike>;

  try {
    // STEP 1: Generate mnemonic
    mnemonic = bip39.generateMnemonic(128);
    if (!bip39.validateMnemonic(mnemonic)) {
      mnemonic = bip39.generateMnemonic(128);
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Failed to generate a valid mnemonic.');
      }
    }

    // STEP 2: Derive keys
    const derived = deriveAddresses(mnemonic);
    seed = derived.seed;
    ethPrivateKey = Buffer.from(derived.ethPrivateKey);
    solPrivateKey = Uint8Array.from(derived.solPrivateKey);

    // STEP 3: Encrypt seed
    encryptedBlob = encryptMnemonicToBlob(mnemonic);

    // STEP 4: Split into Shamir shares
    const shares = splitBlobToShares(encryptedBlob);
    shareA = Buffer.from(shares.shareA);
    shareB = Buffer.from(shares.shareB);

    // STEP 5: Write Share A to NFC
    await writeShareAToNfc(shareA);

    // STEP 6: Send Share B to server
    const deviceFingerprint = await getOrCreateDeviceFingerprint();
    await registerShareB(shareB, derived.ethAddress, derived.solAddress, deviceFingerprint);

    return {
      ethAddress: derived.ethAddress,
      solAddress: derived.solAddress,
    };
  } finally {
    // STEP 7: Cleanup
    // JS GC is non-deterministic. Explicit zeroing reduces
    // the exposure window in heap memory even if not a hard guarantee.
    seed.fill(0);
    ethPrivateKey.fill(0);
    solPrivateKey.fill(0);
    encryptedBlob.fill(0);
    shareA.fill(0);
    shareB.fill(0);
    mnemonic = '';
  }
};
