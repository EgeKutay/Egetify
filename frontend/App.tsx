import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { useAuthStore } from './src/store/authStore';
import { configureGoogleSignIn } from './src/services/authService';
import AppNavigator from './src/navigation/AppNavigator';
import { Colors } from './src/theme/colors';

export default function App() {
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    // Configure Google Sign-In SDK and restore session on launch
    configureGoogleSignIn();
    checkAuth();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={Colors.background} />
        <NavigationContainer>
          <AppNavigator isAuthenticated={isAuthenticated} />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
});
