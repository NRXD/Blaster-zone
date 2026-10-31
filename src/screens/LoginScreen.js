// BlasterZone — Login Screen
// Token login + email/pass + saved accounts

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Animated,
  Alert, ActivityIndicator
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';

const ACCOUNTS_KEY = 'bz_saved_accounts';
const ACTIVE_KEY   = 'bz_active_account';

export default function LoginScreen({ navigation }) {
  const [tab, setTab]           = useState('token');  // 'token' | 'accounts'
  const [token, setToken]       = useState('');
  const [label, setLabel]       = useState('');
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    loadAccounts();
  }, []);

  async function loadAccounts() {
    try {
      const raw = await SecureStore.getItemAsync(ACCOUNTS_KEY);
      if (raw) setAccounts(JSON.parse(raw));
    } catch (e) {}
  }

  async function saveAccount(acc) {
    const next = [acc, ...accounts.filter(a => a.token !== acc.token)].slice(0, 20);
    setAccounts(next);
    await SecureStore.setItemAsync(ACCOUNTS_KEY, JSON.stringify(next));
  }

  async function loginWithToken(t, lbl) {
    const trimmed = t.trim();
    if (!trimmed) { Alert.alert('BlasterZone', 'Enter a token first'); return; }
    setLoading(true);
    try {
      const acc = {
        token: trimmed,
        label: lbl || trimmed.slice(0, 12) + '...',
        addedAt: Date.now(),
        type: 'token',
      };
      await saveAccount(acc);
      await SecureStore.setItemAsync(ACTIVE_KEY, JSON.stringify(acc));
      navigation.replace('Discord', { account: acc });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loginWithAccount(acc) {
    setLoading(true);
    try {
      await SecureStore.setItemAsync(ACTIVE_KEY, JSON.stringify(acc));
      navigation.replace('Discord', { account: acc });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteAccount(acc) {
    const next = accounts.filter(a => a.token !== acc.token);
    setAccounts(next);
    await SecureStore.setItemAsync(ACCOUNTS_KEY, JSON.stringify(next));
  }

  async function pasteToken() {
    const txt = await Clipboard.getStringAsync();
    if (txt) setToken(txt.trim());
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Animated.View style={[s.inner, { opacity: fadeAnim }]}>
        {/* Logo */}
        <View style={s.logoArea}>
          <View style={s.logoCircle}>
            <Text style={s.logoText}>⚡</Text>
          </View>
          <Text style={s.title}>BlasterZone</Text>
          <Text style={s.sub}>Discord · Unleashed</Text>
        </View>

        {/* Tabs */}
        <View style={s.tabs}>
          <TouchableOpacity style={[s.tab, tab === 'token' && s.tabActive]} onPress={() => setTab('token')}>
            <Text style={[s.tabTxt, tab === 'token' && s.tabTxtActive]}>Token Login</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, tab === 'accounts' && s.tabActive]} onPress={() => setTab('accounts')}>
            <Text style={[s.tabTxt, tab === 'accounts' && s.tabTxtActive]}>
              Saved ({accounts.length})
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'token' ? (
          <ScrollView style={s.form} keyboardShouldPersistTaps="handled">
            <Text style={s.fieldLabel}>Account Label (optional)</Text>
            <TextInput
              style={s.input}
              value={label}
              onChangeText={setLabel}
              placeholder="e.g. Main, Alt1"
              placeholderTextColor="#555"
              autoCapitalize="none"
            />

            <Text style={s.fieldLabel}>Discord Token</Text>
            <View style={s.tokenRow}>
              <TextInput
                style={[s.input, s.tokenInput]}
                value={token}
                onChangeText={setToken}
                placeholder="Paste your token here"
                placeholderTextColor="#555"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={false}
                multiline={false}
              />
              <TouchableOpacity style={s.pasteBtn} onPress={pasteToken}>
                <Text style={s.pasteBtnTxt}>Paste</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.hint}>
              Get your token: Discord web → F12 → Console →{'\n'}
              <Text style={s.code}>copy(window.DiscordNative?.native?.isRenderer ? (webpackChunkdiscord_app.push([[Symbol()],{},r=>window.r=r]),Object.values(window.r.m).find(m=>/getToken/.test(m))&&window.r(Object.keys(window.r.m).find(k=>/getToken/.test(window.r.m[k]))).getToken()) : '')</Text>
            </Text>

            <TouchableOpacity
              style={[s.loginBtn, loading && s.loginBtnDis]}
              onPress={() => loginWithToken(token, label)}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.loginBtnTxt}>⚡ Launch BlasterZone</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={s.webBtn} onPress={() => navigation.replace('Discord', { account: { type: 'web' } })}>
              <Text style={s.webBtnTxt}>Use Web Login Instead →</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <ScrollView style={s.form} keyboardShouldPersistTaps="handled">
            {accounts.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyIcon}>👤</Text>
                <Text style={s.emptyTxt}>No saved accounts yet.{'\n'}Add one in the Token Login tab.</Text>
              </View>
            ) : accounts.map((acc) => (
              <View key={acc.token} style={s.accRow}>
                <View style={s.accInfo}>
                  <Text style={s.accLabel}>{acc.label}</Text>
                  <Text style={s.accMeta}>
                    {acc.type === 'token' ? '🔑 Token' : '📧 Email'} · Added {new Date(acc.addedAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={s.accActions}>
                  <TouchableOpacity style={s.accBtn} onPress={() => loginWithAccount(acc)}>
                    <Text style={s.accBtnTxt}>Launch</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.accDelBtn} onPress={() => Alert.alert('Remove', `Remove ${acc.label}?`, [
                    { text: 'Cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => deleteAccount(acc) }
                  ])}>
                    <Text style={s.accDelTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const PURPLE = '#7c3aed';
const DARK   = '#0a0a0f';
const CARD   = '#0f0f1a';
const BORDER = '#1e1e30';

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: DARK },
  inner:       { flex: 1, paddingTop: 60 },
  logoArea:    { alignItems: 'center', paddingBottom: 24 },
  logoCircle:  { width: 72, height: 72, borderRadius: 36, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: PURPLE, shadowOpacity: 0.8, shadowRadius: 20, elevation: 10 },
  logoText:    { fontSize: 32 },
  title:       { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  sub:         { fontSize: 13, color: '#555', marginTop: 2 },

  tabs:        { flexDirection: 'row', marginHorizontal: 20, borderRadius: 10, backgroundColor: CARD, padding: 4, marginBottom: 16 },
  tab:         { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive:   { backgroundColor: PURPLE },
  tabTxt:      { color: '#666', fontWeight: '600', fontSize: 13 },
  tabTxtActive:{ color: '#fff' },

  form:        { flex: 1, paddingHorizontal: 20 },
  fieldLabel:  { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:       { backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 14 },
  tokenRow:    { flexDirection: 'row', gap: 8 },
  tokenInput:  { flex: 1 },
  pasteBtn:    { backgroundColor: '#1a1a2e', borderRadius: 10, borderWidth: 1, borderColor: PURPLE, paddingHorizontal: 16, justifyContent: 'center' },
  pasteBtnTxt: { color: PURPLE, fontWeight: '700', fontSize: 13 },

  hint:        { color: '#444', fontSize: 11, marginTop: 10, lineHeight: 16 },
  code:        { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#555', fontSize: 10 },

  loginBtn:    { backgroundColor: PURPLE, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 20, shadowColor: PURPLE, shadowOpacity: 0.6, shadowRadius: 12, elevation: 8 },
  loginBtnDis: { opacity: 0.6 },
  loginBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },

  webBtn:      { alignItems: 'center', paddingVertical: 16, marginBottom: 30 },
  webBtnTxt:   { color: '#555', fontSize: 13 },

  emptyState:  { alignItems: 'center', paddingTop: 60 },
  emptyIcon:   { fontSize: 40, marginBottom: 12 },
  emptyTxt:    { color: '#555', textAlign: 'center', lineHeight: 22 },

  accRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 10 },
  accInfo:     { flex: 1 },
  accLabel:    { color: '#fff', fontWeight: '700', fontSize: 14 },
  accMeta:     { color: '#555', fontSize: 12, marginTop: 2 },
  accActions:  { flexDirection: 'row', gap: 8 },
  accBtn:      { backgroundColor: PURPLE, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  accBtnTxt:   { color: '#fff', fontWeight: '700', fontSize: 12 },
  accDelBtn:   { backgroundColor: '#1a0a0a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#3a1010' },
  accDelTxt:   { color: '#e05555', fontWeight: '700', fontSize: 12 },
});
