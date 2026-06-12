import React, { createContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const AdminContext = createContext();

const isLocalUrl = (url) => {
  if (!url) return false;
  return url.includes('localhost') || url.includes('127.0.0.1') || url.includes('10.0.2.2') || 
         /192\.168\.\d+\.\d+/.test(url) || /10\.\d+\.\d+\.\d+/.test(url) || /172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/.test(url);
};

const getDevApiUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri ? hostUri.split(':')[0] : null;
  if (Platform.OS === 'web') {
    return `http://${window.location.hostname}:5000`;
  }
  return host ? `http://${host}:5000` : (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://192.168.132.41:5000');
};

const getDefaultApiUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && !isLocalUrl(envUrl)) {
    return envUrl;
  }
  return getDevApiUrl() || envUrl || 'http://localhost:5000';
};

export const AdminProvider = ({ children }) => {
  const [apiUrl, setApiUrl] = useState(getDefaultApiUrl());
  const [isServerConnected, setIsServerConnected] = useState(true);
  const [isConnectionChecking, setIsConnectionChecking] = useState(true);
  const API_URL = apiUrl;
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [inventoryAlerts, setInventoryAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [capacityConfig, setCapacityConfig] = useState(null);
  const [alertSettings, setAlertSettings] = useState({ recipient: '+919876543210', lowThreshold: 10 });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const authTokenRef = useRef(null); // Always current, no render-cycle delay
  const [adminUser, setAdminUser] = useState(null);

  // Sync ref whenever state changes
  const setAuthTokenSynced = (token) => {
    authTokenRef.current = token;
    setAuthToken(token);
  };

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': authTokenRef.current ? `Bearer ${authTokenRef.current}` : ''
  });

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      const userStr = await AsyncStorage.getItem('adminUser');
      if (token && userStr) {
        setAuthTokenSynced(token); // set ref immediately so getHeaders works
        setAdminUser(JSON.parse(userStr));
        setIsLoggedIn(true);
      }
    } catch (err) {
      console.error('Auth check error:', err);
      await AsyncStorage.multiRemove(['adminToken', 'adminUser']);
    }
  };

  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (data.token && (data.user.role === 'ADMIN' || data.user.role === 'OWNER')) {
        await AsyncStorage.setItem('adminToken', data.token);
        await AsyncStorage.setItem('adminUser', JSON.stringify(data.user));
        setAuthTokenSynced(data.token); // use synced setter
        setAdminUser(data.user);
        setIsLoggedIn(true);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Access denied. Admins only.' };
      }
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('adminToken');
    await AsyncStorage.removeItem('adminUser');
    setAuthTokenSynced(null);
    setAdminUser(null);
    setIsLoggedIn(false);
  };

  const fetchStats = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch(`${API_URL}/admin/stats`, { headers: getHeaders() });
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchRevenueTrend = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch(`${API_URL}/admin/analytics/revenue`, { headers: getHeaders() });
      const data = await res.json();
      setRevenueTrend(data);
    } catch (err) {
      console.error('Error fetching revenue trend:', err);
    }
  };

  const fetchDistribution = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch(`${API_URL}/admin/analytics/distribution`, { headers: getHeaders() });
      const data = await res.json();
      setDistribution(data);
    } catch (err) {
      console.error('Error fetching distribution:', err);
    }
  };

  const fetchInventoryAlerts = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch(`${API_URL}/admin/inventory/alerts`, { headers: getHeaders() });
      const data = await res.json();
      setInventoryAlerts(data);
    } catch (err) {
      console.error('Error fetching inventory alerts:', err);
    }
  };

  const fetchOrders = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch(`${API_URL}/admin/orders`, { headers: getHeaders() });
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const fetchProducts = async () => {
    if (!isLoggedIn) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/products`, { headers: getHeaders() });
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch(`${API_URL}/categories`, { headers: getHeaders() });
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const addCategory = async (name) => {
    try {
      const res = await fetch(`${API_URL}/admin/categories`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.id) {
        setCategories(prev => [...prev, data]);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteCategory = async (id) => {
    try {
      const res = await fetch(`${API_URL}/admin/categories/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        setCategories(prev => prev.filter(c => c.id !== id));
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const addProduct = async (productData) => {
    try {
      const res = await fetch(`${API_URL}/admin/products`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(productData),
      });
      const data = await res.json();
      if (data.id) {
        setProducts(prev => [data, ...prev]);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const uploadImage = async (base64Data, filename) => {
    try {
      const res = await fetch(`${API_URL}/admin/upload`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ base64: base64Data, filename }),
      });
      const data = await res.json();
      if (data.url) {
        return { success: true, url: data.url };
      }
      return { success: false, error: data.error || 'Failed to upload image' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateVariant = async (variantId, price, stockQuantity) => {
    try {
      const res = await fetch(`${API_URL}/admin/variants/${variantId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ price, stockQuantity }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchProducts(); // Refresh product list
        return { success: true, data };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateTrending = async (productId, trendingData) => {
    try {
      const res = await fetch(`${API_URL}/admin/products/${productId}/trending`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(trendingData),
      });
      const data = await res.json();
      if (res.ok) {
        fetchProducts(); // Refresh
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const res = await fetch(`${API_URL}/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchOrders(); // Refresh orders
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const [kycQueue, setKycQueue] = useState([]);
  const [riders, setRiders] = useState([]);

  const fetchKycQueue = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/riders/kyc-queue`, { headers: getHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) setKycQueue(data);
    } catch (err) {
      console.error('Error fetching KYC queue:', err);
    }
  };

  const fetchRiders = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/riders`, { headers: getHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) setRiders(data);
    } catch (err) {
      console.error('Error fetching riders roster:', err);
    }
  };

  const verifyRider = async (id, verificationStatus, reuploadRemarks) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/riders/${id}/verify`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ verificationStatus, reuploadRemarks }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchKycQueue();
        await fetchRiders();
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const suspendRider = async (id, suspended) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/riders/${id}/suspend`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ suspended }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchRiders();
        await fetchKycQueue();
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const fetchCustomers = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/customers`, { headers: getHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) setCustomers(data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchVendors = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch(`${API_URL}/api/vendors`, { headers: getHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) setVendors(data);
    } catch (err) {
      console.error('Error fetching vendors:', err);
    }
  };

  const onboardVendor = async (vendorData) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/vendors`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(vendorData)
      });
      const data = await res.json();
      if (res.ok) {
        await fetchVendors();
        return { success: true, data };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const verifyVendor = async (id, verificationStatus, active) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/vendors/${id}/verify`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ verificationStatus, active })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchVendors();
        return { success: true, data };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const fetchCapacityConfig = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/capacity/config`, { headers: getHeaders() });
      const data = await res.json();
      if (data && data.id) setCapacityConfig(data);
    } catch (err) {
      console.error('Error fetching capacity config:', err);
    }
  };

  const saveCapacityConfig = async (configData) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/capacity/config`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(configData)
      });
      const data = await res.json();
      if (res.ok) {
        setCapacityConfig(data);
        return { success: true, data };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const toggleCustomerStatus = async (id, active) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/customers/${id}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ active })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchCustomers();
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const toggleCustomerVip = async (id, isVip) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/customers/${id}/vip`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ isVip })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchCustomers();
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const adjustWallet = async (ownerId, ownerType, walletType, amount, type, description) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/wallets/adjust`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ownerId, ownerType, walletType, amount, type, description })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchCustomers();
        return { success: true, data };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const fetchAlertSettings = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/alert-settings`, { headers: getHeaders() });
      const data = await res.json();
      if (data && data.recipient) setAlertSettings(data);
    } catch (err) {
      console.error('Error fetching alert settings:', err);
    }
  };

  const saveAlertSettings = async (config) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/alert-settings`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        setAlertSettings(data.config);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const testConnection = async (urlToTest) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(`${urlToTest}/categories`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      return res.status === 200;
    } catch (e) {
      clearTimeout(timeoutId);
      console.log('testConnection failed for:', urlToTest, e.message);
      return false;
    }
  };

  const saveCustomApiUrl = async (newUrl) => {
    let formattedUrl = newUrl.trim().replace(/\/+$/, '');
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `http://${formattedUrl}`;
    }
    
    await AsyncStorage.setItem('customApiUrl', formattedUrl);
    setApiUrl(formattedUrl);
    setIsServerConnected(true);
    await checkAuth();
    return { success: true };
  };

  const initializeSystem = async () => {
    setIsConnectionChecking(true);
    let currentUrl = apiUrl;
    try {
      const storedUrl = await AsyncStorage.getItem('customApiUrl');
      if (storedUrl) {
        currentUrl = storedUrl;
        setApiUrl(storedUrl);
      }
    } catch (e) {
      console.log('Error loading custom API URL:', e);
    }

    // Bypass offline checks - always allow login/dashboard to open directly
    setIsServerConnected(true);
    await checkAuth();
    setIsConnectionChecking(false);
  };

  useEffect(() => {
    initializeSystem();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchProducts();
      fetchCategories();
      fetchStats();
      fetchRevenueTrend();
      fetchDistribution();
      fetchInventoryAlerts();
      fetchOrders();
      fetchRiders();
      fetchKycQueue();
      fetchCustomers();
      fetchVendors();
      fetchCapacityConfig();
      fetchAlertSettings();
    }
  }, [isLoggedIn]);

  return (
    <AdminContext.Provider value={{
      apiUrl,
      setApiUrl,
      isServerConnected,
      setIsServerConnected,
      isConnectionChecking,
      testConnection,
      saveCustomApiUrl,
      products,
      categories,
      orders,
      stats,
      revenueTrend,
      distribution,
      inventoryAlerts,
      isLoading,
      isLoggedIn,
      adminUser,
      login,
      logout,
      fetchProducts,
      fetchOrders,
      fetchStats,
      fetchRevenueTrend,
      fetchDistribution,
      fetchInventoryAlerts,
      fetchCategories,
      addCategory,
      deleteCategory,
      addProduct,
      uploadImage,
      updateTrending,
      updateOrderStatus,
      updateVariant,
      kycQueue,
      riders,
      fetchKycQueue,
      fetchRiders,
      verifyRider,
      suspendRider,
      customers,
      fetchCustomers,
      toggleCustomerStatus,
      toggleCustomerVip,
      vendors,
      fetchVendors,
      onboardVendor,
      verifyVendor,
      capacityConfig,
      fetchCapacityConfig,
      saveCapacityConfig,
      adjustWallet,
      alertSettings,
      fetchAlertSettings,
      saveAlertSettings
    }}>
      {children}
    </AdminContext.Provider>
  );
};
