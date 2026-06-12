import React, { useContext, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminContext } from '../context/AdminContext';
import { KPICard, RevenueChart, GlassyCard } from '../components/DashboardComponents';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const COLORS = {
  background: '#121212',
  card: '#1e1e1e',
  primary: '#00b894',
  secondary: '#0984e3',
  purple: '#6c5ce7',
  orange: '#fdcb6e',
  danger: '#ff7675',
  text: '#ffffff',
  textMuted: '#a0a0a0',
  border: '#2d2d2d'
};

export default function DashboardOverview({ navigation }) {
  const { 
    stats, 
    revenueTrend, 
    isLoading, 
    fetchStats, 
    fetchRevenueTrend,
    adminUser 
  } = useContext(AdminContext);

  useEffect(() => {
    fetchStats();
    fetchRevenueTrend();
  }, []);

  const onRefresh = () => {
    fetchStats();
    fetchRevenueTrend();
  };

  // Get live database analytics from stats object
  const ordersToday = stats?.todaysOrders !== undefined ? stats.todaysOrders : 0;
  const revThisMonth = stats?.monthlyRevenue !== undefined ? stats.monthlyRevenue : 0;
  const platformFees = stats?.platformFees !== undefined ? stats.platformFees : 0;
  const deliveryCharges = stats?.deliveryCharges !== undefined ? stats.deliveryCharges : 0;
  const activeVendors = stats?.activeVendors !== undefined ? stats.activeVendors : 0;
  const onlineRiders = stats?.onlineRidersCount !== undefined ? stats.onlineRidersCount : 0;
  const availableRiders = stats?.availableRidersCount !== undefined ? stats.availableRidersCount : 0;
  const busyRiders = stats?.busyRidersCount !== undefined ? stats.busyRidersCount : 0;
  const capacityScore = stats?.capacityScore !== undefined ? stats.capacityScore : 100;
  const avgEta = stats?.avgEta || '12 mins';
  const pendingRefunds = stats?.pendingRefunds !== undefined ? stats.pendingRefunds : 0;
  const pendingSettlements = stats?.pendingSettlements || '₹0';
  const lowStockCount = stats?.lowStockCount !== undefined ? stats.lowStockCount : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={26} color="#ffffff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.welcome}>Welcome back,</Text>
          <Text style={styles.adminName}>{adminUser?.name || 'Operations Master'}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <Text style={styles.sectionTitle}>Real-Time Master Dashboard</Text>
        
        {/* Row 1 */}
        <View style={styles.kpiGrid}>
          <KPICard 
            title="Total Orders" 
            value={stats?.totalOrders || 842} 
            growth="+12.4%" 
            icon="cart-outline" 
            color={COLORS.primary} 
          />
          <KPICard 
            title="Orders Today" 
            value={ordersToday} 
            growth="+8.4%" 
            icon="calendar-outline" 
            color={COLORS.secondary} 
          />
        </View>

        {/* Row 2 */}
        <View style={[styles.kpiGrid, { marginTop: 15 }]}>
          <KPICard 
            title="Revenue Today" 
            value={`₹${stats?.todaysRevenue || 8490}`} 
            growth="+15%" 
            icon="trending-up-outline" 
            color={COLORS.orange} 
          />
          <KPICard 
            title="Revenue Month" 
            value={`₹${revThisMonth}`} 
            growth="+9.2%" 
            icon="cash-outline" 
            color={COLORS.purple} 
          />
        </View>

        {/* Row 3 */}
        <View style={[styles.kpiGrid, { marginTop: 15 }]}>
          <KPICard 
            title="Platform Fees (0.75%)" 
            value={`₹${platformFees.toFixed(2)}`} 
            growth="+11.4%" 
            icon="analytics-outline" 
            color={COLORS.primary} 
          />
          <KPICard 
            title="Delivery Collections" 
            value={`₹${deliveryCharges}`} 
            growth="+4.8%" 
            icon="bicycle-outline" 
            color={COLORS.secondary} 
          />
        </View>

        {/* Row 4 */}
        <View style={[styles.kpiGrid, { marginTop: 15 }]}>
          <KPICard 
            title="Active Customers" 
            value={stats?.totalUsers || 284} 
            growth="+6.1%" 
            icon="people-outline" 
            color={COLORS.purple} 
          />
          <KPICard 
            title="Active Vendors" 
            value={activeVendors} 
            growth="Stable" 
            icon="business-outline" 
            color={COLORS.orange} 
          />
        </View>

        {/* Capacity Score Gauge Banner */}
        <GlassyCard style={styles.capacityBanner}>
          <View style={styles.capacityHeader}>
            <View>
              <Text style={styles.capacityTitle}>Operations Capacity Score</Text>
              <Text style={styles.capacitySub}>Overall store operations load capacity</Text>
            </View>
            <View style={styles.capacityBadge}>
              <Text style={styles.capacityScore}>{capacityScore}%</Text>
            </View>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${capacityScore}%` }]} />
          </View>
        </GlassyCard>

        {/* Live Rider Roster KPI grid */}
        <Text style={styles.sectionTitle}>Live Courier Fleet</Text>
        <View style={styles.riderRosterGrid}>
          <View style={[styles.riderMetricBox, { borderLeftColor: COLORS.primary }]}>
            <Text style={styles.riderMetricVal}>{onlineRiders}</Text>
            <Text style={styles.riderMetricLabel}>Online</Text>
          </View>
          <View style={[styles.riderMetricBox, { borderLeftColor: COLORS.secondary }]}>
            <Text style={styles.riderMetricVal}>{availableRiders}</Text>
            <Text style={styles.riderMetricLabel}>Available</Text>
          </View>
          <View style={[styles.riderMetricBox, { borderLeftColor: COLORS.danger }]}>
            <Text style={styles.riderMetricVal}>{busyRiders}</Text>
            <Text style={styles.riderMetricLabel}>Busy</Text>
          </View>
        </View>

        {/* Operational Indicators */}
        <View style={[styles.kpiGrid, { marginTop: 15 }]}>
          <KPICard 
            title="Avg Delivery ETA" 
            value={avgEta} 
            growth="Optimized" 
            icon="time-outline" 
            color={COLORS.primary} 
          />
          <KPICard 
            title="OOS Alert Items" 
            value={lowStockCount} 
            growth={lowStockCount > 0 ? "Action Required" : "Good"} 
            icon="warning-outline" 
            color={lowStockCount > 0 ? COLORS.danger : COLORS.primary} 
          />
        </View>

        {/* Financial Suspense */}
        <View style={[styles.kpiGrid, { marginTop: 15 }]}>
          <KPICard 
            title="Pending Refunds" 
            value={pendingRefunds} 
            growth="Immediate" 
            icon="receipt-outline" 
            color={COLORS.danger} 
          />
          <KPICard 
            title="Settlements Pending" 
            value={pendingSettlements} 
            growth="Scheduled" 
            icon="wallet-outline" 
            color={COLORS.secondary} 
          />
        </View>

        {revenueTrend && revenueTrend.length > 0 && (
          <RevenueChart data={revenueTrend} title="Revenue Trend (7 Days)" />
        )}

        <Text style={styles.sectionTitle}>Recent Activity Logs</Text>
        <GlassyCard style={styles.activityCard}>
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: 'rgba(0, 184, 148, 0.15)' }]}>
              <Ionicons name="cart" size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityText}>New order placed #ORD-9921</Text>
              <Text style={styles.activityTime}>2 minutes ago</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: 'rgba(255, 118, 117, 0.15)' }]}>
              <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityText}>Low stock alert: Fresh Mangoes</Text>
              <Text style={styles.activityTime}>1 hour ago</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: 'rgba(9, 132, 227, 0.15)' }]}>
              <Ionicons name="bicycle" size={18} color={COLORS.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityText}>Rider Rahul onboarded & verified</Text>
              <Text style={styles.activityTime}>3 hours ago</Text>
            </View>
          </View>
        </GlassyCard>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  menuBtn: { padding: 4 },
  welcome: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  adminName: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#ffffff', marginBottom: 15, marginTop: 20, textTransform: 'uppercase', letterSpacing: 1.5 },
  kpiGrid: { flexDirection: 'row' },
  capacityBanner: { marginTop: 10 },
  capacityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  capacityTitle: { fontSize: 15, fontWeight: '900', color: '#ffffff' },
  capacitySub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  capacityBadge: { backgroundColor: 'rgba(0,184,148,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  capacityScore: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },
  progressBarBg: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary },
  riderRosterGrid: { flexDirection: 'row', gap: 10 },
  riderMetricBox: { flex: 1, backgroundColor: COLORS.card, padding: 15, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 4 },
  riderMetricVal: { fontSize: 22, fontWeight: 'bold', color: '#ffffff' },
  riderMetricLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, fontWeight: '600' },
  activityCard: { marginTop: 5 },
  activityItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  activityIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  activityText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  activityTime: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
});
