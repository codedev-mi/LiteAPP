import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, 
  Image, ActivityIndicator, Alert, Modal, Dimensions, Switch, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width, height } = Dimensions.get('window');

// Resolve backend IP dynamically
const isLocalUrl = (url) => {
  if (!url) return false;
  return url.includes('localhost') || url.includes('127.0.0.1') || url.includes('10.0.2.2') || 
         /192\.168\.\d+\.\d+/.test(url) || /10\.\d+\.\d+\.\d+/.test(url) || /172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/.test(url);
};

const getDevApiUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri ? hostUri.split(':')[0] : null;
  if (Platform.OS === 'web') {
    return `http://${window.location.hostname}:5000`;
  }
  return host ? `http://${host}:5000` : (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://192.168.1.100:5000');
};

const getDefaultApiUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && !isLocalUrl(envUrl)) {
    return envUrl;
  }
  return getDevApiUrl() || envUrl || 'http://localhost:5000';
};

// Premium Theme Colors
const COLORS = {
  background: '#121212',
  card: '#1e1e1e',
  primary: '#00b894',
  primaryLight: '#e8fdfa',
  secondary: '#0984e3',
  danger: '#ff7675',
  warning: '#fdcb6e',
  text: '#ffffff',
  textMuted: '#a0a0a0',
  border: '#2d2d2d',
  inputBg: '#252525'
};

