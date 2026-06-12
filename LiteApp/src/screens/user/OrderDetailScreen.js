import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { AppContext } from '../../context/AppContext';

const { width } = Dimensions.get('window');

const t = {
  orderDetails: 'Order Details',
  help: 'Help',
  orderIdPrefix: 'Order ID: # ',
  cancelledMsg: 'This order has been cancelled.',
  inTransit: 'In Transit',
  on: 'on ',
  of: ' of ',
  itemsCountSuffix: ' Item(s)',
  orderPlaced: 'Order placed ',
  cancelItem: 'Cancel Order',
  trackItem: 'Track Order',
  expiryDate: 'Expiry Date',
  crossSellHeader: 'Items that go well with this item',
  add: 'ADD',
  deliveryTo: 'Delivery To',
  contactDetails: 'Contact Details',
  deliveryAddress: 'Delivery Address',
  savedAmountPrefix: '\n              On this order you saved a total of ',
  prePayHeader: 'Pre pay for your order',
  prePaySub: 'Pay now to enjoy a cashless & hassle free delivery experience',
  payingFor: 'Paying For ',
  payNowPrefix: 'Pay Now: ₹',
  totalOrderPrice: 'Total Order Price',
  itemTotal: 'Item Total',
  deliveryFee: 'Delivery Fee',
  discountSaved: 'Discount Saved',
  downloadInvoice: 'Download Tax Invoice (PDF)',
  updatesSentTo: 'Updates sent to',
  call: 'Call',
  orderedOn: 'Ordered On',
  orderId: 'Order ID'
};

