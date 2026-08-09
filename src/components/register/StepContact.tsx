import { RegistrationFormData } from '@/src/models/Patient';
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
  formData: RegistrationFormData;
  updateFormData: (updates: Partial<RegistrationFormData>) => void;
  getFieldError: (field: string) => string | undefined;
}

export function StepContact({ formData, updateFormData, getFieldError }: Props) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.sectionTitle}>Contact Information</Text>
      <Text style={styles.sectionSubtitle}>
        How can this patient be reached? (optional)
      </Text>

      {/* Mobile Number */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.label}>Mobile Number</Text>
        </View>
        <View style={styles.phoneInputContainer}>
          <View style={styles.phonePrefix}>
            <Text style={styles.phonePrefixText}>🇵🇭</Text>
          </View>
          <TextInput
            style={[
              styles.phoneInput,
              getFieldError('mobileNumber') && styles.inputError,
            ]}
            value={formData.mobileNumber}
            onChangeText={(text) => updateFormData({ mobileNumber: text })}
            placeholder="09*********"
            placeholderTextColor={colors.textTertiary}
            keyboardType="phone-pad"
            maxLength={13}
          />
        </View>
        {getFieldError('mobileNumber') && (
          <Text style={styles.errorText}>{getFieldError('mobileNumber')}</Text>
        )}
        <Text style={styles.hint}>Philippine mobile number format</Text>
      </View>

      {/* Email */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.label}>Email Address</Text>
        </View>
        <TextInput
          style={[
            styles.input,
            getFieldError('emailAddress') && styles.inputError,
          ]}
          value={formData.emailAddress}
          onChangeText={(text) => updateFormData({ emailAddress: text })}
          placeholder="juan@example.com"
          placeholderTextColor={colors.textTertiary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {getFieldError('emailAddress') && (
          <Text style={styles.errorText}>{getFieldError('emailAddress')}</Text>
        )}
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={20} color={colors.info} />
        <Text style={styles.infoText}>
          Contact information is optional but recommended for appointment reminders and follow-ups.
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
  fieldContainer: {
    marginBottom: spacing.xxl,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.label,
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.md,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.info,
    flex: 1,
    lineHeight: 18,
  },
});
