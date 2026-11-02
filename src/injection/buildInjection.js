// BlasterZone Master Injection Builder v2.2
// All plugin code inlined as regular strings — no nested template literals

import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

const UCORE_ASSET = require('../../assets/ucore_injector.txt');

// ── Gain presets ─────────────────────────────────────────────────────────
export const GAIN_PRESETS = {
  OFF:     { masterGain: 100,  inputBoost: 100,  gain2: 0,   gain3: 0   },
  MILD:    { masterGain: 200,  inputBoost: 200,  gain2: 100, gain3: 0   },
  LOUD:    { masterGain: 450,  inputBoost: 450,  gain2: 300, gain3: 150 },
  MAX:     { masterGain: 800,  inputBoost: 800,  gain2: 600, gain3: 400 },
  ULTRA:   { masterGain: 1200, inputBoost: 1200, gain2: 900, gain3: 600 },
  MONSTER: { masterGain: 500,  inputBoost: 500,  gain2: 400, gain3: 300 },
  GOD:     { masterGain: 700,  inputBoost: 700,  gain2: 600, gain3: 500 },
};

// ── Device spoof profiles ────────────────────────────────────────────────
export const DEVICE_SPOOF = {
  DESKTOP_WINDOWS: {
    label: 'Windows Desktop',
    properties: {
      os: 'Windows', browser: 'Discord Client', device: '',
      system_locale: 'en-US',
      browser_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9158 Chrome/120.0.6099.291 Electron/28.2.10 Safari/537.36',
      browser_version: '28.2.10', os_version: '10',
      release_channel: 'stable', client_build_number: 9999, client_event_source: null,
    }
  },
  DESKTOP_MAC: {
    label: 'Mac Desktop',
    properties: {
      os: 'Mac OS X', browser: 'Discord Client', device: '',
      system_locale: 'en-US',
      browser_user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9158 Chrome/120.0.6099.291 Electron/28.2.10 Safari/537.36',
      browser_version: '28.2.10', os_version: '23.0.0',
      release_channel: 'stable', client_build_number: 9999, client_event_source: null,
    }
  },
  MOBILE_IOS: {
    label: 'iOS Mobile',
    properties: {
      os: 'iOS', browser: 'Discord iOS', device: 'iPhone',
      system_locale: 'en-US', browser_user_agent: 'Discord-iOS/218.0 iOS/17.0',
      browser_version: '218.0', os_version: '17.0',
      release_channel: 'stable', client_build_number: 9999, client_event_source: null,
    }
  },
  MOBILE_ANDROID: {
    label: 'Android Mobile',
    properties: {
      os: 'Android', browser: 'Discord Android', device: 'Android',
      system_locale: 'en-US', browser_user_agent: 'Discord-Android/218 rv:218',
      browser_version: '218', os_version: '14',
      release_channel: 'stable', client_build_number: 9999, client_event_source: null,
    }
  },
  WEB_CHROME: {
    label: 'Chrome Browser',
    properties: {
      os: 'Windows', browser: 'Chrome', device: '',
      system_locale: 'en-US',
      browser_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      browser_version: '120.0.0.0', os_version: '10',
      release_channel: 'stable', client_build_number: 9999, client_event_source: null,
    }
  },
  VR: {
    label: 'VR Headset',
    properties: {
      os: 'Linux', browser: 'Discord Client', device: 'Quest 3',
      system_locale: 'en-US',
      browser_user_agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OpenVR/2.5.17',
      browser_version: '28.2.10', os_version: '',
      release_channel: 'stable', client_build_number: 9999, client_event_source: null,
    }
  },
};

// ── Plugin metadata ───────────────────────────────────────────────────────
export const PLUGIN_META = {
  TsuMixer:                   { name:'ツ Mixer',                    category:'Audio',       description:'Voice gain, reverb, EQ. Tap bar at top to control.',        defaultEnabled:true  },
  FakeDeafen:                 { name:'Fake Deafen',                 category:'Voice',       description:'Appear deafened — still hear everyone. Injected button.',    defaultEnabled:true  },
  MessageLogger:              { name:'Message Logger',              category:'Utility',     description:'Shows deleted messages with red ghost.',                      defaultEnabled:true  },
  ImageZoom:                  { name:'Image Zoom',                  category:'Utility',     description:'Tap images to zoom 2x.',                                      defaultEnabled:true  },
  VoiceDownload:              { name:'Voice Download',              category:'Utility',     description:'Download button on voice messages.',                          defaultEnabled:true  },
  ClearURLs:                  { name:'Clear URLs',                  category:'Privacy',     description:'Removes tracking params from links.',                         defaultEnabled:true  },
  SilentTyping:               { name:'Silent Typing',               category:'Privacy',     description:'Hides your typing indicator from others.',                    defaultEnabled:false },
  MessageClickActions:        { name:'Message Click Actions',       category:'Utility',     description:'Double-tap a message to edit it.',                            defaultEnabled:true  },
  ReadAllNotificationsButton: { name:'Read All Button',             category:'Utility',     description:'Mark all DMs read in one tap.',                               defaultEnabled:true  },
  ReverseImageSearch:         { name:'Reverse Image Search',        category:'Utility',     description:'Long-press image to search on Google.',                       defaultEnabled:true  },
  ColorSighted:               { name:'Color Sighted',               category:'Appearance',  description:'Removes colorblind role dots.',                               defaultEnabled:true  },
  NoTypingAnimation:          { name:'No Typing Animation',         category:'Performance', description:'Hides typing indicator entirely.',                            defaultEnabled:false },
  NoBlockedMessages:          { name:'No Blocked Messages',         category:'Privacy',     description:'Hides blocked message count.',                                defaultEnabled:false },
  ShowHiddenChannels:         { name:'Show Hidden Channels',        category:'Utility',     description:'Shows locked channels dimmed.',                               defaultEnabled:false },
  NoProfileThemes:            { name:'No Profile Themes',           category:'Appearance',  description:'Strips Nitro profile decorations.',                           defaultEnabled:false },
  AlwaysAnimate:              { name:'Always Animate',              category:'Appearance',  description:'Animated avatars always play.',                               defaultEnabled:false },
  DisableAnimations:          { name:'Disable Animations',          category:'Performance', description:'Kills all transitions for max speed.',                        defaultEnabled:false },
  FakeNitro:                  { name:'Fake Nitro',                  category:'Fun',         description:'Use any emoji in messages (client-side).',                    defaultEnabled:false },
  BetterFolders:              { name:'Better Folders',              category:'Appearance',  description:'Cleaner server folder UI.',                                   defaultEnabled:false },
  PinDMs:                     { name:'Pin DMs',                     category:'Utility',     description:'Pin important DMs to the top.',                               defaultEnabled:false },
  SpotifyControls:            { name:'Spotify Controls',            category:'Utility',     description:'Shows Spotify track in Discord.',                             defaultEnabled:false },
  OnlineFriendCount:          { name:'Online Friend Count',         category:'Utility',     description:'Shows online friend count in friends list.',                  defaultEnabled:false },
  AMOLED:                     { name:'AMOLED Theme',                category:'Themes',      description:'True black — saves OLED battery.',                            defaultEnabled:false },
  Midnight:                   { name:'Midnight Theme',              category:'Themes',      description:'Deep midnight blue palette.',                                 defaultEnabled:false },
  GlassTheme:                 { name:'Glass Theme',                 category:'Themes',      description:'Glassmorphism blur on panels.',                               defaultEnabled:false },
};

