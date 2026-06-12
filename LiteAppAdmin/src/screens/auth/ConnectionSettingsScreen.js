import React, { useState, useContext } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, ScrollView, Dimensions, KeyboardAvoidingView, Platform
} from 'react-native';
import { AdminContext } from '../../context/AdminContext';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

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

export default function ConnectionSettingsScreen() {
  const { apiUrl, saveCustomApiUrl, testConnection } = useContext(AdminContext);
  const [inputUrl, setInputUrl] = useState(apiUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // 'success' | 'failed' | null

  // Generate suggested options based on environments
  const suggestions = [
    { label: 'Auto-Detected IP', url: apiUrl },
    { label: 'Local Development Port', url: 'http://10.0.2.2:5000' },
    { label: 'Standard Localhost', url: 'http://localhost:5000' }
  ].filter((item, index, self) => 
    self.findIndex(t => t.url === item.url) === index // unique URLs only
  );

  const handleTest = async () => {
    if (!inputUrl.trim()) {
      Alert.alert('Invalid URL', 'Please enter a valid server URL.');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      let urlToTest = inputUrl.trim().replace(/\/+$/, '');
      if (!urlToTest.startsWith('http://') && !urlToTest.startsWith('https://')) {
        urlToTest = `http://${urlToTest}`;
      }
      const success = await testConnection(urlToTest);
      if (success) {
        setTestResult('success');
      } else {
        setTestResult('failed');
      }
    } catch (e) {
      setTestResult('failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    let urlToSave = inputUrl.trim().replace(/\/+$/, '');
    if (!urlToSave.startsWith('http://') && !urlToSave.startsWith('https://')) {
      urlToSave = `http://${urlToSave}`;
    }

    setIsTesting(true);
    const result = await saveCustomApiUrl(urlToSave);
    setIsTesting(false);
    if (!result.success) {
      Alert.alert('Connection Failed', result.error || 'Please test the connection first.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="wifi-outline" size={48} color="#ff7675" />
          </View>
          <Text style={styles.title}>Admin Connection Settings</Text>
          <Text style={styles.subtitle}>
            Could not reach the backend server. Please verify the API URL below or configure a new address.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Server API URL</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="link-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="http://192.168.1.100:5000"
              placeholderTextColor={COLORS.textMuted}
              value={inputUrl}
              onChangeText={(text) => {
                setInputUrl(text);
                setTestResult(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Test Status Indicator */}
          {testResult === 'success' && (
            <View style={[styles.statusRow, styles.statusSuccess]}>
              <Ionicons name="checkmark-circle" size={18} color="#00b894" />
              <Text style={styles.statusTextSuccess}>Connected successfully!</Text>
            </View>
          )}
          {testResult === 'failed' && (
            <View style={[styles.statusRow, styles.statusFailed]}>
              <Ionicons name="alert-circle" size={18} color="#ff7675" />
              <Text style={styles.statusTextFailed}>Server unreachable. Verify URL/port.</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity 
              style={[styles.btn, styles.btnOutline]} 
              onPress={handleTest}
              disabled={isTesting}
            >
              {isTesting ? (
                <ActivityIndicator size="small" color="#00b894" />
              ) : (
                <Text style={styles.btnOutlineText}>Test Connection</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.btn, 
                styles.btnPrimary, 
                testResult !== 'success' && styles.btnDisabled
              ]} 
              onPress={handleSave}
              disabled={isTesting || testResult !== 'success'}
            >
              <Text style={styles.btnPrimaryText}>Save & Continue</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Suggestions Panel */}
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Connection Suggestions</Text>
          {suggestions.map((item, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={styles.suggestionItem}
              onPress={() => {
                setInputUrl(item.url);
                setTestResult(null);
              }}
            >
              <View style={styles.suggestionLeft}>
                <Ionicons name="phone-portrait-outline" size={18} color={COLORS.textMuted} />
                <View style={styles.suggestionTexts}>
                  <Text style={styles.suggestionLabel}>{item.label}</Text>
                  <Text style={styles.suggestionUrl}>{item.url}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward-outline" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    minHeight: Dimensions.get('window').height - 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 40,
  },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 8,
    shadowColor: '#ff7675',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  statusSuccess: {
    backgroundColor: 'rgba(0, 184, 148, 0.15)',
  },
  statusFailed: {
    backgroundColor: 'rgba(255, 118, 117, 0.15)',
  },
  statusTextSuccess: {
    color: '#00b894',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  statusTextFailed: {
    color: '#ff7675',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  btn: {
    flex: 0.48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: 'bold',
  },
  btnOutline: {
    borderWidth: 2,
    borderColor: '#00b894',
    backgroundColor: 'transparent',
  },
  btnOutlineText: {
    color: '#00b894',
    fontWeight: '700',
    fontSize: 14,
  },
  btnPrimary: {
    backgroundColor: '#00b894',
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  btnDisabled: {
    backgroundColor: COLORS.border,
    opacity: 0.5,
  },
  suggestionsContainer: {
    marginTop: 10,
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionTexts: {
    marginLeft: 12,
  },
  suggestionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  suggestionUrl: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
