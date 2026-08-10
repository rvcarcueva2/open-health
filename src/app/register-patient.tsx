import { AlertConfig, CustomAlert } from '@/src/components/CustomAlert';
import { StepAddress } from '@/src/components/register/StepAddress';
import { StepBasicDemographics } from '@/src/components/register/StepBasicDemographics';
import { StepContact } from '@/src/components/register/StepContact';
import { StepIdentifiers } from '@/src/components/register/StepIdentifiers';
import { StepReview } from '@/src/components/register/StepReview';
import { linkMemberToPatient } from '@/src/db/householdMemberRepository';
import { getResourceById, saveResource } from '@/src/db/resourceRepository';
import { INITIAL_FORM_DATA, RegistrationFormData } from '@/src/models/Patient';
import { queueCreate } from '@/src/sync/syncQueue';
import { linkPatientToHouseholdMember } from '@/src/utils/householdMapper';
import { mapFormToFHIRPatient } from '@/src/utils/patientMapper';
import {
    validateStep1,
    validateStep3,
    ValidationError,
} from '@/src/utils/validation';
import {
    borderRadius,
    colors,
    fonts,
    spacing,
    typography,
} from '@/styles/global';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STEPS = [
  'Demographics',
  'Identifiers',
  'Contact',
  'Address',
  'Review',
];

export default function RegisterPatientScreen() {
  const params = useLocalSearchParams<{
    prefillFirstName?: string;
    prefillMiddleName?: string;
    prefillLastName?: string;
    prefillSex?: string;
    prefillBirthDate?: string;
    prefillRegionCode?: string;
    prefillRegionDisplay?: string;
    prefillProvinceCode?: string;
    prefillProvinceDisplay?: string;
    prefillCityCode?: string;
    prefillCityDisplay?: string;
    prefillBarangayCode?: string;
    prefillBarangayDisplay?: string;
    prefillHouseNumberStreet?: string;
    fromHousehold?: string;
    memberId?: string;
  }>();

  const initialFormData = useMemo<RegistrationFormData>(() => {
    return {
      ...INITIAL_FORM_DATA,
      firstName: params.prefillFirstName || '',
      middleName: params.prefillMiddleName || '',
      lastName: params.prefillLastName || '',
      sex: (params.prefillSex as RegistrationFormData['sex']) || '',
      birthDate: params.prefillBirthDate || '',
      regionCode: params.prefillRegionCode || '',
      regionDisplay: params.prefillRegionDisplay || '',
      provinceCode: params.prefillProvinceCode || '',
      provinceDisplay: params.prefillProvinceDisplay || '',
      cityCode: params.prefillCityCode || '',
      cityDisplay: params.prefillCityDisplay || '',
      barangayCode: params.prefillBarangayCode || '',
      barangayDisplay: params.prefillBarangayDisplay || '',
      houseNumberStreet: params.prefillHouseNumberStreet || '',
    };
  }, []);

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<RegistrationFormData>(initialFormData);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [saving, setSaving] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false, title: '', message: '',
  });

  function updateFormData(updates: Partial<RegistrationFormData>) {
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
        return validateStep1(formData);
      case 2:
        return validateStep3(formData);
      default:
        return [];
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Generate PH Core-compliant FHIR Patient
      const patient = mapFormToFHIRPatient(formData);

      console.log('SAVING TO SQLITE', patient.id);

      // Save to SQLite
      await saveResource(patient);

      console.log('QUEUE ITEM CREATED', patient.id);

      // Queue for sync
      await queueCreate(patient.id);

      // Link patient to household member if coming from a household
      if (params.fromHousehold && params.memberId) {
        try {
          // Update the linkage table (source of truth for member-patient relationship)
          linkMemberToPatient(params.memberId, patient.id);

          // Also update the FHIR Group resource for consistency
          const householdResource = await getResourceById(params.fromHousehold);
          if (householdResource) {
            const groupData = typeof householdResource.data === 'string'
              ? JSON.parse(householdResource.data)
              : householdResource.data;

            const updatedGroup = linkPatientToHouseholdMember(
              groupData,
              params.memberId,
              patient.id
            );

            await saveResource(updatedGroup);
            console.log('HOUSEHOLD MEMBER LINKED TO PATIENT', params.memberId, patient.id);
          }
        } catch (linkError) {
          console.error('Failed to link patient to household member:', linkError);
        }
      }

      console.log('PATIENT REGISTERED SUCCESSFULLY', patient.id);

      setAlertConfig({
        visible: true,
        title: 'Patient Registered',
        message: `${formData.firstName} ${formData.lastName} has been registered successfully.`,
        icon: 'checkmark-circle',
        buttons: [{ text: 'OK', onPress: () => router.back() }],
      });
    } catch (error) {
      console.error('REGISTRATION ERROR', error);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Failed to register patient. Please try again.',
        icon: 'alert-circle',
        iconColor: colors.error,
        buttons: [{ text: 'OK' }],
      });
    } finally {
      setSaving(false);
    }
  }

  function goToStep(step: number) {
    // Only allow going back to previous steps
    if (step < currentStep) {
      setErrors([]);
      setCurrentStep(step);
    }
  }

  function renderStep() {
    switch (currentStep) {
      case 0:
        return (
          <StepBasicDemographics
            formData={formData}
            updateFormData={updateFormData}
            getFieldError={getFieldError}
          />
        );
      case 1:
        return (
          <StepIdentifiers
            formData={formData}
            updateFormData={updateFormData}
            getFieldError={getFieldError}
          />
        );
      case 2:
        return (
          <StepContact
            formData={formData}
            updateFormData={updateFormData}
            getFieldError={getFieldError}
          />
        );
      case 3:
        return (
          <StepAddress
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case 4:
        return (
          <StepReview
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
        <Text style={styles.headerTitle}>Register Patient</Text>
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
                  <Ionicons name="checkmark" size={12} color={colors.textOnPrimary} />
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
              {saving ? 'Saving...' : 'Save Patient'}
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
    paddingHorizontal: spacing.xl,
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
    width: 26,
    height: 26,
    borderRadius: 13,
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
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.textTertiary,
  },
  progressDotTextActive: {
    color: colors.textOnPrimary,
  },
  progressLine: {
    width: 32,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 4,
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
