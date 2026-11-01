// BlasterZone injection builder — reads ucore_injector.js raw and wraps it
// with all BlasterZone hooks: token login, desktop spoof, fake deafen, mega gain

import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

// ucore_injector.txt is a copy of ucore_injector.js stored as .txt
// so Metro bundles it as a static asset we can read at runtime
const UCORE_ASSET = require('../../assets/ucore_injector.txt');

// Gain presets — much stronger than original
export const GAIN_PRESETS = {
  OFF:     { masterGain: 100,  inputBoost: 100,  gain2: 0,    gain3: 0    },
  MILD:    { masterGain: 200,  inputBoost: 200,  gain2: 100,  gain3: 0    },
  LOUD:    { masterGain: 450,  inputBoost: 450,  gain2: 300,  gain3: 150  },
  MAX:     { masterGain: 800,  inputBoost: 800,  gain2: 600,  gain3: 400  },
  ULTRA:   { masterGain: 1200, inputBoost: 1200, gain2: 900,  gain3: 600  },
  MONSTER: { masterGain: 500,  inputBoost: 500,  gain2: 400,  gain3: 300  },
  GOD:     { masterGain: 700,  inputBoost: 700,  gain2: 600,  gain3: 500  },
};

export const REVERB_PRESETS = {
  NONE: { room: 'None' },
  SMALL_ROOM: { room: 'Small Room' },
  LARGE_ROOM: { room: 'Large Room' },
  CATHEDRAL: { room: 'Cathedral' },
  // HAUNTED CAVERN — DO NOT TOUCH — PERFECT AS-IS
  HAUNTED_CAVERN: { room: 'Haunted Cavern' },
  UNDERWATER: { room: 'Underwater' },
  CONCERT: { room: 'Concert Hall' },
};

export const VOICE_PRESETS = {
  NONE: 'None',
  DEEP: 'Deep',
  CHIPMUNK: 'Chipmunk',
  ROBOT: 'Robot',
  DEMON: 'Demon',
  ANGEL: 'Angel',
};

export const DEVICE_SPOOF = {
  DESKTOP_WINDOWS: {
    label: 'Windows Desktop',
    properties: {
      os: 'Windows',
      browser: 'Discord Client',
      device: '',
      system_locale: 'en-US',
      browser_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9158 Chrome/120.0.6099.291 Electron/28.2.10 Safari/537.36',
      browser_version: '28.2.10',
      os_version: '10',
      referrer: '',
      referring_domain: '',
      referrer_current: '',
      referring_domain_current: '',
      release_channel: 'stable',
      client_build_number: 9999,
      client_event_source: null,
    }
  },
  DESKTOP_MAC: {
    label: 'Mac Desktop',
    properties: {
      os: 'Mac OS X',
      browser: 'Discord Client',
      device: '',
      system_locale: 'en-US',
      browser_user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9158 Chrome/120.0.6099.291 Electron/28.2.10 Safari/537.36',
      browser_version: '28.2.10',
      os_version: '23.0.0',
      referrer: '',
      referring_domain: '',
      release_channel: 'stable',
      client_build_number: 9999,
      client_event_source: null,
    }
  },
  MOBILE_IOS: {
    label: 'iOS Mobile',
    properties: {
      os: 'iOS',
      browser: 'Discord iOS',
      device: 'iPhone',
      system_locale: 'en-US',
      browser_user_agent: 'Discord-iOS/218.0 iOS/17.0',
      browser_version: '218.0',
      os_version: '17.0',
      release_channel: 'stable',
      client_build_number: 9999,
      client_event_source: null,
    }
  },
  MOBILE_ANDROID: {
    label: 'Android Mobile',
    properties: {
      os: 'Android',
      browser: 'Discord Android',
      device: 'Android',
      system_locale: 'en-US',
      browser_user_agent: 'Discord-Android/218 rv:218',
      browser_version: '218',
      os_version: '14',
      release_channel: 'stable',
      client_build_number: 9999,
      client_event_source: null,
    }
  },
  WEB_CHROME: {
    label: 'Chrome Browser',
    properties: {
      os: 'Windows',
      browser: 'Chrome',
      device: '',
      system_locale: 'en-US',
      browser_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      browser_version: '120.0.0.0',
      os_version: '10',
      release_channel: 'stable',
      client_build_number: 9999,
      client_event_source: null,
    }
  },
  VR: {
    label: 'VR Headset',
    properties: {
      os: 'Linux',
      browser: 'Discord Client',
      device: 'Quest 3',
      system_locale: 'en-US',
      browser_user_agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OpenVR/2.5.17',
      browser_version: '28.2.10',
      os_version: '',
      release_channel: 'stable',
      client_build_number: 9999,
      client_event_source: null,
    }
  },
};

