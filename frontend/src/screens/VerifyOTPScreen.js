import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';
import { saveToken, saveUser } from '../utils/storage';

const VerifyOTPScreen = ({ navigation, route }) => {
  const { email } = route.params;
  
  // We need to pass the onLogin hook from navigation if possible, or we can just pop to top
  // If we pop to top and trigger state reload, AppNavigator should re-render
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', { email, otp });
      
      // Save token and user details
      if (response.token) {
        await saveToken(response.token);
        if (response.user) {
          await saveUser(response.user);
        }
      } 
      
      Alert.alert('Success', 'Account verified successfully!');
      
      // Navigate back to Login so it can trigger the onLogin flow 
      // or we can pass onLogin directly through params if needed.
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('Verification Failed', error.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Verify Email</Text>
        <Text style={styles.subtitle}>Enter the 6-digit OTP sent to {email}</Text>

        <TextInput
          style={styles.input}
          placeholder="000000"
          placeholderTextColor="#64748B"
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={setOtp}
          textAlign="center"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>Back to Register</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 32,
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
    borderRadius: 12,
    padding: 16,
    color: '#F8FAFC',
    fontSize: 24,
    letterSpacing: 8,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#6366F1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  backText: {
    color: '#818CF8',
    fontWeight: '600',
  },
});

export default VerifyOTPScreen;
