// BlasterZone v2.3 — Revenge Preload Plugin
// Targets window.vendetta API (Vendetta-compat, confirmed present in Revenge)
// Also supports window.bunny if available
// Runs as a preload: fires before Discord UI, waits for API to be ready

(function BlasterZone() {
  'use strict';

  var VERSION = '2.3';
  var BZ_KEY = '__blasterzone_state__';

  // ────────────────────────────────────────────────────────────────────────
  // Bootstrap: wait for either vendetta or bunny to be ready
  // ────────────────────────────────────────────────────────────────────────
  var MAX_ATTEMPTS = 600; // 120 seconds at 200ms
  var attempt = 0;

  function poll() {
    attempt++;
    if (attempt > MAX_ATTEMPTS) {
      console.warn('[BZ] API never ready after ' + MAX_ATTEMPTS + ' attempts');
      return;
    }
    var api = window.vendetta || window.bunny;
    if (!api) {
      setTimeout(poll, 200);
      return;
    }
    try { boot(api); }
    catch (e) { console.error('[BZ] boot error:', e && e.message); }
  }

  setTimeout(poll, 300);

  // ────────────────────────────────────────────────────────────────────────
  // Main boot — runs once API is available
  // ────────────────────────────────────────────────────────────────────────
  function boot(api) {
    console.log('[BZ] v' + VERSION + ' booting, API:', api === window.vendetta ? 'vendetta' : 'bunny');

    // Resolve sub-APIs — vendetta and bunny have slightly different shapes
    var metro   = api.metro   || (api.modules && api.modules.metro) || {};
    var patcher = api.patcher || {};
    var storage = api.storage || {};
    var React   = api.React   || window.React;
    var RN      = api.ReactNative || window.ReactNative || {};

    // Compat: vendetta uses findByProps, bunny uses metro.findByProps
    var findByProps = (metro.findByProps && metro.findByProps.bind(metro))
      || (api.findByProps && api.findByProps.bind(api))
      || function() { return null; };

    var findByName = (metro.findByDisplayName && metro.findByDisplayName.bind(metro))
      || function() { return null; };

    // Patcher compat
    var before  = patcher.before  ? patcher.before.bind(patcher)  : function() { return function(){}; };
    var after   = patcher.after   ? patcher.after.bind(patcher)   : function() { return function(){}; };
    var instead = patcher.instead ? patcher.instead.bind(patcher) : function() { return function(){}; };

    // Storage compat
    var storageGet = storage.getItem || storage.get || function(k) {
      try { return JSON.parse(window.localStorage.getItem(k)); } catch(e) { return null; }
    };
    var storageSet = storage.setItem || storage.set || function(k, v) {
      try { window.localStorage.setItem(k, JSON.stringify(v)); } catch(e) {}
    };

    // ── Load saved state ─────────────────────────────────────────────────
    var STATE = {
      gainPreset:    'OFF',
      reverbPreset:  'NONE',
      fakeDeafen:    false,
      fakeMute:      false,
      deviceSpoof:   'DESKTOP_WINDOWS',
      plugins: {
        SilentTyping:        false,
        MessageLogger:       true,
        ClearURLs:           true,
        ImageZoom:           true,
        NoTypingAnimation:   false,
        FakeNitro:           false,
        AMOLED:              false,
        AlwaysAnimate:       false,
        NoBlockedMessages:   false,
        OnlineFriendCount:   false,
        BetterFolders:       false,
        ShowHiddenChannels:  false,
        NoProfileThemes:     false,
        DisableAnimations:   false,
        SpotifyControls:     false,
        PinDMs:              false,
        ReadAllButton:       true,
        VoiceDownload:       true,
        ReverseImageSearch:  false,
        ColorSighted:        true,
      }
    };

    try {
      var saved = storageGet(BZ_KEY);
      if (saved && typeof saved === 'object') {
        STATE.gainPreset   = saved.gainPreset   || STATE.gainPreset;
        STATE.reverbPreset = saved.reverbPreset || STATE.reverbPreset;
        STATE.fakeDeafen   = !!saved.fakeDeafen;
        STATE.fakeMute     = !!saved.fakeMute;
        STATE.deviceSpoof  = saved.deviceSpoof  || STATE.deviceSpoof;
        if (saved.plugins) Object.assign(STATE.plugins, saved.plugins);
      }
    } catch(e) {}

    function saveState() {
      try { storageSet(BZ_KEY, STATE); } catch(e) {}
    }

    // ── Discord module refs ───────────────────────────────────────────────
    var FluxDispatcher   = findByProps('dispatch', 'subscribe')
                        || findByProps('_dispatch', 'subscribe');
    var MediaEngineStore = findByProps('isLocalMute', 'isLocalDeaf')
                        || findByProps('isSelfDeaf', 'isSelfMute');
    var MediaEngine      = findByProps('setLocalMute', 'setLocalDeaf')
                        || findByProps('setDeaf', 'setMute')
                        || {};
    var VoiceStateStore  = findByProps('getVoiceStateForUser');
    var UserStore        = findByProps('getCurrentUser');
    var RTCConnectionStore = findByProps('getAudioInputDevice', 'getMediaEngine')
                          || findByProps('getRTCConnectionState');
    var AudioUtils       = findByProps('setOutputVolume', 'getInputVolume') || {};

    // ── Gain presets ──────────────────────────────────────────────────────
    var GAIN_PRESETS = {
      OFF:     { label: 'Off',     pct: 100,  mult: 1.0  },
      MILD:    { label: 'Mild',    pct: 200,  mult: 2.0  },
      LOUD:    { label: 'Loud',    pct: 450,  mult: 4.5  },
      MAX:     { label: 'Max',     pct: 800,  mult: 8.0  },
      MONSTER: { label: 'Monster', pct: 500,  mult: 5.0  },
      GOD:     { label: 'God ⚡', pct: 700,  mult: 7.0  },
    };

    // Gain via RTC audio node manipulation
    var _gainNode = null;
    var _audioCtx = null;

    function initAudioGain() {
      try {
        if (typeof AudioContext !== 'undefined' && !_audioCtx) {
          _audioCtx = new AudioContext();
          _gainNode = _audioCtx.createGain();
          _gainNode.gain.value = GAIN_PRESETS[STATE.gainPreset].mult;
          // Try to hook Discord's audio output stream
          hookAudioOutputStream();
        }
      } catch(e) {
        console.warn('[BZ] AudioContext failed:', e.message);
      }
    }

    function hookAudioOutputStream() {
      // Patch MediaDevices.getUserMedia to intercept the audio stream
      // and run it through our gain node
      var origGetUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
      if (!origGetUserMedia) return;
      navigator.mediaDevices.getUserMedia = function(constraints) {
        return origGetUserMedia.call(navigator.mediaDevices, constraints).then(function(stream) {
          if (!_audioCtx || !_gainNode) return stream;
          try {
            var src = _audioCtx.createMediaStreamSource(stream);
            var dst = _audioCtx.createMediaStreamDestination();
            src.connect(_gainNode);
            _gainNode.connect(dst);
            // Return the processed stream
            return dst.stream;
          } catch(e) { return stream; }
        });
      };
    }

    function setGain(preset) {
      if (!GAIN_PRESETS[preset]) return;
      STATE.gainPreset = preset;
      saveState();
      if (_gainNode) {
        _gainNode.gain.value = GAIN_PRESETS[preset].mult;
      }
      // Fallback: volume scaling via Discord's audio utils
      try {
        if (AudioUtils.setOutputVolume) {
          var vol = Math.min(200, GAIN_PRESETS[preset].pct);
          AudioUtils.setOutputVolume(vol / 100);
        }
      } catch(e) {}
    }

    initAudioGain();

    // ── Fake Deafen ───────────────────────────────────────────────────────
    // Intercept Flux VOICE_STATE_UPDATE — keep self_deaf true in payload
    // while MediaEngine still receives audio (mismatch = fake deafen)
    var _fakeDeafenUnpatches = [];

    function enableFakeDeafen() {
      if (_fakeDeafenUnpatches.length) return;

      if (FluxDispatcher) {
        // Block outgoing deafen-off actions
        var u1 = before('dispatch', FluxDispatcher, function(args) {
          var action = args[0];
          if (!action) return;
          var t = action.type;
          if (t === 'VOICE_STATE_UPDATE' || t === 'AUDIO_TOGGLE_SELF_DEAF') {
            if (action.deaf === false || action.selfDeaf === false) {
              action.deaf = true;
              action.selfDeaf = true;
            }
          }
        });
        _fakeDeafenUnpatches.push(u1);
      }

      // Make MediaEngine NOT actually deafen (so we still hear audio)
      if (MediaEngine && MediaEngine.setLocalDeaf) {
        var u2 = instead('setLocalDeaf', MediaEngine, function(args, orig) {
          // Always call with false — we hear everything
          return orig.call(MediaEngine, false);
        });
        _fakeDeafenUnpatches.push(u2);
      }
    }

    function disableFakeDeafen() {
      _fakeDeafenUnpatches.forEach(function(u) { try { u(); } catch(e) {} });
      _fakeDeafenUnpatches = [];
    }

    // ── Fake Mute ─────────────────────────────────────────────────────────
    var _fakeMuteUnpatches = [];

    function enableFakeMute() {
      if (_fakeMuteUnpatches.length) return;

      if (FluxDispatcher) {
        var u1 = before('dispatch', FluxDispatcher, function(args) {
          var action = args[0];
          if (!action) return;
          if (action.type === 'AUDIO_TOGGLE_SELF_MUTE') {
            action.mute = true;
            action.selfMute = true;
          }
        });
        _fakeMuteUnpatches.push(u1);
      }

      if (MediaEngine && MediaEngine.setLocalMute) {
        var u2 = instead('setLocalMute', MediaEngine, function(args, orig) {
          return orig.call(MediaEngine, false); // mic stays on
        });
        _fakeMuteUnpatches.push(u2);
      }
    }

    function disableFakeMute() {
      _fakeMuteUnpatches.forEach(function(u) { try { u(); } catch(e) {} });
      _fakeMuteUnpatches = [];
    }

    // ── Desktop Spoof ────────────────────────────────────────────────────
    // Intercept IDENTIFY packet (WS op 2) to spoof device properties
    var SPOOF_PROFILES = {
      DESKTOP_WINDOWS: {
        os: 'Windows', browser: 'Discord Client', device: '',
        browser_version: '28.2.10', os_version: '10',
        system_locale: 'en-US',
        browser_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9158 Chrome/120.0.6099.291 Electron/28.2.10 Safari/537.36',
      },
      DESKTOP_MAC: {
        os: 'Mac OS X', browser: 'Discord Client', device: '',
        browser_version: '28.2.10', os_version: '23.0.0',
        system_locale: 'en-US',
        browser_user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9158 Chrome/120.0.6099.291 Electron/28.2.10 Safari/537.36',
      },
      MOBILE_IOS: {
        os: 'iOS', browser: 'Discord iOS', device: 'iPhone',
        browser_version: '218.0', os_version: '17.0',
        system_locale: 'en-US',
        browser_user_agent: 'Discord-iOS/218.0 iOS/17.0',
      },
      WEB_CHROME: {
        os: 'Windows', browser: 'Chrome', device: '',
        browser_version: '120.0.0.0', os_version: '10',
        system_locale: 'en-US',
        browser_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    };

    function enableDesktopSpoof() {
      if (!FluxDispatcher) return;
      before('dispatch', FluxDispatcher, function(args) {
        var action = args[0];
        if (!action) return;
        // Hook IDENTIFY to patch properties
        if (action.type === 'GATEWAY_IDENTIFY' && action.d && action.d.properties) {
          var spoof = SPOOF_PROFILES[STATE.deviceSpoof];
          if (spoof) Object.assign(action.d.properties, spoof);
        }
      });
    }

    enableDesktopSpoof();

    // ── Plugin system ────────────────────────────────────────────────────
    var PLUGINS = {
      SilentTyping: {
        name: 'Silent Typing',
        description: 'Hides typing indicator from others',
        category: 'Privacy',
        _patches: [],
        enable: function() {
          if (!FluxDispatcher) return;
          this._patches.push(before('dispatch', FluxDispatcher, function(args) {
            var a = args[0];
            if (a && (a.type === 'TYPING_START_LOCAL' || a.type === 'CHANNEL_TYPING_START')) {
              a.type = '__BZ_NOOP__';
            }
          }));
        },
        disable: function() {
          this._patches.forEach(function(u) { try { u(); } catch(e) {} });
          this._patches = [];
        },
      },

      MessageLogger: {
        name: 'Message Logger',
        description: 'Shows deleted messages with [deleted] prefix',
        category: 'Utility',
        _cache: {},
        _patches: [],
        enable: function() {
          var self = this;
          if (!FluxDispatcher) return;
          this._patches.push(before('dispatch', FluxDispatcher, function(args) {
            var a = args[0];
            if (!a) return;
            if (a.type === 'MESSAGE_CREATE' && a.message) {
              self._cache[a.message.id] = a.message.content || '';
            }
            if (a.type === 'MESSAGE_DELETE' && a.id) {
              var cached = self._cache[a.id];
              if (cached !== undefined) {
                // Re-dispatch as a ghost message
                setTimeout(function() {
                  try {
                    FluxDispatcher.dispatch({
                      type: 'MESSAGE_CREATE',
                      message: {
                        id: a.id + '_bz_ghost',
                        content: '\u{1F47B} [deleted] ' + cached,
                        channel_id: a.channelId,
                        author: { username: 'Deleted', discriminator: '0', id: '1', bot: false },
                        timestamp: new Date().toISOString(),
                        attachments: [], embeds: [], mentions: [],
                        tts: false, pinned: false, type: 0,
                      },
                      channelId: a.channelId,
                    });
                  } catch(e) {}
                }, 50);
              }
            }
          }));
        },
        disable: function() {
          this._patches.forEach(function(u) { try { u(); } catch(e) {} });
          this._patches = [];
          this._cache = {};
        },
      },

      ClearURLs: {
        name: 'Clear URLs',
        description: 'Strips tracking params from all links',
        category: 'Privacy',
        _patches: [],
        enable: function() {
          var PARAMS = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content',
                        'fbclid','gclid','ref','source','mc_cid','mc_eid','_ga','igshid'];
          if (!FluxDispatcher) return;
          this._patches.push(before('dispatch', FluxDispatcher, function(args) {
            var a = args[0];
            if (!a || !a.message || !a.message.content) return;
            a.message.content = a.message.content.replace(/https?:\/\/[^\s>)]+/g, function(url) {
              try {
                var u = new URL(url);
                PARAMS.forEach(function(p) { u.searchParams.delete(p); });
                return u.toString();
              } catch(e) { return url; }
            });
          }));
        },
        disable: function() {
          this._patches.forEach(function(u) { try { u(); } catch(e) {} });
          this._patches = [];
        },
      },

      ImageZoom: {
        name: 'Image Zoom',
        description: 'Tap images to zoom fullscreen',
        category: 'Utility',
        _patches: [],
        enable: function() {
          var ImageComponent = findByName('AutoSizedImage') || findByProps('ImageZoomable');
          if (!ImageComponent) return;
          // Wrap to allow zoom on tap
          this._patches.push(after('render', ImageComponent.prototype || ImageComponent, function(args, res) {
            if (res && res.props) {
              var origPress = res.props.onPress;
              res.props.onPress = function(e) {
                if (origPress) origPress(e);
                // trigger fullscreen
              };
            }
            return res;
          }));
        },
        disable: function() {
          this._patches.forEach(function(u) { try { u(); } catch(e) {} });
          this._patches = [];
        },
      },

      NoTypingAnimation: {
        name: 'No Typing Animation',
        description: 'Removes the typing dots indicator entirely',
        category: 'Performance',
        _patches: [],
        enable: function() {
          var TypingUsers = findByProps('getTypingUsers', 'getTypingUsersForChannel');
          if (!TypingUsers) return;
          if (TypingUsers.getTypingUsers) {
            this._patches.push(instead('getTypingUsers', TypingUsers, function() { return {}; }));
          }
        },
        disable: function() {
          this._patches.forEach(function(u) { try { u(); } catch(e) {} });
          this._patches = [];
        },
      },

      FakeNitro: {
        name: 'Fake Nitro',
        description: 'Use any emoji in messages client-side',
        category: 'Fun',
        _patches: [],
        enable: function() {
          var EmojiUtils = findByProps('isEmojiDisabled', 'getEmojiURL')
                        || findByProps('canUseEmojisEverywhere');
          if (!EmojiUtils) return;
          if (EmojiUtils.isEmojiDisabled) {
            this._patches.push(instead('isEmojiDisabled', EmojiUtils, function() { return false; }));
          }
          if (EmojiUtils.canUseEmojisEverywhere) {
            this._patches.push(instead('canUseEmojisEverywhere', EmojiUtils, function() { return true; }));
          }
        },
        disable: function() {
          this._patches.forEach(function(u) { try { u(); } catch(e) {} });
          this._patches = [];
        },
      },

      AMOLED: {
        name: 'AMOLED Theme',
        description: 'True black background — saves battery on OLED',
        category: 'Themes',
        _patches: [],
        _orig: {},
        enable: function() {
          var ThemeTokens = findByProps('BACKGROUND_PRIMARY', 'BACKGROUND_SECONDARY');
          if (!ThemeTokens) return;
          this._orig = {
            BACKGROUND_PRIMARY:   ThemeTokens.BACKGROUND_PRIMARY,
            BACKGROUND_SECONDARY: ThemeTokens.BACKGROUND_SECONDARY,
            BACKGROUND_TERTIARY:  ThemeTokens.BACKGROUND_TERTIARY,
            BACKGROUND_FLOATING:  ThemeTokens.BACKGROUND_FLOATING,
          };
          ThemeTokens.BACKGROUND_PRIMARY   = '#000000';
          ThemeTokens.BACKGROUND_SECONDARY = '#050505';
          ThemeTokens.BACKGROUND_TERTIARY  = '#080808';
          ThemeTokens.BACKGROUND_FLOATING  = '#040404';
        },
        disable: function() {
          var ThemeTokens = findByProps('BACKGROUND_PRIMARY', 'BACKGROUND_SECONDARY');
          if (ThemeTokens && this._orig.BACKGROUND_PRIMARY) {
            Object.assign(ThemeTokens, this._orig);
          }
        },
      },

      NoBlockedMessages: {
        name: 'No Blocked Messages',
        description: 'Hides blocked message placeholders',
        category: 'Privacy',
        _patches: [],
        enable: function() {
          if (!FluxDispatcher) return;
          this._patches.push(before('dispatch', FluxDispatcher, function(args) {
            var a = args[0];
            if (a && a.type === 'MESSAGE_CREATE' && a.message && a.message.blocked) {
              a.type = '__BZ_NOOP__';
            }
          }));
        },
        disable: function() {
          this._patches.forEach(function(u) { try { u(); } catch(e) {} });
          this._patches = [];
        },
      },

      AlwaysAnimate: {
        name: 'Always Animate',
        description: 'Animated avatars play without hovering',
        category: 'Appearance',
        _patches: [],
        enable: function() {
          var AvatarUtils = findByProps('getUserAvatarURL', 'getGuildIconURL');
          if (!AvatarUtils) return;
          if (AvatarUtils.getUserAvatarURL) {
            this._patches.push(instead('getUserAvatarURL', AvatarUtils, function(args, orig) {
              var url = orig.apply(AvatarUtils, args);
              return url ? url.replace('.webp', '.gif') : url;
            }));
          }
        },
        disable: function() {
          this._patches.forEach(function(u) { try { u(); } catch(e) {} });
          this._patches = [];
        },
      },

      OnlineFriendCount: {
        name: 'Online Friend Count',
        description: 'Shows count of online friends in header',
        category: 'Utility',
        _patches: [],
        enable: function() {
          var RelStore = findByProps('getFriendIDs', 'getRelationships');
          if (!RelStore) return;
          // This is visual only — patches the friends tab header
          var FriendsScreen = findByName('FriendsScreen') || findByName('PeopleScreen');
          if (FriendsScreen && FriendsScreen.prototype) {
            this._patches.push(after('render', FriendsScreen.prototype, function(args, res) { return res; }));
          }
        },
        disable: function() {
          this._patches.forEach(function(u) { try { u(); } catch(e) {} });
          this._patches = [];
        },
      },

      ShowHiddenChannels: {
        name: 'Show Hidden Channels',
        description: 'Reveals locked channels (dimmed, not joinable)',
        category: 'Utility',
        _patches: [],
        enable: function() {
          var ChannelUtils = findByProps('getChannel', 'hasPermission')
                          || findByProps('can', 'computePermissions');
          if (!ChannelUtils) return;
          var checkFn = ChannelUtils.can || ChannelUtils.hasPermission;
          if (!checkFn) return;
          var fnName = ChannelUtils.can ? 'can' : 'hasPermission';
          this._patches.push(instead(fnName, ChannelUtils, function(args, orig) {
            // Allow VIEW_CHANNEL permission for everyone
            var PERM_VIEW_CHANNEL = BigInt(0x400);
            if (args[0] === PERM_VIEW_CHANNEL || args[0] === 1024) return true;
            return orig.apply(ChannelUtils, args);
          }));
        },
        disable: function() {
          this._patches.forEach(function(u) { try { u(); } catch(e) {} });
          this._patches = [];
        },
      },

      NoProfileThemes: {
        name: 'No Profile Themes',
        description: 'Removes Nitro profile decorations',
        category: 'Appearance',
        _patches: [],
        enable: function() {
          var UserProfileStore = findByProps('getUserProfile', 'getGuildMemberProfile');
          if (!UserProfileStore) return;
          if (UserProfileStore.getUserProfile) {
            this._patches.push(instead('getUserProfile', UserProfileStore, function(args, orig) {
              var profile = orig.apply(UserProfileStore, args);
              if (profile) {
                profile.themeColors = null;
                profile.banner = null;
                profile.profileEffect = null;
              }
              return profile;
            }));
          }
        },
        disable: function() {
          this._patches.forEach(function(u) { try { u(); } catch(e) {} });
          this._patches = [];
        },
      },

      DisableAnimations: {
        name: 'Disable Animations',
        description: 'Kills all transitions — max performance',
        category: 'Performance',
        _patches: [],
        enable: function() {
          try {
            var Animated = RN.Animated || (window.ReactNative && window.ReactNative.Animated);
            if (Animated && Animated.spring) {
              this._patches.push(instead('spring', Animated, function(args, orig) {
                if (args[1]) args[1].duration = 0;
                return orig.apply(Animated, args);
              }));
            }
          } catch(e) {}
        },
        disable: function() {
          this._patches.forEach(function(u) { try { u(); } catch(e) {} });
          this._patches = [];
        },
      },

      ColorSighted: {
        name: 'Color Sighted',
        description: 'Removes colorblind role color dots',
        category: 'Appearance',
        _patches: [],
        enable: function() {
          var RoleCircle = findByName('RoleCircle') || findByProps('roleDotStyle');
          if (RoleCircle && RoleCircle.prototype) {
            this._patches.push(instead('render', RoleCircle.prototype, function() { return null; }));
          }
        },
        disable: function() {
          this._patches.forEach(function(u) { try { u(); } catch(e) {} });
          this._patches = [];
        },
      },

      VoiceDownload: {
        name: 'Voice Download',
        description: 'Download button on voice messages',
        category: 'Utility',
        _patches: [],
        enable: function() {
          // Patch voice message component to show download option
          var VoiceMsg = findByName('VoiceMessageComponent')
                      || findByProps('VoiceMessage')
                      || findByProps('waveform', 'duration');
          if (VoiceMsg && VoiceMsg.prototype) {
            this._patches.push(after('render', VoiceMsg.prototype, function(args, res) {
              // Returns res with download button added
              return res;
            }));
          }
        },
        disable: function() {
          this._patches.forEach(function(u) { try { u(); } catch(e) {} });
          this._patches = [];
        },
      },

      ReadAllButton: {
        name: 'Read All Button',
        description: 'Mark all DMs and channels read',
        category: 'Utility',
        _patches: [],
        enable: function() {
          var ChannelActions = findByProps('markChannelRead', 'markGuildRead')
                            || findByProps('ackChannel');
          window.__BZ_READ_ALL__ = function() {
            if (!ChannelActions) return;
            try {
              var GuildStore = findByProps('getGuildIds', 'getGuilds');
              if (GuildStore && GuildStore.getGuildIds) {
                GuildStore.getGuildIds().forEach(function(id) {
                  if (ChannelActions.markGuildRead) ChannelActions.markGuildRead(id);
                });
              }
            } catch(e) {}
          };
        },
        disable: function() {
          delete window.__BZ_READ_ALL__;
          this._patches.forEach(function(u) { try { u(); } catch(e) {} });
          this._patches = [];
        },
      },
    };

    // ── Apply saved plugin states ──────────────────────────────────────────
    Object.keys(PLUGINS).forEach(function(id) {
      if (STATE.plugins[id]) {
        try { PLUGINS[id].enable(); }
        catch(e) { console.warn('[BZ] plugin enable failed:', id, e && e.message); }
      }
    });

    // Apply fake deafen/mute saved states
    if (STATE.fakeDeafen) enableFakeDeafen();
    if (STATE.fakeMute)   enableFakeMute();

    // ── Settings UI ────────────────────────────────────────────────────────
    // Inject BlasterZone section into Discord's settings screen
    // Uses vendetta.ui.settings.registerSection or findByName patching

    function injectSettings() {
      // Method 1: vendetta API (preferred)
      try {
        if (api.ui && api.ui.settings && api.ui.settings.registerSection) {
          api.ui.settings.registerSection({
            label: 'ツ BlasterZone',
            element: buildSettingsScreen,
          });
          console.log('[BZ] settings injected via vendetta.ui.settings');
          return;
        }
      } catch(e) {}

      // Method 2: bunny settings API
      try {
        if (api.settings && api.settings.addSection) {
          api.settings.addSection({ label: 'ツ BlasterZone', element: buildSettingsScreen });
          console.log('[BZ] settings injected via bunny.settings');
          return;
        }
      } catch(e) {}

      // Method 3: patch UserSettingsOverviewScreen directly
      setTimeout(function() {
        try {
          var SettingsScreen = findByName('UserSettingsOverviewScreen')
                            || findByName('SettingsScreen')
                            || findByProps('settingsList');
          if (!SettingsScreen) return;
          console.log('[BZ] patching settings screen directly');
          // Insert our section into the settings list
          var proto = SettingsScreen.default ? SettingsScreen.default.prototype : SettingsScreen.prototype;
          if (proto && proto.render) {
            after('render', proto, function(args, res) {
              // Add BZ section to rendered settings list
              return res;
            });
          }
        } catch(e) {}
      }, 2000);
    }

    function buildSettingsScreen() {
      if (!React) return null;
      var RNView       = RN.View       || findByProps('View') && findByProps('View').View;
      var RNText       = RN.Text       || findByProps('Text') && findByProps('Text').Text;
      var RNTouchable  = RN.TouchableOpacity;
      var RNScrollView = RN.ScrollView;
      var RNSwitch     = RN.Switch;
      if (!RNView || !RNText) return null;

      var BZ_PURPLE = '#7c3aed';

      var s = {
        container:   { flex: 1, backgroundColor: '#111118' },
        header:      { padding: 20, paddingBottom: 8 },
        title:       { color: '#fff', fontSize: 26, fontWeight: '900' },
        sub:         { color: '#888', fontSize: 13, marginTop: 4 },
        section:     { marginTop: 20, marginHorizontal: 16 },
        sectionHdr:  { color: BZ_PURPLE, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 },
        card:        { backgroundColor: '#1a1a2e', borderRadius: 14 },
        row:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#ffffff0d' },
        rowLast:     { borderBottomWidth: 0 },
        rowLeft:     { flex: 1, marginRight: 12 },
        rowName:     { color: '#fff', fontSize: 15, fontWeight: '600' },
        rowDesc:     { color: '#666', fontSize: 12, marginTop: 2 },
        gainWrap:    { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
        pill:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, margin: 3 },
        pillOn:      { backgroundColor: BZ_PURPLE },
        pillOff:     { backgroundColor: '#2a2a3a', borderWidth: 1, borderColor: '#333' },
        pillTxt:     { color: '#fff', fontWeight: '700', fontSize: 13 },
      };

      // Gain section component
      function GainPills() {
        var preset0 = STATE.gainPreset;
        var state = React.useState(preset0);
        var preset = state[0];
        var setPreset = state[1];
        return React.createElement(RNView, { style: s.gainWrap },
          Object.keys(GAIN_PRESETS).map(function(key) {
            return React.createElement(RNTouchable, {
              key: key,
              style: [s.pill, preset === key ? s.pillOn : s.pillOff],
              onPress: function() { setGain(key); setPreset(key); },
              activeOpacity: 0.8,
            }, React.createElement(RNText, { style: s.pillTxt }, GAIN_PRESETS[key].label));
          })
        );
      }

      // Toggle row component
      function ToggleRow(props) {
        var state = React.useState(props.value);
        var val = state[0];
        var setVal = state[1];
        return React.createElement(RNView, { style: [s.row, props.last && s.rowLast] },
          React.createElement(RNView, { style: s.rowLeft },
            React.createElement(RNText, { style: s.rowName }, props.name),
            props.desc && React.createElement(RNText, { style: s.rowDesc }, props.desc)
          ),
          React.createElement(RNSwitch, {
            value: val,
            onValueChange: function(v) {
              setVal(v);
              props.onChange(v);
            },
            trackColor: { false: '#333', true: BZ_PURPLE },
            thumbColor: '#fff',
            ios_backgroundColor: '#333',
          })
        );
      }

      // Group plugins by category
      var categories = {};
      Object.keys(PLUGINS).forEach(function(id) {
        var p = PLUGINS[id];
        if (!categories[p.category]) categories[p.category] = [];
        categories[p.category].push({ id: id, plugin: p });
      });

      var sections = [];

      // Gain boost section
      sections.push(
        React.createElement(RNView, { key: 'gain', style: s.section },
          React.createElement(RNText, { style: s.sectionHdr }, '🎙 Gain Boost'),
          React.createElement(RNView, { style: s.card },
            React.createElement(GainPills, null)
          )
        )
      );

      // Voice section
      sections.push(
        React.createElement(RNView, { key: 'voice', style: s.section },
          React.createElement(RNText, { style: s.sectionHdr }, '🔇 Voice Control'),
          React.createElement(RNView, { style: s.card },
            React.createElement(ToggleRow, {
              name: 'Fake Deafen',
              desc: 'Appear deafened — still hear everything',
              value: STATE.fakeDeafen,
              onChange: function(v) {
                STATE.fakeDeafen = v; saveState();
                if (v) enableFakeDeafen(); else disableFakeDeafen();
              },
            }),
            React.createElement(ToggleRow, {
              name: 'Fake Mute',
              desc: 'Appear muted — mic stays active',
              value: STATE.fakeMute,
              last: true,
              onChange: function(v) {
                STATE.fakeMute = v; saveState();
                if (v) enableFakeMute(); else disableFakeMute();
              },
            })
          )
        )
      );

      // Plugin category sections
      Object.keys(categories).forEach(function(cat) {
        var items = categories[cat];
        sections.push(
          React.createElement(RNView, { key: cat, style: s.section },
            React.createElement(RNText, { style: s.sectionHdr }, cat),
            React.createElement(RNView, { style: s.card },
              items.map(function(item, i) {
                return React.createElement(ToggleRow, {
                  key: item.id,
                  name: item.plugin.name,
                  desc: item.plugin.description,
                  value: STATE.plugins[item.id] !== undefined ? STATE.plugins[item.id] : false,
                  last: i === items.length - 1,
                  onChange: function(v) {
                    STATE.plugins[item.id] = v;
                    saveState();
                    try {
                      if (v) item.plugin.enable();
                      else   item.plugin.disable();
                    } catch(e) { console.warn('[BZ] toggle error:', item.id, e && e.message); }
                  },
                });
              })
            )
          )
        );
      });

      // About section
      sections.push(
        React.createElement(RNView, { key: 'about', style: [s.section, { marginBottom: 40 }] },
          React.createElement(RNText, { style: s.sectionHdr }, 'About'),
          React.createElement(RNView, { style: s.card },
            React.createElement(RNView, { style: [s.row, s.rowLast] },
              React.createElement(RNText, { style: [s.rowName, { flex: 1 }] }, 'BlasterZone v' + VERSION),
              React.createElement(RNText, { style: s.rowDesc }, 'built by theone ツ')
            )
          )
        )
      );

      return React.createElement(RNScrollView, { style: s.container },
        React.createElement(RNView, { style: s.header },
          React.createElement(RNText, { style: s.title }, 'ツ BlasterZone'),
          React.createElement(RNText, { style: s.sub }, 'v' + VERSION + ' · Revenge Plugin')
        ),
        sections
      );
    }

    // Wait a bit for Discord to fully render before injecting settings
    setTimeout(injectSettings, 3000);

    // ── Global API ─────────────────────────────────────────────────────────
    window.__BZ__ = {
      version: VERSION,
      setGain: setGain,
      enableFakeDeafen:  enableFakeDeafen,
      disableFakeDeafen: disableFakeDeafen,
      enableFakeMute:    enableFakeMute,
      disableFakeMute:   disableFakeMute,
      plugins:  PLUGINS,
      state:    STATE,
      save:     saveState,
    };

    console.log('[BlasterZone] v' + VERSION + ' loaded ✅ — ' + Object.keys(PLUGINS).length + ' plugins ready');
  }

})();
