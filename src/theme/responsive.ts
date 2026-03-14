import { useWindowDimensions } from 'react-native';
import { Spacing } from './colors';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const useResponsiveLayout = () => {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isCompact = width < 390;
  const isVeryCompact = width < 360;
  const isShort = height < 760;
  const horizontalPadding = isTablet ? Spacing['2xl'] : isVeryCompact ? Spacing.md : Spacing.lg;

  return {
    width,
    height,
    isTablet,
    isCompact,
    isVeryCompact,
    isShort,
    horizontalPadding,
    contentMaxWidth: isTablet ? 720 : width,
    modalActionsVertical: width < 430,
    clamp,
  };
};