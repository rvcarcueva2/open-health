import { useTabBarScroll } from '@/src/components/ScrollContext';
import { usePatients } from '@/src/hooks/usePatients';
import { isOnline } from '@/src/sync/networkMonitor';
import { getPendingQueueItems } from '@/src/sync/syncQueue';
import { syncNow } from '@/src/sync/syncService';
import {
  borderRadius,
  colors,
  fonts,
  globalStyles,
  spacing,
  typography
} from '@/styles/global';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SyncStatus = 'online' | 'offline' | 'syncing';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const { patients, refresh: refreshPatients } = usePatients();
  const { onScroll } = useTabBarScroll();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const checkStatus = useCallback(async () => {
    const online = await isOnline();
    if (syncStatus !== 'syncing') {
      setSyncStatus(online ? 'online' : 'offline');
    }
    const pending = await getPendingQueueItems();
    setPendingCount(pending.length);
  }, [syncStatus]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  async function handleSync() {
    setSyncStatus('syncing');
    try {
      await syncNow();
      setLastSynced(new Date().toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
      }));
      const pending = await getPendingQueueItems();
      setPendingCount(pending.length);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      const online = await isOnline();
      setSyncStatus(online ? 'online' : 'offline');
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await checkStatus();
    await refreshPatients();
    setRefreshing(false);
  }

  const recentPatients = patients.slice(0, 5).map((p) => {
    const data = typeof p.data === 'string' ? JSON.parse(p.data) : p.data;
    return {
      id: data.id,
      name: data.name?.[0]
        ? `${data.name[0].given?.join(' ') ?? ''} ${data.name[0].family ?? ''}`
        : 'Unknown',
      gender: data.gender ?? '—',
      birthDate: data.birthDate ?? '—',
    };
  });

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      >
        {/* Welcome Header - Blue background */}
        <SafeAreaView style={styles.headerBackground}>
          <View style={styles.welcomeHeader}>
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.workerName}>Maria Santos, RN</Text>
              <Text style={styles.facilityName}>Brgy. Health Station - Barangay 12</Text>
              <Text style={styles.dateText}>{formatDate()}</Text>
            </View>
            <View style={styles.avatarContainer}>
              <Ionicons name="person-circle" size={52} color="#ffffff" />
            </View>
          </View>
        </SafeAreaView>

        {/* White content container */}
        <View style={styles.contentContainer}>
          {/* Sync Status Card */}
          <View style={styles.syncCard}>
            <View style={styles.syncHeader}>
              <View style={styles.syncStatusRow}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: syncStatus === 'online' ? colors.online : syncStatus === 'syncing' ? colors.syncing : colors.offline }
                ]} />
                <Text style={styles.syncStatusText}>
                  {syncStatus === 'online' ? 'Online' : syncStatus === 'syncing' ? 'Syncing...' : 'Offline'}
                </Text>
              </View>
              <Ionicons
                name={syncStatus === 'online' ? 'cloud-done' : syncStatus === 'syncing' ? 'sync' : 'cloud-offline'}
                size={22}
                color={syncStatus === 'online' ? colors.online : syncStatus === 'syncing' ? colors.syncing : colors.offline}
              />
            </View>

            <View style={styles.syncDetails}>
              <View style={styles.syncDetailItem}>
                <Text style={styles.syncDetailValue}>{pendingCount}</Text>
                <Text style={styles.syncDetailLabel}>Pending</Text>
              </View>
              <View style={styles.syncDivider} />
              <View style={styles.syncDetailItem}>
                <Text style={styles.syncDetailValue}>{lastSynced ?? '—'}</Text>
                <Text style={styles.syncDetailLabel}>Last Sync</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.syncButton,
                syncStatus === 'syncing' && styles.syncButtonDisabled,
              ]}
              onPress={handleSync}
              disabled={syncStatus === 'syncing'}
              activeOpacity={0.7}
            >
              <Ionicons name="sync" size={18} color={colors.textOnPrimary} />
              <Text style={styles.syncButtonText}>
                {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              <QuickActionCard
                icon="person-add"
                label="Register   Patient"
                color="#1a57ad"
                onPress={() => router.push('/patients')}
              />
              <QuickActionCard
                icon="home"
                iconLibrary="fontawesome6"
                faIcon="house-medical-circle-check"
                label="Register Household"
                color="#2e7d5b"
                onPress={() => {}}
              />
              <QuickActionCard
                icon="heart"
                label="Record Vital Signs"
                color="#c62828"
                onPress={() => {}}
              />
              <QuickActionCard
                icon="medical"
                label="Record Immunization"
                color="#6a1b9a"
                onPress={() => {}}
              />
              <QuickActionCard
                icon="medkit"
                label="Record Medication"
                color="#f57c00"
                onPress={() => {}}
              />
              <QuickActionCard
                icon="woman"
                label="Prenatal                          Visit"
                color="#00838f"
                onPress={() => {}}
              />
            </View>
          </View>

          {/* Today's Activities */}
          <View style={styles.section}>
            <View style={globalStyles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Activities</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            <ActivityItem
              patientName="Ana Reyes"
              activityType="Prenatal Follow-up"
              dueDate="Today, 9:00 AM"
              status="pending"
              icon="woman"
            />
            <ActivityItem
              patientName="Carlos Bautista"
              activityType="Immunization - BCG"
              dueDate="Today, 10:30 AM"
              status="pending"
              icon="medical"
            />
            <ActivityItem
              patientName="Elena Soriano"
              activityType="Medication Follow-up"
              dueDate="Today, 1:00 PM"
              status="pending"
              icon="medkit"
            />
            <ActivityItem
              patientName="Household - Dela Cruz"
              activityType="Home Visit"
              dueDate="Today, 3:00 PM"
              status="pending"
              icon="home"
              iconLibrary="fontawesome6"
              faIcon="house-medical"
            />
          </View>

          {/* Recent Patients */}
          <View style={styles.section}>
            <View style={globalStyles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Patients</Text>
              <TouchableOpacity onPress={() => router.push('/patients')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {recentPatients.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="people-outline" size={40} color={colors.textTertiary} />
                <Text style={styles.emptyText}>No patients registered yet</Text>
                <Text style={styles.emptySubtext}>
                  Tap "Register Patient" to add your first patient
                </Text>
              </View>
            ) : (
              recentPatients.map((patient) => (
                <TouchableOpacity
                  key={patient.id}
                  style={styles.patientCard}
                  activeOpacity={0.7}
                >
                  <View style={styles.patientAvatar}>
                    <Ionicons name="person" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{patient.name}</Text>
                    <Text style={styles.patientMeta}>
                      {patient.gender} • DOB: {patient.birthDate}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// --- Quick Action Card Component ---
function QuickActionCard({
  icon,
  iconLibrary,
  faIcon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconLibrary?: 'ionicons' | 'fontawesome6';
  faIcon?: string;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionCard, { backgroundColor: color + '12' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {iconLibrary === 'fontawesome6' && faIcon ? (
        <FontAwesome6 name={faIcon} size={24} color={color} />
      ) : (
        <Ionicons name={icon} size={26} color={color} />
      )}
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// --- Activity Item Component ---
function ActivityItem({
  patientName,
  activityType,
  dueDate,
  status,
  icon,
  iconLibrary,
  faIcon,
}: {
  patientName: string;
  activityType: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'overdue';
  icon: keyof typeof Ionicons.glyphMap;
  iconLibrary?: 'ionicons' | 'fontawesome6';
  faIcon?: string;
}) {
  const statusColors = {
    pending: colors.warning,
    completed: colors.success,
    overdue: colors.error,
  };

  return (
    <TouchableOpacity style={styles.activityCard} activeOpacity={0.7}>
      <View style={[styles.activityIcon, { backgroundColor: statusColors[status] + '14' }]}>
        {iconLibrary === 'fontawesome6' && faIcon ? (
          <FontAwesome6 name={faIcon} size={16} color={statusColors[status]} />
        ) : (
          <Ionicons name={icon} size={18} color={statusColors[status]} />
        )}
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityPatient}>{patientName}</Text>
        <Text style={styles.activityType}>{activityType}</Text>
        <Text style={styles.activityDue}>{dueDate}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: statusColors[status] + '14' }]}>
        <Text style={[styles.statusBadgeText, { color: statusColors[status] }]}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1a57ad',
  },

  // Header - Blue background
  headerBackground: {
    backgroundColor: '#1a57ad',
    paddingHorizontal: spacing.xl,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  greeting: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  workerName: {
    ...typography.h1,
    color: '#ffffff',
    marginBottom: 4,
  },
  facilityName: {
    ...typography.body,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  dateText: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.6)',
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // White content container
  contentContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    marginTop: -spacing.md,
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
    minHeight: 600,
  },

  // Sync Card
  syncCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  syncHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  syncStatusText: {
    ...typography.h3,
  },
  syncDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  syncDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  syncDetailValue: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 2,
  },
  syncDetailLabel: {
    ...typography.caption,
  },
  syncDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  syncButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  syncButtonDisabled: {
    backgroundColor: colors.textTertiary,
  },
  syncButtonText: {
    ...typography.h3,
    color: colors.textOnPrimary,
  },

  // Sections
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.h2,
    marginBottom: spacing.lg,
  },
  viewAllText: {
    ...typography.body,
    color: colors.primary,
    fontFamily: fonts.semiBold,
  },

  // Quick Actions Grid
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  actionCard: {
    width: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  actionLabel: {
    ...typography.caption,
    fontFamily: fonts.medium,
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  // Activity Items
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityPatient: {
    ...typography.body,
    fontFamily: fonts.semiBold,
    marginBottom: 2,
  },
  activityType: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  activityDue: {
    ...typography.caption,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Patient Cards
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

  // Empty State
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
