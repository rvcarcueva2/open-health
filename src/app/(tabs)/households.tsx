import { useTabBarScroll } from '@/src/components/ScrollContext';
import { useHouseholds } from '@/src/hooks/useHouseholds';
import { FHIRGroup, HEALTH_INDICATOR_CONFIG } from '@/src/models/Household';
import { extractAddressFromGroup, extractMembersFromGroup } from '@/src/utils/householdMapper';
import {
  borderRadius,
  colors,
  fonts,
  globalStyles,
  spacing,
  typography,
} from '@/styles/global';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HOUSEHOLD_EXTENSION_BASE = 'urn:household:extension';

export default function HouseholdsScreen() {
  const { households, refresh } = useHouseholds();
  const { onScroll } = useTabBarScroll();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedIndicators, setSelectedIndicators] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  function toggleIndicatorFilter(key: string) {
    setSelectedIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const parsedHouseholds = households.map((h) => {
    const data: FHIRGroup = typeof h.data === 'string' ? JSON.parse(h.data) : h.data;
    const address = extractAddressFromGroup(data);
    const { head, members } = extractMembersFromGroup(data);
    const memberCount = 1 + members.length;

    // Extract health indicator keys from extensions
    const indicatorKeys: string[] = (data.extension ?? [])
      .filter((e) => e.url?.includes('/health-indicator/'))
      .map((e) => e.url?.split('/').pop() || '')
      .filter(Boolean);

    return {
      id: data.id,
      name: data.name || 'Unnamed Household',
      identifier: data.identifier?.[0]?.value || '',
      address,
      memberCount,
      headName: head
        ? [head.firstName, head.lastName].filter(Boolean).join(' ')
        : '',
      synced: h.synced === 1,
      indicatorKeys,
    };
  });

  // Apply search filter
  let filteredHouseholds = parsedHouseholds.filter((h) =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.headName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Apply health indicator filter
  if (selectedIndicators.size > 0) {
    filteredHouseholds = filteredHouseholds.filter((h) =>
      Array.from(selectedIndicators).every((key) => h.indicatorKeys.includes(key))
    );
  }

  const activeFilterCount = selectedIndicators.size;

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Households</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/register-household')}
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
          placeholder="Search households..."
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

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
          onPress={() => setFilterVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="filter"
            size={16}
            color={activeFilterCount > 0 ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.filterButtonText, activeFilterCount > 0 && styles.filterButtonTextActive]}>
            {activeFilterCount > 0 ? `Indicators (${activeFilterCount})` : 'Indicators'}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={activeFilterCount > 0 ? colors.primary : colors.textTertiary}
          />
        </TouchableOpacity>
        <Text style={styles.totalCount}>
          {filteredHouseholds.length} household{filteredHouseholds.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Household List */}
      <FlatList
        data={filteredHouseholds}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="house-medical" size={44} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Households Found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || activeFilterCount > 0
                ? 'Try adjusting your search or filters'
                : 'Tap + to register a new household'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.householdCard}
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/household/[id]', params: { id: item.id } })}
          >
            <View style={styles.householdAvatar}>
              <FontAwesome6 name="house-medical" size={18} color={colors.primary} />
            </View>
            <View style={styles.householdInfo}>
              <Text style={styles.householdName}>{item.name}</Text>
              <Text style={styles.householdMeta}>
                {item.identifier ? `#${item.identifier} • ` : ''}
                {item.memberCount} member{item.memberCount > 1 ? 's' : ''}
              </Text>
              {item.address ? (
                <Text style={styles.householdAddress} numberOfLines={1}>
                  {item.address}
                </Text>
              ) : null}
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

      {/* Health Indicator Filter Modal */}
      <Modal visible={filterVisible} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFilterVisible(false)}
        >
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Filter by Health Indicators</Text>
              {activeFilterCount > 0 && (
                <TouchableOpacity onPress={() => setSelectedIndicators(new Set())}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            {HEALTH_INDICATOR_CONFIG.map((indicator) => {
              const isSelected = selectedIndicators.has(indicator.key);
              return (
                <TouchableOpacity
                  key={indicator.key}
                  style={styles.dropdownItem}
                  onPress={() => toggleIndicatorFilter(indicator.key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dropdownIcon, { backgroundColor: indicator.color + '14' }]}>
                    {indicator.iconLibrary === 'fontawesome6' ? (
                      <FontAwesome6 name={indicator.icon} size={14} color={indicator.color} />
                    ) : (
                      <Ionicons name={indicator.icon as any} size={16} color={indicator.color} />
                    )}
                  </View>
                  <Text style={[styles.dropdownLabel, isSelected && styles.dropdownLabelSelected]}>
                    {indicator.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
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
    marginBottom: spacing.sm,
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
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  filterButtonText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: colors.primary,
    fontFamily: fonts.medium,
  },
  totalCount: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontFamily: fonts.medium,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  householdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  householdAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  householdInfo: {
    flex: 1,
  },
  householdName: {
    ...typography.body,
    fontFamily: fonts.semiBold,
    marginBottom: 2,
  },
  householdMeta: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
  householdAddress: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
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

  // Filter Dropdown Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    paddingTop: 200,
    paddingHorizontal: spacing.xl,
  },
  dropdownContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  dropdownTitle: {
    ...typography.h3,
  },
  clearText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontFamily: fonts.medium,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  dropdownIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownLabel: {
    ...typography.body,
    flex: 1,
    color: colors.textSecondary,
  },
  dropdownLabelSelected: {
    color: colors.text,
    fontFamily: fonts.medium,
  },
});
