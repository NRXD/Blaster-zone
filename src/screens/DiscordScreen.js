// BlasterZone — Main Discord Screen
// WebView + injection + floating control bar

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Text, Animated,
  Platform, PanResponder, Dimensions, Alert
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { buildInjection, loadUcore, GAIN_PRESETS, DEVICE_SPOOF } from '../injection/buildInjection';
import ControlPanel from '../components/ControlPanel';

const DISCORD_URL = 'https://discord.com/app';
const SETTINGS_KEY = 'bz_settings';

const { width: SW, height: SH } = Dimensions.get('window');

export default function DiscordScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const webRef = useRef(null);
  const account = route.params?.account;

  // ── Settings state ──────────────────────────────────────────────────────
  const [gainPreset,   setGainPreset]   = useState('OFF');
  const [reverbPreset, setReverbPreset] = useState('NONE');
  const [voicePreset,  setVoicePreset]  = useState('NONE');
  const [fakeDeafen,   setFakeDeafen]   = useState(false);
  const [fakeMute,     setFakeMute]     = useState(false);
  const [deviceSpoof,  setDeviceSpoof]  = useState('DESKTOP_WINDOWS');
  const [eqBands,      setEqBands]      = useState([0,0,0,0,0,0,0,0,0]);
  const [panelOpen,    setPanelOpen]    = useState(false);
  const [ucoreReady,   setUcoreReady]   = useState(false);
  const [bzReady,      setBzReady]      = useState(false);

  // ── Floating button position ────────────────────────────────────────────
  const btnPos = useRef(new Animated.ValueXY({ x: SW - 72, y: SH * 0.4 })).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        btnPos.setOffset({ x: btnPos.x._value, y: btnPos.y._value });
        btnPos.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: btnPos.x, dy: btnPos.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, g) => {
        btnPos.flattenOffset();
        // Snap to nearest edge
        const cx = btnPos.x._value + 28;
        const snap = cx > SW / 2 ? SW - 72 : 12;
        Animated.spring(btnPos, {
          toValue: { x: snap, y: Math.max(80, Math.min(btnPos.y._value, SH - 120)) },
          useNativeDriver: false
        }).start();
      }
    })
  ).current;

  // ── Load saved settings ─────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(SETTINGS_KEY);
        if (raw) {
          const st = JSON.parse(raw);
          if (st.gainPreset)   setGainPreset(st.gainPreset);
          if (st.reverbPreset) setReverbPreset(st.reverbPreset);
          if (st.voicePreset)  setVoicePreset(st.voicePreset);
          if (st.fakeDeafen != null)  setFakeDeafen(st.fakeDeafen);
          if (st.fakeMute != null)    setFakeMute(st.fakeMute);
          if (st.deviceSpoof)  setDeviceSpoof(st.deviceSpoof);
          if (st.eqBands)      setEqBands(st.eqBands);
        }
      } catch (e) {}
    })();
  }, []);

  // ── Persist settings ────────────────────────────────────────────────────
  async function saveSettings(update) {
    try {
      const raw = await SecureStore.getItemAsync(SETTINGS_KEY);
      const cur = raw ? JSON.parse(raw) : {};
      const next = { ...cur, ...update };
      await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(next));
    } catch (e) {}
  }

  // ── Build injection JS ──────────────────────────────────────────────────
  // Start with empty string so we build immediately without waiting for ucore
  const [injectionJS, setInjectionJS] = useState(null);
  const ucoreSourceRef = useRef('');

  useEffect(() => {
    // Build injection immediately (no ucore yet) so Discord loads right away
    const jsNoUcore = buildInjection({
      token:        account?.token || null,
      gainPreset,
      reverbPreset,
      voicePreset,
      fakeDeafen,
      fakeMute,
      deviceSpoof,
      ucoreSource:  ucoreSourceRef.current,
      eqBands,
    });
    setInjectionJS(jsNoUcore);

    // Load ucore in background with 8s timeout, inject when ready
    let cancelled = false;
    (async () => {
      try {
        const ucore = await Promise.race([
          loadUcore(),
          new Promise(resolve => setTimeout(() => resolve(''), 8000))
        ]);
        if (cancelled) return;
        if (ucore && ucore !== ucoreSourceRef.current) {
          ucoreSourceRef.current = ucore;
          // Inject ucore directly into running WebView — no reload needed
          // This fires after Discord is already loaded and visible
          if (webRef.current) {
            webRef.current.injectJavaScript(ucore + '\n;true;');
          }
        }
      } catch (e) {}
    })();
    return () => { cancelled = true; };
  }, [gainPreset, reverbPreset, voicePreset, fakeDeafen, fakeMute, deviceSpoof, eqBands, account]);

  // ── JS → App messages ───────────────────────────────────────────────────
  const onMessage = useCallback(({ nativeEvent: { data } }) => {
    try {
      const msg = JSON.parse(data);
      switch (msg.type) {
        case 'BZ_READY':    setBzReady(true); break;
        case 'UCORE_READY': setUcoreReady(true); break;
        case 'TOKEN_INJECTED':
        case 'TOKEN_OK':
        case 'TOKEN_FALLBACK': break;
        case 'TOKEN_ERROR':
        case 'TOKEN_ERR':  Alert.alert('Token Error', msg.e || msg.err); break;
        // In-Discord mixer bar changes — sync RN state + persist
        case 'GAIN_CHANGE':
          if (msg.preset) { setGainPreset(msg.preset); saveSettings({ gainPreset: msg.preset }); }
          break;
        case 'REVERB_CHANGE':
          if (msg.room) {
            // Convert display name back to preset key
            const REVERB_BACK = {
              'None': 'NONE', 'Small Room': 'SMALL_ROOM', 'Large Room': 'LARGE_ROOM',
              'Cathedral': 'CATHEDRAL', 'Haunted Cavern': 'HAUNTED_CAVERN',
              'Underwater': 'UNDERWATER', 'Concert Hall': 'CONCERT',
            };
            const key = REVERB_BACK[msg.room] || 'NONE';
            setReverbPreset(key);
            saveSettings({ reverbPreset: key });
          }
          break;
        case 'FAKE_DEAFEN_TOGGLE':
          setFakeDeafen(!!msg.value);
          saveSettings({ fakeDeafen: !!msg.value });
          break;
        case 'PLUGIN_TOGGLE':
          // Plugin toggles are stored in WebView localStorage — nothing to do in RN
          break;
        case 'UCORE_ERR':
          console.warn('ucore error:', msg.e);
          break;
      }
    } catch (e) {}
  }, []);

  // ── Send command to WebView ─────────────────────────────────────────────
  function sendToWebView(js) {
    webRef.current?.injectJavaScript(js + '; true;');
  }

  // ── Setting change handlers ─────────────────────────────────────────────
  function changeGain(preset) {
    setGainPreset(preset);
    saveSettings({ gainPreset: preset });
    sendToWebView(`window.__BZ_API__ && window.__BZ_API__.setGain(${JSON.stringify(preset)})`);
  }

  function changeReverb(preset) {
    setReverbPreset(preset);
    saveSettings({ reverbPreset: preset });
    const room = preset === 'NONE' ? 'None' : preset.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    // Map preset key to room name
    const REVERB_MAP = {
      NONE: 'None', SMALL_ROOM: 'Small Room', LARGE_ROOM: 'Large Room',
      CATHEDRAL: 'Cathedral', HAUNTED_CAVERN: 'Haunted Cavern',
      UNDERWATER: 'Underwater', CONCERT: 'Concert Hall',
    };
    sendToWebView(`window.__BZ_API__ && window.__BZ_API__.setReverb(${JSON.stringify(REVERB_MAP[preset] || 'None')})`);
  }

  function changeVoice(preset) {
    setVoicePreset(preset);
    saveSettings({ voicePreset: preset });
    sendToWebView(`window.__BZ_API__ && window.__BZ_API__.setVoice(${JSON.stringify(preset)})`);
  }

  function changeEQ(bands) {
    setEqBands(bands);
    saveSettings({ eqBands: bands });
    sendToWebView(`window.__BZ_API__ && window.__BZ_API__.setEQ(${JSON.stringify(bands)})`);
  }

  function toggleFakeDeafen(val) {
    setFakeDeafen(val);
    saveSettings({ fakeDeafen: val });
    sendToWebView(`window.__BZ_FAKE_DEAFEN__ = ${val}; window.__BZ_API__ && window.__BZ_API__.setFakeDeafen(${val})`);
  }

  function toggleFakeMute(val) {
    setFakeMute(val);
    saveSettings({ fakeMute: val });
    sendToWebView(`window.__BZ_FAKE_MUTE__ = ${val}; window.__BZ_API__ && window.__BZ_API__.setFakeMute(${val})`);
  }

  function changeDeviceSpoof(key) {
    setDeviceSpoof(key);
    saveSettings({ deviceSpoof: key });
    // Reload to apply new spoof (injected on IDENTIFY)
    webRef.current?.reload();
  }

  function logout() {
    Alert.alert('Log out', 'Remove this session?', [
      { text: 'Cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('bz_active_account');
          navigation.replace('Login');
        }
      }
    ]);
  }

  // ── Custom user agent (matches spoof) ───────────────────────────────────
  const userAgent = DEVICE_SPOOF[deviceSpoof]?.properties?.browser_user_agent
    || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9158 Chrome/120.0.6099.291 Electron/28.2.10 Safari/537.36';

  // injectionJS starts null — show Discord immediately once first build is done
  // null = still building (fast, no network), string = ready
  if (injectionJS === null) {
    return (
      <View style={s.loading}>
        <Text style={s.loadingTxt}>⚡</Text>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Discord WebView */}
      <WebView
        ref={webRef}
        source={{ uri: DISCORD_URL }}
        style={s.web}
        userAgent={userAgent}
        injectedJavaScript={injectionJS}
        injectedJavaScriptBeforeContentLoaded={`
          window.__BZ_PRE__ = true;
          // Minimal pre-load: patch WebSocket before Discord's script runs
          true;
        `}
        onMessage={onMessage}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        mixedContentMode="always"
        onShouldStartLoadWithRequest={() => true}
        // Performance
        renderToHardwareTextureAndroid
        overScrollMode="never"
        bounces={false}
        decelerationRate="normal"
        startInLoadingState
        renderLoading={() => (
          <View style={s.webLoading}>
            <Text style={s.loadingTxt}>⚡</Text>
          </View>
        )}
      />

      {/* Status dots */}
      <View style={[s.statusDots, { top: insets.top + 6 }]}>
        <View style={[s.dot, bzReady && s.dotGreen]} />
        <View style={[s.dot, ucoreReady && s.dotPurple]} />
      </View>

      {/* Floating launch button */}
      <Animated.View
        style={[s.fab, { transform: btnPos.getTranslateTransform() }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={s.fabInner}
          onPress={() => setPanelOpen(true)}
          activeOpacity={0.85}
        >
          <Text style={s.fabIcon}>⚡</Text>
          {gainPreset !== 'OFF' && <View style={s.fabDot} />}
        </TouchableOpacity>
      </Animated.View>

      {/* Control panel modal */}
      {panelOpen && (
        <ControlPanel
          gainPreset={gainPreset}
          reverbPreset={reverbPreset}
          voicePreset={voicePreset}
          fakeDeafen={fakeDeafen}
          fakeMute={fakeMute}
          deviceSpoof={deviceSpoof}
          eqBands={eqBands}
          ucoreReady={ucoreReady}
          onGain={changeGain}
          onReverb={changeReverb}
          onVoice={changeVoice}
          onEQ={changeEQ}
          onFakeDeafen={toggleFakeDeafen}
          onFakeMute={toggleFakeMute}
          onDeviceSpoof={changeDeviceSpoof}
          onClose={() => setPanelOpen(false)}
          onLogout={logout}
          onSwitchAccounts={() => { setPanelOpen(false); navigation.navigate('Accounts'); }}
          onReload={() => { webRef.current?.reload(); setPanelOpen(false); }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#0a0a0f' },
  web:        { flex: 1, backgroundColor: '#0a0a0f' },
  loading:    { flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' },
  webLoading: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0f' },
  loadingTxt: { color: '#7c3aed', fontSize: 22, fontWeight: '800' },

  statusDots: { position: 'absolute', left: 12, flexDirection: 'row', gap: 4 },
  dot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: '#333' },
  dotGreen:   { backgroundColor: '#22c55e' },
  dotPurple:  { backgroundColor: '#7c3aed' },

  fab:        { position: 'absolute', width: 52, height: 52 },
  fabInner:   { width: 52, height: 52, borderRadius: 26, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', shadowColor: '#7c3aed', shadowOpacity: 0.9, shadowRadius: 16, elevation: 12 },
  fabIcon:    { fontSize: 22 },
  fabDot:     { position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e', borderWidth: 1.5, borderColor: '#0a0a0f' },
});
