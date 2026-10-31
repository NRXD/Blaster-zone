// BlasterZone — Control Panel
// Full mixer: gain, reverb (Haunted Cavern untouched), voice, EQ, fake deafen, device spoof

import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ScrollView, Switch, Dimensions, Animated, Platform
} from 'react-native';

const { height: SH } = Dimensions.get('window');

// ── Gain presets with mega boost labels ────────────────────────────────────
const GAIN_OPTIONS = [
  { key: 'OFF',     label: 'Off',     sub: '100%',   color: '#555' },
  { key: 'MILD',    label: 'Mild',    sub: '200%',   color: '#22c55e' },
  { key: 'LOUD',    label: 'Loud',    sub: '450%',   color: '#84cc16' },
  { key: 'MAX',     label: 'Max',     sub: '800%',   color: '#eab308' },
  { key: 'ULTRA',   label: 'Ultra',   sub: '1200%',  color: '#f97316' },
  { key: 'MONSTER', label: 'Monster', sub: '2000%',  color: '#ef4444' },
  { key: 'GOD',     label: '⚡ GOD',  sub: '4000%',  color: '#a855f7' },
];

// ── Reverb presets ─────────────────────────────────────────────────────────
const REVERB_OPTIONS = [
  { key: 'NONE',          label: 'None',           icon: '—' },
  { key: 'SMALL_ROOM',    label: 'Small Room',     icon: '🚪' },
  { key: 'LARGE_ROOM',    label: 'Large Room',     icon: '🏠' },
  { key: 'CATHEDRAL',     label: 'Cathedral',      icon: '⛪' },
  { key: 'HAUNTED_CAVERN',label: 'Haunted Cavern', icon: '👻' }, // PERFECT — NEVER TOUCH
  { key: 'UNDERWATER',    label: 'Underwater',     icon: '🌊' },
  { key: 'CONCERT',       label: 'Concert Hall',   icon: '🎭' },
];

// ── Voice presets ──────────────────────────────────────────────────────────
const VOICE_OPTIONS = [
  { key: 'NONE',      label: 'None',      icon: '🎤' },
  { key: 'Deep',      label: 'Deep',      icon: '😤' },
  { key: 'Chipmunk',  label: 'Chipmunk',  icon: '🐿️' },
  { key: 'Robot',     label: 'Robot',     icon: '🤖' },
  { key: 'Demon',     label: 'Demon',     icon: '😈' },
  { key: 'Angel',     label: 'Angel',     icon: '😇' },
];

// ── Device spoof ────────────────────────────────────────────────────────────
const DEVICE_OPTIONS = [
  { key: 'DESKTOP_WINDOWS', label: 'Windows',  icon: '🖥️' },
  { key: 'DESKTOP_MAC',     label: 'Mac',      icon: '🍎' },
  { key: 'MOBILE_IOS',      label: 'iPhone',   icon: '📱' },
  { key: 'MOBILE_ANDROID',  label: 'Android',  icon: '🤖' },
  { key: 'WEB_CHROME',      label: 'Chrome',   icon: '🌐' },
  { key: 'VR',              label: 'VR',       icon: '🥽' },
];

// ── EQ band labels ──────────────────────────────────────────────────────────
const EQ_BANDS = ['32', '64', '125', '250', '500', '1K', '2K', '4K', '8K'];

const TABS = ['Gain', 'Reverb', 'Voice', 'EQ', 'Tools', 'Settings'];

