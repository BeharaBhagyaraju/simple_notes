import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { getUser } from '../utils/storage';
import { useTheme } from '../utils/ThemeContext';

const NotificationsScreen = () => {
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);

  const fetchData = async () => {
    try {
      const user = await getUser();
      setUserId(user?._id);
      const response = await api.get('/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      // Update local state to show as read
      setNotifications(prev => prev.map(n => 
        n._id === id ? { ...n, readBy: [...(n.readBy || []), userId] } : n
      ));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const renderNotification = ({ item }) => {
    const isRead = item.readBy && item.readBy.includes(userId);

    return (
      <TouchableOpacity 
        style={[styles.notifCard, isRead && styles.readCard]} 
        onPress={() => !isRead && markAsRead(item._id)}
        disabled={isRead}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.title, isRead && styles.readText]}>{item.title}</Text>
          {!isRead && <View style={styles.unreadDot} />}
        </View>
        <Text style={[styles.message, isRead && styles.readText]}>{item.message}</Text>
        <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={colors.background} style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Notifications</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Messages from Administrators</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderNotification}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔔</Text>
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          }
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  list: {
    padding: 20,
  },
  notifCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  readCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderColor: 'transparent',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    flex: 1,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366F1',
    marginLeft: 10,
  },
  message: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
    marginBottom: 10,
  },
  readText: {
    color: '#94A3B8',
  },
  date: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: '600',
  },
});

export default NotificationsScreen;
