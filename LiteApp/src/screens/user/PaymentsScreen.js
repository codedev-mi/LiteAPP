import React, { useContext, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  FlatList, 
  Alert, 
  Modal, 
  TextInput,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppContext } from '../../context/AppContext';

export default function PaymentsScreen({ navigation }) {
  const { paymentMethods, addPaymentMethod, deletePaymentMethod } = useContext(AppContext);
  const [modalVisible, setModalVisible] = useState(false);
  const [newType, setNewType] = useState('UPI');
  const [newDetail, setNewDetail] = useState('');

  const handleDelete = (id) => {
    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to delete this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          deletePaymentMethod(id);
        }}
      ]
    );
  };

  const handleAdd = async () => {
    if (!newDetail.trim()) {
      Alert.alert('Error', 'Please enter payment details (e.g., UPI ID or Card Number)');
      return;
    }

    const methodData = {
      type: newType,
      name: newType === 'UPI' ? 'UPI / GPay' : newType === 'Credit Card' ? 'Bank Card' : 'Digital Wallet',
      detail: newDetail,
      icon: newType === 'UPI' ? '💳' : newType === 'Credit Card' ? '🏦' : '💰'
    };

    const success = await addPaymentMethod(methodData);
    if (success) {
      setModalVisible(false);
      setNewDetail('');
      Alert.alert('Success', 'New payment method added!');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={paymentMethods}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 60, marginBottom: 20 }}>💸</Text>
            <Text style={styles.emptyTitle}>No saved payment methods</Text>
            <Text style={styles.emptySub}>Add a card or UPI ID for faster checkouts.</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.paymentCard}>
            <View style={styles.iconContainer}>
              <Text style={{ fontSize: 24 }}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.type}>{item.name || item.type}</Text>
              <Text style={styles.detail}>{item.detail}</Text>
            </View>
            <TouchableOpacity 
              style={styles.options} 
              onPress={() => handleDelete(item.id)}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      
      <TouchableOpacity 
        style={styles.addBtn} 
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addBtnText}>+ Add New Payment Method</Text>
      </TouchableOpacity>

      {/* Add Payment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Payment Method</Text>
            
            <View style={styles.selectorRow}>
              {['UPI', 'Credit Card', 'Wallet'].map(t => (
                <TouchableOpacity 
                  key={t} 
                  style={[styles.typePill, newType === t && styles.activePill]}
                  onPress={() => setNewType(t)}
                >
                  <Text style={[styles.pillText, newType === t && styles.activePillText]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder={newType === 'UPI' ? "Enter UPI ID (e.g. user@okaxis)" : "Enter Detail"}
              value={newDetail}
              onChangeText={setNewDetail}
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleAdd}>
                <Text style={styles.confirmText}>Add Method</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', paddingTop: Platform.OS === 'ios' ? 0 : 30 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 20, 
    backgroundColor: 'white', 
    borderBottomWidth: 1, 
    borderColor: '#eee',
    alignItems: 'center'
  },
  backBtn: { fontSize: 16, color: '#4CAF50', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  paymentCard: { 
    flexDirection: 'row', 
    backgroundColor: 'white', 
    padding: 18, 
    borderRadius: 15, 
    marginBottom: 15, 
    alignItems: 'center', 
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  iconContainer: { 
    marginRight: 15, 
    padding: 12, 
    backgroundColor: '#f8f9fa', 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0'
  },
  type: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  detail: { color: '#888', marginTop: 4, fontSize: 14 },
  deleteText: { color: '#ff5252', fontWeight: '600', fontSize: 12 },
  addBtn: { 
    margin: 20, 
    backgroundColor: '#4CAF50', 
    padding: 18, 
    borderRadius: 15, 
    alignItems: 'center',
    elevation: 4
  },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', padding: 25, borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  selectorRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  typePill: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f0f0f0', marginHorizontal: 5 },
  activePill: { backgroundColor: '#4CAF50' },
  pillText: { color: '#666', fontWeight: '600' },
  activePillText: { color: 'white' },
  input: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#eee', marginBottom: 25 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: { flex: 1, padding: 15, alignItems: 'center' },
  cancelText: { color: '#666', fontWeight: 'bold' },
  confirmBtn: { flex: 1, backgroundColor: '#4CAF50', padding: 15, borderRadius: 12, alignItems: 'center' },
  confirmText: { color: 'white', fontWeight: 'bold' },
  
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  emptySub: { fontSize: 14, color: '#999', marginTop: 10, textAlign: 'center', paddingHorizontal: 40 },
});
