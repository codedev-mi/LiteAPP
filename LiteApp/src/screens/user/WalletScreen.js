import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../context/AppContext';

export default function WalletScreen({ navigation }) {
  const { walletBalance, walletTransactions, fetchWallet, addWalletMoney } = useContext(AppContext);
  const [addAmount, setAddAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchWallet();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchWallet();
    setIsRefreshing(false);
  };

  const handleAddMoney = async () => {
    const amt = parseFloat(addAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to add.');
      return;
    }

    setIsLoading(true);
    const res = await addWalletMoney(amt);
    setIsLoading(false);

    if (res && !res.error) {
      Alert.alert('Success 🎉', `₹${amt} has been successfully added to your wallet!`);
      setAddAmount('');
    } else {
      Alert.alert('Failed ❌', res?.error || 'Failed to add money. Please try again.');
    }
  };

  const renderTransaction = ({ item }) => {
    const isCredit = item.type === 'CREDIT';
    return (
      <View style={styles.transactionCard}>
        <View style={styles.txnIconBox}>
          <Ionicons 
            name={isCredit ? "arrow-down-outline" : "arrow-up-outline"} 
            size={20} 
            color={isCredit ? "#2ecc71" : "#e74c3c"} 
          />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.txnDesc}>{item.description}</Text>
          <Text style={styles.txnDate}>{new Date(item.createdAt).toLocaleString()}</Text>
          {item.referenceId && <Text style={styles.txnRef}>Ref: {item.referenceId.slice(-8).toUpperCase()}</Text>}
        </View>
        <Text style={[styles.txnAmount, { color: isCredit ? "#2ecc71" : "#e74c3c" }]}>
          {isCredit ? '+' : '-'} ₹{item.amount}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#00b894" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={walletTransactions}
        keyExtractor={item => item.id}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={
          <>
            {/* Balance Card */}
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Text style={styles.balanceValue}>₹{walletBalance.toFixed(2)}</Text>
              <View style={styles.balanceDecoCircle} />
            </View>

            {/* Quick Add Money */}
            <View style={styles.addMoneyCard}>
              <Text style={styles.cardTitle}>Add Money to Wallet</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  value={addAmount}
                  onChangeText={setAddAmount}
                />
              </View>

              {/* Preset Buttons */}
              <View style={styles.presetsRow}>
                {['100', '500', '1000'].map(preset => (
                  <TouchableOpacity 
                    key={preset} 
                    style={styles.presetBtn}
                    onPress={() => setAddAmount(preset)}
                  >
                    <Text style={styles.presetBtnText}>+ ₹{preset}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity 
                style={styles.addBtn} 
                onPress={handleAddMoney}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.addBtnText}>Proceed to Add Money</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.historyTitle}>Transaction History</Text>
          </>
        }
        renderItem={renderTransaction}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={50} color="#b2bec3" />
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderBottomWidth: 1, borderColor: '#f1f2f6' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#2d3436' },
  balanceContainer: {
    backgroundColor: '#00b894',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#00b894',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  balanceValue: { color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 8 },
  balanceDecoCircle: {
    position: 'absolute',
    right: -40,
    bottom: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  addMoneyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#f1f2f6',
    elevation: 2
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2d3436', marginBottom: 15 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#00b894',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#f9f9f9'
  },
  currencySymbol: { fontSize: 20, fontWeight: 'bold', color: '#2d3436', marginRight: 5 },
  amountInput: { flex: 1, height: 50, fontSize: 18, fontWeight: 'bold', color: '#2d3436' },
  presetsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  presetBtn: {
    flex: 1,
    backgroundColor: '#e8fdfa',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#00b894'
  },
  presetBtnText: { color: '#00b894', fontWeight: 'bold', fontSize: 13 },
  addBtn: { backgroundColor: '#00b894', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  historyTitle: { fontSize: 16, fontWeight: 'bold', color: '#2d3436', marginBottom: 12 },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f2f6'
  },
  txnIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center'
  },
  txnDesc: { fontSize: 14, fontWeight: '700', color: '#2d3436' },
  txnDate: { fontSize: 11, color: '#b2bec3', marginTop: 4 },
  txnRef: { fontSize: 10, color: '#999', marginTop: 2, fontFamily: 'monospace' },
  txnAmount: { fontSize: 16, fontWeight: '900' },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#b2bec3', fontSize: 14, marginTop: 8 }
});
