import React, { useEffect, useState, useRef, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Dimensions, ActivityIndicator, Linking, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../context/AppContext';

const { width } = Dimensions.get('window');

const t = {
  liveTracking: 'Live Tracking',
  retrievingStatus: 'Retrieving delivery status...',
  findingPartner: 'Finding a delivery partner...',
  preparingPackage: 'We are preparing your package at the store and assigning the nearest available rider.',
  deliveryPartner: 'Delivery Partner',
  riderIdPrefix: 'Rider ID: ',
  back: 'Back',
  delivered: 'Delivered',
  partnerOnWay: 'Partner is on the way',
  orderAccepted: 'Order Accepted',
  riderDelivered: 'Rider successfully delivered the order',
  riderPickedUp: 'Rider has picked up the package and is heading to your address',
  riderArriving: 'Rider is arriving at the store to pick up your order',
  trackingError: 'Tracking details not found.'
};

export default function DeliveryTrackingScreen({ route, navigation }) {
  const { theme, apiFetch, orders, addReview } = useContext(AppContext);
  const { orderId } = route.params || {};

  const [isLoading, setIsLoading] = useState(true);
  const [trackingData, setTrackingData] = useState(null);
  const [error, setError] = useState(null);
  const [reviewsSubmitted, setReviewsSubmitted] = useState({});
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [statusHistory, setStatusHistory] = useState([]);

  const formatTime = (timeStr) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const fullOrder = orders.find(o => o.id === orderId);

  const truckAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(truckAnim, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        }),
        Animated.timing(truckAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [truckAnim]);

  const fetchTracking = async () => {
    if (!orderId) {
      setError('No order ID provided for tracking.');
      setIsLoading(false);
      return;
    }
    try {
      const res = await apiFetch(`/api/orders/${orderId}/tracking`);
      const data = await res.json();
      if (res.ok && data && !data.error) {
        setTrackingData(data);
      } else {
        setError(data.error || 'Failed to load tracking information.');
      }

      // Fetch status logs history
      const historyRes = await apiFetch(`/api/orders/${orderId}/status-history`);
      const historyData = await historyRes.json();
      if (historyRes.ok && Array.isArray(historyData)) {
        setStatusHistory(historyData);
      }
    } catch (err) {
      console.log('Error fetching tracking info:', err);
      setError('Network connection error.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  const truckX = truckAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width - 100]
  });

  const handleCallRider = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.subText, marginTop: 15, fontWeight: '700' }}>{t.retrievingStatus}</Text>
      </SafeAreaView>
    );
  }

  if (error || !trackingData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Ionicons name="warning-outline" size={48} color={theme.primary} />
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '900', marginTop: 15, textAlign: 'center' }}>
          {error || t.trackingError}
        </Text>
        <TouchableOpacity style={[styles.backBtn, { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10 }]} onPress={() => navigation.goBack()}>
          <Text style={{ color: theme.text, fontWeight: 'bold' }}>{t.back}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { status, assignment } = trackingData;
  const partner = assignment?.partner;

  // Determine delivery step states
  const isAssigned = !!assignment;
  const isAccepted = assignment?.status === 'Accepted' || assignment?.status === 'PickedUp' || assignment?.status === 'Delivered';
  const isPickedUp = assignment?.status === 'PickedUp' || assignment?.status === 'Delivered';
  const isDelivered = status === 'Delivered';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t.liveTracking}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.mapMock}>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1548345666-a57164eda0ee?auto=format&fit=crop&q=80&w=1000' }} 
          style={styles.mapImg}
          blurRadius={2}
        />
        {isAssigned && !isDelivered && (
          <Animated.View style={[styles.truckMarker, { transform: [{ translateX: truckX }] }]}>
            <View style={styles.truckBubble}>
              <Text style={{ fontSize: 24 }}>🚚</Text>
            </View>
          </Animated.View>
        )}
        <View style={styles.userMarker}>
          <View style={styles.userBubble}>
            <Text style={{ fontSize: 24 }}>🏠</Text>
          </View>
        </View>
      </View>

      <View style={[styles.statusCard, { backgroundColor: theme.card, height: isDelivered ? 380 : 360, marginTop: isDelivered ? -100 : -60 }]}>
        {isDelivered ? (
          <View style={{ flex: 1 }}>
            <Text style={[styles.partnerName, { color: theme.text, textAlign: 'center', fontSize: 18, marginBottom: 5 }]}>Order Delivered! 🎉</Text>
            <Text style={[styles.partnerSub, { textAlign: 'center', marginBottom: 15 }]}>How was the freshness and delivery of your items?</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {fullOrder?.orderItems?.map((item) => {
                const product = item.productVariant?.product;
                if (!product) return null;
                const hasReviewed = reviewsSubmitted[product.id];
                const currentRating = ratings[product.id] || 0;
                const currentComment = comments[product.id] || '';

                return (
                  <View key={product.id} style={styles.reviewItemRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Image source={typeof product.img === 'string' ? { uri: product.img } : product.img} style={styles.reviewProductImg} resizeMode="contain" />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 13, color: theme.text }} numberOfLines={1}>{product.name}</Text>
                        <Text style={{ color: '#888', fontSize: 11 }}>{product.brand}</Text>
                      </View>
                    </View>

                    {hasReviewed ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                        <Ionicons name="checkmark-circle" size={18} color="#00b894" />
                        <Text style={{ color: '#00b894', fontWeight: 'bold', fontSize: 12, marginLeft: 5 }}>Review Submitted</Text>
                      </View>
                    ) : (
                      <View style={{ marginTop: 8 }}>
                        <View style={{ flexDirection: 'row', gap: 5, marginBottom: 8 }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity key={star} onPress={() => setRatings(prev => ({ ...prev, [product.id]: star }))}>
                              <Ionicons 
                                name={star <= currentRating ? "star" : "star-outline"} 
                                size={22} 
                                color={star <= currentRating ? "#FFD700" : "#cbd5e1"} 
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                        {currentRating > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TextInput 
                              placeholder="Write a quick comment..." 
                              placeholderTextColor="#aaa"
                              style={[styles.reviewInput, { color: theme.text }]}
                              value={currentComment}
                              onChangeText={(txt) => setComments(prev => ({ ...prev, [product.id]: txt }))}
                            />
                            <TouchableOpacity 
                              style={styles.submitReviewBtn} 
                              onPress={async () => {
                                if (!currentRating) return;
                                const res = await addReview({ productId: product.id, rating: currentRating, comment: currentComment });
                                if (res) {
                                  setReviewsSubmitted(prev => ({ ...prev, [product.id]: true }));
                                  Alert.alert('Thank you!', 'Your review has been submitted.');
                                } else {
                                  Alert.alert('Error', 'Failed to submit review.');
                                }
                              }}
                            >
                              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>Submit</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}
                    <View style={styles.reviewDivider} />
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.navigate('Home')}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        ) : !isAssigned ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.partnerName, { color: theme.text, marginTop: 15, textAlign: 'center' }]}>
              {t.findingPartner}
            </Text>
            <Text style={[styles.partnerSub, { textAlign: 'center', marginTop: 5 }]}>
              {t.preparingPackage}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <View style={styles.partnerInfo}>
              {partner?.avatar ? (
                <Image source={{ uri: partner.avatar }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>
                    {partner?.name ? partner.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'DP'}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={[styles.partnerName, { color: theme.text }]}>{partner?.name || t.deliveryPartner}</Text>
                <Text style={styles.partnerSub}>
                  ⭐ {partner?.rating?.toFixed(1) || '5.0'} • {t.riderIdPrefix}{partner?.id?.slice(-6).toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity style={styles.callBtn} onPress={() => handleCallRider(partner?.phone)}>
                <Ionicons name="call" size={20} color="#fff" />
              </TouchableOpacity>
                    <View style={styles.divider} />

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {statusHistory.length === 0 ? (
                <View style={styles.statusRow}>
                  <View style={styles.dotBox}>
                    <View style={[styles.dot, { backgroundColor: isAccepted ? theme.primary : '#ddd' }]} />
                    <View style={[styles.line, { backgroundColor: isPickedUp ? theme.primary : '#f1f2f6' }]} />
                    <View style={[styles.dot, { backgroundColor: isPickedUp ? theme.primary : '#ddd' }]} />
                    <View style={[styles.line, { backgroundColor: isDelivered ? theme.primary : '#f1f2f6' }]} />
                    <View style={[styles.dot, { backgroundColor: isDelivered ? theme.primary : '#ddd' }]} />
                  </View>
                  <View style={{ marginLeft: 20, flex: 1 }}>
                    <View style={{ marginBottom: 15 }}>
                      <Text style={[styles.statusMain, { color: isAccepted ? theme.text : '#ccc' }]}>
                        {isDelivered ? t.delivered : isPickedUp ? t.partnerOnWay : t.orderAccepted}
                      </Text>
                      <Text style={styles.statusDetail}>
                        {isDelivered ? t.riderDelivered : isPickedUp ? t.riderPickedUp : t.riderArriving}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                statusHistory.map((log, idx) => {
                  const isLatest = idx === statusHistory.length - 1;
                  return (
                    <View key={log.id} style={styles.timelineRow}>
                      <View style={styles.timelineIndicators}>
                        <View style={[styles.timelineDot, { backgroundColor: isLatest ? theme.primary : '#cbd5e1' }]} />
                        {idx < statusHistory.length - 1 && <View style={styles.timelineLine} />}
                      </View>
                      <View style={styles.timelineContent}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[styles.timelineStatus, isLatest && { color: theme.primary, fontWeight: '900' }]}>
                            {log.status}
                          </Text>
                          <Text style={styles.timelineTime}>{formatTime(log.timestamp)}</Text>
                        </View>
                        {log.notes && <Text style={styles.timelineNotes}>{log.notes}</Text>}
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>      </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50 },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  backBtn: { padding: 10, backgroundColor: '#f1f2f6', borderRadius: 15 },
  mapMock: { flex: 1, position: 'relative', overflow: 'hidden' },
  mapImg: { width: '100%', height: '100%', opacity: 0.8 },
  truckMarker: { position: 'absolute', top: '40%', left: 20, zIndex: 10 },
  truckBubble: { backgroundColor: '#fff', padding: 10, borderRadius: 25, elevation: 10, shadowColor: '#00b894', shadowOpacity: 0.5, shadowRadius: 10 },
  userMarker: { position: 'absolute', bottom: '20%', right: 40, zIndex: 10 },
  userBubble: { backgroundColor: '#fff', padding: 10, borderRadius: 25, elevation: 10, shadowColor: '#ff4757', shadowOpacity: 0.5, shadowRadius: 10 },
  statusCard: { 
    height: 320, 
    borderTopLeftRadius: 40, 
    borderTopRightRadius: 40, 
    padding: 30, 
    marginTop: -40,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20
  },
  partnerInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#00b894', justifyContent: 'center', alignItems: 'center' },
  avatarImg: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#e2e8f0' },
  partnerName: { fontSize: 18, fontWeight: '900' },
  partnerSub: { fontSize: 13, color: '#999', marginTop: 2 },
  callBtn: { backgroundColor: '#00b894', padding: 12, borderRadius: 15 },
  divider: { height: 1, backgroundColor: '#f1f2f6', marginVertical: 20 },
  statusRow: { flexDirection: 'row' },
  dotBox: { alignItems: 'center', paddingTop: 4 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#ddd' },
  line: { width: 2, height: 40, backgroundColor: '#f1f2f6' },
  statusMain: { fontSize: 16, fontWeight: '900' },
  statusDetail: { fontSize: 12, color: '#999', marginTop: 4 },
  reviewItemRow: {
    marginBottom: 15,
  },
  reviewProductImg: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    padding: 3,
  },
  reviewInput: {
    flex: 1,
    height: 36,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  submitReviewBtn: {
    backgroundColor: '#00b894',
    paddingHorizontal: 12,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginTop: 12,
  },
  doneBtn: {
    backgroundColor: '#2d3436',
    paddingVertical: 12,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 20
  },
  timelineIndicators: {
    alignItems: 'center',
    marginRight: 15,
    width: 16
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 2
  },
  timelineLine: {
    width: 2,
    position: 'absolute',
    top: 12,
    bottom: -20,
    backgroundColor: '#cbd5e1',
    zIndex: 1
  },
  timelineContent: {
    flex: 1
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2d3436'
  },
  timelineTime: {
    fontSize: 11,
    color: '#999'
  },
  timelineNotes: {
    fontSize: 12,
    color: '#636e72',
    marginTop: 4,
    lineHeight: 16
  }
});
