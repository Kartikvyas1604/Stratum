import React, { useMemo, useState } from 'react';
import {
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
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionLabel } from '../components/SectionLabel';
import { theme } from '../constants/theme';
import { useWallet } from '../context/WalletContext';
import { ChainAsset } from '../types';

const ASSETS: ChainAsset[] = ['ETH', 'SOL', 'USDC_ETH', 'USDC_SOL'];

const ASSET_META: Record<ChainAsset, { color: string; network: string }> = {
  ETH: { color: '#627EEA', network: 'Ethereum' },
  SOL: { color: '#9945FF', network: 'Solana' },
  USDC_ETH: { color: '#2775CA', network: 'USDC · Ethereum' },
  USDC_SOL: { color: '#2775CA', network: 'USDC · Solana' },
};

export const PayScreen: React.FC = () => {
  const { sendPaymentFromOwnDevice } = useWallet();

  const [password, setPassword] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState<ChainAsset>('ETH');
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => !!(password && recipient && amount), [password, recipient, amount]);

  const submit = async () => {
    setLoading(true);
    try {
      const tx = await sendPaymentFromOwnDevice(password, { recipient, amount, asset });
      Alert.alert('Payment sent', `Transaction ${tx.txHash ?? 'submitted'} confirmed.`);
      setPassword('');
      setRecipient('');
      setAmount('');
    } catch (error) {
      Alert.alert('Payment failed', error instanceof Error ? error.message : 'Unable to send payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.kbv}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Send" subtitle="Tap your NFC card on this device when prompted." />

        <SectionLabel label="Asset" />
        <View style={styles.assetGrid}>
          {ASSETS.map((a) => (
            <Pressable
              key={a}
              onPress={() => setAsset(a)}
              style={[styles.assetChip, asset === a && styles.assetChipActive]}
            >
              <View style={[styles.assetDot, { backgroundColor: ASSET_META[a].color }]} />
              <View>
                <Text style={[styles.assetChipName, asset === a && styles.assetChipNameActive]}>
                  {a}
                </Text>
                <Text style={styles.assetChipNetwork}>{ASSET_META[a].network}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <SectionLabel label="Recipient" />
        <TextInput
          style={styles.input}
          value={recipient}
          onChangeText={setRecipient}
          placeholder="0x… or wallet address"
          placeholderTextColor={theme.colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <SectionLabel label="Amount" />
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="decimal-pad"
        />

        <SectionLabel label="Authorization" />
        <GlassCard>
          <TextInput
            style={[styles.input, styles.inputInCard]}
            value={password}
            onChangeText={setPassword}
            placeholder="Wallet password"
            placeholderTextColor={theme.colors.textSecondary}
            secureTextEntry
            autoCapitalize="none"
          />
          <Text style={styles.authHint}>
            📳  Your NFC card will be scanned after you tap Confirm.
          </Text>
        </GlassCard>

        <PrimaryButton
          title="Confirm & Broadcast"
          onPress={submit}
          loading={loading}
          disabled={!canSubmit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  kbv: { flex: 1, backgroundColor: theme.colors.background },
  container: { padding: theme.spacing.lg, paddingBottom: 40 },
  assetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  assetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
    width: '47%',
  },
  assetChipActive: {
    borderColor: theme.colors.accent,
    backgroundColor: 'rgba(42,230,215,0.08)',
  },
  assetDot: { width: 10, height: 10, borderRadius: 5 },
  assetChipName: { color: theme.colors.textSecondary, fontWeight: '700', fontSize: 14 },
  assetChipNameActive: { color: theme.colors.accent },
  assetChipNetwork: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 1 },
  input: {
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    color: theme.colors.textPrimary,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    fontSize: 15,
  },
  inputInCard: { marginBottom: theme.spacing.sm },
  authHint: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 },
});