// Reads ucore_injector.js from the bundle — inline it as string
let _ucoreCache = null;

export async function loadUcore() {
  if (_ucoreCache) return _ucoreCache;
  try {
    // Load the .txt asset (Metro bundles text files as downloadable assets)
    const asset = Asset.fromModule(UCORE_ASSET);
    await asset.downloadAsync();
    const uri = asset.localUri || asset.uri;
    if (!uri) throw new Error('no uri');
    const text = await FileSystem.readAsStringAsync(uri);
    _ucoreCache = text;
    return text;
  } catch (e) {
    console.warn('ucore load failed:', e.message);
    // Return empty string — app still works, just without audio engine
    return '';
  }
}

export function buildInjection({
  token = null,
  gainPreset = 'OFF',
  reverbPreset = 'NONE',
  voicePreset = 'NONE',
  fakeDeafen = false,
  fakeMute = false,
  deviceSpoof = 'DESKTOP_WINDOWS',
  ucoreSource = '',
  eqBands = null,
}) {
  const gain = GAIN_PRESETS[gainPreset] || GAIN_PRESETS.OFF;
  const reverbRoom = REVERB_PRESETS[reverbPreset]?.room || 'None';
  const spoofProps = DEVICE_SPOOF[deviceSpoof]?.properties || DEVICE_SPOOF.DESKTOP_WINDOWS.properties;
  const spoofJson = JSON.stringify(spoofProps);

  return `
(function() {
  'use strict';

  // ── BlasterZone bootstrap ────────────────────────────────────────────────
  if (window.__BZ_INJECTED__) return;
  window.__BZ_INJECTED__ = true;

  // ── RN bridge ───────────────────────────────────────────────────────────
  function bzPost(type, data) {
    try {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
        JSON.stringify({ type, ...data })
      );
    } catch(e) {}
  }

  // ── Gain config ─────────────────────────────────────────────────────────
  window.__BZ_GAIN__ = {
    masterGain:  ${gain.masterGain},
    inputBoost:  ${gain.inputBoost},
    gain2:       ${gain.gain2},
    gain3:       ${gain.gain3},
  };

  // ── Reverb ──────────────────────────────────────────────────────────────
  window.__BZ_REVERB__ = ${JSON.stringify(reverbRoom)};

  // ── Voice ───────────────────────────────────────────────────────────────
  window.__BZ_VOICE__ = ${JSON.stringify(voicePreset)};

  // ── EQ bands ────────────────────────────────────────────────────────────
  window.__BZ_EQ__ = ${JSON.stringify(eqBands || [0,0,0,0,0,0,0,0,0])};

  // ── Fake deafen / mute state ─────────────────────────────────────────────
  window.__BZ_FAKE_DEAFEN__ = ${fakeDeafen};
  window.__BZ_FAKE_MUTE__   = ${fakeMute};

  // ── Device spoof ────────────────────────────────────────────────────────
  window.__BZ_DEVICE_PROPS__ = ${spoofJson};

  // ── Token injection ─────────────────────────────────────────────────────
  ${token ? `
  window.__BZ_TOKEN__ = ${JSON.stringify(token)};
  function injectToken() {
    try {
      // Webpack chunk approach
      const wpRequire = window.webpackChunkdiscord_app
        ? (() => {
            let r;
            window.webpackChunkdiscord_app.push([[Symbol()], {}, (req) => { r = req; }]);
            return r;
          })()
        : null;
      if (wpRequire) {
        const mods = wpRequire.m;
        for (const k in mods) {
          const s = mods[k].toString();
          if (s.includes('getToken') && s.includes('localStorage')) {
            const m = wpRequire(k);
            if (m && typeof m.setToken === 'function') {
              m.setToken(window.__BZ_TOKEN__);
              bzPost('TOKEN_INJECTED', { ok: true });
              return;
            }
          }
        }
      }
      // Fallback: localStorage
      window.localStorage.setItem('token', JSON.stringify(window.__BZ_TOKEN__));
      bzPost('TOKEN_INJECTED', { fallback: true });
    } catch(e) {
      bzPost('TOKEN_ERROR', { err: e.message });
    }
  }
  if (document.readyState === 'complete') {
    setTimeout(injectToken, 800);
  } else {
    window.addEventListener('load', () => setTimeout(injectToken, 800));
  }
  ` : ''}

  // ── WebSocket intercept: desktop spoof + fake deafen ───────────────────
  (function() {
    const OrigWS = window.WebSocket;
    function PatchedWS(url, protocols) {
      const ws = protocols ? new OrigWS(url, protocols) : new OrigWS(url);
      const origSend = ws.send.bind(ws);
      ws.send = function(data) {
        try {
          const msg = JSON.parse(data);
          // op 2 = IDENTIFY — inject device spoof
          if (msg.op === 2 && msg.d && msg.d.properties) {
            msg.d.properties = { ...msg.d.properties, ...window.__BZ_DEVICE_PROPS__ };
            data = JSON.stringify(msg);
            bzPost('SPOOF_APPLIED', { op: 2 });
          }
          // op 4 = VOICE_STATE_UPDATE — fake deafen
          if (msg.op === 4 && msg.d) {
            if (window.__BZ_FAKE_DEAFEN__) {
              msg.d.self_deaf = true;   // show as deafened to others
              msg.d.self_mute = window.__BZ_FAKE_MUTE__ ? true : msg.d.self_mute;
              data = JSON.stringify(msg);
              bzPost('FAKE_DEAFEN_APPLIED', {});
            }
          }
        } catch(e) {}
        origSend(data);
      };
      // intercept incoming to suppress actual deafen audio effect
      const origAddListener = ws.addEventListener.bind(ws);
      ws.addEventListener = function(type, handler, opts) {
        if (type === 'message') {
          const wrapped = function(event) {
            // let all messages through — we only suppress what WE send
            handler.call(this, event);
          };
          return origAddListener(type, wrapped, opts);
        }
        return origAddListener(type, handler, opts);
      };
      return ws;
    }
    PatchedWS.prototype = OrigWS.prototype;
    Object.defineProperty(PatchedWS, 'CONNECTING', { value: 0 });
    Object.defineProperty(PatchedWS, 'OPEN', { value: 1 });
    Object.defineProperty(PatchedWS, 'CLOSING', { value: 2 });
    Object.defineProperty(PatchedWS, 'CLOSED', { value: 3 });
    window.WebSocket = PatchedWS;
  })();

  // ── Audio intercept: override gain before ucore takes over ────────────
  (function() {
    const OrigAudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!OrigAudioCtx) return;
    const OrigGain = OrigAudioCtx.prototype.createGain;
    OrigAudioCtx.prototype.createGain = function() {
      const node = OrigGain.call(this);
      const g = window.__BZ_GAIN__;
      if (g && g.masterGain > 100) {
        // pre-set gain value so any audio path gets boosted immediately
        node.gain.value = g.masterGain / 100;
      }
      return node;
    };
  })();

  // ── Lag fix: battery-saver options & media session ───────────────────
  try {
    // Reduce unnecessary animation frame usage in Discord
    const origRAF = window.requestAnimationFrame;
    let _lastRaf = 0;
    window.requestAnimationFrame = function(cb) {
      return origRAF.call(window, (ts) => {
        // throttle to 30fps max when tab not focused to reduce lag
        if (document.hidden && ts - _lastRaf < 33) return;
        _lastRaf = ts;
        cb(ts);
      });
    };
  } catch(e) {}

  // ── Music lag fix: buffer size hints ─────────────────────────────────
  try {
    const OrigAudioCtx = window.AudioContext || window.webkitAudioContext;
    if (OrigAudioCtx) {
      const orig = OrigAudioCtx.prototype.createScriptProcessor;
      OrigAudioCtx.prototype.createScriptProcessor = function(bufferSize, inCh, outCh) {
        // Force larger buffer to reduce music crackling/lag
        const safeBuf = Math.max(bufferSize || 4096, 4096);
        return orig.call(this, safeBuf, inCh, outCh);
      };
    }
  } catch(e) {}

  // ── ucore v3.17.0 ────────────────────────────────────────────────────
  // Inject ucore AFTER all patches are in place
  try {
    ${ucoreSource}
  } catch(ucoreErr) {
    bzPost('UCORE_ERROR', { err: ucoreErr.message });
  }

  // ── Apply gain/reverb to ucore if loaded ─────────────────────────────
  function applyUcoreSettings() {
    try {
      if (!window.__N7RCORD_API__) return;
      const api = window.__N7RCORD_API__;
      const g = window.__BZ_GAIN__;
      if (api.setMasterGain)  api.setMasterGain(g.masterGain);
      if (api.setInputBoost)  api.setInputBoost(g.inputBoost);
      if (api.setGain2)       api.setGain2(g.gain2);
      if (api.setGain3)       api.setGain3(g.gain3);
      if (api.setReverb && window.__BZ_REVERB__ !== 'None') {
        api.setReverb(window.__BZ_REVERB__);
      }
      if (api.setVoiceChanger && window.__BZ_VOICE__ !== 'None') {
        api.setVoiceChanger(window.__BZ_VOICE__);
      }
      if (api.setEQ && window.__BZ_EQ__) {
        api.setEQ(window.__BZ_EQ__);
      }
      bzPost('UCORE_READY', { gain: g.masterGain, reverb: window.__BZ_REVERB__ });
    } catch(e) {
      bzPost('UCORE_APPLY_ERR', { err: e.message });
    }
  }

  // Poll until ucore API is ready
  let _ucorePoll = 0;
  const _ucoreTimer = setInterval(() => {
    _ucorePoll++;
    if (window.__N7RCORD_API__) {
      clearInterval(_ucoreTimer);
      applyUcoreSettings();
    }
    if (_ucorePoll > 40) clearInterval(_ucoreTimer);
  }, 250);

  // Expose BZ control API to RN side
  window.__BZ_API__ = {
    setGain(preset) {
      const g = ${JSON.stringify(GAIN_PRESETS)}[preset];
      if (!g) return;
      window.__BZ_GAIN__ = g;
      applyUcoreSettings();
    },
    setReverb(room) {
      window.__BZ_REVERB__ = room;
      try {
        if (window.__N7RCORD_API__?.setReverb) window.__N7RCORD_API__.setReverb(room);
      } catch(e) {}
    },
    setVoice(v) {
      window.__BZ_VOICE__ = v;
      try {
        if (window.__N7RCORD_API__?.setVoiceChanger) window.__N7RCORD_API__.setVoiceChanger(v);
      } catch(e) {}
    },
    setEQ(bands) {
      window.__BZ_EQ__ = bands;
      try {
        if (window.__N7RCORD_API__?.setEQ) window.__N7RCORD_API__.setEQ(bands);
      } catch(e) {}
    },
    setFakeDeafen(val) {
      window.__BZ_FAKE_DEAFEN__ = val;
    },
    setFakeMute(val) {
      window.__BZ_FAKE_MUTE__ = val;
    },
    getStatus() {
      return {
        ucoreLoaded: !!window.__N7RCORD_API__,
        gain: window.__BZ_GAIN__,
        reverb: window.__BZ_REVERB__,
        voice: window.__BZ_VOICE__,
        fakeDeafen: window.__BZ_FAKE_DEAFEN__,
        fakeMute: window.__BZ_FAKE_MUTE__,
      };
    }
  };

  bzPost('BZ_READY', { version: '2.0.0' });
})();
`;
}
