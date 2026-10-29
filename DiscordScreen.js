import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Platform, Animated, Dimensions,
  Modal, Alert
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';

// The full injection script is assembled here
import { BRIDGE_SCRIPT } from '../injection/scripts';
import { UCORE_SCRIPT } from '../injection/ucore';
import ControlPanel from '../components/ControlPanel';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Build the full injection string ─────────────────────────────────────
function buildScript({ token, fakeDeafen }) {
  const cfg = JSON.stringify({ token: token || null, fakeDeafen: !!fakeDeafen });
  return `
(function(){
  if(window.__BZ_FULL_LOADED__)return;
  window.__BZ_FULL_LOADED__=true;

  // CONFIG from native
  const __BZ_CFG__=${cfg};

  // ── 1. Desktop spoof (WebSocket IDENTIFY intercept) ──
  (function(){
    const _Orig=window.WebSocket;
    function _BZSocket(...a){
      const ws=new _Orig(...a);
      const _s=ws.send.bind(ws);
      ws.send=function(d){
        try{
          if(typeof d==='string'){
            const p=JSON.parse(d);
            // op2=IDENTIFY, op6=RESUME
            if(p&&(p.op===2||p.op===6)&&p.d&&p.d.properties){
              p.d.properties['$os']='Windows';
              p.d.properties['$browser']='Discord Client';
              p.d.properties['$device']='desktop';
              p.d.properties['browser_user_agent']='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9173 Chrome/124.0.6367.243 Electron/30.4.0 Safari/537.36';
              p.d.properties['browser_version']='30.4.0';
              p.d.properties['os_version']='10';
              p.d.properties['system_locale']='en-US';
              p.d.properties['release_channel']='stable';
              p.d.properties['client_build_number']=337622;
              d=JSON.stringify(p);
            }
            // op4=VOICE_STATE_UPDATE, fake deafen
            if(p&&p.op===4&&p.d&&window.__BZ_FAKEDEAFEN__){
              p.d.self_deaf=true;
              d=JSON.stringify(p);
              try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'FAKE_DEAFEN_ACTIVE',val:true}));}catch(_){}
            }
          }
        }catch(e){}
        return _s(d);
      };
      return ws;
    }
    _BZSocket.prototype=_Orig.prototype;
    Object.keys(_Orig).forEach(k=>{try{_BZSocket[k]=_Orig[k];}catch(_){}});
    window.WebSocket=_BZSocket;
  })();

  // ── 2. Fake deafen state ──
  window.__BZ_FAKEDEAFEN__=__BZ_CFG__.fakeDeafen||false;
  window.__BZ_setFakeDeafen=function(v){window.__BZ_FAKEDEAFEN__=v;};

  // ── 3. Token login ──
  window.__BZ_loginToken=function(t){
    if(!t)return;
    try{window.localStorage.setItem('token',JSON.stringify(t));}catch(e){}
    setTimeout(()=>window.location.reload(),200);
  };
  if(__BZ_CFG__.token){
    // Wait for Discord to initialize then inject token
    const _poll=setInterval(()=>{
      try{
        if(window.webpackChunkdiscord_app){
          clearInterval(_poll);
          const t=__BZ_CFG__.token;
          window.localStorage.setItem('token',JSON.stringify(t));
          // Try patching the module store directly
          try{
            window.webpackChunkdiscord_app.push([[Symbol()],{},req=>{
              for(const id in req.c){
                const m=req.c[id];
                if(m&&m.exports&&m.exports.default&&typeof m.exports.default.getToken==='function'){
                  const orig=m.exports.default.getToken;
                  m.exports.default.getToken=()=>t;
                }
              }
            }]);
          }catch(_){}
          setTimeout(()=>{
            if(!window.location.pathname.includes('@me'))window.location.reload();
          },500);
        }
      }catch(e){}
    },200);
    setTimeout(()=>clearInterval(_poll),15000);
  }

  // ── 4. Message listener (from React Native) ──
  window.addEventListener('message',function(e){
    try{
      const msg=JSON.parse(e.data);
      if(msg.type==='SET_FAKE_DEAFEN')window.__BZ_setFakeDeafen(msg.val);
    }catch(_){}
  });
  document.addEventListener('message',function(e){
    try{
      const msg=JSON.parse(e.data);
      if(msg.type==='SET_FAKE_DEAFEN')window.__BZ_setFakeDeafen(msg.val);
    }catch(_){}
  });

  // ── 5. Load ツcore (full audio engine) ──
  (function(){
    ${UCORE_SCRIPT}
  })();

  // Notify native bridge is ready
  try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'BRIDGE_READY'}));}catch(_){}
  true;
})();
`;
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function DiscordScreen({ route }) {
  const { token } = route?.params || {};
  const webviewRef = useRef(null);

  const [fakeDeafen, setFakeDeafen] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [bridgeReady, setBridgeReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const slideAnim = useRef(new Animated.Value(SCREEN_W)).current;

  const injectionScript = buildScript({ token, fakeDeafen });

  // Toggle control panel slide-in
  const openPanel = useCallback(() => {
    setPanelVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0, useNativeDriver: true,
      tension: 65, friction: 11
    }).start();
  }, [slideAnim]);

  const closePanel = useCallback(() => {
    Animated.spring(slideAnim, {
      toValue: SCREEN_W, useNativeDriver: true,
      tension: 65, friction: 11
    }).start(() => setPanelVisible(false));
  }, [slideAnim]);

  // Toggle fake deafen
  const toggleFakeDeafen = useCallback(() => {
    const next = !fakeDeafen;
    setFakeDeafen(next);
    webviewRef.current?.injectJavaScript(
      `window.__BZ_setFakeDeafen&&window.__BZ_setFakeDeafen(${next});true;`
    );
  }, [fakeDeafen]);

  // Message handler from WebView
  const onMessage = useCallback((e) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'BRIDGE_READY') setBridgeReady(true);
    } catch(_) {}
  }, []);

  // Inject after page load
  const onLoadEnd = useCallback(() => {
    setLoading(false);
    // Re-inject in case Discord did a soft navigation
    webviewRef.current?.injectJavaScript(injectionScript);
  }, [injectionScript]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />

      {/* WebView — Discord web */}
      <WebView
        ref={webviewRef}
        source={{ uri: 'https://discord.com/app' }}
        style={s.webview}
        // Inject before page renders
        injectedJavaScriptBeforeContentLoaded={injectionScript}
        injectedJavaScript={injectionScript}
        onMessage={onMessage}
        onLoadEnd={onLoadEnd}
        // Critical for audio/mic
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        // Desktop UA so Discord loads full web app
        applicationNameForUserAgent="Discord/1.0.9173"
        userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9173 Chrome/124.0.6367.243 Electron/30.4.0 Safari/537.36"
        // Allow permissions
        allowsBackForwardNavigationGestures
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        // Prevent Discord from redirecting to app store
        onShouldStartLoadWithRequest={(req) => {
          if (req.url.startsWith('https://discord.com') || req.url.startsWith('https://cdn.discordapp.com')) return true;
          if (req.url.startsWith('http://localhost') || req.url.startsWith('about:')) return true;
          return false;
        }}
      />

      {/* Floating control bar */}
      <SafeAreaView style={s.floatBar} edges={['bottom']}>
        {/* Fake deafen pill */}
        <TouchableOpacity
          style={[s.pill, fakeDeafen && s.pillActive]}
          onPress={toggleFakeDeafen}
        >
          <Text style={s.pillIcon}>{fakeDeafen ? '🔇' : '🎧'}</Text>
          <Text style={s.pillText}>{fakeDeafen ? 'F.DEAF ON' : 'F.DEAF'}</Text>
        </TouchableOpacity>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Mixer button */}
        <TouchableOpacity style={s.mixerBtn} onPress={openPanel}>
          <Text style={s.mixerIcon}>🎛️</Text>
          <Text style={s.mixerText}>MIXER</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Slide-in Control Panel */}
      {panelVisible && (
        <Animated.View
          style={[s.panel, { transform: [{ translateX: slideAnim }] }]}
        >
          <ControlPanel
            webviewRef={webviewRef}
            fakeDeafen={fakeDeafen}
            onToggleFakeDeafen={toggleFakeDeafen}
            onClose={closePanel}
          />
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0f' },
  webview: { flex: 1 },
  floatBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: 'rgba(10,10,15,0.92)',
    borderTopWidth: 1, borderTopColor: '#1a1a2e'
  },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111118', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#2d2d3d', gap: 6
  },
  pillActive: {
    backgroundColor: '#1a0030', borderColor: '#7c3aed',
    shadowColor: '#7c3aed', shadowOpacity: 0.4, shadowRadius: 8
  },
  pillIcon: { fontSize: 14 },
  pillText: { color: '#ccc', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  mixerBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0f172a', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: '#1e40af', gap: 6,
    shadowColor: '#3b82f6', shadowOpacity: 0.3, shadowRadius: 8
  },
  mixerIcon: { fontSize: 18 },
  mixerText: { color: '#60a5fa', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  panel: {
    position: 'absolute', top: 0, bottom: 0,
    right: 0, width: SCREEN_W,
    backgroundColor: '#0a0a0f',
    shadowColor: '#000', shadowOpacity: 0.6,
    shadowRadius: 20, shadowOffset: { width: -4, height: 0 }
  }
});
