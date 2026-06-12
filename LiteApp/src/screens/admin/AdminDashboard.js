import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppContext } from '../../context/AppContext';

export default function AdminDashboard({ navigation }) {
  const { logout, fetchAdminStats, seedProducts } = useContext(AppContext);
  const [isSeeding, setIsSeeding] = useState(false);
  const [stats, setStats] = useState({ totalRevenue: '0', totalUsers: 0, totalOrders: 0, activeArea: 'Loading...' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const data = await fetchAdminStats();
    if (data) setStats(data);
    setIsLoading(false);
  };

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      await seedProducts();
      Alert.alert('Success', 'Seeded 50 products to Database!');
      loadStats();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#1a1a1a' }]}>
      <View style={styles.header}>
        <Text style={styles.ownerTitle}>Admin God-View</Text>
        <TouchableOpacity onPress={loadStats}>
          <Text style={{ color: '#00b894', fontWeight: 'bold' }}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.adminCard}>
          <Text style={styles.cardLabel}>Total Revenue</Text>
          <Text style={styles.boldText}>₹{stats.totalRevenue}</Text>
        </View>
        <View style={styles.adminCard}>
          <Text style={styles.cardLabel}>Active Users</Text>
          <Text style={styles.boldText}>{stats.totalUsers}</Text>
        </View>
        <View style={styles.adminCard}>
          <Text style={styles.cardLabel}>Total Orders</Text>
          <Text style={styles.boldText}>{stats.totalOrders}</Text>
        </View>
        <View style={styles.adminCard}>
          <Text style={styles.cardLabel}>Active Area</Text>
          <Text style={styles.boldText}>{stats.activeArea}</Text>
        </View>

        <TouchableOpacity style={styles.adminCard} onPress={() => navigation.navigate('AdminOrders')}>
          <Text style={styles.boldText}>📦 View & Manage All Orders</Text>
          <Text style={{ fontSize: 11, color: '#666', marginTop: 5 }}>Update status, track deliveries, and manage returns.</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.seedBtn} 
          onPress={handleSeed}
          disabled={isSeeding}
        >
          {isSeeding ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Seed 50 Mock Products</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={logout} style={{ marginTop: 40, marginBottom: 40 }}>
          <Text style={{ color: '#ff4757', textAlign: 'center', fontSize: 16, fontWeight: 'bold' }}>Logout Admin</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingTop: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  ownerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  adminCard: { backgroundColor: 'white', padding: 20, borderRadius: 18, marginBottom: 15, elevation: 4 },
  cardLabel: { fontSize: 12, color: '#999', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 5 },
  boldText: { fontWeight: '900', fontSize: 18, color: '#2d3436' },
  seedBtn: { backgroundColor: '#e74c3c', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 20 },
});