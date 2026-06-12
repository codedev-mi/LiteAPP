import React, { useContext, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { AppContext } from '../../context/AppContext';

export default function ForgotPasswordScreen({ navigation }) {
  const { forgotPassword, resetPassword } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestToken = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    setIsLoading(true);
    const res = await forgotPassword(email.toLowerCase().trim());
    setIsLoading(false);

    if (res && res.success) {
      setStep(2);
      Alert.alert('Success', `Reset token sent! (Dev: ${res.devToken})`);
    } else {
      Alert.alert('Error', res?.error || 'Failed to request password reset');
    }
  };

  const handleResetPassword = async () => {
    if (!token || !newPassword) {
      Alert.alert('Error', 'Please enter the token and your new password');
      return;
    }
    setIsLoading(true);
    const res = await resetPassword(email.toLowerCase().trim(), token, newPassword);
    setIsLoading(false);

    if (res && res.success) {
      Alert.alert('Success', 'Password has been reset successfully!');
      navigation.navigate('Login');
    } else {
      Alert.alert('Error', res?.error || 'Failed to reset password');
    }
  };

  return (
    <View style={styles.authContainer}>
      <Text style={styles.brandName}>Reset Password</Text>
      
      <View style={styles.loginCard}>
        {step === 1 ? (
          <>
            <Text style={styles.subtext}>Enter your registered email address to receive a password reset token.</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Email Address" 
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleRequestToken} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Reset Token</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.subtext}>Enter the token sent to your email and your new password.</Text>
            <TextInput 
              style={styles.input} 
              placeholder="6-Digit Token" 
              keyboardType="numeric"
              value={token}
              onChangeText={setToken}
              maxLength={6}
            />
            <TextInput 
              style={styles.input} 
              placeholder="New Password" 
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleResetPassword} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Reset Password</Text>}
            </TouchableOpacity>
            
            <TouchableOpacity style={{ marginTop: 20 }} onPress={() => setStep(1)}>
              <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>← Back to Request Token</Text>
            </TouchableOpacity>
          </>
        )}
        
        {step === 1 && (
          <TouchableOpacity style={{ marginTop: 20 }} onPress={() => navigation.goBack()}>
            <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>← Back to Login</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  authContainer: { flex: 1, backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center', padding: 20 },
  brandName: { fontSize: 32, fontWeight: 'bold', color: 'white', marginBottom: 20 },
  loginCard: { backgroundColor: 'white', width: '100%', padding: 25, borderRadius: 20, elevation: 10, alignItems: 'center' },
  input: { width: '100%', borderBottomWidth: 1, borderColor: '#ddd', padding: 10, marginBottom: 15, fontSize: 16 },
  primaryBtn: { backgroundColor: '#4CAF50', width: '100%', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  subtext: { color: '#666', marginBottom: 20, textAlign: 'center', lineHeight: 22 }
});
