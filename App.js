import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import LoginScreen from './src/screens/LoginScreen';
import DiscordScreen from './src/screens/DiscordScreen';
import AccountsScreen from './src/screens/AccountsScreen';

const Stack = createStackNavigator();

export default function App() {
  const [ready, setReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState('Login');
  const [initialParams, setInitialParams] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const active = await SecureStore.getItemAsync('active_account');
        if (active) {
          const acc = JSON.parse(active);
          setInitialRoute('Discord');
          setInitialParams({ account: acc });
        }
      } catch (e) {}
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: '#7c3aed',
            background: '#0a0a0f',
            card: '#0f0f18',
            text: '#ffffff',
            border: '#1e1e30',
            notification: '#7c3aed'
          }
        }}
      >
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{ headerShown: false, animationEnabled: true }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen
            name="Discord"
            component={DiscordScreen}
            initialParams={initialParams}
          />
          <Stack.Screen name="Accounts" component={AccountsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
