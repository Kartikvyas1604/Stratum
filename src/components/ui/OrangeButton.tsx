import React, { useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '../../theme/colors';
import { Typography } from '../../theme/typography';

type OrangeButtonSize = 'sm' | 'md' | 'lg';
type OrangeButtonVariant = 'solid' | 'outline' | 'ghost';

type OrangeButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  size?: OrangeButtonSize;
  variant?: OrangeButtonVariant;
  style?: StyleProp<ViewStyle>;
};

const SIZE_MAP: Record<OrangeButtonSize, { container: ViewStyle; label: object }> = {
  sm: {
    container: {
      minHeight: 40,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm + 2,
    },
    label: Typography.buttonSm,
  },
  md: {
    container: {
      minHeight: 48,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm + 4,
    },
    label: Typography.buttonMd,
  },
  lg: {
    container: {
      minHeight: 56,
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.md,
    },
    label: Typography.buttonLg,
  },
};

export const OrangeButton: React.FC<OrangeButtonProps> = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  size = 'md',
  variant = 'solid',
  style,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const animateTo = (toValue: number) => {
    Animated.timing(scale, {
      toValue,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const variantStyle = useMemo(() => {
    switch (variant) {
      case 'outline':
        return {
          container: styles.outlineButton,
          label: styles.outlineLabel,
          spinner: Colors.brandOrange,
        };
      case 'ghost':
        return {
          container: styles.ghostButton,
          label: styles.ghostLabel,
          spinner: Colors.brandOrange,
        };
      case 'solid':
      default:
        return {
          container: styles.solidButton,
          label: styles.solidLabel,
          spinner: Colors.offWhite,
        };
    }
  }, [variant]);

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale }] }, style, isDisabled && styles.disabled]}>
      <Pressable
        accessibilityRole="button"
        disabled={isDisabled}
        onPress={onPress}
        onPressIn={() => animateTo(0.96)}
        onPressOut={() => animateTo(1)}
        style={[styles.baseButton, SIZE_MAP[size].container, variantStyle.container]}
      >
        {loading ? (
          <ActivityIndicator color={variantStyle.spinner} />
        ) : (
          <Text allowFontScaling={false} style={[styles.labelBase, SIZE_MAP[size].label, variantStyle.label]}>
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radius.full,
  },
  baseButton: {
    alignItems: 'center',
    borderRadius: Radius.full,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  solidButton: {
    backgroundColor: Colors.brandOrange,
    borderWidth: 1,
    borderColor: Colors.brandOrange,
    ...Shadows.orangeGlow,
  },
  outlineButton: {
    backgroundColor: Colors.transparent,
    borderWidth: 1.5,
    borderColor: Colors.brandOrange,
  },
  ghostButton: {
    backgroundColor: Colors.transparent,
    borderWidth: 1,
    borderColor: Colors.transparent,
  },
  disabled: {
    opacity: 0.4,
  },
  labelBase: {
    textAlign: 'center',
  },
  solidLabel: {
    color: Colors.offWhite,
  },
  outlineLabel: {
    color: Colors.brandOrange,
  },
  ghostLabel: {
    color: Colors.brandOrange,
  },
});