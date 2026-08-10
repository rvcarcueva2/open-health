import { getHouseholdMembers } from '@/src/db/householdMemberRepository';
import { getResourceById } from '@/src/db/resourceRepository';
import { FHIRGroup, HEALTH_INDICATOR_CONFIG, HouseholdMember } from '@/src/models/Household';
import { extractAddressFromGroup, extractMembersFromGroup, extractStructuredAddressFromGroup } from '@/src/utils/householdMapper';
import { calculateAge } from '@/src/utils/validation';
import {
  borderRadius,
  colors,
  fonts,
  spacing,
  typography,
} from '@/styles/global';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HouseholdDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [household, setHousehold] = useState<FHIRGroup | null>(null);
  const [synced, setSynced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHousehold();
  }, [id]);

  // Reload household data when screen comes back into focus (e.g., after patient registration)
  useFocusEffect(
    useCallback(() => {
      loadHousehold();
    }, [id])
  );

  async function loadHousehold() {
    if (!id) return;
    try {
      const resource = await getResourceById(id);
      if (resource) {
        const data = typeof resource.data === 'string' ? JSON.parse(resource.data) : resource.data;
        setHousehold(data);
        setSynced(resource.synced === 1);
      }
    } catch (error) {
      console.error('Failed to load household:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadHousehold();
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

  if (!household) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Household</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.errorText}>Household not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { head, members } = extractMembersFromGroup(household);
  const address = extractAddressFromGroup(household);

  // Cross-reference with household_members table for patient linkage (source of truth)
  const storedMembers = getHouseholdMembers(id!);
  const memberPatientMap = new Map<string, string>();
  for (const sm of storedMembers) {
    if (sm.patientId) {
      memberPatientMap.set(sm.memberId, sm.patientId);
    }
  }

  // Enrich members with patientId from the linkage table
  const enrichedHead = head ? {
    ...head,
    isHead: true,
    patientId: head.patientId || memberPatientMap.get(head.id) || undefined,
  } : null;

  const enrichedMembers = members.map((m) => ({
    ...m,
    patientId: m.patientId || memberPatientMap.get(m.id) || undefined,
  }));

  const allMembers: (HouseholdMember & { isHead?: boolean })[] = [
    ...(enrichedHead ? [enrichedHead] : []),
    ...enrichedMembers,
  ];

  function handleMemberPress(member: HouseholdMember) {
    if (member.patientId) {
      // Navigate to patient profile
      router.push({ pathname: '/patient/[id]', params: { id: member.patientId } });
    } else {
      // Offer conversion to patient
      Alert.alert(
        'Register as Patient?',
        `${member.firstName} ${member.lastName} does not yet have a Patient record. Would you like to register them as a patient?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Register Patient',
            onPress: () => {
              // Extract structured address from household
              const addr = household ? extractStructuredAddressFromGroup(household) : null;

              router.push({
                pathname: '/register-patient',
                params: {
                  prefillFirstName: member.firstName,
                  prefillMiddleName: member.middleName,
                  prefillLastName: member.lastName,
                  prefillSex: member.sex,
                  prefillBirthDate: member.birthDate,
                  prefillRegionCode: addr?.regionCode || '',
                  prefillRegionDisplay: addr?.regionDisplay || '',
                  prefillProvinceCode: addr?.provinceCode || '',
                  prefillProvinceDisplay: addr?.provinceDisplay || '',
                  prefillCityCode: addr?.cityCode || '',
                  prefillCityDisplay: addr?.cityDisplay || '',
                  prefillBarangayCode: addr?.barangayCode || '',
                  prefillBarangayDisplay: addr?.barangayDisplay || '',
                  prefillHouseNumberStreet: addr?.houseNumberStreet || '',
                  fromHousehold: id,
                  memberId: member.id,
                },
              });
            },
          },
        ]
      );
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Household Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Household Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <FontAwesome6 name="house-medical" size={28} color={colors.primary} />
          </View>
          <Text style={styles.profileName}>{household.name}</Text>
          {household.identifier?.[0]?.value && (
            <Text style={styles.profileMeta}>#{household.identifier[0].value}</Text>
          )}
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

        {/* Address */}
        {address ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="location" size={18} color={colors.primary} />
                <Text style={styles.cardTitle}>Address</Text>
              </View>
            </View>
            <Text style={styles.addressText}>{address}</Text>
          </View>
        ) : null}

        {/* Members */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="people" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>
                Members ({allMembers.length})
              </Text>
            </View>
          </View>

          {allMembers.map((member, i) => {
            const isPatient = !!member.patientId;
            const name = [member.firstName, member.lastName].filter(Boolean).join(' ');
            const age = member.birthDate ? calculateAge(member.birthDate) : null;

            return (
              <TouchableOpacity
                key={member.id || i}
                style={styles.memberCard}
                onPress={() => handleMemberPress(member)}
                activeOpacity={0.7}
              >
                <View style={[styles.memberAvatar, member.isHead && styles.memberAvatarHead]}>
                  <Ionicons
                    name={member.isHead ? 'star' : 'person'}
                    size={16}
                    color={member.isHead ? colors.warning : colors.primary}
                  />
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{name}</Text>
                  <Text style={styles.memberMeta}>
                    {member.isHead ? 'Head' : member.relationship || 'Member'}
                    {member.sex ? ` • ${member.sex.charAt(0).toUpperCase() + member.sex.slice(1)}` : ''}
                    {age !== null ? ` • ${age} yrs` : ''}
                  </Text>
                </View>
                <View style={[styles.statusBadge, isPatient ? styles.statusPatient : styles.statusMember]}>
                  <Text style={[styles.statusText, isPatient ? styles.statusTextPatient : styles.statusTextMember]}>
                    {isPatient ? 'Patient' : 'Member'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Health Indicators */}
        {(() => {
          const healthIndicators = household.extension?.filter(
            (e) => e.url?.includes('/health-indicator/')
          ) ?? [];
          if (healthIndicators.length === 0) return null;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="pulse" size={18} color={colors.primary} />
                  <Text style={styles.cardTitle}>Health Indicators</Text>
                </View>
              </View>
              {healthIndicators.map((indicator, i) => {
                // Extract the key from the URL (e.g., ".../health-indicator/pregnantWomanPresent")
                const urlKey = indicator.url?.split('/').pop() || '';
                const config = HEALTH_INDICATOR_CONFIG.find((c) => c.key === urlKey);
                const icon = config?.icon || 'alert-circle';
                const color = config?.color || colors.warning;
                const iconLib = config?.iconLibrary;

                return (
                  <View key={i} style={styles.indicatorRow}>
                    <View style={[styles.indicatorIcon, { backgroundColor: color + '14' }]}>
                      {iconLib === 'fontawesome6' ? (
                        <FontAwesome6 name={icon} size={14} color={color} />
                      ) : (
                        <Ionicons name={icon as any} size={16} color={color} />
                      )}
                    </View>
                    <Text style={styles.indicatorText}>{indicator.valueString}</Text>
                  </View>
                );
              })}
            </View>
          );
        })()}
        {/* Characteristics */}
        {household.characteristic && household.characteristic.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="construct" size={18} color={colors.primary} />
                <Text style={styles.cardTitle}>Characteristics</Text>
              </View>
            </View>
            {household.characteristic.map((char, i) => {
              const label = char.code.coding[0]?.display || '';
              const value = char.valueBoolean !== undefined
                ? (char.valueBoolean ? 'Yes' : 'No')
                : char.valueCodeableConcept?.coding[0]?.display || '—';
              return (
                <View key={i} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{label}</Text>
                  <Text style={styles.infoValue}>{value}</Text>
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
  errorText: { ...typography.h3, color: colors.textSecondary },
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
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  headerTitle: { ...typography.h2 },
  contentContainer: { padding: spacing.xl, paddingBottom: spacing.xxxl },

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
  profileName: { ...typography.h3, marginBottom: spacing.xs },
  profileMeta: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
  },
  syncBadgeText: { ...typography.caption, fontFamily: fonts.medium },

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
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { ...typography.h3 },
  addressText: { ...typography.body, lineHeight: 22 },

  // Members
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  memberAvatarHead: { backgroundColor: colors.warningLight },
  memberInfo: { flex: 1 },
  memberName: { ...typography.body, fontFamily: fonts.medium },
  memberMeta: { ...typography.bodySmall, color: colors.textTertiary },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusPatient: { backgroundColor: colors.successLight },
  statusMember: { backgroundColor: colors.background },
  statusText: { fontSize: 10, fontFamily: fonts.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusTextPatient: { color: colors.success },
  statusTextMember: { color: colors.textTertiary },

  // Info Rows
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  infoLabel: { ...typography.bodySmall, color: colors.textSecondary },
  infoValue: { ...typography.body, fontFamily: fonts.medium, textAlign: 'right', flex: 1, marginLeft: spacing.lg },

  // Health Indicators
  indicatorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  indicatorIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  indicatorText: { ...typography.body, flex: 1 },
});
