import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export default function PromotionsManagement({ navigation }) {
  const [promos, setPromos] = useState([
    { id: '1', code: 'FRESH50', type: 'PERCENT', value: 50, desc: 'Get 50% off up to ₹100 on first 3 orders', cap: 100, redemptions: 142, active: true },
    { id: '2', code: 'FLAT120', type: 'FLAT', value: 120, desc: 'Flat ₹120 off on orders above ₹800', cap: 120, redemptions: 89, active: true },
    { id: '3', code: 'BOGOMILK', type: 'BOGO', value: 0, desc: 'Buy 1 Get 1 Free on Fresh Milk 1L', cap: 0, redemptions: 34, active: false }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newPromo, setNewPromo] = useState({ code: '', type: 'PERCENT', value: '', desc: '', cap: '', active: true });

  const handleTogglePromo = (id, val) => {
    setPromos(prev => prev.map(p => p.id === id ? { ...p, active: val } : p));
  };

  const handleAddPromo = () => {
    if (!newPromo.code || !newPromo.desc) {
      Alert.alert('Fields Required', 'Please enter promo code and description.');
      return;
    }

    const added = {
      id: String(promos.length + 1),
      code: newPromo.code.toUpperCase(),
      type: newPromo.type,
      value: parseInt(newPromo.value) || 0,
      desc: newPromo.desc,
      cap: parseInt(newPromo.cap) || 0,
      redemptions: 0,
      active: true
    };

    setPromos(prev => [...prev, added]);
    setShowAddModal(false);
    setNewPromo({ code: '', type: 'PERCENT', value: '', desc: '', cap: '', active: true });
    Alert.alert('Promo Created 🎉', `Promo code ${added.code} is now live.`);
  };

  const renderPromoItem = ({ item }) => (
    <GlassyCard style={styles.promoCard}>
      <View style={styles.cardHeader}>
        <View style={styles.promoBox}>
          <Text style={styles.promoCodeText}>{item.code}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={styles.promoType}>{item.type === 'PERCENT' ? `${item.value}% Discount` : item.type === 'FLAT' ? `Flat ₹${item.value} Off` : 'BOGO (Buy 1 Get 1)'}</Text>
          <Text style={styles.descText}>{item.desc}</Text>
        </View>
        <Switch 
          value={item.active} 
          onValueChange={(val) => handleTogglePromo(item.id, val)}
          trackColor={{ false: '#767577', true: COLORS.primary }}
          thumbColor={item.active ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Redemptions</Text>
          <Text style={styles.statValue}>{item.redemptions}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Max Discount Cap</Text>
          <Text style={styles.statValue}>{item.cap > 0 ? `₹${item.cap}` : 'No Limit'}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Status</Text>
          <Text style={[styles.statValue, { color: item.active ? COLORS.primary : COLORS.danger }]}>{item.active ? 'Active' : 'Disabled'}</Text>
        </View>
      </View>
    </GlassyCard>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={26} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Promotions & Coupons</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <FlatList 
        data={promos}
        renderItem={renderPromoItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20 }}
      />

      {/* Add Promo modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Promotional Coupon</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={26} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.label}>Coupon Code</Text>
              <TextInput 
                style={styles.input}
                placeholder="e.g. MONSOON200"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="characters"
                value={newPromo.code}
                onChangeText={text => setNewPromo(p => ({ ...p, code: text }))}
              />

              <Text style={styles.label}>Promo Code Type</Text>
              <View style={styles.typeRow}>
                {['PERCENT', 'FLAT', 'BOGO'].map(t => (
                  <TouchableOpacity 
                    key={t} 
                    style={[styles.typeBtn, newPromo.type === t && styles.typeBtnActive]}
                    onPress={() => setNewPromo(p => ({ ...p, type: t }))}
                  >
                    <Text style={[styles.typeBtnText, newPromo.type === t && styles.typeBtnTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Discount Value (₹ or %)</Text>
              <TextInput 
                style={styles.input}
                placeholder="Discount value"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                value={newPromo.value}
                onChangeText={text => setNewPromo(p => ({ ...p, value: text }))}
              />

              <Text style={styles.label}>Max Discount Cap (₹)</Text>
              <TextInput 
                style={styles.input}
                placeholder="e.g. 150 (Enter 0 for unlimited)"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                value={newPromo.cap}
                onChangeText={text => setNewPromo(p => ({ ...p, cap: text }))}
              />

              <Text style={styles.label}>Coupon Terms / Description</Text>
              <TextInput 
                style={styles.input}
                placeholder="Visible description (e.g. Get 20% off up to ₹150)"
                placeholderTextColor={COLORS.textMuted}
                value={newPromo.desc}
                onChangeText={text => setNewPromo(p => ({ ...p, desc: text }))}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleAddPromo}>
                <Text style={styles.submitBtnText}>Publish Coupon Code</Text>
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
  promoCard: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  promoBox: { width: 85, height: 44, borderRadius: 10, backgroundColor: 'rgba(0,184,148,0.15)', borderWidth: 1, borderColor: 'rgba(0,184,148,0.3)', justifyContent: 'center', alignItems: 'center' },
  promoCodeText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 13, letterSpacing: 0.8 },
  promoType: { fontSize: 14, fontWeight: '900', color: '#ffffff' },
  descText: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, lineHeight: 15 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingVertical: 10, marginTop: 12 },
  statBox: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 14, fontWeight: '900', color: '#ffffff', marginTop: 4 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 25, borderTopRightRadius: 25, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  modalScroll: { padding: 20 },
  label: { fontSize: 12, fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', marginBottom: 8, marginTop: 12 },
  input: { height: 50, backgroundColor: COLORS.inputBg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 15, color: '#ffffff', fontSize: 14, marginBottom: 15 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  typeBtn: { flex: 1, height: 45, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  typeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeBtnText: { color: COLORS.textMuted, fontWeight: 'bold', fontSize: 12 },
  typeBtnTextActive: { color: '#ffffff' },
  submitBtn: { height: 52, backgroundColor: COLORS.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 25, marginBottom: 40 },
  submitBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' }
});
