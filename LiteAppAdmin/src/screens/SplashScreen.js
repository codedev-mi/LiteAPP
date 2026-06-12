import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.centerContent, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Image 
          source={require('../../assets/logo.png')} 
          style={styles.logo} 
          resizeMode="contain" 
        />
        <Text style={styles.appName}>LiteApp</Text>
        <Text style={styles.adminText}>ADMIN PORTAL</Text>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.poweredText}>Powered by</Text>
        <Image 
          source={require('../../assets/powered_by.png')} 
          style={styles.devLogo} 
          resizeMode="contain" 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  appName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#00b894',
    letterSpacing: 2,
  },
  adminText: {
    fontSize: 12,
    color: '#a0a0a0',
    fontWeight: 'bold',
    marginTop: 5,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  poweredText: {
    fontSize: 12,
    color: '#a0a0a0',
    fontWeight: 'bold',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  devLogo: {
    width: 100,
    height: 30,
    opacity: 0.8,
  },
});
