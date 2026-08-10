import {
    HouseholdCharacteristics,
    HouseholdFormData,
    TOILET_FACILITY_OPTIONS,
    WASTE_DISPOSAL_OPTIONS,
    WATER_SOURCE_OPTIONS,
} from '@/src/models/Household';
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
  formData: HouseholdFormData;
  updateFormData: (updates: Partial<HouseholdFormData>) => void;
}

export function StepHouseholdCharacteristics({ formData, updateFormData }: Props) {
  const chars = formData.characteristics;

  function updateChars(updates: Partial<HouseholdCharacteristics>) {
    updateFormData({
      characteristics: { ...chars, ...updates },
    });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionTitle}>Household Characteristics</Text>
      <Text style={styles.sectionSubtitle}>
        Information for community health assessments
      </Text>

      {/* Water Source */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Ionicons name="water-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.label}>Water Source</Text>
        </View>
        <View style={styles.optionsRow}>
          {WATER_SOURCE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.optionChip,
                chars.waterSource === opt.value && styles.optionChipSelected,
              ]}
              onPress={() => updateChars({ waterSource: chars.waterSource === opt.value ? '' : opt.value })}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionChipText,
                  chars.waterSource === opt.value && styles.optionChipTextSelected,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Toilet Facility */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Ionicons name="home-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.label}>Toilet Facility</Text>
        </View>
        <View style={styles.optionsRow}>
          {TOILET_FACILITY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.optionChip,
                chars.toiletFacility === opt.value && styles.optionChipSelected,
              ]}
              onPress={() => updateChars({ toiletFacility: chars.toiletFacility === opt.value ? '' : opt.value })}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionChipText,
                  chars.toiletFacility === opt.value && styles.optionChipTextSelected,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Electricity */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Ionicons name="flash-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.label}>Electricity</Text>
        </View>
        <View style={styles.boolRow}>
          <TouchableOpacity
            style={[styles.boolOption, chars.electricity === true && styles.boolOptionSelected]}
            onPress={() => updateChars({ electricity: chars.electricity === true ? null : true })}
            activeOpacity={0.7}
          >
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={chars.electricity === true ? colors.success : colors.textTertiary}
            />
            <Text
              style={[styles.boolText, chars.electricity === true && styles.boolTextSelected]}
            >
              Yes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.boolOption, chars.electricity === false && styles.boolOptionSelectedNo]}
            onPress={() => updateChars({ electricity: chars.electricity === false ? null : false })}
            activeOpacity={0.7}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={chars.electricity === false ? colors.error : colors.textTertiary}
            />
            <Text
              style={[styles.boolText, chars.electricity === false && styles.boolTextSelectedNo]}
            >
              No
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Internet Access */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Ionicons name="wifi-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.label}>Internet Access</Text>
        </View>
        <View style={styles.boolRow}>
          <TouchableOpacity
            style={[styles.boolOption, chars.internetAccess === true && styles.boolOptionSelected]}
            onPress={() => updateChars({ internetAccess: chars.internetAccess === true ? null : true })}
            activeOpacity={0.7}
          >
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={chars.internetAccess === true ? colors.success : colors.textTertiary}
            />
            <Text
              style={[styles.boolText, chars.internetAccess === true && styles.boolTextSelected]}
            >
              Yes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.boolOption, chars.internetAccess === false && styles.boolOptionSelectedNo]}
            onPress={() => updateChars({ internetAccess: chars.internetAccess === false ? null : false })}
            activeOpacity={0.7}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={chars.internetAccess === false ? colors.error : colors.textTertiary}
            />
            <Text
              style={[styles.boolText, chars.internetAccess === false && styles.boolTextSelectedNo]}
            >
              No
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Waste Disposal */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.label}>Waste Disposal</Text>
        </View>
        <View style={styles.optionsRow}>
          {WASTE_DISPOSAL_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.optionChip,
                chars.wasteDisposal === opt.value && styles.optionChipSelected,
              ]}
              onPress={() => updateChars({ wasteDisposal: chars.wasteDisposal === opt.value ? '' : opt.value })}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionChipText,
                  chars.wasteDisposal === opt.value && styles.optionChipTextSelected,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  sectionTitle: { ...typography.h2, marginBottom: spacing.xs },
  sectionSubtitle: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.xxl },
  fieldContainer: { marginBottom: spacing.xxl },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  label: { ...typography.label },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionChipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  optionChipText: { ...typography.bodySmall, color: colors.textSecondary },
  optionChipTextSelected: { color: colors.primary, fontFamily: fonts.medium },
  boolRow: { flexDirection: 'row', gap: spacing.md },
  boolOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  boolOptionSelected: { borderColor: colors.success, backgroundColor: colors.successLight },
  boolOptionSelectedNo: { borderColor: colors.error, backgroundColor: colors.errorLight },
  boolText: { ...typography.body, color: colors.textSecondary },
  boolTextSelected: { color: colors.success, fontFamily: fonts.medium },
  boolTextSelectedNo: { color: colors.error, fontFamily: fonts.medium },
});
