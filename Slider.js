/**
 * Custom slider component.
 * React Native's built-in Slider was moved to community package.
 * This uses the community package if available, falls back to a basic implementation.
 */
import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, PanResponder, Dimensions } from 'react-native';

export default function Slider({
  value = 0,
  min = 0,
  max = 100,
  step = 1,
  color = '#7c3aed',
  onChange,
  vertical = false,
  style
}) {
  const trackRef = useRef(null);
  const trackLayout = useRef({ x: 0, y: 0, width: 1, height: 1 });

  const clamp = useCallback((v) => {
    const clamped = Math.min(max, Math.max(min, v));
    if (step === 1) return Math.round(clamped);
    return Math.round(clamped / step) * step;
  }, [min, max, step]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      const layout = trackLayout.current;
      if (vertical) {
        const pct = 1 - Math.min(1, Math.max(0, locationY / layout.height));
        onChange && onChange(clamp(min + pct * (max - min)));
      } else {
        const pct = Math.min(1, Math.max(0, locationX / layout.width));
        onChange && onChange(clamp(min + pct * (max - min)));
      }
    },
    onPanResponderMove: (e, gs) => {
      const layout = trackLayout.current;
      if (vertical) {
        const pct = 1 - Math.min(1, Math.max(0, (gs.y0 + gs.dy - layout.y) / layout.height));
        onChange && onChange(clamp(min + pct * (max - min)));
      } else {
        const pct = Math.min(1, Math.max(0, (gs.x0 + gs.dx - layout.x) / layout.width));
        onChange && onChange(clamp(min + pct * (max - min)));
      }
    }
  })).current;

  const pct = max === min ? 0 : (value - min) / (max - min);

  if (vertical) {
    return (
      <View
        style={[vs.track, style]}
        ref={trackRef}
        onLayout={(e) => { trackLayout.current = e.nativeEvent.layout; }}
        {...panResponder.panHandlers}
      >
        <View style={vs.rail} />
        <View style={[vs.fill, { height: `${pct * 100}%`, backgroundColor: color }]} />
        <View style={[vs.thumb, { bottom: `${pct * 100}%`, borderColor: color }]} />
      </View>
    );
  }

  return (
    <View
      style={[hs.track, style]}
      ref={trackRef}
      onLayout={(e) => { trackLayout.current = e.nativeEvent.layout; }}
      {...panResponder.panHandlers}
    >
      <View style={hs.rail} />
      <View style={[hs.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      <View style={[hs.thumb, { left: `${pct * 100}%`, borderColor: color }]} />
    </View>
  );
}

const THUMB = 20;

const hs = StyleSheet.create({
  track: {
    height: 32, justifyContent: 'center',
    paddingHorizontal: THUMB / 2
  },
  rail: {
    position: 'absolute', left: THUMB / 2, right: THUMB / 2,
    height: 3, backgroundColor: '#1e1e30', borderRadius: 2
  },
  fill: {
    position: 'absolute', left: THUMB / 2,
    height: 3, borderRadius: 2
  },
  thumb: {
    position: 'absolute', width: THUMB, height: THUMB,
    borderRadius: THUMB / 2, backgroundColor: '#fff',
    borderWidth: 2, marginLeft: -THUMB / 2,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4
  }
});

const vs = StyleSheet.create({
  track: {
    width: 32, alignItems: 'center',
    paddingVertical: THUMB / 2
  },
  rail: {
    position: 'absolute', top: THUMB / 2, bottom: THUMB / 2,
    width: 3, backgroundColor: '#1e1e30', borderRadius: 2
  },
  fill: {
    position: 'absolute', bottom: THUMB / 2,
    width: 3, borderRadius: 2
  },
  thumb: {
    position: 'absolute', width: THUMB, height: THUMB,
    borderRadius: THUMB / 2, backgroundColor: '#fff',
    borderWidth: 2, marginBottom: -THUMB / 2,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4
  }
});
