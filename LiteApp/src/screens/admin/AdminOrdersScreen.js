import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppContext } from '../../context/AppContext';
import { Ionicons } from '@expo/vector-icons';

export default function AdminOrdersScreen({ navigation }) {
  const { fetchAdminOrders, updateOrderStatus, theme } = useContext(AppContext);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = async () => {
    setIsLoading(true);
    const data = await fetchAdminOrders();
    setOrders(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusUpdate = (orderId, currentStatus) => {
    const statuses = ['Preparing', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'];
    
    Alert.alert(
      'Update Status',
      'Select new status for this order:',
      statuses.map(status => ({
        text: status,
        onPress: async () => {
          const updated = await updateOrderStatus(orderId, status);
          if (updated) {
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
          }
        }
      })).concat([{ text: 'Cancel', style: 'cancel' }])
    );
  };

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.customerName}>{item.user.name}</Text>
          <Text style={styles.phoneText}>{item.user.phone}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'Preparing' ? '#fff3e0' : '#e8f5e9' }]}>
          <Text style={[styles.statusText, { color: item.status === 'Preparing' ? '#ef6c00' : '#2e7d32' }]}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.divider} />
      
      <View style={styles.itemsList}>
        {item.orderItems.map((oi, idx) => (
          <Text key={idx} style={styles.itemText}>• {oi.quantity} x {oi.productVariant?.product?.name || 'Deleted Product'} ({oi.productVariant?.packSize || 'N/A'})</Text>
        ))}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.totalText}>Total: ₹{item.grandTotal}</Text>
        <TouchableOpacity 
          style={styles.updateBtn} 
          onPress={() => handleStatusUpdate(item.id, item.status)}
        >
          <Text style={styles.updateBtnText}>Update Status</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Customer Orders</Text>
        <TouchableOpacity onPress={loadOrders}>
          <Ionicons name="refresh" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#00b894" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item.id}
          renderItem={renderOrderItem}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No orders found.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  orderCard: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customerName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  phoneText: { fontSize: 12, color: '#666', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 12 },
  itemsList: { marginBottom: 15 },
  itemText: { fontSize: 13, color: '#444', marginBottom: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalText: { fontSize: 16, fontWeight: 'bold', color: '#00b894' },
  updateBtn: { backgroundColor: '#333', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  updateBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' }
});
