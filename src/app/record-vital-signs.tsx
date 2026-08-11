import { usePatients } from '@/src/hooks/usePatients';
import { FHIRPatient } from '@/src/models/Patient';
import {
    borderRadius,
    colors,
    fonts,
    spacing,
    typography,
} from '@/styles/global';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RecordVitalSignsScreen() {
  const { patients } = usePatients();
  const [search, setSearch] = useState('');

  const allPatients: FHIRPatient[] = useMemo(() => {
    return patients.map((p) => {
      return typeof p.data === 'string' ? JSON.parse(p.data) : p.data;
    });
  }, [patients]);

  const filteredPatients = useMemo(() => {
    if (!search.trim()) return allPatients;
    const query = search.toLowerCase();
    return allPatients.filter((p) => {
      const name = p.name?.[0];
      const fullName = `${name?.given?.join(' ') ?? ''} ${name?.family ?? ''}`.toLowerCase();
      return fullName.includes(query);
    });
  }, [allPatients, search]);

  function handleSelectPatient(patientId: string) {
    router.push({ pathname: '/patient/[id]/vital-signs-history', params: { id: patientId } });
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Record Vital Signs</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search patient by name..."
          placeholderTextColor={colors.textTertiary}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.subtitle}>Select a patient to record vital signs</Text>

      {/* Patient List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filteredPatients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>
              {allPatients.length === 0 ? 'No patients registered' : 'No patients found'}
            </Text>
            <Text style={styles.emptySubtext}>
              {allPatients.length === 0
                ? 'Register a patient first before recording vital signs'
                : 'Try a different search term'}
            </Text>
          </View>
        ) : (
          filteredPatients.map((patient) => {
            const name = patient.name?.[0];
            const fullName = name
              ? `${name.given?.[0] ?? ''} ${name.given?.[1] ? `${name.given[1].charAt(0)}. ` : ''}${name.family ?? ''}`.trim()
              : 'Unknown';
            const gender = patient.gender ?? '—';
            const birthDate = patient.birthDate ?? '—';

            return (
              <TouchableOpacity
                key={patient.id}
                style={styles.patientCard}
                onPress={() => handleSelectPatient(patient.id)}
                activeOpacity={0.7}
              >
                <View style={styles.patientAvatar}>
                  <Ionicons name="person" size={20} color={colors.primary} />
                </View>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{fullName}</Text>
                  <Text style={styles.patientMeta}>
                    {gender.charAt(0).toUpperCase() + gender.slice(1)} • {birthDate}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
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
});
