import { runMigrations } from '@/src/db/migrations';
import { colors } from '@/styles/global';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Geist-Light': require('@/assets/fonts/Geist-Light.ttf'),
    'Geist-Regular': require('@/assets/fonts/Geist-Regular.ttf'),
    'Geist-Medium': require('@/assets/fonts/Geist-Medium.ttf'),
    'Geist-SemiBold': require('@/assets/fonts/Geist-SemiBold.ttf'),
    'Geist-Bold': require('@/assets/fonts/Geist-Bold.ttf'),
  });

  useEffect(() => {
    runMigrations();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // White background placeholder while fonts load
  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#ffffff' }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="register-patient"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="register-household"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="record-vital-signs"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="patient/[id]"
          options={{ animation: 'ios_from_right' }}
        />
        <Stack.Screen
          name="patient/[id]/vital-signs-history"
          options={{ animation: 'ios_from_right' }}
        />
        <Stack.Screen
          name="household/[id]"
          options={{ animation: 'ios_from_right' }}
        />
      </Stack>
    </View>
  );
}
