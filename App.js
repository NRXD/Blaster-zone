import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import TokenLoginScreen from './src/screens/TokenLoginScreen';
import DiscordScreen from './src/screens/DiscordScreen';

const Stack = createStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);
  const [initialToken, setInitialToken] = useState(null);

  useEffect(() => {
    // Check for saved token on launch
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync('discord_token');
        if (saved) {
          setInitialToken(saved);
          setInitialRoute('Discord');
        } else {
          setInitialRoute('TokenLogin');
        }
      } catch(e) {
        setInitialRoute('TokenLogin');
      }
    })();
  }, []);

  if (!initialRoute) {
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
          <Stack.Screen name="TokenLogin" component={TokenLoginScreen} />
          <Stack.Screen
            name="Discord"
            component={DiscordScreen}
            initialParams={{ token: initialToken }}
          />
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
