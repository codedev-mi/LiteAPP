import React, { useContext, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../context/AppContext';

export default function CheckoutScreen({ navigation }) {
  const { cart, clearCart, setCart, currentAddress, currentUser, placeOrder, paymentMethods, validatePromo, products, createRazorpayOrder, createRazorpayPaymentLink, checkRazorpayPaymentLink, verifyRazorpayPayment, addToCart, removeFromCart, apiFetch, walletBalance, fetchWallet, resolveImageUrl } = useContext(AppContext);
  const [isPlacing, setIsPlacing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [paymentSubMethod, setPaymentSubMethod] = useState('COD');
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedPromoId, setAppliedPromoId] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  React.useEffect(() => {
    fetchWallet();
  }, [currentUser]);

  const getCartItemStock = (cartItem) => {
    const product = products.find(p => p.id === cartItem.originalProductId || p.id === cartItem.id);
    if (!product) return 0;
    if (cartItem.id && cartItem.id.includes('_')) {
      const variantId = cartItem.id.split('_')[1];
      const variant = product.variants.find(v => v.id === variantId);
      return variant ? variant.stock : 0;
    }
    return product.stock || 0;
  };

  const hasOutOfStockItems = cart.some(item => getCartItemStock(item) <= 0 || getCartItemStock(item) < item.quantity);

  const itemTotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
  const platformCharges = Math.round(itemTotal * 0.0075 * 100) / 100;
  const deliveryFee = itemTotal > 500 ? 0 : 25;
  const grandTotal = Math.round((itemTotal + deliveryFee + platformCharges - discount) * 100) / 100;

  const applyPromo = async () => {
    if (!promoCode) return;
    
    const result = await validatePromo(promoCode, itemTotal);
    if (result && !result.error) {
      setDiscount(result.discountAmount);
      setAppliedPromoId(result.id);
      Alert.alert('Promo Applied! 🎉', `₹${result.discountAmount} discount added to your bill.`);
    } else {
      Alert.alert('Invalid Code', result?.error || 'Try using promo code FRESH50');
    }
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Cart Empty', 'Add items before checking out.');
      return;
    }

    if (!currentAddress) {
      Alert.alert('Address Missing', 'Please select a delivery address.');
      return;
    }

    if (currentAddress.city !== 'Jalgaon' && currentAddress.city !== 'Bhusawal') {
      Alert.alert('Service Unavailable', 'We only deliver to Jalgaon and Bhusawal. Please select a valid address in these cities.');
      return;
    }

    if (hasOutOfStockItems) {
      Alert.alert('Out of Stock', 'Some items in your cart are out of stock. Please remove them before checking out.');
      return;
    }
    
    setIsPlacing(true);
    
    if (paymentMethod === 'WALLET' && grandTotal > walletBalance) {
      setIsPlacing(false);
      Alert.alert('Insufficient Balance', `Your wallet balance is ₹${walletBalance.toFixed(2)}, but the order total is ₹${grandTotal.toFixed(2)}. Please choose another payment method.`);
      return;
    }

    // If not COD and not WALLET, handle Razorpay web payment first
    let verifiedPaymentStatus = 'PENDING';
    if (paymentMethod !== 'COD' && paymentMethod !== 'WALLET') {
      try {
        const paymentLink = await createRazorpayPaymentLink({
          amount: grandTotal,
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

        if (verifyLink.status === 'paid' || (verifyLink.payments && verifyLink.payments.length > 0 && verifyLink.status === 'paid')) {
          verifiedPaymentStatus = 'SUCCESS';
        } else {
          throw new Error('Payment not completed yet. Please complete the payment in the browser and try again.');
        }
      } catch (error) {
        setIsPlacing(false);
        Alert.alert('Payment Failed', error.message || error.description || 'Payment was cancelled or failed.');
        return;
      }
    }

    const orderData = {
      addressId: currentAddress.id,
      promoId: appliedPromoId,
      itemTotal,
      deliveryFee,
      discountAmount: discount,
      grandTotal,
      paymentMethod,
      paymentStatus: (paymentMethod === 'COD' || paymentMethod === 'WALLET') ? 'SUCCESS' : verifiedPaymentStatus,
      items: cart.map(item => {
        const variantId = item.id.includes('_') ? item.id.split('_')[1] : (item.variants?.[0]?.id || item.id);
        return {
          variantId,
          quantity: item.quantity,
          price: item.price
        };
      })
    };

    const order = await placeOrder(orderData);
    setIsPlacing(false);

    if (order) {
      setShowConfetti(true);
      Alert.alert(
        'Success! 🎉',
        'Your order has been placed and will be delivered in 10 mins.',
        [{ text: 'Track Order', onPress: () => {
          navigation.replace('DeliveryTracking', { orderId: order.id });
        }}]
      );
    } else {
      Alert.alert('Error', 'Failed to place order. Please try again.');
    }
  };

  if (cart.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Summary</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 60, marginBottom: 20 }}>🛒</Text>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2d3436' }}>Your Cart is Empty</Text>
          <Text style={{ color: '#b2bec3', textAlign: 'center', marginTop: 10, paddingHorizontal: 30 }}>
            Add some fresh items to your cart and come back to checkout.
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: '#00b894', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 15, marginTop: 25 }}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Shop Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Summary</Text>
        <View style={{ width: 40 }} />
      </View>

      {showConfetti && (
        <LottieView
          source={require('../../../assets/lottie/confetti.json')}
          autoPlay
          loop={false}
          style={StyleSheet.absoluteFillObject}
          onAnimationFinish={() => setShowConfetti(false)}
        />
      )}

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionHeader, { marginTop: 5 }]}>Delivery Address</Text>
        <View style={styles.card}>
          <Text style={styles.addressTag}>{currentAddress?.tag || 'No Address Selected'}</Text>
          <Text style={styles.addressDetail}>{currentAddress?.detail || 'Please select an address from the Home screen.'}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AddressList')}>
            <Text style={styles.changeLink}>Change Address ›</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeader}>Order Items</Text>
        <View style={styles.card}>
          {cart.map((item, idx) => {
            const stock = getCartItemStock(item);
            const isOutOfStock = stock <= 0 || stock < item.quantity;
            return (
              <View key={item.id} style={[styles.cartItem, isOutOfStock && styles.outOfStockCartItem, idx === cart.length - 1 && { marginBottom: 0 }]}>
                <View style={styles.itemImgBox}>
                  <Image source={typeof item.img === 'string' ? { uri: resolveImageUrl(item.img) } : item.img} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, isOutOfStock && { color: '#ff4757' }]}>{item.name}</Text>
                  <Text style={styles.itemQty}>{item.quantity} x {item.packSize || '1 unit'}</Text>
                  {isOutOfStock && <Text style={{ color: '#ff4757', fontSize: 10, fontWeight: 'bold' }}>OUT OF STOCK / NOT ENOUGH QTY</Text>}
                </View>
                <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                  <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
                  <View style={styles.checkoutQtyControl}>
                    <TouchableOpacity 
                      onPress={() => {
                        if (item.quantity === 1) {
                          Alert.alert(
                            'Remove Item',
                            `Are you sure you want to remove ${item.name} from your cart?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { 
                                text: 'Remove', 
                                style: 'destructive',
                                onPress: () => {
                                  removeFromCart(item);
                                }
                              }
                            ]
                          );
                        } else {
                          removeFromCart(item);
                        }
                      }} 
                      style={styles.checkoutQtyBtn}
                    >
                      <Text style={styles.checkoutQtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.checkoutQtyValue}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => addToCart(item)} style={styles.checkoutQtyBtn}>
                      <Text style={styles.checkoutQtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionHeader}>Offers & Coupons</Text>
        <View style={[styles.card, styles.promoRow]}>
          <TextInput 
            style={styles.promoInput} 
            placeholder="Enter FRESH50" 
            value={promoCode}
            onChangeText={setPromoCode}
            autoCapitalize="characters"
          />
          <TouchableOpacity 
            style={[styles.applyBtn, discount > 0 && { backgroundColor: '#e8f5e9' }]} 
            onPress={applyPromo}
            disabled={discount > 0}
          >
            <Text style={[styles.applyText, discount > 0 && { color: '#00b894' }]}>
              {discount > 0 ? 'Applied' : 'Apply'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeader}>Select Payment Method</Text>
        <View style={styles.paymentMethodsContainer}>
          
          {/* B Basket Wallet option */}
          <Text style={styles.paymentGroupTitle}>App Wallet</Text>
          <TouchableOpacity 
            style={[styles.paymentCardOption, paymentMethod === 'WALLET' && styles.paymentCardOptionSelected]}
            onPress={() => {
              setPaymentMethod('WALLET');
              setPaymentSubMethod('WALLET');
            }}
          >
            <View style={styles.paymentCardHeader}>
              <View style={styles.paymentIconContainer}>
                <Ionicons name="wallet" size={20} color={paymentMethod === 'WALLET' ? '#00b894' : '#636e72'} />
              </View>
              <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={[styles.paymentMethodName, paymentMethod === 'WALLET' && styles.paymentTextSelected]}>B Basket Wallet</Text>
                <Text style={styles.paymentMethodDetail}>Available Balance: ₹{walletBalance.toFixed(2)}</Text>
              </View>
              <View style={[styles.radioOuter, paymentMethod === 'WALLET' && styles.radioOuterActive]}>
                {paymentMethod === 'WALLET' && <View style={styles.radioInner} />}
              </View>
            </View>
          </TouchableOpacity>

          {/* Recommended UPI */}
          <Text style={styles.paymentGroupTitle}>Recommended UPI Apps</Text>
          <View style={styles.upiGrid}>
            <TouchableOpacity 
              style={[styles.upiAppBtn, paymentSubMethod === 'GPAY' && styles.upiAppBtnActive]}
              onPress={() => {
                setPaymentMethod('UPI');
                setPaymentSubMethod('GPAY');
              }}
            >
              <View style={[styles.upiLogoBg, { backgroundColor: '#e8f0fe' }]}>
                <Ionicons name="logo-google" size={20} color="#4285F4" />
              </View>
              <Text style={styles.upiAppLabel}>GPay</Text>
              {paymentSubMethod === 'GPAY' && <View style={styles.upiCheckedDot} />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.upiAppBtn, paymentSubMethod === 'PHONEPE' && styles.upiAppBtnActive]}
              onPress={() => {
                setPaymentMethod('UPI');
                setPaymentSubMethod('PHONEPE');
              }}
            >
              <View style={[styles.upiLogoBg, { backgroundColor: '#f3e5f5' }]}>
                <Ionicons name="flash-sharp" size={20} color="#5f259f" />
              </View>
              <Text style={styles.upiAppLabel}>PhonePe</Text>
              {paymentSubMethod === 'PHONEPE' && <View style={styles.upiCheckedDot} />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.upiAppBtn, paymentSubMethod === 'PAYTM' && styles.upiAppBtnActive]}
              onPress={() => {
                setPaymentMethod('UPI');
                setPaymentSubMethod('PAYTM');
              }}
            >
              <View style={[styles.upiLogoBg, { backgroundColor: '#e1f5fe' }]}>
                <Ionicons name="wallet" size={20} color="#002E6E" />
              </View>
              <Text style={styles.upiAppLabel}>Paytm</Text>
              {paymentSubMethod === 'PAYTM' && <View style={styles.upiCheckedDot} />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.upiAppBtn, paymentSubMethod === 'OTHER_UPI' && styles.upiAppBtnActive]}
              onPress={() => {
                setPaymentMethod('UPI');
                setPaymentSubMethod('OTHER_UPI');
              }}
            >
              <View style={[styles.upiLogoBg, { backgroundColor: '#f5f5f5' }]}>
                <Ionicons name="qr-code-outline" size={20} color="#333" />
              </View>
              <Text style={styles.upiAppLabel}>Any UPI ID</Text>
              {paymentSubMethod === 'OTHER_UPI' && <View style={styles.upiCheckedDot} />}
            </TouchableOpacity>
          </View>

          {/* Cards */}
          <Text style={styles.paymentGroupTitle}>Credit & Debit Cards</Text>
          <TouchableOpacity 
            style={[styles.paymentCardOption, paymentMethod === 'CARD' && styles.paymentCardOptionSelected]}
            onPress={() => {
              setPaymentMethod('CARD');
              setPaymentSubMethod('CARD');
            }}
          >
            <View style={styles.paymentCardHeader}>
              <View style={styles.paymentIconContainer}>
                <Ionicons name="card" size={20} color={paymentMethod === 'CARD' ? '#00b894' : '#636e72'} />
              </View>
              <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={[styles.paymentMethodName, paymentMethod === 'CARD' && styles.paymentTextSelected]}>Credit / Debit Card</Text>
                <Text style={styles.paymentMethodDetail}>Pay via Visa, Mastercard, RuPay, Maestro</Text>
              </View>
              <View style={[styles.radioOuter, paymentMethod === 'CARD' && styles.radioOuterActive]}>
                {paymentMethod === 'CARD' && <View style={styles.radioInner} />}
              </View>
            </View>
          </TouchableOpacity>

          {/* Wallets */}
          <Text style={styles.paymentGroupTitle}>Wallets</Text>
          <View style={styles.walletsRow}>
            <TouchableOpacity 
              style={[styles.walletBtn, paymentSubMethod === 'MOBIKWIK' && styles.walletBtnActive]}
              onPress={() => {
                setPaymentMethod('WALLET');
                setPaymentSubMethod('MOBIKWIK');
              }}
            >
              <Ionicons name="wallet-outline" size={16} color="#0056B3" />
              <Text style={styles.walletBtnText}>MobiKwik</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.walletBtn, paymentSubMethod === 'FREECHARGE' && styles.walletBtnActive]}
              onPress={() => {
                setPaymentMethod('WALLET');
                setPaymentSubMethod('FREECHARGE');
              }}
            >
              <Ionicons name="wallet-outline" size={16} color="#FF5A00" />
              <Text style={styles.walletBtnText}>Freecharge</Text>
            </TouchableOpacity>
          </View>

          {/* Cash on Delivery */}
          <Text style={styles.paymentGroupTitle}>Pay on Delivery</Text>
          <TouchableOpacity 
            style={[styles.paymentCardOption, paymentMethod === 'COD' && styles.paymentCardOptionSelected]}
            onPress={() => {
              setPaymentMethod('COD');
              setPaymentSubMethod('COD');
            }}
          >
            <View style={styles.paymentCardHeader}>
              <View style={styles.paymentIconContainer}>
                <Ionicons name="cash" size={20} color={paymentMethod === 'COD' ? '#00b894' : '#636e72'} />
              </View>
              <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={[styles.paymentMethodName, paymentMethod === 'COD' && styles.paymentTextSelected]}>Cash on Delivery</Text>
                <Text style={styles.paymentMethodDetail}>Pay with Cash / UPI QR code to Delivery Partner</Text>
              </View>
              <View style={[styles.radioOuter, paymentMethod === 'COD' && styles.radioOuterActive]}>
                {paymentMethod === 'COD' && <View style={styles.radioInner} />}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeader}>Payment Summary</Text>
        <View style={styles.card}>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total</Text>
            <Text style={styles.billValue}>₹{itemTotal}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Platform Charges (0.75%)</Text>
            <Text style={styles.billValue}>₹{platformCharges.toFixed(2)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Fee</Text>
            <Text style={[styles.billValue, deliveryFee === 0 && { color: '#00b894' }]}>
              {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
            </Text>
          </View>
          {discount > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: '#00b894' }]}>Promo Discount</Text>
              <Text style={[styles.billValue, { color: '#00b894' }]}>-₹{discount}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.billRow}>
            <Text style={styles.grandLabel}>Grand Total</Text>
            <Text style={styles.grandValue}>₹{grandTotal}</Text>
          </View>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerPriceInfo}>
          <Text style={styles.footerLabel}>Total to Pay</Text>
          <Text style={styles.footerAmount}>₹{grandTotal}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.placeOrderBtn, (isPlacing || hasOutOfStockItems) && { backgroundColor: '#b2bec3', shadowOpacity: 0 }]} 
          onPress={handlePlaceOrder}
          disabled={isPlacing || hasOutOfStockItems}
        >
          {isPlacing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeOrderBtnText}>Place Order →</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 10, 
    paddingBottom: 20,
    backgroundColor: '#fff'
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#2d3436' },
  backBtn: { fontSize: 16, fontWeight: 'bold', color: '#00b894' },
  sectionHeader: { fontSize: 16, fontWeight: '900', color: '#2d3436', marginTop: 25, marginBottom: 15 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 5 },
  addressTag: { fontSize: 14, fontWeight: '900', color: '#00b894', textTransform: 'uppercase', marginBottom: 5 },
  addressDetail: { fontSize: 14, color: '#636e72', lineHeight: 20, marginBottom: 15 },
  changeLink: { color: '#00b894', fontWeight: 'bold' },
  cartItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderRadius: 12 },
  outOfStockCartItem: { backgroundColor: '#ffeaa7', borderWidth: 1, borderColor: '#ff7675' },
  itemImgBox: { width: 45, height: 45, backgroundColor: '#f9f9f9', borderRadius: 10, marginRight: 15, padding: 5 },
  itemName: { fontSize: 15, fontWeight: '700', color: '#2d3436' },
  itemQty: { fontSize: 12, color: '#b2bec3', marginTop: 2 },
  itemPrice: { fontSize: 16, fontWeight: '900', color: '#2d3436' },
  promoRow: { flexDirection: 'row', alignItems: 'center' },
  promoInput: { flex: 1, height: 50, backgroundColor: '#f8f9fa', borderRadius: 15, paddingHorizontal: 15, fontSize: 14, fontWeight: '700', color: '#2d3436' },
  applyBtn: { marginLeft: 15, backgroundColor: '#00b894', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 15 },
  applyText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  paymentMethodsContainer: { gap: 12 },
  paymentCardOption: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000', 
    shadowOpacity: 0.02, 
    shadowRadius: 8, 
    elevation: 2
  },
  paymentCardOptionSelected: { 
    borderColor: '#00b894', 
    backgroundColor: '#f0fdf4',
    shadowColor: '#00b894',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3
  },
  paymentCardHeader: { flexDirection: 'row', alignItems: 'center' },
  paymentIconContainer: { 
    width: 44, 
    height: 44, 
    borderRadius: 12, 
    backgroundColor: '#f8fafc', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  paymentIconEmoji: { fontSize: 20 },
  paymentMethodName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  paymentTextSelected: { color: '#00b894' },
  paymentMethodDetail: { fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 16 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' },
  radioOuterActive: { borderColor: '#00b894' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#00b894' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  billLabel: { fontSize: 14, color: '#636e72', fontWeight: '600' },
  billValue: { fontSize: 14, color: '#2d3436', fontWeight: '900' },
  divider: { height: 1, backgroundColor: '#f1f2f6', marginVertical: 15 },
  grandLabel: { fontSize: 18, fontWeight: '900', color: '#2d3436' },
  grandValue: { fontSize: 20, fontWeight: '900', color: '#00b894' },
  footer: { 
    position: 'absolute', 
    bottom: 0, 
    width: '100%', 
    backgroundColor: '#fff', 
    padding: 25, 
    paddingBottom: Platform.OS === 'ios' ? 35 : 20,
    flexDirection: 'row', 
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f2f6'
  },
  footerPriceInfo: { flex: 1 },
  footerLabel: { fontSize: 12, color: '#b2bec3', fontWeight: 'bold', textTransform: 'uppercase' },
  footerAmount: { fontSize: 24, fontWeight: '900', color: '#2d3436' },
  placeOrderBtn: { backgroundColor: '#00b894', paddingHorizontal: 35, paddingVertical: 18, borderRadius: 20, elevation: 15, shadowColor: '#00b894', shadowOpacity: 0.3, shadowRadius: 10 },
  placeOrderBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  checkoutQtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00b894',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginTop: 8,
  },
  checkoutQtyBtn: {
    paddingHorizontal: 8,
  },
  checkoutQtyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkoutQtyValue: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
    marginHorizontal: 4,
  },
  paymentGroupTitle: { fontSize: 13, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 15, marginBottom: 10 },
  upiGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  upiAppBtn: { flex: 1, minWidth: '22%', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, padding: 12, alignItems: 'center', position: 'relative' },
  upiAppBtnActive: { borderColor: '#00b894', backgroundColor: '#f0fdf4' },
  upiLogoBg: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  upiAppLabel: { fontSize: 11, fontWeight: '700', color: '#1e293b' },
  upiCheckedDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#00b894' },
  walletsRow: { flexDirection: 'row', gap: 12 },
  walletBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, padding: 15, justifyContent: 'center' },
  walletBtnActive: { borderColor: '#00b894', backgroundColor: '#f0fdf4' },
  walletBtnText: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
});
