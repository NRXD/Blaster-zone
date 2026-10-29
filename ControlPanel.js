import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Switch, Dimensions, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from './Slider';

const { height: SCREEN_H } = Dimensions.get('window');

// Tabs matching ツcore windows
const TABS = [
  { id: 'gain',    icon: '🔊', label: 'GAIN' },
  { id: 'effects', icon: '🌀', label: 'EFFECTS' },
  { id: 'eq',      icon: '🎚️', label: 'EQ' },
  { id: 'voice',   icon: '🎭', label: 'VOICE' },
  { id: 'music',   icon: '🎵', label: 'MUSIC' },
  { id: 'clean',   icon: '🧹', label: 'CLEAN' },
];

// Environment list (from ツcore EAX_LIST)
const EAX_ENVS = [
  'None','Auditorium','Ball Park','Bathroom','Cathedral','Chapel',
  'Church','Concert Hall','Garage','Haunted Cavern','Indoor Arena',
  'Jazz Club','Living Room','Opera House','Small Room','Theater',
  'Alley','Cave','Forest','Hallway','Hangar','Padded Cell',
  'Quarry','Sewer Pipe','Stone Corridor','Underwater'
];

// Voice changer presets
const VOICE_FX = [
  {id:'Normal',icon:'🙂'},{id:'Chipmunk',icon:'🐿️'},{id:'Kid',icon:'🧒'},
  {id:'Girl',icon:'👧'},{id:'Soft Girl',icon:'👩'},{id:'Man',icon:'🧔'},
  {id:'Deep Monster',icon:'👹'},{id:'Demon',icon:'😈'},{id:'Robot',icon:'🤖'},
  {id:'Alien',icon:'👽'},{id:'Telephone',icon:'📞'},{id:'Radio',icon:'📻'},
  {id:'Cave',icon:'🕳️'},{id:'Ghost',icon:'👻'},{id:'Megaphone',icon:'📢'},
  {id:'Weak',icon:'🥺'}
];

// EQ bands
const EQ_FREQS = ['31','62','125','250','500','1k','2k','4k','8k'];

