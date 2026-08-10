import { HouseholdFormData, HouseholdMember } from '@/src/models/Household';
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
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface Props {
  formData: HouseholdFormData;
  updateFormData: (updates: Partial<HouseholdFormData>) => void;
  getFieldError: (field: string) => string | undefined;
}

const SEX_OPTIONS = [
  { value: 'male', label: 'Male', icon: 'male' as const },
  { value: 'female', label: 'Female', icon: 'female' as const },
  { value: 'other', label: 'Other', icon: 'person' as const },
  { value: 'unknown', label: 'Unknown', icon: 'help-circle' as const },
];

export function StepHeadOfHousehold({ formData, updateFormData, getFieldError }: Props) {
  const head = formData.headOfHousehold;

  function updateHead(updates: Partial<HouseholdMember>) {
    updateFormData({
      headOfHousehold: { ...head, ...updates },
    });
  }

  function handleDateChange(text: string) {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 4) {
      formatted = cleaned.slice(0, 4) + '-' + cleaned.slice(4);
    }
    if (cleaned.length > 6) {
      formatted = formatted.slice(0, 7) + '-' + cleaned.slice(6, 8);
    }
    updateHead({ birthDate: formatted });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.sectionTitle}>Head of Household</Text>
      <Text style={styles.sectionSubtitle}>
        Enter the head of household's information
      </Text>

      {/* First Name */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>
          First Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, getFieldError('headFirstName') && styles.inputError]}
          value={head.firstName}
          onChangeText={(text) => updateHead({ firstName: text })}
          placeholder="e.g., Juan"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="words"
        />
        {getFieldError('headFirstName') && (
          <Text style={styles.errorText}>{getFieldError('headFirstName')}</Text>
        )}
      </View>

      {/* Middle Name */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Middle Name</Text>
        <TextInput
          style={styles.input}
          value={head.middleName}
          onChangeText={(text) => updateHead({ middleName: text })}
          placeholder="e.g., Santos"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="words"
        />
      </View>

      {/* Last Name */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>
          Last Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, getFieldError('headLastName') && styles.inputError]}
          value={head.lastName}
          onChangeText={(text) => updateHead({ lastName: text })}
          placeholder="e.g., Dela Cruz"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="words"
        />
        {getFieldError('headLastName') && (
          <Text style={styles.errorText}>{getFieldError('headLastName')}</Text>
        )}
      </View>

      {/* Sex */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>
          Sex <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.sexGrid}>
          {SEX_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sexOption,
                head.sex === option.value && styles.sexOptionSelected,
              ]}
              onPress={() => updateHead({ sex: option.value as any })}
              activeOpacity={0.7}
            >
              <Ionicons
                name={option.icon}
                size={18}
                color={head.sex === option.value ? colors.primary : colors.textTertiary}
              />
              <Text
                style={[
                  styles.sexOptionText,
                  head.sex === option.value && styles.sexOptionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {getFieldError('headSex') && (
          <Text style={styles.errorText}>{getFieldError('headSex')}</Text>
        )}
      </View>

      {/* Birth Date */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>
          Birth Date <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.dateInputContainer}>
          <Ionicons name="calendar-outline" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.dateInput, getFieldError('headBirthDate') && styles.inputError]}
            value={head.birthDate}
            onChangeText={handleDateChange}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
            maxLength={10}
          />
        </View>
        {getFieldError('headBirthDate') && (
          <Text style={styles.errorText}>{getFieldError('headBirthDate')}</Text>
        )}
        <Text style={styles.hint}>Format: YYYY-MM-DD (e.g., 1975-03-10)</Text>
      </View>

      {/* Contact Number */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.label}>Contact Number</Text>
        </View>
        <TextInput
          style={styles.input}
          value={head.contactNumber}
          onChangeText={(text) => updateHead({ contactNumber: text })}
          placeholder="09*********"
          placeholderTextColor={colors.textTertiary}
          keyboardType="phone-pad"
          maxLength={13}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  sectionTitle: { ...typography.h2, marginBottom: spacing.xs },
  sectionSubtitle: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.xxl },
  fieldContainer: { marginBottom: spacing.xl },
  label: { ...typography.label, marginBottom: spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  required: { color: colors.error },
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
  inputError: { borderColor: colors.error },
  errorText: { ...typography.bodySmall, color: colors.error, marginTop: spacing.xs },
  hint: { ...typography.caption, marginTop: spacing.xs },
  sexGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sexOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sexOptionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  sexOptionText: { ...typography.body, color: colors.textSecondary },
  sexOptionTextSelected: { color: colors.primary, fontFamily: fonts.medium },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  dateInput: {
    flex: 1,
    paddingVertical: 14,
    ...typography.body,
    color: colors.text,
    borderWidth: 0,
  },
});
