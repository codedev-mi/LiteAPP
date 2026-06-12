import React, { useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../context/AppContext';

export default function FavouritesScreen({ navigation }) {
  const { favourites, favouriteProducts, fetchFavourites, toggleFavourite, cart, addToCart, removeFromCart, resolveImageUrl } = useContext(AppContext);

  useEffect(() => {
    fetchFavourites();
  }, []);

  const favProducts = favouriteProducts;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wishlist ❤️</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={favProducts}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 70, marginBottom: 20 }}>❤️</Text>
            <Text style={styles.emptyTitle}>Your Wishlist is empty</Text>
            <Text style={styles.emptySub}>Bookmark your favourite items to find them here easily!</Text>
            <TouchableOpacity 
              style={styles.shopBtn} 
              onPress={() => navigation.navigate('UserHome')}
            >
              <Text style={styles.shopBtnText}>Browse Products</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.favCard}>
            <View style={styles.imgBox}>
              <Image source={typeof item.img === 'string' ? { uri: resolveImageUrl(item.img) } : item.img} style={{ width: '80%', height: '80%' }} resizeMode="contain" />
            </View>
            
            <View style={{ flex: 1, marginLeft: 15 }}>
              <View style={styles.row}>
                <TouchableOpacity 
                  style={{ flex: 1 }}
                  onPress={() => navigation.navigate('ProductDescription', { product: item })}
                >
                  <Text style={styles.favName}>{item.name}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleFavourite(item.id)}>
                  <Ionicons name="trash-outline" size={20} color="#ff5252" />
                </TouchableOpacity>
              </View>
              <Text style={styles.favCat}>{item.cat}</Text>
              
              <View style={styles.cardFooter}>
                <Text style={styles.favPrice}>₹{item.price}</Text>
                <View style={{ width: 100 }}>
                  {cart.find(c => c.id === item.id) ? (
                    <View style={styles.qtyContainer}>
                      <TouchableOpacity onPress={() => removeFromCart(item)} style={styles.qtyBtn}>
                        <Text style={styles.qtyBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{cart.find(c => c.id === item.id).quantity}</Text>
                      <TouchableOpacity onPress={() => addToCart(item)} style={styles.qtyBtn}>
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.addBtn} 
                      onPress={() => addToCart(item)}
                    >
                      <Text style={styles.addText}>ADD</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 20, 
    paddingTop: 45, 
    backgroundColor: 'white', 
    borderBottomWidth: 1, 
    borderColor: '#eee' 
  },
  backBtn: { fontSize: 16, color: '#4CAF50', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  favCard: { 
    flexDirection: 'row', 
    backgroundColor: 'white', 
    padding: 15, 
    borderRadius: 15, 
    marginBottom: 15, 
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  imgBox: { 
    width: 80, 
    height: 80, 
    backgroundColor: '#f5f5f5', 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  favName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  favCat: { fontSize: 12, color: '#888', marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  favPrice: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32' },
  addBtn: { 
    backgroundColor: '#fff', 
    borderWidth: 1, 
    borderColor: '#4CAF50', 
    paddingHorizontal: 15, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  addText: { color: '#00b894', fontWeight: 'bold', fontSize: 13 },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#00b894', borderRadius: 10, paddingVertical: 5, paddingHorizontal: 10 },
  qtyBtn: { paddingHorizontal: 5 },
  qtyBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  qtyText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold' },
  emptySub: { fontSize: 14, color: '#999', marginTop: 10, textAlign: 'center', paddingHorizontal: 40 },
  shopBtn: { backgroundColor: '#00b894', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 12, marginTop: 30 },
  shopBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
