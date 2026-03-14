import 'react-native-get-random-values';
import QuickCrypto from 'react-native-quick-crypto';
import { CONFIG } from '../config';
import { EncryptedBlobPayload, SplitShares } from '../types';
import { wipeArray, wipeString, wipeUint8 } from '../utils/memory';

export interface GeneratedWalletSecrets {
  mnemonic: string;
  ethPrivateKey: string;
  solPrivateKeyBase58: string;
  ethAddress: string;
  solAddress: string;
}

const deriveAesKey = (password: string, salt: Uint8Array) => {
  const { pbkdf2Sync } = QuickCrypto as any;
  return pbkdf2Sync(password, Buffer.from(salt), CONFIG.pbkdf2Iterations, 32, 'sha512') as unknown as Uint8Array;
};

export const generateMnemonic = (): string => {
  const bip39 = require('bip39') as typeof import('bip39');
  return bip39.generateMnemonic(128);
};

export const deriveKeysFromMnemonic = (mnemonic: string): GeneratedWalletSecrets => {
  const bip39 = require('bip39') as typeof import('bip39');
  const { derivePath } = require('ed25519-hd-key') as typeof import('ed25519-hd-key');
  const { Keypair } = require('@solana/web3.js') as typeof import('@solana/web3.js');
  const { hdkey } = require('ethereumjs-wallet') as { hdkey: any };

  const seedBuffer = bip39.mnemonicToSeedSync(mnemonic);

  const ethWallet = hdkey
    .fromMasterSeed(seedBuffer)
    .derivePath("m/44'/60'/0'/0/0")
    .getWallet();

  const ethPrivateKey = `0x${ethWallet.getPrivateKey().toString('hex')}`;
  const ethAddress = `0x${ethWallet.getAddress().toString('hex')}`;

  const solDerivation = derivePath("m/44'/501'/0'/0'", seedBuffer.toString('hex'));
  const solKeypair = Keypair.fromSeed(solDerivation.key);
  const solPrivateKeyBase58 = Buffer.from(solKeypair.secretKey).toString('base64');
  const solAddress = solKeypair.publicKey.toBase58();

  seedBuffer.fill(0);

  return {
    mnemonic,
    ethPrivateKey,
    solPrivateKeyBase58,
    ethAddress,
    solAddress,
  };
};

export const encryptSeedBlob = (
  mnemonic: string,
  password: string,
): string => {
  const { randomBytes, createCipheriv } = QuickCrypto as any;

  const iv = randomBytes(12);
  const salt = randomBytes(32);
  const key = deriveAesKey(password, salt);

  const payload = JSON.stringify({
    mnemonic,
  });

  const cipher = createCipheriv('aes-256-gcm', key as never, iv as never);
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  const result: EncryptedBlobPayload = {
    iv: Buffer.from(iv).toString('base64'),
    salt: Buffer.from(salt).toString('base64'),
    ciphertext: encrypted.toString('base64'),
    tag: tag.toString('base64'),
    kdfIterations: CONFIG.pbkdf2Iterations,
  };

  key.fill(0);
  wipeString(payload);

  return JSON.stringify(result);
};

export const decryptSeedBlob = (encryptedBlob: string, password: string): GeneratedWalletSecrets => {
  const { createDecipheriv } = QuickCrypto as any;

  const encryptedPayload = JSON.parse(encryptedBlob) as EncryptedBlobPayload;

  const iv = Buffer.from(encryptedPayload.iv, 'base64');
  const salt = Buffer.from(encryptedPayload.salt, 'base64');
  const ciphertext = Buffer.from(encryptedPayload.ciphertext, 'base64');
  const tag = Buffer.from(encryptedPayload.tag, 'base64');

  const key = deriveAesKey(password, salt);
  const decipher = createDecipheriv('aes-256-gcm', key as never, iv as never);
  decipher.setAuthTag(tag as never);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  const decryptedPayload = JSON.parse(decrypted) as { mnemonic: string };
  const data = deriveKeysFromMnemonic(decryptedPayload.mnemonic);

  key.fill(0);
  wipeString(decrypted);

  return data;
};

export const splitEncryptedBlob = (encryptedBlob: string): SplitShares => {
  const { split } = require('shamirs-secret-sharing') as {
    split: (secret: Buffer, opts: { shares: number; threshold: number }) => [Uint8Array, Uint8Array];
  };

  const blobBytes = Buffer.from(encryptedBlob, 'utf8');

  // Shamir shares are information-theoretic fragments; one share reveals no usable secret.
  const [shareA, shareB] = split(blobBytes, { shares: 2, threshold: 2 }) as [Uint8Array, Uint8Array];

  return { shareA, shareB };
};

export const combineShares = (shareA: Uint8Array, shareB: Uint8Array): string => {
  const { combine } = require('shamirs-secret-sharing') as {
    combine: (shares: Uint8Array[]) => Uint8Array;
  };

  const combined = combine([shareA, shareB]);
  const reconstructed = Buffer.from(combined).toString('utf8');
  wipeUint8(combined);
  return reconstructed;
};

export const createDeviceFingerprint = async (): Promise<string> => {
  const { randomBytes, createHash } = QuickCrypto as any;

  const entropy = randomBytes(32).toString('hex');
  return createHash('sha256').update(entropy).digest().toString('hex');
};

export const validateMnemonic = (phrase: string): boolean => {
  const bip39 = require('bip39') as typeof import('bip39');
  return bip39.validateMnemonic(phrase.trim().toLowerCase().replace(/\s+/g, ' '));
};

export const wipeWalletSecrets = (secrets: Partial<GeneratedWalletSecrets> | null | undefined): void => {
  if (!secrets) {
    return;
  }

  wipeString(secrets.mnemonic);
  wipeString(secrets.ethPrivateKey);
  wipeString(secrets.solPrivateKeyBase58);
  wipeString(secrets.ethAddress);
  wipeString(secrets.solAddress);

  if (secrets.mnemonic) {
    const words = secrets.mnemonic.split(' ');
    wipeArray(words);
  }
};
