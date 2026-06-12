import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AdminContext } from '../context/AdminContext';
import { GlassyCard } from '../components/DashboardComponents';

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

export default function VendorManagement({ navigation }) {
  const { vendors, fetchVendors, onboardVendor, verifyVendor } = useContext(AdminContext);

  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVendor, setNewVendor] = useState({ 
    name: '', 
    ownerName: '', 
    phone: '', 
    email: '', 
    password: '', 
    commissionRate: '8', 
    operatingHours: '08:00 AM - 09:00 PM' 
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchVendors();
    setRefreshing(false);
  };

  const handleToggleActive = async (id, val) => {
    const res = await verifyVendor(id, val ? 'Approved' : 'Suspended', val);
    if (res.success) {
      Alert.alert(
        val ? "Vendor Activated" : "Vendor Suspended",
        `Vendor status has been updated successfully.`
      );
    } else {
      Alert.alert("Update Failed", res.error || "Could not update status.");
    }
  };

  const handleAddVendor = async () => {
    if (!newVendor.name || !newVendor.ownerName || !newVendor.phone || !newVendor.email || !newVendor.password) {
      Alert.alert('Fields Required', 'Please fill name, owner name, phone, email, and password.');
      return;
    }

    const vendorData = {
      name: newVendor.name,
      ownerName: newVendor.ownerName,
      phone: newVendor.phone,
      email: newVendor.email.toLowerCase().trim(),
      password: newVendor.password,
      commissionRate: parseFloat(newVendor.commissionRate) || 8.0,
      operatingHours: newVendor.operatingHours,
      storeCapacity: 100
    };

    const res = await onboardVendor(vendorData);
    if (res.success) {
      setShowAddModal(false);
      setNewVendor({ 
        name: '', 
        ownerName: '', 
        phone: '', 
        email: '', 
        password: '', 
        commissionRate: '8', 
        operatingHours: '08:00 AM - 09:00 PM' 
      });
      Alert.alert('Success 🎉', 'New vendor registered and activated.');
    } else {
      Alert.alert('Registration Failed', res.error || 'Server error.');
    }
  };

  const renderVendorItem = ({ item }) => (
    <GlassyCard style={styles.vendorCard}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarBox}>
          <Ionicons name="storefront" size={24} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={styles.vendorName}>{item.name}</Text>
          <Text style={styles.ownerText}>Owner: {item.ownerName} | {item.phone}</Text>
        </View>
        <Switch 
          value={item.active} 
          onValueChange={(val) => handleToggleActive(item.id, val)}
          trackColor={{ false: '#767577', true: COLORS.primary }}
          thumbColor={item.active ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Status</Text>
          <Text style={[styles.statValue, { color: item.active ? COLORS.primary : COLORS.danger }]}>
            {item.active ? 'ACTIVE' : 'SUSPENDED'}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Commission</Text>
          <Text style={styles.statValue}>{item.commissionRate}%</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Capacity</Text>
          <Text style={styles.statValue}>{item.storeCapacity || 100} orders</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Ionicons name="time-outline" size={14} color={COLORS.textMuted} style={{ marginRight: 6 }} />
        <Text style={styles.hoursText}>Working Hours: {item.operatingHours}</Text>
      </View>
    </GlassyCard>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={26} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Vendor Management</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <FlatList 
        data={vendors}
        renderItem={renderVendorItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20 }}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No vendors onboarded yet.</Text>
          </View>
        }
      />

      {/* Add Vendor Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Onboard New Grocery Vendor</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={26} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.label}>Vendor Store Name</Text>
              <TextInput 
                style={styles.input}
                placeholder="Enter shop name (e.g. Reliance Fresh)"
                placeholderTextColor={COLORS.textMuted}
                value={newVendor.name}
                onChangeText={text => setNewVendor(p => ({ ...p, name: text }))}
              />

              <Text style={styles.label}>Authorized Owner Name</Text>
              <TextInput 
                style={styles.input}
                placeholder="Owner full name"
                placeholderTextColor={COLORS.textMuted}
                value={newVendor.ownerName}
                onChangeText={text => setNewVendor(p => ({ ...p, ownerName: text }))}
              />

              <Text style={styles.label}>Phone Number</Text>
              <TextInput 
                style={styles.input}
                placeholder="10 digit phone number"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                value={newVendor.phone}
                onChangeText={text => setNewVendor(p => ({ ...p, phone: text }))}
              />

              <Text style={styles.label}>Email Address</Text>
              <TextInput 
                style={styles.input}
                placeholder="vendor@domain.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={newVendor.email}
                onChangeText={text => setNewVendor(p => ({ ...p, email: text }))}
              />

              <Text style={styles.label}>Password</Text>
              <TextInput 
                style={styles.input}
                placeholder="Create vendor login password"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                autoCapitalize="none"
                value={newVendor.password}
                onChangeText={text => setNewVendor(p => ({ ...p, password: text }))}
              />

              <Text style={styles.label}>Platform Commission rate (%)</Text>
              <TextInput 
                style={styles.input}
                placeholder="Commission percent (e.g. 8)"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                value={newVendor.commissionRate}
                onChangeText={text => setNewVendor(p => ({ ...p, commissionRate: text }))}
              />

              <Text style={styles.label}>Working Timings</Text>
              <TextInput 
                style={styles.input}
                placeholder="e.g. 08:00 AM - 10:00 PM"
                placeholderTextColor={COLORS.textMuted}
                value={newVendor.operatingHours}
                onChangeText={text => setNewVendor(p => ({ ...p, operatingHours: text }))}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleAddVendor}>
                <Text style={styles.submitBtnText}>Onboard Store Partner</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '900', color: '#ffffff' },
  vendorCard: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(0,184,148,0.15)', justifyContent: 'center', alignItems: 'center' },
  vendorName: { fontSize: 15, fontWeight: '900', color: '#ffffff' },
  ownerText: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border, paddingVertical: 10, marginVertical: 12 },
  statBox: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 14, fontWeight: '900', color: '#ffffff', marginTop: 4 },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  hoursText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.textMuted, marginTop: 10, fontSize: 14 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 25, borderTopRightRadius: 25, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  modalScroll: { padding: 20 },
  label: { fontSize: 12, fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', marginBottom: 8, marginTop: 12 },
  input: { height: 50, backgroundColor: COLORS.inputBg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 15, color: '#ffffff', fontSize: 14, marginBottom: 15 },
  submitBtn: { height: 52, backgroundColor: COLORS.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 25, marginBottom: 40 },
  submitBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' }
});
