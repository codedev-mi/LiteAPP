import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppContext } from '../../context/AppContext';
import { Ionicons } from '@expo/vector-icons';

export default function AddAddressScreen({ navigation, route }) {
  const { addAddress, updateAddress, currentUser } = useContext(AppContext);
  
  const { addressToEdit } = route.params || {};

  const [city, setCity] = useState(addressToEdit?.city || '');
  const [area, setArea] = useState(addressToEdit?.area || '');
  const [completeAddress, setCompleteAddress] = useState(addressToEdit?.completeAddress || '');
  const [mapsLink, setMapsLink] = useState(addressToEdit?.mapsLink || '');
  
  const [contactType, setContactType] = useState('Myself'); // 'Myself' or 'Someone else'
  const [receiverName, setReceiverName] = useState(addressToEdit?.receiverName || currentUser?.name || '');
  const [receiverPhone, setReceiverPhone] = useState(addressToEdit?.receiverPhone || currentUser?.phone || '');
  
  const addressLabels = ['Home', 'Work', 'Office', 'Other'];
  const [selectedLabel, setSelectedLabel] = useState(
    addressToEdit?.tag && addressLabels.includes(addressToEdit.tag) ? addressToEdit.tag : 
    (addressToEdit?.tag ? 'Other' : 'Home')
  );
  const [customTag, setCustomTag] = useState(
    addressToEdit?.tag && !addressLabels.includes(addressToEdit.tag) ? addressToEdit.tag : ''
  );
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);

  useEffect(() => {
    if (contactType === 'Myself') {
      setReceiverName(currentUser?.name || '');
      setReceiverPhone(currentUser?.phone || '');
    } else {
      setReceiverName('');
      setReceiverPhone('');
    }
  }, [contactType, currentUser]);

  useEffect(() => {
    if (route.params?.selectedArea) {
      setArea(route.params.selectedArea);
    }
  }, [route.params]);

  const handleSave = async () => {
    if (!city || (city !== 'Jalgaon' && city !== 'Bhusawal')) {
      Alert.alert('Service Unavailable', 'We only deliver to Jalgaon and Bhusawal.');
      return;
    }
    if (!area || area === 'Select an area, street') {
      Alert.alert('Error', 'Please select an area or street.');
      return;
    }
    if (!completeAddress || !receiverName || !receiverPhone) {
      Alert.alert('Error', 'Please fill out all required fields (*)');
      return;
    }

    setIsLoading(true);
    const finalTag = selectedLabel === 'Other' ? (customTag || 'Other') : selectedLabel;

    const addressData = {
      tag: finalTag,
      city,
      area,
      completeAddress,
      mapsLink,
      receiverName,
      receiverPhone,
      isDefault: true
    };
    
    let res;
    if (addressToEdit) {
      res = await updateAddress(addressToEdit.id, addressData);
    } else {
      res = await addAddress(addressData);
    }
    
    setIsLoading(false);

    if (res && !res.error) {
      navigation.goBack();
    } else {
      Alert.alert('Error', res?.error || 'Failed to save address');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add address details</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        
        <Text style={styles.sectionTitle}>Address details</Text>
        
        <View style={styles.card}>
          <TouchableOpacity style={styles.selectRow} onPress={() => setIsCityModalOpen(true)}>
            <View style={styles.iconBox}><Ionicons name="business" size={20} color="#f39c12" /></View>
            <Text style={styles.selectText}>{city || 'Select a city'}</Text>
            <Text style={styles.selectBtn}>Select</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.selectRow} onPress={() => navigation.navigate('MapSelection', {
            onSelectLocation: (data) => {
              setArea(data.detail);
              if (data.city) setCity(data.city);
            }
          })}>
            <View style={styles.iconBox}><Ionicons name="location" size={20} color="#f39c12" /></View>
            <Text style={styles.selectText}>{area || 'Select an area, street'}</Text>
            <Text style={styles.selectBtn}>Select</Text>
          </TouchableOpacity>

          <TextInput 
            style={styles.inputBox} 
            placeholder="Enter complete address*" 
            value={completeAddress}
            onChangeText={setCompleteAddress}
            multiline
          />
          <Text style={styles.helperText}>Example: 4th Floor, Plot No. B-17, Block B, South Extension</Text>

          <View style={styles.mapLinkBox}>
            <Ionicons name="map" size={20} color="#4285F4" style={{marginRight: 10}} />
            <TextInput 
              style={{flex: 1}} 
              placeholder="Add google maps link (optional)" 
              value={mapsLink}
              onChangeText={setMapsLink}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Contact details</Text>

        <View style={styles.card}>
          <View style={styles.radioGroup}>
            <TouchableOpacity style={styles.radioBtn} onPress={() => setContactType('Myself')}>
              <View style={[styles.radioOuter, contactType === 'Myself' && styles.radioActive]}>
                {contactType === 'Myself' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>Myself</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.radioBtn} onPress={() => setContactType('Someone else')}>
              <View style={[styles.radioOuter, contactType === 'Someone else' && styles.radioActive]}>
                {contactType === 'Someone else' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>Someone else</Text>
            </TouchableOpacity>
          </View>

          <TextInput 
            style={styles.inputBox} 
            placeholder="Receiver's name*" 
            value={receiverName}
            onChangeText={setReceiverName}
          />
          <View style={styles.phoneInputBox}>
            <TextInput 
              style={{flex: 1}} 
              placeholder="Receiver's phone number*" 
              keyboardType="numeric"
              maxLength={10}
              value={receiverPhone}
              onChangeText={setReceiverPhone}
            />
            <Ionicons name="call-outline" size={20} color="#666" />
          </View>

          <Text style={[styles.helperText, { marginTop: 15, fontWeight: 'bold', color: '#333' }]}>Save as address</Text>
          <View style={styles.tagGroup}>
            {addressLabels.map(label => (
              <TouchableOpacity 
                key={label} 
                style={[styles.tagBtn, selectedLabel === label && styles.tagBtnActive]}
                onPress={() => setSelectedLabel(label)}
              >
                <Text style={[styles.tagBtnText, selectedLabel === label && styles.tagBtnTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedLabel === 'Other' && (
            <TextInput 
              style={styles.inputBox} 
              placeholder="e.g. Friend's House, Gym" 
              value={customTag}
              onChangeText={setCustomTag}
            />
          )}
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* City Dropdown Modal */}
      <Modal
        visible={isCityModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsCityModalOpen(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsCityModalOpen(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Delivery City</Text>
              <TouchableOpacity onPress={() => setIsCityModalOpen(false)}>
                <Ionicons name="close" size={24} color="#2d3436" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={[styles.cityOption, city === 'Jalgaon' && styles.cityOptionSelected]}
              onPress={() => {
                setCity('Jalgaon');
                setIsCityModalOpen(false);
              }}
            >
              <Text style={[styles.cityText, city === 'Jalgaon' && styles.cityTextActive]}>Jalgaon</Text>
              {city === 'Jalgaon' && <Ionicons name="checkmark-circle" size={20} color="#00b894" />}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.cityOption, city === 'Bhusawal' && styles.cityOptionSelected]}
              onPress={() => {
                setCity('Bhusawal');
                setIsCityModalOpen(false);
              }}
            >
              <Text style={[styles.cityText, city === 'Bhusawal' && styles.cityTextActive]}>Bhusawal</Text>
              {city === 'Bhusawal' && <Ionicons name="checkmark-circle" size={20} color="#00b894" />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: 'white', elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#2d3436', marginTop: 20, marginBottom: 10, marginLeft: 5 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 18, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 10 },
  selectRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff8e1', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  selectText: { flex: 1, fontSize: 15, color: '#2d3436', fontWeight: '600' },
  selectBtn: { color: '#00b894', fontWeight: 'bold', fontSize: 15 },
  divider: { height: 1, backgroundColor: '#f1f2f6', marginVertical: 8 },
  inputBox: { borderWidth: 1, borderColor: '#f1f2f6', borderRadius: 12, padding: 16, fontSize: 15, marginTop: 15, backgroundColor: '#f9f9f9', color: '#2d3436' },
  helperText: { fontSize: 12, color: '#888', marginTop: 5, marginBottom: 10, marginLeft: 5 },
  mapLinkBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, paddingHorizontal: 15, height: 50, marginTop: 5 },
  phoneInputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, paddingHorizontal: 15, height: 50, marginTop: 15 },
  radioGroup: { flexDirection: 'row', marginBottom: 5 },
  radioBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#999', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  radioActive: { borderColor: '#4CAF50' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50' },
  radioLabel: { fontSize: 15, color: '#333', fontWeight: '500' },
  bottomBar: { padding: 15, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#eee' },
  saveBtn: { backgroundColor: '#388E3C', padding: 15, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  tagGroup: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  tagBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', marginRight: 10, marginBottom: 10 },
  tagBtnActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  tagBtnText: { color: '#666', fontSize: 14 },
  tagBtnTextActive: { color: 'white', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, minHeight: '30%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#2d3436' },
  cityOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  cityOptionSelected: { backgroundColor: '#e8fdfa', borderRadius: 12, paddingHorizontal: 12, borderBottomWidth: 0 },
  cityText: { fontSize: 16, fontWeight: '700', color: '#2d3436' },
  cityTextActive: { color: '#00b894' }
});
