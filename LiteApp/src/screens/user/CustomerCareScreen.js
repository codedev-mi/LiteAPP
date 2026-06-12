import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CustomerCareScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Us</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 25 }}>
        <Text style={styles.title}>Happy to help!</Text>
        <Text style={styles.sub}>Reach out for any help or suggestion with your order.</Text>
        
        <View style={styles.inputCard}>
          <TextInput 
            placeholder="Type your message here..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={10}
            style={styles.inputArea}
          />
        </View>

        <TouchableOpacity 
          style={styles.submitBtn} 
          onPress={() => {
            alert('Your message was sent to our support team. We will get back to you shortly.');
            navigation.goBack();
          }}
        >
          <Text style={styles.submitBtnText}>WhatsApp Chat Support</Text>
        </TouchableOpacity>

        <View style={styles.contactDetails}>
          <Text style={styles.label}>Email Address</Text>
          <Text style={styles.value}>support@bhusawalbasket.com</Text>
          <Text style={[styles.label, { marginTop: 15 }]}>Contact Numbers</Text>
          <Text style={styles.value}>+91 98XXX XXX54</Text>
          <Text style={styles.value}>+91 97XXX XXX22</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', paddingTop: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee' },
  backBtn: { fontSize: 16, color: '#4CAF50', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  sub: { color: '#666', lineHeight: 22, fontSize: 16, marginBottom: 30 },
  inputCard: { backgroundColor: 'white', borderRadius: 15, padding: 15, elevation: 1, marginBottom: 20 },
  inputArea: { fontSize: 16, color: '#333', textAlignVertical: 'top' },
  submitBtn: { backgroundColor: '#48c45c', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 40 },
  submitBtnText: { color: 'white', fontWeight: 'bold' },
  contactDetails: { padding: 5 },
  label: { color: '#888', marginBottom: 5 },
  value: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 }
});
