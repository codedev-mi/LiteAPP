import React, { useContext, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { AppContext } from '../../context/AppContext';

export default function SignupScreen({ navigation }) {
  const { register } = useContext(AppContext);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !phone || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill out all details.');
      return;
    }
    if (phone.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const res = await register(name, phone, email.toLowerCase().trim(), password);
    setIsLoading(false);
    
    if (res && res.error) {
      Alert.alert('Registration Failed', res.error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.authContainer}>
      <Text style={styles.brandName}>Join Us</Text>
      <Text style={styles.tagline}>Create your Bhusawal Basket profile</Text>

      <View style={styles.loginCard}>
        <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Mobile Number" keyboardType="numeric" value={phone} onChangeText={setPhone} maxLength={10} />
        <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
        <TextInput style={styles.input} placeholder="Confirm Password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
        
        <TouchableOpacity style={styles.primaryBtn} onPress={handleSignup} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign Up</Text>}
        </TouchableOpacity>
        
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => navigation.goBack()}>
          <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>← Back to Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  authContainer: { flexGrow: 1, backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center', padding: 20 },
  brandName: { fontSize: 32, fontWeight: 'bold', color: 'white', marginBottom: 10, marginTop: 40 },
  tagline: { fontSize: 16, color: '#e0e0e0', marginBottom: 30 },
  loginCard: { backgroundColor: 'white', width: '100%', padding: 25, borderRadius: 20, elevation: 10, alignItems: 'center' },
  input: { width: '100%', borderBottomWidth: 1, borderColor: '#ddd', padding: 10, marginBottom: 15, fontSize: 16 },
  primaryBtn: { backgroundColor: '#4CAF50', width: '100%', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
