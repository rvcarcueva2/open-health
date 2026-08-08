import { StyleSheet } from 'react-native';

export const colors = {
  // Primary palette - healthcare blue
  primary: '#1a57ad',
  primaryDark: '#0d3b7a',
  primaryLight: '#e8f0fe',

  // Backgrounds
  background: '#f5f7fa',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',

  // Text
  text: '#1a1a2e',
  textSecondary: '#5a6178',
  textTertiary: '#8e95a9',
  textOnPrimary: '#ffffff',

  // Status
  success: '#2e7d5b',
  successLight: '#e6f5ee',
  warning: '#d4820f',
  warningLight: '#fef3e2',
  error: '#c62828',
  errorLight: '#fdeaea',
  info: '#1565c0',
  infoLight: '#e3f2fd',

  // Sync status
  online: '#2e7d5b',
  offline: '#9e9e9e',
  syncing: '#f57c00',

  // Borders & Dividers
  border: '#e8eaef',
  divider: '#f0f1f4',

  // Cards
  cardShadow: 'rgba(0, 0, 0, 0.06)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const fonts = {
  light: 'Geist-Light',
  regular: 'Geist-Regular',
  medium: 'Geist-Medium',
  semiBold: 'Geist-SemiBold',
  bold: 'Geist-Bold',
};

export const typography = {
  h1: {
    fontSize: 26,
    fontFamily: fonts.bold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 20,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  h3: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  body: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  bodySmall: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textTertiary,
    letterSpacing: 0.3,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h2,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  empty: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
