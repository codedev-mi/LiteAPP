import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Switch, TouchableOpacity, Alert, RefreshControl } from 'react-native';
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

export default function CustomerManagement({ navigation }) {
  const { customers, fetchCustomers, toggleCustomerStatus, toggleCustomerVip, adjustWallet } = useContext(AdminContext);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  };

  const handleToggleBlock = async (id, val) => {
    const res = await toggleCustomerStatus(id, val);
    if (res.success) {
      Alert.alert(
        val ? "Customer Activated" : "Customer Blocked",
        `Account status updated successfully.`
      );
    } else {
      Alert.alert("Update Failed", "Could not change status.");
    }
  };

  const handleAdjustWallet = (item) => {
    Alert.alert(
      'Customer Controls',
      `Manage wallet and membership for ${item.name}`,
      [
        { text: 'Add ₹100', onPress: async () => {
          const res = await adjustWallet(item.id, 'user', 'CUSTOMER', 100, 'CREDIT', 'Loyalty adjustments');
          if (res.success) {
            Alert.alert('Wallet Updated', 'Credits added successfully.');
          } else {
            Alert.alert('Failed', res.error || 'Server error.');
          }
        }},
        { text: 'Deduct ₹100', onPress: async () => {
          const res = await adjustWallet(item.id, 'user', 'CUSTOMER', 100, 'DEBIT', 'Debit adjustments');
          if (res.success) {
            Alert.alert('Wallet Updated', 'Credits deducted successfully.');
          } else {
            Alert.alert('Failed', res.error || 'Server error.');
          }
        }},
        { text: item.isVip ? 'Remove VIP Status' : 'Make VIP Member', onPress: async () => {
          const res = await toggleCustomerVip(item.id, !item.isVip);
          if (res.success) {
            Alert.alert('VIP Status Updated', `VIP status ${!item.isVip ? 'granted' : 'revoked'}.`);
          } else {
            Alert.alert('Failed', res.error || 'Server error.');
          }
        }},
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const filtered = (customers || []).filter(c => 
    (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.phone || '').includes(search)
  );

  const renderCustomerItem = ({ item }) => {
    const isActive = item.status !== 'BLOCKED';
    return (
      <GlassyCard style={styles.cardItem}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarBox}>
            <Ionicons name="person" size={20} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.custName}>{item.name}</Text>
              {item.isVip && (
                <View style={styles.vipBadge}>
                  <Ionicons name="crown" size={10} color="#fff" style={{ marginRight: 2 }} />
                  <Text style={styles.vipText}>VIP</Text>
                </View>
              )}
              {item.repeatUser && (
                <View style={styles.repeatBadge}>
                  <Text style={styles.repeatText}>LOYAL</Text>
                </View>
              )}
            </View>
            <Text style={styles.subText}>{item.phone} | {item.email}</Text>
          </View>
          <Switch 
            value={isActive} 
            onValueChange={(val) => handleToggleBlock(item.id, val)}
            trackColor={{ false: '#767577', true: COLORS.primary }}
            thumbColor={isActive ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statBox} onPress={() => handleAdjustWallet(item)}>
            <Text style={styles.statLabel}>Wallet Balance</Text>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>{item.wallet || '₹0.00'} ✎</Text>
          </TouchableOpacity>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Loyalty Points</Text>
            <Text style={styles.statValue}>{item.points || 0} pts</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Status</Text>
            <Text style={[styles.statValue, { color: isActive ? COLORS.primary : COLORS.danger }]}>{isActive ? 'Active' : 'Blocked'}</Text>
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
        <Text style={styles.title}>Customer Directory</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} style={{ marginRight: 10 }} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search by consumer name or phone number..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList 
        data={filtered}
        renderItem={renderCustomerItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#fff" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No customers registered yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '900', color: '#ffffff' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, margin: 20, borderRadius: 15, paddingHorizontal: 15, height: 50 },
  searchInput: { flex: 1, color: '#ffffff', fontSize: 14 },
  cardItem: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,184,148,0.15)', justifyContent: 'center', alignItems: 'center' },
  custName: { fontSize: 15, fontWeight: '900', color: '#ffffff' },
  repeatBadge: { marginLeft: 8, backgroundColor: 'rgba(9, 132, 227, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  repeatText: { color: COLORS.secondary, fontSize: 8, fontWeight: 'bold' },
  vipBadge: { marginLeft: 8, backgroundColor: 'rgba(253, 203, 110, 0.25)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center' },
  vipText: { color: COLORS.warning, fontSize: 8, fontWeight: 'bold' },
  subText: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingVertical: 10, marginTop: 12 },
  statBox: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 14, fontWeight: '900', color: '#ffffff', marginTop: 4 },
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.textMuted, marginTop: 10, fontSize: 14 }
});
