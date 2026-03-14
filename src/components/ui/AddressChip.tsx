import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Feather from 'react-native-vector-icons/Feather';
import { Colors, Radius, Spacing } from '../../theme/colors';
import { Typography } from '../../theme/typography';

type AddressChipProps = {
  address: string;
  chain: 'ETH' | 'SOL';
  onCopy?: () => void;
  style?: StyleProp<ViewStyle>;
};

const CHAIN_META = {
  ETH: {
    label: 'ETH',
    icon: 'hexagon',
    tint: Colors.brandOrange,
  },
  SOL: {
    label: 'SOL',
    icon: 'triangle',
    tint: Colors.success,
  },
} as const;

const truncateAddress = (value: string) => {
  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

export const AddressChip: React.FC<AddressChipProps> = ({
  address,
  chain,
  onCopy,
  style,
}) => {
  const [copied, setCopied] = useState(false);
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const chipScale = useRef(new Animated.Value(1)).current;

  const meta = CHAIN_META[chain];
  const truncated = useMemo(() => truncateAddress(address), [address]);

  const animateScale = (toValue: number) => {
    Animated.timing(chipScale, {
      toValue,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const flashCopied = () => {
    feedbackOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(feedbackOpacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.delay(700),
      Animated.timing(feedbackOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => setCopied(false));
  };

  const handleCopy = () => {
    Clipboard.setString(address);
    onCopy?.();
    setCopied(true);
    flashCopied();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: chipScale }] }, style]}>
      <Pressable
        accessibilityRole="button"
        onPress={handleCopy}
        onPressIn={() => animateScale(0.97)}
        onPressOut={() => animateScale(1)}
        style={styles.container}
      >
        <View style={[styles.chainBadge, { backgroundColor: `${meta.tint}22` }]}> 
          <Feather color={meta.tint} name={meta.icon} size={12} />
        </View>

        <Text allowFontScaling={false} numberOfLines={1} style={styles.addressText}>
          {truncated}
        </Text>

        <View style={styles.copyArea}>
          <Feather color={Colors.textMuted} name="copy" size={14} />
          <Animated.View pointerEvents="none" style={[styles.feedbackPill, { opacity: feedbackOpacity }]}> 
            <Text allowFontScaling={false} style={styles.feedbackText}>
              {copied ? 'Copied!' : ''}
            </Text>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.borderSubtle,
    borderColor: Colors.borderMid,
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    maxWidth: '100%',
    minHeight: 36,
    minWidth: 0,
    overflow: 'hidden',
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.md - 2,
    paddingVertical: Spacing.sm - 2,
  },
  chainBadge: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  addressText: {
    ...Typography.monoSm,
    color: Colors.offWhite,
    flexShrink: 1,
    maxWidth: 180,
    minWidth: 0,
  },
  copyArea: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    minWidth: 18,
    position: 'relative',
  },
  feedbackPill: {
    backgroundColor: Colors.orangeDim,
    borderColor: Colors.orangeMid,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    position: 'absolute',
    right: -2,
    top: -26,
  },
  feedbackText: {
    ...Typography.labelXs,
    color: Colors.brandOrange,
    letterSpacing: 0.3,
  },
});