export default function ControlPanel({ webviewRef, fakeDeafen, onToggleFakeDeafen, onClose }) {
  const [tab, setTab] = useState('gain');

  // Gain state
  const [masterGain, setMasterGain] = useState(100);
  const [gain2, setGain2] = useState(0);
  const [inputBoost, setInputBoost] = useState(100);
  const [pitch, setPitch] = useState(50);

  // Effects state
  const [reverbAmount, setReverbAmount] = useState(0);
  const [reverbDecay, setReverbDecay] = useState(2.5);
  const [eaxEnv, setEaxEnv] = useState('None');
  const [eaxAmount, setEaxAmount] = useState(0);
  const [megaReverb, setMegaReverb] = useState(false);
  const [tafleh, setTafleh] = useState(0);
  const [width, setWidth] = useState(0);

  // EQ state
  const [eqBands, setEqBands] = useState(Array(9).fill(0));
  const [eqLevel, setEqLevel] = useState(0);
  const [eqOn, setEqOn] = useState(true);

  // Voice state
  const [voiceFx, setVoiceFx] = useState('Normal');

  // Music state
  const [musicVolume, setMusicVolume] = useState(120);
  const [musicReverb, setMusicReverb] = useState(70);

  // Clean state
  const [cleanVoice, setCleanVoice] = useState(true);
  const [micOnly, setMicOnly] = useState(false);
  const [noiseReduce, setNoiseReduce] = useState(0);
  const [gateThreshold, setGateThreshold] = useState(-60);

  // God mode
  const [godMode, setGodMode] = useState(false);

  // ─── Inject a ツcore parameter update ─────────────────────────────────
  const injectParam = useCallback((key, value) => {
    webviewRef.current?.injectJavaScript(`
      (function(){
        try{
          if(window.PARAMS){window.PARAMS['${key}']=${JSON.stringify(value)};
          if(window.__n7rApply)window.__n7rApply();}
          // Also try the live controls via custom event
          document.dispatchEvent(new CustomEvent('n7r_set',{detail:{k:'${key}',v:${JSON.stringify(value)}}}));
        }catch(e){}
        true;
      })();
    `);
  }, [webviewRef]);

  // Open a ツcore window from the native overlay
  const openUcoreWindow = useCallback((winId) => {
    webviewRef.current?.injectJavaScript(`
      (function(){
        try{if(window.__N7R_UI&&window.__N7R_UI.open)window.__N7R_UI.open('${winId}');}catch(e){}
        true;
      })();
    `);
  }, [webviewRef]);

  // Apply EQ band
  const setEqBand = useCallback((idx, val) => {
    const next = [...eqBands];
    next[idx] = val;
    setEqBands(next);
    webviewRef.current?.injectJavaScript(`
      (function(){
        try{
          if(window.PARAMS){window.PARAMS.eqBands[${idx}]=${val};}
          document.dispatchEvent(new CustomEvent('n7r_set',{detail:{k:'eqBand',idx:${idx},v:${val}}}));
        }catch(e){}
        true;
      })();
    `);
  }, [eqBands, webviewRef]);

  // Apply voice FX preset
  const applyVoiceFx = useCallback((name) => {
    setVoiceFx(name);
    webviewRef.current?.injectJavaScript(`
      (function(){
        try{
          const FX=${JSON.stringify(VOICE_FX_MAP)};
          const fx=FX['${name}'];
          if(!fx||!window.PARAMS)return;
          Object.assign(window.PARAMS,{...FX['Normal'],...fx});
          if(window.__n7rApply)window.__n7rApply();
        }catch(e){}
        true;
      })();
    `);
  }, [webviewRef]);

  // ─── Render tabs ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.root} edges={['top','bottom']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>💥 BlasterZone</Text>
          <Text style={s.headerSub}>ツcore · Full Power</Text>
        </View>
        <TouchableOpacity style={s.closeBtn} onPress={onClose}>
          <Text style={s.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Quick toggles */}
      <View style={s.quickRow}>
        <QuickToggle
          icon={fakeDeafen ? '🔇' : '🎧'}
          label="Fake Deaf"
          value={fakeDeafen}
          onPress={onToggleFakeDeafen}
        />
        <QuickToggle
          icon="👑"
          label="God Mode"
          value={godMode}
          onPress={() => {
            const next = !godMode;
            setGodMode(next);
            injectParam('godMode', next);
          }}
        />
        <QuickToggle
          icon="🔮"
          label="Mega Rev"
          value={megaReverb}
          onPress={() => {
            const next = !megaReverb;
            setMegaReverb(next);
            injectParam('megaReverb', next);
          }}
        />
        <TouchableOpacity style={s.quickBtn} onPress={() => openUcoreWindow('effects')}>
          <Text style={s.quickIcon}>🖥️</Text>
          <Text style={s.quickLabel}>Full UI</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[s.tabBtn, tab === t.id && s.tabBtnActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={s.tabIcon}>{t.icon}</Text>
            <Text style={[s.tabLabel, tab === t.id && s.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab content */}
      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {tab === 'gain' && (
          <View>
            <SectionTitle>Master Gain</SectionTitle>
            <SliderRow
              label="Master" value={masterGain} min={0} max={600}
              unit="%" color="#7c3aed"
              onChange={v => { setMasterGain(v); injectParam('masterGain', v); }}
            />
            <SliderRow
              label="Gain 2" value={gain2} min={0} max={600}
              unit="%" color="#a855f7"
              onChange={v => { setGain2(v); injectParam('gain2', v); }}
            />
            <SliderRow
              label="Input Boost" value={inputBoost} min={0} max={600}
              unit="%" color="#6366f1"
              onChange={v => { setInputBoost(v); injectParam('inputBoost', v); }}
            />
            <SliderRow
              label="Pitch" value={pitch} min={0} max={100}
              unit="" color="#06b6d4"
              onChange={v => { setPitch(v); injectParam('pitch', v); }}
            />
            <View style={s.presetRow}>
              {['Default','Loud','Max','Clear','ULTRA','REVERB'].map(p => (
                <TouchableOpacity
                  key={p}
                  style={s.presetBtn}
                  onPress={() => {
                    webviewRef.current?.injectJavaScript(`
                      (function(){
                        try{
                          const P=${JSON.stringify(PRESETS)};
                          const pre=P['${p}'];
                          if(!pre||!window.PARAMS)return;
                          Object.assign(window.PARAMS,pre);
                          if(window.__n7rApply)window.__n7rApply();
                        }catch(e){}
                        true;
                      })();
                    `);
                  }}
                >
                  <Text style={s.presetText}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {tab === 'effects' && (
          <View>
            <SectionTitle>Reverb</SectionTitle>
            <SliderRow
              label="Reverb Send" value={reverbAmount} min={0} max={100}
              unit="%" color="#0ea5e9"
              onChange={v => { setReverbAmount(v); injectParam('reverb', v); }}
            />
            <SliderRow
              label="Decay" value={reverbDecay} min={0.1} max={20} step={0.1}
              unit="s" color="#38bdf8"
              onChange={v => { setReverbDecay(v); injectParam('reverbDecay', v); }}
            />
            <SliderRow
              label="تفله (Tafleh)" value={tafleh} min={0} max={100}
              unit="%" color="#f59e0b"
              onChange={v => { setTafleh(v); injectParam('tafleh', v); }}
            />
            <SliderRow
              label="Stereo Width" value={width} min={0} max={100}
              unit="%" color="#8b5cf6"
              onChange={v => { setWidth(v); injectParam('width', v); }}
            />

            <SectionTitle>Environment (EAX)</SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.envScroll}>
              {EAX_ENVS.map(env => (
                <TouchableOpacity
                  key={env}
                  style={[s.envChip, eaxEnv === env && s.envChipActive]}
                  onPress={() => {
                    setEaxEnv(env);
                    injectParam('eaxEnv', env);
                    injectParam('eaxOn', env !== 'None');
                  }}
                >
                  <Text style={[s.envText, eaxEnv === env && s.envTextActive]}>{env}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <SliderRow
              label="Effects Amount" value={eaxAmount} min={0} max={100}
              unit="%" color="#10b981"
              onChange={v => { setEaxAmount(v); injectParam('eaxAmount', v); }}
            />
          </View>
        )}

        {tab === 'eq' && (
          <View>
            <View style={s.eqToggleRow}>
              <Text style={s.sectionTitle}>9-Band Graphic EQ</Text>
              <Switch
                value={eqOn}
                onValueChange={v => { setEqOn(v); injectParam('eqOn', v); }}
                trackColor={{ false: '#2d2d3d', true: '#7c3aed' }}
                thumbColor="#fff"
              />
            </View>
            <View style={s.eqBandRow}>
              {EQ_FREQS.map((freq, i) => (
                <View key={freq} style={s.eqBandCol}>
                  <Text style={s.eqValue}>{eqBands[i] > 0 ? '+' : ''}{eqBands[i]}</Text>
                  <Slider
                    vertical
                    value={eqBands[i]}
                    min={-24} max={24} step={1}
                    color={eqBands[i] > 0 ? '#7c3aed' : eqBands[i] < 0 ? '#ef4444' : '#374151'}
                    onChange={v => setEqBand(i, v)}
                    style={s.eqSlider}
                  />
                  <Text style={s.eqFreq}>{freq}</Text>
                </View>
              ))}
            </View>
            <SliderRow
              label="Level" value={eqLevel} min={-24} max={24}
              unit="dB" color="#f59e0b"
              onChange={v => { setEqLevel(v); injectParam('eqLevel', v); }}
            />
            <View style={s.presetRow}>
              {['Default','Bass Boost','Vocal Booster','MAX POWER','ULTRA BASS','ULTRA VOICE','Rock','Pop'].map(p => (
                <TouchableOpacity
                  key={p} style={s.presetBtn}
                  onPress={() => {
                    webviewRef.current?.injectJavaScript(`
                      (function(){
                        try{
                          const P=${JSON.stringify(EQ_PRESETS)};
                          const b=P['${p}'];
                          if(!b||!window.PARAMS)return;
                          window.PARAMS.eqBands=b.slice();
                          if(window.__n7rApply)window.__n7rApply();
                        }catch(e){}
                        true;
                      })();
                    `);
                  }}
                >
                  <Text style={s.presetText}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {tab === 'voice' && (
          <View>
            <SectionTitle>Voice Changer</SectionTitle>
            <View style={s.voiceGrid}>
              {VOICE_FX.map(v => (
                <TouchableOpacity
                  key={v.id}
                  style={[s.voiceChip, voiceFx === v.id && s.voiceChipActive]}
                  onPress={() => applyVoiceFx(v.id)}
                >
                  <Text style={s.voiceIcon}>{v.icon}</Text>
                  <Text style={[s.voiceLabel, voiceFx === v.id && s.voiceLabelActive]}>
                    {v.id}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {tab === 'music' && (
          <View>
            <SectionTitle>Music</SectionTitle>
            <SliderRow
              label="Music Volume" value={musicVolume} min={0} max={800}
              unit="%" color="#10b981"
              onChange={v => { setMusicVolume(v); injectParam('musicVolume', v / 100); }}
            />
            <SliderRow
              label="Music Reverb" value={musicReverb} min={0} max={100}
              unit="%" color="#06b6d4"
              onChange={v => { setMusicReverb(v); injectParam('musicReverb', v); }}
            />
            <TouchableOpacity
              style={s.bigBtn}
              onPress={() => openUcoreWindow('songs')}
            >
              <Text style={s.bigBtnText}>🎵 Open Song Player</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === 'clean' && (
          <View>
            <SectionTitle>Clean Up</SectionTitle>
            <ToggleRow
              label="Clean Voice (80Hz HPF + noise suppress)"
              value={cleanVoice}
              onChange={v => { setCleanVoice(v); injectParam('cleanVoice', v); }}
            />
            <ToggleRow
              label="Mic Only (gate everything except voice)"
              value={micOnly}
              onChange={v => { setMicOnly(v); injectParam('micOnly', v); }}
            />
            <SliderRow
              label="Noise Reduce" value={noiseReduce} min={0} max={100}
              unit="%" color="#6366f1"
              onChange={v => { setNoiseReduce(v); injectParam('noiseReduction', v); }}
            />
            <SliderRow
              label="Gate Threshold" value={gateThreshold} min={-80} max={0}
              unit="dB" color="#ef4444"
              onChange={v => { setGateThreshold(v); injectParam('gateThreshold', v); }}
            />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return <Text style={s.sectionTitle}>{children}</Text>;
}

function SliderRow({ label, value, min, max, step = 1, unit, color, onChange }) {
  return (
    <View style={s.sliderRow}>
      <View style={s.sliderLabelRow}>
        <Text style={s.sliderLabel}>{label}</Text>
        <Text style={[s.sliderValue, { color }]}>{typeof value === 'number' ? (step < 1 ? value.toFixed(1) : Math.round(value)) : value}{unit}</Text>
      </View>
      <Slider
        value={value} min={min} max={max} step={step}
        color={color} onChange={onChange}
      />
    </View>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <View style={s.toggleRow}>
      <Text style={s.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#2d2d3d', true: '#7c3aed' }}
        thumbColor="#fff"
      />
    </View>
  );
}

function QuickToggle({ icon, label, value, onPress }) {
  return (
    <TouchableOpacity
      style={[s.quickBtn, value && s.quickBtnActive]}
      onPress={onPress}
    >
      <Text style={s.quickIcon}>{icon}</Text>
      <Text style={[s.quickLabel, value && s.quickLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// Preset data (subset, matches ツcore)
const PRESETS = {
  Default: { masterGain:100, gain2:0, gain3:0, inputBoost:100, eqBass:50, eqMid:50, eqTreble:50, gateThreshold:-60, noiseReduction:0, distortion:0, reverb:0, width:0, pan:0, airAmount:0, reverbDecay:2.5 },
  Loud:    { masterGain:280, gain2:80, gain3:0, inputBoost:280, eqBass:68, eqMid:58, eqTreble:68, gateThreshold:-60, noiseReduction:0, distortion:0, reverb:0, width:0, pan:0, airAmount:20, reverbDecay:2.5 },
  Max:     { masterGain:400, gain2:300, gain3:200, inputBoost:400, eqBass:85, eqMid:70, eqTreble:85, gateThreshold:-50, noiseReduction:20, distortion:45, reverb:22, width:20, pan:0, airAmount:35, reverbDecay:2.2 },
  Clear:   { masterGain:300, gain2:0, gain3:0, inputBoost:300, eqBass:42, eqMid:85, eqTreble:88, gateThreshold:-60, noiseReduction:0, distortion:0, reverb:0, width:0, pan:0, airAmount:10, reverbDecay:2.5 },
  ULTRA:   { masterGain:500, gain2:400, gain3:300, inputBoost:500, eqBass:75, eqMid:65, eqTreble:80, gateThreshold:-50, noiseReduction:25, distortion:30, reverb:45, width:30, pan:0, airAmount:50, reverbDecay:3.5 },
  REVERB:  { masterGain:200, gain2:100, gain3:0, inputBoost:200, eqBass:55, eqMid:55, eqTreble:60, gateThreshold:-60, noiseReduction:0, distortion:0, reverb:100, width:40, pan:0, airAmount:30, reverbDecay:8.0 }
};

const EQ_PRESETS = {
  Default:       [0,0,0,0,0,0,0,0,0],
  'Bass Boost':  [8,7,5,3,1,0,0,0,0],
  'Vocal Booster': [-2,-3,-3,1,4,4,3,1,0],
  'MAX POWER':   [20,18,12,8,8,12,16,20,18],
  'ULTRA BASS':  [24,24,20,12,4,0,0,0,0],
  'ULTRA VOICE': [-12,-8,0,8,14,18,20,16,10],
  Rock:          [5,4,3,1,-1,-2,0,2,3],
  Pop:           [-1,2,4,5,3,0,-1,-1,-2]
};

// Voice FX map for injection
const VOICE_FX_MAP = {
  Normal:       {},
  Chipmunk:     { pitch:80, eqBass:35, eqTreble:68, airAmount:25 },
  Kid:          { pitch:68, eqBass:42, eqTreble:60 },
  Girl:         { pitch:58, eqBass:32, eqMid:58, eqTreble:64, airAmount:30, reverb:6, reverbDecay:1.2 },
  'Soft Girl':  { pitch:55, eqBass:30, eqMid:55, eqTreble:60, airAmount:42, reverb:10, reverbDecay:1.6, width:12 },
  Man:          { pitch:38, eqBass:68, eqTreble:42 },
  'Deep Monster':{ pitch:20, eqBass:88, eqTreble:30, distortion:25, reverb:15, reverbDecay:3 },
  Demon:        { pitch:12, eqBass:92, eqMid:60, eqTreble:35, distortion:45, reverb:30, reverbDecay:4.5, width:25 },
  Robot:        { pitch:46, eqMid:62, eqTreble:60, distortion:22, autotuneOn:true, autotuneSpeed:1 },
  Alien:        { pitch:68, eqTreble:62, distortion:10, reverb:35, reverbDecay:3.5, width:60, autotuneOn:true, autotuneSpeed:0.6 },
  Telephone:    { eqBass:8, eqMid:88, eqTreble:18, distortion:15 },
  Radio:        { eqBass:22, eqMid:80, eqTreble:40, distortion:12, reverb:8 },
  Cave:         { reverb:75, reverbDecay:7, width:45, eqBass:58 },
  Ghost:        { pitch:40, eqTreble:62, reverb:80, reverbDecay:9, width:70, airAmount:50 },
  Megaphone:    { eqBass:20, eqMid:90, eqTreble:55, distortion:35 },
  Weak:         { pitch:54, eqBass:22, eqMid:44, eqTreble:58, airAmount:48, reverb:8, reverbDecay:1.4, width:8 }
};

// ─── Styles ───────────────────────────────────────────────────────────────
const ACCENT = '#7c3aed';
const BG = '#0a0a0f';
const CARD = '#0f0f18';
const BORDER = '#1e1e30';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  headerSub: { fontSize: 11, color: '#555', marginTop: 2 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER
  },
  closeIcon: { color: '#888', fontSize: 16, fontWeight: '600' },

  quickRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8,
    gap: 8, borderBottomWidth: 1, borderBottomColor: BORDER
  },
  quickBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER
  },
  quickBtnActive: { backgroundColor: '#1a0030', borderColor: ACCENT },
  quickIcon: { fontSize: 18, marginBottom: 2 },
  quickLabel: { fontSize: 9, color: '#666', fontWeight: '700', letterSpacing: 0.5 },
  quickLabelActive: { color: '#c084fc' },

  tabBar: {
    borderBottomWidth: 1, borderBottomColor: BORDER,
    flexGrow: 0
  },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent'
  },
  tabBtnActive: { borderBottomColor: ACCENT },
  tabIcon: { fontSize: 14 },
  tabLabel: { fontSize: 11, color: '#555', fontWeight: '700', letterSpacing: 0.5 },
  tabLabelActive: { color: '#c084fc' },

  content: { flex: 1, padding: 16 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#555',
    letterSpacing: 1.5, textTransform: 'uppercase',
    marginBottom: 12, marginTop: 4
  },
  eqToggleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12
  },

  sliderRow: { marginBottom: 20 },
  sliderLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sliderLabel: { fontSize: 13, color: '#aaa', fontWeight: '600' },
  sliderValue: { fontSize: 13, fontWeight: '700' },

  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER
  },
  toggleLabel: { fontSize: 13, color: '#aaa', flex: 1, paddingRight: 8 },

  eqBandRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12, height: 160
  },
  eqBandCol: {
    flex: 1, alignItems: 'center', justifyContent: 'space-between'
  },
  eqSlider: { flex: 1 },
  eqValue: { fontSize: 9, color: '#666', marginBottom: 4 },
  eqFreq: { fontSize: 9, color: '#555', marginTop: 4 },

  voiceGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8
  },
  voiceChip: {
    width: '30%', alignItems: 'center', paddingVertical: 12,
    backgroundColor: CARD, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER
  },
  voiceChipActive: {
    backgroundColor: '#1a0030', borderColor: ACCENT
  },
  voiceIcon: { fontSize: 24, marginBottom: 4 },
  voiceLabel: { fontSize: 10, color: '#666', fontWeight: '700', textAlign: 'center' },
  voiceLabelActive: { color: '#c084fc' },

  envScroll: { marginBottom: 12 },
  envChip: {
    paddingHorizontal: 12, paddingVertical: 8, marginRight: 8,
    backgroundColor: CARD, borderRadius: 8,
    borderWidth: 1, borderColor: BORDER
  },
  envChipActive: { backgroundColor: '#002030', borderColor: '#06b6d4' },
  envText: { fontSize: 12, color: '#666' },
  envTextActive: { color: '#06b6d4', fontWeight: '700' },

  presetRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8
  },
  presetBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: CARD, borderRadius: 8,
    borderWidth: 1, borderColor: BORDER
  },
  presetText: { fontSize: 12, color: '#888', fontWeight: '600' },

  bigBtn: {
    backgroundColor: CARD, borderRadius: 14, padding: 18,
    alignItems: 'center', borderWidth: 1, borderColor: BORDER,
    marginTop: 12
  },
  bigBtnText: { color: '#ccc', fontSize: 15, fontWeight: '700' }
});