export default function App() {
  const [apiUrl, setApiUrl] = useState(getDefaultApiUrl());
  const [isServerConnected, setIsServerConnected] = useState(true);
  const [isConnectionChecking, setIsConnectionChecking] = useState(true);
  const API_URL = apiUrl;

  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [rider, setRider] = useState(null);
  const [screen, setScreen] = useState('login'); // 'login', 'register', 'onboarding', 'pending', 'dashboard', 'earnings'
  
  // Auth Form State
  const [authForm, setAuthForm] = useState({ name: '', phone: '', email: '', password: '' });
  
  // Onboarding Multi-step State
  const [onboardStep, setOnboardStep] = useState(1); // 1 to 6
  const [onboardForm, setOnboardForm] = useState({
    dob: '', gender: '', address: '',
    vehicleType: 'Bike', vehicleNumber: '',
    accountNumber: '', ifsc: '', upiId: '',
    emergencyName: '', emergencyPhone: '',
    aadhaarUrl: '', panUrl: '', rcUrl: '', dlUrl: '',
    selfieUrl: ''
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isUpiVerifying, setIsUpiVerifying] = useState(false);
  const [isUpiVerified, setIsUpiVerified] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Location / Telemetry
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState(null);
  
  // Active Deliveries / Earnings
  const [activeOrders, setActiveOrders] = useState([]);
  const [wallet, setWallet] = useState({ summary: { walletBalance: 0, earnings: 0, deliveriesCount: 0, incentives: 0 }, logs: [] });
  const [refreshing, setRefreshing] = useState(false);

  // Interval Ref for Location Telemetry
  const locationInterval = useRef(null);

  const onChangeDob = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const year = selectedDate.getFullYear();
      setOnboardForm(prev => ({ ...prev, dob: `${day}/${month}/${year}` }));
    }
  };

  const handleVerifyUpi = async () => {
    if (!onboardForm.upiId.trim()) {
      Alert.alert('UPI ID Required', 'Please enter a UPI ID to verify.');
      return;
    }
    if (!onboardForm.upiId.includes('@')) {
      Alert.alert('Verification Failed', 'Invalid UPI ID format. It must contain "@" (e.g., rider@upi).');
      return;
    }
    
    setIsUpiVerifying(true);
    setTimeout(() => {
      setIsUpiVerifying(false);
      setIsUpiVerified(true);
      Alert.alert('UPI Verified ✅', `Account holder: ${rider?.name || 'Rider Partner'}\nUPI ID is valid and active.`);
    }, 1500);
  };

  const testConnection = async (urlToTest) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(`${urlToTest}/categories`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      return res.status === 200;
    } catch (e) {
      clearTimeout(timeoutId);
      console.log('testConnection failed for:', urlToTest, e.message);
      return false;
    }
  };

  const saveCustomApiUrl = async (newUrl) => {
    let formattedUrl = newUrl.trim().replace(/\/+$/, '');
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `http://${formattedUrl}`;
    }
    
    const isWorking = await testConnection(formattedUrl);
    if (isWorking) {
      await AsyncStorage.setItem('customApiUrl', formattedUrl);
      setApiUrl(formattedUrl);
      setIsServerConnected(true);
      
      await bootstrapSession(formattedUrl);
      return { success: true };
    } else {
      return { success: false, error: 'Could not connect to backend server at this address.' };
    }
  };
  const initializeSystem = async () => {
    setIsConnectionChecking(true);
    let currentUrl = apiUrl;
    try {
      const storedUrl = await AsyncStorage.getItem('customApiUrl');
      if (storedUrl) {
        currentUrl = storedUrl;
        setApiUrl(storedUrl);
      }
    } catch (e) {
      console.log('Error loading custom API URL:', e);
    }

    const connected = await testConnection(currentUrl);
    if (connected) {
      setIsServerConnected(true);
      await bootstrapSession(currentUrl);
    } else {
      setIsServerConnected(false);
      setIsLoading(false);
    }
    setIsConnectionChecking(false);
  };

  useEffect(() => {
    initializeSystem();
  }, []);

  const bootstrapSession = async (customUrl = null) => {
    const activeUrl = customUrl || apiUrl;
    try {
      const savedToken = await AsyncStorage.getItem('riderToken');
      if (savedToken) {
        setToken(savedToken);
        await fetchProfile(savedToken, activeUrl);
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      console.log('Session bootstrap error:', err);
      setIsLoading(false);
    }
  };

  const fetchProfile = async (authToken, customUrl = null) => {
    const activeUrl = customUrl || apiUrl;
    try {
      const res = await fetch(`${activeUrl}/api/delivery/profile`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok && data && !data.error) {
        setRider(data);
        setIsOnline(data.isOnline);
        determineScreen(data);
      } else {
        await handleLogout();
      }
    } catch (err) {
      console.log('Fetch profile error:', err);
      Alert.alert('Network Error', 'Could not connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  const determineScreen = (profile) => {
    if (profile.verificationStatus === 'Approved') {
      setScreen('dashboard');
    } else if (profile.verificationStatus === 'Draft') {
      setScreen('onboarding');
      // pre-fill onboarding form
      setOnboardForm({
        dob: profile.dob || '',
        gender: profile.gender || '',
        address: profile.address || '',
        vehicleType: profile.vehicleType || 'Bike',
        vehicleNumber: profile.vehicleNumber || '',
        accountNumber: profile.accountNumber || '',
        ifsc: profile.ifsc || '',
        upiId: profile.upiId || '',
        emergencyName: profile.emergencyName || '',
        emergencyPhone: profile.emergencyPhone || '',
        aadhaarUrl: profile.aadhaarUrl || '',
        panUrl: profile.panUrl || '',
        rcUrl: profile.rcUrl || '',
        dlUrl: profile.dlUrl || '',
        selfieUrl: profile.selfieUrl || ''
      });
    } else {
      setScreen('pending');
    }
  };

  // Auth Handlers
  const handleRegister = async () => {
    if (!authForm.name || !authForm.phone || !authForm.email || !authForm.password) {
      Alert.alert('Required Fields', 'Please fill in all registration details.');
      return;
    }
    const cleanPhone = authForm.phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      Alert.alert('Invalid Mobile Number', 'Mobile number must be exactly 10 digits.');
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/api/delivery/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (res.ok && data.token) {
        await AsyncStorage.setItem('riderToken', data.token);
        setToken(data.token);
        setRider(data.partner);
        determineScreen(data.partner);
      } else {
        Alert.alert('Registration Failed', data.error || 'Check details and try again.');
      }
    } catch (err) {
      Alert.alert('Network Error', 'Error connecting to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!authForm.email || !authForm.password) {
      Alert.alert('Required Fields', 'Please fill in email and password.');
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/api/delivery/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authForm.email, password: authForm.password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        await AsyncStorage.setItem('riderToken', data.token);
        setToken(data.token);
        setRider(data.partner);
        determineScreen(data.partner);
      } else {
        Alert.alert('Login Failed', data.error || 'Invalid credentials.');
      }
    } catch (err) {
      Alert.alert('Network Error', 'Error connecting to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    clearInterval(locationInterval.current);
    await AsyncStorage.removeItem('riderToken');
    setToken(null);
    setRider(null);
    setScreen('login');
  };

  // Image Upload helper
  const handleSelectImage = async (field) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Media library access is needed.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true
    });

    if (!result.canceled && result.assets && result.assets[0].base64) {
      try {
        setIsLoading(true);
        const res = await fetch(`${API_URL}/api/delivery/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ base64: result.assets[0].base64 })
        });

        const responseText = await res.text();
        let uploadData;
        try {
          uploadData = JSON.parse(responseText);
        } catch (parseErr) {
          Alert.alert('Upload Failed', `Server returned invalid format (Status: ${res.status}).`);
          return;
        }

        if (res.ok && uploadData.url) {
          setOnboardForm(prev => ({ ...prev, [field]: uploadData.url }));
          Alert.alert('Success', 'Document uploaded successfully.');
        } else {
          Alert.alert('Upload Failed', uploadData.error || 'Failed to upload document.');
        }
      } catch (err) {
        Alert.alert('Error', 'Network error during document upload.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Auto Mock Upload for fast onboarding/testing
  const handleMockUpload = async (field) => {
    // Generate a beautiful mock photo link based on Unsplash
    let mockUrl = 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=400';
    if (field === 'selfieUrl') {
      mockUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400';
    } else if (field === 'dlUrl') {
      mockUrl = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=400';
    } else if (field === 'rcUrl') {
      mockUrl = 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=400';
    } else if (field === 'aadhaarUrl') {
      mockUrl = 'https://images.unsplash.com/photo-1563013544-824ae1d704d3?q=80&w=400';
    } else if (field === 'panUrl') {
      mockUrl = 'https://images.unsplash.com/photo-1554224155-6b0904000301?q=80&w=400';
    }
    
    setOnboardForm(prev => ({ ...prev, [field]: mockUrl }));
    Alert.alert('Mock Success', `${field.replace('Url', '').toUpperCase()} auto-filled for development.`);
  };

  // Submit Step Update
  const saveOnboardingStep = async () => {
    // Client-side validations per step
    if (onboardStep === 1) {
      if (!onboardForm.dob) {
        Alert.alert('Date of Birth Required', 'Please select your date of birth.');
        return;
      }
      if (!onboardForm.gender.trim()) {
        Alert.alert('Gender Required', 'Please select your gender.');
        return;
      }
      if (!onboardForm.address.trim()) {
        Alert.alert('Address Required', 'Please enter your present residential address.');
        return;
      }
    } else if (onboardStep === 2) {
      if (onboardForm.vehicleType !== 'Cycle' && !onboardForm.vehicleNumber.trim()) {
        Alert.alert('Vehicle Number Required', 'Please enter your vehicle registration number.');
        return;
      }
    } else if (onboardStep === 3) {
      if (!onboardForm.accountNumber.trim()) {
        Alert.alert('Account Number Required', 'Please enter your bank account number.');
        return;
      }
      if (!onboardForm.ifsc.trim()) {
        Alert.alert('IFSC Code Required', 'Please enter your bank IFSC code.');
        return;
      }
    } else if (onboardStep === 4) {
      if (!onboardForm.emergencyName.trim()) {
        Alert.alert('Contact Name Required', 'Please enter emergency contact person name.');
        return;
      }
      const cleanEmergPhone = onboardForm.emergencyPhone.replace(/\D/g, '');
      if (cleanEmergPhone.length !== 10) {
        Alert.alert('Invalid Contact Phone', 'Emergency contact phone number must be exactly 10 digits.');
        return;
      }
    } else if (onboardStep === 5) {
      if (!onboardForm.aadhaarUrl) {
        Alert.alert('Aadhaar Card Required', 'Please upload your Aadhaar Card photo.');
        return;
      }
      if (!onboardForm.panUrl) {
        Alert.alert('PAN Card Required', 'Please upload your PAN Card photo.');
        return;
      }
      if (onboardForm.vehicleType !== 'Cycle') {
        if (!onboardForm.dlUrl) {
          Alert.alert('Driving License Required', 'Please upload your Driving License photo.');
          return;
        }
        if (!onboardForm.rcUrl) {
          Alert.alert('Bike Image Required', 'Please upload a photo of your Bike/Vehicle.');
          return;
        }
      }
    } else if (onboardStep === 6) {
      if (!onboardForm.selfieUrl) {
        Alert.alert('Selfie Required', 'Please capture or upload your selfie.');
        return;
      }
    }

    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/api/delivery/onboard`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(onboardForm)
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setRider(data);
        if (data.verificationStatus === 'Submitted') {
          setScreen('pending');
        } else {
          setOnboardStep(prev => prev + 1);
        }
      } else {
        Alert.alert('Error', data.error || 'Failed to save onboarding details.');
      }
    } catch (err) {
      Alert.alert('Network Error', 'Error saving details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Location tracking and pinging
  const startLocationTracking = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location Blocked', 'Rider tracking requires GPS location.');
      return;
    }

    // Ping location immediately
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setLocation(loc.coords);
    await sendLocationPing(loc.coords.latitude, loc.coords.longitude, true);

    // Setup periodic ping (every 10 seconds)
    locationInterval.current = setInterval(async () => {
      try {
        const nextLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(nextLoc.coords);
        await sendLocationPing(nextLoc.coords.latitude, nextLoc.coords.longitude, true);
      } catch (err) {
        console.log('Periodic location tracking error:', err);
      }
    }, 10000);
  };

  const stopLocationTracking = async () => {
    clearInterval(locationInterval.current);
    locationInterval.current = null;
    await sendLocationPing(0, 0, false);
  };

  const sendLocationPing = async (lat, lng, onlineStatus) => {
    try {
      await fetch(`${API_URL}/api/delivery/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          isOnline: onlineStatus
        })
      });
    } catch (err) {
      console.log('Location ping network error:', err);
    }
  };

  const handleOnlineToggle = async (val) => {
    setIsOnline(val);
    if (val) {
      await startLocationTracking();
      await fetchActiveOrders();
    } else {
      await stopLocationTracking();
      setActiveOrders([]);
    }
  };

  // Fetch Delivery Orders
  const fetchActiveOrders = async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const res = await fetch(`${API_URL}/api/delivery/orders/available`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setActiveOrders(data);
      }
    } catch (err) {
      console.log('Fetch active orders error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Update Assignment Status
  const handleUpdateAssignmentStatus = async (orderId, newStatus) => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/api/delivery/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        Alert.alert('Status Updated', `Delivery status is now ${newStatus}.`);
        await fetchActiveOrders();
        // Refresh profile to update wallet summary if delivered
        if (newStatus === 'Delivered') {
          await fetchProfile(token);
        }
      } else {
        Alert.alert('Error', data.error || 'Failed to update delivery status.');
      }
    } catch (err) {
      Alert.alert('Network Error', 'Error updating delivery status.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Earnings wallet
  const fetchEarnings = async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const res = await fetch(`${API_URL}/api/delivery/earnings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data) {
        setWallet(data);
      }
    } catch (err) {
      console.log('Fetch earnings error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (screen === 'dashboard') {
      fetchActiveOrders();
    } else if (screen === 'earnings') {
      fetchEarnings();
    }
  }, [screen]);

  // SOS Trigger
  const triggerSOS = () => {
    Alert.alert(
      '🚨 SOS Emergency Triggered',
      'Calling emergency support and sharing your live telemetry coords immediately!',
      [{ text: 'Dismiss', style: 'cancel' }]
    );
  };

  // View Components
  if (isConnectionChecking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Initializing Network...</Text>
      </View>
    );
  }

  if (!isServerConnected) {
    return (
      <ConnectionSettingsScreen 
        apiUrl={apiUrl} 
        saveCustomApiUrl={saveCustomApiUrl} 
        testConnection={testConnection} 
      />
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Configuring LiteApp Delivery Network...</Text>
      </View>
    );
  }

  // --- Auth Screens ---
  if (screen === 'login' || screen === 'register') {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.authHeader}>
            <View style={styles.logoContainer}>
              <Ionicons name="bicycle" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.authTitle}>LiteApp Delivery</Text>
            <Text style={styles.authSubtitle}>Rider Network & Logistics Portal</Text>
          </View>

          <View style={styles.formCard}>
            {screen === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Enter your full name" 
                  placeholderTextColor="#777"
                  value={authForm.name}
                  onChangeText={val => setAuthForm(prev => ({ ...prev, name: val }))}
                />
              </View>
            )}

            {screen === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Enter phone number" 
                  placeholderTextColor="#777"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={authForm.phone}
                  onChangeText={val => setAuthForm(prev => ({ ...prev, phone: val.replace(/\D/g, '') }))}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Enter email address" 
                placeholderTextColor="#777"
                keyboardType="email-address"
                autoCapitalize="none"
                value={authForm.email}
                onChangeText={val => setAuthForm(prev => ({ ...prev, email: val.trim() }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput 
                style={styles.input} 
                placeholder="••••••••" 
                placeholderTextColor="#777"
                secureTextEntry
                value={authForm.password}
                onChangeText={val => setAuthForm(prev => ({ ...prev, password: val }))}
              />
            </View>

            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={screen === 'login' ? handleLogin : handleRegister}
            >
              <Text style={styles.buttonText}>{screen === 'login' ? 'Login Dashboard' : 'Register Profile'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => setScreen(screen === 'login' ? 'register' : 'login')}
            >
              <Text style={styles.linkText}>
                {screen === 'login' ? "Don't have an account? Sign Up" : 'Already registered? Log In'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // --- Onboarding Screens ---
  if (screen === 'onboarding') {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.onboardHeader}>
          <Text style={styles.onboardHeaderTitle}>Rider Onboarding</Text>
          <Text style={styles.onboardStepText}>Step {onboardStep} of 6</Text>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${(onboardStep / 6) * 100}%` }]} />
          </View>
        </View>

        <ScrollView style={styles.onboardScroll} contentContainerStyle={{ paddingBottom: 40 }}>
          {onboardStep === 1 && (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>1. Personal Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date of Birth</Text>
                <TouchableOpacity 
                  style={styles.inputDatePicker} 
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={[styles.datePickerText, !onboardForm.dob && { color: '#777' }]}>
                    {onboardForm.dob || 'Select Date of Birth'}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.primary} style={{ marginLeft: 10 }} />
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={onboardForm.dob ? (() => {
                      const parts = onboardForm.dob.split('/');
                      if (parts.length === 3) {
                        const d = new Date(parts[2], parts[1] - 1, parts[0]);
                        return isNaN(d.getTime()) ? new Date(2000, 0, 1) : d;
                      }
                      return new Date(2000, 0, 1);
                    })() : new Date(2000, 0, 1)}
                    mode="date"
                    display="default"
                    maximumDate={new Date()}
                    onChange={onChangeDob}
                  />
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Gender</Text>
                <View style={styles.pickerRow}>
                  {['Male', 'Female', 'Other'].map(g => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.pickerButton, onboardForm.gender === g && styles.pickerActive]}
                      onPress={() => setOnboardForm(prev => ({ ...prev, gender: g }))}
                    >
                      <Text style={[styles.pickerText, onboardForm.gender === g && styles.pickerTextActive]}>
                        {g === 'Male' ? '👨 Male' : g === 'Female' ? '👩 Female' : '👤 Other'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Present Residential Address</Text>
                <TextInput 
                  style={[styles.input, { height: 80 }]} 
                  placeholder="Enter complete residential address" 
                  placeholderTextColor="#777"
                  multiline
                  value={onboardForm.address}
                  onChangeText={val => setOnboardForm(prev => ({ ...prev, address: val }))}
                />
              </View>
            </View>
          )}

          {onboardStep === 2 && (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>2. Vehicle Details</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Vehicle Type</Text>
                <View style={styles.pickerRow}>
                  {['Bike', 'Scooter', 'Cycle'].map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.pickerButton, onboardForm.vehicleType === type && styles.pickerActive]}
                      onPress={() => setOnboardForm(prev => ({ ...prev, vehicleType: type }))}
                    >
                      <Text style={[styles.pickerText, onboardForm.vehicleType === type && styles.pickerTextActive]}>
                        {type === 'Bike' ? '🏍️ Bike' : type === 'Scooter' ? '🛵 Scooter' : '🚲 Cycle'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {onboardForm.vehicleType !== 'Cycle' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Vehicle Registration Number (RC)</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="MH-19-AA-1234" 
                    placeholderTextColor="#777"
                    autoCapitalize="characters"
                    value={onboardForm.vehicleNumber}
                    onChangeText={val => setOnboardForm(prev => ({ ...prev, vehicleNumber: val }))}
                  />
                </View>
              )}
            </View>
          )}

          {onboardStep === 3 && (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>3. Bank Account Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bank Account Number</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="123456789012" 
                  placeholderTextColor="#777"
                  keyboardType="numeric"
                  value={onboardForm.accountNumber}
                  onChangeText={val => setOnboardForm(prev => ({ ...prev, accountNumber: val }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bank IFSC Code</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="SBIN0001234" 
                  placeholderTextColor="#777"
                  autoCapitalize="characters"
                  value={onboardForm.ifsc}
                  onChangeText={val => setOnboardForm(prev => ({ ...prev, ifsc: val }))}
                />
              </View>
            </View>
          )}

          {onboardStep === 4 && (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>4. Emergency Contact</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Person Name</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Primary relative name" 
                  placeholderTextColor="#777"
                  value={onboardForm.emergencyName}
                  onChangeText={val => setOnboardForm(prev => ({ ...prev, emergencyName: val }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Phone Number</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Emergency phone number" 
                  placeholderTextColor="#777"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={onboardForm.emergencyPhone}
                  onChangeText={val => setOnboardForm(prev => ({ ...prev, emergencyPhone: val.replace(/\D/g, '') }))}
                />
              </View>
            </View>
          )}

          {onboardStep === 5 && (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>5. KYC Document Verification</Text>
              
              {/* Aadhaar Card */}
              <View style={styles.uploadBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.uploadTitle}>Aadhaar Card Front Photo</Text>
                  <Text style={styles.uploadStatus}>
                    {onboardForm.aadhaarUrl ? '✅ Attached' : '❌ Required'}
                  </Text>
                </View>
                <View style={styles.uploadActionRow}>
                  <TouchableOpacity style={styles.uploadBtn} onPress={() => handleSelectImage('aadhaarUrl')}>
                    <Ionicons name="camera" size={18} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.mockBtn} onPress={() => handleMockUpload('aadhaarUrl')}>
                    <Text style={styles.mockBtnText}>Mock</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* PAN Card */}
              <View style={styles.uploadBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.uploadTitle}>PAN Card Photo</Text>
                  <Text style={styles.uploadStatus}>
                    {onboardForm.panUrl ? '✅ Attached' : '❌ Required'}
                  </Text>
                </View>
                <View style={styles.uploadActionRow}>
                  <TouchableOpacity style={styles.uploadBtn} onPress={() => handleSelectImage('panUrl')}>
                    <Ionicons name="camera" size={18} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.mockBtn} onPress={() => handleMockUpload('panUrl')}>
                    <Text style={styles.mockBtnText}>Mock</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {onboardForm.vehicleType !== 'Cycle' && (
                <View>
                  {/* Driving License */}
                  <View style={styles.uploadBox}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.uploadTitle}>Driving License Photo</Text>
                      <Text style={styles.uploadStatus}>
                        {onboardForm.dlUrl ? '✅ Attached' : '❌ Required'}
                      </Text>
                    </View>
                    <View style={styles.uploadActionRow}>
                      <TouchableOpacity style={styles.uploadBtn} onPress={() => handleSelectImage('dlUrl')}>
                        <Ionicons name="camera" size={18} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.mockBtn} onPress={() => handleMockUpload('dlUrl')}>
                        <Text style={styles.mockBtnText}>Mock</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Bike Image */}
                  <View style={styles.uploadBox}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.uploadTitle}>Bike/Vehicle Image Photo</Text>
                      <Text style={styles.uploadStatus}>
                        {onboardForm.rcUrl ? '✅ Attached' : '❌ Required'}
                      </Text>
                    </View>
                    <View style={styles.uploadActionRow}>
                      <TouchableOpacity style={styles.uploadBtn} onPress={() => handleSelectImage('rcUrl')}>
                        <Ionicons name="camera" size={18} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.mockBtn} onPress={() => handleMockUpload('rcUrl')}>
                        <Text style={styles.mockBtnText}>Mock</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {onboardStep === 6 && (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>6. Selfie Verification</Text>
              <Text style={styles.sectionDesc}>Please provide a clear live portrait photo for customer trust verification.</Text>
              
              <View style={styles.selfieContainer}>
                {onboardForm.selfieUrl ? (
                  <Image source={{ uri: onboardForm.selfieUrl }} style={styles.selfieImage} />
                ) : (
                  <View style={styles.selfiePlaceholder}>
                    <Ionicons name="person-circle-outline" size={80} color={COLORS.textMuted} />
                  </View>
                )}
              </View>

              <View style={styles.selfieActionRow}>
                <TouchableOpacity style={styles.primaryButton} onPress={() => handleSelectImage('selfieUrl')}>
                  <Text style={styles.buttonText}>Capture Selfie</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: COLORS.secondary, marginTop: 10 }]} onPress={() => handleMockUpload('selfieUrl')}>
                  <Text style={styles.buttonText}>Mock Selfie</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.onboardBtnRow}>
            {onboardStep > 1 && (
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setOnboardStep(prev => prev - 1)}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.nextButton, onboardStep === 1 && { width: '100%' }]}
              onPress={saveOnboardingStep}
            >
              <Text style={styles.buttonText}>{onboardStep === 6 ? 'Submit Verification' : 'Save & Continue'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // --- Pending / Rejected Screens ---
  if (screen === 'pending') {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.pendingCard}>
          <View style={styles.pendingIconBox}>
            {rider?.verificationStatus === 'Suspended' ? (
              <Ionicons name="ban-outline" size={60} color={COLORS.danger} />
            ) : rider?.verificationStatus === 'Reupload_Required' ? (
              <Ionicons name="alert-circle-outline" size={60} color={COLORS.warning} />
            ) : (
              <Ionicons name="time-outline" size={60} color={COLORS.secondary} />
            )}
          </View>
          
          <Text style={styles.pendingTitle}>
            {rider?.verificationStatus === 'Suspended' ? 'Profile Suspended' :
             rider?.verificationStatus === 'Reupload_Required' ? 'Reupload Required' :
             'Review in Progress'}
          </Text>

          <Text style={styles.pendingSubtitle}>
            {rider?.verificationStatus === 'Suspended' ? 'Your account access has been suspended due to policy violations. Contact support for dispute resolution.' :
             rider?.verificationStatus === 'Reupload_Required' ? `Admin remarked: ${rider?.reuploadRemarks || 'Blurry document uploads. Please review KYC files.'}` :
             'We are verifying your KYC documents (Aadhaar, PAN, RC, Selfie). This usually takes 1-2 hours.'}
          </Text>

          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>Status: {rider?.verificationStatus}</Text>
          </View>

          {rider?.verificationStatus === 'Reupload_Required' && (
            <TouchableOpacity 
              style={[styles.primaryButton, { width: '100%', marginTop: 30 }]}
              onPress={() => {
                setScreen('onboarding');
                setOnboardStep(5); // Go straight to docs upload step
              }}
            >
              <Text style={styles.buttonText}>Edit Documents</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.primaryButton, { width: '100%', backgroundColor: COLORS.secondary, marginTop: 15 }]}
            onPress={() => setShowReviewModal(true)}
          >
            <Text style={styles.buttonText}>Review Submitted Details</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.primaryButton, { width: '100%', backgroundColor: COLORS.danger, marginTop: 15 }]}
            onPress={handleLogout}
          >
            <Text style={styles.buttonText}>Logout Account</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.refreshLink}
            onPress={() => fetchProfile(token)}
          >
            <Ionicons name="refresh" size={16} color={COLORS.primary} style={{ marginRight: 5 }} />
            <Text style={styles.refreshLinkText}>Check Status Update</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Review Modal */}
        <Modal visible={showReviewModal} animationType="slide" transparent>
          <View style={styles.reviewModalOverlay}>
            <SafeAreaView style={styles.reviewModalContent}>
              <View style={styles.reviewModalHeader}>
                <Text style={styles.reviewModalTitle}>Your Submitted Profile</Text>
                <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                  <Ionicons name="close" size={26} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.reviewModalScroll} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>Personal Details</Text>
                  <Text style={styles.reviewLabel}>Full Name: <Text style={styles.reviewVal}>{rider?.name}</Text></Text>
                  <Text style={styles.reviewLabel}>Email: <Text style={styles.reviewVal}>{rider?.email}</Text></Text>
                  <Text style={styles.reviewLabel}>Phone: <Text style={styles.reviewVal}>{rider?.phone}</Text></Text>
                  <Text style={styles.reviewLabel}>DOB: <Text style={styles.reviewVal}>{rider?.dob || 'Not Provided'}</Text></Text>
                  <Text style={styles.reviewLabel}>Gender: <Text style={styles.reviewVal}>{rider?.gender || 'Not Provided'}</Text></Text>
                  <Text style={styles.reviewLabel}>Address: <Text style={styles.reviewVal}>{rider?.address || 'Not Provided'}</Text></Text>
                </View>

                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>Vehicle Info</Text>
                  <Text style={styles.reviewLabel}>Vehicle Type: <Text style={styles.reviewVal}>{rider?.vehicleType || 'Not Provided'}</Text></Text>
                  {rider?.vehicleType !== 'Cycle' && (
                    <Text style={styles.reviewLabel}>RC Number: <Text style={styles.reviewVal}>{rider?.vehicleNumber || 'Not Provided'}</Text></Text>
                  )}
                </View>

                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>Bank Accounts</Text>
                  <Text style={styles.reviewLabel}>Account Number: <Text style={styles.reviewVal}>{rider?.accountNumber || 'Not Provided'}</Text></Text>
                  <Text style={styles.reviewLabel}>IFSC: <Text style={styles.reviewVal}>{rider?.ifsc || 'Not Provided'}</Text></Text>
                </View>

                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>Emergency Contact</Text>
                  <Text style={styles.reviewLabel}>Name: <Text style={styles.reviewVal}>{rider?.emergencyName || 'Not Provided'}</Text></Text>
                  <Text style={styles.reviewLabel}>Phone: <Text style={styles.reviewVal}>{rider?.emergencyPhone || 'Not Provided'}</Text></Text>
                </View>

                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>KYC Documents</Text>
                  
                  {!!rider?.selfieUrl && (
                    <View style={styles.reviewDocBox}>
                      <Text style={styles.reviewDocLabel}>Selfie Photo</Text>
                      <Image source={{ uri: rider.selfieUrl }} style={styles.reviewDocImg} resizeMode="contain" />
                    </View>
                  )}

                  {!!rider?.aadhaarUrl && (
                    <View style={styles.reviewDocBox}>
                      <Text style={styles.reviewDocLabel}>Aadhaar Card Front</Text>
                      <Image source={{ uri: rider.aadhaarUrl }} style={styles.reviewDocImg} resizeMode="contain" />
                    </View>
                  )}

                  {!!rider?.panUrl && (
                    <View style={styles.reviewDocBox}>
                      <Text style={styles.reviewDocLabel}>PAN Card</Text>
                      <Image source={{ uri: rider.panUrl }} style={styles.reviewDocImg} resizeMode="contain" />
                    </View>
                  )}

                  {rider?.vehicleType !== 'Cycle' && !!rider?.dlUrl && (
                    <View style={styles.reviewDocBox}>
                      <Text style={styles.reviewDocLabel}>Driving License</Text>
                      <Image source={{ uri: rider.dlUrl }} style={styles.reviewDocImg} resizeMode="contain" />
                    </View>
                  )}

                  {rider?.vehicleType !== 'Cycle' && !!rider?.rcUrl && (
                    <View style={styles.reviewDocBox}>
                      <Text style={styles.reviewDocLabel}>Vehicle Photo</Text>
                      <Image source={{ uri: rider.rcUrl }} style={styles.reviewDocImg} resizeMode="contain" />
                    </View>
                  )}
                </View>
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>
      </View>
    );
  }

  // --- Active Approved Dashboard / Earnings ---
  return (
    <View style={styles.dashboardContainer}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.dashHeader}>
        <View style={styles.dashProfileRow}>
          <Image 
            source={{ uri: rider?.selfieUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400' }} 
            style={styles.avatarImg} 
          />
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.dashWelcome}>Hello Rider!</Text>
            <Text style={styles.dashName}>{rider?.name}</Text>
          </View>
          <View style={styles.onlineContainer}>
            <Text style={[styles.onlineText, { color: isOnline ? COLORS.primary : COLORS.textMuted }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={handleOnlineToggle}
              thumbColor={isOnline ? COLORS.primary : '#777'}
              trackColor={{ false: '#444', true: COLORS.primary + '50' }}
            />
          </View>
        </View>

        {/* SOS and Stats */}
        <View style={styles.quickStatRow}>
          <TouchableOpacity style={styles.sosButton} onPress={triggerSOS}>
            <Text style={styles.sosText}>🚨 SOS Emergency</Text>
          </TouchableOpacity>
          <View style={styles.trustScoreBox}>
            <Text style={styles.trustLabel}>Trust Score</Text>
            <Text style={styles.trustValue}>{rider?.trustScore}%</Text>
          </View>
        </View>
      </View>

      {/* Main Screen Content */}
      <ScrollView 
        style={styles.dashMainScroll}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <Switch 
            value={refreshing} 
            onValueChange={() => {
              if (screen === 'dashboard') fetchActiveOrders();
              if (screen === 'earnings') fetchEarnings();
            }} 
          />
        }
      >
        {screen === 'dashboard' ? (
          <View style={{ padding: 15 }}>
            <Text style={styles.sectionHeaderTitle}>Assigned Active Delivery</Text>
            
            {activeOrders.length === 0 ? (
              <View style={styles.emptyDeliveryCard}>
                <Ionicons name="navigate-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyDeliveryTitle}>No Active Orders</Text>
                <Text style={styles.emptyDeliverySub}>
                  {isOnline ? 'Waiting for order auto-allocations. Keep the app open.' : 'Toggle Online switch to receive incoming orders.'}
                </Text>
                {isOnline && (
                  <TouchableOpacity style={styles.refreshOrdersBtn} onPress={fetchActiveOrders}>
                    <Text style={styles.refreshOrdersText}>Poll New Orders</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              activeOrders.map(assignment => (
                <View key={assignment.id} style={styles.activeOrderCard}>
                  <View style={styles.activeOrderHeader}>
                    <Text style={styles.orderLabel}>#ORD-{assignment.order.id.slice(-6).toUpperCase()}</Text>
                    <View style={styles.statusPillSmall}>
                      <Text style={styles.statusPillSmallText}>{assignment.status}</Text>
                    </View>
                  </View>

                  <Text style={styles.orderTimeText}>Assigned: {new Date(assignment.assignedAt).toLocaleTimeString()}</Text>
                  
                  {/* Delivery Route Simulation */}
                  <View style={styles.deliveryMapMock}>
                    <View style={styles.mapPinRow}>
                      <View style={styles.mapIconCircle}>
                        <Text style={{ fontSize: 18 }}>🏪</Text>
                      </View>
                      <View style={styles.mapDottedLine} />
                      <View style={[styles.mapIconCircle, { backgroundColor: COLORS.secondary }]}>
                        <Text style={{ fontSize: 18 }}>🏠</Text>
                      </View>
                    </View>
                    <Text style={styles.mapLabelText}>Bhusawal Store ➜ {assignment.order.address.receiverName || 'Customer Address'}</Text>
                  </View>

                  {/* Customer Info */}
                  <View style={styles.custDetailsBox}>
                    <View style={styles.custRow}>
                      <Ionicons name="person-outline" size={16} color={COLORS.textMuted} />
                      <Text style={styles.custDetailText}>{assignment.order.address.receiverName || 'Guest Customer'}</Text>
                    </View>
                    <View style={styles.custRow}>
                      <Ionicons name="call-outline" size={16} color={COLORS.textMuted} />
                      <Text style={styles.custDetailText}>{assignment.order.address.receiverPhone || 'No Phone'}</Text>
                    </View>
                    <View style={styles.custRow}>
                      <Ionicons name="pin-outline" size={16} color={COLORS.textMuted} />
                      <Text style={styles.custDetailText} numberOfLines={2}>
                        {assignment.order.address.completeAddress}, {assignment.order.address.area}, {assignment.order.address.city}
                      </Text>
                    </View>
                  </View>

                  {/* Payment Alert */}
                  <View style={[styles.paymentBanner, { backgroundColor: assignment.order.paymentMethod === 'COD' ? COLORS.warning + '20' : COLORS.primary + '20' }]}>
                    <Text style={[styles.paymentBannerText, { color: assignment.order.paymentMethod === 'COD' ? COLORS.warning : COLORS.primary }]}>
                      Payment Method: {assignment.order.paymentMethod} {assignment.order.paymentMethod === 'COD' ? `(Collect ₹${assignment.order.grandTotal})` : '(Prepaid)'}
                    </Text>
                  </View>

                  {/* Stage Workflow Button */}
                  {assignment.status === 'Assigned' && (
                    <TouchableOpacity 
                      style={[styles.primaryButton, { backgroundColor: COLORS.primary }]}
                      onPress={() => handleUpdateAssignmentStatus(assignment.orderId, 'Accepted')}
                    >
                      <Text style={styles.buttonText}>Accept Order Assignment</Text>
                    </TouchableOpacity>
                  )}

                  {assignment.status === 'Accepted' && (
                    <TouchableOpacity 
                      style={[styles.primaryButton, { backgroundColor: COLORS.secondary }]}
                      onPress={() => handleUpdateAssignmentStatus(assignment.orderId, 'PickedUp')}
                    >
                      <Text style={styles.buttonText}>Arrive & Pick Up Order</Text>
                    </TouchableOpacity>
                  )}

                  {assignment.status === 'PickedUp' && (
                    <TouchableOpacity 
                      style={[styles.primaryButton, { backgroundColor: COLORS.primary }]}
                      onPress={() => handleUpdateAssignmentStatus(assignment.orderId, 'Delivered')}
                    >
                      <Text style={styles.buttonText}>Complete Order Delivery</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={{ padding: 15 }}>
            <Text style={styles.sectionHeaderTitle}>Rider Wallet & Logs</Text>
            
            {/* Wallet Summary */}
            <View style={styles.walletCard}>
              <View style={styles.walletBalanceBox}>
                <Text style={styles.walletBalanceLabel}>Available Wallet Balance</Text>
                <Text style={styles.walletBalanceValue}>₹{wallet.summary?.walletBalance.toFixed(2)}</Text>
              </View>
              
              <View style={styles.walletStatsDivider} />
              
              <View style={styles.walletSubStatsRow}>
                <View style={styles.subStatItem}>
                  <Text style={styles.subStatLabel}>Total Earnings</Text>
                  <Text style={styles.subStatValue}>₹{wallet.summary?.earnings.toFixed(2)}</Text>
                </View>
                <View style={styles.subStatItem}>
                  <Text style={styles.subStatLabel}>Deliveries</Text>
                  <Text style={styles.subStatValue}>{wallet.summary?.deliveriesCount}</Text>
                </View>
                <View style={styles.subStatItem}>
                  <Text style={styles.subStatLabel}>Incentives</Text>
                  <Text style={styles.subStatValue}>₹{wallet.summary?.incentives.toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {/* Earnings Transaction logs */}
            <Text style={styles.sectionHeaderTitle}>Transaction History</Text>
            
            {wallet.logs.length === 0 ? (
              <View style={styles.emptyLogsCard}>
                <Text style={styles.emptyLogsText}>No payouts/earnings logged yet.</Text>
              </View>
            ) : (
              wallet.logs.map(log => (
                <View key={log.id} style={styles.logCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logTitle}>{log.type === 'DeliveryFee' ? 'Order Delivery Payout' : log.type}</Text>
                    <Text style={styles.logTime}>{new Date(log.createdAt).toLocaleString()}</Text>
                  </View>
                  <Text style={styles.logAmount}>+₹{log.amount.toFixed(2)}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Custom Bottom Navbar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.navItem, screen === 'dashboard' && styles.navItemActive]}
          onPress={() => setScreen('dashboard')}
        >
          <Ionicons name="navigate" size={24} color={screen === 'dashboard' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[styles.navText, screen === 'dashboard' && styles.navTextActive]}>Deliveries</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, screen === 'earnings' && styles.navItemActive]}
          onPress={() => setScreen('earnings')}
        >
          <Ionicons name="wallet" size={24} color={screen === 'earnings' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[styles.navText, screen === 'earnings' && styles.navTextActive]}>Earnings</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={handleLogout}
        >
          <Ionicons name="log-out" size={24} color={COLORS.danger} />
          <Text style={[styles.navText, { color: COLORS.danger }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 50,
  },
  scrollContent: {
    padding: 20,
    justifyContent: 'center',
    minHeight: height - 80
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: COLORS.text,
    marginTop: 15,
    fontSize: 14,
    fontWeight: '600'
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: 40
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15
  },
  authTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.5
  },
  authSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 5
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 25,
    padding: 25,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5
  },
  inputGroup: {
    marginBottom: 20
  },
  inputLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5
  },
  input: {
    backgroundColor: COLORS.inputBg,
    color: COLORS.text,
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  inputDatePicker: {
    backgroundColor: COLORS.inputBg,
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  datePickerText: {
    color: COLORS.text,
    fontSize: 14
  },
  upiVerifyBtn: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15
  },
  upiVerifyBtnSuccess: {
    backgroundColor: '#2ed573'
  },
  upiVerifyBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800'
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center'
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600'
  },
  
  // Onboarding styles
  onboardHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  onboardHeaderTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text
  },
  onboardStepText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5
  },
  progressContainer: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginTop: 15
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2
  },
  onboardScroll: {
    flex: 1,
    padding: 15
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8
  },
  sectionDesc: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 20
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  pickerButton: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  pickerActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15'
  },
  pickerText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700'
  },
  pickerTextActive: {
    color: COLORS.primary
  },
  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  uploadTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700'
  },
  uploadStatus: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4
  },
  uploadActionRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  uploadBtn: {
    backgroundColor: COLORS.primary,
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  mockBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  mockBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700'
  },
  selfieContainer: {
    alignItems: 'center',
    marginVertical: 20
  },
  selfiePlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed'
  },
  selfieImage: {
    width: 140,
    height: 140,
    borderRadius: 70
  },
  selfieActionRow: {
    marginTop: 10
  },
  onboardBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
    paddingHorizontal: 5
  },
  backButton: {
    width: '30%',
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center'
  },
  backButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700'
  },
  nextButton: {
    width: '65%',
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  
  // Pending Screen styles
  pendingCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30
  },
  pendingIconBox: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  pendingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center'
  },
  pendingSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 15,
    lineHeight: 22,
    paddingHorizontal: 10
  },
  statusPill: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.primary + '40'
  },
  statusPillText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  refreshLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    padding: 10
  },
  refreshLinkText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700'
  },
  
  // Dashboard Styles
  dashboardContainer: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  dashHeader: {
    backgroundColor: COLORS.card,
    paddingTop: 55,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  dashProfileRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: COLORS.primary
  },
  dashWelcome: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600'
  },
  dashName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2
  },
  onlineContainer: {
    alignItems: 'center'
  },
  onlineText: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase'
  },
  quickStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20
  },
  sosButton: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10
  },
  sosText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800'
  },
  trustScoreBox: {
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  trustLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '600'
  },
  trustValue: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2
  },
  dashMainScroll: {
    flex: 1
  },
  sectionHeaderTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
    marginVertical: 15,
    letterSpacing: 0.5
  },
  emptyDeliveryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 10
  },
  emptyDeliveryTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 15
  },
  emptyDeliverySub: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18
  },
  refreshOrdersBtn: {
    backgroundColor: COLORS.primary + '15',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginTop: 15
  },
  refreshOrdersText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700'
  },
  
  // Active Order Card Styles
  activeOrderCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 15
  },
  activeOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  orderLabel: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '900'
  },
  statusPillSmall: {
    backgroundColor: COLORS.secondary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  statusPillSmallText: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '800'
  },
  orderTimeText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 5
  },
  deliveryMapMock: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    padding: 15,
    marginVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  mapPinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  mapIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  mapDottedLine: {
    width: 100,
    height: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    marginHorizontal: 10
  },
  mapLabelText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center'
  },
  custDetailsBox: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    marginBottom: 15
  },
  custRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  custDetailText: {
    color: COLORS.text,
    fontSize: 13,
    marginLeft: 10,
    fontWeight: '600'
  },
  paymentBanner: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center'
  },
  paymentBannerText: {
    fontSize: 11,
    fontWeight: '800'
  },
  
  // Wallet / Earnings Page Styles
  walletCard: {
    backgroundColor: COLORS.card,
    borderRadius: 25,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 15
  },
  walletBalanceBox: {
    alignItems: 'center',
    paddingVertical: 10
  },
  walletBalanceLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600'
  },
  walletBalanceValue: {
    color: COLORS.primary,
    fontSize: 32,
    fontWeight: '900',
    marginTop: 6
  },
  walletStatsDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 15
  },
  walletSubStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  subStatItem: {
    alignItems: 'center'
  },
  subStatLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600'
  },
  subStatValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4
  },
  emptyLogsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  emptyLogsText: {
    color: COLORS.textMuted,
    fontSize: 12
  },
  logCard: {
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  logTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700'
  },
  logTime: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 4
  },
  logAmount: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '900'
  },
  
  // Navigation Bar Styles
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 65,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 8
  },
  navItemActive: {
    borderTopWidth: 2,
    borderTopColor: COLORS.primary
  },
  navTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold'
  }
});

function ConnectionSettingsScreen({ apiUrl, saveCustomApiUrl, testConnection }) {
  const [inputUrl, setInputUrl] = useState(apiUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const suggestions = [
    { label: 'Auto-Detected IP', url: apiUrl },
    { label: 'Host PC Wi-Fi Network', url: 'http://10.158.0.38:5000' },
    { label: 'Local Development Port', url: 'http://10.0.2.2:5000' },
    { label: 'Standard Localhost', url: 'http://localhost:5000' }
  ].filter((item, index, self) => 
    self.findIndex(t => t.url === item.url) === index
  );

  const handleTest = async () => {
    if (!inputUrl.trim()) {
      Alert.alert('Invalid URL', 'Please enter a valid server URL.');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      let urlToTest = inputUrl.trim().replace(/\/+$/, '');
      if (!urlToTest.startsWith('http://') && !urlToTest.startsWith('https://')) {
        urlToTest = `http://${urlToTest}`;
      }
      const success = await testConnection(urlToTest);
      if (success) {
        setTestResult('success');
      } else {
        setTestResult('failed');
      }
    } catch (e) {
      setTestResult('failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    let urlToSave = inputUrl.trim().replace(/\/+$/, '');
    if (!urlToSave.startsWith('http://') && !urlToSave.startsWith('https://')) {
      urlToSave = `http://${urlToSave}`;
    }

    setIsTesting(true);
    const result = await saveCustomApiUrl(urlToSave);
    setIsTesting(false);
    if (!result.success) {
      Alert.alert('Connection Failed', result.error || 'Please test connection.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={darkStyles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={darkStyles.scrollContent}>
        <View style={darkStyles.header}>
          <View style={darkStyles.iconContainer}>
            <Ionicons name="wifi-outline" size={48} color={COLORS.danger} />
          </View>
          <Text style={darkStyles.title}>Rider Connection Settings</Text>
          <Text style={darkStyles.subtitle}>
            Could not reach the backend server. Please verify the API URL below or configure a new address.
          </Text>
        </View>

        <View style={darkStyles.card}>
          <Text style={darkStyles.label}>Server API URL</Text>
          <View style={darkStyles.inputContainer}>
            <Ionicons name="link-outline" size={20} color={COLORS.textMuted} style={darkStyles.inputIcon} />
            <TextInput
              style={darkStyles.input}
              placeholder="http://192.168.1.100:5000"
              placeholderTextColor={COLORS.textMuted}
              value={inputUrl}
              onChangeText={(text) => {
                setInputUrl(text);
                setTestResult(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {testResult === 'success' && (
            <View style={[darkStyles.statusRow, darkStyles.statusSuccess]}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
              <Text style={darkStyles.statusTextSuccess}>Connected successfully!</Text>
            </View>
          )}
          {testResult === 'failed' && (
            <View style={[darkStyles.statusRow, darkStyles.statusFailed]}>
              <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
              <Text style={darkStyles.statusTextFailed}>Server unreachable. Verify URL/port.</Text>
            </View>
          )}

          <View style={darkStyles.btnRow}>
            <TouchableOpacity 
              style={[darkStyles.btn, darkStyles.btnOutline]} 
              onPress={handleTest}
              disabled={isTesting}
            >
              {isTesting ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={darkStyles.btnOutlineText}>Test Connection</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                darkStyles.btn, 
                darkStyles.btnPrimary, 
                testResult !== 'success' && darkStyles.btnDisabled
              ]} 
              onPress={handleSave}
              disabled={isTesting || testResult !== 'success'}
            >
              <Text style={darkStyles.btnPrimaryText}>Save & Connect</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={darkStyles.suggestionsContainer}>
          <Text style={darkStyles.suggestionsTitle}>Connection Suggestions</Text>
          {suggestions.map((item, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={darkStyles.suggestionItem}
              onPress={() => {
                setInputUrl(item.url);
                setTestResult(null);
              }}
            >
              <View style={darkStyles.suggestionLeft}>
                <Ionicons name="phone-portrait-outline" size={18} color={COLORS.textMuted} />
                <View style={darkStyles.suggestionTexts}>
                  <Text style={darkStyles.suggestionLabel}>{item.label}</Text>
                  <Text style={darkStyles.suggestionUrl}>{item.url}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward-outline" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const darkStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    minHeight: Dimensions.get('window').height - 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 40,
  },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#ff7675',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#a0a0a0',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252525',
    borderWidth: 1,
    borderColor: '#2d2d2d',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  statusSuccess: {
    backgroundColor: 'rgba(0, 184, 148, 0.15)',
  },
  statusFailed: {
    backgroundColor: 'rgba(255, 118, 117, 0.15)',
  },
  statusTextSuccess: {
    color: '#00b894',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  statusTextFailed: {
    color: '#ff7675',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  btn: {
    flex: 0.48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnOutline: {
    borderWidth: 2,
    borderColor: '#00b894',
    backgroundColor: 'transparent',
  },
  btnOutlineText: {
    color: '#00b894',
    fontWeight: '700',
    fontSize: 14,
  },
  btnPrimary: {
    backgroundColor: '#00b894',
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  btnDisabled: {
    backgroundColor: '#2d2d2d',
    opacity: 0.5,
  },
  suggestionsContainer: {
    marginTop: 10,
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#636e72',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2d2d2d',
  },
  suggestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionTexts: {
    marginLeft: 12,
  },
  suggestionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  suggestionUrl: {
    fontSize: 11,
    color: '#a0a0a0',
    marginTop: 2,
  },
  reviewModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  reviewModalContent: { backgroundColor: '#1e1e1e', borderTopLeftRadius: 25, borderTopRightRadius: 25, height: '90%' },
  reviewModalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#2d2d2d', alignItems: 'center' },
  reviewModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  reviewModalScroll: { padding: 20 },
  reviewSection: { marginBottom: 25, backgroundColor: '#252525', padding: 15, borderRadius: 12 },
  reviewSectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#00b894', marginBottom: 12, textTransform: 'uppercase' },
  reviewLabel: { fontSize: 13, color: '#a0a0a0', marginBottom: 8 },
  reviewVal: { color: '#fff', fontWeight: 'bold' },
  reviewDocBox: { marginTop: 12 },
  reviewDocLabel: { fontSize: 12, color: '#fff', marginBottom: 6, fontWeight: 'bold' },
  reviewDocImg: { width: '100%', height: 180, borderRadius: 8, backgroundColor: '#121212' },
});
