import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import api from '../services/api';
import { getUser } from '../utils/storage';
import { useTheme } from '../utils/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AvatarMenu = ({ navigation, onLogout }) => {
  const { isDark, toggleTheme, colors } = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const [user, setUser] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    const loadUser = async () => {
      const userData = await getUser();
      setUser(userData);
    };
    loadUser();
  }, []);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const getAvatarColor = (name) => {
    if (!name) return '#6366F1';
    const colors = [
      '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B',
      '#10B981', '#3B82F6', '#EF4444', '#14B8A6',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setMenuVisible(false));
  };

  const handleChangePassword = () => {
    closeMenu();
    setTimeout(() => {
      navigation.navigate('ChangePassword');
    }, 200);
  };

  const handleResetPassword = () => {
    const doReset = async () => {
      try {
        const response = await api.post('/auth/forgotpassword', { email: user?.email });
        Alert.alert(
          'Request Sent',
          response.message || 'Your password reset request has been sent to the admin. You will receive a temporary password via email once approved.'
        );
      } catch (error) {
        Alert.alert('Error', error.message || 'Failed to submit reset request');
      }
    };

    closeMenu();

    setTimeout(() => {
      if (Platform.OS === 'web') {
        if (window.confirm('Request a password reset? Admin will be notified and a temporary password will be emailed to you.')) {
          doReset();
        }
      } else {
        Alert.alert(
          'Reset Password',
          'Request a password reset? Admin will be notified and a temporary password will be emailed to you.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Request Reset', onPress: doReset },
          ]
        );
      }
    }, 200);
  };

  const handleLogout = () => {
    closeMenu();
    setTimeout(() => {
      if (Platform.OS === 'web') {
        if (window.confirm('Are you sure you want to logout?')) {
          onLogout();
        }
      } else {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Logout', style: 'destructive', onPress: onLogout },
        ]);
      }
    }, 200);
  };

  const initials = getInitials(user?.name);
  const avatarColor = getAvatarColor(user?.name);

  return (
    <View>
      {/* Avatar Button */}
      <TouchableOpacity
        style={[styles.avatarBtn, { backgroundColor: avatarColor }]}
        onPress={openMenu}
        activeOpacity={0.8}
      >
        <Text style={styles.avatarText}>{initials}</Text>
      </TouchableOpacity>

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={closeMenu}
        >
          <Animated.View
            style={[
              styles.menuContainer,
              { opacity: fadeAnim, backgroundColor: colors.modalBg, borderColor: colors.borderAccent, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] },
            ]}
          >
            {/* User Info Section */}
            <View style={styles.userSection}>
              <View style={[styles.menuAvatar, { backgroundColor: avatarColor }]}>
                <Text style={styles.menuAvatarText}>{initials}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>{user?.name || 'User'}</Text>
                <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>{user?.email || ''}</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Menu Items */}
            <TouchableOpacity style={styles.menuItem} onPress={handleChangePassword}>
              <Text style={styles.menuIcon}>🔑</Text>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>Change Password</Text>
                <Text style={[styles.menuItemDesc, { color: colors.textMuted }]}>Update with old & new password</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleResetPassword}>
              <Text style={styles.menuIcon}>🔄</Text>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>Reset Password</Text>
                <Text style={[styles.menuItemDesc, { color: colors.textMuted }]}>Request admin to reset</Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Theme Toggle */}
            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleTheme(); }}>
              <Text style={styles.menuIcon}>{isDark ? '☀️' : '🌙'}</Text>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>{isDark ? 'Light Mode' : 'Dark Mode'}</Text>
                <Text style={[styles.menuItemDesc, { color: colors.textMuted }]}>Switch appearance</Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
              <Text style={styles.menuIcon}>🚪</Text>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemTitle, styles.logoutText]}>Logout</Text>
                <Text style={styles.menuItemDesc}>Sign out of your account</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'web' ? 70 : 110,
    paddingRight: 16,
  },
  menuContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    width: Math.min(SCREEN_WIDTH - 40, 300),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    overflow: 'hidden',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  menuAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
    marginHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 28,
    textAlign: 'center',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
  menuItemDesc: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  logoutItem: {
    marginBottom: 4,
  },
  logoutText: {
    color: '#FCA5A5',
  },
});

export default AvatarMenu;
