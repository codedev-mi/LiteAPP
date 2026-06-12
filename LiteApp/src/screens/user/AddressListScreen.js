import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, TextInput, Alert, ActivityIndicator, Share, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { AppContext } from '../../context/AppContext';
import { Ionicons } from '@expo/vector-icons';
export default function AddressListScreen({ navigation }) {
  const { userAddresses, setUserAddresses, currentUser, currentAddress, setCurrentAddress, addAddress, deleteAddress } = useContext(AppContext);
  const [isLocating, setIsLocating] = useState(false);

  const handleSelect = (address) => {
    setCurrentAddress(address);
    navigation.goBack();
  };

  const shareAddress = async (address) => {
    try {
      await Share.share({
        message: `My Delivery Address: \n${address.tag} \n${address.detail} \ntel: ${currentUser?.phone}`,
        title: 'Share Address'
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share address.');
    }
  };

  const handleOptions = (address) => {
    Alert.alert(
      'Address Options',
      'What would you like to do with this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => navigation.navigate('AddAddress', { addressToEdit: address }) },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(address.id) }
      ]
    );
  };

  const handleDelete = async (id) => {
    if (userAddresses.length <= 1) {
      Alert.alert('Hold on', 'You must have at least one delivery address.');
      return;
    }
    const success = await deleteAddress(id);
    if (!success) {
      Alert.alert('Error', 'Failed to delete address. Please try again.');
    }
  };

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to use this feature. On web, make sure you are using HTTPS and have enabled location for this site.');
        setIsLocating(false);
        return;
      }

      // Fast location fetching using getLastKnownPositionAsync or Balanced getCurrentPositionAsync
      let currentLoc = await Location.getLastKnownPositionAsync({});
      if (!currentLoc) {
        currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }
      
      const geocode = await Location.reverseGeocodeAsync({ 
        latitude: currentLoc.coords.latitude, 
        longitude: currentLoc.coords.longitude 
      });
      
      let formattedDetail = '';
      let detectedCity = 'Bhusawal';
      let detectedArea = 'Current Location';
      if (geocode.length > 0) {
        const place = geocode[0];
        formattedDetail = `${place.name || place.street || ''}, ${place.district || place.city || ''}, ${place.region || ''}, ${place.postalCode || ''}, ${place.country || ''}`;
        formattedDetail = formattedDetail.replace(/(^[,\s]+)|([,\s]+$)/g, '');
        if (place.city) detectedCity = place.city;
        if (place.district || place.street) detectedArea = place.district || place.street;
      } 
      
      // Fallback to Lat/Long if geocoding is empty or provides no useful info
      if (!formattedDetail || formattedDetail.length < 5) {
        formattedDetail = `Lat: ${currentLoc.coords.latitude.toFixed(4)}, Long: ${currentLoc.coords.longitude.toFixed(4)}`;
      }

      const lowerCity = detectedCity.toLowerCase();
      const isAllowed = lowerCity.includes('jalgaon') || lowerCity.includes('bhusawal') || 
                        formattedDetail.toLowerCase().includes('jalgaon') || formattedDetail.toLowerCase().includes('bhusawal');
      
      if (!isAllowed) {
        Alert.alert(
          'Service Unavailable',
          'We currently only deliver in Jalgaon and Bhusawal city areas. Your current location is outside our service zone.'
        );
        setIsLocating(false);
        return;
      }

      // Normalize city name
      const finalCity = lowerCity.includes('jalgaon') ? 'Jalgaon' : 'Bhusawal';

      const addressData = {
        tag: 'Current Location',
        city: finalCity,
        area: detectedArea,
        completeAddress: formattedDetail,
        isDefault: true
      };
      
      const savedAddress = await addAddress(addressData);
      if (savedAddress && !savedAddress.error) {
        setCurrentAddress(savedAddress);
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Failed to save location to database.');
      }
    } catch (error) {
      console.log('Location error:', error);
      Alert.alert('Error', 'Could not fetch location. Please ensure location services are enabled.');
    } finally {
      setIsLocating(false);
    }
  };

  const renderHeader = () => (
    <View style={{ marginBottom: 20 }}>
      {/* Search Bar */}
      <TouchableOpacity 
        style={styles.searchBar} 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('AddAddress')}
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <Text style={styles.searchText}>Search for area, street name...</Text>
      </TouchableOpacity>

      {/* Action List */}
      <View style={styles.actionList}>
        <TouchableOpacity style={styles.actionRow} onPress={handleUseCurrentLocation}>
          <Text style={styles.actionIconLocation}>⌖</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitleLocation}>Use current location</Text>
            {isLocating ? (
              <ActivityIndicator size="small" color="#4CAF50" style={{ alignSelf: 'flex-start', marginTop: 5 }} />
            ) : (
              <Text style={styles.actionSubLocation} numberOfLines={2}>
                Fetch your live GPS coordinates
              </Text>
            )}
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('AddAddress')}>
          <Text style={styles.actionIconAdd}>+</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitleAdd}>Add new address</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>Your saved addresses</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#00b894" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select delivery location</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={userAddresses}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.addressCard, currentAddress?.id === item.id && styles.activeCard]}
            onPress={() => handleSelect(item)}
            activeOpacity={0.7}
          >
            {/* Left Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.addressIconBox}>
                <Ionicons 
                  name={item.tag === 'Home' ? 'home' : (item.tag === 'Work' || item.tag === 'Office' ? 'business' : 'location')} 
                  size={24} 
                  color="#00b894" 
                />
              </View>
            </View>
            
            {/* Right Details */}
            <View style={styles.addressContent}>
              <View style={styles.addressTitleRow}>
                <Text style={styles.addressTag}>{item.tag}</Text>
                {currentAddress?.id === item.id && <Text style={styles.activeLabel}>You are here</Text>}
              </View>
              
              <Text style={styles.addressDetail}>{item.detail}</Text>
              <Text style={styles.phoneDetail}>Phone number: {currentUser?.phone || 'Not provided'}</Text>
              
              {/* Bottom Actions */}
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('AddAddress', { addressToEdit: item })}>
                  <Ionicons name="create-outline" size={20} color="#4CAF50" />
                  <Text style={styles.iconBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, { borderColor: '#ff4757' }]} onPress={() => handleDelete(item.id)}>
                  <Ionicons name="trash-outline" size={20} color="#ff4757" />
                  <Text style={[styles.iconBtnText, { color: '#ff4757' }]}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, { borderColor: '#4285F4' }]} onPress={() => shareAddress(item)}>
                  <Ionicons name="share-social-outline" size={20} color="#4285F4" />
                  <Text style={[styles.iconBtnText, { color: '#4285F4' }]}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, paddingTop: 10, borderBottomWidth: 1, borderColor: '#f1f2f6' },
  backBtn: { fontSize: 24, color: '#00b894' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#2d3436' },
  
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#f1f2f6' },
  searchIcon: { fontSize: 18, marginRight: 10, color: '#999' },
  searchText: { color: '#999', fontSize: 16 },

  actionList: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 5 },
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  divider: { height: 1, backgroundColor: '#f1f2f6', marginLeft: 50 },
  
  actionIconLocation: { fontSize: 22, color: '#00b894', marginRight: 15 },
  actionTitleLocation: { fontSize: 16, color: '#00b894', fontWeight: 'bold' },
  actionSubLocation: { fontSize: 13, color: '#999', marginTop: 4 },
  
  actionIconAdd: { fontSize: 26, color: '#00b894', marginRight: 15, marginLeft: 2 },
  actionTitleAdd: { fontSize: 16, color: '#00b894', fontWeight: 'bold' },
  
  chevron: { fontSize: 24, color: '#666' },

  sectionHeader: { color: '#2d3436', fontSize: 16, fontWeight: '900', marginBottom: 15, marginLeft: 5 },

  addressCard: { 
    flexDirection: 'row', 
    backgroundColor: 'white', 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 20,
    elevation: 4, 
    shadowColor: '#000', 
    shadowOpacity: 0.08, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowRadius: 15
  },
  activeCard: { borderWidth: 1.5, borderColor: '#00b894' },
  
  iconContainer: { marginRight: 15 },
  addressIconBox: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  
  addressContent: { flex: 1 },
  addressTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  addressTag: { fontSize: 18, fontWeight: 'bold', color: '#2d3436', marginRight: 10 },
  activeLabel: { color: '#00b894', fontSize: 14, fontWeight: 'bold' },
  
  addressDetail: { color: '#636e72', fontSize: 14, lineHeight: 20, marginBottom: 6 },
  phoneDetail: { color: '#b2bec3', fontSize: 14, marginBottom: 15 },
  
  cardActions: { flexDirection: 'row', marginTop: 5 },
  iconBtn: { flexDirection: 'row', borderWidth: 1, borderColor: '#4CAF50', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  iconBtnText: { color: '#4CAF50', fontSize: 12, fontWeight: 'bold', marginLeft: 5 }
});
