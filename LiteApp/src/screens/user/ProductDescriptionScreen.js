import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Animated, Platform, Alert, Modal, TextInput, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppContext } from '../../context/AppContext';

const { width } = Dimensions.get('window');

export default function ProductDescriptionScreen({ route, navigation }) {
  const { product } = route.params;
  const { cart, favourites, toggleFavourite, addToCart, removeFromCart, products, addToRecentlyViewed, addReview, currentUser, theme, resolveImageUrl } = useContext(AppContext);
  const scrollX = useRef(new Animated.Value(0)).current;

  const [reviewsList, setReviewsList] = useState(product?.reviews || []);
  const variants = product.variants && product.variants.length > 0 ? product.variants : [{ id: 0, label: product.packSize, price: product.price }];
  const [selectedVariant, setSelectedVariant] = useState(variants[0]);
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const currentPrice = selectedVariant.price;

  useEffect(() => {
    if (product) addToRecentlyViewed(product);
  }, [product]);

  const handleSubmitReview = async () => {
    if (!newComment.trim()) return;
    setIsSubmittingReview(true);
    const success = await addReview({ productId: product.id, rating: newRating, comment: newComment });
    setIsSubmittingReview(false);
    if (success) {
      const newReviewObj = {
        id: success.id || Math.random().toString(),
        rating: newRating,
        comment: newComment,
        user: { name: currentUser?.name || 'You' },
        createdAt: new Date().toISOString()
      };
      setReviewsList(prev => [newReviewObj, ...prev]);
      setIsReviewModalVisible(false);
      setNewComment('');
      Alert.alert('Review Submitted', 'Thank you for your feedback!');
    }
  };

  if (!product) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{"Product not found."}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: '#00b894', marginTop: 10 }}>{"Go Back"}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const recommendations = products
    .filter(p => p.cat === product.cat && p.id !== product.id)
    .slice(0, 4);

  const cartItemId = product.variants && product.variants.length > 0 ? `${product.id}_${selectedVariant.id}` : product.id;
  const cartItem = cart.find(item => item.id === cartItemId);

  // Calculate average rating
  const reviews = reviewsList;
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ fontSize: 24, color: '#333' }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{"Product Details"}</Text>
        <TouchableOpacity onPress={() => toggleFavourite(product.id)} style={styles.favBtn}>
          <Text style={{ fontSize: 22, color: favourites.includes(product.id) ? '#ff4757' : '#ccc' }}>
            {favourites.includes(product.id) ? '❤️' : '🤍'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Image Slider Section */}
        <View style={styles.imageContainer}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
          >
            {[1, 2, 3].map((_, i) => (
              <View key={i} style={{ width: width, alignItems: 'center' }}>
                <Image 
                  source={typeof product.img === 'string' ? { uri: resolveImageUrl(product.img) } : product.img} 
                  style={styles.mainImg} 
                  resizeMode="contain" 
                />
              </View>
            ))}
          </ScrollView>
          <View style={styles.indicatorContainer}>
            {[1, 2, 3].map((_, i) => {
              const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [10, 25, 10],
                extrapolate: 'clamp',
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.3, 1, 0.3],
                extrapolate: 'clamp',
              });
              return (
                <Animated.View 
                  key={i} 
                  style={[styles.indicator, { width: dotWidth, opacity, backgroundColor: '#00b894' }]} 
                />
              );
            })}
          </View>
        </View>

        <View style={styles.contentCard}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.category}>{product.cat}</Text>
              {product.brand && <Text style={{ fontSize: 13, color: '#b2bec3', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 }}>{product.brand}</Text>}
              <Text style={styles.name}>{product.name}</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.stars}>{"⭐".repeat(Math.floor(avgRating))}</Text>
                <Text style={styles.ratingText}>{avgRating} ({reviews.length} reviews)</Text>
              </View>
            </View>
            <Text style={styles.price}>₹{currentPrice}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>{"Select Pack Size"}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 5 }}>
            {variants.map((v, idx) => {
              const isSelected = selectedVariant.id === v.id;
              return (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.variantPill, isSelected && styles.variantPillActive]}
                  onPress={() => setSelectedVariant(v)}
                >
                  <Text style={[styles.variantText, isSelected && styles.variantTextActive]}>{v.label}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>{"Description"}</Text>
          <Text style={styles.description}>
            {product.description || 'This premium quality product is sourced directly for freshness and quality assurance.'}
          </Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>{"Stock"}</Text>
              {selectedVariant.stock <= 0 ? (
                 <Text style={[styles.infoValue, { color: '#ff4757' }]}>{"Out of Stock"}</Text>
              ) : (
                 <Text style={[styles.infoValue, { color: '#2ed573' }]}>{"In Stock"}</Text>
              )}
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>{"Shipping"}</Text>
              <Text style={styles.infoValue}>{"Free"}</Text>
            </View>
          </View>

          {/* Smart Recommendations */}
          {recommendations.length > 0 && (
            <View style={styles.recommendationSection}>
              <Text style={styles.sectionTitle}>{"You might also like"}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {recommendations.map(item => (
                  <TouchableOpacity 
                    key={`rec-${item.id}`} 
                    style={styles.recCard}
                    onPress={() => navigation.push('ProductDescription', { product: item })}
                  >
                    <Image 
                      source={typeof item.img === 'string' ? { uri: resolveImageUrl(item.img) } : item.img} 
                      style={styles.recImg} 
                      resizeMode="contain" 
                    />
                    <Text style={styles.recName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.recPrice}>₹{item.price}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.divider} />

          {/* Reviews Section */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{"Customer Reviews ("}{reviews.length}{")"}</Text>
            <TouchableOpacity onPress={() => setIsReviewModalVisible(true)}>
              <Text style={{ color: '#00b894', fontWeight: 'bold' }}>{"+ Add Review"}</Text>
            </TouchableOpacity>
          </View>
          
          {reviews.length > 0 ? reviews.map((r, i) => (
            <View key={r.id || i} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.avatar}><Text style={{ color: '#fff', fontWeight: 'bold' }}>{r.user?.name?.[0] || 'U'}</Text></View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.reviewerName}>{r.user?.name || 'Customer'}</Text>
                  <Text style={styles.reviewDate}>{"⭐".repeat(r.rating)}</Text>
                </View>
              </View>
              <Text style={styles.reviewText}>{r.comment}</Text>
            </View>
          )) : (
            <View style={styles.reviewCard}>
              <Text style={{ color: '#999', textAlign: 'center' }}>{"No reviews yet. Be the first to review!"}</Text>
            </View>
          )}
        </View>
        <View style={{ height: 160 }} />
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pricePreview}>
          <Text style={styles.perUnitLabel}>{"Total Price"}</Text>
          <Text style={styles.mainPrice}>₹{currentPrice * (cartItem?.quantity || 1)}</Text>
        </View>
        
        {selectedVariant.stock <= 0 ? (
          <View style={[styles.addBtn, { backgroundColor: '#f1f2f6' }]}>
            <Text style={[styles.addBtnText, { color: '#ff4757' }]}>{"OUT OF STOCK"}</Text>
          </View>
        ) : cartItem ? (
          <View style={styles.footerQty}>
            <TouchableOpacity onPress={() => removeFromCart(cartItem)} style={styles.footerQtyBtn}>
              <Text style={styles.qtyBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.footerQtyValue}>{cartItem.quantity}</Text>
            <TouchableOpacity onPress={() => addToCart(cartItem)} style={styles.footerQtyBtn}>
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addBtn} onPress={() => addToCart({...product, id: cartItemId, price: currentPrice, packSize: selectedVariant.label, originalProductId: product.id})}>
            <Text style={styles.addBtnText}>{"ADD TO CART"}</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {cart && cart.length > 0 && (
        <View style={styles.cartBar}>
          <View>
            <Text style={styles.cartBarItems}>
              {cart.reduce((total, item) => total + item.quantity, 0)} {"Items"}
            </Text>
            <Text style={styles.cartBarTotal}>
              {"Total: ₹"}{cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() => navigation.navigate('Checkout')}
          >
            <Text style={styles.cartBarText}>{"Checkout ›"}</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={isReviewModalVisible}
        onRequestClose={() => setIsReviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentSmall}>
            <Text style={styles.modalTitle}>{"Rate this Product"}</Text>
            
            <View style={styles.starRatingRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setNewRating(star)}>
                  <Text style={{ fontSize: 35, color: star <= newRating ? '#FFD700' : '#ddd', marginHorizontal: 5 }}>
                    {star <= newRating ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Write your experience..."
              multiline
              numberOfLines={4}
              value={newComment}
              onChangeText={setNewComment}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtnSmall} onPress={() => setIsReviewModalVisible(false)}>
                <Text style={styles.cancelText}>{"Cancel"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtnSmall} onPress={handleSubmitReview} disabled={isSubmittingReview}>
                {isSubmittingReview ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>{"Submit Review"}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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
  backBtn: { padding: 8, backgroundColor: '#f1f2f6', borderRadius: 12 },
  favBtn: { padding: 8, backgroundColor: '#f1f2f6', borderRadius: 12 },
  imageContainer: { height: 350, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  mainImg: { width: '85%', height: '85%' },
  indicatorContainer: { 
    flexDirection: 'row', 
    position: 'absolute', 
    bottom: 20, 
    alignSelf: 'center' 
  },
  indicator: { 
    height: 8, 
    borderRadius: 4, 
    marginHorizontal: 4 
  },
  contentCard: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 40, 
    borderTopRightRadius: 40, 
    marginTop: -40, 
    padding: 25,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  category: { color: '#00b894', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  name: { fontSize: 24, fontWeight: '900', color: '#2d3436' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  stars: { fontSize: 14 },
  ratingText: { marginLeft: 8, fontSize: 13, color: '#636e72', fontWeight: '600' },
  price: { fontSize: 26, fontWeight: '900', color: '#00b894' },
  variantPill: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20, marginRight: 15 },
  variantPillActive: { borderColor: '#00b894', backgroundColor: '#e8f5e9' },
  variantText: { fontSize: 14, fontWeight: '700', color: '#636e72' },
  variantTextActive: { color: '#00b894' },
  divider: { height: 1, backgroundColor: '#f1f2f6', marginVertical: 25 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#2d3436', marginBottom: 15 },
  description: { fontSize: 15, color: '#636e72', lineHeight: 22 },
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25, marginBottom: 10 },
  infoBox: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 15, width: '47%', alignItems: 'center' },
  infoLabel: { fontSize: 10, color: '#b2bec3', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 5 },
  infoValue: { fontSize: 14, fontWeight: '900', color: '#2d3436' },
  
  recommendationSection: { marginTop: 30 },
  recCard: { width: 130, marginRight: 20, backgroundColor: '#fff', borderRadius: 20, padding: 12, borderWidth: 1, borderColor: '#f1f2f6' },
  recImg: { width: '100%', height: 80, marginBottom: 10 },
  recName: { fontSize: 13, fontWeight: '700', color: '#2d3436' },
  recPrice: { fontSize: 14, fontWeight: '900', color: '#00b894', marginTop: 4 },

  reviewCard: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 15, marginTop: 10 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 35, height: 35, borderRadius: 17.5, backgroundColor: '#00b894', justifyContent: 'center', alignItems: 'center' },
  reviewerName: { fontSize: 14, fontWeight: '700', color: '#2d3436' },
  reviewDate: { fontSize: 11, color: '#b2bec3' },
  reviewText: { fontSize: 14, color: '#636e72', lineHeight: 20 },

  footer: { 
    position: 'absolute', 
    bottom: 0, 
    width: '100%', 
    backgroundColor: '#fff', 
    padding: 25, 
    paddingBottom: Platform.OS === 'ios' ? 35 : 20,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f2f6'
  },
  pricePreview: { flex: 1 },
  perUnitLabel: { fontSize: 12, color: '#999', fontWeight: 'bold' },
  mainPrice: { fontSize: 24, fontWeight: '900', color: '#2d3436' },
  addBtn: { backgroundColor: '#00b894', paddingHorizontal: 35, paddingVertical: 18, borderRadius: 18 },
  addBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  footerQty: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#00b894', borderRadius: 18, padding: 5 },
  footerQtyBtn: { paddingHorizontal: 15, paddingVertical: 10 },
  qtyBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  footerQtyValue: { color: '#fff', fontWeight: '900', fontSize: 18, marginHorizontal: 10 },
  
  // Review Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContentSmall: { backgroundColor: '#fff', borderRadius: 30, padding: 25, elevation: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#2d3436', textAlign: 'center', marginBottom: 20 },
  starRatingRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 25 },
  reviewInput: { backgroundColor: '#f8f9fa', borderRadius: 20, padding: 20, fontSize: 15, color: '#2d3436', height: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: '#f1f2f6', marginBottom: 25 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtnSmall: { flex: 1, paddingVertical: 18, alignItems: 'center' },
  cancelText: { color: '#636e72', fontWeight: '700', fontSize: 16 },
  confirmBtnSmall: { flex: 1.5, backgroundColor: '#00b894', paddingVertical: 18, borderRadius: 18, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  cartBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 110 : 95,
    left: 20,
    right: 20,
    backgroundColor: '#2d3436',
    padding: 18,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 15,
    zIndex: 100
  },
  cartBarItems: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  cartBarTotal: { color: '#b2bec3', fontSize: 12, marginTop: 2 },
  checkoutBtn: { backgroundColor: '#00b894', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 },
  cartBarText: { color: 'white', fontWeight: '900' }
});
