import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { AppContext } from '../../context/AppContext';

export default function EditProfileScreen({ navigation }) {
  const { currentUser, setCurrentUser, userAddresses, setUserAddresses, setCurrentAddress, updateProfile } = useContext(AppContext);
  
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [address, setAddress] = useState(currentUser?.address || '');
  const [city, setCity] = useState(currentUser?.city || '');
  const [photo, setPhoto] = useState(currentUser?.photo || null);

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !phone.trim() || !address.trim() || !city.trim()) {
      Alert.alert('Error', 'Please fill in required fields (Name, Phone, Address, City)');
      return;
    }

    const trimmedCity = city.trim();
    if (trimmedCity !== 'Jalgaon' && trimmedCity !== 'Bhusawal') {
      Alert.alert('Service Unavailable', 'We only deliver to Jalgaon and Bhusawal. Please choose either Jalgaon or Bhusawal.');
      return;
    }

    const profileData = { 
      name, 
      phone, 
      email, 
      address, 
      city: trimmedCity,
      photo
    };
    
    const success = await updateProfile(profileData);
    
    if (success) {
      Alert.alert('Success', 'Profile updated and Address Saved!', [
        { text: 'OK', onPress: () => navigation.navigate('Profile') }
      ]);
    } else {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={{ flex: 1 }} 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarLarge}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.avatarImg} />
              ) : (
                <Text style={{ fontSize: 60 }}>👤</Text>
              )}
              <View style={styles.cameraIcon}>
                <Text style={{ fontSize: 12 }}>📷</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickImage}>
              <Text style={styles.changePhotoText}>Change Profile Picture</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name <Text style={{ color: 'red' }}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ex. John Doe"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number <Text style={{ color: 'red' }}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 9876543210"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="john@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>House No / Street <Text style={{ color: 'red' }}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="House No 123, Gandhi Nagar"
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>City <Text style={{ color: 'red' }}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="Bhusawal"
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 20, 
    paddingBottom: Platform.OS === 'ios' ? 20 : 20,
    paddingTop: 40,
    backgroundColor: 'white', 
    borderBottomWidth: 1, 
    borderColor: '#eee',
    alignItems: 'center'
  },
  backBtn: { fontSize: 16, color: '#4CAF50', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  avatarSection: { alignItems: 'center', marginVertical: 25 },
  avatarLarge: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: '#f5f5f5', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#eee',
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImg: { width: '100%', height: '100%', borderRadius: 50 },
  cameraIcon: { 
    position: 'absolute', 
    bottom: 0, 
    right: 0, 
    backgroundColor: '#4CAF50', 
    width: 30, 
    height: 30, 
    borderRadius: 15, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  changePhotoText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 14 },
  formContainer: { paddingHorizontal: 20 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 6, textTransform: 'uppercase' },
  input: { 
    backgroundColor: '#fcfcfc', 
    padding: 14, 
    borderRadius: 10, 
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#eee',
    color: '#333'
  },
  saveBtn: { 
    backgroundColor: '#4CAF50', 
    padding: 16, 
    borderRadius: 10, 
    alignItems: 'center', 
    marginTop: 15,
    elevation: 3,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
