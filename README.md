# NFC Split-Key Crypto Wallet + Mobile POS (React Native + Express)

This repository contains:
- A React Native (TypeScript) mobile app for iOS/Android NFC split-key wallet + POS flows
- An Express.js backend using PostgreSQL and Supabase SDK integration points

## Full Project Structure

```text
ethmumbai/
  App.tsx
  app.json
  index.ts
  package.json
  tsconfig.json
  babel.config.js
  metro.config.js
  src/
    AppRoot.tsx
    config.ts
    global.d.ts
    constants/
      theme.ts
    components/
      GlassCard.tsx
      PrimaryButton.tsx
    context/
      WalletContext.tsx
    navigation/
      RootNavigation.tsx
    screens/
      OnboardingScreen.tsx
      WalletScreen.tsx
      PayScreen.tsx
      ReceiveScreen.tsx
      SettingsScreen.tsx
    services/
      backendApi.ts
      blockchainService.ts
      cryptoService.ts
      nfcService.ts
      secureStorage.ts
    types/
      index.ts
    utils/
      memory.ts
  backend/
    package.json
    tsconfig.json
    .env.example
    sql/
      schema.sql
    src/
      index.ts
      config/
        db.ts
        env.ts
        supabase.ts
      routes/
        userRoutes.ts
        shareRoutes.ts
      services/
        shareService.ts
```

## Mobile Features Implemented

### Flow 1: First-Time Wallet Setup
- Onboarding + password setup screen
- BIP39 12-word mnemonic generation (`bip39`)
- ETH derivation via `ethereumjs-wallet` HD path
- SOL derivation via `@solana/web3.js` + `ed25519-hd-key`
- AES-256-GCM encryption (`react-native-quick-crypto`)
- PBKDF2 SHA-512, 310000 iterations
- 2-of-2 Shamir split (`shamirs-secret-sharing`)
- NFC write of Share A (`react-native-nfc-manager`)
- Backend register storing Share B
- Session token + device fingerprint in `react-native-keychain`

### Flow 2: Sending Payment (Payer)
- Pay tab with password + recipient + amount + asset
- Reads Share A from NFC card
- Fetches Share B from backend with auth factors
- Reconstructs/decrypts secret in isolated async scope
- Sends ETH / SOL / USDC(ETH)
- Wipes key material after signing path

### Flow 3: Receiving/POS (Merchant)
- Receive tab with amount, asset, QR code display, POS processing
- Uses payer credentials + NFC card flow on merchant device
- Reconstructs payer secret locally to sign then broadcast
- Confirmation shown in app UI

## Security Notes in Code

The code includes comments for:
- Why Shamir split is used instead of plain file splitting
- Why key material is wiped after signing
- Why server-side share release requires device + session authentication
- Threat model: card-only compromise is insufficient, server-only compromise is insufficient

## Backend API Contracts

### `POST /api/user/register`
Request:
```json
{
  "deviceFingerprint": "string",
  "shareB": "base64-string"
}
```
Response:
```json
{
  "userId": "uuid",
  "sessionToken": "string"
}
```

### `POST /api/share/fetch`
Request:
```json
{
  "userId": "uuid",
  "deviceFingerprint": "string",
  "sessionToken": "string"
}
```
Response:
```json
{
  "shareB": "base64-string"
}
```

### `POST /api/share/update`
Request:
```json
{
  "userId": "uuid",
  "deviceFingerprint": "string",
  "sessionToken": "string",
  "nextShareB": "base64-string"
}
```
Response:
```json
{
  "success": true
}
```

## Supabase + PostgreSQL Notes

- PostgreSQL stores `user_shares` records (Share B, device fingerprint, session token)
- Supabase client is initialized for integration with managed auth/workflows
- In production: verify Supabase JWT/session before releasing Share B

## Setup Instructions

## 1) Install mobile dependencies

```bash
npm install
```

## 2) Install backend dependencies

```bash
cd backend
npm install
cp .env.example .env
```

Fill `backend/.env` values:
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 3) Create database table

Run:

```bash
psql "$DATABASE_URL" -f backend/sql/schema.sql
```

## 4) Start backend

```bash
npm run backend:dev
```

## 5) React Native native setup prerequisites

Use standard React Native CLI prerequisites:
- Android Studio + SDK (Android 8+)
- Xcode + CocoaPods (iOS 14+)

Then run:

```bash
npm run ios
# or
npm run android
```

## 6) NFC notes

- iOS: enable NFC capability in Xcode project settings
- Android: ensure NFC permissions and foreground dispatch support are configured in `AndroidManifest.xml`
- Tag password protection for Type 4 cards depends on card vendor APDU commands; placeholder included in `nfcService`

## Known Gaps / Placeholders

- USDC on Solana transfer is intentionally placeholder (requires SPL token account strategy)
- Recovery flow is placeholder (must include verified identity process + share rotation)
- Full native iOS/Android project folders are expected in a React Native CLI initialized repo

## Recommended Next Security Hardening

1. Move decryption/signing into native secure module (TEE/SE-backed where available)
2. Add remote attestation + certificate pinning before releasing Share B
3. Enforce rate limits, anti-bruteforce lockouts, and anomaly detection on `/api/share/fetch`
4. Add transaction simulation and user-verification screens before signing
