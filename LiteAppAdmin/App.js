import 'react-native-gesture-handler';
import React, { useState, useEffect, useContext } from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { AdminProvider, AdminContext } from './src/context/AdminContext';
import { StatusBar } from 'expo-status-bar';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import SplashScreen from './src/screens/SplashScreen';
import DashboardOverview from './src/screens/DashboardOverview';
import OrdersManagement from './src/screens/OrdersManagement';
import Dashboard from './src/screens/Dashboard'; // Existing product list
import AddProduct from './src/screens/AddProduct';
import CategoriesManagement from './src/screens/CategoriesManagement';
import AlertSettings from './src/screens/AlertSettings';
import RidersManagement from './src/screens/RidersManagement';
import ConnectionSettingsScreen from './src/screens/auth/ConnectionSettingsScreen';

// New Screens
import CapacityControl from './src/screens/CapacityControl';
import VendorManagement from './src/screens/VendorManagement';
import InventoryControl from './src/screens/InventoryControl';
import PromotionsManagement from './src/screens/PromotionsManagement';
import PosterStudio from './src/screens/PosterStudio';
import PlatformFees from './src/screens/PlatformFees';
import CustomerManagement from './src/screens/CustomerManagement';
import ReportingAnalytics from './src/screens/ReportingAnalytics';
import NotificationCenter from './src/screens/NotificationCenter';
import SecuritySettings from './src/screens/SecuritySettings';

// Components
import Sidebar from './src/components/Sidebar';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

function DrawerNavigator() {
  return (
    <Drawer.Navigator 
      drawerContent={(props) => (
        <Sidebar 
          navigation={props.navigation} 
          state={props.state} 
          descriptors={props.descriptors}
        />
      )}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
      }}
    >
      <Drawer.Screen name="Dashboard" component={DashboardOverview} />
      <Drawer.Screen name="Orders" component={OrdersManagement} />
      <Drawer.Screen name="Products" component={Dashboard} />
      <Drawer.Screen name="CapacityControl" component={CapacityControl} />
      <Drawer.Screen name="Vendors" component={VendorManagement} />
      <Drawer.Screen name="Inventory" component={InventoryControl} />
      <Drawer.Screen name="Categories" component={CategoriesManagement} />
      <Drawer.Screen name="Promotions" component={PromotionsManagement} />
      <Drawer.Screen name="Customers" component={CustomerManagement} />
      <Drawer.Screen name="Banners" component={PosterStudio} />
      <Drawer.Screen name="PlatformFees" component={PlatformFees} />
      <Drawer.Screen name="Riders" component={RidersManagement} />
      <Drawer.Screen name="Reporting" component={ReportingAnalytics} />
      <Drawer.Screen name="Notifications" component={NotificationCenter} />
      <Drawer.Screen name="Security" component={SecuritySettings} />
      <Drawer.Screen name="Alert Settings" component={AlertSettings} />
    </Drawer.Navigator>
  );
}

function RootNavigator() {
  const { isLoggedIn, isConnectionChecking } = useContext(AdminContext);

  if (isConnectionChecking) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={DrawerNavigator} />
          <Stack.Screen name="AddProduct" component={AddProduct} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AdminProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <RootNavigator />
      </NavigationContainer>
    </AdminProvider>
  );
}
