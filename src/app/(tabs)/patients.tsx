import { useTabBarScroll } from '@/src/components/ScrollContext';
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
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
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
  const [searchQuery, setSearchQuery] = useState('');

  // Refresh patient list when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

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

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Patients</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/register-patient')}
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
          <TouchableOpacity
            style={styles.patientCard}
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/patient/[id]', params: { id: item.id } })}
          >
            <View style={styles.patientAvatar}>
              <Ionicons name="person" size={20} color={colors.primary} />
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{item.name}</Text>
              <Text style={styles.patientMeta}>
                {item.gender.charAt(0).toUpperCase() + item.gender.slice(1)} • {item.birthDate}
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
});
