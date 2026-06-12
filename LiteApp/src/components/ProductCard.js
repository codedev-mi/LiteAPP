import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../context/AppContext';

export default function ProductCard({ item, navigation, style }) {
  const { cart, addToCart, removeFromCart, favourites, setFavourites, addToRecentlyViewed, resolveImageUrl } = useContext(AppContext);
  const [selectedVariant, setSelectedVariant] = useState(item.variants && item.variants.length > 0 ? item.variants[0] : null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);

  const toggleFavourite = () => {
    if (favourites.includes(item.id)) {
      setFavourites(favourites.filter(f => f !== item.id));
    } else {
      setFavourites([...favourites, item.id]);
    }
  };

  const handleProductPress = () => {
    addToRecentlyViewed(item);
    navigation.navigate('ProductDescription', { product: item });
  };

  const handleAddToCart = () => {
    // If we have selectedVariant, create a compound item to uniquely identify the variant in cart
    const cartItem = selectedVariant 
      ? { ...item, id: `${item.id}_${selectedVariant.id}`, price: selectedVariant.price, packSize: selectedVariant.label, originalProductId: item.id }
      : item;

    addToCart(cartItem);
  };
  
  const handleRemoveFromCart = () => {
    const cartItem = selectedVariant 
      ? { ...item, id: `${item.id}_${selectedVariant.id}` }
      : item;
      
    removeFromCart(cartItem);
  };

  // Check if current variant is in cart
  const cartIdToCheck = selectedVariant ? `${item.id}_${selectedVariant.id}` : item.id;
  const inCartItem = cart.find(c => c.id === cartIdToCheck);

  const displayPrice = selectedVariant ? selectedVariant.price : item.price;
  const displayPackSize = selectedVariant ? selectedVariant.label : item.packSize;
  const currentStock = selectedVariant ? selectedVariant.stock : item.stock;
  const isOutOfStock = currentStock <= 0;

  return (
    <View style={[styles.pCard, style]}>
      {item.discount && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>{item.discount}</Text>
        </View>
      )}
      <TouchableOpacity style={styles.favBtn} onPress={toggleFavourite}>
        <Ionicons 
          name={favourites.includes(item.id) ? "heart" : "heart-outline"} 
          size={16} 
          color={favourites.includes(item.id) ? "#ff5252" : "#999"} 
        />
      </TouchableOpacity>

      <TouchableOpacity onPress={handleProductPress} style={{ width: '100%' }}>
        <View style={styles.imageWrapper}>
          {item.img ? (
            <Image 
              source={typeof item.img === 'string' ? { uri: resolveImageUrl(item.img) } : item.img} 
              style={styles.productImg} 
              resizeMode="contain" 
            />
          ) : (
             <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 40 }}>🛒</Text>
             </View>
          )}
        </View>
        <View style={styles.cardContent}>
          {item.brand && <Text style={styles.pBrand}>{item.brand}</Text>}
          <Text style={styles.pName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.pPrice}>₹{displayPrice}</Text>
        </View>
      </TouchableOpacity>

      <View style={{ width: '100%', paddingHorizontal: 10 }}>
        {item.variants && item.variants.length > 1 ? (
          <TouchableOpacity style={styles.variantSelector} onPress={() => setIsVariantModalOpen(true)}>
            <Text style={styles.variantSelText}>{displayPackSize}</Text>
            <Ionicons name="chevron-down" size={14} color="#636e72" />
          </TouchableOpacity>
        ) : (
          <View style={styles.variantSelectorPlaceholder}>
            <Text style={styles.variantSelText}>{displayPackSize}</Text>
          </View>
        )}
      </View>

      <View style={styles.addBtnContainer}>
        {isOutOfStock ? (
           <View style={styles.outOfStockBtn}>
             <Text style={styles.outOfStockText}>OUT OF STOCK</Text>
           </View>
        ) : inCartItem ? (
          <View style={styles.qtyControl}>
            <TouchableOpacity onPress={handleRemoveFromCart} style={styles.qtyBtn}>
              <Text style={styles.qtyBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{inCartItem.quantity}</Text>
            <TouchableOpacity onPress={handleAddToCart} style={styles.qtyBtn}>
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addBtn} onPress={handleAddToCart}>
             <Text style={styles.addBtnText}>ADD</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Variant Selection Modal */}
      <Modal
        visible={isVariantModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsVariantModalOpen(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsVariantModalOpen(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Choose Pack Size</Text>
               <TouchableOpacity onPress={() => setIsVariantModalOpen(false)}>
                 <Ionicons name="close" size={24} color="#2d3436" />
               </TouchableOpacity>
            </View>
            <FlatList
              data={item.variants}
              keyExtractor={v => v.id.toString()}
              renderItem={({ item: v }) => (
                <TouchableOpacity 
                  style={[styles.variantOption, selectedVariant?.id === v.id && styles.variantOptionSelected]}
                  onPress={() => {
                    setSelectedVariant(v);
                    setIsVariantModalOpen(false);
                  }}
                >
                  <View>
                     <Text style={styles.variantOptionLabel}>{v.label}</Text>
                     <Text style={styles.variantOptionPrice}>₹{v.price}</Text>
                  </View>
                  {selectedVariant?.id === v.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#00b894" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#f1f2f6',
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    width: '48%', // relative to container in grid
    elevation: 4,
  },
  imageWrapper: { width: '100%', height: 110, padding: 5 },
  productImg: { width: '100%', height: '100%' },
  favBtn: { position: 'absolute', top: 12, right: 12, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.9)', padding: 6, borderRadius: 15 },
  discountBadge: { position: 'absolute', top: 12, left: 12, zIndex: 10, backgroundColor: '#00b894', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  discountText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  cardContent: { paddingHorizontal: 10, paddingBottom: 5, alignItems: 'center', width: '100%' },
  pBrand: { fontSize: 11, color: '#b2bec3', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 },
  pName: { fontWeight: '700', textAlign: 'center', color: '#2d3436', fontSize: 14, height: 38 },
  pPrice: { color: '#00b894', fontWeight: '900', marginTop: 2, fontSize: 17 },
  variantSelector: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e1e2e6', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, marginBottom: 8, backgroundColor: '#f8f9fa' },
  variantSelectorPlaceholder: { paddingVertical: 4, paddingHorizontal: 8, marginBottom: 8, alignItems: 'center' },
  variantSelText: { fontSize: 12, fontWeight: '600', color: '#636e72', marginRight: 4 },
  addBtnContainer: { width: '100%', paddingHorizontal: 8, paddingBottom: 10 },
  addBtn: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#00b894', paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  addBtnText: { color: '#00b894', fontWeight: '900', fontSize: 14 },
  outOfStockBtn: { backgroundColor: '#f1f2f6', paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  outOfStockText: { color: '#ff4757', fontWeight: 'bold', fontSize: 12 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#00b894', borderRadius: 10, paddingVertical: 5, paddingHorizontal: 8 },
  qtyBtn: { paddingHorizontal: 10 },
  qtyBtnText: { color: '#fff', fontSize: 19, fontWeight: 'bold' },
  qtyValue: { color: '#fff', fontWeight: '900', fontSize: 15 },
  
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, maxHeight: '50%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#2d3436' },
  variantOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  variantOptionSelected: { backgroundColor: '#e8fdfa', borderRadius: 10, paddingHorizontal: 10, borderBottomWidth: 0 },
  variantOptionLabel: { fontSize: 15, fontWeight: '700', color: '#2d3436' },
  variantOptionPrice: { fontSize: 14, color: '#00b894', fontWeight: '600', marginTop: 4 }
});
