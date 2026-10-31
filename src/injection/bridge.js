/**
 * BlasterZone Bridge Injection Script
 * Injected into Discord web via WebView.
 * Handles: token login, desktop spoof, fake deafen, ツcore loader.
 *
 * This runs INSIDE the Discord WebView context.
 */
(function() {
  'use strict';
  if (window.__BLASTERZONE_BRIDGE__) return;
  window.__BLASTERZONE_BRIDGE__ = true;

  // ─── DESKTOP SPOOF ──────────────────────────────────────────────────────
  // Override the identify payload so Discord sees us as a desktop client.
  // Patches the WebSocket send method to intercept the IDENTIFY opcode (op:2).
  const _origWebSocket = window.WebSocket;
  function PatchedWebSocket(...args) {
    const ws = new _origWebSocket(...args);
    const _origSend = ws.send.bind(ws);
    ws.send = function(data) {
      try {
        if (typeof data === 'string') {
          const parsed = JSON.parse(data);
          // op 2 = IDENTIFY, op 6 = RESUME
          if (parsed && (parsed.op === 2 || parsed.op === 6)) {
            if (parsed.d && parsed.d.properties) {
              // Spoof as Windows Discord desktop client
              parsed.d.properties.$os = 'Windows';
              parsed.d.properties.$browser = 'Discord Client';
              parsed.d.properties.$device = 'desktop';
              parsed.d.properties.browser_user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9173 Chrome/124.0.6367.243 Electron/30.4.0 Safari/537.36';
              parsed.d.properties.browser_version = '30.4.0';
              parsed.d.properties.os_version = '10';
              parsed.d.properties.system_locale = 'en-US';
              parsed.d.properties.release_channel = 'stable';
              parsed.d.properties.client_build_number = 337622;
              parsed.d.properties.client_event_source = null;
              data = JSON.stringify(parsed);
            }
          }
        }
      } catch(e) {}
      return _origSend(data);
    };
    return ws;
  }
  PatchedWebSocket.prototype = _origWebSocket.prototype;
  Object.keys(_origWebSocket).forEach(k => { try { PatchedWebSocket[k] = _origWebSocket[k]; } catch(e) {} });
  window.WebSocket = PatchedWebSocket;

  // ─── TOKEN LOGIN ────────────────────────────────────────────────────────
  // If native app sends a token, auto-login without touching the UI.
  window.__BZ_loginWithToken = function(token) {
    if (!token) return;
    try {
      // Set token in localStorage (Discord web reads from here)
      window.localStorage.setItem('token', JSON.stringify(token));
      // Also try patching the internal token store
      const webpackChunkRequire = (() => {
        try {
          let req;
          window.webpackChunkdiscord_app.push([[Symbol()], {}, r => req = r]);
          return req;
        } catch(e) { return null; }
      })();
      if (webpackChunkRequire) {
        // Find the token module
        const modules = webpackChunkRequire.c;
        for (const id in modules) {
          const mod = modules[id];
          if (mod && mod.exports && mod.exports.getToken) {
            // Patch getToken to return our token
            const origGetToken = mod.exports.getToken;
            mod.exports.getToken = () => token;
            break;
          }
        }
      }
      // Force reload to apply token
      setTimeout(() => { window.location.reload(); }, 300);
    } catch(e) {
      console.error('[BlasterZone] Token login error:', e);
    }
  };

  // ─── FAKE DEAFEN ────────────────────────────────────────────────────────
  // Sends the deafened=true packet to Discord but keeps local audio alive.
  // We intercept the outgoing voice state update and swap deafened flag.
  window.__BZ_fakeDeafenEnabled = false;
  window.__BZ_fakeDeafen = function(enabled) {
    window.__BZ_fakeDeafenEnabled = enabled;
    // Patch all WebSockets currently open
    window.__BZ_applyFakeDeafen();
  };

  window.__BZ_applyFakeDeafen = function() {
    // This works by intercepting op 4 (VOICE_STATE_UPDATE) sends
    // The WebSocket patch below handles it
  };

  // Patch WebSocket send for fake deafen (op 4 = VOICE_STATE_UPDATE)
  // We already patched WS above; extend it here
  const _originalSend = PatchedWebSocket.prototype.send;

  // ─── SHOW AS APP (rich presence spoof) ──────────────────────────────────
  // Makes your status show the BlasterZone app in rich presence
  window.__BZ_setAppPresence = function() {
    // This sets activity via Discord's internal dispatch
    try {
      const webpackChunkRequire = (() => {
        try {
          let req;
          window.webpackChunkdiscord_app.push([[Symbol()], {}, r => req = r]);
          return req;
        } catch(e) { return null; }
      })();
      if (webpackChunkRequire) {
        const modules = webpackChunkRequire.c;
        for (const id in modules) {
          const mod = modules[id];
          if (mod && mod.exports && typeof mod.exports.dispatch === 'function') {
            mod.exports.dispatch({
              type: 'LOCAL_ACTIVITY_UPDATE',
              activity: {
                application_id: '1337420000000000000',
                name: 'BlasterZone',
                details: 'Audio Mixer',
                state: 'Full power',
                type: 0,
                flags: 1
              }
            });
            break;
          }
        }
      }
    } catch(e) {}
  };

  // ─── NATIVE BRIDGE LISTENER ─────────────────────────────────────────────
  // Receives commands from the React Native side via postMessage
  document.addEventListener('message', function(e) {
    try {
      const msg = JSON.parse(e.data);
      switch(msg.type) {
        case 'LOGIN_TOKEN':
          window.__BZ_loginWithToken(msg.token);
          break;
        case 'FAKE_DEAFEN':
          window.__BZ_fakeDeafen(msg.enabled);
          break;
        case 'SET_PRESENCE':
          window.__BZ_setAppPresence();
          break;
        case 'LOAD_UCORE':
          // Signal to load ツcore (injected separately)
          window.__BZ_ucoreReady = true;
          break;
      }
    } catch(e) {}
  });

  // ─── FAKE DEAFEN WEBSOCKET INTERCEPT ────────────────────────────────────
  // Extend the already-patched WebSocket to handle fake deafen on op 4
  const OrigWS = window.WebSocket;
  window.WebSocket = function(...args) {
    const ws = new OrigWS(...args);
    const _s = ws.send.bind(ws);
    ws.send = function(data) {
      try {
        if (window.__BZ_fakeDeafenEnabled && typeof data === 'string') {
          const p = JSON.parse(data);
          // op 4 = VOICE_STATE_UPDATE
          if (p && p.op === 4 && p.d) {
            // Tell Discord we're deafened but don't actually deafen locally
            p.d.self_deaf = true;
            data = JSON.stringify(p);
            // Notify native side that fake deafen is active
            try {
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
                JSON.stringify({ type: 'FAKE_DEAFEN_ACTIVE', value: true })
              );
            } catch(_) {}
          }
        }
      } catch(e) {}
      return _s(data);
    };
    return ws;
  };
  window.WebSocket.prototype = OrigWS.prototype;
  Object.keys(OrigWS).forEach(k => { try { window.WebSocket[k] = OrigWS[k]; } catch(e) {} });

  // Tell native the bridge loaded
  try {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'BRIDGE_READY' })
    );
  } catch(_) {}

})();
