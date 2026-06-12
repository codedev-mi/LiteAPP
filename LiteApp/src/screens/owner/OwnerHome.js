import React, { useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppContext } from '../../context/AppContext';

export default function OwnerHome() {
  const { logout, products } = useContext(AppContext);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.ownerHeader}>
        <Text style={styles.ownerTitle}>Store Manager</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={{ color: 'red' }}>Exit</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={{ padding: 20 }}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.smallLabel}>Today's Sales</Text>
            <Text style={styles.statValue}>₹4,200</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.smallLabel}>Orders</Text>
            <Text style={styles.statValue}>18</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Update Store Prices</Text>
        {products.map((item) => (
          <View key={item.id} style={styles.inventoryRow}>
            <Text style={{ flex: 1 }}>{item.name}</Text>
            <TextInput 
              style={styles.priceInput} 
              defaultValue={item.price.toString()} 
              keyboardType="numeric" 
            />
            <TouchableOpacity style={styles.updateBtn}>
              <Text style={{ color: 'white', fontSize: 12 }}>Update</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff', paddingTop: 30 },
  ownerHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: 'white', elevation: 2 },
  ownerTitle: { fontSize: 22, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statBox: { backgroundColor: 'white', padding: 20, borderRadius: 15, width: '48%', elevation: 3 },
  smallLabel: { fontSize: 10, color: '#999' },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#4CAF50' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  inventoryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 1 },
  priceInput: { borderBottomWidth: 1, borderColor: '#ccc', width: 60, marginRight: 10, textAlign: 'center' },
  updateBtn: { backgroundColor: '#2196F3', padding: 8, borderRadius: 5 },
});