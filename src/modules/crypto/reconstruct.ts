import { Buffer } from 'buffer';
import * as bip39 from 'bip39';
import QuickCrypto from 'react-native-quick-crypto';
import { derivePath } from 'ed25519-hd-key';

const KDF_ITERATIONS = 310000;
const KDF_KEY_LENGTH = 32;

const HEX_RE = /^[0-9a-fA-F]+$/;

export class ReconstructionError extends Error {
  constructor(message = 'Failed to reconstruct wallet payload from shares.') {
    super(message);
    this.name = 'ReconstructionError';
  }
}

export class MalformedBlobError extends Error {
  constructor(message = 'Reconstructed payload is malformed.') {
    super(message);
    this.name = 'MalformedBlobError';
  }
}

export class DecryptionError extends Error {
  constructor(message = 'Invalid password or corrupted data') {
    super(message);
    this.name = 'DecryptionError';
  }
}

export class InvalidMnemonicError extends Error {
  constructor(message = 'Decrypted mnemonic is invalid.') {
    super(message);
    this.name = 'InvalidMnemonicError';
  }
}

type EncryptedBlob = {
  ciphertext: string;
  iv: string;
  salt: string;
  authTag: string;
};

const isHexString = (value: unknown): value is string => {
  return typeof value === 'string' && value.length > 0 && value.length % 2 === 0 && HEX_RE.test(value);
};

const parseEncryptedBlob = (raw: Buffer): EncryptedBlob => {
  try {
    const parsed = JSON.parse(raw.toString('utf8')) as Partial<EncryptedBlob>;

    if (!isHexString(parsed.ciphertext)) {
      throw new MalformedBlobError('ciphertext missing or invalid hex.');
    }
    if (!isHexString(parsed.iv)) {
      throw new MalformedBlobError('iv missing or invalid hex.');
    }
    if (!isHexString(parsed.salt)) {
      throw new MalformedBlobError('salt missing or invalid hex.');
    }
    if (!isHexString(parsed.authTag)) {
      throw new MalformedBlobError('authTag missing or invalid hex.');
    }

    return {
      ciphertext: parsed.ciphertext,
      iv: parsed.iv,
      salt: parsed.salt,
      authTag: parsed.authTag,
    };
  } catch (error) {
    if (error instanceof MalformedBlobError) {
      throw error;
    }
    throw new MalformedBlobError(error instanceof Error ? error.message : 'Invalid blob JSON.');
  }
};

const deriveAesKey = (password: string, salt: Buffer): Buffer<ArrayBufferLike> => {
  try {
    const pbkdf2Sync = (QuickCrypto as unknown as {
      pbkdf2Sync: (passwordInput: string, saltInput: Buffer, iterations: number, keyLen: number, digest: string) => Buffer;
    }).pbkdf2Sync;

    return pbkdf2Sync(password, salt, KDF_ITERATIONS, KDF_KEY_LENGTH, 'sha512') as Buffer<ArrayBufferLike>;
  } catch (error) {
    throw new DecryptionError(error instanceof Error ? error.message : 'PBKDF2 key derivation failed.');
  }
};

const deriveKeysFromMnemonic = (mnemonic: string): { ethPrivateKey: string; solPrivateKey: Uint8Array } => {
  let seed = Buffer.alloc(0) as Buffer<ArrayBufferLike>;
  let ethPk = Buffer.alloc(0) as Buffer<ArrayBufferLike>;
  let solSk = new Uint8Array(0);

  try {
    const { hdkey } = require('ethereumjs-wallet') as {
      hdkey: {
        fromMasterSeed: (seedBuffer: Buffer) => {
          derivePath: (path: string) => {
            getWallet: () => {
              getPrivateKey: () => Buffer;
            };
          };
        };
      };
    };

    const nacl = require('tweetnacl') as typeof import('tweetnacl');

    // ETH uses secp256k1 via BIP32. SOL uses Ed25519.
    // Both are derived from same BIP39 seed but different paths and curves.
    seed = bip39.mnemonicToSeedSync(mnemonic);

    const ethWallet = hdkey
      .fromMasterSeed(seed)
      .derivePath("m/44'/60'/0'/0/0")
      .getWallet();

    ethPk = Buffer.from(ethWallet.getPrivateKey());

    const solDerived = derivePath("m/44'/501'/0'/0'", seed.toString('hex'));
    const solKeypair = nacl.sign.keyPair.fromSeed(solDerived.key);
    solSk = Uint8Array.from(solKeypair.secretKey);

    const ethPrivateKey = `0x${ethPk.toString('hex')}`;

    return {
      ethPrivateKey,
      solPrivateKey: solSk,
    };
  } catch (error) {
    ethPk.fill(0);
    solSk.fill(0);
    throw new InvalidMnemonicError(error instanceof Error ? error.message : 'Key derivation failed.');
  } finally {
    seed.fill(0);
  }
};