export default function ControlPanel({
  gainPreset, reverbPreset, voicePreset, fakeDeafen, fakeMute,
  deviceSpoof, eqBands, ucoreReady,
  onGain, onReverb, onVoice, onEQ, onFakeDeafen, onFakeMute,
  onDeviceSpoof, onClose, onLogout, onSwitchAccounts, onReload,
}) {
  const [tab, setTab] = useState('Gain');

  function EQSlider({ idx }) {
    const val = eqBands[idx] ?? 0;
    const pan = useRef(new Animated.Value(0)).current;
    const height = 120;
    const RANGE = 15; // ±15 dB

    const y = ((RANGE - val) / (2 * RANGE)) * height;

    return (
      <View style={eq.col}>
        <Text style={eq.db}>{val > 0 ? '+' : ''}{val}</Text>
        <View style={eq.track}>
          <View style={[eq.fill, { height: y }]} />
          <TouchableOpacity
            style={eq.thumb}
            onStartShouldSetResponder={() => true}
            onResponderMove={(e) => {
              const rawY = e.nativeEvent.locationY;
              const clamped = Math.max(0, Math.min(height, rawY));
              const newVal = Math.round(RANGE - (clamped / height) * (2 * RANGE));
              const next = [...eqBands];
              next[idx] = newVal;
              onEQ(next);
            }}
          />
          <View style={[eq.fill2, { height: height - y }]} />
        </View>
        <Text style={eq.label}>{EQ_BANDS[idx]}</Text>
      </View>
    );
  }

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} onPress={onClose} activeOpacity={1} />

        <View style={s.sheet}>
          {/* Handle */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Text style={s.headerTitle}>⚡ BlasterZone</Text>
              <View style={[s.statusDot, ucoreReady ? s.dotGreen : s.dotOrange]} />
              <Text style={s.statusTxt}>{ucoreReady ? 'Live' : 'Loading'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={s.tabBarContent}>
            {TABS.map(t => (
              <TouchableOpacity
                key={t}
                style={[s.tabBtn, tab === t && s.tabBtnActive]}
                onPress={() => setTab(t)}
              >
                <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Content */}
          <ScrollView style={s.content} showsVerticalScrollIndicator={false}>

            {/* ── GAIN ──────────────────────────────────────────────── */}
            {tab === 'Gain' && (
              <View>
                <Text style={s.sectionTitle}>Voice Gain Boost</Text>
                <Text style={s.sectionSub}>Amplifies incoming audio — way beyond Discord's limits</Text>
                <View style={s.grid}>
                  {GAIN_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[s.gainCard, gainPreset === opt.key && { borderColor: opt.color, backgroundColor: opt.color + '22' }]}
                      onPress={() => onGain(opt.key)}
                    >
                      <Text style={[s.gainLabel, { color: gainPreset === opt.key ? opt.color : '#fff' }]}>{opt.label}</Text>
                      <Text style={[s.gainSub, { color: gainPreset === opt.key ? opt.color : '#555' }]}>{opt.sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* ── REVERB ────────────────────────────────────────────── */}
            {tab === 'Reverb' && (
              <View>
                <Text style={s.sectionTitle}>Reverb / Room</Text>
                <Text style={s.sectionSub}>ツcore v3.17.0 EAX reverb engine</Text>
                {REVERB_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[s.listRow, reverbPreset === opt.key && s.listRowActive]}
                    onPress={() => onReverb(opt.key)}
                  >
                    <Text style={s.listIcon}>{opt.icon}</Text>
                    <View style={s.listInfo}>
                      <Text style={s.listLabel}>{opt.label}</Text>
                      {opt.key === 'HAUNTED_CAVERN' && (
                        <Text style={s.listNote}>Perfect preset — carefully tuned 👑</Text>
                      )}
                    </View>
                    {reverbPreset === opt.key && <View style={s.check}><Text style={s.checkTxt}>✓</Text></View>}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ── VOICE ─────────────────────────────────────────────── */}
            {tab === 'Voice' && (
              <View>
                <Text style={s.sectionTitle}>Voice Changer</Text>
                <Text style={s.sectionSub}>Real-time pitch & timbre morphing</Text>
                <View style={s.grid}>
                  {VOICE_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[s.voiceCard, voicePreset === opt.key && s.voiceCardActive]}
                      onPress={() => onVoice(opt.key)}
                    >
                      <Text style={s.voiceIcon}>{opt.icon}</Text>
                      <Text style={[s.voiceLabel, voicePreset === opt.key && s.voiceLabelActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* ── EQ ────────────────────────────────────────────────── */}
            {tab === 'EQ' && (
              <View>
                <Text style={s.sectionTitle}>9-Band Equalizer</Text>
                <Text style={s.sectionSub}>±15 dB per band · drag sliders</Text>
                <View style={eq.row}>
                  {eqBands.map((_, i) => <EQSlider key={i} idx={i} />)}
                </View>
                <TouchableOpacity style={s.resetBtn} onPress={() => onEQ([0,0,0,0,0,0,0,0,0])}>
                  <Text style={s.resetTxt}>Reset EQ</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── TOOLS ─────────────────────────────────────────────── */}
            {tab === 'Tools' && (
              <View>
                <Text style={s.sectionTitle}>Voice Tools</Text>

                {/* Fake Deafen */}
                <View style={s.toggleRow}>
                  <View style={s.toggleInfo}>
                    <Text style={s.toggleLabel}>🔇 Fake Deafen</Text>
                    <Text style={s.toggleSub}>
                      You see deafened to others — but you still hear everyone.
                      {fakeDeafen && fakeMute ? '\n+ Fake Mute: others can\'t hear you either.' : ''}
                    </Text>
                  </View>
                  <Switch
                    value={fakeDeafen}
                    onValueChange={onFakeDeafen}
                    trackColor={{ false: '#333', true: '#7c3aed' }}
                    thumbColor={fakeDeafen ? '#fff' : '#666'}
                  />
                </View>

                {/* Fake Mute (only when fake deafen on) */}
                <View style={[s.toggleRow, !fakeDeafen && s.toggleDim]}>
                  <View style={s.toggleInfo}>
                    <Text style={s.toggleLabel}>🎙️ Add Fake Mute</Text>
                    <Text style={s.toggleSub}>
                      When fake deafened, also show as muted so others can't hear you.
                      {'\n'}Enable Fake Deafen first.
                    </Text>
                  </View>
                  <Switch
                    value={fakeMute}
                    onValueChange={onFakeMute}
                    disabled={!fakeDeafen}
                    trackColor={{ false: '#333', true: '#7c3aed' }}
                    thumbColor={fakeMute ? '#fff' : '#666'}
                  />
                </View>

                <View style={s.divider} />
                <Text style={s.sectionTitle}>Device Spoof</Text>
                <Text style={s.sectionSub}>What other users see as your client</Text>

                {DEVICE_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[s.listRow, deviceSpoof === opt.key && s.listRowActive]}
                    onPress={() => onDeviceSpoof(opt.key)}
                  >
                    <Text style={s.listIcon}>{opt.icon}</Text>
                    <Text style={s.listLabel}>{opt.label}</Text>
                    {deviceSpoof === opt.key && <View style={s.check}><Text style={s.checkTxt}>✓</Text></View>}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ── SETTINGS ──────────────────────────────────────────── */}
            {tab === 'Settings' && (
              <View>
                <Text style={s.sectionTitle}>Session</Text>

                <TouchableOpacity style={s.actionRow} onPress={onReload}>
                  <Text style={s.actionIcon}>🔄</Text>
                  <View style={s.actionInfo}>
                    <Text style={s.actionLabel}>Reload Discord</Text>
                    <Text style={s.actionSub}>Refreshes the page and re-injects everything</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={s.actionRow} onPress={onSwitchAccounts}>
                  <Text style={s.actionIcon}>👤</Text>
                  <View style={s.actionInfo}>
                    <Text style={s.actionLabel}>Switch Account</Text>
                    <Text style={s.actionSub}>View and switch saved accounts</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={[s.actionRow, s.dangerRow]} onPress={onLogout}>
                  <Text style={s.actionIcon}>🚪</Text>
                  <View style={s.actionInfo}>
                    <Text style={[s.actionLabel, s.dangerTxt]}>Log Out</Text>
                    <Text style={s.actionSub}>Return to login screen</Text>
                  </View>
                </TouchableOpacity>

                <View style={s.divider} />
                <Text style={s.sectionTitle}>About</Text>
                <View style={s.aboutCard}>
                  <Text style={s.aboutLine}>BlasterZone v2.0.0</Text>
                  <Text style={s.aboutLine}>ツcore v3.17.0 embedded</Text>
                  <Text style={s.aboutLine}>Haunted Cavern: 👑 Perfect</Text>
                  <Text style={s.aboutLine}>Max gain: 4000% (40×)</Text>
                </View>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const PURPLE = '#7c3aed';
const DARK   = '#0a0a0f';
const CARD   = '#0f0f1a';
const BORDER = '#1e1e30';

const s = StyleSheet.create({
  overlay:     { flex: 1, justifyContent: 'flex-end' },
  backdrop:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet:       { backgroundColor: '#0d0d18', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: SH * 0.88, borderTopWidth: 1, borderColor: BORDER },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: '#333', alignSelf: 'center', marginTop: 10, marginBottom: 4 },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerLeft:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: '#fff', fontWeight: '800', fontSize: 17 },
  statusDot:   { width: 8, height: 8, borderRadius: 4 },
  dotGreen:    { backgroundColor: '#22c55e' },
  dotOrange:   { backgroundColor: '#f97316' },
  statusTxt:   { color: '#666', fontSize: 12 },
  closeBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center' },
  closeTxt:    { color: '#888', fontSize: 14, fontWeight: '700' },

  tabBar:      { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: BORDER },
  tabBarContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  tabBtn:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: CARD },
  tabBtnActive:{ backgroundColor: PURPLE },
  tabTxt:      { color: '#666', fontSize: 13, fontWeight: '600' },
  tabTxtActive:{ color: '#fff' },

  content:     { padding: 16 },
  sectionTitle:{ color: '#fff', fontWeight: '800', fontSize: 16, marginBottom: 4, marginTop: 8 },
  sectionSub:  { color: '#555', fontSize: 12, marginBottom: 14 },

  grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gainCard:    { width: '30%', backgroundColor: CARD, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, padding: 12, alignItems: 'center', minWidth: 90 },
  gainLabel:   { color: '#fff', fontWeight: '800', fontSize: 14 },
  gainSub:     { color: '#555', fontSize: 11, marginTop: 2 },

  listRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 8 },
  listRowActive: { borderColor: PURPLE, backgroundColor: PURPLE + '18' },
  listIcon:    { fontSize: 20, width: 32 },
  listInfo:    { flex: 1 },
  listLabel:   { color: '#fff', fontWeight: '600', fontSize: 14 },
  listNote:    { color: '#7c3aed', fontSize: 11, marginTop: 2 },
  check:       { width: 24, height: 24, borderRadius: 12, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  checkTxt:    { color: '#fff', fontSize: 12, fontWeight: '800' },

  voiceCard:   { width: '30%', backgroundColor: CARD, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, padding: 12, alignItems: 'center' },
  voiceCardActive: { borderColor: PURPLE, backgroundColor: PURPLE + '22' },
  voiceIcon:   { fontSize: 24, marginBottom: 4 },
  voiceLabel:  { color: '#888', fontSize: 12, fontWeight: '600' },
  voiceLabelActive: { color: '#fff' },

  toggleRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 10 },
  toggleDim:   { opacity: 0.4 },
  toggleInfo:  { flex: 1, paddingRight: 12 },
  toggleLabel: { color: '#fff', fontWeight: '700', fontSize: 14 },
  toggleSub:   { color: '#555', fontSize: 12, marginTop: 2, lineHeight: 17 },

  divider:     { height: 1, backgroundColor: BORDER, marginVertical: 16 },

  actionRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 10 },
  dangerRow:   { borderColor: '#3a1010' },
  actionIcon:  { fontSize: 20, width: 36 },
  actionInfo:  { flex: 1 },
  actionLabel: { color: '#fff', fontWeight: '700', fontSize: 14 },
  dangerTxt:   { color: '#ef4444' },
  actionSub:   { color: '#555', fontSize: 12, marginTop: 1 },

  aboutCard:   { backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 14, gap: 6 },
  aboutLine:   { color: '#555', fontSize: 13 },

  resetBtn:    { backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 12, alignItems: 'center', marginTop: 12 },
  resetTxt:    { color: '#888', fontWeight: '600' },
});

// EQ styles
const eq = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  col:   { alignItems: 'center', flex: 1 },
  db:    { color: '#888', fontSize: 9, marginBottom: 4 },
  track: { width: 6, height: 120, backgroundColor: '#1a1a2e', borderRadius: 3, overflow: 'hidden', position: 'relative' },
  fill:  { backgroundColor: '#333', width: '100%' },
  fill2: { backgroundColor: '#7c3aed', width: '100%' },
  thumb: { position: 'absolute', left: -6, width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', top: '50%', marginTop: -9, shadowColor: '#7c3aed', shadowOpacity: 0.8, shadowRadius: 6 },
  label: { color: '#666', fontSize: 9, marginTop: 6 },
});
