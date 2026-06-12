import React, { useContext, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppContext } from '../../context/AppContext';

export default function ProfileScreen({ navigation }) {
  const { currentUser, logout, theme, walletBalance, fetchWallet } = useContext(AppContext);

  useEffect(() => {
    fetchWallet();
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backBtn, { color: theme.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ padding: 20 }}>
        <View style={[styles.profileCard, { backgroundColor: theme.card }]}>
          <View style={[styles.avatar, { backgroundColor: theme.background }]}>
            {currentUser?.photo ? (
              <Image source={{ uri: currentUser.photo }} style={styles.avatarImg} />
            ) : (
              <Text style={{ fontSize: 30 }}>👤</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: theme.text }]}>{currentUser?.name || 'User'}</Text>
            <Text style={[styles.phone, { color: theme.subText }]}>+91 {currentUser?.phone || ''}</Text>
            {currentUser?.city && <Text style={[styles.cityText, { color: theme.primary }]}>📍 {currentUser.city}</Text>}
          </View>
          <TouchableOpacity 
            style={[styles.editBtn, { backgroundColor: theme.primary }]} 
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>


        <Text style={[styles.sectionTitle, { color: theme.subText }]}>My Activity</Text>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]} onPress={() => navigation.navigate('Orders')}>
          <Text style={[styles.menuText, { color: theme.text }]}>📦 Orders</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('AddressList')}>
          <Text style={styles.menuText}>📍 Saved Addresses</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Favourites')}>
          <Text style={styles.menuText}>❤️ Favorites</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Wallet')}>
          <Text style={styles.menuText}>👛 Wallet (₹{walletBalance.toFixed(2)})</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Payments')}>
          <Text style={styles.menuText}>💳 Payment Methods</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Help & Support</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('FAQ')}>
          <Text style={styles.menuText}>❓ FAQ</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('CustomerCare')}>
          <Text style={styles.menuText}>📞 Customer Care</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.logoutBtn} 
          onPress={logout}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9f9f9', paddingTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 10, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee' },
  backBtn: { fontSize: 16, color: '#4CAF50', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 2, marginBottom: 30 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 15, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%', borderRadius: 30 },
  name: { fontSize: 20, fontWeight: 'bold' },
  phone: { fontSize: 14, color: '#666', marginTop: 5 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#555' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'white', padding: 18, borderRadius: 10, marginBottom: 10 },
  menuText: { fontSize: 16, fontWeight: '500' },
  chevron: { fontSize: 20, color: '#999' },
  logoutBtn: { backgroundColor: '#ffebee', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 30, marginBottom: 50 },
  logoutText: { color: '#d32f2f', fontWeight: 'bold', fontSize: 16 },
  editBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  editBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  cityText: { fontSize: 12, color: '#4CAF50', fontWeight: '600', marginTop: 4 },
});
