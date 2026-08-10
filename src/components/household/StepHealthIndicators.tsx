import { HEALTH_INDICATOR_CONFIG, HouseholdFormData, HouseholdHealthIndicators } from '@/src/models/Household';
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
  updateFormData: (updates: Partial<HouseholdFormData>) => void;
}

const INDICATORS = HEALTH_INDICATOR_CONFIG;

export function StepHealthIndicators({ formData, updateFormData }: Props) {
  const indicators = formData.healthIndicators;

  function toggleIndicator(key: keyof HouseholdHealthIndicators) {
    updateFormData({
      healthIndicators: {
        ...indicators,
        [key]: !indicators[key],
      },
    });
  }

  const activeCount = Object.values(indicators).filter(Boolean).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionTitle}>Health Indicators</Text>
      <Text style={styles.sectionSubtitle}>
        Select all applicable health indicators for this household
      </Text>

      {activeCount > 0 && (
        <View style={styles.summaryBadge}>
          <Ionicons name="alert-circle" size={16} color={colors.warning} />
          <Text style={styles.summaryText}>
            {activeCount} indicator{activeCount > 1 ? 's' : ''} identified
          </Text>
        </View>
      )}

      {INDICATORS.map((indicator) => {
        const isActive = indicators[indicator.key];
        return (
          <TouchableOpacity
            key={indicator.key}
            style={[styles.indicatorCard, isActive && styles.indicatorCardActive]}
            onPress={() => toggleIndicator(indicator.key)}
            activeOpacity={0.7}
          >
            <View style={[styles.indicatorIcon, { backgroundColor: indicator.color + '14' }]}>
              {indicator.iconLibrary === 'fontawesome6' ? (
                <FontAwesome6 name={indicator.icon} size={18} color={indicator.color} />
              ) : (
                <Ionicons name={indicator.icon as any} size={20} color={indicator.color} />
              )}
            </View>
            <Text style={[styles.indicatorLabel, isActive && styles.indicatorLabelActive]}>
              {indicator.label}
            </Text>
            <View style={[styles.checkbox, isActive && styles.checkboxActive]}>
              {isActive && <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} />}
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={20} color={colors.info} />
        <Text style={styles.infoText}>
          These indicators help target health interventions and support public health reporting.
          They can be updated during future visits.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  sectionTitle: { ...typography.h2, marginBottom: spacing.xs },
  sectionSubtitle: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.xl },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryText: { ...typography.bodySmall, color: colors.warning, fontFamily: fonts.medium },
  indicatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  indicatorCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  indicatorIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  indicatorLabel: { ...typography.body, flex: 1, color: colors.textSecondary },
  indicatorLabelActive: { color: colors.text, fontFamily: fonts.medium },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  infoText: { ...typography.bodySmall, color: colors.info, flex: 1, lineHeight: 18 },
});
