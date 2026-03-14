# Smart Contracts (Ethereum)

This folder contains Solidity contracts for the NFC POS settlement layer.

## Contract

- `NfcPosPaymentHub.sol`
  - Merchant configuration (activate/deactivate, payout address, metadata URI)
  - ETH payment settlement (`payNative`)
  - ERC-20 payment settlement (`payErc20`) for tokens like USDC
  - Platform fee support in basis points
  - Immutable payment receipt event `PaymentRecorded`
  - Replay protection using `invoiceId`

## Quick Start

1. Install dependencies:

```bash
cd contracts
npm install
```

2. Copy env file:

```bash
cp .env.example .env
```

3. Compile:

```bash
npm run compile
```

4. Run tests:

```bash
npm run test
```

5. Deploy locally (with a local node):

```bash
npm run node
# in another terminal
npm run deploy:local
```

6. Deploy to Sepolia:

```bash
npm run deploy:sepolia
```

## Mobile Integration Notes

- Use `PaymentRecorded` event as on-chain receipt for POS reconciliation.
- Generate `invoiceId` as a UUID hash per payment request.
- Store deployed address and ABI in mobile config.
- For USDC on Ethereum, call `payErc20` after ERC-20 approval from payer wallet.
