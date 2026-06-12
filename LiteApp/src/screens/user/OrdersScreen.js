import React, { useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../context/AppContext';

export default function OrdersScreen({ navigation }) {
  const { orders, theme, setCart, cart, fetchOrders, cancelOrder, prepayOrder, createRazorpayOrder, createRazorpayPaymentLink, checkRazorpayPaymentLink, verifyRazorpayPayment, currentUser, resolveImageUrl } = useContext(AppContext);

  useEffect(() => {
    const hasActiveOrders = orders && orders.some(
      order => order.status !== 'Delivered' && order.status !== 'Cancelled'
    );

    if (!hasActiveOrders) return;

    // Poll for status updates
    const interval = setInterval(() => {
      console.log('[Orders Polling] Polling for updated order statuses...');
      fetchOrders();
    }, 15000);

    return () => clearInterval(interval);
  }, [orders]);

  const handleCancelOrder = async (orderId) => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            const result = await cancelOrder(orderId);
            if (result) {
              Alert.alert('Cancelled 🚫', 'Your order has been cancelled successfully.');
              fetchOrders();
            } else {
              Alert.alert('Error', 'Failed to cancel the order. It might already be processed.');
            }
          }
        }
      ]
    );
  };

  const handlePrepayOrder = async (order) => {
    try {
      Alert.alert('Pre-pay Order', `Proceed to pay ₹${order.grandTotal.toFixed(2)} online to enjoy a cashless delivery?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: async () => {
            try {
              const paymentLink = await createRazorpayPaymentLink({
                amount: order.grandTotal,
                receipt: `receipt_${Date.now()}`,
                name: currentUser?.name,
                email: currentUser?.email,
                contact: currentUser?.phone
              });

              if (!paymentLink || paymentLink.error || !paymentLink.short_url) {
                throw new Error(paymentLink?.error || 'Failed to create payment link.');
              }

              await WebBrowser.openBrowserAsync(paymentLink.short_url);
              const verifyLink = await checkRazorpayPaymentLink(paymentLink.id);

              if (!verifyLink || verifyLink.error) {
                throw new Error(verifyLink?.error || 'Unable to verify payment status.');
              }

              if (verifyLink.status === 'paid') {
                const updated = await prepayOrder(order.id, 'UPI', 'SUCCESS');
                if (updated) {
                  Alert.alert('Payment Success 🎉', 'Thank you! Your pre-payment was confirmed.');
                  fetchOrders();
                } else {
                  Alert.alert('Error', 'Payment confirmed, but failed to update status on server.');
                }
              } else {
                Alert.alert('Payment Pending', 'Payment was not completed yet. Please finish the payment in the browser and try again.');
              }
            } catch (err) {
              Alert.alert('Payment Failed', err.message || 'Payment was cancelled or failed.');
            }
          }
        }
      ]);
    } catch (e) {
      console.log('Prepay error:', e);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backTouch}>
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
          <Text style={[styles.backBtnText, { color: theme.primary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Orders</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={orders}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 75, marginBottom: 20 }}>📦</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Orders Yet!</Text>
            <Text style={[styles.emptySub, { color: theme.subText }]}>When you place an order, it will appear here.</Text>
            <TouchableOpacity 
              style={[styles.shopBtn, { backgroundColor: theme.primary }]} 
              onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
            >
              <Text style={styles.shopBtnText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => {
          const orderDate = new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
          const itemsCount = item.orderItems.length;
          
          const firstItem = item.orderItems[0];
          const productImg = firstItem?.productVariant?.product?.img;
          const productName = firstItem?.productVariant?.product?.name || 'Item';
          const productBrand = firstItem?.productVariant?.product?.brand || 'Fresh';
          const packSize = firstItem?.productVariant?.packSize || firstItem?.productVariant?.product?.packSize || '';
          
          // Determine status text & colors
          let statusText = item.status;
          let statusColor = '#0984e3'; // Default blue
          let statusBg = '#e3f2fd';
          let arrivalText = 'Arriving soon';
          
          if (item.status === 'Delivered') {
            statusColor = '#00b894';
            statusBg = '#e8f5e9';
            arrivalText = `Delivered on ${orderDate}`;
          } else if (item.status === 'Cancelled' || item.status === 'Refunded' || item.status === 'Failed') {
            statusColor = '#ff4757';
            statusBg = '#ffe0e0';
            arrivalText = item.status;
          } else if (item.status === 'Preparing') {
            statusColor = '#fdcb6e';
            statusBg = '#fff9db';
            arrivalText = 'Arriving in approx 10 mins';
          } else if (item.status === 'Packed' || item.status === 'Out for Delivery') {
            statusText = 'In Transit';
            statusColor = '#00b894';
            statusBg = '#e8f5e9';
            const estDate = new Date(new Date(item.createdAt).getTime() + 4 * 24 * 60 * 60 * 1000)
              .toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
            arrivalText = `Arriving by ${estDate}`;
          }

          return (
            <TouchableOpacity 
              activeOpacity={0.95} 
              onPress={() => navigation.navigate('OrderDetail', { order: item })} 
              style={[styles.orderCard, { backgroundColor: theme.card }]}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: statusBg }]}>
                  <Ionicons name="cube" size={24} color={statusColor} />
                </View>
                <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
                  <Text style={styles.arrivalText}>{arrivalText}</Text>
                </View>
              </View>

              {/* Prepay Purple Banner */}
              {item.paymentMethod === 'COD' && item.status !== 'Cancelled' && item.status !== 'Delivered' && (
                <View style={styles.prepayBanner}>
                  <Text style={styles.prepayText}>
                    Enjoy hassle-free delivery by pre-paying now.
                  </Text>
                  <TouchableOpacity 
                    style={styles.payNowBtn}
                    onPress={() => handlePrepayOrder(item)}
                  >
                    <Text style={styles.payNowBtnText}>Pay Now</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Product Info Block */}
              <View style={styles.productBlock}>
                <View style={styles.productImgBox}>
                  {productImg ? (
                    <Image source={{ uri: resolveImageUrl(productImg) }} style={styles.productImg} resizeMode="contain" />
                  ) : (
                    <Text style={{ fontSize: 24 }}>📦</Text>
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={styles.productBrand} numberOfLines={1}>{productBrand}</Text>
                  <Text style={styles.productName} numberOfLines={1}>{productName}</Text>
                  {packSize ? <Text style={styles.productSize}>Size: {packSize}</Text> : null}
                  {itemsCount > 1 ? (
                    <Text style={styles.itemCountText}>+ {itemsCount - 1} more items</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#b2bec3" />
              </View>

              {/* Action Buttons Row */}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity 
                  style={styles.cardActionBtn}
                  onPress={() => navigation.navigate('OrderDetail', { order: item })}
                >
                  <Ionicons name="location-outline" size={16} color="#636e72" />
                  <Text style={styles.cardActionText}>Track Order</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.cardActionBtn, item.status !== 'Preparing' && { opacity: 0.5 }]}
                  onPress={() => {
                    if (item.status === 'Preparing') {
                      handleCancelOrder(item.id);
                    } else {
                      Alert.alert('Cannot Cancel', 'This order is already being processed or delivered. Please contact support for help.');
                    }
                  }}
                >
                  <Ionicons name="close-circle-outline" size={16} color="#636e72" />
                  <Text style={styles.cardActionText}>Cancel Order</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.cardActionBtn}
                  onPress={() => navigation.navigate('CustomerCare')}
                >
                  <Ionicons name="headset-outline" size={16} color="#636e72" />
                  <Text style={styles.cardActionText}>Need Help?</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      
      {cart && cart.length > 0 && (
        <View style={styles.cartBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cartBarItems}>
              {cart.reduce((total, item) => total + item.quantity, 0)} Items
            </Text>
            <Text style={styles.cartBarTotal}>
              Total: ₹{cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() => navigation.navigate('Checkout')}
          >
            <Text style={styles.cartBarText}>Checkout ›</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center',
    paddingHorizontal: 15, 
    paddingTop: Platform.OS === 'ios' ? 10 : 15, 
    paddingBottom: 15,
    borderBottomWidth: 1, 
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5
  },
  backTouch: { flexDirection: 'row', alignItems: 'center', width: 80 },
  backBtnText: { fontSize: 16, fontWeight: '700', marginLeft: 4 },
  headerTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', flex: 1 },
  orderCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '900',
  },
  arrivalText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '600',
  },
  prepayBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#eef2ff', // Light lavender
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  prepayText: {
    fontSize: 12,
    color: '#3730a3', // Dark blue/purple
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
    lineHeight: 16,
  },
  payNowBtn: {
    backgroundColor: '#ff4757', // Coral pink
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  payNowBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },
  productBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  productImgBox: {
    width: 50,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  productImg: {
    width: '100%',
    height: '100%',
  },
  productBrand: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 1,
  },
  productSize: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  itemCountText: {
    fontSize: 11,
    color: '#00b894',
    fontWeight: '700',
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingVertical: 10,
    marginHorizontal: 4,
    backgroundColor: '#fff',
  },
  cardActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginLeft: 6,
  },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 22, fontWeight: '900', marginTop: 20 },
  emptySub: { fontSize: 14, color: '#b2bec3', marginTop: 10, textAlign: 'center', paddingHorizontal: 40 },
  shopBtn: { paddingHorizontal: 35, paddingVertical: 18, borderRadius: 20, marginTop: 30 },
  shopBtnText: { color: 'white', fontWeight: '900', fontSize: 16 },
  cartBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    left: 20,
    right: 20,
    backgroundColor: '#1e293b',
    padding: 15,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    zIndex: 100
  },
  cartBarItems: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  cartBarTotal: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  checkoutBtn: { backgroundColor: '#00b894', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14 },
  cartBarText: { color: 'white', fontWeight: '900' }
});
