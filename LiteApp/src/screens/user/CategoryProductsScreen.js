import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Image, Animated, Platform, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppContext } from '../../context/AppContext';
import ProductCard from '../../components/ProductCard';

export default function CategoryProductsScreen({ route, navigation }) {
  const { products, categories, cart, addToCart, removeFromCart, addToRecentlyViewed, favourites, setFavourites, fetchProducts, hasMoreProducts, isLoadingMoreProducts, productPage } = useContext(AppContext);
  
  // Map category names to icons for display
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
    ['Personal Care', '🧼'],
  ]);

  const t = {
    shopByCategory: 'Shop by Category',
    filtersLabel: 'Filters ⇄ ',
    all: 'All',
    vegetables: 'Vegetables',
    leafySeasonings: 'Leafy and Seasonings',
    exoticVegetables: 'Exotic Vegetables',
    everything: 'Everything',
    noItemsInFilter: 'No items in this filter',
    tryClearingFilters: 'Try clearing filters or checking other categories!',
    filtersTitle: 'Filters',
    clearAll: 'Clear all',
    applyFilters: 'Apply Filters',
    sortByTitle: 'Sort By',
    totalLabel: 'Total: ₹',
    viewCart: 'View Cart ›'
  };


  const initialCategory = route.params?.category || (categories.length > 0 ? categories[0].name : 'Fruits');
  
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedSubTag, setSelectedSubTag] = useState('All');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [sortBy, setSortBy] = useState('relevant'); 
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('Brand');
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedPackSizes, setSelectedPackSizes] = useState([]);

  // Derive unique brands/sizes for current category
  const categoryBrands = [...new Set(products.filter(p => p.cat === selectedCategory).map(p => p.brand))];
  const categorySizes = [...new Set(products.filter(p => p.cat === selectedCategory).map(p => p.packSize))];

  useEffect(() => {
    // When category changes, fetch the first page of products from the server
    fetchProducts({ category: selectedCategory }, false, 1);
    setSelectedSubTag('All');
    setSelectedBrands([]);
    setSelectedPackSizes([]);
  }, [selectedCategory]);

  useEffect(() => {
    filterAndSort();
  }, [selectedCategory, selectedSubTag, sortBy, products, selectedBrands, selectedPackSizes]);

  const handleLoadMore = () => {
    if (hasMoreProducts && !isLoadingMoreProducts) {
      fetchProducts({ category: selectedCategory }, true, productPage + 1);
    }
  };

  const filterAndSort = () => {
    let result = products.filter(p => p.cat === selectedCategory);
    
    if (selectedSubTag !== 'All') {
      result = result.filter(p => p.subTag === selectedSubTag);
    }

    if (selectedBrands.length > 0) {
      result = result.filter(p => selectedBrands.includes(p.brand));
    }

    if (selectedPackSizes.length > 0) {
      result = result.filter(p => selectedPackSizes.includes(p.packSize));
    }

    if (sortBy === 'low-high') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'high-low') {
      result.sort((a, b) => b.price - a.price);
    }
    
    setFilteredProducts(result);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.shopByCategory}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Search')}>
          <Text style={{ fontSize: 22 }}>🔍</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mainContent}>
        {/* Left Sidebar - Categories */}
        <View style={styles.sidebar}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {(categories.length > 0 ? categories : [
              { name: 'Fruits' },
              { name: 'Vegetables' },
              { name: 'Grocery' },
              { name: 'Dairy' },
              { name: 'Meat / Seafood' },
            ]).map((cat) => (
              <TouchableOpacity 
                key={cat.id || cat.name} 
                style={[
                  styles.catItem, 
                  selectedCategory === cat.name && styles.activeCatItem
                ]}
                onPress={() => setSelectedCategory(cat.name)}
              >
                <View style={[
                  styles.catIconBox,
                  selectedCategory === cat.name && styles.activeCatIconBox
                ]}>
                  <Text style={{ fontSize: 24 }}>{categoryIcons.get(cat.name) || '📦'}</Text>
                </View>
                <Text style={[
                  styles.catText,
                  selectedCategory === cat.name && styles.activeCatText
                ]}>
                  {cat.name}
                </Text>
                {selectedCategory === cat.name && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Right Content - Products */}
        <View style={styles.productSection}>
          {/* Filter Bar */}
          <View style={styles.filterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity 
                style={[styles.filterPill, (selectedBrands.length > 0 || selectedPackSizes.length > 0) && styles.activeFilter]}
                onPress={() => setIsFilterModalVisible(true)}
              >
                <Text style={[styles.filterText, (selectedBrands.length > 0 || selectedPackSizes.length > 0) && styles.activeFilterText]}>
                  {t.filtersLabel}{(selectedBrands.length + selectedPackSizes.length) > 0 ? `(${selectedBrands.length + selectedPackSizes.length})` : ''}
                </Text>
              </TouchableOpacity>
              
              {selectedCategory === 'Fruits & Vegetables' || selectedCategory === 'Vegetables' ? (
                <>
                  <TouchableOpacity 
                    style={[styles.filterPill, selectedSubTag === 'All' && styles.activeFilter]}
                    onPress={() => setSelectedSubTag('All')}
                  >
                    <Text style={[styles.filterText, selectedSubTag === 'All' && styles.activeFilterText]}>{t.all}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.filterPill, selectedSubTag === 'Vegetables' && styles.activeFilter]}
                    onPress={() => setSelectedSubTag('Vegetables')}
                  >
                    <Text style={[styles.filterText, selectedSubTag === 'Vegetables' && styles.activeFilterText]}>{t.vegetables}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.filterPill, selectedSubTag === 'Leafy and Seasonings' && styles.activeFilter]}
                    onPress={() => setSelectedSubTag('Leafy and Seasonings')}
                  >
                    <Text style={[styles.filterText, selectedSubTag === 'Leafy and Seasonings' && styles.activeFilterText]}>{t.leafySeasonings}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.filterPill, selectedSubTag === 'Exotic Vegetables' && styles.activeFilter]}
                    onPress={() => setSelectedSubTag('Exotic Vegetables')}
                  >
                    <Text style={[styles.filterText, selectedSubTag === 'Exotic Vegetables' && styles.activeFilterText]}>{t.exoticVegetables}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  style={[styles.filterPill, selectedSubTag === 'All' && styles.activeFilter]}
                  onPress={() => setSelectedSubTag('All')}
                >
                  <Text style={[styles.filterText, selectedSubTag === 'All' && styles.activeFilterText]}>{t.everything}</Text>
                </TouchableOpacity>
              )}

              <View style={{ width: 1, backgroundColor: '#eee', marginHorizontal: 10 }} />

              <TouchableOpacity 
                style={[styles.filterPill, sortBy !== 'relevant' && styles.activeFilter]}
                onPress={() => setIsSortModalVisible(true)}
              >
                <Text style={[styles.filterText, sortBy !== 'relevant' && styles.activeFilterText]}>
                  {sortBy === 'low-high' ? 'Price: Low to High ⌵' : sortBy === 'high-low' ? 'Price: High to Low ⌵' : 'Sort By ⌵'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <FlatList
            // SAME AS BEFORE
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={{ paddingBottom: 130 }}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={{ fontSize: 50 }}>🛒</Text>
                <Text style={styles.emptyTitle}>{t.noItemsInFilter}</Text>
                <Text style={styles.emptySub}>{t.tryClearingFilters}</Text>
              </View>
            )}
            renderItem={({ item }) => (
              <ProductCard item={item} navigation={navigation} />
            )}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={() => isLoadingMoreProducts ? <View style={{ padding: 20 }}><ActivityIndicator size="large" color="#00b894" /></View> : null}
          />
        </View>
      </View>

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isFilterModalVisible}
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.filtersTitle}</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <Text style={{ fontSize: 24, color: '#666' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1, flexDirection: 'row' }}>
              <View style={styles.modalSidebar}>
                {['Brand', 'Pack Size'].map(tab => (
                  <TouchableOpacity 
                    key={tab}
                    style={[styles.tabItem, activeFilterTab === tab && styles.activeTabItem]}
                    onPress={() => setActiveFilterTab(tab)}
                  >
                    <Text style={[styles.tabText, activeFilterTab === tab && styles.activeTabText]}>{tab}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.modalMain}>
                <ScrollView>
                  {activeFilterTab === 'Brand' && categoryBrands.map(brand => (
                    <TouchableOpacity 
                      key={brand}
                      style={styles.checkboxRow}
                      onPress={() => {
                        if (selectedBrands.includes(brand)) {
                          setSelectedBrands(selectedBrands.filter(b => b !== brand));
                        } else {
                          setSelectedBrands([...selectedBrands, brand]);
                        }
                      }}
                    >
                      <View style={[styles.checkbox, selectedBrands.includes(brand) && styles.checkboxActive]} />
                      <Text style={styles.checkboxText}>{brand}</Text>
                    </TouchableOpacity>
                  ))}
                  {activeFilterTab === 'Pack Size' && categorySizes.map(size => (
                    <TouchableOpacity 
                      key={size}
                      style={styles.checkboxRow}
                      onPress={() => {
                        if (selectedPackSizes.includes(size)) {
                          setSelectedPackSizes(selectedPackSizes.filter(s => s !== size));
                        } else {
                          setSelectedPackSizes([...selectedPackSizes, size]);
                        }
                      }}
                    >
                      <View style={[styles.checkbox, selectedPackSizes.includes(size) && styles.checkboxActive]} />
                      <Text style={styles.checkboxText}>{size}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={() => { setSelectedBrands([]); setSelectedPackSizes([]); }}>
                <Text style={styles.clearAllText}>{t.clearAll}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.applyBtn}
                onPress={() => setIsFilterModalVisible(false)}
              >
                <Text style={styles.applyBtnText}>{t.applyFilters}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Sort Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isSortModalVisible}
        onRequestClose={() => setIsSortModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '35%', borderTopLeftRadius: 30, borderTopRightRadius: 30 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.sortByTitle}</Text>
              <TouchableOpacity onPress={() => setIsSortModalVisible(false)}>
                <Text style={{ fontSize: 24, color: '#666' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sortOptionsContainer}>
              {[
                { label: 'Relevance', value: 'relevant' },
                { label: 'Price: Low to High', value: 'low-high' },
                { label: 'Price: High to Low', value: 'high-low' }
              ].map(opt => (
                <TouchableOpacity 
                  key={opt.value} 
                  style={styles.sortOptionRow} 
                  onPress={() => {
                    setSortBy(opt.value);
                    setIsSortModalVisible(false);
                  }}
                >
                  <Text style={[styles.sortOptionText, sortBy === opt.value && styles.activeSortOptionText]}>
                    {opt.label}
                  </Text>
                  {sortBy === opt.value && (
                    <View style={styles.activeSortDot} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Cart Indicator Bar */}
      {cart.length > 0 && (
        <TouchableOpacity 
          style={styles.cartBar}
          onPress={() => navigation.navigate('Checkout')}
        >
          <View>
            <Text style={styles.cartBarItems}>
              {cart.reduce((total, item) => total + item.quantity, 0)} Items
            </Text>
            <Text style={styles.cartBarTotal}>
              {t.totalLabel}{cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0)}
            </Text>
          </View>
          <Text style={styles.cartBarAction}>{t.viewCart}</Text>
        </TouchableOpacity>
      )}
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
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6'
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#2d3436' },
  backBtn: { padding: 5 },
  mainContent: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 95, backgroundColor: '#f8f9fa', borderRightWidth: 1, borderRightColor: '#f1f2f6' },
  catItem: { 
    paddingVertical: 18, 
    alignItems: 'center', 
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6'
  },
  activeCatItem: { backgroundColor: '#fff' },
  catIconBox: { 
    width: 52, 
    height: 52, 
    borderRadius: 18, 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee'
  },
  activeCatIconBox: { borderColor: '#00b894', backgroundColor: '#e8fdfa' },
  catText: { fontSize: 11, fontWeight: '700', color: '#636e72', textAlign: 'center' },
  activeCatText: { color: '#00b894', fontWeight: '800' },
  activeIndicator: { 
    position: 'absolute', 
    left: 0, 
    top: '25%', 
    bottom: '25%', 
    width: 4, 
    backgroundColor: '#00b894',
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6
  },
  productSection: { flex: 1, backgroundColor: '#fff' },
  filterBar: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  filterPill: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 25, 
    borderWidth: 1, 
    borderColor: '#e1e2e6', 
    marginRight: 10,
    backgroundColor: '#fff'
  },
  activeFilter: { backgroundColor: '#00b894', borderColor: '#00b894' },
  filterText: { fontSize: 12, color: '#636e72', fontWeight: '700' },
  activeFilterText: { color: '#fff' },
  row: { justifyContent: 'space-between', paddingHorizontal: 10, marginTop: 12 },
  pCard: { 
    width: '48%', 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 12, 
    marginBottom: 15, 
    borderWidth: 1, 
    borderColor: '#f1f2f6',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5
  },
  pName: { fontSize: 13, fontWeight: '700', textAlign: 'center', color: '#2d3436', height: 40, marginTop: 8 },
  pPrice: { fontSize: 15, fontWeight: '800', color: '#00b894', marginTop: 4 },
  addBtn: { 
    marginTop: 12, 
    backgroundColor: '#fff', 
    borderWidth: 1.5, 
    borderColor: '#00b894', 
    paddingHorizontal: 22, 
    paddingVertical: 8, 
    borderRadius: 10 
  },
  addBtnText: { color: '#00b894', fontWeight: '900', fontSize: 13 },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#00b894', borderRadius: 10, paddingVertical: 5, paddingHorizontal: 8 },
  qtyBtn: { paddingHorizontal: 5 },
  qtyBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  qtyText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#2d3436', marginTop: 20 },
  emptySub: { fontSize: 14, color: '#636e72', marginTop: 10, textAlign: 'center' },
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
  cartBarItems: { color: 'white', fontWeight: '800', fontSize: 16 },
  cartBarTotal: { color: '#b2bec3', fontSize: 13 },
  cartBarAction: { color: '#00b894', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', height: '70%', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#2d3436' },
  modalSidebar: { width: '35%', backgroundColor: '#f8f9fa', borderRightWidth: 1, borderRightColor: '#f1f2f6' },
  modalMain: { flex: 1, padding: 20 },
  tabItem: { paddingVertical: 20, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f1f2f6', borderLeftWidth: 4, borderLeftColor: 'transparent' },
  activeTabItem: { backgroundColor: '#fff', borderLeftColor: '#00b894' },
  tabText: { fontSize: 14, fontWeight: '700', color: '#636e72' },
  activeTabText: { color: '#00b894', fontWeight: '900' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#d1d2d6', marginRight: 15 },
  checkboxActive: { backgroundColor: '#00b894', borderColor: '#00b894' },
  checkboxText: { fontSize: 15, fontWeight: '600', color: '#2d3436' },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25, borderTopWidth: 1, borderTopColor: '#f1f2f6', backgroundColor: '#fff' },
  clearAllText: { fontSize: 16, fontWeight: '700', color: '#b2bec3' },
  applyBtn: { backgroundColor: '#00b894', paddingHorizontal: 40, paddingVertical: 18, borderRadius: 18, elevation: 5 },
  applyBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  
  // Sort Modal Styles
  sortOptionsContainer: { paddingHorizontal: 25, paddingTop: 10 },
  sortOptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  sortOptionText: { fontSize: 16, fontWeight: '600', color: '#2d3436' },
  activeSortOptionText: { color: '#00b894', fontWeight: '800' },
  activeSortDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00b894' }
});
