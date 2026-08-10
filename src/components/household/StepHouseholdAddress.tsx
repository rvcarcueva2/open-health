import {
    AddressOption,
    getBarangaysByCity,
    getCitiesByProvince,
    getProvincesByRegion,
    getRegions,
} from '@/src/data/philippineAddress';
import { HouseholdFormData } from '@/src/models/Household';
import {
    borderRadius,
    colors,
    fonts,
    spacing,
    typography,
} from '@/styles/global';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    FlatList,
    Modal,
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
}

type AddressField = 'region' | 'province' | 'city' | 'barangay';

export function StepHouseholdAddress({ formData, updateFormData }: Props) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerField, setPickerField] = useState<AddressField>('region');
  const [pickerOptions, setPickerOptions] = useState<AddressOption[]>([]);
  const [pickerTitle, setPickerTitle] = useState('');
  const [searchText, setSearchText] = useState('');

  function openPicker(field: AddressField) {
    let options: AddressOption[] = [];
    let title = '';

    switch (field) {
      case 'region':
        options = getRegions();
        title = 'Select Region';
        break;
      case 'province':
        options = getProvincesByRegion(formData.regionCode);
        title = 'Select Province';
        break;
      case 'city':
        options = getCitiesByProvince(formData.provinceCode);
        title = 'Select City / Municipality';
        break;
      case 'barangay':
        options = getBarangaysByCity(formData.cityCode);
        title = 'Select Barangay';
        break;
    }

    setPickerField(field);
    setPickerOptions(options);
    setPickerTitle(title);
    setSearchText('');
    setPickerVisible(true);
  }

  function handlePickerSelect(option: AddressOption) {
    switch (pickerField) {
      case 'region':
        updateFormData({
          regionCode: option.code,
          regionDisplay: option.display,
          provinceCode: '',
          provinceDisplay: '',
          cityCode: '',
          cityDisplay: '',
          barangayCode: '',
          barangayDisplay: '',
        });
        break;
      case 'province':
        updateFormData({
          provinceCode: option.code,
          provinceDisplay: option.display,
          cityCode: '',
          cityDisplay: '',
          barangayCode: '',
          barangayDisplay: '',
        });
        break;
      case 'city':
        updateFormData({
          cityCode: option.code,
          cityDisplay: option.display,
          barangayCode: '',
          barangayDisplay: '',
        });
        break;
      case 'barangay':
        updateFormData({
          barangayCode: option.code,
          barangayDisplay: option.display,
        });
        break;
    }
    setPickerVisible(false);
  }

  const filteredOptions = pickerOptions.filter((o) =>
    o.display.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Address Information</Text>
        <Text style={styles.sectionSubtitle}>
          Select the household address using PSGC codes
        </Text>

        {/* Region */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Region</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => openPicker('region')}
            activeOpacity={0.7}
          >
            <Text style={[styles.pickerButtonText, !formData.regionDisplay && styles.pickerPlaceholder]}>
              {formData.regionDisplay || 'Select Region'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Province */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Province</Text>
          <TouchableOpacity
            style={[styles.pickerButton, !formData.regionCode && styles.pickerDisabled]}
            onPress={() => formData.regionCode && openPicker('province')}
            activeOpacity={0.7}
            disabled={!formData.regionCode}
          >
            <Text style={[styles.pickerButtonText, !formData.provinceDisplay && styles.pickerPlaceholder]}>
              {formData.provinceDisplay || 'Select Province'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          {!formData.regionCode && <Text style={styles.hint}>Select a region first</Text>}
        </View>

        {/* City / Municipality */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>City / Municipality</Text>
          <TouchableOpacity
            style={[styles.pickerButton, !formData.provinceCode && styles.pickerDisabled]}
            onPress={() => formData.provinceCode && openPicker('city')}
            activeOpacity={0.7}
            disabled={!formData.provinceCode}
          >
            <Text style={[styles.pickerButtonText, !formData.cityDisplay && styles.pickerPlaceholder]}>
              {formData.cityDisplay || 'Select City / Municipality'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          {!formData.provinceCode && <Text style={styles.hint}>Select a province first</Text>}
        </View>

        {/* Barangay */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Barangay</Text>
          <TouchableOpacity
            style={[styles.pickerButton, !formData.cityCode && styles.pickerDisabled]}
            onPress={() => formData.cityCode && openPicker('barangay')}
            activeOpacity={0.7}
            disabled={!formData.cityCode}
          >
            <Text style={[styles.pickerButtonText, !formData.barangayDisplay && styles.pickerPlaceholder]}>
              {formData.barangayDisplay || 'Select Barangay'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          {!formData.cityCode && <Text style={styles.hint}>Select a city/municipality first</Text>}
        </View>

        {/* Street Address */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Street Address</Text>
          <TextInput
            style={styles.input}
            value={formData.streetAddress}
            onChangeText={(text) => updateFormData({ streetAddress: text })}
            placeholder="e.g., Rizal Street"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
          />
        </View>

        {/* House Number */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>House Number</Text>
          <TextInput
            style={styles.input}
            value={formData.houseNumber}
            onChangeText={(text) => updateFormData({ houseNumber: text })}
            placeholder="e.g., 123"
            placeholderTextColor={colors.textTertiary}
          />
        </View>
      </ScrollView>

      {/* Address Picker Modal */}
      <Modal visible={pickerVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => setPickerVisible(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.pickerTitle}>{pickerTitle}</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.pickerSearch}>
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <TextInput
              style={styles.pickerSearchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search..."
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => item.code}
            contentContainerStyle={styles.pickerList}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {pickerOptions.length === 0 ? 'No options available' : 'No results found'}
              </Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerOption}
                onPress={() => handlePickerSelect(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerOptionText}>{item.display}</Text>
                <Text style={styles.pickerOptionCode}>{item.code}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  sectionTitle: { ...typography.h2, marginBottom: spacing.xs },
  sectionSubtitle: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.xxl },
  fieldContainer: { marginBottom: spacing.xl },
  label: { ...typography.label, marginBottom: spacing.sm },
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
  hint: { ...typography.caption, marginTop: spacing.xs },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerDisabled: { opacity: 0.5 },
  pickerButtonText: { ...typography.body, color: colors.text, flex: 1 },
  pickerPlaceholder: { color: colors.textTertiary },
  pickerModal: { flex: 1, backgroundColor: colors.background },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerTitle: { ...typography.h2 },
  pickerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xl,
    marginVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerSearchInput: { flex: 1, marginLeft: spacing.sm, ...typography.body, color: colors.text },
  pickerList: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerOptionText: { ...typography.body, fontFamily: fonts.medium, flex: 1 },
  pickerOptionCode: { ...typography.caption, color: colors.textTertiary },
  emptyText: { ...typography.body, color: colors.textTertiary, textAlign: 'center', paddingVertical: spacing.xxl },
});
