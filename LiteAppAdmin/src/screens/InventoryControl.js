import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GlassyCard } from '../components/DashboardComponents';
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

export default function InventoryControl({ navigation }) {
  const { products, fetchProducts, alertSettings, saveAlertSettings } = useContext(AdminContext);
  const [recipient, setRecipient] = useState('9876543210');
  const [lowThreshold, setLowThreshold] = useState('10');

  useEffect(() => {
    if (fetchProducts) fetchProducts();
  }, []);

  useEffect(() => {
    if (alertSettings) {
      setRecipient(alertSettings.recipient || '');
      setLowThreshold(String(alertSettings.lowThreshold !== undefined ? alertSettings.lowThreshold : 10));
    }
  }, [alertSettings]);

  const handleSaveConfig = async () => {
    if (!recipient.trim()) {
      Alert.alert('Recipient Required', 'Please enter a mobile phone number.');
      return;
    }
    const res = await saveAlertSettings({
      recipient,
      lowThreshold: parseInt(lowThreshold) || 10
    });
    if (res.success) {
      Alert.alert('Configuration Saved ✅', `Low stock alerts will be routed via SMS/WhatsApp to ${recipient} when quantity falls below ${lowThreshold} units.`);
    } else {
      Alert.alert('Error', res.error || 'Failed to save configuration.');
    }
  };

  // Mock products in case context products is empty
  const itemList = products && products.length > 0 ? products : [
    { id: '1', name: 'Fresh Organic Tomatoes', category: 'Vegetables', stock: 45, reserved: 5, price: 40 },
    { id: '2', name: 'Amul Salted Butter 100g', category: 'Dairy', stock: 8, reserved: 2, price: 58 },
    { id: '3', name: 'Premium Alphonso Mangoes', category: 'Fruits', stock: 0, reserved: 0, price: 350 },
    { id: '4', name: 'Fresh Whole Milk 1L', category: 'Dairy', stock: 82, reserved: 12, price: 66 }
  ];

  const getStockStatus = (stock) => {
    if (stock === 0) return { label: 'OUT OF STOCK', color: COLORS.danger };
    if (stock <= parseInt(lowThreshold)) return { label: 'LOW STOCK', color: COLORS.warning };
    return { label: 'IN STOCK', color: COLORS.primary };
  };

  const renderProductItem = ({ item }) => {
    const status = getStockStatus(item.stock);
    return (
      <GlassyCard style={styles.itemCard}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemCategory}>{item.category || 'Grocery'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Available</Text>
            <Text style={styles.statValue}>{item.stock}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Reserved</Text>
            <Text style={styles.statValue}>{item.reserved || 0}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Unit Price</Text>
            <Text style={styles.statValue}>₹{item.price}</Text>
          </View>
        </View>
      </GlassyCard>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={26} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Inventory Control Center</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        {/* SMS alerts config */}
        <View style={{ padding: 20 }}>
          <Text style={styles.sectionTitle}>Automated Alert Configuration</Text>
          <GlassyCard style={styles.configCard}>
            <Text style={styles.label}>SMS / WhatsApp Notification Recipient</Text>
            <TextInput 
              style={styles.input}
              placeholder="e.g. +91 98765 43210"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              value={recipient}
              onChangeText={setRecipient}
            />

            <Text style={styles.label}>Low Stock Threshold (Units)</Text>
            <TextInput 
              style={styles.input}
              placeholder="e.g. 10"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              value={lowThreshold}
              onChangeText={setLowThreshold}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveConfig}>
              <Text style={styles.saveBtnText}>Save Alert Configuration</Text>
            </TouchableOpacity>
          </GlassyCard>
        </View>

        {/* Product Stock List */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={styles.sectionTitle}>Warehouse Catalog Stocks</Text>
          <FlatList 
            data={itemList}
            renderItem={renderProductItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '900', color: '#ffffff' },
  sectionTitle: { fontSize: 13, fontWeight: '900', color: '#ffffff', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1.5 },
  configCard: { padding: 15 },
  label: { fontSize: 12, fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', marginBottom: 8, marginTop: 10 },
  input: { height: 50, backgroundColor: COLORS.inputBg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 15, color: '#ffffff', fontSize: 14, marginBottom: 15 },
  saveBtn: { height: 48, backgroundColor: COLORS.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 15 },
  saveBtnText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  itemCard: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemName: { fontSize: 15, fontWeight: '900', color: '#ffffff' },
  itemCategory: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingVertical: 10, marginTop: 12 },
  statBox: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 14, fontWeight: '900', color: '#ffffff', marginTop: 4 }
});
