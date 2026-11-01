// BlasterZone — Accounts Screen (standalone switcher)
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator, Platform
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCOUNTS_KEY = 'bz_saved_accounts';
const ACTIVE_KEY   = 'bz_active_account';

export default function AccountsScreen({ navigation }) {
  const [accounts, setAccounts] = useState([]);
  const [active, setActive]     = useState(null);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const raw = await SecureStore.getItemAsync(ACCOUNTS_KEY);
      if (raw) setAccounts(JSON.parse(raw));
      const act = await SecureStore.getItemAsync(ACTIVE_KEY);
      if (act) setActive(JSON.parse(act));
    } catch (e) {}
  }

  async function switchTo(acc) {
    setLoading(true);
    await SecureStore.setItemAsync(ACTIVE_KEY, JSON.stringify(acc));
    navigation.replace('Discord', { account: acc });
    setLoading(false);
  }

  async function remove(acc) {
    const next = accounts.filter(a => a.token !== acc.token);
    setAccounts(next);
    await SecureStore.setItemAsync(ACCOUNTS_KEY, JSON.stringify(next));
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Text style={s.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Accounts</Text>
        <TouchableOpacity onPress={() => navigation.replace('Login')} style={s.addBtn}>
          <Text style={s.addTxt}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.list} contentContainerStyle={{ padding: 16 }}>
        {accounts.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyTxt}>No saved accounts.{'\n'}Add one from the login screen.</Text>
          </View>
        )}
        {accounts.map((acc) => {
          const isActive = active?.token === acc.token;
          return (
            <View key={acc.token} style={[s.row, isActive && s.rowActive]}>
              <View style={s.info}>
                <View style={s.labelRow}>
                  <Text style={s.label}>{acc.label}</Text>
                  {isActive && <View style={s.activePill}><Text style={s.activeTxt}>Active</Text></View>}
                </View>
                <Text style={s.meta}>
                  {acc.type === 'token' ? '🔑 Token login' : '📧 Email login'} · {new Date(acc.addedAt).toLocaleDateString()}
                </Text>
                <Text style={s.tokenPreview} numberOfLines={1}>
                  {acc.token.slice(0, 20)}···
                </Text>
              </View>
              <View style={s.actions}>
                {!isActive && (
                  <TouchableOpacity style={s.switchBtn} onPress={() => switchTo(acc)} disabled={loading}>
                    {loading
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={s.switchTxt}>Switch</Text>
                    }
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={s.delBtn}
                  onPress={() => Alert.alert('Remove Account', `Remove "${acc.label}"?`, [
                    { text: 'Cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => remove(acc) }
                  ])}
                >
                  <Text style={s.delTxt}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const PURPLE = '#7c3aed';
const DARK   = '#0a0a0f';
const CARD   = '#0f0f1a';
const BORDER = '#1e1e30';

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: DARK },
  header:     { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  back:       { paddingRight: 16 },
  backTxt:    { color: PURPLE, fontWeight: '600', fontSize: 15 },
  title:      { flex: 1, color: '#fff', fontWeight: '800', fontSize: 18, textAlign: 'center' },
  addBtn:     { paddingLeft: 16 },
  addTxt:     { color: PURPLE, fontWeight: '700', fontSize: 15 },

  list:       { flex: 1 },
  empty:      { alignItems: 'center', paddingTop: 80 },
  emptyTxt:   { color: '#555', textAlign: 'center', lineHeight: 22 },

  row:        { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  rowActive:  { borderColor: PURPLE },
  info:       { flex: 1 },
  labelRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  label:      { color: '#fff', fontWeight: '700', fontSize: 15 },
  activePill: { backgroundColor: PURPLE, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  activeTxt:  { color: '#fff', fontSize: 11, fontWeight: '700' },
  meta:       { color: '#555', fontSize: 12 },
  tokenPreview: { color: '#333', fontSize: 11, marginTop: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  actions:    { flexDirection: 'row', gap: 8 },
  switchBtn:  { backgroundColor: PURPLE, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  switchTxt:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  delBtn:     { backgroundColor: '#1a0a0a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#3a1010' },
  delTxt:     { color: '#e05555', fontWeight: '700' },
});
