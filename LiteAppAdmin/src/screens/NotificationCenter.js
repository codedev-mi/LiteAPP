import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TextInput, TouchableOpacity, Alert } from 'react-native';
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

export default function NotificationCenter({ navigation }) {
  const [triggerLowStock, setTriggerLowStock] = useState(true);
  const [triggerCapacity, setTriggerCapacity] = useState(false);
  const [triggerDelayAlert, setTriggerDelayAlert] = useState(true);
  
  const [smsTemplate, setSmsTemplate] = useState('Alert: Item {{itemName}} is low in stock ({{stockLeft}} units left). Please restock soon.');
  const [whatsappTemplate, setWhatsappTemplate] = useState('Order #{{orderId}} is delayed due to high traffic volume. We are working hard to deliver ASAP!');

  const handleSaveTemplates = () => {
    Alert.alert('Templates Saved ✅', 'System automation message templates have been updated.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={26} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Notification triggers</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Trigger rules list */}
        <Text style={styles.sectionTitle}>System Alert Triggers</Text>
        <GlassyCard>
          <View style={styles.triggerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.triggerName}>Low Stock SMS/WhatsApp Alert</Text>
              <Text style={styles.triggerDesc}>Dispatch alert instantly to store manager when product quantity hits threshold limit</Text>
            </View>
            <Switch 
              value={triggerLowStock}
              onValueChange={setTriggerLowStock}
              trackColor={{ false: '#767577', true: COLORS.primary }}
              thumbColor={triggerLowStock ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.triggerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.triggerName}>Emergency Capacity Pause alert</Text>
              <Text style={styles.triggerDesc}>Broadcast push warning to active riders and store managers on emergency pauses</Text>
            </View>
            <Switch 
              value={triggerCapacity}
              onValueChange={setTriggerCapacity}
              trackColor={{ false: '#767577', true: COLORS.primary }}
              thumbColor={triggerCapacity ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.triggerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.triggerName}>Delivery Delay Customer alert</Text>
              <Text style={styles.triggerDesc}>Auto-send SMS to consumer if order prep takes longer than 15 mins</Text>
            </View>
            <Switch 
              value={triggerDelayAlert}
              onValueChange={setTriggerDelayAlert}
              trackColor={{ false: '#767577', true: COLORS.primary }}
              thumbColor={triggerDelayAlert ? '#fff' : '#f4f3f4'}
            />
          </View>
        </GlassyCard>

        {/* Message editor */}
        <Text style={styles.sectionTitle}>Editable Notification Templates</Text>
        <GlassyCard style={styles.templateCard}>
          <Text style={styles.label}>SMS Alert (Low Stock)</Text>
          <TextInput 
            style={styles.textArea}
            value={smsTemplate}
            onChangeText={setSmsTemplate}
            multiline
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.label}>WhatsApp Alert (Delayed Order)</Text>
          <TextInput 
            style={styles.textArea}
            value={whatsappTemplate}
            onChangeText={setWhatsappTemplate}
            multiline
            placeholderTextColor={COLORS.textMuted}
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTemplates}>
            <Text style={styles.saveBtnText}>Update Message Templates</Text>
          </TouchableOpacity>
        </GlassyCard>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '900', color: '#ffffff' },
  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '900', color: '#ffffff', marginBottom: 15, marginTop: 20, textTransform: 'uppercase', letterSpacing: 1.5 },
  triggerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  triggerName: { fontSize: 14, fontWeight: '800', color: '#ffffff' },
  triggerDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, lineHeight: 15 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 15 },
  templateCard: { padding: 15 },
  label: { fontSize: 12, fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', marginBottom: 8, marginTop: 10 },
  textArea: { backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, height: 75, padding: 12, color: '#ffffff', fontSize: 13, marginBottom: 15, textAlignVertical: 'top' },
  saveBtn: { height: 48, backgroundColor: COLORS.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' }
});
