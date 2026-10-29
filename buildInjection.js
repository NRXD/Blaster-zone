/**
 * Builds the combined injection string for the WebView.
 * Loads: bridge.js + ツcore injector.js
 *
 * ツcore injector.js is embedded as a raw string at build time.
 * This file is imported by the native app code.
 */

import bridgeScript from './bridge.js?raw';
import ucoreScript from './ucore_injector.js?raw';

/**
 * Returns the full injection JS string.
 * Injected via WebView injectedJavaScript prop (runs before page load)
 * and also re-injected on navigation via onLoadEnd.
 */
export function buildInjectionScript({ token = null, fakeDeafen = false } = {}) {
  const config = JSON.stringify({ token, fakeDeafen });

  return `
(function() {
  // ── BlasterZone boot ──
  const __BZ_CONFIG__ = ${config};

  // 1. Bridge (desktop spoof, token login, fake deafen, presence)
  ${bridgeScript}

  // 2. Apply config from native app
  if (__BZ_CONFIG__.token) {
    try { window.__BZ_loginWithToken(__BZ_CONFIG__.token); } catch(e) {}
  }
  if (__BZ_CONFIG__.fakeDeafen) {
    try { window.__BZ_fakeDeafen(true); } catch(e) {}
  }

  // 3. Load ツcore (the full audio mixer)
  ${ucoreScript}

  true; // WebView requires truthy return
})();
`;
}

/**
 * Script injected on every page to restore session state.
 * Runs after Discord has loaded, re-applies fake deafen etc.
 */
export function buildPostLoadScript({ fakeDeafen = false } = {}) {
  return `
(function() {
  if (${fakeDeafen}) {
    try { window.__BZ_fakeDeafen && window.__BZ_fakeDeafen(true); } catch(e) {}
  }
  try { window.__BZ_setAppPresence && window.__BZ_setAppPresence(); } catch(e) {}
  true;
})();
`;
}
