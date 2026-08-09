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

export function StepIdentifiers({ formData, updateFormData, getFieldError }: Props) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.sectionTitle}>Patient Identifiers</Text>
      <Text style={styles.sectionSubtitle}>
        Enter available identification numbers (all optional)
      </Text>

      {/* PhilHealth Number */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Ionicons name="card-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.label}>PhilHealth Number</Text>
        </View>
        <TextInput
          style={styles.input}
          value={formData.philHealthNumber}
          onChangeText={(text) => updateFormData({ philHealthNumber: text })}
          placeholder="e.g., 01-234567890-1"
          placeholderTextColor={colors.textTertiary}
          keyboardType="default"
        />
        <Text style={styles.hint}>Philippine Health Insurance Corporation ID</Text>
      </View>

      {/* PhilSys National ID */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Ionicons name="finger-print-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.label}>PhilSys National ID</Text>
        </View>
        <TextInput
          style={styles.input}
          value={formData.philSysId}
          onChangeText={(text) => updateFormData({ philSysId: text })}
          placeholder="e.g., 1234-5678-9012-3456"
          placeholderTextColor={colors.textTertiary}
          keyboardType="default"
        />
        <Text style={styles.hint}>Philippine Identification System (National ID)</Text>
      </View>

      {/* Local Health Record Number */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.label}>Local Health Record Number</Text>
        </View>
        <TextInput
          style={styles.input}
          value={formData.localHealthRecordNumber}
          onChangeText={(text) => updateFormData({ localHealthRecordNumber: text })}
          placeholder="e.g., RHU-2024-001"
          placeholderTextColor={colors.textTertiary}
          keyboardType="default"
        />
        <Text style={styles.hint}>Health facility record number</Text>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={20} color={colors.info} />
        <Text style={styles.infoText}>
          These identifiers help link patient records across health facilities. 
          You can add them later if not available now.
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
  hint: {
    ...typography.caption,
    marginTop: spacing.xs,
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
