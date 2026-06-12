import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

export default function Skeleton({ width, height, borderRadius = 4, style }) {
  const shimmerValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerValue]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: '#e1e2e7', opacity: shimmerValue },
        style,
      ]}
    />
  );
}
