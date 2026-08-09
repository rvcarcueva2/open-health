import { RegistrationFormData } from '@/src/models/Patient';
import { calculateAge } from '@/src/utils/validation';
import {
    borderRadius,
    colors,
    fonts,
    spacing,
    typography,
} from '@/styles/global';
import { Ionicons } from '@expo/vector-icons';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface Props {
  formData: RegistrationFormData;
  goToStep: (step: number) => void;
}

export function StepReview({ formData, goToStep }: Props) {
  const fullName = [formData.firstName, formData.middleName, formData.lastName]
    .filter(Boolean)
    .join(' ');

  const age = formData.birthDate ? calculateAge(formData.birthDate) : null;

  const addressParts = [
    formData.houseNumberStreet,
    formData.barangayDisplay,
    formData.cityDisplay,
    formData.provinceDisplay,
    formData.regionDisplay,
  ].filter(Boolean);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionTitle}>Review & Confirm</Text>
      <Text style={styles.sectionSubtitle}>
        Please review the information before saving
      </Text>

      {/* Demographics Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="person" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Demographics</Text>
          </View>
          <TouchableOpacity onPress={() => goToStep(0)} style={styles.editButton}>
            <Ionicons name="pencil" size={14} color={colors.primary} />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Full Name</Text>
          <Text style={styles.reviewValue}>{fullName}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Sex</Text>
          <Text style={styles.reviewValue}>
            {formData.sex ? formData.sex.charAt(0).toUpperCase() + formData.sex.slice(1) : '—'}
          </Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Birth Date</Text>
          <Text style={styles.reviewValue}>{formData.birthDate || '—'}</Text>
        </View>
        {age !== null && (
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Age</Text>
            <Text style={styles.reviewValue}>{age} years old</Text>
          </View>
        )}
      </View>

      {/* Identifiers Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="card" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Identifiers</Text>
          </View>
          <TouchableOpacity onPress={() => goToStep(1)} style={styles.editButton}>
            <Ionicons name="pencil" size={14} color={colors.primary} />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>PhilHealth</Text>
          <Text style={styles.reviewValue}>
            {formData.philHealthNumber || '—'}
          </Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>PhilSys ID</Text>
          <Text style={styles.reviewValue}>
            {formData.philSysId || '—'}
          </Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Local Record #</Text>
          <Text style={styles.reviewValue}>
            {formData.localHealthRecordNumber || '—'}
          </Text>
        </View>
      </View>

      {/* Contact Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="call" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Contact</Text>
          </View>
          <TouchableOpacity onPress={() => goToStep(2)} style={styles.editButton}>
            <Ionicons name="pencil" size={14} color={colors.primary} />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Mobile</Text>
          <Text style={styles.reviewValue}>
            {formData.mobileNumber || '—'}
          </Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Email</Text>
          <Text style={styles.reviewValue}>
            {formData.emailAddress || '—'}
          </Text>
        </View>
      </View>

      {/* Address Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="location" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Address</Text>
          </View>
          <TouchableOpacity onPress={() => goToStep(3)} style={styles.editButton}>
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

      {/* Offline notice */}
      <View style={styles.offlineNotice}>
        <Ionicons name="cloud-offline-outline" size={18} color={colors.textSecondary} />
        <Text style={styles.offlineText}>
          This record will be saved locally and synced when connectivity is available.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  sectionTitle: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
  },
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
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
  },
  editText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontFamily: fonts.medium,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  reviewLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  reviewValue: {
    ...typography.body,
    fontFamily: fonts.medium,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.lg,
  },
  addressText: {
    ...typography.body,
    lineHeight: 22,
  },
  noDataText: {
    ...typography.body,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
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
  offlineText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
});
