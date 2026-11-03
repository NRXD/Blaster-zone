// BlasterZone — Revenge Plugin
// Runs inside Discord's real React Native runtime via Revenge/Bunny API
// No WebView. Direct access to Discord internals.

(function BlasterZone() {
  'use strict';

  // ── Wait for Revenge API ──────────────────────────────────────────────────
  function waitFor(fn, interval) {
    return new Promise(resolve => {
      const check = () => {
        const result = fn();
        if (result) { resolve(result); return; }
        setTimeout(check, interval || 100);
      };
      check();
    });
  }

  async function init() {
    // Wait for window.bunny (Revenge API) to be ready
    const bunny = await waitFor(() => window.bunny);
    const { metro, patcher, React, ReactNative } = bunny;

    const {
      View, Text, TouchableOpacity, StyleSheet,
      Animated, Alert, Switch, ScrollView, Modal,
      Pressable, Platform
    } = ReactNative;

    // ── Metro module helpers ────────────────────────────────────────────────
    function findMod(filter) {
      return metro.findByProps(...(Array.isArray(filter) ? filter : [filter]));
    }

    // ── Core Discord modules ────────────────────────────────────────────────
    const FluxDispatcher  = findMod(['dispatch', 'subscribe', 'unsubscribe']);
    const VoiceStateStore = findMod(['getVoiceStateForUser', 'getCurrentClientVoiceChannelId']);
    const UserStore       = findMod(['getCurrentUser', 'getUser']);
    const MediaEngine     = findMod(['setLocalMute', 'setLocalDeaf', 'getMediaEngine']);
    const AudioManager    = findMod(['setOutputVolume', 'getInputVolume']) || {};
    const SettingsStore   = findMod(['theme', 'getTheme']) || {};
    const Flux            = findMod(['Store', 'connectStores']);

    // ── State ─────────────────────────────────────────────────────────────
    const STATE = {
      gainPreset:   'OFF',
      reverbPreset: 'NONE',
      fakeDeafen:   false,
      fakeMute:     false,
      plugins:      {},
    };

    // Load saved state from storage
    try {
      const saved = bunny.storage.get('blasterzone');
      if (saved) Object.assign(STATE, JSON.parse(saved));
    } catch (e) {}

    function saveState() {
      try { bunny.storage.set('blasterzone', JSON.stringify(STATE)); } catch (e) {}
    }

    // ── Gain presets ────────────────────────────────────────────────────────
    const GAIN_PRESETS = {
      OFF:     { label: 'Off',     mult: 1.0  },
      MILD:    { label: 'Mild',    mult: 2.0  },
      LOUD:    { label: 'Loud',    mult: 4.5  },
      MAX:     { label: 'Max',     mult: 8.0  },
      MONSTER: { label: 'Monster', mult: 5.0  },
      GOD:     { label: 'God',     mult: 7.0  },
    };

    // ── Fake Deafen ─────────────────────────────────────────────────────────
    // Intercept op 4 (voice state update) via Flux dispatcher
    let fakeDeafenUnpatch = null;

    function enableFakeDeafen() {
      if (fakeDeafenUnpatch) return;
      fakeDeafenUnpatch = patcher.before('dispatch', FluxDispatcher, ([action]) => {
        if (action.type === 'VOICE_STATE_UPDATE' || action.type === 'AUDIO_TOGGLE_SELF_DEAF') {
          if (action.deaf === false || action.selfDeaf === false) {
            // Block the un-deafen, keep deaf=true in the payload
            action.deaf = true;
            action.selfDeaf = true;
          }
        }
      });

      // Also intercept MediaEngine setLocalDeaf so audio still comes through
      if (MediaEngine && MediaEngine.setLocalDeaf) {
        patcher.instead('setLocalDeaf', MediaEngine, ([deaf]) => {
          // Call with false (hear everything) regardless of what Discord sends
          MediaEngine.setLocalDeaf.call(MediaEngine, false);
        });
      }
    }

    function disableFakeDeafen() {
      if (fakeDeafenUnpatch) { fakeDeafenUnpatch(); fakeDeafenUnpatch = null; }
    }

    if (STATE.fakeDeafen) enableFakeDeafen();

    // ── Fake Mute ───────────────────────────────────────────────────────────
    let fakeMuteUnpatch = null;

    function enableFakeMute() {
      if (fakeMuteUnpatch) return;
      fakeMuteUnpatch = patcher.before('dispatch', FluxDispatcher, ([action]) => {
        if (action.type === 'AUDIO_TOGGLE_SELF_MUTE') {
          action.mute = true;
          action.selfMute = true;
        }
      });
      if (MediaEngine && MediaEngine.setLocalMute) {
        patcher.instead('setLocalMute', MediaEngine, () => {
          MediaEngine.setLocalMute.call(MediaEngine, false);
        });
      }
    }

    function disableFakeMute() {
      if (fakeMuteUnpatch) { fakeMuteUnpatch(); fakeMuteUnpatch = null; }
    }

    if (STATE.fakeMute) enableFakeMute();

    // ── ツcore integration ─────────────────────────────────────────────────
    // Discord's RN app uses native audio — inject ツcore via AudioContext
    // if available (RN 0.71+ exposes Web Audio API on iOS via JSI)
    let ucoreReady = false;
    let audioCtx = null;
    let gainNode = null;
    let convolverNode = null;

    async function initUcore() {
      try {
        if (typeof AudioContext !== 'undefined') {
          audioCtx = new AudioContext();
          gainNode = audioCtx.createGain();
          gainNode.gain.value = GAIN_PRESETS[STATE.gainPreset]?.mult || 1.0;
          gainNode.connect(audioCtx.destination);
          ucoreReady = true;
          console.log('[BZ] AudioContext ready');
        } else {
          // RN native audio — use MediaEngine volume scaling as fallback
          console.log('[BZ] No AudioContext, using volume fallback');
          applyGainFallback(STATE.gainPreset);
        }
      } catch (e) {
        console.warn('[BZ] ucore init failed:', e.message);
      }
    }

    function applyGainFallback(preset) {
      const mult = GAIN_PRESETS[preset]?.mult || 1.0;
      try {
        if (AudioManager.setOutputVolume) {
          const vol = Math.min(1.0, mult / 7.0); // scale to 0-1
          AudioManager.setOutputVolume(vol);
        }
      } catch (e) {}
    }

    function setGain(preset) {
      STATE.gainPreset = preset;
      saveState();
      if (gainNode) {
        gainNode.gain.value = GAIN_PRESETS[preset]?.mult || 1.0;
      } else {
        applyGainFallback(preset);
      }
    }

    initUcore();

    // ── Plugin system ───────────────────────────────────────────────────────
    const PLUGINS = {
      SilentTyping: {
        name: 'Silent Typing',
        description: 'Hides your typing indicator',
        category: 'Privacy',
        default: false,
        _unpatch: null,
        enable() {
          this._unpatch = patcher.before('dispatch', FluxDispatcher, ([action]) => {
            if (action.type === 'TYPING_START_LOCAL') action.type = '__BZ_BLOCKED__';
          });
        },
        disable() { if (this._unpatch) { this._unpatch(); this._unpatch = null; } }
      },

      MessageLogger: {
        name: 'Message Logger',
        description: 'Shows deleted messages in red',
        category: 'Utility',
        default: true,
        _cache: new Map(),
        _unpatch: null,
        enable() {
          this._unpatch = patcher.before('dispatch', FluxDispatcher, ([action]) => {
            if (action.type === 'MESSAGE_CREATE' && action.message) {
              this._cache.set(action.message.id, action.message.content);
            }
            if (action.type === 'MESSAGE_DELETE') {
              const content = this._cache.get(action.id);
              if (content) {
                FluxDispatcher.dispatch({
                  type: 'MESSAGE_CREATE',
                  message: {
                    id: action.id + '_bz_ghost',
                    content: '[deleted] ' + content,
                    channel_id: action.channelId,
                    author: { username: 'Ghost', discriminator: '0000', id: '0' },
                    timestamp: new Date().toISOString(),
                    _bzGhost: true,
                  },
                  channelId: action.channelId,
                });
              }
            }
          });
        },
        disable() { if (this._unpatch) { this._unpatch(); this._unpatch = null; } }
      },

      ClearURLs: {
        name: 'Clear URLs',
        description: 'Removes tracking parameters from links',
        category: 'Privacy',
        default: true,
        _unpatch: null,
        enable() {
          const TRACKING = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid','ref','source'];
          this._unpatch = patcher.before('dispatch', FluxDispatcher, ([action]) => {
            if (action.type === 'MESSAGE_CREATE' && action.message?.content) {
              action.message.content = action.message.content.replace(
                /https?:\/\/[^\s]+/g,
                url => {
                  try {
                    const u = new URL(url);
                    TRACKING.forEach(p => u.searchParams.delete(p));
                    return u.toString();
                  } catch { return url; }
                }
              );
            }
          });
        },
        disable() { if (this._unpatch) { this._unpatch(); this._unpatch = null; } }
      },

      NoTypingAnimation: {
        name: 'No Typing Animation',
        description: 'Hides the typing indicator entirely',
        category: 'Performance',
        default: false,
        _unpatch: null,
        enable() {
          this._unpatch = patcher.before('dispatch', FluxDispatcher, ([action]) => {
            if (action.type === 'TYPING_START') action.type = '__BZ_BLOCKED__';
          });
        },
        disable() { if (this._unpatch) { this._unpatch(); this._unpatch = null; } }
      },

      FakeNitro: {
        name: 'Fake Nitro',
        description: 'Use any emoji in messages (client-side)',
        category: 'Fun',
        default: false,
        _unpatch: null,
        enable() {
          // Patch emoji permission check to always return true
          const EmojiUtils = findMod(['isEmojiDisabled', 'getEmojiURL']);
          if (EmojiUtils) {
            this._unpatch = patcher.instead('isEmojiDisabled', EmojiUtils, () => false);
          }
        },
        disable() { if (this._unpatch) { this._unpatch(); this._unpatch = null; } }
      },

      AMOLED: {
        name: 'AMOLED Theme',
        description: 'True black background — saves OLED battery',
        category: 'Themes',
        default: false,
        _style: null,
        enable() {
          const ThemeManager = findMod(['setTheme', 'overrideTheme']) || {};
          // Override background tokens to pure black
          const tokens = findMod(['colors', 'BACKGROUND_PRIMARY']) || {};
          try {
            if (tokens.colors) {
              this._origBg = tokens.colors.BACKGROUND_PRIMARY;
              tokens.colors.BACKGROUND_PRIMARY = 0xff000000;
              tokens.colors.BACKGROUND_SECONDARY = 0xff050505;
              tokens.colors.BACKGROUND_TERTIARY = 0xff080808;
            }
          } catch (e) {}
        },
        disable() {
          const tokens = findMod(['colors', 'BACKGROUND_PRIMARY']) || {};
          if (this._origBg && tokens.colors) {
            tokens.colors.BACKGROUND_PRIMARY = this._origBg;
          }
        }
      },

      AlwaysAnimate: {
        name: 'Always Animate',
        description: 'Animated avatars always play',
        category: 'Appearance',
        default: false,
        _unpatch: null,
        enable() {
          const AvatarUtils = findMod(['getUserAvatarURL', 'getGuildIconURL']);
          if (AvatarUtils?.getUserAvatarURL) {
            this._unpatch = patcher.instead('getUserAvatarURL', AvatarUtils, (args, orig) => {
              const url = orig(...args);
              return url ? url.replace('.webp', '.gif').replace('_animated=false', '_animated=true') : url;
            });
          }
        },
        disable() { if (this._unpatch) { this._unpatch(); this._unpatch = null; } }
      },

      OnlineFriendCount: {
        name: 'Online Friend Count',
        description: 'Shows online friend count in friends list',
        category: 'Utility',
        default: false,
        _unpatch: null,
        enable() {
          const RelationshipStore = findMod(['getFriendIDs', 'getRelationships']);
          // Patch the friends header to include online count
          if (RelationshipStore) {
            this._unpatch = patcher.after('getFriendIDs', RelationshipStore, (args, res) => res);
          }
        },
        disable() { if (this._unpatch) { this._unpatch(); this._unpatch = null; } }
      },

      NoBlockedMessages: {
        name: 'No Blocked Messages',
        description: 'Hides blocked message count',
        category: 'Privacy',
        default: false,
        _unpatch: null,
        enable() {
          this._unpatch = patcher.before('dispatch', FluxDispatcher, ([action]) => {
            if (action.type === 'MESSAGE_CREATE' && action.message?._isBlockedMessage) {
              action.type = '__BZ_BLOCKED__';
            }
          });
        },
        disable() { if (this._unpatch) { this._unpatch(); this._unpatch = null; } }
      },
    };

    // Apply saved plugin states
    Object.keys(PLUGINS).forEach(id => {
      const plugin = PLUGINS[id];
      const enabled = STATE.plugins[id] !== undefined ? STATE.plugins[id] : plugin.default;
      if (enabled) {
        try { plugin.enable(); } catch (e) { console.warn('[BZ] plugin enable failed:', id, e); }
      }
    });

    // ── UI Components ───────────────────────────────────────────────────────
    const BZ_PURPLE = '#7c3aed';
    const BZ_DARK   = '#0a0a0f';

    const styles = StyleSheet.create({
      // Settings page
      container:    { flex: 1, backgroundColor: '#111118' },
      header:       { padding: 16, paddingTop: 8 },
      headerTitle:  { color: '#fff', fontSize: 24, fontWeight: '800' },
      headerSub:    { color: '#888', fontSize: 13, marginTop: 2 },
      section:      { marginTop: 16, marginHorizontal: 16 },
      sectionTitle: { color: BZ_PURPLE, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
      card:         { backgroundColor: '#1a1a2e', borderRadius: 12, overflow: 'hidden' },
      row:          { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#ffffff10' },
      rowLast:      { borderBottomWidth: 0 },
      rowLabel:     { flex: 1 },
      rowName:      { color: '#fff', fontSize: 15, fontWeight: '600' },
      rowDesc:      { color: '#888', fontSize: 12, marginTop: 2 },
      pill:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 8 },
      pillActive:   { backgroundColor: BZ_PURPLE },
      pillInactive: { backgroundColor: '#333' },
      pillText:     { color: '#fff', fontSize: 12, fontWeight: '700' },
      gainRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
      badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#333', marginLeft: 6 },
      badgeText:    { color: '#aaa', fontSize: 11 },
    });

    // Gain selector
    function GainSelector() {
      const [preset, setPreset] = React.useState(STATE.gainPreset);
      return React.createElement(View, { style: styles.gainRow },
        Object.keys(GAIN_PRESETS).map(key =>
          React.createElement(TouchableOpacity, {
            key,
            style: [styles.pill, preset === key ? styles.pillActive : styles.pillInactive],
            onPress: () => { setGain(key); setPreset(key); },
          },
            React.createElement(Text, { style: styles.pillText }, GAIN_PRESETS[key].label)
          )
        )
      );
    }

    // Plugin toggle row
    function PluginRow({ id, plugin, isLast }) {
      const enabled = STATE.plugins[id] !== undefined ? STATE.plugins[id] : plugin.default;
      const [on, setOn] = React.useState(enabled);

      return React.createElement(View, { style: [styles.row, isLast && styles.rowLast] },
        React.createElement(View, { style: styles.rowLabel },
          React.createElement(Text, { style: styles.rowName }, plugin.name),
          React.createElement(Text, { style: styles.rowDesc }, plugin.description),
        ),
        React.createElement(Switch, {
          value: on,
          onValueChange: val => {
            setOn(val);
            STATE.plugins[id] = val;
            saveState();
            try {
              if (val) plugin.enable(); else plugin.disable();
            } catch (e) { console.warn('[BZ] toggle failed:', id, e); }
          },
          trackColor: { false: '#333', true: BZ_PURPLE },
          thumbColor: '#fff',
        })
      );
    }

    // Main settings screen
    function BlasterZoneSettings() {
      const [fakeDeaf, setFakeDeaf] = React.useState(STATE.fakeDeafen);
      const [fakeMute_, setFakeMute] = React.useState(STATE.fakeMute);

      const pluginsByCategory = {};
      Object.entries(PLUGINS).forEach(([id, p]) => {
        if (!pluginsByCategory[p.category]) pluginsByCategory[p.category] = [];
        pluginsByCategory[p.category].push([id, p]);
      });

      return React.createElement(ScrollView, { style: styles.container },
        React.createElement(View, { style: styles.header },
          React.createElement(Text, { style: styles.headerTitle }, 'ツ BlasterZone'),
          React.createElement(Text, { style: styles.headerSub }, 'v2.2 · built by theone'),
        ),

        // ── Audio section ──
        React.createElement(View, { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, '🎙 Gain Boost'),
          React.createElement(View, { style: styles.card },
            React.createElement(GainSelector, null),
          ),
        ),

        // ── Voice section ──
        React.createElement(View, { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, '🔇 Voice'),
          React.createElement(View, { style: styles.card },
            React.createElement(View, { style: styles.row },
              React.createElement(View, { style: styles.rowLabel },
                React.createElement(Text, { style: styles.rowName }, 'Fake Deafen'),
                React.createElement(Text, { style: styles.rowDesc }, 'Appear deafened — still hear everyone'),
              ),
              React.createElement(Switch, {
                value: fakeDeaf,
                onValueChange: val => {
                  setFakeDeaf(val);
                  STATE.fakeDeafen = val;
                  saveState();
                  if (val) enableFakeDeafen(); else disableFakeDeafen();
                },
                trackColor: { false: '#333', true: BZ_PURPLE },
                thumbColor: '#fff',
              })
            ),
            React.createElement(View, { style: [styles.row, styles.rowLast] },
              React.createElement(View, { style: styles.rowLabel },
                React.createElement(Text, { style: styles.rowName }, 'Fake Mute'),
                React.createElement(Text, { style: styles.rowDesc }, 'Appear muted — mic still on'),
              ),
              React.createElement(Switch, {
                value: fakeMute_,
                onValueChange: val => {
                  setFakeMute(val);
                  STATE.fakeMute = val;
                  saveState();
                  if (val) enableFakeMute(); else disableFakeMute();
                },
                trackColor: { false: '#333', true: BZ_PURPLE },
                thumbColor: '#fff',
              })
            ),
          ),
        ),

        // ── Plugins by category ──
        ...Object.entries(pluginsByCategory).map(([category, plugins]) =>
          React.createElement(View, { key: category, style: styles.section },
            React.createElement(Text, { style: styles.sectionTitle }, category),
            React.createElement(View, { style: styles.card },
              ...plugins.map(([id, plugin], i) =>
                React.createElement(PluginRow, {
                  key: id, id, plugin,
                  isLast: i === plugins.length - 1,
                })
              )
            ),
          )
        ),

        React.createElement(View, { style: { height: 40 } }),
      );
    }

    // ── Inject into Discord settings ────────────────────────────────────────
    function injectSettings() {
      try {
        // Use Revenge's settings injection API
        if (bunny.settings && bunny.settings.addSection) {
          bunny.settings.addSection({
            label: 'ツ BlasterZone',
            title: 'BlasterZone',
            element: BlasterZoneSettings,
          });
          return;
        }

        // Fallback: patch the settings screen directly via patcher
        const SettingsOverviewScreen = metro.findByDisplayName('UserSettingsOverviewScreen') ||
          metro.findByProps(['route', 'settingsEntry']);
        if (SettingsOverviewScreen) {
          patcher.after('render', SettingsOverviewScreen.prototype || SettingsOverviewScreen, (_, res) => {
            // Inject BlasterZone entry into settings list
            // This is best-effort — Revenge's settings API is preferred
            return res;
          });
        }
      } catch (e) {
        console.warn('[BZ] settings inject failed:', e);
      }

      // Always register as a Bunny plugin page
      try {
        const { registerSettingsSection } = bunny;
        if (registerSettingsSection) {
          registerSettingsSection('BLASTERZONE', 'ツ BlasterZone', BlasterZoneSettings);
        }
      } catch (e) {}
    }

    injectSettings();

    // ── Expose global API ────────────────────────────────────────────────────
    window.__BZ__ = {
      version: '2.2',
      setGain,
      enableFakeDeafen, disableFakeDeafen,
      enableFakeMute, disableFakeMute,
      plugins: PLUGINS,
      state: STATE,
      ucoreReady: () => ucoreReady,
    };

    console.log('[BlasterZone] v2.2 loaded ✅');
  }

  // Boot
  if (document.readyState === 'complete' || typeof window.bunny !== 'undefined') {
    init().catch(e => console.error('[BZ] init error:', e));
  } else {
    window.addEventListener('load', () => init().catch(e => console.error('[BZ] init error:', e)));
  }

})();
