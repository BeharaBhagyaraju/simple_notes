import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import api from '../services/api';
import AvatarMenu from '../components/AvatarMenu';
import { useTheme } from '../utils/ThemeContext';

const AdminDashboardScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { onLogout } = route?.params || {};
  
  const [activeTab, setActiveTab] = useState('users'); // users | resets | notifications
  const [loading, setLoading] = useState(true);

  // Data
  const [users, setUsers] = useState([]);
  const [resetRequests, setResetRequests] = useState([]);

  // Modals / Forms
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [isDetailsModalVisible, setDetailsModalVisible] = useState(false);
  
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [usersRes, resetsRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/reset-requests')
      ]);
      setUsers(usersRes.data);
      setResetRequests(resetsRes.data);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const fetchUserDetails = async (id) => {
    try {
      const response = await api.get(`/users/${id}`);
      setSelectedUserDetails(response.data);
      setDetailsModalVisible(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch user details');
    }
  };

  const handleDeleteUser = async (id) => {
    const confirmDelete = () => {
      api.delete(`/users/${id}`).then(() => fetchDashboardData()).catch(e => Alert.alert('Error', e.message));
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this user and ALL of their notes?')) {
        confirmDelete();
      }
    } else {
      Alert.alert('Delete User', 'Are you sure you want to delete this user and ALL of their notes?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      ]);
    }
  };

  const handleApproveReset = async (id) => {
    const confirmApprove = () => {
      api.put(`/users/reset-requests/${id}/approve`).then(() => {
        Alert.alert('Success', 'Password reset and email sent');
        fetchDashboardData();
      }).catch(e => Alert.alert('Error', e.message));
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Approve this reset request? A new password will be emailed.')) {
        confirmApprove();
      }
    } else {
      Alert.alert('Approve Reset', 'Approve this reset request? A new password will be emailed to the user.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: confirmApprove },
      ]);
    }
  };

  const handleSendNotification = async () => {
    if (!notifTitle || !notifMessage) {
      Alert.alert('Error', 'Title and message are required');
      return;
    }
    try {
      await api.post('/users/notifications', {
        title: notifTitle,
        message: notifMessage,
        userId: selectedUserId || null
      });
      Alert.alert('Success', 'Notification sent');
      setNotifTitle('');
      setNotifMessage('');
    } catch (error) {
      Alert.alert('Error', 'Failed to send notification');
    }
  };

  const renderUser = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name} {item.role === 'admin' ? '(Admin)' : ''}</Text>
        <View style={{flexDirection: 'row'}}>
          <TouchableOpacity onPress={() => fetchUserDetails(item._id)} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>Details</Text>
          </TouchableOpacity>
          {item.role !== 'admin' && (
            <TouchableOpacity onPress={() => handleDeleteUser(item._id)} style={[styles.actionBtn, styles.deleteBtn]}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={styles.cardSubtitle}>{item.email}</Text>
    </View>
  );

  const renderResetRequest = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.user?.name || 'Unknown User'}</Text>
        <TouchableOpacity onPress={() => handleApproveReset(item._id)} style={[styles.actionBtn, { backgroundColor: '#10B981', borderColor: '#10B981' }]}>
          <Text style={[styles.actionBtnText, { color: '#fff' }]}>Approve Reset</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.cardSubtitle}>{item.user?.email}</Text>
      <Text style={{color: '#94A3B8', fontSize: 12, marginTop: 4}}>Requested: {new Date(item.createdAt).toLocaleDateString()}</Text>
    </View>
  );

  return (
    <LinearGradient colors={colors.background} style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Admin Panel</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Manage System</Text>
        </View>
        <AvatarMenu navigation={navigation} onLogout={onLogout} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'users' && styles.activeTab]} onPress={() => setActiveTab('users')}>
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>Users ({users.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'resets' && styles.activeTab]} onPress={() => setActiveTab('resets')}>
          <Text style={[styles.tabText, activeTab === 'resets' && styles.activeTabText]}>
            Resets {resetRequests.length > 0 ? `(${resetRequests.length})` : ''}
          </Text>
          {resetRequests.length > 0 && <View style={styles.badge} />}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'notifications' && styles.activeTab]} onPress={() => setActiveTab('notifications')}>
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>Notify</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContent}><ActivityIndicator size="large" color="#818CF8" /></View>
      ) : activeTab === 'users' ? (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          renderItem={renderUser}
          contentContainerStyle={styles.listContainer}
        />
      ) : activeTab === 'resets' ? (
        <FlatList
          data={resetRequests}
          keyExtractor={(item) => item._id}
          renderItem={renderResetRequest}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={<Text style={{color: '#94A3B8', textAlign: 'center', marginTop: 20}}>No pending requests.</Text>}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer}>
          <View style={styles.formCard}>
            <Text style={{color: '#F8FAFC', fontSize: 18, fontWeight: 'bold', marginBottom: 16}}>Send Notification</Text>
            
            <Text style={styles.label}>Recipient</Text>
            <View style={styles.pickerContainer}>
            <Picker
                selectedValue={selectedUserId}
                onValueChange={setSelectedUserId}
                style={[styles.picker, { color: colors.pickerText }]}
                dropdownIconColor={colors.textSecondary}
              >
                <Picker.Item label="All Users (Global)" value="" color={colors.pickerText} />
                {users.map(u => (
                  <Picker.Item key={u._id} label={`${u.name} (${u.email})`} value={u._id} color={colors.pickerText} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Notification Title"
              placeholderTextColor="#64748B"
              value={notifTitle}
              onChangeText={setNotifTitle}
            />

            <Text style={styles.label}>Message</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Message body..."
              placeholderTextColor="#64748B"
              multiline
              value={notifMessage}
              onChangeText={setNotifMessage}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSendNotification}>
              <Text style={styles.submitBtnText}>Send Notification</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* User Details Modal */}
      <Modal visible={isDetailsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedUserDetails && (
              <>
                <Text style={styles.modalTitle}>{selectedUserDetails.user.name}</Text>
                <Text style={{color: '#94A3B8', marginBottom: 20}}>{selectedUserDetails.user.email}</Text>
                
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Total Notes:</Text>
                  <Text style={styles.statValue}>{selectedUserDetails.stats.totalNotes}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Regular Notes:</Text>
                  <Text style={styles.statValue}>{selectedUserDetails.stats.regularNotes}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Wages Reports:</Text>
                  <Text style={styles.statValue}>{selectedUserDetails.stats.wagesNotes}</Text>
                </View>
              </>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setDetailsModalVisible(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#F8FAFC' },
  headerSubtitle: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
  logoutBtn: { backgroundColor: 'rgba(248, 113, 113, 0.1)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(248, 113, 113, 0.3)' },
  logoutText: { color: '#FCA5A5', fontWeight: 'bold', fontSize: 14 },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', flexDirection: 'row', justifyContent: 'center' },
  activeTab: { borderBottomColor: '#818CF8' },
  tabText: { color: '#94A3B8', fontWeight: 'bold' },
  activeTabText: { color: '#818CF8' },
  badge: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginLeft: 4, marginTop: -8 },
  listContainer: { padding: 20 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: 'rgba(30, 41, 59, 0.9)', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(51, 65, 85, 0.5)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#F8FAFC' },
  cardSubtitle: { fontSize: 14, color: '#94A3B8' },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#818CF8', marginLeft: 8 },
  actionBtnText: { color: '#818CF8', fontSize: 12, fontWeight: 'bold' },
  deleteBtn: { borderColor: '#FCA5A5', backgroundColor: 'rgba(248, 113, 113, 0.1)' },
  deleteText: { color: '#FCA5A5', fontSize: 12, fontWeight: 'bold' },
  formCard: { backgroundColor: 'rgba(30, 41, 59, 0.9)', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: 'rgba(51, 65, 85, 0.5)' },
  label: { color: '#94A3B8', marginBottom: 8, fontWeight: 'bold' },
  input: { backgroundColor: 'rgba(15, 23, 42, 0.6)', borderWidth: 1, borderColor: 'rgba(51, 65, 85, 0.5)', borderRadius: 8, padding: 12, color: '#F8FAFC', marginBottom: 16 },
  pickerContainer: { backgroundColor: 'rgba(15, 23, 42, 0.6)', borderWidth: 1, borderColor: 'rgba(51, 65, 85, 0.5)', borderRadius: 8, marginBottom: 16 },
  picker: { color: '#F8FAFC', height: 50 },
  submitBtn: { backgroundColor: '#6366F1', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1E293B', width: '100%', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: 'rgba(51, 65, 85, 0.5)' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 4 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(51, 65, 85, 0.5)' },
  statLabel: { color: '#94A3B8', fontSize: 16 },
  statValue: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold' },
  closeBtn: { backgroundColor: 'rgba(51, 65, 85, 0.5)', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  closeBtnText: { color: '#F8FAFC', fontWeight: 'bold' },
});

export default AdminDashboardScreen;
