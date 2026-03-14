import React, { useEffect, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { SectionLabel } from '../components/SectionLabel';
import { theme } from '../constants/theme';
import { useWallet } from '../context/WalletContext';
import { generateMnemonic, validateMnemonic } from '../services/cryptoService';

type Step = 'welcome' | 'seed' | 'password' | 'nfc';
import React, { useState } from 'react';
import { SetupWalletScreen } from './onboarding/SetupWalletScreen';
import { WelcomeScreen } from './onboarding/WelcomeScreen';

type OnboardingScreenProps = {
  onSetupStart: () => void;
  onSetupComplete: () => void;
};

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onSetupStart, onSetupComplete }) => {
  const [mode, setMode] = useState<'create' | 'import' | null>(null);

  if (!mode) {
    return <WelcomeScreen onCreate={() => setMode('create')} onImport={() => setMode('import')} />;
  }

  return (
    <SetupWalletScreen
      mode={mode}
      onBack={() => setMode(null)}
      onSetupComplete={onSetupComplete}
      onSetupStart={onSetupStart}
    />
  );
};
    setStep('seed');

  };
