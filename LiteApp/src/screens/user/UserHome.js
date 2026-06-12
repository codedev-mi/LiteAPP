import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Image, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../context/AppContext';
import Skeleton from '../../components/Skeleton';
import ProductCard from '../../components/ProductCard';

const { width } = Dimensions.get('window');

const t = {
  deliveryIn10Mins: 'Delivery in 10 mins',
  shopNow: 'Shop Now',
  shopByCategory: 'Shop by Category',
  trendingNow: 'Trending Now 🔥',
  bestSellers: 'Best Sellers 🏆',
  recentlyViewed: 'Recently Viewed',
  topPicksForYou: 'Top Picks for You',
  totalRupees: 'Total: ₹',
  checkout: 'Checkout ›'
};

export default function UserHome({ navigation }) {
  const { cart, products, categories, banners, currentAddress, currentUser, favourites, setFavourites, addToCart, removeFromCart, recentlyViewed, addToRecentlyViewed, bestSellers, trendingProducts, orders, fetchOrders } = useContext(AppContext);
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Map category names to icons for display using a safe ES6 Map
  const categoryIcons = new Map([
    ['Fruits', '🍎'],
    ['Vegetables', '🥦'],
    ['Grocery', '🍚'],
    ['Dairy', '🥛'],
    ['Meat / Seafood', '🥩'],
    ['Fruits & Vegetables', '🍎'],
    ['Grocery & Staples', '🍚'],
    ['Dairy & Bread', '🥛'],
    ['Beverages', '🧃'],
    ['Branded Foods', '🏷️'],
    ['Home & Kitchen', '🍳'],
    ['Household', '🧹'],
    ['Personal Care', '🧼']
  ]);

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 2000); // Mimic loading

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (currentUser) {
      fetchOrders();
      // Poll orders status every 10 seconds for real-time tracking popup updates
      const interval = setInterval(() => {
        fetchOrders();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const toggleFavourite = (id) => {
    if (favourites.includes(id)) {
      setFavourites(favourites.filter(f => f !== id));
    } else {
      setFavourites([...favourites, id]);
    }
  };

  const activeOrder = orders && orders.find(o => o.status === 'Preparing' || o.status === 'OutForDelivery' || o.status === 'Pending' || o.status === 'Out for Delivery' || o.status === 'Arriving Soon');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.userHeader}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => navigation.navigate('AddressList')}
        >
          <Text style={styles.smallLabel}>{t.deliveryIn10Mins}</Text>
          <Text style={styles.boldText} numberOfLines={1}>
            {currentAddress ? `${currentAddress.tag}: ${currentAddress.detail}` : 'Select an Address'} ▼
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={24} color="#2d3436" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={{ padding: 15 }}>
            <Skeleton width="100%" height={150} borderRadius={20} />
            <View style={{ flexDirection: 'row', marginTop: 25 }}>
              {[1, 2, 3, 4].map(i => <Skeleton key={i} width={80} height={100} borderRadius={15} style={{ marginRight: 15 }} />)}
            </View>
            <View style={{ marginTop: 40 }}>
              <Skeleton width={200} height={25} borderRadius={5} />
              <View style={{ flexDirection: 'row', marginTop: 20 }}>
                <Skeleton width={160} height={220} borderRadius={20} style={{ marginRight: 15 }} />
                <Skeleton width={160} height={220} borderRadius={20} />
              </View>
            </View>
          </View>
        ) : (
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            {/* Banner */}
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {(banners && banners.length > 0 ? banners : [
                { id: 'b1', title: 'Fresh Summer Fruits', subtitle: 'Flat 20% Off', imageUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?q=80&w=1000&auto=format&fit=crop' },
                { id: 'b2', title: 'Organic Essentials', subtitle: 'Buy 1 Get 1 Free', imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop' }
              ]).map((banner, i) => (
                <View key={banner.id || `banner-${i}`} style={styles.banner}>
                  <Image source={{ uri: banner.imageUrl }} style={styles.bannerImg} />
                  <View style={styles.bannerOverlay}>
                    <Text style={styles.bannerSub}>{banner.subtitle}</Text>
                    <Text style={styles.bannerTitle}>{banner.title}</Text>
                    <TouchableOpacity style={styles.bannerBtn}>
                      <Text style={styles.bannerBtnText}>{t.shopNow}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Categories */}
            <Text style={styles.sectionTitle}>{t.shopByCategory}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 15 }}>
              {(categories && categories.length > 0 ? categories : [
                { id: 'c1', name: 'Fruits' },
                { id: 'c2', name: 'Vegetables' },
                { id: 'c3', name: 'Grocery' },
                { id: 'c4', name: 'Dairy' },
                { id: 'c5', name: 'Meat / Seafood' },
              ]).map((c, i) => (
                <TouchableOpacity
                  key={c.id || `cat-${i}`}
                  style={styles.catPill}
                  onPress={() => navigation.navigate('CategoryProducts', { category: c.name })}
                >
                  <View style={styles.catIconBox}>
                    <Text style={{ fontSize: 25 }}>{categoryIcons.get(c.name) || '📦'}</Text>
                  </View>
                  <Text style={styles.catPillText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Trending Now */}
            {trendingProducts && trendingProducts.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>{t.trendingNow}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 15 }}>
                  {trendingProducts.map(item => (
                    <ProductCard key={`trending-${item.id}`} item={item} navigation={navigation} style={{ width: 150, marginRight: 15, marginBottom: 15 }} />
                  ))}
                </ScrollView>
              </>
            )}

            {/* Best Sellers */}
            {bestSellers && bestSellers.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>{t.bestSellers}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 15 }}>
                  {bestSellers.map(item => (
                    <ProductCard key={`bestseller-${item.id}`} item={item} navigation={navigation} style={{ width: 150, marginRight: 15, marginBottom: 15 }} />
                  ))}
                </ScrollView>
              </>
            )}

            {/* Recently Viewed */}
            {recentlyViewed && recentlyViewed.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>{t.recentlyViewed}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 15 }}>
                  {recentlyViewed.map(item => (
                    <TouchableOpacity
                      key={`recent-${item.id}`}
                      style={styles.recentItem}
                      onPress={() => {
                        addToRecentlyViewed(item);
                        navigation.navigate('ProductDescription', { product: item });
                      }}
                    >
                      <View style={{ width: 70, height: 70, borderRadius: 35, overflow: 'hidden', marginBottom: 5, backgroundColor: '#f8f9fa', padding: 5, justifyContent: 'center', alignItems: 'center' }}>
                        <Image
                          source={typeof item.img === 'string' ? { uri: item.img } : item.img}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="contain"
                        />
                      </View>
                      <Text style={styles.recentName} numberOfLines={1}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Top Picks */}
            <Text style={styles.sectionTitle}>{t.topPicksForYou}</Text>
            <View style={styles.productGrid}>
              {products && products.slice(0, 6).map((item) => (
                <ProductCard key={`top-${item.id}`} item={item} navigation={navigation} />
              ))}
            </View>
            {cart && cart.length > 0 ? (
              <View style={{ height: activeOrder ? 200 : 120 }} />
            ) : (
              <View style={{ height: activeOrder ? 110 : 30 }} />
            )}
          </Animated.View>
        )}
      </ScrollView>

      {cart && cart.length > 0 && (
        <Animated.View style={[styles.cartBar, { opacity: fadeAnim }]}>
          <View>
            <Text style={styles.cartBarItems}>
              {cart.reduce((total, item) => total + item.quantity, 0)} Items
            </Text>
            <Text style={styles.cartBarTotal}>
              {t.totalRupees}{cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() => navigation.navigate('Checkout')}
          >
            <Text style={styles.cartBarText}>{t.checkout}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {activeOrder && (
        <Animated.View style={[styles.trackingBar, { bottom: (cart && cart.length > 0) ? (Platform.OS === 'ios' ? 120 : 100) : (Platform.OS === 'ios' ? 30 : 20), opacity: fadeAnim }]}>
          <View style={styles.trackingIconContainer}>
            <Ionicons name="time" size={24} color="#00b894" />
          </View>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.trackingTitle}>Order in progress 🚚</Text>
            <Text style={styles.trackingStatus}>Status: {activeOrder.status}</Text>
          </View>
          <TouchableOpacity
            style={styles.trackBtn}
            onPress={() => navigation.navigate('DeliveryTracking', { orderId: activeOrder.id })}
          >
            <Text style={styles.trackBtnText}>Track</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#f1f2f6'
  },
  profileIcon: { backgroundColor: '#f5f6fa', padding: 4, borderRadius: 25, marginLeft: 10, width: 45, height: 45, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
  profileImg: { width: '100%', height: '100%', borderRadius: 25 },
  smallLabel: { fontSize: 11, color: '#ff4757', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  boldText: { fontWeight: '800', fontSize: 16, marginTop: 2, color: '#2d3436' },
  searchBox: {
    margin: 15,
    backgroundColor: '#f1f2f6',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e2e6'
  },
  banner: {
    width: width,
    height: 200,
    overflow: 'hidden',
    position: 'relative'
  },
  bannerImg: {
    width: '100%',
    height: '100%',
    position: 'absolute'
  },
  bannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 25,
    justifyContent: 'center'
  },
  bannerTag: { color: '#00b894', fontWeight: '900', fontSize: 10, letterSpacing: 1, marginBottom: 5 },
  bannerSub: { color: '#fff', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', marginBottom: 5 },
  bannerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 15 },
  bannerBtn: { backgroundColor: '#00b894', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, alignSelf: 'flex-start' },
  bannerBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  recentItem: { width: 90, marginRight: 20, alignItems: 'center' },
  recentImg: { width: 70, height: 70, backgroundColor: '#f9f9f9', borderRadius: 35, marginBottom: 5 },
  recentName: { fontSize: 11, color: '#636e72', fontWeight: '600' },
  sectionTitle: { fontSize: 20, fontWeight: '900', marginHorizontal: 15, marginTop: 40, marginBottom: 40, color: '#2d3436' },
  catPill: { alignItems: 'center', marginRight: 20 },
  catIconBox: { backgroundColor: '#fff', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#f1f2f6', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05 },
  catPillText: { fontWeight: '800', marginTop: 8, color: '#2d3436', fontSize: 13 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 15, justifyContent: 'space-between' },
  pCard: {
    width: '47%',
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: '#f1f2f6',
    position: 'relative',
    overflow: 'hidden'
  },
  cardContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    alignItems: 'center'
  },
  imageWrapper: { width: '100%', height: 130, backgroundColor: '#f8f9fa' },
  productImg: { width: '100%', height: '100%' },
  favBtn: { position: 'absolute', top: 12, right: 12, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.8)', padding: 5, borderRadius: 15 },
  discountBadge: { position: 'absolute', top: 12, left: 12, zIndex: 10, backgroundColor: '#00b894', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  discountText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  pName: { fontWeight: '700', marginTop: 8, textAlign: 'center', width: '100%', color: '#2d3436', fontSize: 14 },
  pPrice: { color: '#00b894', fontWeight: '900', marginTop: 5, fontSize: 18 },
  pOldPrice: { color: '#b2bec3', fontSize: 12, textDecorationLine: 'line-through', marginTop: 2, marginLeft: 4 },
  addBtnContainer: { width: '100%', padding: 12, paddingTop: 0 },
  addBtn: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#00b894',
    width: '100%',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center'
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#00b894',
    borderRadius: 12,
    width: '100%',
    paddingVertical: 6,
    paddingHorizontal: 10
  },
  qtyBtn: { paddingHorizontal: 10 },
  qtyBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  qtyValue: { color: '#fff', fontWeight: '900', fontSize: 16 },
  cartBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
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
    shadowRadius: 15
  },
  cartBarItems: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  cartBarTotal: { color: '#b2bec3', fontSize: 12, marginTop: 2 },
  checkoutBtn: { backgroundColor: '#00b894', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 },
  cartBarText: { color: 'white', fontWeight: '900' },
  trackingBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#00b894',
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  trackingIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8fdfa',
    justifyContent: 'center',
    alignItems: 'center'
  },
  trackingTitle: { fontSize: 14, fontWeight: '900', color: '#2d3436' },
  trackingStatus: { fontSize: 12, color: '#636e72', marginTop: 2 },
  trackBtn: { backgroundColor: '#00b894', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  trackBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 }
});
