import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  Keyboard,
  Animated,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppContext } from '../../context/AppContext';
import ProductCard from '../../components/ProductCard';

const SEARCH_HISTORY_KEY = '@search_history';

export default function SearchScreen({ navigation }) {
  const { products, setCart, cart, addToRecentlyViewed, theme } = useContext(AppContext);
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Voice Search States
  const [isVoiceModalVisible, setIsVoiceModalVisible] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('Tap mic to speak');
  const [isListening, setIsListening] = useState(false);
  const voiceTimeoutRef = useRef(null);
  const waveAnim = useRef(new Animated.Value(1)).current;

  const startVoiceSearch = () => {
    setIsVoiceModalVisible(true);
    setIsListening(true);
    setVoiceStatus('Listening...');
    
    // Start pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, { toValue: 1.5, duration: 800, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: 1, duration: 800, useNativeDriver: true })
      ])
    ).start();

    // Auto recognize after 2.5 seconds (simulating speech input)
    voiceTimeoutRef.current = setTimeout(() => {
      const phrases = ['Milk', 'Apples', 'Bread', 'Vegetables', 'Grocery'];
      const randomIndex = Math.floor(Math.random() * phrases.length);
      const randomPhrase = phrases[randomIndex] || 'Milk';
      setVoiceStatus(`Recognized: "${randomPhrase}"`);
      setIsListening(false);
      
      // Complete search after 1 second
      setTimeout(() => {
        setIsVoiceModalVisible(false);
        handleSearch(randomPhrase);
        saveToHistory(randomPhrase);
      }, 1000);
    }, 2500);
  };

  const cancelVoiceSearch = () => {
    if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    setIsVoiceModalVisible(false);
    setIsListening(false);
  };

  useEffect(() => {
    loadHistory();
    // Auto focus input
    setTimeout(() => inputRef.current?.focus(), 100);
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadHistory = async () => {
    try {
      const savedHistory = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const saveToHistory = async (searchTerm) => {
    if (!searchTerm.trim()) return;
    
    let newHistory = [searchTerm, ...history.filter(item => item !== searchTerm)];
    newHistory = newHistory.slice(0, 10); // Keep last 10
    
    setHistory(newHistory);
    try {
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to save history", e);
    }
  };

  const clearHistory = async () => {
    setHistory([]);
    await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
  };

  const removeFromHistory = async (itemToRemove) => {
    const newHistory = history.filter(item => item !== itemToRemove);
    setHistory(newHistory);
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
  };

  const handleSearch = (text) => {
    setQuery(text);
    if (text.trim().length > 0) {
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(text.toLowerCase()) ||
        p.cat.toLowerCase().includes(text.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const onSelectSuggestion = (item) => {
    saveToHistory(item.name);
    // You could navigate to a details page or just add to cart as a shortcut
    // For now, let's just alert or perform a dummy 'search' action
    Keyboard.dismiss();
    setQuery(item.name);
  };

  const addToCart = (item) => {
    setCart([...cart, item]);
    saveToHistory(item.name);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.inputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder='Search "Bananas", "Milk", "Veg"...'
            value={query}
            onChangeText={handleSearch}
            onSubmitEditing={() => saveToHistory(query)}
            returnKeyType="search"
            placeholderTextColor="#999"
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearBtn}>
              <Text style={{ color: '#999', fontSize: 18 }}>×</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={startVoiceSearch} style={styles.micBtn}>
              <Text style={{ fontSize: 16 }}>🎙️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {query.length === 0 ? (
          <View style={styles.historySection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{"Recent Searches"}</Text>
              {history.length > 0 && (
                <TouchableOpacity onPress={clearHistory}>
                  <Text style={styles.clearAllText}>{"Clear All"}</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {history.length === 0 ? (
              <Text style={styles.emptyHistory}>{"Your search history will appear here"}</Text>
            ) : (
              <FlatList
                data={history}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <View style={styles.historyRow}>
                    <TouchableOpacity 
                      style={styles.historyItem} 
                      onPress={() => handleSearch(item)}
                    >
                      <Text style={styles.historyIcon}>🕒</Text>
                      <Text style={styles.historyText}>{item}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeFromHistory(item)} style={styles.removeBtn}>
                      <Text style={{ color: '#ccc', fontSize: 18 }}>×</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
            
            <Text style={styles.sectionTitle}>{"Popular Categories"}</Text>
            <View style={styles.pillContainer}>
              {['Bananas', 'Milk', 'Organic', 'Fruit'].map(tag => (
                <TouchableOpacity 
                  key={tag} 
                  style={styles.pill}
                  onPress={() => handleSearch(tag)}
                >
                  <Text style={styles.pillText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 10, marginTop: 12 }}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={() => (
              <View style={styles.noResult}>
                <Text style={{ fontSize: 50 }}>🛒</Text>
                <Text style={styles.noResultText}>{"No products found for \""}{query}{"\""}</Text>
              </View>
            )}
            renderItem={({ item }) => (
              <ProductCard item={item} navigation={navigation} />
            )}
          />
        )}
      </Animated.View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isVoiceModalVisible}
        onRequestClose={cancelVoiceSearch}
      >
        <View style={styles.voiceModalOverlay}>
          <View style={styles.voiceModalContent}>
            <Text style={styles.voiceTitle}>{"Voice Search"}</Text>
            <Text style={styles.voiceSubtitle}>{voiceStatus}</Text>
            
            <View style={styles.micContainer}>
              {isListening && (
                <Animated.View style={[
                  styles.pulseCircle, 
                  { transform: [{ scale: waveAnim }] }
                ]} />
              )}
              <TouchableOpacity 
                style={[styles.voiceMicBtn, isListening && styles.voiceMicBtnActive]}
                onPress={isListening ? cancelVoiceSearch : startVoiceSearch}
              >
                <Text style={{ fontSize: 32 }}>🎙️</Text>
              </TouchableOpacity>
            </View>

            {isListening && (
              <View style={styles.waveContainer}>
                {[1, 2, 3, 4, 5].map((bar) => (
                  <View key={bar} style={[styles.waveBar, { height: Math.floor(Math.random() * 30) + 10 }]} />
                ))}
              </View>
            )}

            <View style={styles.suggestedPhrases}>
              <Text style={styles.suggestText}>{"Or select a query below:"}</Text>
              <View style={styles.phraseRow}>
                {['Milk', 'Bananas', 'Staples'].map((phrase) => (
                  <TouchableOpacity 
                    key={phrase} 
                    style={styles.phrasePill}
                    onPress={() => {
                      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
                      setIsVoiceModalVisible(false);
                      setIsListening(false);
                      handleSearch(phrase);
                      saveToHistory(phrase);
                    }}
                  >
                    <Text style={styles.phraseText}>"{phrase}"</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.closeVoiceBtn} onPress={cancelVoiceSearch}>
              <Text style={styles.closeVoiceText}>{"Cancel"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f2f6',
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#e1e2e6'
  },
  searchIcon: {
    marginRight: 10,
    fontSize: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2d3436',
    fontWeight: '600'
  },
  clearBtn: {
    padding: 5,
  },
  historySection: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#636e72',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 15,
  },
  clearAllText: {
    color: '#ff4757',
    fontWeight: '800',
    fontSize: 12,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyIcon: {
    fontSize: 16,
    marginRight: 15,
    opacity: 0.4,
  },
  historyText: {
    fontSize: 15,
    color: '#2d3436',
    fontWeight: '500'
  },
  removeBtn: {
    padding: 5,
  },
  emptyHistory: {
    color: '#b2bec3',
    textAlign: 'center',
    marginVertical: 30,
    fontSize: 14,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 15,
    marginBottom: 30,
  },
  pill: {
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f2f6',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5
  },
  pillText: {
    color: '#2d3436',
    fontWeight: '700',
    fontSize: 13
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  suggestionIconBox: {
    width: 55,
    height: 55,
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee'
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2d3436',
  },
  suggestionMeta: {
    fontSize: 12,
    color: '#636e72',
    marginTop: 4,
    fontWeight: '500'
  },
  addMiniBtn: {
    borderWidth: 1.5,
    borderColor: '#00b894',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff'
  },
  addMiniText: {
    color: '#00b894',
    fontWeight: '900',
    fontSize: 12,
  },
  noResult: {
    alignItems: 'center',
    marginTop: 100,
  },
  noResultText: {
    marginTop: 20,
    color: '#b2bec3',
    fontSize: 16,
    fontWeight: '600'
  },
  micBtn: {
    padding: 8,
  },
  voiceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceModalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  voiceTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2d3436',
    marginBottom: 10,
  },
  voiceSubtitle: {
    fontSize: 15,
    color: '#636e72',
    textAlign: 'center',
    marginBottom: 30,
    height: 25,
  },
  micContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    width: 140,
    height: 140,
    marginBottom: 20,
  },
  pulseCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 184, 148, 0.2)',
  },
  voiceMicBtn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f1f2f6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  voiceMicBtnActive: {
    backgroundColor: '#00b894',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    gap: 6,
    marginBottom: 30,
  },
  waveBar: {
    width: 4,
    backgroundColor: '#00b894',
    borderRadius: 2,
  },
  suggestedPhrases: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 25,
    borderTopWidth: 1,
    borderTopColor: '#f1f2f6',
    paddingTop: 20,
  },
  suggestText: {
    fontSize: 12,
    color: '#b2bec3',
    fontWeight: '700',
    marginBottom: 12,
  },
  phraseRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  phrasePill: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  phraseText: {
    color: '#00b894',
    fontSize: 13,
    fontWeight: '700',
  },
  closeVoiceBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  closeVoiceText: {
    color: '#ff4757',
    fontSize: 15,
    fontWeight: '700',
  },
});
