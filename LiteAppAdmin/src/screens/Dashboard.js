import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AdminContext } from '../context/AdminContext';

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

export default function Dashboard({ navigation }) {
  const { products, isLoading, fetchProducts, updateVariant } = useContext(AdminContext);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingVariants, setEditingVariants] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const openQuickEdit = (product) => {
    setSelectedProduct(product);
    const vars = product.variants ? product.variants.map(v => ({
      id: v.id,
      label: v.label || v.packSize || 'Standard',
      price: v.price.toString(),
      stock: (v.stock !== undefined ? v.stock : 0).toString()
    })) : [];

    if (vars.length === 0) {
      vars.push({
        id: null,
        label: product.packSize || 'Standard',
        price: product.price ? product.price.toString() : '0',
        stock: product.stock ? product.stock.toString() : '0'
      });
    }

    setEditingVariants(vars);
    setIsModalVisible(true);
  };

  const handleUpdateVariantField = (index, field, value) => {
    const updated = [...editingVariants];
    if (field === 'price') {
      updated[index].price = value;
    } else if (field === 'stock') {
      updated[index].stock = value;
    }
    setEditingVariants(updated);
  };

  const handleSaveVariants = async () => {
    setIsSaving(true);
    let successCount = 0;
    let failCount = 0;

    for (const v of editingVariants) {
      if (v.id) {
        const res = await updateVariant(v.id, parseFloat(v.price), parseInt(v.stock));
        if (res.success) {
          successCount++;
        } else {
          failCount++;
        }
      } else {
        Alert.alert('Warning', 'Direct product updates not supported. Product has no variants.');
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(false);
    setIsModalVisible(false);

    if (failCount === 0) {
      Alert.alert('Success', 'Stock & Price updated successfully!');
      fetchProducts();
    } else {
      Alert.alert('Partial Success', `Updated ${successCount} variants. Failed ${failCount} variants.`);
    }
  };

  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      <Image source={{ uri: item.img }} style={styles.productImg} />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productCategory}>{item.category?.name || item.cat}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.productPrice}>₹{item.variants?.[0]?.price || item.price}</Text>
          {item.isTrending && <View style={styles.trendingBadge}><Text style={styles.trendingText}>Trending</Text></View>}
        </View>
        {item.variants && item.variants.length > 0 && (
          <Text style={styles.variantSummary}>
            {item.variants.map(v => `${v.label || v.packSize}: ₹${v.price} (${v.stock} left)`).join(' | ')}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => openQuickEdit(item)}
      >
        <Ionicons name="options-outline" size={22} color="#00b894" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={26} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Products</Text>
        <TouchableOpacity onPress={fetchProducts}>
          <Ionicons name="refresh" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#00b894" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No products found.</Text>}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddProduct')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Quick Edit Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>Quick Edit: {selectedProduct?.name}</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {editingVariants.map((v, index) => (
                <View key={index} style={styles.variantEditCard}>
                  <Text style={styles.variantLabel}>Variant: {v.label}</Text>
                  <View style={styles.inputsRow}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={styles.inputLabel}>Price (₹)</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={v.price}
                        onChangeText={(val) => handleUpdateVariantField(index, 'price', val)}
                        keyboardType="numeric"
                        placeholder="Price"
                        placeholderTextColor={COLORS.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Stock Qty</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={v.stock}
                        onChangeText={(val) => handleUpdateVariantField(index, 'stock', val)}
                        keyboardType="numeric"
                        placeholder="Stock"
                        placeholderTextColor={COLORS.textMuted}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: '#00b894' }]}
              onPress={handleSaveVariants}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  productCard: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 12, padding: 10, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  productImg: { width: 60, height: 60, borderRadius: 8, marginRight: 15 },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  productCategory: { fontSize: 12, color: COLORS.textMuted, marginBottom: 5 },
  priceRow: { flexDirection: 'row', alignItems: 'center' },
  productPrice: { fontSize: 15, fontWeight: 'bold', color: '#00b894', marginRight: 10 },
  trendingBadge: { backgroundColor: 'rgba(0, 184, 148, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  trendingText: { fontSize: 10, color: '#00b894', fontWeight: 'bold' },
  editBtn: { padding: 10 },
  fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: '#00b894', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  emptyText: { textAlign: 'center', marginTop: 50, color: COLORS.textMuted },

  // Quick Edit Additions
  variantSummary: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', flex: 1, marginRight: 10 },
  variantEditCard: { backgroundColor: COLORS.inputBg, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  variantLabel: { fontSize: 14, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  inputsRow: { flexDirection: 'row' },
  inputLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 4 },
  modalInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, backgroundColor: COLORS.background, fontSize: 14, color: '#ffffff' },
  saveBtn: { padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 15 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 }
});
