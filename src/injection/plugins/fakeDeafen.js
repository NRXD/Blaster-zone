// BlasterZone Plugin: Fake Deafen
// Injects a real button into Discord's voice bottom bar — right next to the deafen button
// When enabled: you appear deafened to others, but you still hear everything

export const FakeDeafenPlugin = `
(function bzFakeDeafen() {
  'use strict';

  let fakeDeafEnabled = false;
  let fakeMuteEnabled = false;
  let btnEl = null;

  // ── WebSocket intercept for VOICE_STATE_UPDATE ──────────────────────────
  const _origWSSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function(data) {
    try {
      const msg = JSON.parse(data);
      if (msg.op === 4 && msg.d != null) {
        if (fakeDeafEnabled) {
          msg.d.self_deaf = true;
          if (fakeMuteEnabled) msg.d.self_mute = true;
          data = JSON.stringify(msg);
        }
      }
    } catch(e) {}
    return _origWSSend.call(this, data);
  };

  // ── Inject button into voice bar ────────────────────────────────────────
  function injectButton() {
    // Don't inject twice
    if (document.getElementById('bz-fake-deafen-btn')) return;

    // Find the voice controls bar — Discord renders it at the bottom left
    // Try multiple selectors across Discord versions
    const voiceBar = document.querySelector(
      '[class*="actionButtons"],[class*="voiceActions"],[class*="connection"] [class*="buttons"]'
    );
    if (!voiceBar) return;

    // Find the real deafen button to insert next to it
    const deafenBtn = voiceBar.querySelector('[aria-label*="eafen"],[class*="deafen"]');
    const insertAfter = deafenBtn || voiceBar.lastElementChild;

    const btn = document.createElement('button');
    btn.id = 'bz-fake-deafen-btn';
    btn.title = 'Fake Deafen (BlasterZone)';
    btn.innerHTML = \`
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C8.13 2 5 5.13 5 9v5l-2 2v1h18v-1l-2-2V9c0-3.87-3.13-7-7-7z" fill="currentColor" opacity="0.3"/>
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2z" fill="currentColor"/>
        <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    \`;

    Object.assign(btn.style, {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '8px',
      borderRadius: '50%',
      color: '#b5bac1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      transition: 'background 0.15s, color 0.15s',
    });

    btn.onmouseenter = () => { if (!fakeDeafEnabled) btn.style.background = '#35373c'; };
    btn.onmouseleave = () => { if (!fakeDeafEnabled) btn.style.background = 'none'; };

    btn.onclick = () => {
      fakeDeafEnabled = !fakeDeafEnabled;
      updateBtn();
      // Notify RN side
      try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'FAKE_DEAFEN_TOGGLE', value: fakeDeafEnabled })); } catch(e) {}
      // Trigger a voice state update so Discord sends op 4 and we intercept it
      triggerVoiceStateUpdate();
    };

    // Right-click toggles fake mute
    btn.oncontextmenu = (e) => {
      e.preventDefault();
      if (!fakeDeafEnabled) return;
      fakeMuteEnabled = !fakeMuteEnabled;
      updateBtn();
    };

    insertAfter ? insertAfter.parentNode.insertBefore(btn, insertAfter.nextSibling) : voiceBar.appendChild(btn);
    btnEl = btn;
  }

  function updateBtn() {
    if (!btnEl) return;
    if (fakeDeafEnabled) {
      btnEl.style.background = '#ed4245';
      btnEl.style.color = '#fff';
      btnEl.title = fakeMuteEnabled
        ? 'Fake Deafen + Fake Mute ON — right-click to toggle mute'
        : 'Fake Deafen ON — right-click to add fake mute';
    } else {
      btnEl.style.background = 'none';
      btnEl.style.color = '#b5bac1';
      btnEl.title = 'Fake Deafen (BlasterZone)';
    }
  }

  function triggerVoiceStateUpdate() {
    // Click the real deafen button twice to make Discord send a fresh op 4
    // which we then intercept and patch
    const deafBtn = document.querySelector('[aria-label*="eafen"],[class*="deafen"]');
    if (deafBtn) {
      deafBtn.click();
      setTimeout(() => deafBtn.click(), 100);
    }
  }

  // ── Expose API ──────────────────────────────────────────────────────────
  window.__BZ_FAKE_DEAFEN_API__ = {
    setEnabled(v) { fakeDeafEnabled = v; updateBtn(); },
    setMute(v) { fakeMuteEnabled = v; updateBtn(); },
    isEnabled() { return fakeDeafEnabled; },
  };

  // ── Observer: inject button whenever Discord renders the voice bar ──────
  const obs = new MutationObserver(() => injectButton());
  obs.observe(document.body, { childList: true, subtree: true });
  // Try immediately too
  injectButton();
  setTimeout(injectButton, 2000);
  setTimeout(injectButton, 5000);
})();
`;
