import { useTabBarScroll } from '@/src/components/ScrollContext';
import {
    borderRadius,
    colors,
    fonts,
    globalStyles,
    spacing,
    typography
} from '@/styles/global';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SettingsItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
  danger?: boolean;
}

function SettingsItem({ icon, label, subtitle, onPress, showChevron = true, danger }: SettingsItemProps) {
  return (
    <TouchableOpacity style={styles.settingsItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.settingsIcon, danger && { backgroundColor: colors.errorLight }]}>
        <Ionicons name={icon} size={20} color={danger ? colors.error : colors.primary} />
      </View>
      <View style={styles.settingsContent}>
        <Text style={[styles.settingsLabel, danger && { color: colors.error }]}>{label}</Text>
        {subtitle && <Text style={styles.settingsSubtitle}>{subtitle}</Text>}
      </View>
      {showChevron && (
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { onScroll } = useTabBarScroll();

  return (
    <SafeAreaView style={globalStyles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <Text style={styles.title}>Settings</Text>

        {/* Profile Section */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={28} color={colors.primary} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Maria Santos, RN</Text>
            <Text style={styles.profileRole}>Community Health Worker</Text>
            <Text style={styles.profileFacility}>Brgy. Health Station - Barangay 12</Text>
          </View>
        </View>

        {/* General */}
        <Text style={styles.sectionLabel}>General</Text>
        <View style={styles.settingsGroup}>
          <SettingsItem
            icon="person-circle"
            label="Profile"
            subtitle="Edit your profile information"
          />
          <SettingsItem
            icon="notifications"
            label="Notifications"
            subtitle="Manage alerts and reminders"
          />
          <SettingsItem
            icon="language"
            label="Language"
            subtitle="English (Philippines)"
          />
        </View>

        {/* Data & Sync */}
        <Text style={styles.sectionLabel}>Data & Synchronization</Text>
        <View style={styles.settingsGroup}>
          <SettingsItem
            icon="cloud-upload"
            label="Sync Settings"
            subtitle="Configure auto-sync behavior"
          />
          <SettingsItem
            icon="server"
            label="FHIR Server"
            subtitle="192.168.254.167:8082"
          />
          <SettingsItem
            icon="download"
            label="Export Data"
            subtitle="Export local database"
          />
        </View>

        {/* About */}
        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.settingsGroup}>
          <SettingsItem
            icon="information-circle"
            label="About Open Health"
            subtitle="Version 1.0.0"
          />
          <SettingsItem
            icon="document-text"
            label="Terms & Privacy"
          />
          <SettingsItem
            icon="log-out"
            label="Sign Out"
            danger
            showChevron={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  title: {
    ...typography.h1,
    paddingVertical: spacing.lg,
  },

  // Profile
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.h3,
    marginBottom: 2,
  },
  profileRole: {
    ...typography.body,
    color: colors.textSecondary,
  },
  profileFacility: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: 2,
  },

  // Section Label
  sectionLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    marginLeft: spacing.xs,
  },

  // Settings Group
  settingsGroup: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  settingsContent: {
    flex: 1,
  },
  settingsLabel: {
    ...typography.body,
    fontFamily: fonts.semiBold,
  },
  settingsSubtitle: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: 1,
  },
});
