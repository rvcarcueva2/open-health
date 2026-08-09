import { getResourceById } from '@/src/db/resourceRepository';
import { FHIRPatient } from '@/src/models/Patient';
import { calculateAge } from '@/src/utils/validation';
import {
    borderRadius,
    colors,
    fonts,
    spacing,
    typography,
} from '@/styles/global';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [patient, setPatient] = useState<FHIRPatient | null>(null);
  const [synced, setSynced] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatient();
  }, [id]);

  async function loadPatient() {
    if (!id) return;
    try {
      const resource = await getResourceById(id);
      if (resource) {
        const data = typeof resource.data === 'string' ? JSON.parse(resource.data) : resource.data;
        setPatient(data);
        setSynced(resource.synced === 1);
      }
    } catch (error) {
      console.error('Failed to load patient:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!patient) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Patient</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.errorText}>Patient not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const name = patient.name?.[0];
  const fullName = name
    ? `${name.given?.join(' ') ?? ''} ${name.family ?? ''}`.trim()
    : 'Unknown';
  const firstName = name?.given?.[0] ?? '';
  const middleName = name?.given?.[1] ?? '';
  const lastName = name?.family ?? '';
  const gender = patient.gender ?? '—';
  const birthDate = patient.birthDate ?? '—';
  const age = patient.birthDate ? calculateAge(patient.birthDate) : null;

  // Identifiers
  const philHealth = patient.identifier?.find((i) =>
    i.system?.includes('philhealth')
  )?.value;
  const philSys = patient.identifier?.find((i) =>
    i.system?.includes('philsys')
  )?.value;
  const localRecord = patient.identifier?.find(
    (i) => !i.system?.includes('philhealth') && !i.system?.includes('philsys')
  )?.value;

  // Contact
  const phone = patient.telecom?.find((t) => t.system === 'phone')?.value;
  const email = patient.telecom?.find((t) => t.system === 'email')?.value;

  // Address
  const address = patient.address?.[0];
  const addressText = address?.text;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patient Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Patient Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Ionicons name="person" size={32} color={colors.primary} />
          </View>
          <Text style={styles.profileName}>{fullName}</Text>
          <Text style={styles.profileMeta}>
            {gender.charAt(0).toUpperCase() + gender.slice(1)}
            {age !== null ? ` • ${age} years old` : ''}
          </Text>
          <View style={styles.syncBadge}>
            <Ionicons
              name={synced ? 'cloud-done' : 'cloud-upload-outline'}
              size={14}
              color={synced ? colors.success : colors.warning}
            />
            <Text style={[styles.syncBadgeText, { color: synced ? colors.success : colors.warning }]}>
              {synced ? 'Synced' : 'Pending Sync'}
            </Text>
          </View>
        </View>

        {/* Demographics */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="person" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Demographics</Text>
            </View>
          </View>

          <InfoRow label="First Name" value={firstName} />
          <InfoRow label="Middle Name" value={middleName || '—'} />
          <InfoRow label="Last Name" value={lastName} />
          <InfoRow label="Sex" value={gender.charAt(0).toUpperCase() + gender.slice(1)} />
          <InfoRow label="Birth Date" value={birthDate} />
          {age !== null && <InfoRow label="Age" value={`${age} years old`} />}
        </View>

        {/* Identifiers */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="card" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Identifiers</Text>
            </View>
          </View>

          <InfoRow label="PhilHealth" value={philHealth || '—'} />
          <InfoRow label="PhilSys ID" value={philSys || '—'} />
          <InfoRow label="Local Record #" value={localRecord || '—'} />
        </View>

        {/* Contact */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="call" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Contact</Text>
            </View>
          </View>

          <InfoRow label="Mobile" value={phone || '—'} />
          <InfoRow label="Email" value={email || '—'} />
        </View>

        {/* Address */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="location" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Address</Text>
            </View>
          </View>

          {addressText ? (
            <Text style={styles.addressText}>{addressText}</Text>
          ) : (
            <Text style={styles.noDataText}>No address provided</Text>
          )}
        </View>

        {/* FHIR Resource Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="code-slash" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Resource Info</Text>
            </View>
          </View>

          <InfoRow label="Resource ID" value={patient.id} small />
          <InfoRow label="Resource Type" value={patient.resourceType} />
          <InfoRow
            label="Profile"
            value={patient.meta?.profile?.[0]?.split('/').pop() ?? '—'}
          />
          <InfoRow label="Active" value={patient.active ? 'Yes' : 'No'} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, small && styles.infoValueSmall]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  errorText: {
    ...typography.h3,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    ...typography.h2,
  },
  contentContainer: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },

  // Profile Card
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  profileName: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  profileMeta: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
  },
  syncBadgeText: {
    ...typography.caption,
    fontFamily: fonts.medium,
  },

  // Cards
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.h3,
  },

  // Info Rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.body,
    fontFamily: fonts.medium,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.lg,
  },
  infoValueSmall: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },

  // Address
  addressText: {
    ...typography.body,
    lineHeight: 22,
  },
  noDataText: {
    ...typography.body,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
});
