import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../context/AppContext';

export default function NotificationsScreen({ navigation }) {
  const { notifications, markNotificationRead } = React.useContext(AppContext);

  const handlePress = (item) => {
    if (!item.isRead) {
      markNotificationRead(item.id);
    }
  };

  const getTimeAgo = (date) => {
    try {
      const d = new Date(date);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Recently';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 50 }}
        ListEmptyComponent={() => (
           <View style={{ flex: 1, alignItems: 'center', marginTop: 100 }}>
             <Ionicons name="notifications-off-outline" size={80} color="#ccc" />
             <Text style={{ marginTop: 20, fontSize: 16, color: '#999' }}>No notifications yet!</Text>
           </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity 
            activeOpacity={0.8} 
            style={[styles.card, !item.isRead && styles.unread]}
            onPress={() => handlePress(item)}
          >
            <View style={styles.iconBox}>
              <Ionicons name={item.isRead ? "notifications-outline" : "notifications"} size={20} color="#00b894" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
              <Text style={styles.time}>{getTimeAgo(item.createdAt)}</Text>
            </View>
            {!item.isRead && <View style={styles.dot} />}
          </TouchableOpacity>
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
  title: { fontSize: 18, fontWeight: '900', color: '#2d3436' },
  backBtn: { fontSize: 16, color: '#4CAF50', fontWeight: 'bold' },
  card: { 
    flexDirection: 'row', 
    backgroundColor: 'white', 
    padding: 20, 
    marginBottom: 2, 
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6'
  },
  unread: { backgroundColor: '#f0fdf4' },
  iconBox: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#e8f5e9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#2d3436' },
  cardBody: { fontSize: 13, color: '#636e72', marginTop: 4, lineHeight: 18 },
  time: { fontSize: 11, color: '#b2bec3', marginTop: 8, fontWeight: 'bold' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff4757', marginLeft: 15 }
});
