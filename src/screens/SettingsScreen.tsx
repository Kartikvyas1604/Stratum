import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionLabel } from '../components/SectionLabel';
import { theme } from '../constants/theme';
import { useWallet } from '../context/WalletContext';
import { truncateAddress } from '../utils/format';

export const SettingsScreen: React.FC = () => {
  const { addresses, logout } = useWallet();

  const onLostCardFlow = () => {
    Alert.alert(
      'Re-setup NFC Card',
      'Card-loss recovery requires identity verification, server-share escrow controls, and full key rotation. This feature is coming soon.',
    );
  };

  const onLogout = () => {
    Alert.alert(
      'Logout',
      'This will clear your local session. Your funds remain safe on-chain.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Settings" />

      <SectionLabel label="My Addresses" />
      <GlassCard>
        <View style={styles.addrRow}>
          <View style={styles.addrInfo}>
            <Text style={styles.addrChainLabel}>Ethereum</Text>
            <Text style={styles.addrValue} selectable>
              {truncateAddress(addresses?.eth ?? '—', 10, 6)}
            </Text>
          </View>
          <View style={[styles.chainBadge, styles.ethBadge]}>
            <Text style={[styles.chainBadgeText, styles.ethBadgeText]}>ETH</Text>
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.addrRow}>
          <View style={styles.addrInfo}>
            <Text style={styles.addrChainLabel}>Solana</Text>
            <Text style={styles.addrValue} selectable>
              {truncateAddress(addresses?.sol ?? '—', 10, 6)}
            </Text>
          </View>
          <View style={[styles.chainBadge, styles.solBadge]}>
            <Text style={[styles.chainBadgeText, styles.solBadgeText]}>SOL</Text>
          </View>
        </View>
      </GlassCard>

      <SectionLabel label="Security" />
      <GlassCard>
        <Pressable style={styles.settingsRow} onPress={onLostCardFlow}>
          <View>
            <Text style={styles.settingsRowTitle}>Re-setup NFC Card</Text>
            <Text style={styles.settingsRowDesc}>Replace or rotate your NFC card share</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </GlassCard>

      <SectionLabel label="Account" />
      <Pressable style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    paddingBottom: 40,
    backgroundColor: theme.colors.background,
  },
  addrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addrInfo: { flex: 1, marginRight: theme.spacing.sm },
  addrChainLabel: { color: theme.colors.textSecondary, fontSize: 12, marginBottom: 2 },
  addrValue: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '600' },
  chainBadge: {
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chainBadgeText: { fontWeight: '800', fontSize: 12 },
  ethBadge: { backgroundColor: 'rgba(98,126,234,0.15)' },
  ethBadgeText: { color: '#627EEA' },
  solBadge: { backgroundColor: 'rgba(153,69,255,0.15)' },
  solBadgeText: { color: '#9945FF' },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsRowTitle: { color: theme.colors.textPrimary, fontWeight: '600', fontSize: 15, marginBottom: 2 },
  settingsRowDesc: { color: theme.colors.textSecondary, fontSize: 12 },
  chevron: { color: theme.colors.textSecondary, fontSize: 24, lineHeight: 28 },
  logoutBtn: {
    backgroundColor: 'rgba(244,91,105,0.12)',
    borderWidth: 1.5,
    borderColor: theme.colors.danger,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: theme.colors.danger, fontWeight: '800', fontSize: 16 },
});
