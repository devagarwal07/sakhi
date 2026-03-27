import React, { createContext, useContext, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DriverSplashScreen from './src/screens/Auth/DriverSplashScreen';

// ---------------------------------------------------------------------------
// Auth Context (placeholder — will be fully implemented in Prompt 2)
// ---------------------------------------------------------------------------
const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [driver, setDriver] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const value = {
    driver,
    isLoading,
    isAuthenticated,
    setDriver,
    setIsLoading,
    setIsAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Root Navigator
// ---------------------------------------------------------------------------
const Stack = createNativeStackNavigator();

function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DriverSplash" component={DriverSplashScreen} />
    </Stack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// App Root
// ---------------------------------------------------------------------------
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
