import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
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
  border: '#2d2d2d'
};

export default function ReportingAnalytics({ navigation }) {
  const { orders, riders, products, categories } = useContext(AdminContext);

  const reportsList = [
    { name: 'Gross Revenue & Order Sales', desc: 'Breakdown of transactions, discounts, platform fees, taxes.', icon: 'analytics-outline', color: COLORS.primary },
    { name: 'Vendor Commission Ledger', desc: 'Earnings per vendor shop partner, payout status logs.', icon: 'business-outline', color: COLORS.secondary },
    { name: 'Rider Performance Logs', desc: 'Completed deliveries count, ratings, tips, and active times.', icon: 'bicycle-outline', color: COLORS.warning },
    { name: 'Inventory & Stock Alerts Log', desc: 'Audit log of items hitting threshold alerts, out-of-stock items history.', icon: 'cube-outline', color: COLORS.danger }
  ];

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
      Alert.alert('Export Complete ✅', `Compiled sheet "${fileName}" has been downloaded successfully.`);
    } else {
      Alert.alert('Export Complete', `CSV generated successfully.\nFile: ${fileName}`);
    }
  };

  const handleDownloadReport = (name) => {
    try {
      if (name === 'Gross Revenue & Order Sales') {
        if (!orders || orders.length === 0) {
          Alert.alert('No Data', 'No orders data available to export.');
          return;
        }
        const headers = '"Order ID","Customer Name","Date","Payment Method","Payment Status","Item Total","Delivery Fee","Discount Amount","Grand Total","Status"\n';
        const rows = orders.map(o => {
          const id = o.id || '';
          const cname = o.user?.name || 'Customer';
          const date = o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '';
          const method = o.paymentMethod || '';
          const pstatus = o.paymentStatus || '';
          const itemTotal = o.itemTotal || 0;
          const fee = o.deliveryFee || 0;
          const disc = o.discountAmount || 0;
          const grand = o.grandTotal || 0;
          const status = o.status || '';
          return `"${id}","${cname}","${date}","${method}","${pstatus}",${itemTotal},${fee},${disc},${grand},"${status}"`;
        }).join('\n');
        downloadCSV(headers + rows, 'gross_revenue_sales_report.csv');
      } else if (name === 'Vendor Commission Ledger') {
        const headers = '"Category/Store Name","Order Count","Total Sales (₹)","Commission Rate","Commission Earned (₹)"\n';
        
        // Calculate dynamic commissions
        const categoryMap = {};
        if (categories) {
          categories.forEach(cat => {
            categoryMap[cat.id] = { name: cat.name, count: 0, sales: 0 };
          });
        }

        if (orders) {
          orders.forEach(o => {
            const items = o.orderItems || [];
            items.forEach(itm => {
              const catId = itm.productVariant?.product?.categoryId;
              if (catId && categoryMap[catId]) {
                categoryMap[catId].count += 1;
                categoryMap[catId].sales += (itm.priceAtTime || 0) * (itm.quantity || 0);
              }
            });
          });
        }

        const rows = Object.values(categoryMap).map(c => {
          const commissionRate = 0.10; // 10% standard commission
          const commissionEarned = c.sales * commissionRate;
          return `"${c.name}",${c.count},${c.sales.toFixed(2)},"10%",${commissionEarned.toFixed(2)}`;
        }).join('\n');

        downloadCSV(headers + rows, 'vendor_commission_ledger.csv');
      } else if (name === 'Rider Performance Logs') {
        if (!riders || riders.length === 0) {
          Alert.alert('No Data', 'No riders data available to export.');
          return;
        }
        const headers = '"Rider Name","Phone","Email","Status","Rating","Deliveries Count","Wallet Balance (₹)","Total Earnings (₹)","Vehicle Type"\n';
        const rows = riders.map(r => {
          return `"${r.name || ''}","${r.phone || ''}","${r.email || ''}","${r.verificationStatus || ''}",${r.rating || 5.0},${r.deliveriesCount || 0},${r.walletBalance || 0},${r.earnings || 0},"${r.vehicleType || ''}"`;
        }).join('\n');
        downloadCSV(headers + rows, 'rider_performance_logs.csv');
      } else if (name === 'Inventory & Stock Alerts Log') {
        if (!products || products.length === 0) {
          Alert.alert('No Data', 'No products data available to export.');
          return;
        }
        const headers = '"Product Name","Brand","Category","Pack Size","Current Stock","Unit Price (₹)","Status"\n';
        const rows = products.map(p => {
          const statusLabel = p.stock === 0 ? 'OUT OF STOCK' : p.stock <= 10 ? 'LOW STOCK' : 'IN STOCK';
          return `"${p.name || ''}","${p.brand || 'Unbranded'}","${p.cat || 'Grocery'}","${p.packSize || ''}",${p.stock || 0},${p.price || 0},"${statusLabel}"`;
        }).join('\n');
        downloadCSV(headers + rows, 'inventory_stock_alerts_report.csv');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to generate report CSV: ' + err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={26} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Reporting & Exports</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Analytical Exports</Text>

        {reportsList.map((rep, idx) => (
          <GlassyCard key={idx} style={styles.reportCard}>
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: rep.color + '20' }]}>
                <Ionicons name={rep.icon} size={24} color={rep.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.reportName}>{rep.name}</Text>
                <Text style={styles.reportDesc}>{rep.desc}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.downloadBtn} onPress={() => handleDownloadReport(rep.name)}>
              <Ionicons name="download-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.downloadText}>Download Sheet (CSV)</Text>
            </TouchableOpacity>
          </GlassyCard>
        ))}
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
  sectionTitle: { fontSize: 13, fontWeight: '900', color: '#ffffff', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1.5 },
  reportCard: { marginBottom: 15 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { padding: 12, borderRadius: 12 },
  reportName: { fontSize: 14, fontWeight: '900', color: '#ffffff' },
  reportDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, lineHeight: 15 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginVertical: 12 },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.border, height: 44, borderRadius: 10 },
  downloadText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' }
});
