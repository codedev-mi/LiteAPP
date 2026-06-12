import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminContext } from '../context/AdminContext';
import { Ionicons } from '@expo/vector-icons';
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

export default function OrdersManagement({ navigation }) {
  const { orders, fetchOrders, updateOrderStatus, isLoading } = useContext(AdminContext);
  const [filter, setFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const filteredOrders = filter === 'All' 
    ? orders 
    : orders.filter(o => o.status === filter);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Delivered': return '#00b894';
      case 'Preparing': return '#fdcb6e';
      case 'Cancelled': return '#ff4757';
      default: return '#0984e3';
    }
  };

  const handleUpdateStatus = async (id, status) => {
    await updateOrderStatus(id, status);
    setSelectedOrder(null);
  };

  const renderOrderItem = ({ item }) => (
    <GlassyCard style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>#ORD-{item.id.slice(-6).toUpperCase()}</Text>
          <Text style={styles.orderTime}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.orderInfo}>
        <Text style={styles.customerName}>{item.user?.name || 'Guest'}</Text>
        <Text style={styles.orderTotal}>₹{item.grandTotal}</Text>
      </View>

      <TouchableOpacity 
        style={styles.actionBtn}
        onPress={() => setSelectedOrder(item)}
      >
        <Text style={styles.actionBtnText}>Manage Order</Text>
        <Ionicons name="chevron-forward" size={16} color="#00b894" />
      </TouchableOpacity>
    </GlassyCard>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={26} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Orders</Text>
        <TouchableOpacity onPress={fetchOrders}>
          <Ionicons name="refresh" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {['All', 'Preparing', 'Out for Delivery', 'Delivered'].map(f => (
          <TouchableOpacity 
            key={f} 
            style={[styles.filterPill, filter === f && styles.filterPillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchOrders} tintColor="#fff" />}
        ListEmptyComponent={<Text style={styles.emptyText}>No orders found.</Text>}
      />

      {/* Status Update Modal */}
      <Modal visible={!!selectedOrder} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Order Status</Text>
            {['Preparing', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'].map(s => (
              <TouchableOpacity 
                key={s} 
                style={styles.modalOption}
                onPress={() => handleUpdateStatus(selectedOrder.id, s)}
              >
                <Text style={[styles.modalOptionText, selectedOrder?.status === s && { color: '#00b894' }]}>{s}</Text>
                {selectedOrder?.status === s && <Ionicons name="checkmark" size={20} color="#00b894" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedOrder(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 20, 
    alignItems: 'center', 
    backgroundColor: COLORS.card, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  menuBtn: { padding: 4 },
  title: { fontSize: 22, fontWeight: '900', color: '#ffffff' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 10 },
  filterPill: { 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    borderRadius: 20, 
    backgroundColor: COLORS.card, 
    marginRight: 10, 
    borderWidth: 1, 
    borderColor: COLORS.border 
  },
  filterPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  filterTextActive: { color: '#ffffff' },
  orderCard: { marginBottom: 15 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  orderId: { fontSize: 16, fontWeight: '900', color: '#ffffff' },
  orderTime: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  orderInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  customerName: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  orderTotal: { fontSize: 18, fontWeight: '900', color: '#00b894' },
  actionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingTop: 10, 
    borderTopWidth: 1, 
    borderTopColor: COLORS.border 
  },
  actionBtnText: { color: '#00b894', fontWeight: 'bold', marginRight: 5 },
  emptyText: { textAlign: 'center', marginTop: 50, color: COLORS.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#ffffff', marginBottom: 20 },
  modalOption: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 18, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  modalOptionText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  closeBtn: { marginTop: 20, alignItems: 'center', padding: 15 },
  closeBtnText: { color: COLORS.danger, fontWeight: 'bold', fontSize: 16 }
});
