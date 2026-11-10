import React from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { Colors } from './src/theme/colors';

function MainApp() {
  const insets = useSafeAreaInsets();

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

      {/* Solid bottom strip matching page background so content never clashes behind Android navigation buttons */}
      {insets.bottom > 0 && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: insets.bottom,
            backgroundColor: Colors.canvas,
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
