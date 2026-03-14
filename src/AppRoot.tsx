import React, { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text } from 'react-native';
import { WalletProvider, useWallet } from './context/WalletContext';
import { RootNavigation } from './navigation/RootNavigation';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { theme } from './constants/theme';

const AppShell: React.FC = () => {
  const { isSetupComplete, initializeNfc, hydrateWallet } = useWallet();
  const [nfcError, setNfcError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        await hydrateWallet();
      } finally {
        if (mounted) {
          setBooting(false);
        }
      }
    };

    run().catch(() => {
      if (mounted) {
        setBooting(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [hydrateWallet]);

  useEffect(() => {
    initializeNfc().catch((error) => {
      setNfcError(error instanceof Error ? error.message : 'Unable to initialize NFC.');
    });
  }, [initializeNfc]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" />
      {nfcError ? <Text style={styles.errorBanner}>{nfcError}</Text> : null}
      {booting ? <Text style={styles.loadingBanner}>Loading wallet profile…</Text> : null}
      {!booting && (isSetupComplete ? <RootNavigation /> : <OnboardingScreen />)}
    </SafeAreaView>
  );
};

export const AppRoot: React.FC = () => {
  return (
    <WalletProvider>
      <AppShell />
    </WalletProvider>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  errorBanner: {
    color: theme.colors.warning,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    textAlign: 'center',
  },
  loadingBanner: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
});
