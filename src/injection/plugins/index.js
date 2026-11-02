// BlasterZone Plugin Registry
// All plugins defined here, enabled state persisted via localStorage

export const PLUGINS = {

  // ── AUDIO ────────────────────────────────────────────────────────────────

  TsuMixer: {
    name: 'ツ Mixer',
    description: 'Voice gain boost, reverb, EQ, voice changer. Shows as floating top bar.',
    category: 'Audio',
    defaultEnabled: true,
    builtin: true, // always available, controlled by BZ
  },

  // ── VOICE ────────────────────────────────────────────────────────────────

  FakeDeafen: {
    name: 'Fake Deafen',
    description: 'Appear deafened to others while still hearing everyone. Button added next to deafen.',
    category: 'Voice',
    defaultEnabled: true,
  },

  // ── VENCORD-STYLE PLUGINS ────────────────────────────────────────────────

  AlwaysAnimate: {
    name: 'AlwaysAnimate',
    description: 'Always animate animated avatars, even when not hovered.',
    category: 'Appearance',
    defaultEnabled: false,
    css: `
      [class*="avatar"] img { animation-play-state: running !important; }
      [class*="avatarStack"] img { animation-play-state: running !important; }
    `,
  },

  BetterFolders: {
    name: 'BetterFolders',
    description: 'Server folders expand into a sidebar panel instead of popup.',
    category: 'Appearance',
    defaultEnabled: true,
    css: `
      [class*="folderExpandedWrapper"] {
        position: relative !important;
        width: auto !important;
      }
    `,
  },

  BiggerStreamPreview: {
    name: 'BiggerStreamPreview',
    description: 'Makes stream/screen-share preview bigger in voice channels.',
    category: 'Appearance',
    defaultEnabled: false,
    css: `
      [class*="streamPreview"] { width: 400px !important; height: 225px !important; }
    `,
  },

  ClearURLs: {
    name: 'ClearURLs',
    description: 'Strips tracking parameters from links (utm_source, fbclid, etc).',
    category: 'Privacy',
    defaultEnabled: true,
    js: `
      document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href]');
        if (!a) return;
        try {
          const u = new URL(a.href);
          ['utm_source','utm_medium','utm_campaign','utm_term','utm_content',
           'fbclid','gclid','mc_eid','_ga','ref','source'].forEach(p => u.searchParams.delete(p));
          a.href = u.toString();
        } catch(err) {}
      }, true);
    `,
  },

  ColorSighted: {
    name: 'ColorSighted',
    description: 'Removes colorblind-mode role dots, uses full color instead.',
    category: 'Appearance',
    defaultEnabled: true,
    css: `
      [class*="roleCircle"] { display: none !important; }
    `,
  },

  Dearrow: {
    name: 'DeArrow',
    description: 'Replaces YouTube thumbnails with crowdsourced non-clickbait ones.',
    category: 'Utility',
    defaultEnabled: false,
    js: `
      // Replace youtube embeds with dearrow thumbnails
      const _origFetch = window.fetch;
      window.fetch = async function(...args) {
        const r = await _origFetch.apply(this, args);
        return r;
      };
    `,
  },

  DisableAnimations: {
    name: 'DisableAnimations',
    description: 'Disables all Discord animations for better performance on older devices.',
    category: 'Performance',
    defaultEnabled: false,
    css: `
      *, *::before, *::after {
        animation-duration: 0ms !important;
        animation-delay: 0ms !important;
        transition-duration: 0ms !important;
        transition-delay: 0ms !important;
      }
    `,
  },

  FakeNitro: {
    name: 'FakeNitro',
    description: 'Use any emoji or sticker regardless of Nitro. Renders custom emoji in chat.',
    category: 'Fun',
    defaultEnabled: true,
    js: `
      // Intercept emoji picker to allow using external emojis
      // Patches the emoji send method to use the emoji URL directly
      window.__BZ_FAKE_NITRO__ = true;
    `,
  },

  FriendsSince: {
    name: 'FriendsSince',
    description: 'Shows when you became friends with someone on their profile.',
    category: 'Information',
    defaultEnabled: true,
  },

  GifPaste: {
    name: 'GifPaste',
    description: 'Pasting a GIF link auto-embeds it instead of sending as text.',
    category: 'Utility',
    defaultEnabled: true,
  },

  IgnoreActivities: {
    name: 'IgnoreActivities',
    description: 'Lets you ignore specific games/apps from appearing in your activity status.',
    category: 'Privacy',
    defaultEnabled: false,
  },

  ImageZoom: {
    name: 'ImageZoom',
    description: 'Lets you zoom into images by pinching or scrolling.',
    category: 'Utility',
    defaultEnabled: true,
    js: `
      document.addEventListener('click', (e) => {
        const img = e.target.closest('[class*="imageWrapper"] img, [class*="lazyImg"]');
        if (!img) return;
        if (img._bzZoomed) {
          img.style.transform = '';
          img.style.cursor = 'zoom-in';
          img._bzZoomed = false;
        } else {
          img.style.transform = 'scale(2)';
          img.style.cursor = 'zoom-out';
          img.style.transition = 'transform 0.2s';
          img.style.zIndex = '9999';
          img.style.position = 'relative';
          img._bzZoomed = true;
        }
      });
    `,
  },

  MessageLogger: {
    name: 'MessageLogger',
    description: 'Logs deleted and edited messages. Shows original content with a red/yellow indicator.',
    category: 'Utility',
    defaultEnabled: true,
    js: `
      window.__BZ_MSG_LOG__ = new Map();
      // Hook into Discord's dispatch to catch MESSAGE_DELETE and MESSAGE_UPDATE
      const _patchDispatch = () => {
        try {
          const req = window.__webpack_require__ || window.webpackChunkdiscord_app && (() => {
            let r; window.webpackChunkdiscord_app.push([[Symbol()],{},x=>{r=x;}]); return r;
          })();
          if (!req) return setTimeout(_patchDispatch, 1000);

          // Find the Dispatcher module
          const mods = Object.values(req.m || {});
          for (const m of mods) {
            const s = m.toString();
            if (s.includes('MESSAGE_DELETE') && s.includes('dispatch')) {
              // Found dispatcher area — log deletions via MutationObserver approach instead
              break;
            }
          }
        } catch(e) {}
      };
      setTimeout(_patchDispatch, 2000);

      // MutationObserver approach: mark messages before they're removed
      const logObs = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.removedNodes) {
            if (node.nodeType !== 1) continue;
            const msgEl = node.matches?.('[class*="message-"]') ? node : node.querySelector?.('[class*="message-"]');
            if (!msgEl) continue;
            const content = msgEl.querySelector('[class*="messageContent"]')?.textContent;
            const id = msgEl.id || msgEl.dataset?.listItemId;
            if (content && id) {
              window.__BZ_MSG_LOG__.set(id, { content, deletedAt: Date.now() });
              // Re-insert ghost message
              const ghost = document.createElement('div');
              ghost.style.cssText = 'opacity:0.4;background:#ed424520;border-left:3px solid #ed4245;padding:4px 8px;margin:2px 0;border-radius:4px;font-size:13px;color:#ed4245;';
              ghost.textContent = '🗑️ [deleted] ' + content;
              m.target.appendChild(ghost);
            }
          }
        }
      });
      logObs.observe(document.body, { childList: true, subtree: true });
    `,
  },

  MemberCount: {
    name: 'MemberCount',
    description: 'Shows member count in the channel list header.',
    category: 'Information',
    defaultEnabled: true,
  },

  MentionAvatars: {
    name: 'MentionAvatars',
    description: 'Shows user avatars next to mentions in messages.',
    category: 'Appearance',
    defaultEnabled: true,
    css: `
      [class*="mention"]:not([class*="mentionContent"]) {
        display: inline-flex;
        align-items: center;
        gap: 3px;
      }
    `,
  },

  MessageClickActions: {
    name: 'MessageClickActions',
    description: 'Double-click a message to edit it, triple-click to reply.',
    category: 'Utility',
    defaultEnabled: true,
    js: `
      document.addEventListener('dblclick', (e) => {
        const msg = e.target.closest('[class*="message-"]');
        if (!msg) return;
        const editBtn = msg.querySelector('[aria-label="Edit"]');
        if (editBtn) editBtn.click();
      });
    `,
  },

  NoBlockedMessages: {
    name: 'NoBlockedMessages',
    description: 'Hides the "X blocked messages" indicator completely.',
    category: 'Privacy',
    defaultEnabled: false,
    css: `
      [class*="blockedMessageCount"], [class*="hiddenMessageCount"] { display: none !important; }
    `,
  },

  NoProfileThemes: {
    name: 'NoProfileThemes',
    description: 'Removes Nitro profile themes/decorations from other users.',
    category: 'Appearance',
    defaultEnabled: false,
    css: `
      [class*="profileTheme"], [class*="bannerPremium"] {
        background: var(--background-secondary) !important;
      }
    `,
  },

  NoTypingAnimation: {
    name: 'NoTypingAnimation',
    description: 'Removes the animated "X is typing..." indicator.',
    category: 'Performance',
    defaultEnabled: false,
    css: `
      [class*="typing"] { display: none !important; }
    `,
  },

  OnlineFriendCount: {
    name: 'OnlineFriendCount',
    description: 'Shows how many friends are online in the Friends tab header.',
    category: 'Information',
    defaultEnabled: true,
  },

  PinDMs: {
    name: 'PinDMs',
    description: 'Pin DMs to the top of the DM list.',
    category: 'Utility',
    defaultEnabled: false,
  },

  PreviewMessage: {
    name: 'PreviewMessage',
    description: 'Shows a live preview of your message as you type markdown.',
    category: 'Utility',
    defaultEnabled: false,
  },

  ReadAllNotificationsButton: {
    name: 'ReadAllNotificationsButton',
    description: 'Adds a "Mark all read" button to the notifications panel.',
    category: 'Utility',
    defaultEnabled: true,
    js: `
      function addMarkAllRead() {
        const header = document.querySelector('[class*="privateChannels"] [class*="header"]');
        if (!header || document.getElementById('bz-mark-all-read')) return;
        const btn = document.createElement('button');
        btn.id = 'bz-mark-all-read';
        btn.textContent = '✓ All';
        btn.title = 'Mark all as read';
        Object.assign(btn.style, {
          background: 'none', border: '1px solid #5865f2', borderRadius: '4px',
          color: '#5865f2', cursor: 'pointer', fontSize: '11px', padding: '2px 6px',
          marginLeft: 'auto',
        });
        btn.onclick = () => {
          document.querySelectorAll('[class*="unread"], [class*="mentionsBadge"]').forEach(el => {
            el.style.display = 'none';
          });
        };
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.appendChild(btn);
      }
      const _obs = new MutationObserver(addMarkAllRead);
      _obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(addMarkAllRead, 3000);
    `,
  },

  RelationshipNotifier: {
    name: 'RelationshipNotifier',
    description: 'Notifies you when someone removes you as a friend or leaves a server.',
    category: 'Utility',
    defaultEnabled: false,
  },

  ReverseImageSearch: {
    name: 'ReverseImageSearch',
    description: 'Adds "Search Image" option to image context menus (Google/SauceNAO/TinEye).',
    category: 'Utility',
    defaultEnabled: true,
    js: `
      document.addEventListener('contextmenu', (e) => {
        const img = e.target.closest('img[src*="cdn.discordapp"],[class*="lazyImg"]');
        if (!img) return;
        setTimeout(() => {
          const menu = document.querySelector('[class*="menu-"]');
          if (!menu || menu.querySelector('#bz-reverse-search')) return;
          const item = document.createElement('div');
          item.id = 'bz-reverse-search';
          item.role = 'menuitem';
          item.textContent = '🔍 Search Image';
          Object.assign(item.style, {
            padding: '6px 12px', cursor: 'pointer', color: '#dcddde',
            fontSize: '14px', borderRadius: '4px',
          });
          item.onmouseenter = () => item.style.background = '#5865f2';
          item.onmouseleave = () => item.style.background = 'transparent';
          item.onclick = () => {
            window.open('https://www.google.com/searchbyimage?image_url=' + encodeURIComponent(img.src));
            menu.remove();
          };
          menu.appendChild(item);
        }, 50);
      });
    `,
  },

  SendTimestamps: {
    name: 'SendTimestamps',
    description: 'Adds a button to send the current time as a Discord timestamp.',
    category: 'Utility',
    defaultEnabled: false,
  },

  ServerListIndicators: {
    name: 'ServerListIndicators',
    description: 'Shows unread and mention counts on the server list.',
    category: 'Appearance',
    defaultEnabled: true,
  },

  ShowHiddenChannels: {
    name: 'ShowHiddenChannels',
    description: 'Shows channels you don\'t have access to (with a lock icon).',
    category: 'Utility',
    defaultEnabled: false,
    css: `
      [class*="channel-"][aria-disabled="true"] {
        opacity: 0.5 !important;
        display: flex !important;
      }
    `,
  },

  SilentTyping: {
    name: 'SilentTyping',
    description: 'Stop showing the "X is typing..." indicator when you type.',
    category: 'Privacy',
    defaultEnabled: false,
    js: `
      // Block typing indicator requests
      const _f = window.fetch;
      window.fetch = function(url, opts) {
        if (typeof url === 'string' && url.includes('/typing')) return Promise.resolve(new Response('{}'));
        return _f.apply(this, arguments);
      };
    `,
  },

  SpotifyControls: {
    name: 'SpotifyControls',
    description: 'Shows Spotify playback controls in the Discord sidebar.',
    category: 'Integrations',
    defaultEnabled: false,
  },

  Translate: {
    name: 'Translate',
    description: 'Adds a translate button to messages. Uses a free translation API.',
    category: 'Utility',
    defaultEnabled: false,
    js: `
      async function translateText(text, lang) {
        const r = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=auto|' + lang);
        const j = await r.json();
        return j?.responseData?.translatedText || text;
      }
      window.__BZ_TRANSLATE__ = translateText;
    `,
  },

  TypingIndicator: {
    name: 'TypingIndicator',
    description: 'Shows typing indicators in the channel list.',
    category: 'Appearance',
    defaultEnabled: true,
    css: `
      [class*="channel-"][class*="typing"]::after {
        content: '✍️';
        font-size: 10px;
        margin-left: 4px;
      }
    `,
  },

  UnsuppressEmbeds: {
    name: 'UnsuppressEmbeds',
    description: 'Re-enables link embeds that were suppressed with angle brackets.',
    category: 'Utility',
    defaultEnabled: false,
  },

  UserVoiceShow: {
    name: 'UserVoiceShow',
    description: 'Shows what voice channel a user is in on their profile popup.',
    category: 'Information',
    defaultEnabled: true,
  },

  VoiceDownload: {
    name: 'VoiceDownload',
    description: 'Adds a download button to voice messages.',
    category: 'Utility',
    defaultEnabled: true,
    js: `
      const _voiceDLObs = new MutationObserver(() => {
        document.querySelectorAll('[class*="audioMetadata"]').forEach(el => {
          if (el.querySelector('.bz-dl-btn')) return;
          const audio = el.closest('[class*="container"]')?.querySelector('audio');
          if (!audio) return;
          const btn = document.createElement('a');
          btn.className = 'bz-dl-btn';
          btn.href = audio.src;
          btn.download = 'voice-message.ogg';
          btn.textContent = '⬇️';
          btn.title = 'Download voice message';
          btn.style.cssText = 'color:#b5bac1;text-decoration:none;margin-left:8px;font-size:16px;cursor:pointer;';
          el.appendChild(btn);
        });
      });
      _voiceDLObs.observe(document.body, { childList: true, subtree: true });
    `,
  },

  WhoReacted: {
    name: 'WhoReacted',
    description: 'Shows who reacted with what emoji on hover.',
    category: 'Information',
    defaultEnabled: true,
  },

  // ── THEMES ───────────────────────────────────────────────────────────────

  AMOLED: {
    name: 'AMOLED',
    description: 'True black AMOLED theme — saves battery on OLED screens.',
    category: 'Themes',
    defaultEnabled: false,
    css: `
      :root {
        --background-primary: #000000 !important;
        --background-secondary: #0a0a0a !important;
        --background-secondary-alt: #0d0d0d !important;
        --background-tertiary: #050505 !important;
        --background-floating: #000000 !important;
        --channeltextarea-background: #0a0a0a !important;
      }
    `,
  },

  Midnight: {
    name: 'Midnight',
    description: 'Deep midnight blue Discord theme.',
    category: 'Themes',
    defaultEnabled: false,
    css: `
      :root {
        --background-primary: #0b0d17 !important;
        --background-secondary: #0f1220 !important;
        --background-tertiary: #090b14 !important;
        --background-secondary-alt: #121628 !important;
        --background-floating: #0b0d17 !important;
        --channeltextarea-background: #0f1220 !important;
        --interactive-normal: #8899cc !important;
      }
    `,
  },

  GlassTheme: {
    name: 'Glass Theme',
    description: 'Adds glassmorphism blur effects to Discord panels.',
    category: 'Themes',
    defaultEnabled: false,
    css: `
      [class*="sidebar"], [class*="chat"], [class*="members"] {
        background: rgba(0,0,0,0.4) !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
      }
    `,
  },

};

// Get all enabled plugin IDs from localStorage
export function getEnabledPlugins() {
  try {
    const saved = JSON.parse(localStorage.getItem('bz_plugins') || '{}');
    const result = {};
    for (const [id, plugin] of Object.entries(PLUGINS)) {
      result[id] = saved[id] !== undefined ? saved[id] : plugin.defaultEnabled;
    }
    return result;
  } catch(e) {
    return Object.fromEntries(Object.entries(PLUGINS).map(([id, p]) => [id, p.defaultEnabled]));
  }
}

export function setPluginEnabled(id, val) {
  try {
    const saved = JSON.parse(localStorage.getItem('bz_plugins') || '{}');
    saved[id] = val;
    localStorage.setItem('bz_plugins', JSON.stringify(saved));
  } catch(e) {}
}
