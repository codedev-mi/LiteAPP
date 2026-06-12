import React, { useContext, useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, 
  Modal, ScrollView, Image, TextInput, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminContext } from '../context/AdminContext';
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

export default function RidersManagement({ navigation }) {
  const { 
    kycQueue, riders, fetchKycQueue, fetchRiders, verifyRider, suspendRider, isLoading 
  } = useContext(AdminContext);

  const [activeTab, setActiveTab] = useState('active'); // 'active', 'inactive', 'pending'
  const [selectedRider, setSelectedRider] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [showRemarksInput, setShowRemarksInput] = useState(false);

  useEffect(() => {
    fetchKycQueue();
    fetchRiders();
  }, []);

  const handleRefresh = async () => {
    await Promise.all([fetchKycQueue(), fetchRiders()]);
  };

  const handleVerify = async (status) => {
    if (!selectedRider) return;
    if (status === 'Reupload_Required' && !remarks.trim()) {
      Alert.alert('Remarks Required', 'Please enter instructions on what documents to reupload.');
      return;
    }

    const res = await verifyRider(selectedRider.id, status, status === 'Reupload_Required' ? remarks : null);
    if (res.success) {
      Alert.alert('Verification Updated', `Rider status is now ${status}.`);
      setSelectedRider(null);
      setRemarks('');
      setShowRemarksInput(false);
    } else {
      Alert.alert('Update Failed', res.error || 'Server error.');
    }
  };

  const handleToggleSuspend = async (rider) => {
    const isSuspended = rider.verificationStatus === 'Suspended';
    const action = isSuspended ? 'Lift Suspension' : 'Suspend';
    Alert.alert(
      `${action} Rider`,
      `Are you sure you want to ${action.toLowerCase()} ${rider.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          style: 'destructive',
          onPress: async () => {
            const res = await suspendRider(rider.id, !isSuspended);
            if (res.success) {
              Alert.alert('Success', `Rider status updated successfully.`);
              setSelectedRider(null);
            } else {
              Alert.alert('Failed', res.error || 'Server error.');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return COLORS.primary;
      case 'Submitted': return COLORS.secondary;
      case 'Under_Review': return COLORS.warning;
      case 'Reupload_Required': return COLORS.warning;
      case 'Suspended': return COLORS.danger;
      case 'Rejected': return COLORS.danger;
      default: return COLORS.textMuted;
    }
  };

  // Filter riders locally
  const activeRiders = (riders || []).filter(r => r.verificationStatus === 'Approved' && r.isOnline);
  const inactiveRiders = (riders || []).filter(r => r.verificationStatus === 'Approved' && !r.isOnline);
  const pendingRiders = (riders || []).filter(r => r.verificationStatus !== 'Approved');

  const getFilteredData = () => {
    if (activeTab === 'active') return activeRiders;
    if (activeTab === 'inactive') return inactiveRiders;
    return pendingRiders;
  };

  const renderRiderItem = ({ item }) => (
    <GlassyCard style={styles.riderCard}>
      <View style={styles.cardHeader}>
        <Image 
          source={{ uri: item.selfieUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400' }} 
          style={styles.riderAvatar} 
        />
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={styles.riderName}>{item.name}</Text>
          <Text style={styles.riderPhone}>{item.phone}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.verificationStatus) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.verificationStatus) }]}>
            {item.verificationStatus}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Deliveries</Text>
          <Text style={styles.statValue}>{item.deliveriesCount || 0}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Trust Score</Text>
          <Text style={styles.statValue}>{item.trustScore || 100}%</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Status</Text>
          <Text style={[styles.statValue, { color: item.isOnline ? COLORS.primary : COLORS.textMuted }]}>
            {item.isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.detailsBtn}
        onPress={() => setSelectedRider(item)}
      >
        <Text style={styles.detailsBtnText}>Review KYC & Details</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
      </TouchableOpacity>
    </GlassyCard>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={26} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Delivery Riders</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Ionicons name="refresh" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'active' && styles.tabButtonActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active ({activeRiders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'inactive' && styles.tabButtonActive]}
          onPress={() => setActiveTab('inactive')}
        >
          <Text style={[styles.tabText, activeTab === 'inactive' && styles.tabTextActive]}>
            Inactive ({inactiveRiders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'pending' && styles.tabButtonActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pending ({pendingRiders.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={getFilteredData()}
        renderItem={renderRiderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor="#fff" />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bicycle-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No riders found in this tab.</Text>
          </View>
        }
      />

      {/* KYC Inspector Modal */}
      <Modal visible={!!selectedRider} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rider Profile Inspector</Text>
              <TouchableOpacity onPress={() => {
                setSelectedRider(null);
                setShowRemarksInput(false);
                setRemarks('');
              }}>
                <Ionicons name="close" size={26} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {selectedRider && (
                <View>
                  {/* Selfie & Core Profile */}
                  <View style={styles.profileSection}>
                    <Image source={{ uri: selectedRider.selfieUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400' }} style={styles.largeSelfie} />
                    <Text style={styles.inspectorName}>{selectedRider.name}</Text>
                    <View style={[styles.statusBadge, { alignSelf: 'center', marginTop: 8, backgroundColor: getStatusColor(selectedRider.verificationStatus) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(selectedRider.verificationStatus) }]}>{selectedRider.verificationStatus}</Text>
                    </View>
                  </View>

                  {/* Personal details */}
                  <Text style={styles.secTitle}>Personal Details</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email Address</Text>
                    <Text style={styles.detailValue}>{selectedRider.email}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phone Number</Text>
                    <Text style={styles.detailValue}>{selectedRider.phone}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date of Birth</Text>
                    <Text style={styles.detailValue}>{selectedRider.dob || 'Not Provided'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Gender</Text>
                    <Text style={styles.detailValue}>{selectedRider.gender || 'Not Provided'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Resident Address</Text>
                    <Text style={styles.detailValue}>{selectedRider.address || 'Not Provided'}</Text>
                  </View>

                  {/* Vehicle details */}
                  <Text style={styles.secTitle}>Vehicle Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Vehicle Type</Text>
                    <Text style={styles.detailValue}>{selectedRider.vehicleType || 'Not Provided'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Registration Number (RC)</Text>
                    <Text style={styles.detailValue}>{selectedRider.vehicleNumber || 'Cycle'}</Text>
                  </View>

                  {/* Bank Details */}
                  <Text style={styles.secTitle}>Bank Accounts</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Account Number</Text>
                    <Text style={styles.detailValue}>{selectedRider.accountNumber || 'Not Provided'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>IFSC Code</Text>
                    <Text style={styles.detailValue}>{selectedRider.ifsc || 'Not Provided'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>UPI Payout ID</Text>
                    <Text style={styles.detailValue}>{selectedRider.upiId || 'Not Provided'}</Text>
                  </View>

                  {/* Emergency Contact */}
                  <Text style={styles.secTitle}>Emergency contact</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Contact Name</Text>
                    <Text style={styles.detailValue}>{selectedRider.emergencyName || 'Not Provided'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Contact Phone</Text>
                    <Text style={styles.detailValue}>{selectedRider.emergencyPhone || 'Not Provided'}</Text>
                  </View>

                  {/* KYC Docs Images (Guarded to prevent ViewGroup layout crash) */}
                  <Text style={styles.secTitle}>Uploaded Verification Documents</Text>
                  
                  {!!selectedRider.aadhaarUrl && (
                    <View style={{ marginBottom: 15 }}>
                      <Text style={styles.docLabel}>Aadhaar Card Front</Text>
                      <Image source={{ uri: selectedRider.aadhaarUrl }} style={styles.docImg} resizeMode="contain" />
                    </View>
                  )}

                  {!!selectedRider.panUrl && (
                    <View style={{ marginBottom: 15 }}>
                      <Text style={styles.docLabel}>PAN Card</Text>
                      <Image source={{ uri: selectedRider.panUrl }} style={styles.docImg} resizeMode="contain" />
                    </View>
                  )}

                  {selectedRider.vehicleType !== 'Cycle' && (
                    <View>
                      <Text style={styles.docLabel}>Driving License</Text>
                      {!!selectedRider.dlUrl ? (
                        <Image source={{ uri: selectedRider.dlUrl }} style={styles.docImg} resizeMode="contain" />
                      ) : (
                        <Text style={styles.noDocText}>No Driving License uploaded</Text>
                      )}

                      <Text style={[styles.docLabel, { marginTop: 15 }]}>Bike Image</Text>
                      {!!selectedRider.rcUrl ? (
                        <Image source={{ uri: selectedRider.rcUrl }} style={styles.docImg} resizeMode="contain" />
                      ) : (
                        <Text style={styles.noDocText}>No Bike Image uploaded</Text>
                      )}
                    </View>
                  )}

                  {/* Decision Panel */}
                  <View style={styles.actionPanel}>
                    {selectedRider.verificationStatus !== 'Approved' && selectedRider.verificationStatus !== 'Suspended' ? (
                      <View>
                        {showRemarksInput ? (
                          <View style={{ marginBottom: 15 }}>
                            <Text style={styles.remarksLabel}>Reupload Instructions (Remarks)</Text>
                            <TextInput 
                              style={styles.remarksInput}
                              placeholder="Describe blurry or invalid documents..."
                              placeholderTextColor={COLORS.textMuted}
                              value={remarks}
                              onChangeText={setRemarks}
                              multiline
                            />
                            <View style={styles.remarksBtnRow}>
                              <TouchableOpacity style={styles.cancelRemarksBtn} onPress={() => setShowRemarksInput(false)}>
                                <Text style={styles.cancelRemarksText}>Cancel</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.submitRemarksBtn} onPress={() => handleVerify('Reupload_Required')}>
                                <Text style={styles.submitRemarksText}>Submit Request</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.btnColumn}>
                            <TouchableOpacity 
                              style={[styles.modalActionBtn, { backgroundColor: COLORS.primary }]} 
                              onPress={() => handleVerify('Approved')}
                            >
                              <Text style={styles.actionBtnText}>Approve KYC & Onboard</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.modalActionBtn, { backgroundColor: COLORS.warning, marginTop: 10 }]} 
                              onPress={() => setShowRemarksInput(true)}
                            >
                              <Text style={[styles.actionBtnText, { color: '#2d3436' }]}>Request Document Reupload</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.modalActionBtn, { backgroundColor: COLORS.danger, marginTop: 10 }]} 
                              onPress={() => handleVerify('Rejected')}
                            >
                              <Text style={styles.actionBtnText}>Reject Profile</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={[styles.modalActionBtn, { backgroundColor: selectedRider.verificationStatus === 'Suspended' ? COLORS.primary : COLORS.danger }]}
                        onPress={() => handleToggleSuspend(selectedRider)}
                      >
                        <Text style={styles.actionBtnText}>
                          {selectedRider.verificationStatus === 'Suspended' ? 'Lift Suspension / Reactivate' : 'Suspend Driver Account'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  tabButton: { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabButtonActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary },
  riderCard: { marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  riderAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: COLORS.primary },
  riderName: { fontSize: 15, fontWeight: '900', color: '#ffffff' },
  riderPhone: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border, paddingVertical: 10, marginVertical: 15 },
  statBox: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 14, fontWeight: '900', color: '#ffffff', marginTop: 4 },
  detailsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  detailsBtnText: { color: COLORS.primary, fontWeight: 'bold', marginRight: 5, fontSize: 13 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600', marginTop: 15 },
  
  // Inspector Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, flex: 0.95 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#ffffff' },
  modalScroll: { flex: 1, padding: 20 },
  profileSection: { alignItems: 'center', marginVertical: 15 },
  largeSelfie: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: COLORS.primary },
  inspectorName: { fontSize: 18, fontWeight: '900', color: '#ffffff', marginTop: 12 },
  secTitle: { fontSize: 11, fontWeight: '900', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 25, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 5 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  detailLabel: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  detailValue: { color: '#ffffff', fontSize: 14, fontWeight: '800', textAlign: 'right', flex: 0.7 },
  docLabel: { color: '#ffffff', fontSize: 13, fontWeight: '700', marginTop: 15, marginBottom: 8 },
  docImg: { width: '100%', height: 180, borderRadius: 12, backgroundColor: COLORS.inputBg, marginBottom: 15 },
  noDocText: { color: COLORS.danger, fontSize: 13, fontWeight: '600', fontStyle: 'italic', marginBottom: 15 },
  
  actionPanel: { marginTop: 30, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 20 },
  modalActionBtn: { height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  btnColumn: { width: '100%' },
  remarksLabel: { fontSize: 13, color: '#ffffff', fontWeight: '700', marginBottom: 8 },
  remarksInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, height: 80, padding: 12, color: '#ffffff', fontSize: 14, backgroundColor: COLORS.inputBg, textAlignVertical: 'top' },
  remarksBtnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  cancelRemarksBtn: { width: '45%', height: 44, borderRadius: 10, backgroundColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  cancelRemarksText: { color: COLORS.textMuted, fontWeight: 'bold' },
  submitRemarksBtn: { width: '45%', height: 44, borderRadius: 10, backgroundColor: COLORS.warning, justifyContent: 'center', alignItems: 'center' },
  submitRemarksText: { color: '#2d3436', fontWeight: 'bold' }
});
