import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Image, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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

export default function AddProduct({ navigation }) {
  const { categories, addProduct, addCategory, deleteCategory, uploadImage } = useContext(AdminContext);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [requiresVariants, setRequiresVariants] = useState(false);
  const [variants, setVariants] = useState([{ label: '', price: '' }]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
    }
  };

  const addVariantField = () => {
    setVariants([...variants, { label: '', price: '' }]);
  };

  const updateVariant = (index, field, value) => {
    const newVariants = [...variants];
    newVariants[index][field] = value;
    setVariants(newVariants);
  };

  const removeVariant = (index) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    } else {
      setVariants([{ label: '', price: '' }]);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const res = await addCategory(newCategoryName.trim());
    if (res.success) {
      setNewCategoryName('');
      setIsCategoryModalVisible(false);
    } else {
      Alert.alert('Error', res.error || 'Failed to add category');
    }
  };

  const handleDeleteCategory = (id, name) => {
    Alert.alert('Delete Category', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteCategory(id) }
    ]);
  };

  const handleSave = async () => {
    if (!name || !categoryId) {
      Alert.alert('Error', 'Please fill in required fields.');
      return;
    }

    if (requiresVariants && variants.some(v => !v.label || !v.price)) {
      Alert.alert('Error', 'Please fill in all variant details.');
      return;
    }

    setIsSubmitting(true);
    let uploadedImageUrl = image || 'https://via.placeholder.com/150';

    if (image && imageBase64) {
      const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const filename = `${sanitizedName || 'product'}_${Date.now()}.jpg`;
      const uploadRes = await uploadImage(imageBase64, filename);
      if (uploadRes.success) {
        uploadedImageUrl = uploadRes.url;
      } else {
        Alert.alert('Upload Error', uploadRes.error || 'Failed to upload image.');
        setIsSubmitting(false);
        return;
      }
    }

    const productData = {
      name,
      description,
      categoryId: categoryId,
      brand,
      img: uploadedImageUrl,
      variants: requiresVariants 
        ? variants.map(v => ({ label: v.label, price: parseFloat(v.price) }))
        : [{ label: 'Standard', price: parseFloat(variants[0].price || 0) }],
      isActive: true
    };

    const res = await addProduct(productData);
    setIsSubmitting(false);
    if (res.success) {
      Alert.alert('Success', 'Product added successfully!');
      navigation.goBack();
    } else {
      Alert.alert('Error', res.error || 'Failed to add product');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Product</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.pickedImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera" size={40} color={COLORS.textMuted} />
              <Text style={styles.imagePlaceholderText}>Upload Product Image</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Product Name *</Text>
        <TextInput 
          style={styles.input} 
          value={name} 
          onChangeText={setName} 
          placeholder="e.g. Fresh Mangoes" 
          placeholderTextColor={COLORS.textMuted}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.label}>Category *</Text>
          <TouchableOpacity onPress={() => setIsCategoryModalVisible(true)}>
            <Text style={styles.addVariantText}>Manage Categories</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryGrid}>
          {categories?.map(cat => (
            <TouchableOpacity 
              key={cat.id} 
              style={[styles.catPill, categoryId === cat.id && styles.catPillActive]}
              onPress={() => setCategoryId(cat.id)}
            >
              <Text style={[styles.catText, categoryId === cat.id && styles.catTextActive]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Brand (Optional)</Text>
        <TextInput 
          style={styles.input} 
          value={brand} 
          onChangeText={setBrand} 
          placeholder="e.g. Tata, Amul" 
          placeholderTextColor={COLORS.textMuted}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput 
          style={[styles.input, { height: 80 }]} 
          multiline 
          value={description} 
          onChangeText={setDescription} 
          placeholder="Product description..." 
          placeholderTextColor={COLORS.textMuted}
        />

        <View style={styles.divider} />

        <View style={styles.rowBetween}>
          <Text style={[styles.label, { marginTop: 0 }]}>Does this product have variants?</Text>
          <View style={styles.toggleGroup}>
            <TouchableOpacity 
              style={[styles.toggleBtn, !requiresVariants && styles.toggleActive]} 
              onPress={() => setRequiresVariants(false)}
            >
              <Text style={[styles.toggleText, !requiresVariants && styles.toggleTextActive]}>No</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleBtn, requiresVariants && styles.toggleActive]} 
              onPress={() => setRequiresVariants(true)}
            >
              <Text style={[styles.toggleText, requiresVariants && styles.toggleTextActive]}>Yes</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!requiresVariants ? (
          <View>
            <Text style={styles.label}>Standard Price *</Text>
            <TextInput 
              style={styles.input} 
              value={variants[0].price.toString()} 
              onChangeText={(val) => updateVariant(0, 'price', val)} 
              placeholder="Price (₹)" 
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric" 
            />
          </View>
        ) : (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>Variants (Packing & Price) *</Text>
              <TouchableOpacity onPress={addVariantField}>
                <Text style={styles.addVariantText}>+ Add Variant</Text>
              </TouchableOpacity>
            </View>

            {variants.map((variant, index) => (
              <View key={index} style={styles.variantCard}>
                <View style={styles.variantRow}>
                  <TextInput 
                    style={[styles.input, { flex: 2, marginRight: 10 }]} 
                    value={variant.label} 
                    onChangeText={(val) => updateVariant(index, 'label', val)} 
                    placeholder="Size (e.g. 1kg)" 
                    placeholderTextColor={COLORS.textMuted}
                  />
                  <TextInput 
                    style={[styles.input, { flex: 1, marginRight: 10 }]} 
                    value={variant.price.toString()} 
                    onChangeText={(val) => updateVariant(index, 'price', val)} 
                    placeholder="Price" 
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric" 
                  />
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => removeVariant(index)}>
                    <Ionicons name="trash-outline" size={22} color="#ff4757" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Product</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Category Modal */}
      <Modal visible={isCategoryModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Categories</Text>
              <TouchableOpacity onPress={() => setIsCategoryModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.addCatRow}>
              <TextInput 
                style={[styles.input, { flex: 1, marginRight: 10 }]} 
                placeholder="New Category Name" 
                placeholderTextColor={COLORS.textMuted}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
              />
              <TouchableOpacity style={styles.addCatBtn} onPress={handleAddCategory}>
                <Text style={styles.addCatBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { marginTop: 20 }]}>Existing Categories</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {categories?.map(cat => (
                <View key={cat.id} style={styles.catListItem}>
                  <Text style={styles.catListName}>{cat.name}</Text>
                  <TouchableOpacity onPress={() => handleDeleteCategory(cat.id, cat.name)}>
                    <Ionicons name="trash-outline" size={20} color="#ff4757" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  imagePicker: { width: '100%', height: 200, backgroundColor: COLORS.card, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.border },
  pickedImage: { width: '100%', height: '100%', borderRadius: 12 },
  imagePlaceholder: { alignItems: 'center' },
  imagePlaceholderText: { color: COLORS.textMuted, marginTop: 10 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#ffffff', marginTop: 15, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, backgroundColor: COLORS.inputBg, color: '#ffffff' },
  categoryGrid: { flexDirection: 'row', marginTop: 5 },
  catPill: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, marginRight: 10, borderWidth: 1, borderColor: COLORS.border },
  catPillActive: { backgroundColor: '#00b894', borderColor: '#00b894' },
  catText: { color: COLORS.textMuted, fontSize: 13 },
  catTextActive: { color: '#fff', fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 20 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  toggleGroup: { flexDirection: 'row', backgroundColor: COLORS.inputBg, borderRadius: 12, padding: 4 },
  toggleBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10 },
  toggleActive: { backgroundColor: COLORS.card, elevation: 2 },
  toggleText: { color: COLORS.textMuted, fontWeight: 'bold' },
  toggleTextActive: { color: '#00b894' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  addVariantText: { color: '#00b894', fontWeight: 'bold' },
  variantCard: { backgroundColor: 'transparent', marginBottom: 10 },
  variantRow: { flexDirection: 'row', alignItems: 'center' },
  deleteBtn: { padding: 5 },
  saveBtn: { backgroundColor: '#00b894', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 30, marginBottom: 50 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.card, borderRadius: 20, padding: 25, borderWidth: 1, borderColor: COLORS.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  addCatRow: { flexDirection: 'row', alignItems: 'center' },
  addCatBtn: { backgroundColor: '#00b894', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12 },
  addCatBtnText: { color: '#fff', fontWeight: 'bold' },
  catListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  catListName: { fontSize: 15, color: '#ffffff' }
});