// ── Ucore loader ─────────────────────────────────────────────────────────
let _ucoreCache = null;

export async function loadUcore() {
  if (_ucoreCache !== null) return _ucoreCache;
  try {
    const asset = Asset.fromModule(UCORE_ASSET);
    await asset.downloadAsync();
    const uri = asset.localUri || asset.uri;
    if (!uri) throw new Error('no uri');
    const text = await FileSystem.readAsStringAsync(uri);
    _ucoreCache = text;
    return text;
  } catch (e) {
    console.warn('ucore load failed:', e.message);
    _ucoreCache = '';
    return '';
  }
}

// ── Build injection ───────────────────────────────────────────────────────
export function buildInjection(opts) {
  const {
    token        = null,
    gainPreset   = 'OFF',
    reverbPreset = 'NONE',
    voicePreset  = 'NONE',
    fakeDeafen   = false,
    fakeMute     = false,
    deviceSpoof  = 'DESKTOP_WINDOWS',
    ucoreSource  = '',
    eqBands      = null,
  } = opts;

  const gain       = GAIN_PRESETS[gainPreset]   || GAIN_PRESETS.OFF;
  const spoofProps = (DEVICE_SPOOF[deviceSpoof] || DEVICE_SPOOF.DESKTOP_WINDOWS).properties;

  const REVERB_MAP = {
    NONE:'None', SMALL_ROOM:'Small Room', LARGE_ROOM:'Large Room',
    CATHEDRAL:'Cathedral', HAUNTED_CAVERN:'Haunted Cavern',
    UNDERWATER:'Underwater', CONCERT:'Concert Hall',
  };
  const reverbName = REVERB_MAP[reverbPreset] || 'None';

  const gainJson       = JSON.stringify(gain);
  const spoofJson      = JSON.stringify(spoofProps);
  const pluginMetaJson = JSON.stringify(PLUGIN_META);
  const gainPresetsJson= JSON.stringify(GAIN_PRESETS);
  const reverbMapJson  = JSON.stringify(REVERB_MAP);
  const eqJson         = JSON.stringify(eqBands || [0,0,0,0,0,0,0,0,0]);
  const tokenJson      = JSON.stringify(token);
  const reverbNameJson = JSON.stringify(reverbName);

  // Build as array of parts joined — avoids one giant template literal
  const parts = [];

  parts.push('(function(){"use strict";');
  parts.push('if(window.__BZ_INJECTED__)return;window.__BZ_INJECTED__=true;');

  // RN bridge
  parts.push('function bzPost(t,d){try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({type:t},d||{})));}catch(e){}}');

  // Global state
  parts.push('window.__BZ_GAIN__=' + gainJson + ';');
  parts.push('window.__BZ_REVERB__=' + reverbNameJson + ';');
  parts.push('window.__BZ_VOICE__=' + JSON.stringify(voicePreset) + ';');
  parts.push('window.__BZ_EQ__=' + eqJson + ';');
  parts.push('window.__BZ_FAKE_DEAFEN__=' + (fakeDeafen ? 'true' : 'false') + ';');
  parts.push('window.__BZ_FAKE_MUTE__=' + (fakeMute ? 'true' : 'false') + ';');
  parts.push('window.__BZ_DEVICE_PROPS__=' + spoofJson + ';');
  parts.push('window.__BZ_PLUGINS__=' + pluginMetaJson + ';');
  parts.push('window.__BZ_GAIN_PRESETS__=' + gainPresetsJson + ';');
  parts.push('window.__BZ_REVERB_MAP__=' + reverbMapJson + ';');

  // Lag fixes
  parts.push(LAG_FIX_JS);

  // WebSocket intercept (spoof + fake deafen)
  parts.push(WS_INTERCEPT_JS);

  // Gain pre-patch on AudioContext
  parts.push(GAIN_PREPATCH_JS);

  // Token injection
  if (token) {
    parts.push('(function(){var TOKEN=' + tokenJson + ';');
    parts.push(TOKEN_INJECT_BODY_JS);
    parts.push('})();');
  }

  // Plugin CSS/JS bootstrap
  parts.push(PLUGIN_BOOTSTRAP_JS);

  // Plugin apply/remove API
  parts.push(PLUGIN_API_JS);

  // BZ live API
  parts.push(BZ_API_JS);

  // ucore engine
  if (ucoreSource) {
    parts.push('try{');
    parts.push(ucoreSource);
    parts.push('}catch(ucoreErr){bzPost("UCORE_ERR",{e:ucoreErr.message});}');
  }

  // Apply ucore settings once it inits
  parts.push(UCORE_APPLY_JS);

  // Settings UI (injected into Discord settings sidebar)
  parts.push(SETTINGS_UI_JS);

  // Mixer bar (top bar)
  parts.push(MIXER_BAR_JS);

  // Fake deafen button in voice bar
  parts.push(FAKE_DEAFEN_JS);

  parts.push('bzPost("BZ_READY",{v:"2.2.0"});');
  parts.push('})();');

  return parts.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────
// Injection sub-modules (plain strings — no backticks, no template literals)
// ─────────────────────────────────────────────────────────────────────────

const LAG_FIX_JS = [
  '(function(){',
  '  var oRAF=window.requestAnimationFrame;var _last=0;',
  '  window.requestAnimationFrame=function(cb){',
  '    return oRAF.call(window,function(ts){if(document.hidden&&ts-_last<50)return;_last=ts;cb(ts);});',
  '  };',
  '})();',
  '(function(){',
  '  var A=window.AudioContext||window.webkitAudioContext;if(!A)return;',
  '  var _orig=A.prototype.createScriptProcessor;',
  '  A.prototype.createScriptProcessor=function(buf,i,o){return _orig.call(this,Math.max(buf||0,4096),i,o);};',
  '})();',
].join('\n');

const WS_INTERCEPT_JS = [
  '(function(){',
  '  var OWS=window.WebSocket;',
  '  function BWS(url,protos){var ws=protos?new OWS(url,protos):new OWS(url);',
  '    var origSend=ws.send.bind(ws);',
  '    ws.send=function(data){',
  '      try{var msg=JSON.parse(data);',
  '        if(msg.op===2&&msg.d&&msg.d.properties){msg.d.properties=Object.assign({},msg.d.properties,window.__BZ_DEVICE_PROPS__);data=JSON.stringify(msg);}',
  '        if(msg.op===4&&msg.d!=null){if(window.__BZ_FAKE_DEAFEN__){msg.d.self_deaf=true;if(window.__BZ_FAKE_MUTE__)msg.d.self_mute=true;data=JSON.stringify(msg);}}',
  '      }catch(e){}',
  '      origSend(data);',
  '    };',
  '    return ws;',
  '  }',
  '  BWS.prototype=OWS.prototype;BWS.CONNECTING=0;BWS.OPEN=1;BWS.CLOSING=2;BWS.CLOSED=3;',
  '  window.WebSocket=BWS;',
  '})();',
].join('\n');

const GAIN_PREPATCH_JS = [
  '(function(){',
  '  var A=window.AudioContext||window.webkitAudioContext;if(!A)return;',
  '  var _orig=A.prototype.createGain;',
  '  A.prototype.createGain=function(){',
  '    var node=_orig.call(this);var g=window.__BZ_GAIN__;',
  '    if(g&&g.masterGain>100)node.gain.value=g.masterGain/100;',
  '    return node;',
  '  };',
  '})();',
].join('\n');

const TOKEN_INJECT_BODY_JS = [
  '  function inject(){',
  '    try{',
  '      var chunks=window.webpackChunkdiscord_app;',
  '      if(chunks){var req;chunks.push([[Symbol()],{},function(r){req=r;}]);',
  '        if(req){var keys=Object.keys(req.m);for(var i=0;i<keys.length;i++){',
  '          try{var m=req(keys[i]);if(m&&m.getToken&&m.setToken){m.setToken(TOKEN);bzPost("TOKEN_OK",{});return;}}catch(e2){}',
  '        }}',
  '      }',
  '      localStorage.setItem("token",JSON.stringify(TOKEN));bzPost("TOKEN_FALLBACK",{});',
  '    }catch(e){bzPost("TOKEN_ERR",{e:e.message});}',
  '  }',
  '  if(document.readyState==="complete")setTimeout(inject,800);',
  '  else window.addEventListener("load",function(){setTimeout(inject,800);});',
].join('\n');

const PLUGIN_BOOTSTRAP_JS = [
  '(function bzBoot(){',
  '  var CSS_DEFS={',
  '    "AlwaysAnimate":"[class*=\\"avatar\\"] img,[class*=\\"avatarStack\\"] img{animation-play-state:running!important;}",',
  '    "DisableAnimations":"*,*::before,*::after{animation-duration:0ms!important;transition-duration:0ms!important;}",',
  '    "AMOLED":":root{--background-primary:#000!important;--background-secondary:#0a0a0a!important;--background-tertiary:#050505!important;--background-floating:#000!important;--channeltextarea-background:#0a0a0a!important;}",',
  '    "Midnight":":root{--background-primary:#0b0d17!important;--background-secondary:#0f1220!important;--background-tertiary:#090b14!important;--background-floating:#0b0d17!important;--channeltextarea-background:#0f1220!important;}",',
  '    "GlassTheme":"[class*=\\"sidebar\\"],[class*=\\"chat\\"],[class*=\\"members\\"]{background:rgba(0,0,0,0.4)!important;backdrop-filter:blur(12px)!important;}",',
  '    "NoBlockedMessages":"[class*=\\"blockedMessageCount\\"],[class*=\\"hiddenMessageCount\\"]{display:none!important;}",',
  '    "ColorSighted":"[class*=\\"roleCircle\\"]{display:none!important;}",',
  '    "NoTypingAnimation":"[class*=\\"typing\\"]{display:none!important;}",',
  '    "NoProfileThemes":"[class*=\\"profileTheme\\"],[class*=\\"bannerPremium\\"]{background:var(--background-secondary)!important;}",',
  '    "ShowHiddenChannels":"[class*=\\"channel-\\"][aria-disabled=\\"true\\"]{opacity:0.5!important;display:flex!important;}"',
  '  };',
  '  var JS_DEFS={',
  '    "SilentTyping":"(function(){var f=window.fetch;window.fetch=function(url,opts){if(typeof url===\\"string\\"&&url.includes(\\"/typing\\"))return Promise.resolve(new Response(\\"{}\\"));return f.apply(this,arguments);};})();",',
  '    "ClearURLs":"(function(){document.addEventListener(\\"click\\",function(e){var a=e.target.closest(\\"a[href]\\");if(!a)return;try{var u=new URL(a.href);[\\"utm_source\\",\\"utm_medium\\",\\"utm_campaign\\",\\"fbclid\\",\\"gclid\\"].forEach(function(p){u.searchParams.delete(p);});a.href=u.toString();}catch(err){}},true);})();",',
  '    "ImageZoom":"(function(){document.addEventListener(\\"click\\",function(e){var img=e.target.closest(\\"[class*=\\\\\\"imageWrapper\\\\\\"] img\\");if(!img)return;if(img._bzZ){img.style.transform=\\"\\";img._bzZ=false;}else{img.style.transform=\\"scale(2.2)\\";img.style.transformOrigin=\\"center\\";img.style.transition=\\"transform 0.2s\\";img.style.zIndex=\\"9999\\";img.style.position=\\"relative\\";img._bzZ=true;}});})();",',
  '    "MessageLogger":"(function(){var obs=new MutationObserver(function(ms){ms.forEach(function(m){m.removedNodes.forEach(function(node){if(node.nodeType!==1)return;var msg=node.matches&&node.matches(\\"[id^=\\\\\\"chat-messages-\\\\\\"]\\")?node:node.querySelector&&node.querySelector(\\"[id^=\\\\\\"chat-messages-\\\\\\"]\\")||null;if(!msg)return;var c=msg.querySelector(\\"[class*=\\\\\\"messageContent\\\\\\"]\\")||null;if(!c)return;var g=document.createElement(\\"div\\");g.style.cssText=\\"opacity:0.45;background:#ed424520;border-left:3px solid #ed4245;padding:4px 8px;margin:2px 0;border-radius:4px;font-size:13px;color:#ed4245;pointer-events:none;\\";g.textContent=\\"[deleted] \\"+c.textContent;m.target.appendChild(g);});});});obs.observe(document.body,{childList:true,subtree:true});})();",',
  '    "MessageClickActions":"(function(){document.addEventListener(\\"dblclick\\",function(e){var msg=e.target.closest(\\"[id^=\\\\\\"chat-messages-\\\\\\"]\\")||null;if(!msg)return;var btn=msg.querySelector(\\"[aria-label=\\\\\\"Edit\\\\\\"]\\")||null;if(btn)btn.click();});})();",',
  '    "ReadAllNotificationsButton":"(function(){function add(){var h=document.querySelector(\\"[class*=\\\\\\"privateChannels\\\\\\"] [class*=\\\\\\"header\\\\\\"]\\")||null;if(!h||document.getElementById(\\"bz-markalld\\"))return;var b=document.createElement(\\"button\\");b.id=\\"bz-markalld\\";b.textContent=\\"\\u2713\\";b.title=\\"Mark all read\\";b.style.cssText=\\"background:none;border:1px solid #5865f2;border-radius:4px;color:#5865f2;cursor:pointer;font-size:11px;padding:2px 5px;margin-left:auto;\\";b.onclick=function(){document.querySelectorAll(\\"[class*=\\\\\\"unread\\\\\\"],[class*=\\\\\\"mentionsBadge\\\\\\"]\\").forEach(function(e){e.style.display=\\"none\\";});};h.style.display=\\"flex\\";h.style.alignItems=\\"center\\";h.appendChild(b);}var o=new MutationObserver(add);o.observe(document.body,{childList:true,subtree:true});setTimeout(add,3000);})();",',
  '    "ReverseImageSearch":"(function(){document.addEventListener(\\"contextmenu\\",function(e){var img=e.target.closest(\\"img[src*=\\\\\\"cdn.discordapp\\\\\\"]\\")||null;if(!img)return;setTimeout(function(){var menu=document.querySelector(\\"[class*=\\\\\\"menu-\\\\\\"]\\")||null;if(!menu||menu.querySelector(\\"#bz-rs\\"))return;var item=document.createElement(\\"div\\");item.id=\\"bz-rs\\";item.role=\\"menuitem\\";item.textContent=\\"\\uD83D\\uDD0D Reverse Image Search\\";item.style.cssText=\\"padding:6px 12px;cursor:pointer;color:#dcddde;font-size:14px;border-radius:4px;\\";item.onclick=function(){window.open(\\"https://www.google.com/searchbyimage?image_url=\\"+encodeURIComponent(img.src));};menu.appendChild(item);},60);});})();"',
  '  };',
  '  var saved={};try{saved=JSON.parse(localStorage.getItem("bz_plugins")||"{}");}catch(e){}',
  '  var meta=window.__BZ_PLUGINS__||{};',
  '  Object.keys(meta).forEach(function(id){',
  '    var p=meta[id];var on=saved[id]!==undefined?saved[id]:p.defaultEnabled;',
  '    if(!on)return;',
  '    if(CSS_DEFS[id]){var el=document.createElement("style");el.id="bz-css-"+id;el.textContent=CSS_DEFS[id];document.head.appendChild(el);}',
  '    if(JS_DEFS[id]){try{eval(JS_DEFS[id]);}catch(e){}}',
  '  });',
  '  window.__BZ_CSS_DEFS__=CSS_DEFS;',
  '  window.__BZ_JS_DEFS__=JS_DEFS;',
  '})();',
].join('\n');

const PLUGIN_API_JS = [
  'window.__BZ_APPLY_PLUGIN__=function(id){',
  '  var css=window.__BZ_CSS_DEFS__&&window.__BZ_CSS_DEFS__[id];',
  '  if(css){var el=document.getElementById("bz-css-"+id);if(!el){el=document.createElement("style");el.id="bz-css-"+id;document.head.appendChild(el);}el.textContent=css;}',
  '  var js=window.__BZ_JS_DEFS__&&window.__BZ_JS_DEFS__[id];',
  '  if(js){try{eval(js);}catch(e){}}',
  '  if(id==="TsuMixer"&&window.__BZ_MIXER_BAR__)window.__BZ_MIXER_BAR__.show();',
  '  if(id==="FakeDeafen"&&window.__BZ_FAKE_DEAFEN_API__)window.__BZ_FAKE_DEAFEN_API__.setEnabled(true);',
  '};',
  'window.__BZ_REMOVE_PLUGIN__=function(id){',
  '  var el=document.getElementById("bz-css-"+id);if(el)el.remove();',
  '  if(id==="TsuMixer"&&window.__BZ_MIXER_BAR__)window.__BZ_MIXER_BAR__.hide();',
  '  if(id==="FakeDeafen"){window.__BZ_FAKE_DEAFEN__=false;if(window.__BZ_FAKE_DEAFEN_API__)window.__BZ_FAKE_DEAFEN_API__.setEnabled(false);}',
  '};',
].join('\n');

const BZ_API_JS = [
  'window.__BZ_API__={',
  '  setGain:function(preset){var g=window.__BZ_GAIN_PRESETS__[preset];if(!g)return;window.__BZ_GAIN__=g;applyUcore();},',
  '  setReverb:function(room){window.__BZ_REVERB__=room;try{window.__N7RCORD_API__&&window.__N7RCORD_API__.setReverb&&window.__N7RCORD_API__.setReverb(room);}catch(e){}},',
  '  setVoice:function(v){window.__BZ_VOICE__=v;try{window.__N7RCORD_API__&&window.__N7RCORD_API__.setVoiceChanger&&window.__N7RCORD_API__.setVoiceChanger(v);}catch(e){}},',
  '  setEQ:function(bands){window.__BZ_EQ__=bands;try{window.__N7RCORD_API__&&window.__N7RCORD_API__.setEQ&&window.__N7RCORD_API__.setEQ(bands);}catch(e){}},',
  '  setFakeDeafen:function(v){window.__BZ_FAKE_DEAFEN__=v;},',
  '  setFakeMute:function(v){window.__BZ_FAKE_MUTE__=v;}',
  '};',
].join('\n');

const UCORE_APPLY_JS = [
  'function applyUcore(){',
  '  try{if(!window.__N7RCORD_API__)return;var api=window.__N7RCORD_API__;var g=window.__BZ_GAIN__;',
  '    if(api.setMasterGain)api.setMasterGain(g.masterGain);',
  '    if(api.setInputBoost)api.setInputBoost(g.inputBoost);',
  '    if(api.setGain2)api.setGain2(g.gain2);',
  '    if(api.setGain3)api.setGain3(g.gain3);',
  '    if(window.__BZ_REVERB__&&window.__BZ_REVERB__!=="None"&&api.setReverb)api.setReverb(window.__BZ_REVERB__);',
  '    if(window.__BZ_VOICE__&&window.__BZ_VOICE__!=="NONE"&&api.setVoiceChanger)api.setVoiceChanger(window.__BZ_VOICE__);',
  '    if(window.__BZ_EQ__&&api.setEQ)api.setEQ(window.__BZ_EQ__);',
  '    bzPost("UCORE_READY",{gain:g.masterGain});',
  '  }catch(e){}',
  '}',
  'var _poll=0;var _t=setInterval(function(){if(++_poll>60)clearInterval(_t);if(window.__N7RCORD_API__){clearInterval(_t);applyUcore();}},300);',
].join('\n');

const SETTINGS_UI_JS = [
  '(function bzSettingsUI(){',
  '  var SECS=[{id:"bz-plugins",label:"Plugins",icon:"\\uD83E\\uDDF9"},{id:"bz-themes",label:"Themes",icon:"\\uD83C\\uDFA8"},{id:"bz-mixer",label:"\\u30C4 Mixer",icon:"\\uD83C\\uDF9A\\uFE0F"},{id:"bz-about",label:"BlasterZone",icon:"\\u26A1"}];',
  '  var _injected=false;var _cur=null;',
  '  function tryInject(){',
  '    var sidebar=document.querySelector("[class*=\\"sidebarRegionScroller\\"],[class*=\\"standardSidebarView\\"] [class*=\\"scroller\\"]");',
  '    if(!sidebar||document.getElementById("bz-nav-divider"))return;',
  '    var div=document.createElement("div");div.id="bz-nav-divider";div.style.cssText="height:1px;background:#2e3035;margin:8px 0;";',
  '    var hdr=document.createElement("div");hdr.style.cssText="padding:6px 10px 4px;font-size:11px;font-weight:700;color:#949cf7;text-transform:uppercase;letter-spacing:0.5px;";hdr.textContent="\\u26A1 BlasterZone";',
  '    sidebar.appendChild(div);sidebar.appendChild(hdr);',
  '    SECS.forEach(function(s){',
  '      var item=document.createElement("div");item.id="bz-nav-"+s.id;',
  '      item.style.cssText="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:4px;cursor:pointer;color:#b5bac1;font-size:16px;font-weight:500;";',
  '      item.innerHTML="<span>"+s.icon+"</span><span>"+s.label+"</span>";',
  '      item.onmouseenter=function(){if(_cur!==s.id)item.style.background="#35373c";};',
  '      item.onmouseleave=function(){if(_cur!==s.id)item.style.background="transparent";};',
  '      (function(sid,slabel){item.onclick=function(){openSection(sid,slabel);};})(s.id,s.label);',
  '      sidebar.appendChild(item);',
  '    });',
  '    _injected=true;',
  '  }',
  '  function openSection(id){',
  '    _cur=id;',
  '    SECS.forEach(function(s){var el=document.getElementById("bz-nav-"+s.id);if(el){el.style.background=s.id===id?"rgba(88,101,242,0.3)":"transparent";el.style.color=s.id===id?"#c9cdfb":"#b5bac1";}});',
  '    var content=document.querySelector("[class*=\\"contentColumnDefault\\"],[class*=\\"contentRegion\\"] [class*=\\"contentColumn\\"]");',
  '    if(!content)return;',
  '    if(!content._bzOrig)content._bzOrig=content.innerHTML;',
  '    var plugins=window.__BZ_PLUGINS__||{};',
  '    var saved={};try{saved=JSON.parse(localStorage.getItem("bz_plugins")||"{}");}catch(e){}',
  '    var html="<div style=\\"padding:32px 40px 60px;max-width:740px;color:#dcddde;font-family:inherit;\\">";',
  '    html+="<button id=\\"bz-back\\" style=\\"background:none;border:none;color:#949cf7;cursor:pointer;font-size:13px;padding:0 0 18px;display:flex;align-items:center;gap:4px;\\">&larr; Discord Settings</button>";',
  '    if(id==="bz-about"){',
  '      html+="<div style=\\"text-align:center;padding-top:10px;\\">";',
  '      html+="<div style=\\"font-size:52px;\\">\\u26A1</div>";',
  '      html+="<h1 style=\\"font-size:24px;font-weight:900;color:#fff;margin:8px 0 4px;\\">BlasterZone</h1>";',
  '      html+="<div style=\\"color:#949cf7;margin-bottom:20px;\\">v2.2.0 &middot; \\u30C4core v3.17.0</div>";',
  '      html+="<div style=\\"background:#1e1f22;border-radius:10px;padding:16px 24px;display:inline-block;text-align:left;\\">";',
  '      html+="<div style=\\"color:#b5bac1;font-size:13px;margin-bottom:6px;\\">\\uD83E\\uDDF9 Plugins: <strong style=\\"color:#fff\\">"+Object.keys(plugins).length+"</strong></div>";',
  '      html+="<div style=\\"color:#b5bac1;font-size:13px;margin-bottom:6px;\\">\\uD83D\\uDC7B Haunted Cavern: Perfect \\uD83D\\uDC51</div>";',
  '      html+="<div style=\\"color:#b5bac1;font-size:13px;\\">\\uD83D\\uDDA5\\uFE0F Desktop Spoof: On</div>";',
  '      html+="</div></div>";',
  '    } else {',
  '      var cats={};',
  '      var onlyThemes=(id==="bz-themes");',
  '      Object.keys(plugins).forEach(function(pid){',
  '        var p=plugins[pid];',
  '        if(onlyThemes&&p.category!=="Themes")return;',
  '        if(!onlyThemes&&p.category==="Themes")return;',
  '        if(!cats[p.category])cats[p.category]=[];',
  '        cats[p.category].push(Object.assign({id:pid},p));',
  '      });',
  '      html+="<h2 style=\\"font-size:20px;font-weight:800;color:#fff;margin:0 0 20px;\\">"+(onlyThemes?"\\uD83C\\uDFA8 Themes":"\\uD83E\\uDDF9 Plugins")+"</h2>";',
  '      Object.keys(cats).forEach(function(cat){',
  '        html+="<h3 style=\\"font-size:11px;font-weight:700;color:#949cf7;text-transform:uppercase;letter-spacing:0.5px;margin:16px 0 8px;\\">"+cat+"</h3>";',
  '        cats[cat].forEach(function(p){',
  '          var isOn=saved[p.id]!==undefined?saved[p.id]:p.defaultEnabled;',
  '          html+="<div style=\\"display:flex;align-items:center;background:#1e1f22;border-radius:8px;padding:12px 14px;gap:12px;margin-bottom:6px;\\">";',
  '          html+="<div style=\\"flex:1;\\"><div style=\\"font-weight:700;color:#fff;font-size:14px;\\">"+p.name+"</div>";',
  '          html+="<div style=\\"color:#949cf7;font-size:12px;margin-top:2px;\\">"+p.description+"</div></div>";',
  '          html+="<label style=\\"position:relative;display:inline-block;width:40px;height:22px;flex-shrink:0;cursor:pointer;\\">";',
  '          html+="<input type=\\"checkbox\\" class=\\"bz-ptoggle\\" data-pid=\\""+p.id+"\\" "+(isOn?"checked":"")+" style=\\"opacity:0;position:absolute;width:0;height:0;\\">";',
  '          html+="<span style=\\"position:absolute;inset:0;border-radius:11px;background:"+(isOn?"#23a55a":"#4e5058")+";transition:background 0.15s;\\" class=\\"bz-pt-track\\"></span>";',
  '          html+="<span style=\\"position:absolute;top:3px;"+(isOn?"left:21px":"left:3px")+";width:16px;height:16px;border-radius:50%;background:#fff;transition:left 0.15s;\\" class=\\"bz-pt-thumb\\"></span>";',
  '          html+="</label></div>";',
  '        });',
  '      });',
  '    }',
  '    html+="</div>";',
  '    content.innerHTML=html;',
  '    var back=content.querySelector("#bz-back");',
  '    if(back)back.addEventListener("click",function(){',
  '      content.innerHTML=content._bzOrig||"";delete content._bzOrig;_cur=null;',
  '      SECS.forEach(function(s){var el=document.getElementById("bz-nav-"+s.id);if(el){el.style.background="transparent";el.style.color="#b5bac1";}});',
  '    });',
  '    content.querySelectorAll(".bz-ptoggle").forEach(function(inp){',
  '      inp.addEventListener("change",function(){',
  '        var pid=inp.dataset.pid;var on=inp.checked;',
  '        var sv={};try{sv=JSON.parse(localStorage.getItem("bz_plugins")||"{}");}catch(e){}',
  '        sv[pid]=on;localStorage.setItem("bz_plugins",JSON.stringify(sv));',
  '        if(on)window.__BZ_APPLY_PLUGIN__&&window.__BZ_APPLY_PLUGIN__(pid);',
  '        else window.__BZ_REMOVE_PLUGIN__&&window.__BZ_REMOVE_PLUGIN__(pid);',
  '        var label=inp.closest("label");',
  '        if(label){var trk=label.querySelector(".bz-pt-track");var thb=label.querySelector(".bz-pt-thumb");',
  '          if(trk)trk.style.background=on?"#23a55a":"#4e5058";if(thb)thb.style.left=on?"21px":"3px";}',
  '        try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:"PLUGIN_TOGGLE",plugin:pid,enabled:on}));}catch(e){}',
  '      });',
  '    });',
  '  }',
  '  var obs=new MutationObserver(function(){',
  '    var inSettings=!!document.querySelector("[class*=\\"standardSidebarView\\"],[class*=\\"sidebarRegionScroller\\"]");',
  '    if(inSettings&&!_injected)tryInject();',
  '    if(!inSettings){_injected=false;_cur=null;}',
  '  });',
  '  obs.observe(document.body,{childList:true,subtree:true});',
  '  tryInject();',
  '})();',
].join('\n');

const MIXER_BAR_JS = [
  '(function bzMixer(){',
  '  var _bar=null;var _exp=false;',
  '  var GL={100:"Off",200:"Mild",450:"Loud",800:"Max",1200:"Ultra",500:"Monster",700:"\\u26A1 GOD"};',
  '  function gLabel(){var v=window.__BZ_GAIN__&&window.__BZ_GAIN__.masterGain||100;return GL[v]||v+"%";}',
  '  function getHTML(){',
  '    var gl=gLabel();var rv=window.__BZ_REVERB__||"None";var df=window.__BZ_FAKE_DEAFEN__;',
  '    var h="<span style=\\"color:#949cf7;font-weight:800;font-size:11px;\\">\\u30C4</span>";',
  '    h+="<span>\\uD83D\\uDD0A <strong style=\\"color:"+(gl==="Off"?"#b5bac1":"#23a55a")+"\\">" +gl+"</strong></span>";',
  '    if(rv!=="None")h+="<span>\\uD83C\\uDFB5 <strong style=\\"color:#949cf7\\">"+rv+"</strong></span>";',
  '    if(df)h+="<span>\\uD83D\\uDD07</span>";',
  '    h+="<span style=\\"color:#555;font-size:10px;\\">"+(_exp?"\\u25B2":"\\u25BC")+"</span>";',
  '    return h;',
  '  }',
  '  function create(){',
  '    if(document.getElementById("bz-mbar"))return;',
  '    var bar=document.createElement("div");bar.id="bz-mbar";',
  '    bar.style.cssText="position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:99999;background:#1e1f22ee;backdrop-filter:blur(8px);border-radius:0 0 12px 12px;border:1px solid #35373c;border-top:none;display:flex;align-items:center;gap:8px;padding:5px 14px;cursor:pointer;font-size:12px;color:#b5bac1;font-family:inherit;min-width:160px;justify-content:center;user-select:none;";',
  '    bar.innerHTML=getHTML();',
  '    bar.onclick=toggle;',
  '    document.body.appendChild(bar);_bar=bar;',
  '    setInterval(function(){if(_bar)_bar.innerHTML=getHTML();},1500);',
  '  }',
  '  function toggle(){_exp=!_exp;if(_exp)showPanel();else hidePanel();if(_bar)_bar.innerHTML=getHTML();}',
  '  function showPanel(){',
  '    hidePanel();',
  '    var p=document.createElement("div");p.id="bz-mpanel";',
  '    p.style.cssText="position:fixed;top:34px;left:50%;transform:translateX(-50%);z-index:99998;background:#1e1f22;border:1px solid #35373c;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px;min-width:260px;font-family:inherit;font-size:13px;color:#dcddde;box-shadow:0 8px 24px rgba(0,0,0,0.6);";',
  '    var cur=(window.__BZ_GAIN__&&window.__BZ_GAIN__.masterGain)||100;',
  '    var gbtns=[["Off","OFF","#555"],["Mild","MILD","#22c55e"],["Loud","LOUD","#84cc16"],["Max","MAX","#eab308"],["\\u26A1 GOD","GOD","#949cf7"]];',
  '    var gbhtml=gbtns.map(function(x){',
  '      var gval={OFF:100,MILD:200,LOUD:450,MAX:800,GOD:700}[x[1]]||100;',
  '      var active=gval===cur;',
  '      return "<button data-gk=\\""+x[1]+"\\" style=\\"background:"+(active?x[2]+"33":"#2b2d31")+";border:1.5px solid "+(active?x[2]:"#35373c")+";color:"+(active?x[2]:"#b5bac1")+";border-radius:6px;padding:4px 8px;cursor:pointer;font-size:12px;font-weight:700;\\">"+x[0]+"</button>";',
  '    }).join("");',
  '    var rvOpts=["None","Small Room","Large Room","Cathedral","Haunted Cavern","Underwater","Concert Hall"];',
  '    var rvSel=rvOpts.map(function(r){return "<option value=\\""+r+"\\" "+(( window.__BZ_REVERB__||"None")===r?"selected":"")+">"+r+"</option>";}).join("");',
  '    var df=window.__BZ_FAKE_DEAFEN__;',
  '    p.innerHTML="<div style=\\"font-weight:800;color:#fff;font-size:14px;\\">\\u30C4 Mixer</div>"',
  '      +"<div style=\\"font-size:11px;color:#949cf7;font-weight:700;text-transform:uppercase;\\">Gain</div>"',
  '      +"<div style=\\"display:flex;flex-wrap:wrap;gap:4px;\\">"+gbhtml+"</div>"',
  '      +"<div style=\\"font-size:11px;color:#949cf7;font-weight:700;text-transform:uppercase;\\">Reverb</div>"',
  '      +"<select id=\\"bz-rv-sel\\" style=\\"background:#2b2d31;border:1px solid #35373c;color:#dcddde;border-radius:6px;padding:6px 8px;font-size:13px;\\">"+rvSel+"</select>"',
  '      +"<div style=\\"display:flex;align-items:center;justify-content:space-between;\\">"',
  '      +"<span>\\uD83D\\uDD07 Fake Deafen</span>"',
  '      +"<label style=\\"position:relative;display:inline-block;width:40px;height:22px;cursor:pointer;\\">"',
  '      +"<input type=\\"checkbox\\" id=\\"bz-qd\\" "+(df?"checked":"")+" style=\\"opacity:0;position:absolute;\\">"',
  '      +"<span id=\\"bz-qdt\\" style=\\"position:absolute;inset:0;border-radius:11px;background:"+(df?"#ed4245":"#4e5058")+";transition:background 0.15s;\\"></span>"',
  '      +"<span id=\\"bz-qdth\\" style=\\"position:absolute;top:3px;"+(df?"left:21px":"left:3px")+";width:16px;height:16px;border-radius:50%;background:#fff;transition:left 0.15s;\\"></span>"',
  '      +"</label></div>";',
  '    document.body.appendChild(p);',
  '    p.querySelectorAll("[data-gk]").forEach(function(btn){',
  '      btn.onclick=function(){',
  '        window.__BZ_API__&&window.__BZ_API__.setGain(btn.dataset.gk);',
  '        setTimeout(function(){hidePanel();_exp=true;showPanel();if(_bar)_bar.innerHTML=getHTML();},50);',
  '        try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:"GAIN_CHANGE",preset:btn.dataset.gk}));}catch(e){}',
  '      };',
  '    });',
  '    var rvsel=p.querySelector("#bz-rv-sel");',
  '    if(rvsel)rvsel.onchange=function(e){',
  '      window.__BZ_API__&&window.__BZ_API__.setReverb(e.target.value);if(_bar)_bar.innerHTML=getHTML();',
  '      try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:"REVERB_CHANGE",room:e.target.value}));}catch(e2){}',
  '    };',
  '    var qd=p.querySelector("#bz-qd");',
  '    if(qd)qd.onchange=function(){',
  '      var v=qd.checked;window.__BZ_FAKE_DEAFEN__=v;window.__BZ_API__&&window.__BZ_API__.setFakeDeafen(v);',
  '      var t=p.querySelector("#bz-qdt");var th=p.querySelector("#bz-qdth");',
  '      if(t)t.style.background=v?"#ed4245":"#4e5058";if(th)th.style.left=v?"21px":"3px";',
  '      if(_bar)_bar.innerHTML=getHTML();',
  '      try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:"FAKE_DEAFEN_TOGGLE",value:v}));}catch(e){}',
  '    };',
  '    setTimeout(function(){document.addEventListener("click",function close(e){if(!p.contains(e.target)&&e.target!==_bar){hidePanel();document.removeEventListener("click",close);}});},100);',
  '  }',
  '  function hidePanel(){var p=document.getElementById("bz-mpanel");if(p)p.remove();_exp=false;}',
  '  window.__BZ_MIXER_BAR__={show:create,hide:function(){if(_bar){_bar.remove();_bar=null;}hidePanel();}};',
  '  var sv={};try{sv=JSON.parse(localStorage.getItem("bz_plugins")||"{}");}catch(e){}',
  '  if(sv.TsuMixer!==false)create();',
  '})();',
].join('\n');

const FAKE_DEAFEN_JS = [
  '(function bzFD(){',
  '  function inject(){',
  '    if(document.getElementById("bz-fd-btn"))return;',
  '    var bar=document.querySelector("[class*=\\"actionButtons\\"],[class*=\\"voiceActions\\"],[class*=\\"connection\\"] [class*=\\"buttons\\"]");',
  '    if(!bar)return;',
  '    var deafBtn=bar.querySelector("[aria-label*=\\"eafen\\"],[class*=\\"deafen\\"]")||null;',
  '    var btn=document.createElement("button");btn.id="bz-fd-btn";',
  '    btn.title="Fake Deafen (BlasterZone)";',
  '    btn.innerHTML="<svg width=\\"20\\" height=\\"20\\" viewBox=\\"0 0 24 24\\" fill=\\"currentColor\\"><path d=\\"M12 2C8.13 2 5 5.13 5 9v5l-2 2v1h18v-1l-2-2V9c0-3.87-3.13-7-7-7z\\" opacity=\\"0.3\\"/><path d=\\"M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2z\\"/><line x1=\\"3\\" y1=\\"3\\" x2=\\"21\\" y2=\\"21\\" stroke=\\"white\\" stroke-width=\\"2.5\\" stroke-linecap=\\"round\\"/></svg>";',
  '    btn.style.cssText="background:none;border:none;cursor:pointer;padding:8px;border-radius:50%;color:#b5bac1;display:flex;align-items:center;justify-content:center;width:36px;height:36px;transition:background 0.15s,color 0.15s;flex-shrink:0;";',
  '    btn.onmouseenter=function(){if(!window.__BZ_FAKE_DEAFEN__)btn.style.background="#35373c";};',
  '    btn.onmouseleave=function(){if(!window.__BZ_FAKE_DEAFEN__)btn.style.background="none";};',
  '    btn.onclick=function(){',
  '      window.__BZ_FAKE_DEAFEN__=!window.__BZ_FAKE_DEAFEN__;',
  '      var on=window.__BZ_FAKE_DEAFEN__;',
  '      btn.style.background=on?"#ed4245":"none";btn.style.color=on?"#fff":"#b5bac1";',
  '      btn.title=on?"Fake Deafen ON":"Fake Deafen (BlasterZone)";',
  '      var db=document.querySelector("[aria-label*=\\"eafen\\"],[class*=\\"deafen\\"]");',
  '      if(db){db.click();setTimeout(function(){db.click();},100);}',
  '      try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:"FAKE_DEAFEN_TOGGLE",value:on}));}catch(e){}',
  '    };',
  '    window.__BZ_FAKE_DEAFEN_API__={setEnabled:function(v){window.__BZ_FAKE_DEAFEN__=v;btn.style.background=v?"#ed4245":"none";btn.style.color=v?"#fff":"#b5bac1";}};',
  '    if(deafBtn)deafBtn.parentNode.insertBefore(btn,deafBtn.nextSibling);else bar.appendChild(btn);',
  '  }',
  '  var obs=new MutationObserver(inject);obs.observe(document.body,{childList:true,subtree:true});',
  '  setTimeout(inject,2000);setTimeout(inject,5000);setTimeout(inject,10000);',
  '})();',
].join('\n');
