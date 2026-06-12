import React, { useState, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  RefreshControl, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AdminContext } from '../context/AdminContext';
import { GlassyCard } from '../components/DashboardComponents';

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

const SCREEN_TITLE = 'Categories';
const SECTION_TITLE_ADD_NEW = 'Add New Category';
const SEARCH_PLACEHOLDER = 'Search categories...';
const EMPTY_TEXT_MATCH = 'No matching categories found.';
const EMPTY_TEXT_AVAIL = 'No categories available.';

export default function CategoriesManagement({ navigation }) {
  const { 
    categories, 
    addCategory, 
    deleteCategory, 
    fetchCategories,
    isLoading 
  } = useContext(AdminContext);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter categories locally based on search query
  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Validation Error', 'Category name cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    const res = await addCategory(newCategoryName.trim());
    setIsSubmitting(false);

    if (res.success) {
      setNewCategoryName('');
      Alert.alert('Success', 'Category added successfully!');
    } else {
      Alert.alert('Error', res.error || 'Failed to add category. It may already exist.');
    }
  };

  const handleDeleteCategory = (id, name) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${name}"? This might affect products under this category.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            const res = await deleteCategory(id);
            if (res.success) {
              Alert.alert('Success', 'Category deleted successfully!');
            } else {
              Alert.alert('Error', res.error || 'Failed to delete category.');
            }
          } 
        }
      ]
    );
  };

  const renderCategoryItem = ({ item }) => (
    <GlassyCard style={styles.categoryCard}>
      <View style={styles.categoryRow}>
        <View style={styles.categoryInfo}>
          <View style={styles.iconContainer}>
            <Ionicons name="folder-open" size={20} color="#00b894" />
          </View>
          <Text style={styles.categoryName}>{item.name}</Text>
        </View>
        <TouchableOpacity 
          style={styles.deleteBtn}
          onPress={() => handleDeleteCategory(item.id, item.name)}
        >
          <Ionicons name="trash-outline" size={20} color="#ff4757" />
        </TouchableOpacity>
      </View>
    </GlassyCard>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={26} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>{SCREEN_TITLE}</Text>
        <TouchableOpacity onPress={fetchCategories}>
          <Ionicons name="refresh" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Add Category Section */}
        <View style={styles.addSection}>
          <Text style={styles.sectionTitle}>{SECTION_TITLE_ADD_NEW}</Text>
          <View style={styles.addInputRow}>
            <TextInput
              style={styles.input}
              placeholder="e.g. Fruits, Vegetables, Dairy"
              placeholderTextColor={COLORS.textMuted}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />
            <TouchableOpacity 
              style={[styles.addBtn, isSubmitting && styles.addBtnDisabled]}
              onPress={handleAddCategory}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="add" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={SEARCH_PLACEHOLDER}
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Categories List */}
        <FlatList
          data={filteredCategories}
          renderItem={renderCategoryItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={fetchCategories} tintColor="#fff" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>
                {searchQuery ? EMPTY_TEXT_MATCH : EMPTY_TEXT_AVAIL}
              </Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  menuBtn: { padding: 4 },
  title: { fontSize: 22, fontWeight: '900', color: '#ffffff' },
  addSection: { 
    padding: 20, 
    backgroundColor: COLORS.card, 
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  sectionTitle: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: '#ffffff', 
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  addInputRow: { flexDirection: 'row', alignItems: 'center' },
  input: { 
    flex: 1,
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: 12, 
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: COLORS.inputBg, 
    color: '#ffffff',
    fontSize: 15,
    marginRight: 10
  },
  addBtn: { 
    backgroundColor: '#00b894', 
    width: 48, 
    height: 48, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#00b894',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addBtnDisabled: { backgroundColor: '#00b89480' },
  searchSection: { paddingHorizontal: 20, paddingTop: 15 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#ffffff', fontSize: 15, height: '100%' },
  listContent: { padding: 20 },
  categoryCard: { marginBottom: 10 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryInfo: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    backgroundColor: 'rgba(0, 184, 148, 0.15)', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 12
  },
  categoryName: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  deleteBtn: { padding: 8 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { marginTop: 10, color: COLORS.textMuted, fontSize: 15, textAlign: 'center' }
});
