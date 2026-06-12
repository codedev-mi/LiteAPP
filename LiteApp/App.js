import React, { useContext, useState, useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';

import { AppProvider, AppContext } from './src/context/AppContext';
import ErrorBoundary from './src/components/ErrorBoundary';

// Import Screens
import SplashScreen from './src/screens/auth/SplashScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import ConnectionSettingsScreen from './src/screens/auth/ConnectionSettingsScreen';
import UserHome from './src/screens/user/UserHome';
import ProfileScreen from './src/screens/user/ProfileScreen';
import AddressListScreen from './src/screens/user/AddressListScreen';
import AddAddressScreen from './src/screens/user/AddAddressScreen';
import MapSelectionScreen from './src/screens/user/MapSelectionScreen';
import OwnerHome from './src/screens/owner/OwnerHome';
import AdminDashboard from './src/screens/admin/AdminDashboard';
import AdminOrdersScreen from './src/screens/admin/AdminOrdersScreen';

// Profile Sub-pages
import OrdersScreen from './src/screens/user/OrdersScreen';
import FavouritesScreen from './src/screens/user/FavouritesScreen';
import PaymentsScreen from './src/screens/user/PaymentsScreen';
import FAQScreen from './src/screens/user/FAQScreen';
import CustomerCareScreen from './src/screens/user/CustomerCareScreen';
import CheckoutScreen from './src/screens/user/CheckoutScreen';
import SearchScreen from './src/screens/user/SearchScreen';
import EditProfileScreen from './src/screens/user/EditProfileScreen';
import ProductDescription from './src/screens/user/ProductDescriptionScreen';
import CategoryProducts from './src/screens/user/CategoryProductsScreen';
import DeliveryTracking from './src/screens/user/DeliveryTrackingScreen';
import NotificationsScreen from './src/screens/user/NotificationsScreen';
import OrderDetailScreen from './src/screens/user/OrderDetailScreen';
import WalletScreen from './src/screens/user/WalletScreen';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'SearchTab') iconName = focused ? 'search' : 'search-outline';
          else if (route.name === 'FavouritesTab') iconName = focused ? 'heart' : 'heart-outline';
          else if (route.name === 'ProfileTab') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: '#00b894',
        tabBarInactiveTintColor: '#b2bec3',
        tabBarStyle: { 
          height: Platform.OS === 'ios' ? 85 : 65, 
          paddingBottom: Platform.OS === 'ios' ? 25 : 8, 
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: '#f1f2f6',
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          backgroundColor: '#fff',
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' }
      })}
    >
      <Tab.Screen name="Home" component={UserHome} options={{ tabBarLabel: 'Shop' }} />
      <Tab.Screen name="SearchTab" component={SearchScreen} options={{ tabBarLabel: 'Search' }} />
      <Tab.Screen name="FavouritesTab" component={FavouritesScreen} options={{ tabBarLabel: 'Wishlist' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ tabBarLabel: 'Account' }} />
    </Tab.Navigator>
  );
}

function UserStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        ...TransitionPresets.SlideFromRightIOS
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="AddressList" component={AddressListScreen} />
      <Stack.Screen name="AddAddress" component={AddAddressScreen} />
      <Stack.Screen name="MapSelection" component={MapSelectionScreen} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="Favourites" component={FavouritesScreen} />
      <Stack.Screen name="Payments" component={PaymentsScreen} />
      <Stack.Screen name="FAQ" component={FAQScreen} />
      <Stack.Screen name="CustomerCare" component={CustomerCareScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ProductDescription" component={ProductDescription} />
      <Stack.Screen name="CategoryProducts" component={CategoryProducts} />
      <Stack.Screen name="DeliveryTracking" component={DeliveryTracking} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
    </Stack.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        ...TransitionPresets.SlideFromRightIOS
      }}
    >
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="AdminOrders" component={AdminOrdersScreen} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { isLoggedIn, userRole, isAuthLoading, isServerConnected, isConnectionChecking } = useContext(AppContext);

  if (isConnectionChecking) {
    return <SplashScreen />;
  }

  if (!isServerConnected) {
    return <ConnectionSettingsScreen />;
  }

  if (isAuthLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        ...TransitionPresets.SlideFromRightIOS
      }}
    >
      {!isLoggedIn ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      ) : (
        <>
          {userRole === 'USER' && <Stack.Screen name="UserRoot" component={UserStack} />}
          {userRole === 'OWNER' && <Stack.Screen name="OwnerHome" component={OwnerHome} />}
          {userRole === 'ADMIN' && <Stack.Screen name="AdminRoot" component={AdminStack} />}
        </>
      )}
    </Stack.Navigator>
  );
}


export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <StatusBar barStyle="dark-content" />
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AppProvider>
    </ErrorBoundary>
  );
}