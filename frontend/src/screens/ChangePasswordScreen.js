import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';
import { useTheme } from '../utils/ThemeContext';

const ChangePasswordScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (oldPassword === newPassword) {
      Alert.alert('Error', 'New password must be different from old password');
      return;
    }

    setLoading(true);
    try {
      const response = await api.put('/auth/changepassword', {
        oldPassword,
        newPassword,
      });
      Alert.alert(
        'Success',
        response.message || 'Password changed successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const renderPasswordField = (label, value, setter, placeholder, showPassword, toggleShow) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#4B5563"
          secureTextEntry={!showPassword}
          value={value}
          onChangeText={setter}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.eyeBtn}
          onPress={toggleShow}
        >
          <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={colors.background} style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <Text style={styles.lockIcon}>🔐</Text>
            </View>

            <Text style={styles.title}>Change Password</Text>
            <Text style={styles.subtitle}>
              Enter your current password and choose a new one
            </Text>

            {renderPasswordField(
              'Current Password',
              oldPassword,
              setOldPassword,
              'Enter current password',
              showOld,
              () => setShowOld(!showOld)
            )}

            {renderPasswordField(
              'New Password',
              newPassword,
              setNewPassword,
              'Enter new password (min 6 chars)',
              showNew,
              () => setShowNew(!showNew)
            )}

            {renderPasswordField(
              'Confirm New Password',
              confirmPassword,
              setConfirmPassword,
              'Re-enter new password',
              showConfirm,
              () => setShowConfirm(!showConfirm)
            )}

            {/* Password strength indicator */}
            {newPassword.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBar}>
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        width: `${Math.min((newPassword.length / 12) * 100, 100)}%`,
                        backgroundColor:
                          newPassword.length < 6
                            ? '#EF4444'
                            : newPassword.length < 10
                            ? '#F59E0B'
                            : '#10B981',
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.strengthText,
                    {
                      color:
                        newPassword.length < 6
                          ? '#EF4444'
                          : newPassword.length < 10
                          ? '#F59E0B'
                          : '#10B981',
                    },
                  ]}
                >
                  {newPassword.length < 6
                    ? 'Too short'
                    : newPassword.length < 10
                    ? 'Good'
                    : 'Strong'}
                </Text>
              </View>
            )}

            {/* Match indicator */}
            {confirmPassword.length > 0 && (
              <View style={styles.matchContainer}>
                <Text
                  style={{
                    color: newPassword === confirmPassword ? '#10B981' : '#EF4444',
                    fontSize: 13,
                    fontWeight: '600',
                  }}
                >
                  {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.submitBtn,
                loading && styles.submitBtnDisabled,
              ]}
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    marginBottom: 20,
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  backText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  lockIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
    borderRadius: 12,
  },
  input: {
    flex: 1,
    padding: 14,
    color: '#F8FAFC',
    fontSize: 15,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  eyeIcon: {
    fontSize: 18,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: -8,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderRadius: 2,
    marginRight: 10,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 65,
    textAlign: 'right',
  },
  matchContainer: {
    marginBottom: 16,
    marginTop: -8,
  },
  submitBtn: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChangePasswordScreen;
