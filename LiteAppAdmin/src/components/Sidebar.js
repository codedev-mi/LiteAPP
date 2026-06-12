import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminContext } from '../context/AdminContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Sidebar(props) {
  const { adminUser, logout } = useContext(AdminContext);

  const menuItems = [
    { name: 'Dashboard', icon: 'grid-outline', screen: 'Dashboard' },
    { name: 'Orders', icon: 'cart-outline', screen: 'Orders' },
    { name: 'Products', icon: 'cube-outline', screen: 'Products' },
    { name: 'Capacity Control', icon: 'speedometer-outline', screen: 'CapacityControl' },
    { name: 'Vendors', icon: 'business-outline', screen: 'Vendors' },
    { name: 'Inventory', icon: 'stats-chart-outline', screen: 'Inventory' },
    { name: 'Categories', icon: 'list-outline', screen: 'Categories' },
    { name: 'Promotions', icon: 'pricetag-outline', screen: 'Promotions' },
    { name: 'Banners', icon: 'image-outline', screen: 'Banners' },
    { name: 'Platform Fees', icon: 'cash-outline', screen: 'PlatformFees' },
    { name: 'Customers', icon: 'people-outline', screen: 'Customers' },
    { name: 'Riders', icon: 'bicycle-outline', screen: 'Riders' },
    { name: 'Reporting', icon: 'document-text-outline', screen: 'Reporting' },
    { name: 'Notifications', icon: 'notifications-outline', screen: 'Notifications' },
    { name: 'Security & Access', icon: 'shield-checkmark-outline', screen: 'Security' },
    { name: 'Alert Settings', icon: 'warning-outline', screen: 'Alert Settings' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#121212' }}>
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Ionicons name="shield-checkmark" size={30} color="#00b894" />
        </View>
        <View>
          <Text style={styles.appName}>LiteApp Admin</Text>
          <Text style={styles.adminRole}>{adminUser?.role || 'Administrator'}</Text>
        </View>
      </View>

      <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.menuSection}>MAIN MENU</Text>
        {menuItems.map((item, index) => {
          const isActive = props?.state?.routes?.[props.state?.index]?.name === item.screen;
          return (
            <TouchableOpacity 
              key={index} 
              style={[styles.menuItem, isActive && styles.activeItem]}
              onPress={() => props.navigation.navigate(item.screen)}
            >
              <Ionicons 
                name={isActive ? item.icon.replace('-outline', '') : item.icon} 
                size={20} 
                color={isActive ? '#ffffff' : '#a0a0a0'} 
              />
              <Text style={[styles.menuText, isActive && styles.activeText]}>{item.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#ff7675" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { 
    padding: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderBottomWidth: 1, 
    borderBottomColor: '#2d2d2d',
    marginBottom: 10
  },
  logoBox: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#1e1e1e', justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 1, borderColor: '#2d2d2d' },
  appName: { fontSize: 16, fontWeight: '900', color: '#ffffff' },
  adminRole: { fontSize: 11, color: '#00b894', fontWeight: 'bold', textTransform: 'uppercase', marginTop: 2 },
  menuScroll: { flex: 1, paddingHorizontal: 15 },
  menuSection: { fontSize: 10, fontWeight: '900', color: '#636e72', marginTop: 15, marginBottom: 10, marginLeft: 10, letterSpacing: 1.5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 4 },
  activeItem: { backgroundColor: '#00b894' },
  menuText: { fontSize: 14, fontWeight: '600', color: '#a0a0a0', marginLeft: 15 },
  activeText: { color: '#ffffff', fontWeight: 'bold' },
  footer: { padding: 15, borderTopWidth: 1, borderTopColor: '#2d2d2d' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  logoutText: { color: '#ff7675', fontWeight: 'bold', marginLeft: 15, fontSize: 14 }
});