const escapeHtml = (unsafe) => {
  if (unsafe === null || unsafe === undefined) return '';
  return unsafe
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export default function OrderDetailScreen({ route, navigation }) {
  const { order: initialOrder } = route.params;
  const { orders, theme, cancelOrder, prepayOrder, createRazorpayOrder, createRazorpayPaymentLink, checkRazorpayPaymentLink, verifyRazorpayPayment, currentUser, products, addToCart, resolveImageUrl } = useContext(AppContext);
  
  // Get live order state from context to reflect cancellations or payments immediately
  const order = orders.find(o => o.id === initialOrder.id) || initialOrder;
  
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const itemsCount = order.orderItems.length;

  const firstItem = order.orderItems[0];
  const productImg = firstItem?.productVariant?.product?.img;
  const productName = firstItem?.productVariant?.product?.name || 'Product';
  const productBrand = firstItem?.productVariant?.product?.brand || 'Fresh';
  const packSize = firstItem?.productVariant?.packSize || firstItem?.productVariant?.product?.packSize || '';
  const quantity = firstItem?.quantity || 1;

  // Mock Expiry: 2 years from order creation
  const expiryDate = new Date(new Date(order.createdAt).getTime() + 2 * 365 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  // Calculate dynamic arrival date (4 days from order)
  const estArrivalDate = new Date(new Date(order.createdAt).getTime() + 4 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  // Find 3 cross-sell products from the same category or overall bestsellers
  const crossSellProducts = products
    .filter(p => p.id !== firstItem?.productVariant?.productId)
    .slice(0, 4);

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            const result = await cancelOrder(order.id);
            if (result) {
              Alert.alert('Success 🚫', 'Your order has been cancelled successfully.');
            } else {
              Alert.alert('Error', 'Failed to cancel the order. It might already be processed.');
            }
          }
        }
      ]
    );
  };

  const handlePrepay = async () => {
    try {
      Alert.alert('Pre-pay Order', `Proceed to pay ₹${order.grandTotal.toFixed(2)} online?`, [
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
                  Alert.alert('Payment Success 🎉', 'Thank you! Your payment was verified and updated.');
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

  const handleDownloadInvoice = async () => {
    try {
      let htmlContent = '<html>' +
        '<head>' +
          '<meta name="viewport" content="width=device-width, initial-scale=1.0" />' +
          '<style>' +
            'body { font-family: sans-serif; padding: 20px; color: #2d3436; }' +
            '.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #00b894; padding-bottom: 10px; margin-bottom: 20px; }' +
            'h1 { margin: 0; color: #2d3436; }' +
            'h2 { margin: 0; color: #00b894; }' +
            '.details { margin-bottom: 20px; color: #636e72; }' +
            'table { width: 100%; border-collapse: collapse; margin-top: 20px; }' +
            'th, td { border-bottom: 1px solid #ddd; padding: 12px; text-align: left; }' +
            'th { background-color: #f8f9fa; }' +
            '.total { font-weight: bold; font-size: 18px; color: #00b894; text-align: right; margin-top: 25px; }' +
            '.footer { text-align: center; margin-top: 40px; color: #b2bec3; font-size: 12px; }' +
          '</style>' +
        '</head>' +
        '<body>' +
          '<div class="header">' +
            '<div>' +
              '<h1>Bhusawal Basket</h1>' +
              '<p style="margin:0; font-size:12px; color:#b2bec3;">Fastest Groceries Delivery</p>' +
            '</div>' +
            '<h2>TAX INVOICE</h2>' +
          '</div>' +
          '<div class="details">' +
            '<p><strong>Order ID:</strong> #' + escapeHtml(order.id) + '</p>' +
            '<p><strong>Ordered On:</strong> ' + escapeHtml(orderDate) + '</p>' +
            '<p><strong>Payment Method:</strong> ' + escapeHtml(order.paymentMethod) + '</p>' +
            '<p><strong>Payment Status:</strong> ' + escapeHtml(order.paymentStatus) + '</p>' +
            '<p><strong>Delivery Address:</strong> ' + escapeHtml(order.address?.completeAddress || 'Default Address') + '</p>' +
          '</div>' +
          '<table>' +
            '<thead>' +
              '<tr>' +
                '<th>Product</th>' +
                '<th>Pack Size</th>' +
                '<th>Quantity</th>' +
                '<th>Price</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>';

      order.orderItems.forEach(oi => {
        htmlContent += '<tr>' +
          '<td>' + escapeHtml(oi.productVariant?.product?.name || 'Item') + '</td>' +
          '<td>' + escapeHtml(oi.productVariant?.packSize || '1 Unit') + '</td>' +
          '<td>' + escapeHtml(oi.quantity) + '</td>' +
          '<td>₹' + escapeHtml(oi.priceAtTime * oi.quantity) + '</td>' +
        '</tr>';
      });

      htmlContent += '</tbody>' +
          '</table>' +
          '<div class="total">Grand Total: ₹' + escapeHtml(order.grandTotal.toFixed(2)) + '</div>' +
          '<div class="footer">Thank you for shopping with Bhusawal Basket!<br>Visit us again at bhusawalbasket.com</div>' +
        '</body>' +
      '</html>';
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Download Tax Invoice' });
    } catch (error) {
      console.error("Invoice error:", error);
      Alert.alert('Error', 'Failed to generate tax invoice.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backTouch}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t.orderDetails}</Text>
        <TouchableOpacity 
          style={styles.helpBtn} 
          onPress={() => navigation.navigate('CustomerCare')}
        >
          <Ionicons name="headset-outline" size={16} color="#475569" />
          <Text style={styles.helpBtnText}>{t.help}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Product centered block */}
        <View style={styles.productCenterCard}>
          {/* backdrop design icons */}
          <View style={styles.backdropIconsContainer}>
            <Ionicons name="footsteps-outline" size={40} color="#e2e8f0" style={styles.bgIcon1} />
            <Ionicons name="gift-outline" size={40} color="#e2e8f0" style={styles.bgIcon2} />
            <Ionicons name="shirt-outline" size={40} color="#e2e8f0" style={styles.bgIcon3} />
            <Ionicons name="wallet-outline" size={40} color="#e2e8f0" style={styles.bgIcon4} />
          </View>

          <View style={styles.productImgBorderCard}>
            {productImg ? (
              <Image source={{ uri: resolveImageUrl(productImg) }} style={styles.productLargeImg} resizeMode="contain" />
            ) : (
              <Text style={{ fontSize: 40 }}>📦</Text>
            )}
          </View>
          
          <Text style={styles.brandTitle}>{productBrand}</Text>
          <Text style={styles.productFullTitle}>{productName}</Text>
          <Text style={styles.productPackSize}>
            {packSize ? `Size: ${packSize}` : ''} {quantity ? `· Quantity: ${quantity}` : ''}
          </Text>
          <Text style={styles.orderIdMeta}>{t.orderIdPrefix}{order.id.slice(-6).toUpperCase()} {order.id.slice(0, 14).replace(/-/g, '')}</Text>
        </View>

        {/* Timeline Status tracker card */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineMainHeader}>
            {order.status === 'Cancelled' ? 'Order Cancelled' : 
             order.status === 'Refunded' ? 'Order Refunded' : 
             order.status === 'Failed' ? 'Order Failed' : 
             order.status === 'Delivered' ? 'Order Delivered' : `Arriving by ${estArrivalDate}`}
          </Text>

          {order.status === 'Cancelled' || order.status === 'Refunded' || order.status === 'Failed' ? (
            <View style={styles.cancelledStatus}>
              <Ionicons name="close-circle" size={32} color="#ff4757" />
              <Text style={styles.cancelledText}>
                {order.status === 'Refunded' ? 'This order has been refunded.' : 
                 order.status === 'Failed' ? 'This order failed.' : t.cancelledMsg}
              </Text>
            </View>
          ) : (
            <View style={styles.timelineWrapper}>
              {/* Delivered Node */}
              <View style={styles.timelineRow}>
                <View style={styles.nodeColumn}>
                  <View style={[
                    styles.nodeDot, 
                    order.status === 'Delivered' ? styles.nodeDotGreen : styles.nodeDotGrey
                  ]}>
                    {order.status === 'Delivered' && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  <View style={[styles.timelineLine, order.status === 'Delivered' ? styles.lineGreen : styles.lineDashed]} />
                </View>
                <View style={styles.timelineDetails}>
                  <Text style={[styles.timelineNodeTitle, order.status !== 'Delivered' && { color: '#94a3b8' }]}>
                    {order.status === 'Delivered' ? `Delivered on ${orderDate}` : `Arriving by ${estArrivalDate}`}
                  </Text>
                </View>
              </View>

              {/* In Transit Node (Active Banner if Out for Delivery or Packed) */}
              {order.status === 'Packed' || order.status === 'Out for Delivery' ? (
                <View style={styles.timelineRow}>
                  <View style={styles.nodeColumn}>
                    <View style={styles.emptyNodeSpot} />
                    <View style={[styles.timelineLine, styles.lineGreen]} />
                  </View>
                  <View style={styles.activeTransitPill}>
                    <Ionicons name="cube" size={20} color="#fff" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.transitTextWhite}>{t.inTransit}</Text>
                      <Text style={styles.transitSubTextWhite}>{t.on}{orderDate}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#fff" />
                  </View>
                </View>
              ) : (
                <View style={styles.timelineRow}>
                  <View style={styles.nodeColumn}>
                    <View style={[
                      styles.nodeDot, 
                      order.status === 'Delivered' ? styles.nodeDotGreen : styles.nodeDotGrey
                    ]}>
                      {order.status === 'Delivered' && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                    <View style={[styles.timelineLine, order.status === 'Delivered' ? styles.lineGreen : styles.lineDashed]} />
                  </View>
                  <View style={styles.timelineDetails}>
                    <Text style={[styles.timelineNodeTitle, { color: '#94a3b8' }]}>{t.inTransit}</Text>
                  </View>
                </View>
              )}

              {/* Order Placed Node */}
              <View style={styles.timelineRow}>
                <View style={styles.nodeColumn}>
                  <View style={[styles.nodeDot, styles.nodeDotGreen]}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                </View>
                <View style={styles.timelineDetails}>
                  <Text style={styles.timelineNodeTitle}>{t.orderPlaced}<Text style={{ color: '#64748b', fontWeight: 'normal' }}>{t.on}{orderDate}</Text></Text>
                </View>
              </View>
            </View>
          )}

          {/* Timeline actions */}
          <View style={styles.timelineActions}>
            <TouchableOpacity 
              style={[styles.timelineBtn, order.status !== 'Preparing' && { opacity: 0.5 }]} 
              disabled={order.status !== 'Preparing'}
              onPress={handleCancel}
            >
              <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
              <Text style={styles.timelineBtnTextCancel}>{t.cancelItem}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.timelineBtn, order.status === 'Cancelled' && { opacity: 0.5 }]} 
              disabled={order.status === 'Cancelled'}
              onPress={() => navigation.navigate('DeliveryTracking', { orderId: order.id })}
            >
              <Ionicons name="location-outline" size={18} color="#00b894" />
              <Text style={styles.timelineBtnTextTrack}>{t.trackItem}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Expiry Date Card */}
        <View style={styles.infoRowCard}>
          <Ionicons name="time" size={20} color="#64748b" />
          <Text style={styles.infoRowCardLabel}>{t.expiryDate}</Text>
          <Text style={styles.infoRowCardValue}>{expiryDate}</Text>
        </View>

        {/* Cross-Sell Cards */}
        {crossSellProducts.length > 0 && (
          <View style={styles.crossSellSection}>
            <Text style={styles.crossSellHeader}>{t.crossSellHeader}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.crossSellScroll}>
              {crossSellProducts.map(p => (
                <View key={p.id} style={styles.crossSellCard}>
                  <View style={styles.crossSellImgContainer}>
                    <Image source={{ uri: resolveImageUrl(p.img) }} style={styles.crossSellImg} resizeMode="contain" />
                  </View>
                  <Text style={styles.crossSellBrand} numberOfLines={1}>{p.brand}</Text>
                  <Text style={styles.crossSellName} numberOfLines={1}>{p.name}</Text>
                  <View style={styles.crossSellFooter}>
                    <Text style={styles.crossSellPrice}>₹{p.price}</Text>
                    <TouchableOpacity style={styles.crossSellAddBtn} onPress={() => {
                      addToCart(p);
                      Alert.alert('Added to Cart 🛒', `${p.name} has been added.`);
                    }}>
                      <Text style={styles.crossSellAddText}>{t.add}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Delivery details Card */}
        <View style={styles.deliveryDetailsCard}>
          {/* Avatar and Delivery To */}
          <View style={styles.deliveryToHeader}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>JD</Text>
            </View>
            <View style={{ marginLeft: 15, flex: 1 }}>
              <Text style={styles.deliveryToLabel}>{t.deliveryTo}</Text>
              <Text style={styles.deliveryToName}>{currentUser?.name || order.address?.receiverName || 'Customer'}</Text>
            </View>
          </View>
          <View style={styles.innerDivider} />

          {/* Contact Details */}
          <View style={styles.deliveryDetailRow}>
            <Ionicons name="call-outline" size={20} color="#64748b" style={{ marginRight: 15 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryRowLabel}>{t.contactDetails}</Text>
              <Text style={styles.deliveryRowValue}>{currentUser?.phone || order.address?.receiverPhone || '8446558375'}</Text>
            </View>
          </View>
          <View style={styles.innerDivider} />

          {/* Delivery Address */}
          <View style={styles.deliveryDetailRow}>
            <Ionicons name="location-outline" size={20} color="#64748b" style={{ marginRight: 15 }} />
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.deliveryRowLabel}>{t.deliveryAddress}</Text>
              <Text style={styles.deliveryRowAddress}>
                {order.address?.completeAddress || '31, ITI Ambad Link Road, Saptashrungi Nagar, Kamatwada, Nashik - 422010'}
              </Text>
            </View>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=100&auto=format&fit=crop&q=60' }} 
              style={styles.mockMapImage}
            />
          </View>
        </View>

        {/* Savings Badge */}
        {order.discountAmount > 0 && (
          <View style={styles.savingsBanner}>
            <View style={styles.savingsIconBadge}>
              <Ionicons name="ribbon" size={18} color="#00b894" />
            </View>
            <Text style={styles.savingsText}>
              {t.savedAmountPrefix}<Text style={styles.savingsBold}>₹{order.discountAmount.toFixed(0)}</Text>
            </Text>
          </View>
        )}

        {/* Pre-pay block (if COD and active order) */}
        {order.paymentMethod === 'COD' && order.status !== 'Cancelled' && order.status !== 'Delivered' && (
          <View style={styles.prePayPromptCard}>
            <View style={styles.prePayRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.prePayHeader}>{t.prePayHeader}</Text>
                <Text style={styles.prePaySub}>{t.prePaySub}</Text>
              </View>
              <View style={styles.blueWalletIconContainer}>
                <Ionicons name="wallet" size={24} color="#3b82f6" />
              </View>
            </View>
            <View style={styles.prePayInnerDivider} />
            <Text style={styles.prePayItemsCount}>{t.payingFor}{itemsCount}{t.of}{itemsCount}{t.itemsCountSuffix}</Text>
            
            <View style={styles.prePayProductItem}>
              {productImg ? (
                <Image source={{ uri: resolveImageUrl(productImg) }} style={styles.prePayProductThumb} resizeMode="contain" />
              ) : (
                <Text>📦</Text>
              )}
              <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.prePayProductBrand}>{productBrand}</Text>
                <Text style={styles.prePayProductName} numberOfLines={1}>{productName}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.pinkPayBtn} onPress={handlePrepay}>
              <Text style={styles.pinkPayBtnText}>{t.payNowPrefix}{order.grandTotal.toFixed(2)}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Collapsible Payment details breakdown */}
        <View style={styles.expandableSummaryCard}>
          <TouchableOpacity 
            activeOpacity={0.8}
            style={styles.summaryTitleRow}
            onPress={() => setIsSummaryExpanded(!isSummaryExpanded)}
          >
            <Text style={styles.summaryTitle}>{t.totalOrderPrice}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.summaryPriceValue}>₹{order.grandTotal.toFixed(2)}</Text>
              <Ionicons 
                name={isSummaryExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#64748b" 
                style={{ marginLeft: 6 }} 
              />
            </View>
          </TouchableOpacity>

          {isSummaryExpanded && (
            <View style={styles.summaryBreakdown}>
              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryItemLabel}>{t.itemTotal}</Text>
                <Text style={styles.summaryItemValue}>₹{order.itemTotal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryItemLabel}>{t.deliveryFee}</Text>
                <Text style={[styles.summaryItemValue, order.deliveryFee === 0 && { color: '#00b894' }]}>
                  {order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee.toFixed(2)}`}
                </Text>
              </View>
              {order.discountAmount > 0 && (
                <View style={styles.summaryItemRow}>
                  <Text style={[styles.summaryItemLabel, { color: '#00b894' }]}>{t.discountSaved}</Text>
                  <Text style={[styles.summaryItemValue, { color: '#00b894' }]}>-₹{order.discountAmount.toFixed(2)}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* PDF Invoice Downloader Card */}
        <TouchableOpacity style={styles.downloadInvoiceBtn} onPress={handleDownloadInvoice}>
          <Ionicons name="document-text" size={20} color="#00b894" />
          <Text style={styles.downloadInvoiceText}>{t.downloadInvoice}</Text>
        </TouchableOpacity>

        {/* Updates Sent To card */}
        <View style={styles.metadataCard}>
          <View style={styles.metadataIconBg}>
            <Ionicons name="notifications" size={20} color="#6366f1" />
          </View>
          <View style={{ marginLeft: 15, flex: 1 }}>
            <Text style={styles.metadataCardLabel}>{t.updatesSentTo}</Text>
            <Text style={styles.metadataCardSubLabel}>{t.call}</Text>
            <Text style={styles.metadataCardValue}>{currentUser?.phone || '8446558375'}</Text>
          </View>
        </View>

        {/* Order Details metadata card */}
        <View style={styles.metadataCard}>
          <View style={styles.metadataIconBg}>
            <Ionicons name="cube" size={20} color="#6366f1" />
          </View>
          <View style={{ marginLeft: 15, flex: 1 }}>
            <Text style={styles.metadataCardLabel}>{t.orderDetails}</Text>
            <View style={styles.metaRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.metadataCardSubLabel}>{t.orderedOn}</Text>
                <Text style={styles.metadataCardValue}>{orderDate}</Text>
              </View>
              <View style={{ flex: 2 }}>
                <Text style={styles.metadataCardSubLabel}>{t.orderId}</Text>
                <Text style={styles.metadataCardValue} numberOfLines={1}># {order.id.replace(/-/g, '').toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'ios' ? 10 : 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 5
  },
  backTouch: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  helpBtnText: { fontSize: 13, fontWeight: '700', color: '#475569', marginLeft: 4 },
  scrollContent: { padding: 16 },
  productCenterCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    position: 'relative',
    overflow: 'hidden',
  },
  backdropIconsContainer: {
    position: 'absolute',
    width: '110%',
    height: '110%',
    top: 0,
    left: 0,
    pointerEvents: 'none',
  },
  bgIcon1: { position: 'absolute', top: 20, left: 20, opacity: 0.03, transform: [{ rotate: '-15deg' }] },
  bgIcon2: { position: 'absolute', bottom: 30, left: 30, opacity: 0.03, transform: [{ rotate: '10deg' }] },
  bgIcon3: { position: 'absolute', top: 30, right: 30, opacity: 0.03, transform: [{ rotate: '25deg' }] },
  bgIcon4: { position: 'absolute', bottom: 40, right: 20, opacity: 0.03, transform: [{ rotate: '-10deg' }] },
  productImgBorderCard: {
    width: 140,
    height: 140,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  productLargeImg: { width: '100%', height: '100%' },
  brandTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', marginBottom: 4 },
  productFullTitle: { fontSize: 15, fontWeight: '600', color: '#475569', textAlign: 'center', lineHeight: 22, paddingHorizontal: 15, marginBottom: 8 },
  productPackSize: { fontSize: 13, color: '#64748b', fontWeight: '700', marginBottom: 12 },
  orderIdMeta: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },
  
  timelineCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  timelineMainHeader: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 20 },
  cancelledStatus: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  cancelledText: { fontSize: 14, color: '#ff4757', fontWeight: '700', marginLeft: 12 },
  timelineWrapper: { paddingLeft: 10 },
  timelineRow: { flexDirection: 'row', minHeight: 60 },
  nodeColumn: { alignItems: 'center', marginRight: 15, width: 20 },
  nodeDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  nodeDotGreen: { backgroundColor: '#00b894', borderColor: '#00b894' },
  nodeDotGrey: { backgroundColor: '#fff', borderColor: '#cbd5e1' },
  emptyNodeSpot: { width: 20, height: 20 },
  timelineLine: { width: 2, flex: 1, marginVertical: 4 },
  lineGreen: { backgroundColor: '#00b894' },
  lineDashed: { backgroundColor: '#cbd5e1' },
  timelineDetails: { flex: 1, paddingTop: 1 },
  timelineNodeTitle: { fontSize: 14, fontWeight: '900', color: '#1e293b' },
  activeTransitPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00b894',
    borderRadius: 18,
    padding: 12,
    marginTop: -8,
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#00b894',
    shadowOpacity: 0.2,
    shadowRadius: 5
  },
  transitTextWhite: { color: '#fff', fontSize: 14, fontWeight: '900' },
  transitSubTextWhite: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600', marginTop: 1 },
  
  timelineActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 15,
  },
  timelineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    flex: 0.48,
    justifyContent: 'center',
  },
  timelineBtnTextCancel: { fontSize: 13, fontWeight: '800', color: '#ef4444', marginLeft: 6 },
  timelineBtnTextTrack: { fontSize: 13, fontWeight: '800', color: '#00b894', marginLeft: 6 },

  infoRowCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  infoRowCardLabel: { fontSize: 14, fontWeight: '800', color: '#1e293b', flex: 1, marginLeft: 12 },
  infoRowCardValue: { fontSize: 14, fontWeight: '900', color: '#0f172a' },

  crossSellSection: { marginBottom: 20, marginTop: 5 },
  crossSellHeader: { fontSize: 15, fontWeight: '900', color: '#0f172a', marginBottom: 12, marginLeft: 2 },
  crossSellScroll: { paddingRight: 20 },
  crossSellCard: {
    backgroundColor: '#fff',
    width: 140,
    borderRadius: 22,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  crossSellImgContainer: {
    width: '100%',
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  crossSellImg: { width: '100%', height: '100%' },
  crossSellBrand: { fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' },
  crossSellName: { fontSize: 12, fontWeight: '700', color: '#1e293b', marginTop: 1 },
  crossSellFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  crossSellPrice: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  crossSellAddBtn: {
    borderWidth: 1,
    borderColor: '#00b894',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f0fdf4',
  },
  crossSellAddText: { fontSize: 10, fontWeight: '900', color: '#00b894' },

  deliveryDetailsCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  deliveryToHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00b894', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  deliveryToLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '800' },
  deliveryToName: { fontSize: 15, fontWeight: '900', color: '#1e293b', marginTop: 1 },
  innerDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 15 },
  deliveryDetailRow: { flexDirection: 'row', alignItems: 'flex-start' },
  deliveryRowLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '800' },
  deliveryRowValue: { fontSize: 14, fontWeight: '900', color: '#1e293b', marginTop: 2 },
  deliveryRowAddress: { fontSize: 13, color: '#334155', fontWeight: '600', lineHeight: 18, marginTop: 2 },
  mockMapImage: { width: 50, height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },

  savingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7f0', // Very light mint green
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  savingsIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  savingsText: { fontSize: 13, color: '#047857', fontWeight: '700' },
  savingsBold: { fontWeight: '900', color: '#00b894' },

  prePayPromptCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  prePayRow: { flexDirection: 'row', alignItems: 'center' },
  prePayHeader: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
  prePaySub: { fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 16 },
  blueWalletIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prePayInnerDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 15 },
  prePayItemsCount: { fontSize: 12, color: '#64748b', fontWeight: '800', marginBottom: 15 },
  prePayProductItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  prePayProductThumb: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#f1f5f9', padding: 2 },
  prePayProductBrand: { fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' },
  prePayProductName: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginTop: 1 },
  pinkPayBtn: {
    backgroundColor: '#ff4757',
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#ff4757',
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  pinkPayBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  expandableSummaryCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  summaryTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  summaryPriceValue: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  summaryBreakdown: { borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 15, paddingTop: 15 },
  summaryItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryItemLabel: { fontSize: 13, color: '#64748b', fontWeight: '700' },
  summaryItemValue: { fontSize: 13, color: '#0f172a', fontWeight: '800' },

  downloadInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 20,
    paddingVertical: 14,
    marginBottom: 16,
  },
  downloadInvoiceText: { fontSize: 14, fontWeight: '800', color: '#00b894', marginLeft: 8 },

  metadataCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  metadataIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metadataCardLabel: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  metadataCardSubLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '800', marginTop: 8 },
  metadataCardValue: { fontSize: 13, fontWeight: '700', color: '#334155', marginTop: 2 },
  metaRow: { flexDirection: 'row', marginTop: 2 },
});
