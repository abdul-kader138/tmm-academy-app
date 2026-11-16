import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { Colors } from './src/theme/colors';

function MainApp() {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.canvas }}>
      <StatusBar style="dark" />
      {Platform.OS === 'android' && (
        <NavigationBar style="dark" />
      )}
      <AppErrorBoundary>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </AppErrorBoundary>

      {/* Solid bottom strip matching bottom tab/surface (#FFFFFF) so content and navigation buttons seamlessly match */}
      {insets.bottom > 0 && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: insets.bottom,
            backgroundColor: '#FFFFFF',
            zIndex: 9999,
            elevation: 9999,
          }}
          pointerEvents="none"
        />
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}
