import { ColorScheme } from '../types';

// 基础颜色接口
export interface ColorPalette {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  onPrimary: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  tertiary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

// 浅色主题配色
export interface LightThemeColors extends ColorPalette {
  type: 'light';
}

// 深色主题配色
export interface DarkThemeColors extends ColorPalette {
  type: 'dark';
}

// 暖阳配色方案
const warmLight: LightThemeColors = {
  type: 'light',
  primary: '#FF8C42',
  primaryLight: '#FFB380',
  primaryDark: '#E67530',
  onPrimary: '#FFFFFF',
  secondary: '#FFD166',
  secondaryLight: '#FFE299',
  secondaryDark: '#E6B84D',
  tertiary: '#06D6A0',
  accent: '#EF476F',
  background: '#FFF9F5',
  surface: '#FFFFFF',
  surfaceVariant: '#FFF5EE',
  text: '#2D2D2D',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#E8E0D8',
  borderLight: '#F5F0EB',
  success: '#06D6A0',
  warning: '#FFD166',
  error: '#EF476F',
  info: '#118AB2',
};

const warmDark: DarkThemeColors = {
  type: 'dark',
  primary: '#FF8C42',
  primaryLight: '#FFB380',
  primaryDark: '#E67530',
  onPrimary: '#FFFFFF',
  secondary: '#FFD166',
  secondaryLight: '#FFE299',
  secondaryDark: '#E6B84D',
  tertiary: '#06D6A0',
  accent: '#EF476F',
  background: '#1A1410',
  surface: '#2D2520',
  surfaceVariant: '#3D3530',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textTertiary: '#808080',
  border: '#4D4540',
  borderLight: '#3D3530',
  success: '#06D6A0',
  warning: '#FFD166',
  error: '#EF476F',
  info: '#118AB2',
};

// 海洋配色方案
const oceanLight: LightThemeColors = {
  type: 'light',
  primary: '#0077B6',
  primaryLight: '#3399CC',
  primaryDark: '#005A8C',
  onPrimary: '#FFFFFF',
  secondary: '#00B4D8',
  secondaryLight: '#33C3E8',
  secondaryDark: '#0091B3',
  tertiary: '#90E0EF',
  accent: '#90E0EF',
  background: '#F0F8FF',
  surface: '#FFFFFF',
  surfaceVariant: '#E6F3FF',
  text: '#1A1A2E',
  textSecondary: '#4A4A5E',
  textTertiary: '#8A8A9E',
  border: '#CCE0F5',
  borderLight: '#E6F0FA',
  success: '#06D6A0',
  warning: '#FFD166',
  error: '#EF476F',
  info: '#0077B6',
};

const oceanDark: DarkThemeColors = {
  type: 'dark',
  primary: '#00B4D8',
  primaryLight: '#33C3E8',
  primaryDark: '#0091B3',
  onPrimary: '#FFFFFF',
  secondary: '#90E0EF',
  secondaryLight: '#B3EBF5',
  secondaryDark: '#66D4E3',
  tertiary: '#CAF0F8',
  accent: '#CAF0F8',
  background: '#0A1628',
  surface: '#1A2A3E',
  surfaceVariant: '#2A3A4E',
  text: '#FFFFFF',
  textSecondary: '#B3C5D6',
  textTertiary: '#7A8A9A',
  border: '#3A4A5E',
  borderLight: '#2A3A4E',
  success: '#06D6A0',
  warning: '#FFD166',
  error: '#EF476F',
  info: '#00B4D8',
};

// 森林配色方案
const forestLight: LightThemeColors = {
  type: 'light',
  primary: '#2D6A4F',
  primaryLight: '#528B73',
  primaryDark: '#1B4D36',
  onPrimary: '#FFFFFF',
  secondary: '#40916C',
  secondaryLight: '#66AE8C',
  secondaryDark: '#2D7356',
  tertiary: '#95D5B2',
  accent: '#95D5B2',
  background: '#F5FAF7',
  surface: '#FFFFFF',
  surfaceVariant: '#E8F5EE',
  text: '#1B2E23',
  textSecondary: '#4A5E52',
  textTertiary: '#8A9E92',
  border: '#C8E0D4',
  borderLight: '#E2F0E8',
  success: '#2D6A4F',
  warning: '#FFD166',
  error: '#EF476F',
  info: '#118AB2',
};

const forestDark: DarkThemeColors = {
  type: 'dark',
  primary: '#40916C',
  primaryLight: '#66AE8C',
  primaryDark: '#2D7356',
  onPrimary: '#FFFFFF',
  secondary: '#95D5B2',
  secondaryLight: '#B3E5C8',
  secondaryDark: '#73C59A',
  tertiary: '#B7E4C7',
  accent: '#B7E4C7',
  background: '#0D1F16',
  surface: '#1A2F22',
  surfaceVariant: '#2A3F32',
  text: '#FFFFFF',
  textSecondary: '#B3CDB8',
  textTertiary: '#7A9A82',
  border: '#3A5F42',
  borderLight: '#2A4F32',
  success: '#40916C',
  warning: '#FFD166',
  error: '#EF476F',
  info: '#118AB2',
};

// 玫瑰配色方案
const roseLight: LightThemeColors = {
  type: 'light',
  primary: '#E63946',
  primaryLight: '#F06B76',
  primaryDark: '#C22D38',
  onPrimary: '#FFFFFF',
  secondary: '#F4A261',
  secondaryLight: '#F7BA82',
  secondaryDark: '#E08B40',
  tertiary: '#E9C46A',
  accent: '#E9C46A',
  background: '#FFF5F5',
  surface: '#FFFFFF',
  surfaceVariant: '#FFE8E8',
  text: '#2D2D2D',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#F0C8C8',
  borderLight: '#F8E4E4',
  success: '#06D6A0',
  warning: '#F4A261',
  error: '#E63946',
  info: '#118AB2',
};

const roseDark: DarkThemeColors = {
  type: 'dark',
  primary: '#F06B76',
  primaryLight: '#F4929A',
  primaryDark: '#E63946',
  onPrimary: '#FFFFFF',
  secondary: '#F4A261',
  secondaryLight: '#F7BA82',
  secondaryDark: '#E08B40',
  tertiary: '#E9C46A',
  accent: '#E9C46A',
  background: '#1F0A0A',
  surface: '#2F1A1A',
  surfaceVariant: '#3F2A2A',
  text: '#FFFFFF',
  textSecondary: '#D9B3B3',
  textTertiary: '#A08080',
  border: '#5F3A3A',
  borderLight: '#4F2A2A',
  success: '#06D6A0',
  warning: '#F4A261',
  error: '#F06B76',
  info: '#118AB2',
};

// 暮光配色方案
const twilightLight: LightThemeColors = {
  type: 'light',
  primary: '#7B2CBF',
  primaryLight: '#9D4EDD',
  primaryDark: '#5A189A',
  onPrimary: '#FFFFFF',
  secondary: '#C77DFF',
  secondaryLight: '#D9A5FF',
  secondaryDark: '#B055E0',
  tertiary: '#E0AAFF',
  accent: '#E0AAFF',
  background: '#FAF5FF',
  surface: '#FFFFFF',
  surfaceVariant: '#F3E8FF',
  text: '#2D2D3D',
  textSecondary: '#5A5A6A',
  textTertiary: '#9A9AAA',
  border: '#D8C0E8',
  borderLight: '#EDE0F5',
  success: '#06D6A0',
  warning: '#FFD166',
  error: '#EF476F',
  info: '#118AB2',
};

const twilightDark: DarkThemeColors = {
  type: 'dark',
  primary: '#C77DFF',
  primaryLight: '#D9A5FF',
  primaryDark: '#B055E0',
  onPrimary: '#FFFFFF',
  secondary: '#9D4EDD',
  secondaryLight: '#B873E8',
  secondaryDark: '#7B2CBF',
  tertiary: '#E0AAFF',
  accent: '#E0AAFF',
  background: '#140F1F',
  surface: '#241A34',
  surfaceVariant: '#342A44',
  text: '#FFFFFF',
  textSecondary: '#C8B8D8',
  textTertiary: '#9888A8',
  border: '#4A3A5A',
  borderLight: '#3A2A4A',
  success: '#06D6A0',
  warning: '#FFD166',
  error: '#EF476F',
  info: '#118AB2',
};

// 配色方案映射
export const colorSchemes: Record<ColorScheme, { light: LightThemeColors; dark: DarkThemeColors }> = {
  warm: { light: warmLight, dark: warmDark },
  ocean: { light: oceanLight, dark: oceanDark },
  forest: { light: forestLight, dark: forestDark },
  rose: { light: roseLight, dark: roseDark },
  twilight: { light: twilightLight, dark: twilightDark },
};

// 获取指定配色方案的颜色
export function getColors(colorScheme: ColorScheme, isDark: boolean): ColorPalette {
  const scheme = colorSchemes[colorScheme];
  return isDark ? scheme.dark : scheme.light;
}

// 导出默认颜色
export const defaultColors = warmLight;