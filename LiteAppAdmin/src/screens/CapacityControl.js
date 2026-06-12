import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AdminContext } from '../context/AdminContext';
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
  border: '#2d2d2d'
};

export default function CapacityControl({ navigation }) {
  const { apiUrl, saveCapacityConfig } = useContext(AdminContext);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({
    onlineRiders: 0,
    busyRiders: 0,
    storeLoad: 0,
    capacityScore: 100,
    config: {
      radius: 10.0,
      peakHourMultiplier: 1.0,
      emergencyPause: false,
      autoScaling: true,
      weatherMultiplier: 1.0,
      storeLoadThreshold: 50
    }
  });

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/capacity/status`);
      const data = await res.json();
      if (data && data.config) {
        setStatus(data);
      }
    } catch (err) {
      console.log('Error fetching capacity status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleEmergency = async (value) => {
    setLoading(true);
    const res = await saveCapacityConfig({
      ...status.config,
      emergencyPause: value
    });
    if (res.success) {
      setStatus(prev => ({
        ...prev,
        config: { ...prev.config, emergencyPause: value }
      }));
      Alert.alert(
        value ? "🚨 SYSTEM PAUSED" : "✅ SYSTEM RESUMED",
        value ? "New order placements have been temporarily disabled across all platforms." : "Ordering service has been restored."
      );
    } else {
      Alert.alert("Update Failed", res.error || "Could not update config.");
    }
    setLoading(false);
  };

  const handleUpdateConfig = async (key, val) => {
    setLoading(true);
    const newConfig = {
      ...status.config,
      [key]: val
    };
    const res = await saveCapacityConfig(newConfig);
    if (res.success) {
      setStatus(prev => ({
        ...prev,
        config: newConfig
      }));
    } else {
      Alert.alert("Update Failed", res.error || "Could not update config.");
    }
    setLoading(false);
  };

  if (loading && !status.config) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const availableRiders = status.onlineRiders - status.busyRiders;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={26} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Capacity Control Center</Text>
        <TouchableOpacity onPress={fetchStatus} style={styles.menuBtn}>
          <Ionicons name="refresh" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Real-time capacity score badge */}
        <GlassyCard style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Live System Capacity Score</Text>
          <Text style={[styles.scoreValue, { color: status.capacityScore > 70 ? COLORS.primary : status.capacityScore > 30 ? COLORS.warning : COLORS.danger }]}>
            {status.capacityScore}%
          </Text>
          <Text style={styles.scoreDesc}>
            {status.capacityScore > 70 ? 'Operational load is optimal. Normal deliveries.' : 
             status.capacityScore > 30 ? 'Moderate backlog. Mild dispatch delay expected.' : 
             'Severe logistics strain or platform pause active.'}
          </Text>
        </GlassyCard>

        {/* Operations Emergency Override Switch */}
        <GlassyCard style={[styles.overrideCard, status.config.emergencyPause && styles.cardDanger]}>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.overrideTitle}>Emergency Platform Pause</Text>
              <Text style={styles.overrideDesc}>Instantly disable customer checkout during bad weather or severe outages</Text>
            </View>
            <Switch 
              value={status.config.emergencyPause}
              onValueChange={handleToggleEmergency}
              trackColor={{ false: '#767577', true: COLORS.danger }}
              thumbColor={status.config.emergencyPause ? '#fff' : '#f4f3f4'}
            />
          </View>
        </GlassyCard>

        {/* Dynamic dispatch scale toggle */}
        <Text style={styles.sectionTitle}>Tuning & Auto-Scaling</Text>
        <GlassyCard>
          <View style={styles.settingRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.settingName}>Auto-Scale ETA Calculations</Text>
              <Text style={styles.settingSub}>Adjust user-facing ETA dynamically based on active busy riders and preparation backlog</Text>
            </View>
            <Switch 
              value={status.config.autoScaling}
              onValueChange={(val) => handleUpdateConfig('autoScaling', val)}
              trackColor={{ false: '#767577', true: COLORS.primary }}
              thumbColor={status.config.autoScaling ? '#fff' : '#f4f3f4'}
            />
          </View>
        </GlassyCard>

        {/* Peak multiplier tuning options */}
        <Text style={styles.sectionTitle}>Peak Hour Multiplier</Text>
        <GlassyCard>
          <View style={styles.sliderControls}>
            {[1.0, 1.2, 1.5, 2.0].map(val => (
              <TouchableOpacity 
                key={val} 
                style={[styles.sliderOption, status.config.peakHourMultiplier === val && styles.sliderOptionActive]}
                onPress={() => handleUpdateConfig('peakHourMultiplier', val)}
              >
                <Text style={[styles.sliderOptionText, status.config.peakHourMultiplier === val && styles.sliderOptionTextActive]}>
                  {val.toFixed(1)}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.settingSub}>Scales customer delivery charges and increases delivery rewards for online riders.</Text>
        </GlassyCard>

        {/* Weather multiplier tuning options */}
        <Text style={styles.sectionTitle}>Weather Factor Penalty</Text>
        <GlassyCard>
          <View style={styles.sliderControls}>
            {[
              { label: 'Sunny (1.0)', val: 1.0 },
              { label: 'Rainy (0.7)', val: 0.7 },
              { label: 'Storm (0.4)', val: 0.4 }
            ].map(item => (
              <TouchableOpacity 
                key={item.val} 
                style={[styles.sliderOption, status.config.weatherMultiplier === item.val && styles.sliderOptionActive]}
                onPress={() => handleUpdateConfig('weatherMultiplier', item.val)}
              >
                <Text style={[styles.sliderOptionText, status.config.weatherMultiplier === item.val && styles.sliderOptionTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.settingSub}>Lower weather multipliers restrict courier capacity index and flag warnings on user screens.</Text>
        </GlassyCard>

        {/* Store Load Threshold */}
        <Text style={styles.sectionTitle}>Backlog Load Threshold</Text>
        <GlassyCard>
          <View style={styles.sliderControls}>
            {[10, 30, 50, 80].map(val => (
              <TouchableOpacity 
                key={val} 
                style={[styles.sliderOption, status.config.storeLoadThreshold === val && styles.sliderOptionActive]}
                onPress={() => handleUpdateConfig('storeLoadThreshold', val)}
              >
                <Text style={[styles.sliderOptionText, status.config.storeLoadThreshold === val && styles.sliderOptionTextActive]}>
                  {val} orders
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.settingSub}>Maximum preparation capacity before the system triggers dynamic checkout warnings.</Text>
        </GlassyCard>

        {/* Courier Fleet Availability overview */}
        <Text style={styles.sectionTitle}>Active Fleet Status</Text>
        <GlassyCard style={{ marginBottom: 40 }}>
          <View style={styles.utilRow}>
            <Text style={styles.utilLabel}>Online Couriers</Text>
            <Text style={styles.utilVal}>{status.onlineRiders}</Text>
          </View>
          <View style={styles.utilRow}>
            <Text style={styles.utilLabel}>Available (Idle)</Text>
            <Text style={[styles.utilVal, { color: COLORS.primary }]}>{availableRiders < 0 ? 0 : availableRiders}</Text>
          </View>
          <View style={styles.utilRow}>
            <Text style={styles.utilLabel}>Busy (In Transit)</Text>
            <Text style={[styles.utilVal, { color: COLORS.warning }]}>{status.busyRiders}</Text>
          </View>
          <View style={styles.utilRow}>
            <Text style={styles.utilLabel}>Live Store Orders Load</Text>
            <Text style={[styles.utilVal, { color: COLORS.secondary }]}>{status.storeLoad} active</Text>
          </View>
        </GlassyCard>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loaderContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '900', color: '#ffffff' },
  scrollContent: { padding: 20 },
  scoreCard: { alignItems: 'center', paddingVertical: 20, marginBottom: 15, borderColor: COLORS.border },
  scoreLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  scoreValue: { fontSize: 48, fontWeight: '900', marginTop: 10, marginBottom: 5 },
  scoreDesc: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 15, lineHeight: 18 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#ffffff', marginBottom: 12, marginTop: 18, textTransform: 'uppercase', letterSpacing: 1.5 },
  overrideCard: { borderColor: COLORS.border },
  cardDanger: { borderColor: COLORS.danger, backgroundColor: 'rgba(255,118,117,0.05)' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overrideTitle: { fontSize: 15, fontWeight: '900', color: '#ffffff' },
  overrideDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, lineHeight: 16 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingName: { fontSize: 14, fontWeight: '800', color: '#ffffff' },
  settingSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 6, lineHeight: 16 },
  sliderControls: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  sliderOption: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center' },
  sliderOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sliderOptionText: { color: COLORS.textMuted, fontWeight: 'bold', fontSize: 13 },
  sliderOptionTextActive: { color: '#ffffff' },
  utilRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  utilLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  utilVal: { fontSize: 14, fontWeight: 'bold', color: '#ffffff' }
});
