import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

export default function PosterStudio({ navigation }) {
  const [headline, setHeadline] = useState('Fresh Mango Season 🥭');
  const [subtext, setSubtext] = useState('Flat 20% off | Delivered in 10 mins');
  const [template, setTemplate] = useState('Summer Organic');
  const [aiLoading, setAiLoading] = useState(false);

  const templates = [
    { name: 'Summer Organic', bg: '#1b4d3e', fontColor: '#ffffff' },
    { name: 'Monsoon Dairy', bg: '#0f2c59', fontColor: '#ffffff' },
    { name: 'Morning Breakfast', bg: '#b86214', fontColor: '#ffffff' }
  ];

  const currentTemplate = templates.find(t => t.name === template) || templates[0];

  const handleGenerateAi = () => {
    setAiLoading(true);
    setTimeout(() => {
      setAiLoading(false);
      setHeadline('Premium Organic Avocados 🥑');
      setSubtext('Directly imported | Extra 10% Cash Back');
      Alert.alert('AI Generated Banner 🎉', 'Mock creative prompts processed successfully. Creative copy updated!');
    }, 1500);
  };

  const handleSaveBanner = () => {
    Alert.alert('Creative Published 🚀', 'Banner compiled and uploaded successfully to Category header sliders!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={26} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Poster & Banner Studio</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Banner Preview Canvas */}
        <Text style={styles.sectionTitle}>Canvas Preview</Text>
        <View style={[styles.canvasFrame, { backgroundColor: currentTemplate.bg }]}>
          <View style={styles.canvasBadge}>
            <Text style={styles.canvasBadgeText}>ADVERTISEMENT</Text>
          </View>
          <Text style={[styles.canvasHeadline, { color: currentTemplate.fontColor }]}>{headline}</Text>
          <Text style={[styles.canvasSub, { color: currentTemplate.fontColor + 'd0' }]}>{subtext}</Text>
          <View style={styles.canvasBtn}>
            <Text style={styles.canvasBtnText}>Order Now</Text>
          </View>
        </View>

        {/* Text Customizer */}
        <Text style={styles.sectionTitle}>Customize Content</Text>
        <GlassyCard style={styles.controlCard}>
          <Text style={styles.label}>Headline text</Text>
          <TextInput 
            style={styles.input}
            value={headline}
            onChangeText={setHeadline}
            placeholder="Headline Title"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.label}>Subtext description</Text>
          <TextInput 
            style={styles.input}
            value={subtext}
            onChangeText={setSubtext}
            placeholder="Subtext / Terms details"
            placeholderTextColor={COLORS.textMuted}
          />
        </GlassyCard>

        {/* Template Selectors */}
        <Text style={styles.sectionTitle}>Visual Theme Presets</Text>
        <View style={styles.templatesRow}>
          {templates.map(t => (
            <TouchableOpacity 
              key={t.name}
              style={[styles.templateBtn, template === t.name && styles.templateBtnActive]}
              onPress={() => setTemplate(t.name)}
            >
              <View style={[styles.colorBubble, { backgroundColor: t.bg }]} />
              <Text style={[styles.templateBtnText, template === t.name && { color: '#ffffff' }]}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* AI Creative Assistant */}
        <Text style={styles.sectionTitle}>AI Mock Creative Studio</Text>
        <GlassyCard style={styles.aiCard}>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 15 }}>
              <Text style={styles.aiTitle}>AI Copywriter suggestions</Text>
              <Text style={styles.aiDesc}>Generate catchy, conversion-focused headlines for grocery items using our copy-assistant model.</Text>
            </View>
            <TouchableOpacity style={styles.aiBtn} onPress={handleGenerateAi} disabled={aiLoading}>
              <Ionicons name="sparkles" size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.aiBtnText}>{aiLoading ? 'Thinking...' : 'Generate'}</Text>
            </TouchableOpacity>
          </View>
        </GlassyCard>

        {/* Actions */}
        <TouchableOpacity style={styles.publishBtn} onPress={handleSaveBanner}>
          <Text style={styles.publishBtnText}>Publish to Live Customer App</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '900', color: '#ffffff' },
  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '900', color: '#ffffff', marginBottom: 15, marginTop: 20, textTransform: 'uppercase', letterSpacing: 1.5 },
  canvasFrame: { height: 160, borderRadius: 20, padding: 20, justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5, marginBottom: 10 },
  canvasBadge: { position: 'absolute', top: 15, right: 15, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  canvasBadgeText: { color: '#ffffff', fontSize: 8, fontWeight: 'bold' },
  canvasHeadline: { fontSize: 20, fontWeight: '900', marginBottom: 6 },
  canvasSub: { fontSize: 12, fontWeight: '500', marginBottom: 15 },
  canvasBtn: { alignSelf: 'flex-start', backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  canvasBtnText: { color: '#000000', fontSize: 11, fontWeight: 'bold' },
  controlCard: { padding: 15 },
  label: { fontSize: 12, fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', marginBottom: 8, marginTop: 10 },
  input: { height: 50, backgroundColor: COLORS.inputBg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 15, color: '#ffffff', fontSize: 14, marginBottom: 15 },
  templatesRow: { flexDirection: 'row', gap: 10 },
  templateBtn: { flex: 1, backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 15, padding: 12, alignItems: 'center', flexDirection: 'row', gap: 8 },
  templateBtnActive: { borderColor: COLORS.primary },
  colorBubble: { width: 14, height: 14, borderRadius: 7 },
  templateBtnText: { fontSize: 11, fontWeight: 'bold', color: COLORS.textMuted },
  aiCard: { borderColor: 'rgba(9, 132, 227, 0.3)', backgroundColor: 'rgba(9, 132, 227, 0.05)' },
  row: { flexDirection: 'row', alignItems: 'center' },
  aiTitle: { fontSize: 14, fontWeight: 'bold', color: '#ffffff' },
  aiDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, lineHeight: 15 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.secondary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  aiBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  publishBtn: { height: 52, backgroundColor: COLORS.primary, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 25, marginBottom: 40 },
  publishBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' }
});
