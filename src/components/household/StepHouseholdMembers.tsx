import {
    HouseholdFormData,
    HouseholdMember,
    INITIAL_HOUSEHOLD_MEMBER,
    RELATIONSHIP_OPTIONS,
} from '@/src/models/Household';
import { validateMemberForm } from '@/src/utils/householdValidation';
import {
    borderRadius,
    colors,
    fonts,
    spacing,
    typography,
} from '@/styles/global';
import { Ionicons } from '@expo/vector-icons';
import { randomUUID } from 'expo-crypto';
import { useState } from 'react';
import {
    Alert,
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

const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'unknown', label: 'Unknown' },
];

export function StepHouseholdMembers({ formData, updateFormData }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<HouseholdMember | null>(null);
  const [memberForm, setMemberForm] = useState<HouseholdMember>({
    ...INITIAL_HOUSEHOLD_MEMBER,
    id: '',
  });
  const [memberErrors, setMemberErrors] = useState<string[]>([]);

  function openAddModal() {
    setEditingMember(null);
    setMemberForm({ ...INITIAL_HOUSEHOLD_MEMBER, id: randomUUID() });
    setMemberErrors([]);
    setModalVisible(true);
  }

  function openEditModal(member: HouseholdMember) {
    setEditingMember(member);
    setMemberForm({ ...member });
    setMemberErrors([]);
    setModalVisible(true);
  }

  function handleSaveMember() {
    const errors = validateMemberForm(memberForm);
    if (errors.length > 0) {
      setMemberErrors(errors.map((e) => e.message));
      return;
    }

    if (editingMember) {
      // Edit existing
      const updatedMembers = formData.members.map((m) =>
        m.id === editingMember.id ? memberForm : m
      );
      updateFormData({ members: updatedMembers });
    } else {
      // Add new
      updateFormData({ members: [...formData.members, memberForm] });
    }

    setModalVisible(false);
  }

  function handleRemoveMember(memberId: string) {
    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this household member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            updateFormData({
              members: formData.members.filter((m) => m.id !== memberId),
            });
          },
        },
      ]
    );
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
    setMemberForm((prev) => ({ ...prev, birthDate: formatted }));
  }

  const allMembers = [
    { ...formData.headOfHousehold, isHead: true },
    ...formData.members,
  ];

  return (
    <>
      <View style={styles.container}>
        <View style={styles.headerSection}>
          <Text style={styles.sectionTitle}>Household Members</Text>
          <Text style={styles.sectionSubtitle}>
            Add additional members living in this household
          </Text>
        </View>

        <FlatList
          data={allMembers}
          keyExtractor={(item) => item.id || 'head'}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <TouchableOpacity style={styles.addButton} onPress={openAddModal} activeOpacity={0.7}>
              <Ionicons name="add-circle" size={22} color={colors.primary} />
              <Text style={styles.addButtonText}>Add Member</Text>
            </TouchableOpacity>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={40} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No additional members added</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.memberCard}>
              <View style={styles.memberCardLeft}>
                <View style={[styles.memberAvatar, item.isHead && styles.memberAvatarHead]}>
                  <Ionicons
                    name={item.isHead ? 'star' : 'person'}
                    size={18}
                    color={item.isHead ? colors.warning : colors.primary}
                  />
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {[item.firstName, item.middleName, item.lastName].filter(Boolean).join(' ') || 'Unnamed'}
                  </Text>
                  <Text style={styles.memberMeta}>
                    {item.isHead ? 'Head of Household' : item.relationship || 'Member'}
                    {item.sex ? ` • ${item.sex.charAt(0).toUpperCase() + item.sex.slice(1)}` : ''}
                    {item.birthDate ? ` • ${item.birthDate}` : ''}
                  </Text>
                </View>
              </View>
              {!item.isHead && (
                <View style={styles.memberActions}>
                  <TouchableOpacity
                    onPress={() => openEditModal(item)}
                    style={styles.memberActionBtn}
                  >
                    <Ionicons name="pencil" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRemoveMember(item.id)}
                    style={styles.memberActionBtn}
                  >
                    <Ionicons name="trash" size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      </View>

      {/* Add/Edit Member Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingMember ? 'Edit Member' : 'Add Member'}
            </Text>
            <TouchableOpacity onPress={handleSaveMember}>
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {memberErrors.length > 0 && (
              <View style={styles.errorCard}>
                {memberErrors.map((err, i) => (
                  <Text key={i} style={styles.errorCardText}>• {err}</Text>
                ))}
              </View>
            )}

            {/* First Name */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                First Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={memberForm.firstName}
                onChangeText={(text) => setMemberForm((p) => ({ ...p, firstName: text }))}
                placeholder="First name"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="words"
              />
            </View>

            {/* Middle Name */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Middle Name</Text>
              <TextInput
                style={styles.input}
                value={memberForm.middleName}
                onChangeText={(text) => setMemberForm((p) => ({ ...p, middleName: text }))}
                placeholder="Middle name"
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
                style={styles.input}
                value={memberForm.lastName}
                onChangeText={(text) => setMemberForm((p) => ({ ...p, lastName: text }))}
                placeholder="Last name"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="words"
              />
            </View>

            {/* Sex */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Sex <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.optionsRow}>
                {SEX_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.optionChip,
                      memberForm.sex === opt.value && styles.optionChipSelected,
                    ]}
                    onPress={() => setMemberForm((p) => ({ ...p, sex: opt.value as any }))}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        memberForm.sex === opt.value && styles.optionChipTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Birth Date */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Birth Date <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={memberForm.birthDate}
                onChangeText={handleDateChange}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>

            {/* Relationship */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Relationship to Head <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.optionsRow}>
                {RELATIONSHIP_OPTIONS.map((rel) => (
                  <TouchableOpacity
                    key={rel}
                    style={[
                      styles.optionChip,
                      memberForm.relationship === rel && styles.optionChipSelected,
                    ]}
                    onPress={() => setMemberForm((p) => ({ ...p, relationship: rel }))}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        memberForm.relationship === rel && styles.optionChipTextSelected,
                      ]}
                    >
                      {rel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerSection: { padding: spacing.xl, paddingBottom: spacing.md },
  sectionTitle: { ...typography.h2, marginBottom: spacing.xs },
  sectionSubtitle: { ...typography.bodySmall, color: colors.textSecondary },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addButtonText: { ...typography.body, color: colors.primary, fontFamily: fonts.semiBold },
  emptyContainer: { alignItems: 'center', paddingVertical: spacing.xxxl },
  emptyText: { ...typography.bodySmall, color: colors.textTertiary, marginTop: spacing.md },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  memberAvatarHead: { backgroundColor: colors.warningLight },
  memberInfo: { flex: 1 },
  memberName: { ...typography.body, fontFamily: fonts.semiBold, marginBottom: 2 },
  memberMeta: { ...typography.bodySmall, color: colors.textTertiary },
  memberActions: { flexDirection: 'row', gap: spacing.sm },
  memberActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal styles
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { ...typography.h2 },
  modalSaveText: { ...typography.body, color: colors.primary, fontFamily: fonts.semiBold },
  modalContent: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  fieldContainer: { marginBottom: spacing.xl },
  label: { ...typography.label, marginBottom: spacing.sm },
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
  errorCard: {
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  errorCardText: { ...typography.bodySmall, color: colors.error, marginBottom: 2 },
});
