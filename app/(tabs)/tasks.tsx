import { useTabBarScroll } from '@/src/components/ScrollContext';
import {
    borderRadius,
    colors,
    globalStyles,
    spacing,
    typography,
} from '@/styles/global';
import { Ionicons } from '@expo/vector-icons';
import { SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TaskItem {
  id: string;
  patientName: string;
  type: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'overdue';
  icon: keyof typeof Ionicons.glyphMap;
}

const TASKS_DATA: { title: string; data: TaskItem[] }[] = [
  {
    title: 'Prenatal Follow-ups',
    data: [
      {
        id: '1',
        patientName: 'Ana Reyes',
        type: 'Prenatal Checkup - 3rd Trimester',
        dueDate: 'Today, 9:00 AM',
        status: 'pending',
        icon: 'woman',
      },
      {
        id: '2',
        patientName: 'Maria Garcia',
        type: 'Prenatal Checkup - 2nd Trimester',
        dueDate: 'Tomorrow, 10:00 AM',
        status: 'pending',
        icon: 'woman',
      },
    ],
  },
  {
    title: 'Immunizations',
    data: [
      {
        id: '3',
        patientName: 'Carlos Bautista',
        type: 'BCG Vaccination',
        dueDate: 'Today, 10:30 AM',
        status: 'pending',
        icon: 'medical',
      },
      {
        id: '4',
        patientName: 'Luna Santos',
        type: 'OPV Dose 2',
        dueDate: 'Today, 2:00 PM',
        status: 'pending',
        icon: 'medical',
      },
    ],
  },
  {
    title: 'Medication Follow-ups',
    data: [
      {
        id: '5',
        patientName: 'Elena Soriano',
        type: 'Hypertension Medication Review',
        dueDate: 'Today, 1:00 PM',
        status: 'pending',
        icon: 'medkit',
      },
    ],
  },
  {
    title: 'Household Visits',
    data: [
      {
        id: '6',
        patientName: 'Household - Dela Cruz',
        type: 'Routine Home Visit',
        dueDate: 'Today, 3:00 PM',
        status: 'pending',
        icon: 'home',
      },
    ],
  },
];

export default function TasksScreen() {
  const { onScroll } = useTabBarScroll();
  const statusColors = {
    pending: colors.warning,
    completed: colors.success,
    overdue: colors.error,
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity style={[styles.filterChip, styles.filterChipActive]}>
            <Text style={styles.filterChipTextActive}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>This Week</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Overdue</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SectionList
        sections={TASKS_DATA}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.taskCard} activeOpacity={0.7}>
            <View style={[styles.taskIcon, { backgroundColor: statusColors[item.status] + '14' }]}>
              <Ionicons name={item.icon} size={18} color={statusColors[item.status]} />
            </View>
            <View style={styles.taskContent}>
              <Text style={styles.taskPatient}>{item.patientName}</Text>
              <Text style={styles.taskType}>{item.type}</Text>
              <Text style={styles.taskDue}>{item.dueDate}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + '14' }]}>
              <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.lg,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textSecondary,
  },
  sectionCount: {
    ...typography.caption,
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    fontWeight: '700',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  taskContent: {
    flex: 1,
  },
  taskPatient: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  taskType: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  taskDue: {
    ...typography.caption,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
