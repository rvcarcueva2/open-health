import { AlertConfig, CustomAlert } from '@/src/components/CustomAlert';
import { createEncounter } from '@/src/fhir/encounterService';
import {
    createVitalSignObservations,
    getVitalSignsHistory,
} from '@/src/fhir/observationService';
import {
    INITIAL_VITAL_SIGNS_FORM,
    VitalSignsFormData,
} from '@/src/models/Observation';
import {
    borderRadius,
    colors,
    fonts,
    spacing,
    typography,
} from '@/styles/global';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ViewMode = 'list' | 'form';

const MONTHS = [
  { value: 0, label: 'All Months' },
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export default function VitalSignsHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [records, setRecords] = useState<ReturnType<typeof getVitalSignsHistory>>([]);
  const [formData, setFormData] = useState<VitalSignsFormData>(INITIAL_VITAL_SIGNS_FORM);
  const [saving, setSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 = All
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: '',
    message: '',
  });
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  useEffect(() => {
    loadRecords();
  }, [id]);

  const loadRecords = useCallback(() => {
    if (!id) return;
    const history = getVitalSignsHistory(id);
    setRecords(history);
  }, [id]);

  // Get available years from records
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    for (const record of records) {
      if (record.date) {
        years.add(new Date(record.date).getFullYear());
      }
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [records]);

  // Filter records by month/year
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (!record.date) return false;
      const date = new Date(record.date);
      const matchYear = date.getFullYear() === selectedYear;
      const matchMonth = selectedMonth === 0 || date.getMonth() + 1 === selectedMonth;
      return matchYear && matchMonth;
    });
  }, [records, selectedMonth, selectedYear]);

  function updateFormData(updates: Partial<VitalSignsFormData>) {
    setFormData((prev) => ({ ...prev, ...updates }));
  }

  async function handleSave() {
    // Validate at least one field is filled
    const hasData = Object.values(formData).some((v) => v.trim() !== '');
    if (!hasData) {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Please enter at least one vital sign measurement.',
        icon: 'alert-circle',
        iconColor: colors.error,
        buttons: [{ text: 'OK' }],
      });
      return;
    }

    // Validate blood pressure - both or neither
    if ((formData.systolic && !formData.diastolic) || (!formData.systolic && formData.diastolic)) {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Please enter both systolic and diastolic blood pressure.',
        icon: 'alert-circle',
        iconColor: colors.error,
        buttons: [{ text: 'OK' }],
      });
      return;
    }

    setSaving(true);
    try {
      // 1. Create Encounter
      console.log('CREATING ENCOUNTER FOR VITAL SIGNS');
      const encounter = await createEncounter(id!);

      // 2. Create Observations
      console.log('CREATING VITAL SIGN OBSERVATIONS');
      const observations = await createVitalSignObservations(id!, encounter.id, formData);

      console.log(`VITAL SIGNS SAVED: ${observations.length} observations`);

      // 3. Reset form and reload
      setFormData(INITIAL_VITAL_SIGNS_FORM);
      loadRecords();
      setViewMode('list');

      setAlertConfig({
        visible: true,
        title: 'Vital Signs Recorded',
        message: `${observations.length} measurement(s) have been saved successfully.`,
        icon: 'checkmark-circle',
        buttons: [{ text: 'OK' }],
      });
    } catch (error) {
      console.error('VITAL SIGNS SAVE ERROR', error);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Failed to save vital signs. Please try again.',
        icon: 'alert-circle',
        iconColor: colors.error,
        buttons: [{ text: 'OK' }],
      });
    } finally {
      setSaving(false);
    }
  }

  function formatDate(isoString: string) {
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
        <TouchableOpacity
          onPress={() => {
            if (viewMode === 'form') {
              setViewMode('list');
              setFormData(INITIAL_VITAL_SIGNS_FORM);
            } else {
              router.back();
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {viewMode === 'form' ? 'Record Vital Signs' : 'Vital Signs'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {viewMode === 'list' ? (
        <>
          {/* Filters */}
          <View style={styles.filterContainer}>
            {/* Month Dropdown */}
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowMonthDropdown(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownText}>
                {MONTHS.find((m) => m.value === selectedMonth)?.label ?? 'All Months'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Year Dropdown */}
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowYearDropdown(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownText}>{selectedYear}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Month Dropdown Modal */}
          <Modal visible={showMonthDropdown} transparent animationType="fade" statusBarTranslucent>
            <TouchableOpacity
              style={styles.dropdownOverlay}
              activeOpacity={1}
              onPress={() => setShowMonthDropdown(false)}
            >
              <View style={styles.dropdownMenu}>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
                  {MONTHS.map((month) => (
                    <TouchableOpacity
                      key={month.value}
                      style={[
                        styles.dropdownItem,
                        selectedMonth === month.value && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setSelectedMonth(month.value);
                        setShowMonthDropdown(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          selectedMonth === month.value && styles.dropdownItemTextActive,
                        ]}
                      >
                        {month.label}
                      </Text>
                      {selectedMonth === month.value && (
                        <Ionicons name="checkmark" size={16} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Year Dropdown Modal */}
          <Modal visible={showYearDropdown} transparent animationType="fade" statusBarTranslucent>
            <TouchableOpacity
              style={styles.dropdownOverlay}
              activeOpacity={1}
              onPress={() => setShowYearDropdown(false)}
            >
              <View style={styles.dropdownMenu}>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
                  {availableYears.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.dropdownItem,
                        selectedYear === year && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setSelectedYear(year);
                        setShowYearDropdown(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          selectedYear === year && styles.dropdownItemTextActive,
                        ]}
                      >
                        {year}
                      </Text>
                      {selectedYear === year && (
                        <Ionicons name="checkmark" size={16} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Records List */}
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredRecords.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="heart-outline" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyText}>No vital signs recorded</Text>
                <Text style={styles.emptySubtext}>
                  Tap the button below to record vital signs
                </Text>
              </View>
            ) : (
              filteredRecords.map((record, index) => (
                <View key={record.encounterId ?? index} style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
                  </View>
                  <View style={styles.recordBody}>
                    {record.systolic != null && record.diastolic != null && (
                      <RecordItem label="BP" value={`${record.systolic}/${record.diastolic} mmHg`} />
                    )}
                    {record.temperature != null && (
                      <RecordItem label="Temp" value={`${record.temperature} °C`} />
                    )}
                    {record.heartRate != null && (
                      <RecordItem label="HR" value={`${record.heartRate} bpm`} />
                    )}
                    {record.respiratoryRate != null && (
                      <RecordItem label="RR" value={`${record.respiratoryRate} breaths/min`} />
                    )}
                    {record.weight != null && (
                      <RecordItem label="Weight" value={`${record.weight} kg`} />
                    )}
                    {record.height != null && (
                      <RecordItem label="Height" value={`${record.height} cm`} />
                    )}
                    {record.oxygenSaturation != null && (
                      <RecordItem label="SpO₂" value={`${record.oxygenSaturation}%`} />
                    )}
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Add Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setViewMode('form')}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color={colors.textOnPrimary} />
              <Text style={styles.addButtonText}>Record Vital Signs</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* Form View */
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sectionTitle}>Vital Signs Measurements</Text>
            <Text style={styles.sectionSubtitle}>
              Enter the patient's vital signs. Leave fields blank if not measured.
            </Text>

            {/* Blood Pressure */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Blood Pressure</Text>
              <View style={styles.bpRow}>
                <View style={styles.bpField}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={formData.systolic}
                    onChangeText={(text) => updateFormData({ systolic: text })}
                    placeholder="Systolic"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                  />
                  <Text style={styles.unitLabel}>mmHg</Text>
                </View>
                <Text style={styles.bpSeparator}>/</Text>
                <View style={styles.bpField}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={formData.diastolic}
                    onChangeText={(text) => updateFormData({ diastolic: text })}
                    placeholder="Diastolic"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                  />
                  <Text style={styles.unitLabel}>mmHg</Text>
                </View>
              </View>
            </View>

            {/* 2-Column Grid */}
            <View style={styles.gridRow}>
              {/* Temperature */}
              <View style={styles.gridCol}>
                <Text style={styles.fieldLabel}>Temperature</Text>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={formData.temperature}
                    onChangeText={(text) => updateFormData({ temperature: text })}
                    placeholder="36.8"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.unitLabel}>°C</Text>
                </View>
              </View>

              {/* Heart Rate */}
              <View style={styles.gridCol}>
                <Text style={styles.fieldLabel}>Heart Rate</Text>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={formData.heartRate}
                    onChangeText={(text) => updateFormData({ heartRate: text })}
                    placeholder="78"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                  />
                  <Text style={styles.unitLabel}>bpm</Text>
                </View>
              </View>
            </View>

            <View style={styles.gridRow}>
              {/* Respiratory Rate */}
              <View style={styles.gridCol}>
                <Text style={styles.fieldLabel}>Resp. Rate</Text>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={formData.respiratoryRate}
                    onChangeText={(text) => updateFormData({ respiratoryRate: text })}
                    placeholder="18"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                  />
                  <Text style={styles.unitLabel}>/min</Text>
                </View>
              </View>

              {/* Weight */}
              <View style={styles.gridCol}>
                <Text style={styles.fieldLabel}>Weight</Text>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={formData.weight}
                    onChangeText={(text) => updateFormData({ weight: text })}
                    placeholder="70"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.unitLabel}>kg</Text>
                </View>
              </View>
            </View>

            <View style={styles.gridRow}>
              {/* Height */}
              <View style={styles.gridCol}>
                <Text style={styles.fieldLabel}>Height</Text>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={formData.height}
                    onChangeText={(text) => updateFormData({ height: text })}
                    placeholder="170"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.unitLabel}>cm</Text>
                </View>
              </View>

              {/* Oxygen Saturation */}
              <View style={styles.gridCol}>
                <Text style={styles.fieldLabel}>SpO₂</Text>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={formData.oxygenSaturation}
                    onChangeText={(text) => updateFormData({ oxygenSaturation: text })}
                    placeholder="98"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                  />
                  <Text style={styles.unitLabel}>%</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Save Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              activeOpacity={0.7}
              disabled={saving}
            >
              <Ionicons name="checkmark-circle" size={20} color={colors.textOnPrimary} />
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save Vital Signs'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      <CustomAlert
        config={alertConfig}
        onDismiss={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

function RecordItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.recordItem}>
      <Text style={styles.recordItemLabel}>{label}</Text>
      <Text style={styles.recordItemValue}>{value}</Text>
    </View>
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

  // Filters
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  dropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdownText: {
    ...typography.body,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  dropdownMenu: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    width: '100%',
    maxWidth: 300,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  dropdownItemActive: {
    backgroundColor: colors.primaryLight,
  },
  dropdownItemText: {
    ...typography.body,
    color: colors.text,
  },
  dropdownItemTextActive: {
    color: colors.primary,
    fontFamily: fonts.semiBold,
  },

  // List
  listContent: {
    padding: spacing.xl,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 2,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.h3,
    color: colors.textTertiary,
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
  },

  // Record Cards
  recordCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  recordDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontFamily: fonts.medium,
  },
  recordBody: {
    gap: spacing.xs,
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  recordItemLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  recordItemValue: {
    ...typography.body,
    fontFamily: fonts.medium,
  },

  // Form
  formContent: {
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
  gridRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  gridCol: {
    flex: 1,
  },
  fieldLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    height: 48,
    fontSize: 14,
    fontFamily: fonts.regular,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
  },
  unitLabel: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    minWidth: 40,
  },
  bpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
  },
  bpField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
  },
  bpSeparator: {
    fontSize: 20,
    fontFamily: fonts.semiBold,
    color: colors.textTertiary,
  },

  // Footer
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addButtonText: {
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
