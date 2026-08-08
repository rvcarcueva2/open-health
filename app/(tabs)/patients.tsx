import { useTabBarScroll } from '@/src/components/ScrollContext';
import { createPatient } from '@/src/fhir/patientService';
import { usePatients } from '@/src/hooks/usePatients';
import {
    borderRadius,
    colors,
    fonts,
    globalStyles,
    spacing,
    typography
} from '@/styles/global';
import { Ionicons } from '@expo/vector-icons';
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
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PatientsScreen() {
  const { patients, refresh } = usePatients();
  const { onScroll } = useTabBarScroll();
  const [showForm, setShowForm] = useState(false);
  const [family, setFamily] = useState('');
  const [given, setGiven] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const parsedPatients = patients.map((p) => {
    const data = typeof p.data === 'string' ? JSON.parse(p.data) : p.data;
    return {
      id: data.id,
      name: data.name?.[0]
        ? `${data.name[0].given?.join(' ') ?? ''} ${data.name[0].family ?? ''}`
        : 'Unknown',
      gender: data.gender ?? '—',
      birthDate: data.birthDate ?? '—',
      synced: p.synced === 1,
    };
  });

  const filteredPatients = parsedPatients.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleSave() {
    if (!family.trim() || !given.trim()) {
      Alert.alert('Validation', 'Family and Given name are required.');
      return;
    }

    try {
      await createPatient(given.trim(), family.trim());
      Alert.alert('Success', 'Patient registered successfully.');
      setFamily('');
      setGiven('');
      setShowForm(false);
      refresh();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to register patient.');
    }
  }

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Patients</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={22} color={colors.textOnPrimary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patients..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Patient List */}
      <FlatList
        data={filteredPatients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Patients Found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? 'Try a different search term'
                : 'Tap + to register a new patient'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.patientCard} activeOpacity={0.7}>
            <View style={styles.patientAvatar}>
              <Ionicons name="person" size={20} color={colors.primary} />
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{item.name}</Text>
              <Text style={styles.patientMeta}>
                {item.gender} • DOB: {item.birthDate}
              </Text>
            </View>
            <View style={styles.syncIndicator}>
              <Ionicons
                name={item.synced ? 'cloud-done' : 'cloud-upload-outline'}
                size={16}
                color={item.synced ? colors.success : colors.warning}
              />
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      />

      {/* Register Patient Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Register Patient</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Family Name</Text>
            <TextInput
              style={styles.input}
              value={family}
              onChangeText={setFamily}
              placeholder="e.g., Dela Cruz"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={styles.inputLabel}>Given Name</Text>
            <TextInput
              style={styles.input}
              value={given}
              onChangeText={setGiven}
              placeholder="e.g., Juan"
              placeholderTextColor={colors.textTertiary}
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark" size={20} color={colors.textOnPrimary} />
              <Text style={styles.saveButtonText}>Register Patient</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    ...typography.h1,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    ...typography.body,
    fontFamily: fonts.semiBold,
    marginBottom: 2,
  },
  patientMeta: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
  syncIndicator: {
    marginRight: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    ...typography.h2,
  },
  modalContent: {
    padding: spacing.xl,
  },
  inputLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
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
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxxl,
  },
  saveButtonText: {
    ...typography.h3,
    color: colors.textOnPrimary,
  },
});
