import {
    HEALTH_INDICATOR_CONFIG,
    HouseholdFormData,
    TOILET_FACILITY_OPTIONS,
    WASTE_DISPOSAL_OPTIONS,
    WATER_SOURCE_OPTIONS
} from '@/src/models/Household';
import { calculateAge } from '@/src/utils/validation';
import {
    borderRadius,
    colors,
    fonts,
    spacing,
    typography,
} from '@/styles/global';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface Props {
  formData: HouseholdFormData;
  goToStep: (step: number) => void;
}

export function StepHouseholdReview({ formData, goToStep }: Props) {
  const head = formData.headOfHousehold;
  const headName = [head.firstName, head.middleName, head.lastName].filter(Boolean).join(' ');
  const headAge = head.birthDate ? calculateAge(head.birthDate) : null;

  const addressParts = [
    formData.houseNumber,
    formData.streetAddress,
    formData.barangayDisplay,
    formData.cityDisplay,
    formData.provinceDisplay,
    formData.regionDisplay,
  ].filter(Boolean);

  const chars = formData.characteristics;
  const indicators = formData.healthIndicators;
  const activeIndicators = HEALTH_INDICATOR_CONFIG.filter((cfg) => indicators[cfg.key]);

  function getOptionLabel(options: Array<{ value: string; label: string }>, value: string) {
    return options.find((o) => o.value === value)?.label || value || '—';
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionTitle}>Review & Confirm</Text>
      <Text style={styles.sectionSubtitle}>
        Please review the household information before saving
      </Text>

      {/* Household Info */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="home" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Household Info</Text>
          </View>
          <TouchableOpacity onPress={() => goToStep(0)} style={styles.editButton}>
            <Ionicons name="pencil" size={14} color={colors.primary} />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <ReviewRow label="Name" value={formData.householdName || '—'} />
        <ReviewRow label="Number" value={formData.householdNumber || '—'} />
        <ReviewRow label="Contact" value={formData.contactNumber || '—'} />
        <ReviewRow label="Registered" value={formData.registrationDate || '—'} />
      </View>

      {/* Address */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="location" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Address</Text>
          </View>
          <TouchableOpacity onPress={() => goToStep(1)} style={styles.editButton}>
            <Ionicons name="pencil" size={14} color={colors.primary} />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
        {addressParts.length > 0 ? (
          <Text style={styles.addressText}>{addressParts.join(', ')}</Text>
        ) : (
          <Text style={styles.noDataText}>No address provided</Text>
        )}
      </View>

      {/* Head of Household */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="star" size={18} color={colors.warning} />
            <Text style={styles.cardTitle}>Head of Household</Text>
          </View>
          <TouchableOpacity onPress={() => goToStep(2)} style={styles.editButton}>
            <Ionicons name="pencil" size={14} color={colors.primary} />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <ReviewRow label="Name" value={headName || '—'} />
        <ReviewRow label="Sex" value={head.sex ? head.sex.charAt(0).toUpperCase() + head.sex.slice(1) : '—'} />
        <ReviewRow label="Birth Date" value={head.birthDate || '—'} />
        {headAge !== null && <ReviewRow label="Age" value={`${headAge} years old`} />}
        <ReviewRow label="Contact" value={head.contactNumber || '—'} />
      </View>

      {/* Members */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="people" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Members ({formData.members.length})</Text>
          </View>
          <TouchableOpacity onPress={() => goToStep(3)} style={styles.editButton}>
            <Ionicons name="pencil" size={14} color={colors.primary} />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
        {formData.members.length > 0 ? (
          formData.members.map((member, i) => (
            <View key={member.id || i} style={styles.memberRow}>
              <View style={styles.memberDot} />
              <View style={styles.memberReviewInfo}>
                <Text style={styles.memberReviewName}>
                  {[member.firstName, member.lastName].filter(Boolean).join(' ')}
                </Text>
                <Text style={styles.memberReviewMeta}>
                  {member.relationship}{member.sex ? ` • ${member.sex}` : ''}{member.birthDate ? ` • ${member.birthDate}` : ''}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No additional members</Text>
        )}
      </View>

      {/* Characteristics */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="construct" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Characteristics</Text>
          </View>
          <TouchableOpacity onPress={() => goToStep(4)} style={styles.editButton}>
            <Ionicons name="pencil" size={14} color={colors.primary} />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <ReviewRow label="Water Source" value={getOptionLabel(WATER_SOURCE_OPTIONS, chars.waterSource)} />
        <ReviewRow label="Toilet" value={getOptionLabel(TOILET_FACILITY_OPTIONS, chars.toiletFacility)} />
        <ReviewRow label="Electricity" value={chars.electricity === null ? '—' : chars.electricity ? 'Yes' : 'No'} />
        <ReviewRow label="Internet" value={chars.internetAccess === null ? '—' : chars.internetAccess ? 'Yes' : 'No'} />
        <ReviewRow label="Waste Disposal" value={getOptionLabel(WASTE_DISPOSAL_OPTIONS, chars.wasteDisposal)} />
      </View>

      {/* Health Indicators */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="pulse" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Health Indicators</Text>
          </View>
          <TouchableOpacity onPress={() => goToStep(5)} style={styles.editButton}>
            <Ionicons name="pencil" size={14} color={colors.primary} />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
        {activeIndicators.length > 0 ? (
          activeIndicators.map((indicator) => (
            <View key={indicator.key} style={styles.indicatorRow}>
              <View style={[styles.indicatorIcon, { backgroundColor: indicator.color + '14' }]}>
                {indicator.iconLibrary === 'fontawesome6' ? (
                  <FontAwesome6 name={indicator.icon} size={12} color={indicator.color} />
                ) : (
                  <Ionicons name={indicator.icon as any} size={14} color={indicator.color} />
                )}
              </View>
              <Text style={styles.indicatorText}>{indicator.label}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No health indicators identified</Text>
        )}
      </View>

      {/* Offline notice */}
      <View style={styles.offlineNotice}>
        <Ionicons name="cloud-offline-outline" size={18} color={colors.textSecondary} />
        <Text style={styles.offlineText}>
          This household will be saved locally and synced when connectivity is available.
        </Text>
      </View>
    </ScrollView>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  sectionTitle: { ...typography.h2, marginBottom: spacing.xs },
  sectionSubtitle: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.xxl },
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
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
  },
  editText: { ...typography.bodySmall, color: colors.primary, fontFamily: fonts.medium },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  reviewLabel: { ...typography.bodySmall, color: colors.textSecondary },
  reviewValue: { ...typography.body, fontFamily: fonts.medium, textAlign: 'right', flex: 1, marginLeft: spacing.lg },
  addressText: { ...typography.body, lineHeight: 22 },
  noDataText: { ...typography.body, color: colors.textTertiary, fontStyle: 'italic' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  memberDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginRight: spacing.md },
  memberReviewInfo: { flex: 1 },
  memberReviewName: { ...typography.body, fontFamily: fonts.medium },
  memberReviewMeta: { ...typography.bodySmall, color: colors.textTertiary },
  indicatorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  indicatorIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  indicatorText: { ...typography.body, flex: 1 },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  offlineText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1, lineHeight: 18 },
});
