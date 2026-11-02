// BlasterZone Settings UI Injector
// Adds "BlasterZone" section inside Discord's own settings menu
// with Plugins, Themes, and ツ Mixer tabs — exactly like Kettu

export const SETTINGS_UI_JS = `
(function bzSettingsUI() {
  'use strict';

  const SECTIONS = [
    { id: 'bz-plugins',  label: 'Plugins',     icon: '🧩' },
    { id: 'bz-themes',   label: 'Themes',       icon: '🎨' },
    { id: 'bz-mixer',    label: 'ツ Mixer',     icon: '🎚️' },
    { id: 'bz-about',    label: 'BlasterZone',  icon: '⚡' },
  ];

  let currentSection = null;
  let injected = false;

  // ── Wait for settings sidebar ──────────────────────────────────────────
  function tryInject() {
    // Settings sidebar has a scrollable list of items
    const sidebar = document.querySelector('[class*="sidebar-"] [class*="contentRegionScroller"], [class*="standardSidebarView"] [class*="sidebarRegionScroller"]');
    if (!sidebar) return;
    if (document.getElementById('bz-settings-divider')) return;

    // Add our section header + items after the last Discord item
    const list = sidebar.querySelector('[class*="itemsContainer"], [class*="defaultColor"]')?.parentElement || sidebar;

    // Divider
    const divider = document.createElement('div');
    divider.id = 'bz-settings-divider';
    divider.style.cssText = 'height:1px;background:#2e3035;margin:8px 0;';

    // Header label
    const header = document.createElement('div');
    header.style.cssText = 'padding:6px 10px 4px;font-size:11px;font-weight:700;color:#949cf7;text-transform:uppercase;letter-spacing:0.5px;';
    header.textContent = '⚡ BlasterZone';

    list.appendChild(divider);
    list.appendChild(header);

    // Menu items
    SECTIONS.forEach(section => {
      const item = document.createElement('div');
      item.id = 'bz-nav-' + section.id;
      item.role = 'listitem';
      item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:4px;cursor:pointer;color:#b5bac1;font-size:16px;font-weight:500;user-select:none;';
      item.innerHTML = \`<span style="font-size:16px">\${section.icon}</span><span>\${section.label}</span>\`;

      item.onmouseenter = () => { if (currentSection !== section.id) item.style.background = '#35373c'; };
      item.onmouseleave = () => { if (currentSection !== section.id) item.style.background = 'transparent'; };
      item.onclick = () => openSection(section.id, section.label);
      list.appendChild(item);
    });

    injected = true;
  }

  // ── Open a BZ settings section in the content area ────────────────────
  function openSection(id, label) {
    currentSection = id;
    // Highlight active
    SECTIONS.forEach(s => {
      const el = document.getElementById('bz-nav-' + s.id);
      if (el) {
        el.style.background = s.id === id ? '#5865f240' : 'transparent';
        el.style.color = s.id === id ? '#c9cdfb' : '#b5bac1';
      }
    });

    // Find the content area
    const content = document.querySelector('[class*="contentColumnDefault"], [class*="contentRegion"] > [class*="contentColumn"]');
    if (!content) return;

    // Save original content so we can restore on close
    if (!content._bzOrigHTML) {
      content._bzOrigHTML = content.innerHTML;
      content._bzOrigStyle = content.style.cssText;
    }

    content.innerHTML = renderSection(id);
    bindSectionEvents(id, content);
  }

  // ── Restore Discord's original settings on back ────────────────────────
  function restoreDiscordSettings() {
    const content = document.querySelector('[class*="contentColumnDefault"], [class*="contentRegion"] > [class*="contentColumn"]');
    if (content?._bzOrigHTML) {
      content.innerHTML = content._bzOrigHTML;
      content.style.cssText = content._bzOrigStyle;
      delete content._bzOrigHTML;
    }
    currentSection = null;
    SECTIONS.forEach(s => {
      const el = document.getElementById('bz-nav-' + s.id);
      if (el) { el.style.background = 'transparent'; el.style.color = '#b5bac1'; }
    });
  }

  // ── Render each section ────────────────────────────────────────────────
  function renderSection(id) {
    const base = \`
      <div style="padding:40px 40px 60px;max-width:740px;color:#dcddde;font-family:inherit;">
        <button id="bz-back-btn" style="background:none;border:none;color:#949cf7;cursor:pointer;font-size:13px;padding:0;margin-bottom:20px;display:flex;align-items:center;gap:4px;">
          ← Back to Discord Settings
        </button>
    \`;
    const close = \`</div>\`;

    if (id === 'bz-plugins')  return base + renderPlugins()  + close;
    if (id === 'bz-themes')   return base + renderThemes()   + close;
    if (id === 'bz-mixer')    return base + renderMixerPanel() + close;
    if (id === 'bz-about')    return base + renderAbout()    + close;
    return base + '<p>Coming soon</p>' + close;
  }

  function renderPlugins() {
    const pluginData = window.__BZ_PLUGINS__ || {};
    const enabledMap = (() => {
      try { return JSON.parse(localStorage.getItem('bz_plugins') || '{}'); } catch(e) { return {}; }
    })();

    const categories = {};
    for (const [id, p] of Object.entries(pluginData)) {
      const cat = p.category || 'Utility';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push({ id, ...p });
    }

    let html = \`
      <h2 style="font-size:20px;font-weight:800;color:#fff;margin:0 0 6px;">🧩 Plugins</h2>
      <p style="color:#949cf7;margin:0 0 24px;font-size:14px;">\${Object.keys(pluginData).length} plugins · \${Object.values(enabledMap).filter(Boolean).length} enabled</p>
    \`;

    for (const [cat, plugins] of Object.entries(categories)) {
      html += \`<h3 style="font-size:11px;font-weight:700;color:#949cf7;text-transform:uppercase;letter-spacing:0.5px;margin:20px 0 8px;">\${cat}</h3>\`;
      html += \`<div style="display:flex;flex-direction:column;gap:6px;">\`;
      for (const p of plugins) {
        const isOn = enabledMap[p.id] !== undefined ? enabledMap[p.id] : p.defaultEnabled;
        html += \`
          <div style="display:flex;align-items:center;background:#1e1f22;border-radius:8px;padding:12px 14px;gap:12px;">
            <div style="flex:1;">
              <div style="font-weight:700;color:#fff;font-size:14px;">\${p.name}</div>
              <div style="color:#949cf7;font-size:12px;margin-top:2px;">\${p.description}</div>
            </div>
            <label style="position:relative;display:inline-block;width:40px;height:22px;cursor:pointer;">
              <input type="checkbox" id="bz-plugin-\${p.id}" \${isOn ? 'checked' : ''} style="opacity:0;width:0;height:0;position:absolute;">
              <span style="position:absolute;inset:0;border-radius:11px;background:\${isOn ? '#23a55a' : '#4e5058'};transition:background 0.2s;" class="bz-toggle-track"></span>
              <span style="position:absolute;top:3px;\${isOn ? 'left:21px' : 'left:3px'};width:16px;height:16px;border-radius:50%;background:#fff;transition:left 0.2s;" class="bz-toggle-thumb"></span>
            </label>
          </div>
        \`;
      }
      html += \`</div>\`;
    }
    return html;
  }

  function renderThemes() {
    const pluginData = window.__BZ_PLUGINS__ || {};
    const themePlugins = Object.entries(pluginData).filter(([, p]) => p.category === 'Themes');
    const enabledMap = (() => {
      try { return JSON.parse(localStorage.getItem('bz_plugins') || '{}'); } catch(e) { return {}; }
    })();

    let html = \`
      <h2 style="font-size:20px;font-weight:800;color:#fff;margin:0 0 6px;">🎨 Themes</h2>
      <p style="color:#949cf7;margin:0 0 24px;font-size:14px;">Visual themes for Discord</p>
      <div style="display:flex;flex-direction:column;gap:8px;">
    \`;

    for (const [id, p] of themePlugins) {
      const isOn = enabledMap[id] !== undefined ? enabledMap[id] : p.defaultEnabled;
      html += \`
        <div style="display:flex;align-items:center;background:#1e1f22;border-radius:10px;padding:14px;gap:12px;">
          <div style="flex:1;">
            <div style="font-weight:700;color:#fff;font-size:15px;">\${p.name}</div>
            <div style="color:#949cf7;font-size:12px;margin-top:3px;">\${p.description}</div>
          </div>
          <label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;">
            <input type="checkbox" id="bz-plugin-\${id}" \${isOn ? 'checked' : ''} style="opacity:0;width:0;height:0;position:absolute;">
            <span style="position:absolute;inset:0;border-radius:12px;background:\${isOn ? '#949cf7' : '#4e5058'};transition:background 0.2s;"></span>
            <span style="position:absolute;top:4px;\${isOn ? 'left:23px' : 'left:4px'};width:16px;height:16px;border-radius:50%;background:#fff;transition:left 0.2s;"></span>
          </label>
        </div>
      \`;
    }
    html += \`</div>\`;
    return html;
  }

  function renderMixerPanel() {
    const gain = window.__BZ_GAIN__ || { masterGain: 100 };
    const reverb = window.__BZ_REVERB__ || 'None';
    return \`
      <h2 style="font-size:20px;font-weight:800;color:#fff;margin:0 0 6px;">🎚️ ツ Mixer</h2>
      <p style="color:#949cf7;margin:0 0 24px;font-size:14px;">ツcore v3.17.0 · Audio engine settings</p>
      <div style="background:#1e1f22;border-radius:10px;padding:16px;margin-bottom:10px;">
        <div style="color:#b5bac1;font-size:13px;margin-bottom:8px;">Current gain: <strong style="color:#23a55a">\${gain.masterGain}%</strong></div>
        <div style="color:#b5bac1;font-size:13px;">Reverb: <strong style="color:#949cf7">\${reverb}</strong></div>
      </div>
      <p style="color:#555;font-size:12px;">Use the ⚡ floating button in the Discord screen to adjust all mixer settings live.</p>
    \`;
  }

  function renderAbout() {
    return \`
      <div style="text-align:center;padding-top:20px;">
        <div style="font-size:48px;margin-bottom:12px;">⚡</div>
        <h1 style="font-size:24px;font-weight:900;color:#fff;margin:0 0 6px;">BlasterZone</h1>
        <div style="color:#949cf7;margin-bottom:20px;">v2.1.0 · Built different</div>
        <div style="display:inline-flex;flex-direction:column;gap:8px;text-align:left;background:#1e1f22;border-radius:10px;padding:16px 24px;min-width:260px;">
          <div style="color:#b5bac1;font-size:13px;">🧩 Plugins: <strong style="color:#fff">\${Object.keys(window.__BZ_PLUGINS__ || {}).length}</strong></div>
          <div style="color:#b5bac1;font-size:13px;">🎵 ツcore v3.17.0 embedded</div>
          <div style="color:#b5bac1;font-size:13px;">👻 Haunted Cavern: Perfect 👑</div>
          <div style="color:#b5bac1;font-size:13px;">🖥️ Desktop spoof: Active</div>
          <div style="color:#b5bac1;font-size:13px;">🔇 Fake Deafen: Ready</div>
        </div>
      </div>
    \`;
  }

  // ── Bind toggle events after rendering ────────────────────────────────
  function bindSectionEvents(id, content) {
    // Back button
    content.querySelector('#bz-back-btn')?.addEventListener('click', restoreDiscordSettings);

    // Plugin toggles
    content.querySelectorAll('input[id^="bz-plugin-"]').forEach(input => {
      input.addEventListener('change', () => {
        const pluginId = input.id.replace('bz-plugin-', '');
        const enabled = input.checked;
        // Save state
        try {
          const saved = JSON.parse(localStorage.getItem('bz_plugins') || '{}');
          saved[pluginId] = enabled;
          localStorage.setItem('bz_plugins', JSON.stringify(saved));
        } catch(e) {}
        // Apply/remove plugin
        if (enabled) {
          window.__BZ_APPLY_PLUGIN__ && window.__BZ_APPLY_PLUGIN__(pluginId);
        } else {
          window.__BZ_REMOVE_PLUGIN__ && window.__BZ_REMOVE_PLUGIN__(pluginId);
        }
        // Update toggle UI
        const track = input.parentElement.querySelector('.bz-toggle-track');
        const thumb = input.parentElement.querySelector('.bz-toggle-thumb');
        if (track) track.style.background = enabled ? '#23a55a' : '#4e5058';
        if (thumb) thumb.style.left = enabled ? '21px' : '3px';
        // Notify RN
        try { window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'PLUGIN_TOGGLE', plugin: pluginId, enabled })); } catch(e) {}
      });
    });
  }

  // ── MutationObserver: inject nav whenever settings opens ──────────────
  const settingsObs = new MutationObserver(() => {
    const inSettings = !!document.querySelector('[class*="standardSidebarView"], [class*="sidebar-"] [class*="contentRegionScroller"]');
    if (inSettings && !injected) tryInject();
    if (!inSettings) { injected = false; currentSection = null; }
  });
  settingsObs.observe(document.body, { childList: true, subtree: true });
  tryInject();

})();
`;
