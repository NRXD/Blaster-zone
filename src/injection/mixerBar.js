// BlasterZone ツ Mixer Bar
// Small fixed bar at the top of Discord — shows gain/reverb status
// Tap to expand quick controls. Enable/disable via Plugins tab.

export const MIXER_BAR_JS = `
(function bzMixerBar() {
  'use strict';

  let barEl = null;
  let expanded = false;

  const GAIN_LABELS = {
    100: 'Off', 200: 'Mild', 450: 'Loud', 800: 'Max',
    1200: 'Ultra', 500: 'Monster', 700: '⚡ GOD',
  };

  function getGainLabel() {
    const g = window.__BZ_GAIN__?.masterGain || 100;
    return GAIN_LABELS[g] || g + '%';
  }

  function createBar() {
    if (document.getElementById('bz-mixer-bar')) return;

    const bar = document.createElement('div');
    bar.id = 'bz-mixer-bar';
    bar.style.cssText = \`
      position: fixed;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99999;
      background: #1e1f22ee;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-radius: 0 0 12px 12px;
      border: 1px solid #35373c;
      border-top: none;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 16px;
      cursor: pointer;
      font-size: 12px;
      color: #b5bac1;
      font-family: inherit;
      user-select: none;
      transition: all 0.2s;
      min-width: 180px;
      justify-content: center;
    \`;

    bar.innerHTML = getBarContent();
    bar.onclick = toggleExpand;
    document.body.appendChild(bar);
    barEl = bar;

    // Update every second
    setInterval(updateBar, 1000);
  }

  function getBarContent() {
    const gainLabel = getGainLabel();
    const reverb = window.__BZ_REVERB__ || 'None';
    const deafen = window.__BZ_FAKE_DEAFEN__ ? '🔇' : '';
    return \`
      <span style="color:#949cf7;font-weight:700;font-size:11px;">ツ</span>
      <span>🔊 <strong style="color:\${gainLabel === 'Off' ? '#b5bac1' : '#23a55a'}">\${gainLabel}</strong></span>
      \${reverb !== 'None' ? \`<span>🎵 <strong style="color:#949cf7">\${reverb}</strong></span>\` : ''}
      \${deafen ? \`<span>\${deafen}</span>\` : ''}
      <span style="color:#555;font-size:10px;">\${expanded ? '▲' : '▼'}</span>
    \`;
  }

  function updateBar() {
    if (barEl) barEl.innerHTML = getBarContent();
  }

  function toggleExpand() {
    expanded = !expanded;
    updateBar();
    if (expanded) showQuickPanel(); else hideQuickPanel();
  }

  function showQuickPanel() {
    let panel = document.getElementById('bz-mixer-panel');
    if (panel) { panel.style.display = 'flex'; return; }

    panel = document.createElement('div');
    panel.id = 'bz-mixer-panel';
    panel.style.cssText = \`
      position: fixed;
      top: 36px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99998;
      background: #1e1f22;
      border: 1px solid #35373c;
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 260px;
      font-family: inherit;
      font-size: 13px;
      color: #dcddde;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    \`;

    panel.innerHTML = \`
      <div style="font-weight:800;color:#fff;margin-bottom:4px;font-size:14px;">ツ Mixer</div>

      <div style="font-size:11px;color:#949cf7;font-weight:700;text-transform:uppercase;margin-bottom:2px;">Gain</div>
      <div id="bz-gain-btns" style="display:flex;flex-wrap:wrap;gap:4px;">
        \${[['OFF',100,'#555'],['MILD',200,'#22c55e'],['LOUD',450,'#84cc16'],
           ['MAX',800,'#eab308'],['ULTRA',1200,'#f97316'],['GOD',700,'#949cf7']]
          .map(([label, val, color]) => \`
            <button data-gain="\${val}" style="background:\${(window.__BZ_GAIN__?.masterGain||100)===val?color+'33':'#2b2d31'};
              border:1.5px solid \${(window.__BZ_GAIN__?.masterGain||100)===val?color:'#35373c'};
              color:\${(window.__BZ_GAIN__?.masterGain||100)===val?color:'#b5bac1'};
              border-radius:6px;padding:4px 8px;cursor:pointer;font-size:12px;font-weight:700;">\${label}</button>
          \`).join('')}
      </div>

      <div style="font-size:11px;color:#949cf7;font-weight:700;text-transform:uppercase;margin-bottom:2px;margin-top:4px;">Reverb</div>
      <select id="bz-reverb-select" style="background:#2b2d31;border:1px solid #35373c;color:#dcddde;border-radius:6px;padding:6px 8px;font-size:13px;width:100%;">
        \${['None','Small Room','Large Room','Cathedral','Haunted Cavern','Underwater','Concert Hall']
          .map(r => \`<option value="\${r}" \${(window.__BZ_REVERB__||'None')===r?'selected':''}>\${r==='Haunted Cavern'?'👻 '+r:r}</option>\`)
          .join('')}
      </select>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;">
        <span style="font-size:13px;">🔇 Fake Deafen</span>
        <label style="position:relative;display:inline-block;width:40px;height:22px;cursor:pointer;">
          <input type="checkbox" id="bz-quick-deafen" \${window.__BZ_FAKE_DEAFEN__ ? 'checked' : ''} style="opacity:0;position:absolute;">
          <span id="bz-qd-track" style="position:absolute;inset:0;border-radius:11px;background:\${window.__BZ_FAKE_DEAFEN__ ? '#ed4245' : '#4e5058'};transition:background 0.15s;"></span>
          <span id="bz-qd-thumb" style="position:absolute;top:3px;\${window.__BZ_FAKE_DEAFEN__ ? 'left:21px' : 'left:3px'};width:16px;height:16px;border-radius:50%;background:#fff;transition:left 0.15s;"></span>
        </label>
      </div>
    \`;

    document.body.appendChild(panel);

    // Bind gain buttons
    panel.querySelectorAll('[data-gain]').forEach(btn => {
      btn.onclick = () => {
        const val = parseInt(btn.dataset.gain);
        // Find preset key matching this value
        const presetMap = {100:'OFF',200:'MILD',450:'LOUD',800:'MAX',1200:'ULTRA',500:'MONSTER',700:'GOD'};
        const preset = presetMap[val] || 'OFF';
        window.__BZ_API__?.setGain(preset);
        setTimeout(updateBar, 100);
        // Refresh panel
        panel.remove();
        expanded = true;
        showQuickPanel();
        try { window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'GAIN_CHANGE', preset })); } catch(e) {}
      };
    });

    // Bind reverb select
    panel.querySelector('#bz-reverb-select').onchange = (e) => {
      window.__BZ_API__?.setReverb(e.target.value);
      updateBar();
      try { window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'REVERB_CHANGE', room: e.target.value })); } catch(e) {}
    };

    // Bind fake deafen toggle
    const qdInput = panel.querySelector('#bz-quick-deafen');
    qdInput.onchange = () => {
      const val = qdInput.checked;
      window.__BZ_FAKE_DEAFEN__ = val;
      window.__BZ_API__?.setFakeDeafen(val);
      panel.querySelector('#bz-qd-track').style.background = val ? '#ed4245' : '#4e5058';
      panel.querySelector('#bz-qd-thumb').style.left = val ? '21px' : '3px';
      updateBar();
      try { window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'FAKE_DEAFEN_TOGGLE', value: val })); } catch(e) {}
    };

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function closePanel(e) {
        if (!panel.contains(e.target) && e.target !== barEl) {
          hideQuickPanel();
          document.removeEventListener('click', closePanel);
        }
      });
    }, 100);
  }

  function hideQuickPanel() {
    expanded = false;
    document.getElementById('bz-mixer-panel')?.remove();
    updateBar();
  }

  // ── Show/hide based on plugin state ────────────────────────────────────
  window.__BZ_MIXER_BAR__ = {
    show() { createBar(); },
    hide() { barEl?.remove(); barEl = null; document.getElementById('bz-mixer-panel')?.remove(); },
  };

  // Start if plugin is enabled
  const plugins = (() => { try { return JSON.parse(localStorage.getItem('bz_plugins') || '{}'); } catch(e) { return {}; } })();
  const mixerOn = plugins.TsuMixer !== undefined ? plugins.TsuMixer : true;
  if (mixerOn) createBar();

})();
`;
