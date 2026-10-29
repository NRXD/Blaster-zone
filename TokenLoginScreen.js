import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  Alert, ScrollView, Linking
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';

export default function TokenLoginScreen({ navigation }) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  async function handleLogin() {
    const t = token.trim();
    if (!t) {
      Alert.alert('No token', 'Paste your Discord token first.');
      return;
    }
    setLoading(true);
    try {
      await SecureStore.setItemAsync('discord_token', t);
      navigation.replace('Discord', { token: t });
    } catch(e) {
      Alert.alert('Error', 'Could not save token: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function pasteFromClipboard() {
    const text = await Clipboard.getStringAsync();
    if (text) setToken(text);
  }

  function skipToNormal() {
    navigation.replace('Discord', { token: null });
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo / Title */}
        <View style={s.header}>
          <Text style={s.logo}>💥</Text>
          <Text style={s.title}>BlasterZone</Text>
          <Text style={s.sub}>Discord · Full Power</Text>
        </View>

        {/* Token input */}
        <View style={s.card}>
          <Text style={s.label}>DISCORD TOKEN</Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              value={token}
              onChangeText={setToken}
              placeholder="Paste your token here..."
              placeholderTextColor="#555"
              secureTextEntry={!show}
              autoCapitalize="none"
              autoCorrect={false}
              multiline={false}
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShow(!show)}>
              <Text style={s.eyeIcon}>{show ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.pasteBtn} onPress={pasteFromClipboard}>
            <Text style={s.pasteBtnText}>📋 Paste from Clipboard</Text>
          </TouchableOpacity>

          {/* How to get token */}
          <TouchableOpacity
            style={s.helpBtn}
            onPress={() => Alert.alert(
              'How to get your token',
              '1. Open Discord in a browser (not app)\n' +
              '2. Press F12 → Console tab\n' +
              '3. Paste this and hit Enter:\n\n' +
              'window.webpackChunkdiscord_app.push([' +
              '[Math.random()],{},req=>{for(const m of Object.keys(req.c).map(x=>req.c[x]).filter(x=>x?.exports?.default?.getToken))' +
              'copy(m.exports.default.getToken())}]);\n\n' +
              '4. Your token is now in your clipboard.',
              [{text: 'OK'}]
            )}
          >
            <Text style={s.helpText}>❓ How to get my token</Text>
          </TouchableOpacity>
        </View>

        {/* Login button */}
        <TouchableOpacity
          style={[s.loginBtn, loading && s.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={s.loginBtnText}>
            {loading ? 'Logging in...' : '⚡ LOGIN WITH TOKEN'}
          </Text>
        </TouchableOpacity>

        {/* Skip to normal login */}
        <TouchableOpacity style={s.skipBtn} onPress={skipToNormal}>
          <Text style={s.skipText}>Use normal Discord login instead →</Text>
        </TouchableOpacity>

        {/* Warning */}
        <Text style={s.warning}>
          ⚠ Never share your token. BlasterZone stores it encrypted on your device only.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const ACCENT = '#7c3aed';
const ACCENT2 = '#06b6d4';
const BG = '#0a0a0f';
const CARD = '#111118';
const BORDER = '#2d2d3d';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 64, marginBottom: 8 },
  title: {
    fontSize: 32, fontWeight: '800', color: '#ffffff',
    letterSpacing: 2, textTransform: 'uppercase'
  },
  sub: { fontSize: 13, color: ACCENT2, marginTop: 4, letterSpacing: 1 },
  card: {
    backgroundColor: CARD, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    padding: 20, marginBottom: 20
  },
  label: {
    fontSize: 11, fontWeight: '700', color: ACCENT2,
    letterSpacing: 2, marginBottom: 10
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0d0d15', borderRadius: 10,
    borderWidth: 1, borderColor: BORDER, marginBottom: 12
  },
  input: {
    flex: 1, color: '#ffffff', fontSize: 13,
    padding: 14, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  eyeBtn: { padding: 14 },
  eyeIcon: { fontSize: 18 },
  pasteBtn: {
    backgroundColor: '#1a1a2e', borderRadius: 8,
    padding: 12, alignItems: 'center', marginBottom: 8,
    borderWidth: 1, borderColor: BORDER
  },
  pasteBtnText: { color: '#aaa', fontSize: 13, fontWeight: '600' },
  helpBtn: { alignItems: 'center', paddingTop: 4 },
  helpText: { color: '#555', fontSize: 12 },
  loginBtn: {
    backgroundColor: ACCENT, borderRadius: 14,
    padding: 18, alignItems: 'center',
    marginBottom: 16,
    shadowColor: ACCENT, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }
  },
  loginBtnDisabled: { opacity: 0.5 },
  loginBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  skipBtn: { alignItems: 'center', padding: 12 },
  skipText: { color: '#555', fontSize: 13 },
  warning: {
    color: '#444', fontSize: 11, textAlign: 'center',
    marginTop: 16, lineHeight: 16
  }
});
