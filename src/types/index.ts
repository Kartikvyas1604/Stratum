export type ChainAsset = 'ETH' | 'SOL' | 'USDC_ETH' | 'USDC_SOL';

export interface WalletAddresses {
  eth: string;
  sol: string;
}

export interface WalletBalances {
  eth: string;
  sol: string;
  usdcEth: string;
  usdcSol: string;
}

export interface TransactionPreview {
  id: string;
  chain: 'ethereum' | 'solana';
  asset: ChainAsset;
  amount: string;
  to: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  txHash?: string;
}

export interface EncryptedBlobPayload {
  iv: string;
  salt: string;
  ciphertext: string;
  tag: string;
  kdfIterations: number;
}

export interface SplitShares {
  shareA: Uint8Array;
  shareB: Uint8Array;
}

export interface BackendRegisterRequest {
  deviceFingerprint: string;
  shareB: string;
}

export interface BackendRegisterResponse {
  userId: string;
  sessionToken: string;
}

export interface BackendFetchShareRequest {
  userId: string;
  deviceFingerprint: string;
  sessionToken: string;
}

export interface BackendFetchShareResponse {
  shareB: string;
}

export interface PaymentRequest {
  recipient: string;
  amount: string;
  asset: ChainAsset;
}

export interface WalletContextState {
  isSetupComplete: boolean;
  userId: string | null;
  addresses: WalletAddresses | null;
  balances: WalletBalances;
  recentTransactions: TransactionPreview[];
}