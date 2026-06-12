import React, { useState, useContext } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AdminContext } from '../context/AdminContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || (
  Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://192.168.132.41:5000'
);

const COLORS = {
  background: '#121212',
  card: '#1e1e1e',
  primary: '#00b894',
  secondary: '#0984e3',
  danger: '#ff7675',
  warning: '#fdcb6e',
  text: '#ffffff',
  textMuted: '#a0a0a0',
  border: '#2d2d2d',
  inputBg: '#252525'
};

export default function LoginScreen() {
  const { login } = useContext(AdminContext);

  // Login state
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Signup modal state
  const [signupVisible, setSignupVisible] = useState(false);
  const [sName, setSName]         = useState('');
  const [sPhone, setSPhone]       = useState('');
  const [sEmail, setSEmail]       = useState('');
  const [sPassword, setSPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showSPassword, setShowSPassword] = useState(false);

  /* ── Login ─────────────────────────────────────────────── */
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
    setIsSubmitting(true);
    const res = await login(email, password);
    setIsSubmitting(false);
    if (!res.success) {
      Alert.alert('Login Failed', res.error || 'Invalid credentials or you do not have admin access.');
    }
  };

  /* ── Signup ─────────────────────────────────────────────── */
  const handleSignup = async () => {
    if (!sName || !sPhone || !sEmail || !sPassword) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }
    if (sPhone.length < 10) {
      Alert.alert('Error', 'Enter a valid 10-digit mobile number.');
      return;
    }

    setIsSigningUp(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sName, phone: sPhone, email: sEmail, password: sPassword }),
      });
      const data = await res.json();
      setIsSigningUp(false);

      if (data.token) {
        setSignupVisible(false);
        Alert.alert(
          'Account Created ✅',
          'Your account was created successfully.\n\nNote: Admin access requires role promotion by the system owner. Please login once you have been granted access.',
          [{ text: 'OK', onPress: () => { setEmail(sEmail); } }]
        );
        // Reset signup fields
        setSName(''); setSPhone(''); setSEmail(''); setSPassword('');
      } else {
        Alert.alert('Signup Failed', data.error || 'Could not create account.');
      }
    } catch (err) {
      setIsSigningUp(false);
      Alert.alert('Error', 'Network error. Please check your connection.');
    }
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.content}>

          {/* Logo */}
          <View style={styles.headerBox}>
            <View style={styles.logoCircle}>
              <Ionicons name="shield-checkmark" size={50} color="#00b894" />
            </View>
            <Text style={styles.title}>Admin Portal</Text>
            <Text style={styles.subtitle}>Enter your credentials to access the dashboard</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="admin@example.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={isSubmitting}>
              {isSubmitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.loginBtnText}>Login to Dashboard</Text>}
            </TouchableOpacity>

            {/* Signup link */}
            <TouchableOpacity style={styles.signupLink} onPress={() => setSignupVisible(true)}>
              <Text style={styles.signupLinkText}>
                Don't have an account?{'  '}
                <Text style={styles.signupLinkBold}>Create Account</Text>
              </Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>
              Authorized personnel only. All actions are logged.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── Signup Modal ──────────────────────────────────── */}
      <Modal visible={signupVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Account</Text>
              <TouchableOpacity onPress={() => setSignupVisible(false)}>
                <Ionicons name="close" size={26} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Name */}
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Your full name" 
                  placeholderTextColor={COLORS.textMuted}
                  value={sName} 
                  onChangeText={setSName} 
                />
              </View>

              {/* Phone */}
              <Text style={[styles.label, { marginTop: 16 }]}>Mobile Number</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={COLORS.textMuted}
                  value={sPhone}
                  onChangeText={setSPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              {/* Email */}
              <Text style={[styles.label, { marginTop: 16 }]}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={sEmail}
                  onChangeText={setSEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Password */}
              <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Min 8 characters"
                  placeholderTextColor={COLORS.textMuted}
                  value={sPassword}
                  onChangeText={setSPassword}
                  secureTextEntry={!showSPassword}
                />
                <TouchableOpacity onPress={() => setShowSPassword(!showSPassword)}>
                  <Ionicons name={showSPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.noteBox}>
                <Ionicons name="information-circle-outline" size={16} color="#0984e3" />
                <Text style={styles.noteText}>
                  After registration, the system owner must promote your account to Admin role before you can login here.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.loginBtn, { marginTop: 20 }]}
                onPress={handleSignup}
                disabled={isSigningUp}
              >
                {isSigningUp
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.loginBtnText}>Create Account</Text>}
              </TouchableOpacity>

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, padding: 30, justifyContent: 'center' },
  headerBox: { alignItems: 'center', marginBottom: 40 },
  logoCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0, 184, 148, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '900', color: '#ffffff' },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 10, textAlign: 'center' },
  form: { width: '100%' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg, borderRadius: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: COLORS.border },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 55, fontSize: 16, color: '#ffffff' },
  loginBtn: { backgroundColor: '#00b894', height: 60, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 15, elevation: 5, shadowColor: '#00b894', shadowOpacity: 0.3, shadowRadius: 10 },
  loginBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  signupLink: { marginTop: 20, alignItems: 'center' },
  signupLinkText: { fontSize: 14, color: COLORS.textMuted },
  signupLinkBold: { color: '#00b894', fontWeight: '900' },
  footerText: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 25, fontStyle: 'italic' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '90%', borderWidth: 1, borderColor: COLORS.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#ffffff' },
  noteBox: { flexDirection: 'row', backgroundColor: 'rgba(9, 132, 227, 0.15)', borderRadius: 12, padding: 14, marginTop: 20, alignItems: 'flex-start' },
  noteText: { flex: 1, marginLeft: 8, fontSize: 12, color: '#0984e3', lineHeight: 18 },
});
