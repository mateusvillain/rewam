export const colors = {
  background: '#0B0B0F',
  surface: '#15151C',
  border: '#26262F',
  text: '#F5F5F7',
  textMuted: '#A0A0AC',
  accent: '#E4572E',
  accentText: '#FFFFFF',
  success: '#3DA35D',
  danger: '#D64545',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
} as const;

export type Colors = typeof colors;
export type Spacing = typeof spacing;
