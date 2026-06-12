import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FAQS = [
  { id: '1', question: 'How can I change my delivery address?', answer: 'Go to Saved Addresses and either edit an existing one or add a new one.' },
  { id: '2', question: 'What is the delivery time?', answer: 'We aim to deliver in 10 minutes in most parts of Bhusawal.' },
  { id: '3', question: 'How can I track my order?', answer: 'Orders can be tracked from the My Orders section after they are placed.' },
];

export default function FAQScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Frequently Asked Questions</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={FAQS}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <View style={styles.faqCard}>
            <Text style={styles.question}>Q: {item.question}</Text>
            <Text style={styles.answer}>{item.answer}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', paddingTop: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee' },
  backBtn: { fontSize: 16, color: '#4CAF50', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  faqCard: { backgroundColor: 'white', padding: 25, borderRadius: 15, marginBottom: 15, elevation: 2 },
  question: { fontWeight: 'bold', fontSize: 16, marginBottom: 10, lineHeight: 22 },
  answer: { color: '#666', lineHeight: 20 }
});
