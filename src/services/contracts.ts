import { ethers } from 'ethers';
import { CONFIG } from '../config';

export const NFC_POS_PAYMENT_HUB_ABI = [
  'function payNative(bytes32 invoiceId, address merchant, bytes32 payerUserHash) payable',
  'function payErc20(bytes32 invoiceId, address merchant, address token, uint256 amount, bytes32 payerUserHash)',
  'function settledInvoiceIds(bytes32 invoiceId) view returns (bool)',
  'event PaymentRecorded(bytes32 indexed invoiceId, address indexed merchant, address indexed payer, address token, uint256 grossAmount, uint256 feeAmount, bytes32 payerUserHash)',
] as const;

const provider = new ethers.JsonRpcProvider(CONFIG.ethRpcUrl);

export const getPosHubContractReadOnly = (): ethers.Contract => {
  if (!CONFIG.ethPosHubAddress) {
    throw new Error('POS hub contract address is not configured.');
  }

  return new ethers.Contract(CONFIG.ethPosHubAddress, NFC_POS_PAYMENT_HUB_ABI, provider);
};

export const getPosHubContractWithSigner = (privateKey: string): ethers.Contract => {
  if (!CONFIG.ethPosHubAddress) {
    throw new Error('POS hub contract address is not configured.');
  }

  const signer = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(CONFIG.ethPosHubAddress, NFC_POS_PAYMENT_HUB_ABI, signer);
};

export const computeInvoiceId = (invoiceRef: string): string => {
  return ethers.id(invoiceRef);
};

export const computePayerUserHash = (userId: string): string => {
  return ethers.id(userId);
};
