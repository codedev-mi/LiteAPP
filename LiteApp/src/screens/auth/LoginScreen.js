import React, { useContext, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { AppContext } from '../../context/AppContext';

export default function LoginScreen({ navigation }) {
  const { loginWithEmail } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }

    setIsLoading(true);
    const res = await loginWithEmail(email.toLowerCase().trim(), password);
    setIsLoading(false);

    if (res && res.error) {
      Alert.alert('Login Failed', res.error);
    }
  };

  return (
    <View style={styles.authContainer}>
      <View style={styles.logoCircle}><Text style={{fontSize: 60}}>🛒</Text></View>
      <Text style={styles.brandName}>Bhusawal Basket</Text>
      <Text style={styles.tagline}>Freshness within your Radius</Text>

      <View style={styles.loginCard}>
        <TextInput 
          style={styles.input} 
          placeholder="Email Address" 
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput 
          style={styles.input} 
          placeholder="Password" 
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        
        <TouchableOpacity style={{ alignSelf: 'flex-end', marginBottom: 20 }} onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Login</Text>}
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <Text style={{color: '#666', marginBottom: 15}}>Don't have an account?</Text>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.secondaryBtnText}>Create User Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  authContainer: { flex: 1, backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center', padding: 20 },
  logoCircle: { width: 120, height: 120, backgroundColor: 'white', borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  brandName: { fontSize: 32, fontWeight: 'bold', color: 'white' },
  tagline: { fontSize: 16, color: '#e0e0e0', marginBottom: 40 },
  loginCard: { backgroundColor: 'white', width: '100%', padding: 25, borderRadius: 20, elevation: 10, alignItems: 'center' },
  input: { width: '100%', borderBottomWidth: 1, borderColor: '#ddd', padding: 10, marginBottom: 15, fontSize: 16 },
  primaryBtn: { backgroundColor: '#4CAF50', width: '100%', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  divider: { height: 1, backgroundColor: '#eee', width: '100%', marginVertical: 20 },
  secondaryBtn: { borderWidth: 1, borderColor: '#4CAF50', width: '100%', padding: 15, borderRadius: 10, alignItems: 'center' },
  secondaryBtnText: { color: '#4CAF50', fontWeight: 'bold' },
});
