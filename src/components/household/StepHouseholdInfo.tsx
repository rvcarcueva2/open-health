import { HouseholdFormData } from '@/src/models/Household';
import {
    borderRadius,
    colors,
    spacing,
    typography,
} from '@/styles/global';
import { Ionicons } from '@expo/vector-icons';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

interface Props {
  formData: HouseholdFormData;
  updateFormData: (updates: Partial<HouseholdFormData>) => void;
  getFieldError: (field: string) => string | undefined;
}

export function StepHouseholdInfo({ formData, updateFormData, getFieldError }: Props) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.sectionTitle}>Household Information</Text>
      <Text style={styles.sectionSubtitle}>
        Enter basic household details
      </Text>

      {/* Household Name */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>
          Household Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, getFieldError('householdName') && styles.inputError]}
          value={formData.householdName}
          onChangeText={(text) => updateFormData({ householdName: text })}
          placeholder="e.g., Dela Cruz Household"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="words"
        />
        {getFieldError('householdName') && (
          <Text style={styles.errorText}>{getFieldError('householdName')}</Text>
        )}
      </View>

      {/* Household Number */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Ionicons name="home-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.label}>Household Number / Identifier</Text>
        </View>
        <TextInput
          style={styles.input}
          value={formData.householdNumber}
          onChangeText={(text) => updateFormData({ householdNumber: text })}
          placeholder="e.g., 00125"
          placeholderTextColor={colors.textTertiary}
        />
        <Text style={styles.hint}>Optional household tracking number</Text>
      </View>

      {/* Contact Number */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.label}>Contact Number</Text>
        </View>
        <View style={styles.phoneInputContainer}>
          <View style={styles.phonePrefix}>
            <Text style={styles.phonePrefixText}>🇵🇭</Text>
          </View>
          <TextInput
            style={[
              styles.phoneInput,
              getFieldError('contactNumber') && styles.inputError,
            ]}
            value={formData.contactNumber}
            onChangeText={(text) => updateFormData({ contactNumber: text })}
            placeholder="09*********"
            placeholderTextColor={colors.textTertiary}
            keyboardType="phone-pad"
            maxLength={13}
          />
        </View>
        {getFieldError('contactNumber') && (
          <Text style={styles.errorText}>{getFieldError('contactNumber')}</Text>
        )}
      </View>

      {/* Registration Date */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.label}>Registration Date</Text>
        </View>
        <TextInput
          style={styles.input}
          value={formData.registrationDate}
          onChangeText={(text) => updateFormData({ registrationDate: text })}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textTertiary}
          keyboardType="number-pad"
          maxLength={10}
        />
        <Text style={styles.hint}>Auto-filled with today's date</Text>
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
  fieldContainer: {
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.error,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    marginTop: spacing.xs,
  },
  hint: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  phonePrefix: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phonePrefixText: {
    fontSize: 18,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
});
