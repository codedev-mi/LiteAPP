import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export const GlassyCard = ({ children, style }) => (
  <View style={[styles.glassCard, style]}>
    <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
    <View style={styles.glassContent}>
      {children}
    </View>
  </View>
);

export const KPICard = ({ title, value, growth, icon, color }) => (
  <GlassyCard style={styles.kpiCard}>
    <View style={styles.kpiHeader}>
      <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.growth, { color: growth.startsWith('+') ? '#00b894' : '#ff4757' }]}>
        {growth}
      </Text>
    </View>
    <Text style={styles.kpiValue}>{value}</Text>
    <Text style={styles.kpiTitle}>{title}</Text>
  </GlassyCard>
);

export const RevenueChart = ({ data, title = "Revenue Analytics (7 Days)" }) => {
  if (!data || data.length === 0) return null;

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <LineChart
        data={{
          labels: data.map(d => d.date),
          datasets: [{ data: data.map(d => d.revenue) }]
        }}
        width={width - 40}
        height={220}
        chartConfig={{
          backgroundColor: '#1e1e1e',
          backgroundGradientFrom: '#1e1e1e',
          backgroundGradientTo: '#1e1e1e',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(0, 184, 148, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.7})`,
          style: { borderRadius: 16 },
          propsForDots: { r: '5', strokeWidth: '2', stroke: '#00b894' }
        }}
        bezier
        style={{ marginVertical: 8, borderRadius: 16 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  glassCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(30, 30, 30, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 15,
  },
  glassContent: { padding: 15 },
  kpiCard: { width: (width - 60) / 2, marginRight: 15 },
  kpiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  iconBox: { padding: 8, borderRadius: 10 },
  growth: { fontSize: 12, fontWeight: 'bold' },
  kpiValue: { fontSize: 22, fontWeight: '900', color: '#ffffff' },
  kpiTitle: { fontSize: 12, color: '#a0a0a0', marginTop: 4, fontWeight: '600' },
  chartContainer: { marginTop: 20, marginBottom: 20 },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', marginBottom: 15 },
});