export const reconstructAndDecrypt = async (
  shareA: Buffer,
  shareB: Buffer,
  password: string,
): Promise<{ mnemonic: string; ethPrivateKey: string; solPrivateKey: Uint8Array }> => {
  let reconstructed = Buffer.alloc(0) as Buffer<ArrayBufferLike>;
  let key = Buffer.alloc(0) as Buffer<ArrayBufferLike>;
  let ciphertext = Buffer.alloc(0) as Buffer<ArrayBufferLike>;
  let iv = Buffer.alloc(0) as Buffer<ArrayBufferLike>;
  let salt = Buffer.alloc(0) as Buffer<ArrayBufferLike>;
  let authTag = Buffer.alloc(0) as Buffer<ArrayBufferLike>;
  let decrypted = Buffer.alloc(0) as Buffer<ArrayBufferLike>;

  try {
    try {
      const sss = require('shamirs-secret-sharing') as {
        combine: (shares: Uint8Array[]) => Uint8Array;
      };

      reconstructed = Buffer.from(sss.combine([Uint8Array.from(shareA), Uint8Array.from(shareB)]));
    } catch (error) {
      throw new ReconstructionError(error instanceof Error ? error.message : 'Unknown reconstruction error.');
    }

    // Garbage input produces garbage output from Shamir.
    // We detect corruption at the AES-GCM auth tag verification step.
    const blob = parseEncryptedBlob(reconstructed);

    salt = Buffer.from(blob.salt, 'hex');
    iv = Buffer.from(blob.iv, 'hex');
    authTag = Buffer.from(blob.authTag, 'hex');
    ciphertext = Buffer.from(blob.ciphertext, 'hex');

    key = deriveAesKey(password, salt);

    try {
      const createDecipheriv = (QuickCrypto as unknown as {
        createDecipheriv: (algorithm: string, keyInput: Buffer, ivInput: Buffer) => {
          setAuthTag: (tagInput: Buffer) => void;
          update: (data: Buffer) => Buffer;
          final: () => Buffer;
        };
      }).createDecipheriv;

      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]) as Buffer<ArrayBufferLike>;
    } catch (_error) {
      // We do not tell the user whether failure was wrong password
      // or corrupted card data. This prevents oracle attacks.
      throw new DecryptionError('Invalid password or corrupted data');
    }

    const mnemonic = decrypted.toString('utf8').trim();
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new InvalidMnemonicError();
    }

    const derived = deriveKeysFromMnemonic(mnemonic);

    return {
      mnemonic,
      ethPrivateKey: derived.ethPrivateKey,
      solPrivateKey: derived.solPrivateKey,
    };
  } finally {
    reconstructed.fill(0);
    key.fill(0);
    ciphertext.fill(0);
    iv.fill(0);
    salt.fill(0);
    authTag.fill(0);
    decrypted.fill(0);
  }
};

export const wipeKeyMaterial = (keys: {
  mnemonic: string;
  ethPrivateKey: string;
  solPrivateKey: Uint8Array;
}): void => {
  const mnemonicBuffer = Buffer.from(keys.mnemonic, 'utf8');
  mnemonicBuffer.fill(0);

  const ethPkBuffer = Buffer.from(keys.ethPrivateKey, 'utf8');
  ethPkBuffer.fill(0);

  keys.solPrivateKey.fill(0);
  keys.mnemonic = '';
  keys.ethPrivateKey = '';

  // eslint-disable-next-line no-console
  console.debug('Key material wiped');
};
