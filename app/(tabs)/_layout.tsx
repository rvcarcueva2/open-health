import { FloatingTabBar } from '@/src/components/FloatingTabBar';
import { ScrollProvider } from '@/src/components/ScrollContext';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <ScrollProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          animation: 'shift',
        }}
        tabBar={(props) => <FloatingTabBar {...props} />}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="patients" options={{ title: 'Patients' }} />
        <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      </Tabs>
    </ScrollProvider>
  );
}
