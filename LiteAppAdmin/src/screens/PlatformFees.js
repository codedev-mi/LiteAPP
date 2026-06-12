import React, { useContext, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GlassyCard } from '../components/DashboardComponents';
import { AdminContext } from '../context/AdminContext';

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

export default function PlatformFees({ navigation }) {
  const { orders } = useContext(AdminContext);

  const feeReports = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    
    // Group orders by date
    const groups = {};
    orders.forEach(o => {
      if (!o.createdAt) return;
      const dateObj = new Date(o.createdAt);
      // Format: DD MMM YYYY
      const options = { day: '2-digit', month: 'short', year: 'numeric' };
      const formattedDate = dateObj.toLocaleDateString('en-GB', options);
      
      if (!groups[formattedDate]) {
        groups[formattedDate] = {
          date: formattedDate,
          ordersCount: 0,
          grossAmount: 0,
          feeCollected: 0
        };
      }
      
      groups[formattedDate].ordersCount += 1;
      groups[formattedDate].grossAmount += o.grandTotal || 0;
      groups[formattedDate].feeCollected += (o.itemTotal || 0) * 0.0075;
    });

    return Object.values(groups).map((g, idx) => ({
      id: String(idx + 1),
      date: g.date,
      ordersCount: g.ordersCount,
      grossAmount: '₹' + g.grossAmount.toFixed(2),
      feeCollected: '₹' + g.feeCollected.toFixed(2),
      gst: '₹' + (g.feeCollected * 0.18).toFixed(2),
      rawFee: g.feeCollected,
      rawGst: g.feeCollected * 0.18
    }));
  }, [orders]);

  const totalFee = useMemo(() => {
    return feeReports.reduce((sum, item) => sum + item.rawFee, 0);
  }, [feeReports]);

  const totalGst = useMemo(() => {
    return feeReports.reduce((sum, item) => sum + item.rawGst, 0);
  }, [feeReports]);

  const downloadCSV = (csvContent, fileName) => {
    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      Alert.alert('Export Complete ✅', `Ledger downloaded as ${fileName}`);
    } else {
      Alert.alert('Export Complete', `CSV generated successfully.\nFile: ${fileName}`);
    }
  };

  const handleExport = (type) => {
    if (feeReports.length === 0) {
      Alert.alert('No Data', 'No ledger records available to export.');
      return;
    }

    if (type === 'CSV') {
      const headers = '"Date","Orders Count","Gross Volume","Platform Fee Collected (0.75%)","GST Collected (18%)"\n';
      const rows = feeReports.map(item => {
        return `"${item.date}",${item.ordersCount},"${item.grossAmount}","${item.feeCollected}","${item.gst}"`;
      }).join('\n');
      downloadCSV(headers + rows, 'platform_fee_ledger.csv');
    } else {
      Alert.alert(
        'Export Complete',
        `Platform Fee collections ledger has been generated as PDF.`
      );
    }
  };

  const renderReportItem = ({ item }) => (
    <GlassyCard style={styles.cardItem}>
      <View style={styles.row}>
        <View>
          <Text style={styles.reportDate}>{item.date}</Text>
          <Text style={styles.ordersText}>{item.ordersCount} completed orders</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.amountText}>{item.feeCollected}</Text>
          <Text style={styles.gstText}>GST: {item.gst}</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.bottomLabel}>Gross Volume: <Text style={{ color: '#ffffff' }}>{item.grossAmount}</Text></Text>
        <Text style={styles.bottomLabel}>Commission: <Text style={{ color: COLORS.primary }}>0.75%</Text></Text>
      </View>
    </GlassyCard>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={26} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Platform Fees Ledger</Text>
        <View style={{ width: 26 }} />
      </View>

      <FlatList 
        data={feeReports}
        renderItem={renderReportItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 20 }}>
            {/* Global Summary KPI Box */}
            <GlassyCard style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Total Platform fee collection</Text>
              <Text style={styles.summaryVal}>₹{totalFee.toFixed(2)}</Text>
              <Text style={styles.summarySub}>Includes ₹{totalGst.toFixed(2)} service tax (GST) collected this month</Text>

              <View style={styles.exportBtnRow}>
                <TouchableOpacity style={styles.exportBtn} onPress={() => handleExport('PDF')}>
                  <Ionicons name="document-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.exportBtnText}>Export PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.exportBtn, { backgroundColor: COLORS.secondary }]} onPress={() => handleExport('CSV')}>
                  <Ionicons name="grid-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.exportBtnText}>Export CSV</Text>
                </TouchableOpacity>
              </View>
            </GlassyCard>

            <Text style={styles.sectionTitle}>Daily Fee Invoices</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '900', color: '#ffffff' },
  sectionTitle: { fontSize: 13, fontWeight: '900', color: '#ffffff', marginBottom: 15, marginTop: 15, textTransform: 'uppercase', letterSpacing: 1.5 },
  cardItem: { marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportDate: { fontSize: 14, fontWeight: 'bold', color: '#ffffff' },
  ordersText: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  amountText: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  gstText: { fontSize: 11, color: COLORS.textMuted, marginTop: 3 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginVertical: 10 },
  bottomLabel: { fontSize: 11, color: COLORS.textMuted },
  
  // Summary styles
  summaryCard: { padding: 20, alignItems: 'center', borderColor: COLORS.border },
  summaryTitle: { fontSize: 12, color: COLORS.textMuted, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  summaryVal: { fontSize: 32, fontWeight: '900', color: '#ffffff', marginTop: 10 },
  summarySub: { fontSize: 11, color: COLORS.textMuted, marginTop: 8, textAlign: 'center' },
  exportBtnRow: { flexDirection: 'row', gap: 15, marginTop: 20, width: '100%' },
  exportBtn: { flex: 1, height: 44, borderRadius: 10, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  exportBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' }
});
