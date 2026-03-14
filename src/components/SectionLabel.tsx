import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { theme } from '../constants/theme';

export const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <Text style={styles.label}>{label.toUpperCase()}</Text>
);

const styles = StyleSheet.create({
  label: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
});
