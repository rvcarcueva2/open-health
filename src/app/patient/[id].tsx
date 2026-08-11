import { getResourceById } from '@/src/db/resourceRepository';
import { getLatestVitalSigns } from '@/src/fhir/observationService';
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
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ProfileTab = 'personal' | 'health';

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [patient, setPatient] = useState<FHIRPatient | null>(null);
  const [synced, setSynced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');

  const [latestVitals, setLatestVitals] = useState<ReturnType<typeof getLatestVitalSigns>>(null);

  useEffect(() => {
    loadPatient();
  }, [id]);

  const loadPatient = useCallback(async () => {
    if (!id) return;
    try {
      const resource = await getResourceById(id);
      if (resource) {
        const data = typeof resource.data === 'string' ? JSON.parse(resource.data) : resource.data;
        setPatient(data);
        setSynced(resource.synced === 1);
      }
      // Load latest vital signs
      const vitals = getLatestVitalSigns(id);
      setLatestVitals(vitals);
    } catch (error) {
      console.error('Failed to load patient:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

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
    ? `${name.given?.[0] ?? ''} ${name.given?.[1] ? `${name.given[1].charAt(0)}. ` : ''}${name.family ?? ''}`.trim()
    : 'Unknown';
  const firstName = name?.given?.[0] ?? '';
  const middleName = name?.given?.[1] ?? '';
  const lastName = name?.family ?? '';
  const gender = patient.gender ?? '—';
  const birthDate = patient.birthDate ?? '—';
  const age = patient.birthDate ? calculateAge(patient.birthDate) : null;
  const isFemale = patient.gender === 'female';

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

  function formatDate(isoString: string | null | undefined) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

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
          <View style={styles.profileMetaRow}>
              <Text style={styles.profileMeta}>{id}</Text>
          </View>
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

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'personal' && styles.tabButtonActive]}
            onPress={() => setActiveTab('personal')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'personal' && styles.tabTextActive]}>
              Personal Info
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'health' && styles.tabButtonActive]}
            onPress={() => setActiveTab('health')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'health' && styles.tabTextActive]}>
              Health Records
            </Text>
          </TouchableOpacity>
        </View>

        {/* Personal Info Tab */}
        {activeTab === 'personal' && (
          <>
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
              <InfoRow label="Resource Type" value={patient.resourceType} />
              <InfoRow
                label="Profile"
                value={patient.meta?.profile?.[0]?.split('/').pop() ?? '—'}
              />
              <InfoRow label="Active" value={patient.active ? 'Yes' : 'No'} />
            </View>
          </>
        )}

        {/* Health Records Tab */}
        {activeTab === 'health' && (
          <>
            {/* Vital Signs Section */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="heart" size={18} color={colors.primary} />
                  <Text style={styles.cardTitle}>Vital Signs</Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/patient/[id]/vital-signs-history', params: { id: id! } })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewHistoryLink}>View History</Text>
                </TouchableOpacity>
              </View>

              {latestVitals ? (
                <View>
                  {latestVitals.systolic != null && latestVitals.diastolic != null && (
                    <VitalRow
                      icon="fitness"
                      label="Blood Pressure"
                      value={`${latestVitals.systolic}/${latestVitals.diastolic} mmHg`}
                    />
                  )}
                  {latestVitals.temperature != null && (
                    <VitalRow
                      icon="thermometer"
                      label="Temperature"
                      value={`${latestVitals.temperature} °C`}
                    />
                  )}
                  {latestVitals.heartRate != null && (
                    <VitalRow
                      icon="pulse"
                      label="Heart Rate"
                      value={`${latestVitals.heartRate} bpm`}
                    />
                  )}
                  {latestVitals.respiratoryRate != null && (
                    <VitalRow
                      icon="cloud-outline"
                      label="Respiratory Rate"
                      value={`${latestVitals.respiratoryRate} breaths/min`}
                    />
                  )}
                  {latestVitals.weight != null && (
                    <VitalRow
                      icon="scale-outline"
                      label="Weight"
                      value={`${latestVitals.weight} kg`}
                    />
                  )}
                  {latestVitals.height != null && (
                    <VitalRow
                      icon="resize-outline"
                      label="Height"
                      value={`${latestVitals.height} cm`}
                    />
                  )}
                  {latestVitals.oxygenSaturation != null && (
                    <VitalRow
                      icon="water-outline"
                      label="SpO₂"
                      value={`${latestVitals.oxygenSaturation}%`}
                    />
                  )}
                  <Text style={styles.recordedDate}>
                    Recorded: {formatDate(latestVitals.recordedAt)}
                  </Text>
                </View>
              ) : (
                <Text style={styles.noDataText}>No vital signs recorded</Text>
              )}
            </View>

            {/* Immunizations Section */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
                  <Text style={styles.cardTitle}>Immunizations</Text>
                </View>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.viewHistoryLink}>View History</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.noDataText}>No immunizations recorded</Text>
            </View>

            {/* Medications Section */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="medkit" size={18} color={colors.primary} />
                  <Text style={styles.cardTitle}>Medications</Text>
                </View>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.viewHistoryLink}>View History</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.noDataText}>No medications recorded</Text>
            </View>

            {/* Prenatal Visits (female only) */}
            {isFemale && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Ionicons name="woman" size={18} color={colors.primary} />
                    <Text style={styles.cardTitle}>Prenatal Visits</Text>
                  </View>
                  <TouchableOpacity activeOpacity={0.7}>
                    <Text style={styles.viewHistoryLink}>View History</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.noDataText}>No prenatal visits recorded</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function VitalRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.vitalRow}>
      <View style={styles.vitalLeft}>
        <Ionicons name={icon as any} size={16} color={colors.primary} />
        <Text style={styles.vitalLabel}>{label}</Text>
      </View>
      <Text style={styles.vitalValue}>{value}</Text>
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
    paddingBottom: spacing.xxxl * 2,
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
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  profileMetaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  profileMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
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

  // Tab Switcher
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
  },
  tabButtonActive: {
    backgroundColor: colors.primaryLight,
  },
  tabText: {
    ...typography.body,
    color: colors.textTertiary,
    fontFamily: fonts.medium,
  },
  tabTextActive: {
    color: colors.primary,
    fontFamily: fonts.semiBold,
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
  viewHistoryLink: {
    ...typography.bodySmall,
    color: colors.primary,
    fontFamily: fonts.medium,
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

  // Vital Signs
  vitalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  vitalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  vitalLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  vitalValue: {
    ...typography.body,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  recordedDate: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },

  // Address & No Data
  addressText: {
    ...typography.body,
    lineHeight: 22,
  },
  noDataText: {
    ...typography.body,
    color: colors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
