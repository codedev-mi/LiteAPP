import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

export default function MapSelectionScreen({ navigation, route }) {
  const [location, setLocation] = useState(null);
  const [addressPreview, setAddressPreview] = useState('Locating you...');
  const [isFetching, setIsFetching] = useState(true);

  // You can pass a callback route to push selecting data back to the previous screen
  const { onSelectLocation } = route.params || {};

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied');
        setIsFetching(false);
        return;
      }

      let currentLoc = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: currentLoc.coords.latitude,
        longitude: currentLoc.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      
      setLocation(coords);
      fetchAddressName(coords.latitude, coords.longitude);
    })();
  }, []);

  const fetchAddressName = async (lat, lng) => {
    try {
      const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (geocode.length > 0) {
        const place = geocode[0];
        const formatted = `${place.name || place.street}, ${place.city}, ${place.postalCode}`;
        setAddressPreview(formatted);
      } else {
        setAddressPreview('Pin dropped on map');
      }
    } catch (e) {
      setAddressPreview('Coordinates Selected');
    } finally {
      setIsFetching(false);
    }
  };

  const handleRegionChange = (region) => {
    setLocation(region);
  };

  const handleRegionChangeComplete = (region) => {
    setLocation(region);
    fetchAddressName(region.latitude, region.longitude);
  };

  const confirmLocation = () => {
    if (onSelectLocation && location) {
      const parts = addressPreview.split(', ');
      const rawCity = parts.length > 1 ? parts[parts.length - 2] : '';
      const detectedCity = rawCity.trim();
      const lowerCity = detectedCity.toLowerCase();
      
      const isAllowed = lowerCity.includes('jalgaon') || lowerCity.includes('bhusawal') || 
                        addressPreview.toLowerCase().includes('jalgaon') || addressPreview.toLowerCase().includes('bhusawal');
      
      if (!isAllowed) {
        Alert.alert(
          'Service Unavailable',
          'We currently only deliver in Jalgaon and Bhusawal city areas. Please select a location within these cities.'
        );
        return;
      }

      onSelectLocation({
        detail: addressPreview,
        city: lowerCity.includes('jalgaon') ? 'Jalgaon' : 'Bhusawal',
        cityPincode: parts.slice(-2).join(', ')
      });
      navigation.goBack();
    }
  };

  if (!location) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={{ marginTop: 10 }}>Finding your precise location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Locate on Map</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.mapContainer}>
        <MapView 
          style={styles.map}
          initialRegion={location}
          onRegionChange={handleRegionChange}
          onRegionChangeComplete={handleRegionChangeComplete}
        />
        {/* Fixed Center Pin mimicking Uber/Instamart */}
        <View style={styles.markerFixed}>
          <Text style={{ fontSize: 40 }}>📍</Text>
        </View>
      </View>

      <View style={styles.bottomCard}>
        <Text style={styles.detailLabel}>DELIVERY LOCATION</Text>
        <Text style={styles.addressText}>{isFetching ? 'Fetching address...' : addressPreview}</Text>
        
        <TouchableOpacity style={styles.confirmBtn} onPress={confirmLocation}>
          <Text style={styles.confirmBtnText}>Confirm Location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 50, borderBottomWidth: 1, borderColor: '#eee' },
  backBtn: { fontSize: 16, color: '#4CAF50', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  mapContainer: { flex: 1 },
  map: { width: '100%', height: '100%' },
  markerFixed: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
  },
  bottomCard: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 0 : 0,
    width: '100%',
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10
  },
  detailLabel: { color: '#888', fontSize: 12, fontWeight: 'bold', marginBottom: 5 },
  addressText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  confirmBtn: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center' },
  confirmBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
