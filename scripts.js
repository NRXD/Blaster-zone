// Bridge script — exported as a string for WebView injection.
// This is the desktop spoof + token login + fake deafen bridge.
export const BRIDGE_SCRIPT = `
(function(){
  if(window.__BZ_BRIDGE_LOADED__)return;
  window.__BZ_BRIDGE_LOADED__=true;
  // Desktop spoof happens in the main injection (DiscordScreen.js)
  // This file is a placeholder for any additional bridge logic.
  // The full bridge is inlined in buildScript() in DiscordScreen.js.
})();
`;
