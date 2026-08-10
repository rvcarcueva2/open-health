import { AlertConfig, CustomAlert } from '@/src/components/CustomAlert';
import { StepHeadOfHousehold } from '@/src/components/household/StepHeadOfHousehold';
import { StepHealthIndicators } from '@/src/components/household/StepHealthIndicators';
import { StepHouseholdAddress } from '@/src/components/household/StepHouseholdAddress';
import { StepHouseholdCharacteristics } from '@/src/components/household/StepHouseholdCharacteristics';
import { StepHouseholdInfo } from '@/src/components/household/StepHouseholdInfo';
import { StepHouseholdMembers } from '@/src/components/household/StepHouseholdMembers';
import { StepHouseholdReview } from '@/src/components/household/StepHouseholdReview';
import { saveHouseholdMember } from '@/src/db/householdMemberRepository';
import { saveResource } from '@/src/db/resourceRepository';
import { HouseholdFormData, INITIAL_HOUSEHOLD_FORM_DATA } from '@/src/models/Household';
import { queueCreate } from '@/src/sync/syncQueue';
import { mapFormToFHIRGroup } from '@/src/utils/householdMapper';
import {
    validateHouseholdStep1,
    validateHouseholdStep3,
    ValidationError,
} from '@/src/utils/householdValidation';
import {
    borderRadius,
    colors,
    fonts,
    spacing,
    typography,
} from '@/styles/global';
import { Ionicons } from '@expo/vector-icons';
import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STEPS = [
  'Household',
  'Address',
  'Head',
  'Members',
  'Characteristics',
  'Indicators',
  'Review',
];

export default function RegisterHouseholdScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const initialData = useMemo<HouseholdFormData>(() => ({
    ...INITIAL_HOUSEHOLD_FORM_DATA,
    headOfHousehold: {
      ...INITIAL_HOUSEHOLD_FORM_DATA.headOfHousehold,
      id: randomUUID(),
    },
  }), []);
  const [formData, setFormData] = useState<HouseholdFormData>(initialData);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [saving, setSaving] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false, title: '', message: '',
  });

  function updateFormData(updates: Partial<HouseholdFormData>) {
    setFormData((prev) => ({ ...prev, ...updates }));
  }

  function getFieldError(field: string): string | undefined {
    return errors.find((e) => e.field === field)?.message;
  }

  function handleNext() {
    const stepErrors = validateCurrentStep();
    if (stepErrors.length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors([]);
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }

  function handleBack() {
    setErrors([]);
    if (currentStep === 0) {
      router.back();
    } else {
      setCurrentStep((prev) => prev - 1);
    }
  }

  function validateCurrentStep(): ValidationError[] {
    switch (currentStep) {
      case 0:
        return validateHouseholdStep1(formData);
      case 2:
        return validateHouseholdStep3(formData);
      default:
        return [];
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Generate FHIR Group resource
      const group = mapFormToFHIRGroup(formData);

      console.log('SAVING HOUSEHOLD TO SQLITE', group.id);

      // Save to SQLite
      await saveResource(group);

      // Save household members to the linkage table
      saveHouseholdMember({
        householdId: group.id,
        memberId: formData.headOfHousehold.id,
        firstName: formData.headOfHousehold.firstName,
        lastName: formData.headOfHousehold.lastName,
        isHead: true,
      });

      for (const member of formData.members) {
        saveHouseholdMember({
          householdId: group.id,
          memberId: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          isHead: false,
        });
      }

      console.log('QUEUE ITEM CREATED', group.id);

      // Queue for sync
      await queueCreate(group.id);

      console.log('HOUSEHOLD REGISTERED SUCCESSFULLY', group.id);

      setAlertConfig({
        visible: true,
        title: 'Household Registered',
        message: `${formData.householdName} has been registered successfully.`,
        icon: 'checkmark-circle',
        buttons: [{ text: 'OK', onPress: () => router.back() }],
      });
    } catch (error) {
      console.error('HOUSEHOLD REGISTRATION ERROR', error);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Failed to register household. Please try again.',
        icon: 'alert-circle',
        iconColor: colors.error,
        buttons: [{ text: 'OK' }],
      });
    } finally {
      setSaving(false);
    }
  }

  function goToStep(step: number) {
    if (step < currentStep) {
      setErrors([]);
      setCurrentStep(step);
    }
  }

  function renderStep() {
    switch (currentStep) {
      case 0:
        return (
          <StepHouseholdInfo
            formData={formData}
            updateFormData={updateFormData}
            getFieldError={getFieldError}
          />
        );
      case 1:
        return (
          <StepHouseholdAddress
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case 2:
        return (
          <StepHeadOfHousehold
            formData={formData}
            updateFormData={updateFormData}
            getFieldError={getFieldError}
          />
        );
      case 3:
        return (
          <StepHouseholdMembers
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case 4:
        return (
          <StepHouseholdCharacteristics
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case 5:
        return (
          <StepHealthIndicators
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case 6:
        return (
          <StepHouseholdReview
            formData={formData}
            goToStep={goToStep}
          />
        );
      default:
        return null;
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register Household</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          {STEPS.map((step, index) => (
            <View key={step} style={styles.progressStep}>
              <View
                style={[
                  styles.progressDot,
                  index <= currentStep && styles.progressDotActive,
                  index < currentStep && styles.progressDotCompleted,
                ]}
              >
                {index < currentStep ? (
                  <Ionicons name="checkmark" size={10} color={colors.textOnPrimary} />
                ) : (
                  <Text
                    style={[
                      styles.progressDotText,
                      index <= currentStep && styles.progressDotTextActive,
                    ]}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
              {index < STEPS.length - 1 && (
                <View
                  style={[
                    styles.progressLine,
                    index < currentStep && styles.progressLineActive,
                  ]}
                />
              )}
            </View>
          ))}
        </View>
        <Text style={styles.stepLabel}>
          Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]}
        </Text>
      </View>

      {/* Step Content */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.content}>
          {renderStep()}
        </View>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          {currentStep < STEPS.length - 1 ? (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.7}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.textOnPrimary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              activeOpacity={0.7}
              disabled={saving}
            >
              <Ionicons name="checkmark-circle" size={20} color={colors.textOnPrimary} />
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save Household'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      <CustomAlert
        config={alertConfig}
        onDismiss={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  progressContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  progressDotCompleted: {
    backgroundColor: colors.success,
  },
  progressDotText: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
    color: colors.textTertiary,
  },
  progressDotTextActive: {
    color: colors.textOnPrimary,
  },
  progressLine: {
    width: 20,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 2,
  },
  progressLineActive: {
    backgroundColor: colors.success,
  },
  stepLabel: {
    ...typography.bodySmall,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nextButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nextButtonText: {
    ...typography.h3,
    color: colors.textOnPrimary,
  },
  saveButton: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.h3,
    color: colors.textOnPrimary,
  },
});
