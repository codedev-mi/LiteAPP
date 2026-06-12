import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminContext } from '../context/AdminContext';

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

export default function AlertSettings({ navigation }) {
  const { alertSettings, saveAlertSettings } = useContext(AdminContext);
  const [numbers, setNumbers] = useState([]);
  const [newNumber, setNewNumber] = useState('');

  useEffect(() => {
    if (alertSettings?.recipient) {
      setNumbers(alertSettings.recipient.split(',').map(s => s.trim()).filter(Boolean));
    }
  }, [alertSettings]);

  const handleAddNumber = () => {
    if (!newNumber.trim()) return;
    // Basic validation for mobile number (assuming India +91)
    let formatted = newNumber.trim();
    if (!formatted.startsWith('+') && formatted.length === 10) {
      formatted = `+91${formatted}`;
    }
    setNumbers([...numbers, formatted]);
    setNewNumber('');
  };

  const handleRemoveNumber = (index) => {
    const updated = numbers.filter((_, i) => i !== index);
    setNumbers(updated);
  };

  const handleSave = async () => {
    const res = await saveAlertSettings({
      recipient: numbers.join(','),
      lowThreshold: alertSettings?.lowThreshold !== undefined ? alertSettings.lowThreshold : 10
    });
    if (res.success) {
      Alert.alert('Success', 'WhatsApp Alert settings saved successfully.');
      navigation.goBack();
    } else {
      Alert.alert('Error', res.error || 'Failed to save settings.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alert Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>WhatsApp Notifications</Text>
          <Text style={styles.cardSub}>
            Configure the mobile numbers that will receive "Out of Stock" alerts.
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Enter mobile number"
              placeholderTextColor={COLORS.textMuted}
              value={newNumber}
              onChangeText={setNewNumber}
              keyboardType="phone-pad"
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleAddNumber}>
              <Text style={styles.addBtnText}>ADD</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.numbersList}>
            {numbers.map((num, idx) => (
              <View key={idx} style={styles.numberItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                  <Text style={styles.numberText}>{num}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveNumber(idx)}>
                  <Ionicons name="trash-outline" size={20} color="#ff4757" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>SAVE SETTINGS</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 10, 
    paddingBottom: 20,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#ffffff' },
  backBtn: { padding: 8, backgroundColor: COLORS.inputBg, borderRadius: 12 },
  content: { padding: 20 },
  card: {
    backgroundColor: COLORS.card,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', marginBottom: 5 },
  cardSub: { fontSize: 13, color: COLORS.textMuted, marginBottom: 20 },
  inputRow: { flexDirection: 'row', marginBottom: 20 },
  input: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginRight: 10,
    fontSize: 15,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  addBtn: {
    backgroundColor: '#00b894',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 12
  },
  addBtnText: { color: '#fff', fontWeight: 'bold' },
  numbersList: { marginTop: 10 },
  numberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  numberText: { marginLeft: 10, fontSize: 15, fontWeight: '600', color: '#ffffff' },
  footer: { padding: 20, backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border },
  saveBtn: { backgroundColor: '#00b894', paddingVertical: 18, borderRadius: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 }
});
