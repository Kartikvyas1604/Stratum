import React from 'react';
import Svg, { Path } from 'react-native-svg';

export type TabIconName = 'wallet' | 'pay' | 'receive' | 'settings';

interface TabIconProps {
  name: TabIconName;
  color: string;
  size?: number;
}

const iconPaths: Record<TabIconName, string> = {
  wallet:
    'M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z',
  pay: 'M2.01 21L23 12 2.01 3 2 10l15 2-15 2z',
  receive: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
  settings:
    'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z',
};

export const TabIcon: React.FC<TabIconProps> = ({ name, color, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d={iconPaths[name]} fill={color} />
  </Svg>
);
