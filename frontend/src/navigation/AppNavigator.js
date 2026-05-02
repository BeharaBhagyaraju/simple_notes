import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { getToken, getUser, clearStorage } from '../utils/storage';
import { useTheme } from '../utils/ThemeContext';

// Screens
import HomeScreen from '../screens/HomeScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VerifyOTPScreen from '../screens/VerifyOTPScreen';
import AddNoteScreen from '../screens/AddNoteScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = ({ route }) => {
  const { colors } = useTheme();
  const { onLogout } = route.params;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBorder,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{ title: 'Notes' }}
        initialParams={{ onLogout }}
      />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ title: 'Alerts' }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // Check if user is already logged in
  useEffect(() => {
    const checkTokenAndUser = async () => {
      try {
        const token = await getToken();
        const user = await getUser();
        setUserToken(token);
        setUserRole(user?.role || 'user');
      } catch (e) {
        console.error('Failed to get token/user:', e);
      } finally {
        setIsLoading(false);
      }
    };
    checkTokenAndUser();
  }, []);

  const handleLogin = async () => {
    const token = await getToken();
    const user = await getUser();
    setUserToken(token);
    setUserRole(user?.role || 'user');
  };

  const handleLogout = async () => {
    await clearStorage();
    setUserToken(null);
    setUserRole(null);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0F172A' },
        animation: 'slide_from_right',
      }}
    >
      {userToken == null ? (
        // Auth Stack
        <>
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            initialParams={{ onLogin: handleLogin }}
          />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
        </>
      ) : userRole === 'admin' ? (
        // Admin Stack
        <>
          <Stack.Screen 
            name="AdminDashboard" 
            component={AdminDashboardScreen} 
            initialParams={{ onLogout: handleLogout }}
          />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        </>
      ) : (
        // Main Stack (Regular Users)
        <>
          <Stack.Screen 
            name="Main" 
            component={MainTabs} 
            initialParams={{ onLogout: handleLogout }}
          />
          <Stack.Screen name="AddNote" component={AddNoteScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
