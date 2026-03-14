import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { AddressChip } from '../../components/ui/AddressChip';
import { GradientCard } from '../../components/ui/GradientCard';
import { NFCRingAnimation } from '../../components/ui/NFCRingAnimation';
import { OrangeButton } from '../../components/ui/OrangeButton';
import { StepIndicator } from '../../components/ui/StepIndicator';
import { Colors, Radius, Spacing } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useWallet } from '../../context/WalletContext';
import { validateMnemonic } from '../../services/cryptoService';

type SetupWalletScreenProps = {
  mode: 'create' | 'import';
  onBack: () => void;
  onSetupStart: () => void;
  onSetupComplete: () => void;
};

type SetupStep = 'generate' | 'secure' | 'write' | 'done';

const TYPING_LINES = ['Creating secure mnemonic...', 'Deriving ETH keys...', 'Deriving SOL keys...'];

const getPasswordScore = (password: string) => {
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { score, checks };
};

export const SetupWalletScreen: React.FC<SetupWalletScreenProps> = ({ mode, onBack, onSetupStart, onSetupComplete }) => {
  const { setupWallet, addresses } = useWallet();
  const [step, setStep] = useState<SetupStep>('generate');
  const [lineIndex, setLineIndex] = useState(0);
  const [importMnemonic, setImportMnemonic] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [didTriggerSetup, setDidTriggerSetup] = useState(false);

  const rotation = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  const passwordMeta = useMemo(() => getPasswordScore(password), [password]);
  const passwordLabel = ['Weak', 'Fair', 'Good', 'Strong'][Math.max(passwordMeta.score - 1, 0)] ?? 'Weak';
  const passwordColor = [Colors.error, Colors.brandOrange, Colors.warning, Colors.success][Math.max(passwordMeta.score - 1, 0)] ?? Colors.error;
  const canContinue = passwordMeta.score === 4 && password === confirmPassword;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 2200,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rotation]);

  useEffect(() => {
    if (step !== 'generate' || mode !== 'create') {
      return;
    }

    const id = setInterval(() => {
      setLineIndex((current) => (current < TYPING_LINES.length - 1 ? current + 1 : current));
    }, 800);
    return () => clearInterval(id);
  }, [mode, step]);

  useEffect(() => {
    if (step !== 'write' || didTriggerSetup) {
      return;
    }

    setDidTriggerSetup(true);
    setSubmitting(true);
    setError(null);
    onSetupStart();

    const run = async () => {
      try {
        await setupWallet(password, mode === 'import' ? importMnemonic.trim().toLowerCase().replace(/\s+/g, ' ') : undefined);
        setStep('done');
        setTimeout(onSetupComplete, 1200);
      } catch (setupError) {
        setError(setupError instanceof Error ? setupError.message : 'Unable to write wallet to NFC card.');
        setStep('secure');
        setDidTriggerSetup(false);
      } finally {
        setSubmitting(false);
      }
    };

    run().catch(() => undefined);
  }, [didTriggerSetup, importMnemonic, mode, onSetupComplete, onSetupStart, password, setupWallet, step]);

  const onContinueFromGenerate = () => {
    if (mode === 'import') {
      const normalized = importMnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!validateMnemonic(normalized)) {
        Alert.alert('Invalid recovery phrase', 'Enter a valid BIP39 recovery phrase to continue.');
        return;
      }
    }
    setStep('secure');
  };

  const onContinueFromSecure = () => {
    if (!canContinue) {
      Alert.alert('Password not ready', 'Use a strong password and make sure both fields match.');
      return;
    }
    setStep('write');
  };

  const progress = ['generate', 'secure', 'write', 'done'].indexOf(step);
  const ringRotation = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Animated.View style={[styles.flex, { opacity, transform: [{ translateY }] }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <StepIndicator currentStep={progress} steps={['Generate', 'Secure', 'Write Card', 'Done']} />

            {step === 'generate' ? (
              <View>
                <Animated.View style={[styles.spinnerShell, { transform: [{ rotate: ringRotation }] }]}>
                  <View style={styles.spinnerRing} />
                </Animated.View>
                <Text allowFontScaling={false} style={styles.title}>
                  {mode === 'create' ? 'Generating your wallet...' : 'Restore your wallet'}
                </Text>
                <Text allowFontScaling={false} style={styles.subtitle}>
                  {mode === 'create'
                    ? 'We are preparing secure multi-chain keys for your NFC wallet.'
                    : 'Import an existing recovery phrase, then protect it with a new local password.'}
                </Text>

                {mode === 'create' ? (
                  <GradientCard>
                    {TYPING_LINES.map((line, index) => (
                      <Text allowFontScaling={false} key={line} style={[styles.typingLine, index <= lineIndex && styles.typingLineActive]}>
                        {line}
                      </Text>
                    ))}
                  </GradientCard>
                ) : (
                  <GradientCard>
                    <Text allowFontScaling={false} style={styles.inputLabel}>
                      Recovery Phrase
                    </Text>
                    <TextInput
                      allowFontScaling={false}
                      autoCapitalize="none"
                      autoCorrect={false}
                      multiline
                      numberOfLines={5}
                      onChangeText={setImportMnemonic}
                      placeholder="word1 word2 word3 ..."
                      placeholderTextColor={Colors.textFaint}
                      style={styles.multilineInput}
                      value={importMnemonic}
                    />
                  </GradientCard>
                )}

                <OrangeButton label="Continue" onPress={onContinueFromGenerate} size="lg" />
                <OrangeButton label="Back" onPress={onBack} size="md" variant="ghost" />
              </View>
            ) : null}

            {step === 'secure' ? (
              <View>
                <Text allowFontScaling={false} style={styles.title}>Secure Your Wallet</Text>
                <Text allowFontScaling={false} style={styles.subtitle}>
                  This password encrypts your keys. There is no recovery if forgotten.
                </Text>

                <GradientCard>
                  <Text allowFontScaling={false} style={styles.inputLabel}>Wallet Password</Text>
                  <TextInput
                    allowFontScaling={false}
                    autoCapitalize="none"
                    onChangeText={setPassword}
                    placeholder="Choose a strong password"
                    placeholderTextColor={Colors.textFaint}
                    secureTextEntry
                    style={styles.input}
                    value={password}
                  />
                  <Text allowFontScaling={false} style={[styles.inputLabel, styles.confirmLabel]}>Confirm Password</Text>
                  <TextInput
                    allowFontScaling={false}
                    autoCapitalize="none"
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm password"
                    placeholderTextColor={Colors.textFaint}
                    secureTextEntry
                    style={styles.input}
                    value={confirmPassword}
                  />

                  <View style={styles.strengthRow}>
                    {[0, 1, 2, 3].map((index) => (
                      <View
                        key={index}
                        style={[
                          styles.strengthBar,
                          index < passwordMeta.score && { backgroundColor: passwordColor },
                        ]}
                      />
                    ))}
                  </View>
                  <Text allowFontScaling={false} style={[styles.strengthLabel, { color: passwordColor }]}>
                    {passwordLabel}
                  </Text>

                  <View style={styles.ruleList}>
                    {[
                      ['8+ characters', passwordMeta.checks.length],
                      ['Uppercase letter', passwordMeta.checks.upper],
                      ['Number', passwordMeta.checks.number],
                      ['Special character', passwordMeta.checks.special],
                    ].map(([label, passed]) => (
                      <View key={String(label)} style={styles.ruleRow}>
                        <Feather color={passed ? Colors.success : Colors.textFaint} name={passed ? 'check-circle' : 'x-circle'} size={14} />
                        <Text allowFontScaling={false} style={styles.ruleText}>{label}</Text>
                      </View>
                    ))}
                  </View>
                </GradientCard>

                {error ? <Text allowFontScaling={false} style={styles.errorText}>{error}</Text> : null}

                <OrangeButton disabled={!canContinue} label="Continue" onPress={onContinueFromSecure} size="lg" />
                <OrangeButton label="Back" onPress={() => setStep('generate')} size="md" variant="ghost" />
              </View>
            ) : null}

            {step === 'write' ? (
              <View style={styles.centerSection}>
                <Text allowFontScaling={false} style={styles.title}>Tap Your NFC Card</Text>
                <Text allowFontScaling={false} style={styles.subtitleCentered}>
                  Hold your card to the back of your phone to write your secure key fragment.
                </Text>
                <View style={styles.nfcWrap}>
                  <NFCRingAnimation state="scanning" />
                </View>

                <GradientCard style={styles.warningCard}>
                  <Text allowFontScaling={false} style={styles.warningText}>
                    ⚠ Keep your card safe. Anyone with your card and password can access your wallet.
                  </Text>
                </GradientCard>

                {submitting ? <ActivityIndicator color={Colors.brandOrange} size="small" /> : null}
                {error ? <Text allowFontScaling={false} style={styles.errorText}>{error}</Text> : null}
              </View>
            ) : null}

            {step === 'done' ? (
              <View style={styles.centerSection}>
                <View style={styles.doneBadge}>
                  <Feather color={Colors.success} name="check" size={28} />
                </View>
                <Text allowFontScaling={false} style={styles.title}>Wallet Ready!</Text>
                <GradientCard style={styles.addressCard}>
                  <Text allowFontScaling={false} style={styles.inputLabel}>ETH</Text>
                  <AddressChip address={addresses?.eth ?? 'Pending'} chain="ETH" />
                  <Text allowFontScaling={false} style={[styles.inputLabel, styles.addressLabel]}>SOL</Text>
                  <AddressChip address={addresses?.sol ?? 'Pending'} chain="SOL" />
                </GradientCard>
                <OrangeButton label="Let’s Go →" onPress={onSetupComplete} size="lg" />
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.deepDark,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
  },
  spinnerShell: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing['2xl'],
  },
  spinnerRing: {
    borderColor: Colors.brandOrange,
    borderRadius: Radius.full,
    borderWidth: 4,
    borderTopColor: Colors.orangeDim,
    height: 84,
    width: 84,
  },
  title: {
    ...Typography.displayTitle,
    color: Colors.offWhite,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  subtitleCentered: {
    ...Typography.body,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    maxWidth: 320,
    textAlign: 'center',
  },
  typingLine: {
    ...Typography.body,
    color: Colors.textFaint,
    marginBottom: Spacing.sm,
  },
  typingLineActive: {
    color: Colors.offWhite,
  },
  inputLabel: {
    ...Typography.overline,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  multilineInput: {
    ...Typography.mono,
    backgroundColor: Colors.borderSubtle,
    borderColor: Colors.borderMid,
    borderRadius: Radius.md,
    borderWidth: 1,
    color: Colors.offWhite,
    minHeight: 132,
    padding: Spacing.md,
    textAlignVertical: 'top',
  },
  input: {
    ...Typography.body,
    backgroundColor: Colors.borderSubtle,
    borderColor: Colors.borderMid,
    borderRadius: Radius.md,
    borderWidth: 1,
    color: Colors.offWhite,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  confirmLabel: {
    marginTop: Spacing.md,
  },
  strengthRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  strengthBar: {
    backgroundColor: Colors.borderMid,
    borderRadius: Radius.full,
    flex: 1,
    height: 8,
  },
  strengthLabel: {
    ...Typography.labelSm,
    marginTop: Spacing.sm,
  },
  ruleList: {
    marginTop: Spacing.md,
  },
  ruleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  ruleText: {
    ...Typography.bodySm,
    color: Colors.offWhite,
  },
  errorText: {
    ...Typography.bodySm,
    color: Colors.error,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  centerSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingTop: Spacing['2xl'],
  },
  nfcWrap: {
    marginVertical: Spacing.xl,
  },
  warningCard: {
    alignSelf: 'stretch',
    borderLeftColor: Colors.brandOrange,
    borderLeftWidth: 3,
    marginBottom: Spacing.lg,
  },
  warningText: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  doneBadge: {
    alignItems: 'center',
    borderColor: `${Colors.success}55`,
    borderRadius: Radius.full,
    borderWidth: 2,
    height: 76,
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    width: 76,
  },
  addressCard: {
    alignSelf: 'stretch',
    marginVertical: Spacing.lg,
  },
  addressLabel: {
    marginTop: Spacing.md,
  },
});
