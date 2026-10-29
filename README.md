# 💥 BlasterZone

Discord on iOS with full **ツcore v3.17.0** audio engine, fake deafen, token login, and desktop client spoof.

---

## Features

| Feature | What it does |
|---|---|
| **ツcore Full Engine** | All 4335 lines injected: EAX reverb, 9-band EQ, voice changer (16 presets), gain stack 600%, God Mode, تفله, CMSS 3D, THX, Surround Mixer, Songs player |
| **Fake Deafen** | Sends `self_deaf: true` to Discord — you look deafened, you hear everything |
| **Token Login** | Skip login screen entirely, paste your token |
| **Desktop Spoof** | Shows as Discord Windows Desktop client — no mobile badge |
| **In-App Mixer** | Gain, Effects, EQ, Voice, Music, Clean-up tabs all from inside the app |

---

## Setup

### Quick start (Expo Go — easiest)
```bash
npm install
npx expo start
```
Scan QR with Expo Go on your iPhone.

### Build IPA (no App Store needed, sideload)
```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile preview
```
This builds a .ipa you can install via AltStore or SideStore.

---

## How to get your Discord token

1. Open **Discord** in a browser (Chrome, not the app)
2. Press **F12** → **Console** tab
3. Paste this and hit Enter:
```js
window.webpackChunkdiscord_app.push([[Math.random()],{},req=>{for(const m of Object.keys(req.c).map(x=>req.c[x]).filter(x=>x?.exports?.default?.getToken))copy(m.exports.default.getToken())}]);
```
4. Your token is now in your clipboard — paste it in BlasterZone.

> ⚠ Never share your token. BlasterZone stores it encrypted on device only.

---

## Reverb fix (v3.17.0)

The reverb defaulted to `eaxEnv: 'None'` and `reverb: 0` — meaning it's **OFF by default**.  
Turn it on from the EFFECTS tab in the mixer. Haunted Cavern at 100% = max reverb.  
The EAX IR builder from the DLL data is intact and unmodified.

---

## File structure

```
App.js                          — entry, navigation, token check
src/
  screens/
    TokenLoginScreen.js         — token login UI
    DiscordScreen.js            — WebView + injection + float bar
  components/
    ControlPanel.js             — mixer panel (all tabs)
    Slider.js                   — custom slider
  injection/
    ucore_injector.js           — ツcore v3.17.0 raw source
    ucore.js                    — AUTO-GENERATED embedded string
    scripts.js                  — bridge exports
scripts/
  embed-ucore.js                — build tool: embeds ucore as string
```

---

## Credits

ツcore by ツ / __518_ — C0za  
BlasterZone wrapper by NRXD
