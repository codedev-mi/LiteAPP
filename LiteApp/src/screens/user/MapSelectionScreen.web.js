import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Platform } from 'react-native';

export default function MapSelectionScreen({ navigation, route }) {
  const [location, setLocation] = useState(null);
  const [addressPreview, setAddressPreview] = useState('Map not supported on Web');
  const [isFetching, setIsFetching] = useState(false);

  const { onSelectLocation } = route.params || {};

  useEffect(() => {
    // Basic mock location for web
    setLocation({
      latitude: 0,
      longitude: 0,
    });
  }, []);

  const confirmLocation = () => {
    if (onSelectLocation) {
      onSelectLocation({
        detail: 'Web Location Placeholder',
        cityPincode: '000000'
      });
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Locate on Map (Web Mock)</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.mapContainer}>
        <View style={styles.mapMock}>
          <Text style={styles.mockText}>📍 Maps are currently only supported on mobile devices.</Text>
          <Text style={styles.mockSubText}>Please use a mobile emulator or physical device for full functionality.</Text>
        </View>
      </View>

      <View style={styles.bottomCard}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.detailLabel}>DELIVERY LOCATION</Text>
          <Text style={styles.addressText}>{addressPreview}</Text>
          
          <TouchableOpacity style={styles.confirmBtn} onPress={confirmLocation}>
            <Text style={styles.confirmBtnText}>Confirm Placeholder Location</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 50, borderBottomWidth: 1, borderColor: '#eee' },
  backBtn: { fontSize: 16, color: '#4CAF50', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  mapContainer: { flex: 1, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  mapMock: { padding: 40, alignItems: 'center' },
  mockText: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  mockSubText: { fontSize: 14, color: '#666', textAlign: 'center' },
  bottomCard: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 0 : 0,
    width: '100%',
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 20,
  },
  detailLabel: { color: '#888', fontSize: 12, fontWeight: 'bold', marginBottom: 5 },
  addressText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  confirmBtn: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center' },
  confirmBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
