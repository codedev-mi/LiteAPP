import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, FlatList } from 'react-native';
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

export default function SecuritySettings({ navigation }) {
  const [elevatedMode, setElevatedMode] = useState(false);
  const [rolePermissions, setRolePermissions] = useState({
    MasterAdmin: 'All modules, settings, code keys',
    OpsAdmin: 'Deliveries, dispatch rules, vendor status',
    Support: 'Customer profiles, wallet edits, refund requests',
    VendorMgr: 'Product listings, pricing, category updates'
  });

  const auditLogs = [
    { time: '17:01:42', action: 'Rider Rahul verified', actor: 'MasterAdmin', ip: '10.158.0.38' },
    { time: '16:45:12', action: 'Emergency Pause activated', actor: 'OpsAdmin', ip: '10.158.0.38' },
    { time: '16:30:05', action: 'Adjusted customer Shree wallet (+₹100)', actor: 'Support', ip: '10.158.0.38' }
  ];

  const handleBackupDb = () => {
    Alert.alert('Database Backup 💾', 'Diagnostic SQL database backup completed successfully. Snapshot saved to AWS S3 storage.');
  };

  const handleRollbackKey = () => {
    Alert.alert('Developer Credentials 🔑', 'API authorization tokens rolled back. New credential headers published.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={26} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Security & Access Control</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Role Based Access (RBAC) */}
        <Text style={styles.sectionTitle}>Role Permissions (RBAC)</Text>
        <GlassyCard>
          {Object.keys(rolePermissions).map((role) => (
            <View key={role} style={styles.roleRow}>
              <View style={styles.roleHeader}>
                <Ionicons name="shield-half" size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={styles.roleName}>{role}</Text>
              </View>
              <Text style={styles.roleDetails}>{rolePermissions[role]}</Text>
            </View>
          ))}
        </GlassyCard>

        {/* Elevated Dev switches */}
        <Text style={styles.sectionTitle}>Elevated Operations Console</Text>
        <GlassyCard style={styles.elevatedCard}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1, marginRight: 15 }}>
              <Text style={styles.settingName}>Enable Developer Controls</Text>
              <Text style={styles.settingSub}>Allows manual database backups, log dumps, and API credential management</Text>
            </View>
            <Switch 
              value={elevatedMode}
              onValueChange={setElevatedMode}
              trackColor={{ false: '#767577', true: COLORS.danger }}
              thumbColor={elevatedMode ? '#fff' : '#f4f3f4'}
            />
          </View>

          {elevatedMode && (
            <View style={styles.devControlsBox}>
              <View style={styles.devDivider} />
              <Text style={styles.devSectionHeading}>Diagnostic DB Actions</Text>
              
              <View style={styles.devBtnRow}>
                <TouchableOpacity style={styles.devBtn} onPress={handleBackupDb}>
                  <Ionicons name="cloud-upload-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.devBtnText}>Backup Database</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.devBtn, { backgroundColor: COLORS.danger }]} onPress={handleRollbackKey}>
                  <Ionicons name="key-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.devBtnText}>Rollback API Keys</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </GlassyCard>

        {/* Operations audit trail */}
        <Text style={styles.sectionTitle}>System Audit Logs</Text>
        <GlassyCard>
          {auditLogs.map((log, idx) => (
            <View key={idx} style={[styles.logRow, idx === auditLogs.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={styles.logHeader}>
                <Text style={styles.logTime}>{log.time}</Text>
                <Text style={styles.logActor}>{log.actor}</Text>
              </View>
              <Text style={styles.logAction}>{log.action}</Text>
              <Text style={styles.logIp}>IP Address: {log.ip}</Text>
            </View>
          ))}
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
  roleRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  roleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  roleName: { fontSize: 14, fontWeight: '900', color: '#ffffff' },
  roleDetails: { fontSize: 12, color: COLORS.textMuted, lineHeight: 16 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingName: { fontSize: 14, fontWeight: '800', color: '#ffffff' },
  settingSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, lineHeight: 16 },
  
  // Developer Mode Panel
  elevatedCard: { borderColor: COLORS.border },
  devControlsBox: { marginTop: 15 },
  devDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  devSectionHeading: { fontSize: 12, fontWeight: '800', color: COLORS.danger, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  devBtnRow: { flexDirection: 'row', gap: 10 },
  devBtn: { flex: 1, height: 44, borderRadius: 10, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  devBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  
  // Audit Logs
  logRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  logTime: { fontSize: 11, color: COLORS.textMuted, fontWeight: 'bold' },
  logActor: { fontSize: 11, color: COLORS.primary, fontWeight: 'bold' },
  logAction: { fontSize: 13, fontWeight: 'bold', color: '#ffffff' },
  logIp: { fontSize: 10, color: COLORS.textMuted, marginTop: 4 }
});
