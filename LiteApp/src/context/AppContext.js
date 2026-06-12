import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, LogBox } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Ignore the Expo Go SDK 53 push notification warning screen
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
]);

// Configure notification handling behavior when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('USER');
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const registerForPushNotificationsAsync = async () => {
    if (Platform.OS === 'web') return null;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }
      
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId || 
                        Constants?.easConfig?.projectId;
                        
      if (!projectId) {
        console.warn('[Push Notification Setup] No "projectId" found in app.json. Please run "npx eas project:create" or manually add "extra.eas.projectId" under the "expo" key in app.json to enable remote push notifications.');
        return null;
      }
                        
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      return token;
    } catch (error) {
      console.log('Error getting expo push token:', error);
      return null;
    }
  };

  const apiFetch = async (endpoint, options = {}) => {
    const headers = { ...options.headers };
    if (!headers['Content-Type'] && options.method && options.method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }
    let token = authToken;
    if (!token) {
      token = await AsyncStorage.getItem('authToken');
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const url = `${API_URL}${endpoint}`;
    console.log(`apiFetch calling: ${url}`);
    return fetch(url, { ...options, headers });
  };

  
  // New addition: Track currently selected address for delivery
  const [currentAddress, setCurrentAddress] = useState(null);
  const [userAddresses, setUserAddresses] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [favourites, setFavourites] = useState([]);
  const [favouriteProducts, setFavouriteProducts] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [banners, setBanners] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);

  const isLocalUrl = (url) => {
    if (!url) return false;
    return url.includes('localhost') || url.includes('127.0.0.1') || url.includes('10.0.2.2') || 
           /192\.168\.\d+\.\d+/.test(url) || /10\.\d+\.\d+\.\d+/.test(url) || /172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/.test(url);
  };

  const resolveImageUrl = (img) => {
    if (!img) return null;
    if (typeof img === 'string') {
      if (img.startsWith('http://localhost:5000') || img.startsWith('http://127.0.0.1:5000')) {
        return img.replace(/http:\/\/localhost:5000|http:\/\/127.0.0.1:5000/g, apiUrl);
      }
      if (img.startsWith('/images/')) {
        return `${apiUrl}${img}`;
      }
    }
    return img;
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

  const [apiUrl, setApiUrl] = useState(getDefaultApiUrl());
  const [isServerConnected, setIsServerConnected] = useState(true);
  const [isConnectionChecking, setIsConnectionChecking] = useState(true);
  const API_URL = apiUrl;

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [isLoadingMoreProducts, setIsLoadingMoreProducts] = useState(false);
  const [productPage, setProductPage] = useState(1);

  const fetchProducts = async (filters = {}, append = false, page = 1) => {
    try {
      if (append) setIsLoadingMoreProducts(true);
      const { search, category, sort } = filters;
      let query = '';
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      if (sort) params.append('sort', sort);
      params.append('page', page);
      params.append('limit', 10);
      query = `?${params.toString()}`;

      const res = await apiFetch(`/products${query}`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        if (append) {
          setProducts(prev => [...prev, ...data]);
        } else {
          setProducts(data);
        }
        setHasMoreProducts(data.length === 10);
        setProductPage(page);
      } else {
        if (!append) setProducts([]);
        setHasMoreProducts(false);
      }
    } catch (err) {
      console.log('Error fetching products:', err);
    } finally {
      if (append) setIsLoadingMoreProducts(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiFetch(`/categories`);
      const data = await res.json();
      if (data && data.length > 0) setCategories(data);
    } catch (err) {
      console.log('Error fetching categories:', err);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const res = await apiFetch(`/payment-methods`);
      const data = await res.json();
      if (data && data.length > 0) setPaymentMethods(data);
    } catch (err) {
      console.log('Error fetching payment methods:', err);
    }
  };

  const fetchBanners = async () => {
    try {
      const res = await apiFetch(`/banners`);
      const data = await res.json();
      if (data && data.length > 0) setBanners(data);
    } catch (err) {
      console.log('Error fetching banners:', err);
    }
  };

  const fetchBestSellers = async () => {
    try {
      const res = await apiFetch(`/products/best-sellers`);
      const data = await res.json();
      if (data && data.length > 0) setBestSellers(data);
    } catch (err) {
      console.log('Error fetching best sellers:', err);
    }
  };

  const fetchTrendingProducts = async () => {
    try {
      const res = await apiFetch(`/products/trending`);
      const data = await res.json();
      if (data && data.length > 0) setTrendingProducts(data);
    } catch (err) {
      console.log('Error fetching trending products:', err);
    }
  };

  const addPaymentMethod = async (methodData) => {
    try {
      const res = await apiFetch(`/payment-methods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(methodData)
      });
      const newMethod = await res.json();
      setPaymentMethods(prev => [...prev, newMethod]);
      return newMethod;
    } catch (err) {
      console.log('Add payment method error:', err);
    }
  };

  const deletePaymentMethod = async (id) => {
    try {
      await apiFetch(`/payment-methods/${id}`, {
        method: 'DELETE'
      });
      setPaymentMethods(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.log('Delete payment method error:', err);
    }
  };

  const validatePromo = async (code, orderValue) => {
    try {
      const res = await apiFetch(`/promo/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, orderValue })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.log('Validate promo error:', err);
      return { error: 'Network error' };
    }
  };

  const createRazorpayOrder = async (amount) => {
    try {
      const res = await apiFetch(`/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, receipt: `receipt_${Date.now()}` })
      });
      return await res.json();
    } catch (err) {
      console.log('Create Razorpay order error:', err);
      return { error: 'Network error' };
    }
  };

  const verifyRazorpayPayment = async (paymentData) => {
    try {
      const res = await apiFetch(`/payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });
      return await res.json();
    } catch (err) {
      console.log('Verify Razorpay payment error:', err);
      return { status: 'failed', error: 'Network error' };
    }
  };

  const createRazorpayPaymentLink = async ({ amount, receipt, name, email, contact }) => {
    try {
      const res = await apiFetch(`/payments/create-payment-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, receipt, name, email, contact })
      });
      return await res.json();
    } catch (err) {
      console.log('Create Razorpay payment link error:', err);
      return { error: 'Network error' };
    }
  };

  const checkRazorpayPaymentLink = async (paymentLinkId) => {
    try {
      const res = await apiFetch(`/payments/check-payment-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentLinkId })
      });
      return await res.json();
    } catch (err) {
      console.log('Check Razorpay payment link error:', err);
      return { error: 'Network error' };
    }
  };

  const addReview = async (reviewData) => {
    if (!currentUser) return;
    try {
      const res = await apiFetch(`/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reviewData, userId: currentUser.id })
      });
      const data = await res.json();
      // Optionally refresh products to get new reviews
      fetchProducts();
      return data;
    } catch (err) {
      console.log('Add review error:', err);
    }
  };

  const fetchAdminStats = async () => {
    try {
      const res = await apiFetch(`/admin/stats`);
      const data = await res.json();
      return data;
    } catch (err) {
      console.log('Fetch admin stats error:', err);
    }
  };

  const seedProducts = async () => {
    try {
      // We will implement this in the backend next
      const res = await apiFetch(`/admin/seed`, {
        method: 'POST'
      });
      const data = await res.json();
      fetchProducts(); // Refresh products after seeding
      return data;
    } catch (err) {
      console.log('Seed products error:', err);
    }
  };

  const updateProfile = async (profileData) => {
    if (!currentUser) return;
    try {
      const res = await apiFetch(`/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      const updatedUser = await res.json();
      if (updatedUser && !updatedUser.error) {
        setCurrentUser(updatedUser);
        setUserAddresses(updatedUser.addresses || []);
        if (updatedUser.addresses && updatedUser.addresses.length > 0) {
          setCurrentAddress(updatedUser.addresses.find(a => a.isDefault) || updatedUser.addresses[0]);
        }
        return updatedUser;
      }
      return null;
    } catch (err) {
      console.log('Update profile error:', err);
      return null;
    }
  };

  const deleteAddress = async (id) => {
    if (!currentUser) return;
    try {
      const res = await apiFetch(`/addresses/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data && data.success) {
        const newAddresses = userAddresses.filter(a => a.id !== id);
        setUserAddresses(newAddresses);
        if (currentAddress?.id === id) {
          setCurrentAddress(newAddresses[0] || null);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.log('Delete address error:', err);
      return false;
    }
  };

  const loadStoredUser = async (overrideUrl = null) => {
    const activeUrl = overrideUrl || apiUrl;
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        setAuthToken(token);
        
        let success = false;
        let data = null;
        
        // Hard 4-second timeout so we never hang on the splash screen
        const fetchWithTimeout = (url, options, ms = 4000) => {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), ms);
          return fetch(url, { ...options, signal: controller.signal })
            .finally(() => clearTimeout(id));
        };

        try {
          const res = await fetchWithTimeout(`${activeUrl}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }, 4000);

          if (res.ok) {
            data = await res.json();
            success = true;
          } else if (res.status === 401 || res.status === 400 || res.status === 404) {
            // Explicit authentication failure — clear token
            await AsyncStorage.removeItem('authToken');
            setAuthToken(null);
            setCurrentUser(null);
            setIsLoggedIn(false);
          }
          // On other server errors: keep token, just don't restore session
        } catch (fetchErr) {
          // Network error or timeout — keep token, show login
          console.log('Session recovery timed out or failed:', fetchErr.message);
        }
        
        if (success && data && data.user) {
          setCurrentUser(data.user);
          setUserRole(data.user.role);
          setIsLoggedIn(true);
          setUserAddresses(data.user.addresses || []);
          if (data.user.addresses && data.user.addresses.length > 0) {
            setCurrentAddress(data.user.addresses.find(a => a.isDefault) || data.user.addresses[0]);
          }
        }
      }
    } catch (err) {
      console.log('Error loading stored user:', err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const loginWithEmail = async (email, password) => {
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data && data.token) {
        await AsyncStorage.setItem('authToken', data.token);
        setAuthToken(data.token);
        setCurrentUser(data.user);
        setUserRole(data.user.role);
        setIsLoggedIn(true);
        setUserAddresses(data.user.addresses || []);
        if (data.user.addresses && data.user.addresses.length > 0) {
           setCurrentAddress(data.user.addresses.find(a => a.isDefault) || data.user.addresses[0]);
        }
        return data;
      }
      return { error: data.error || 'Login failed' };
    } catch (err) {
      console.log('Login error:', err);
      return { error: 'Network error' };
    }
  };

  const register = async (name, phone, email, password) => {
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, phone, email, password })
      });
      const data = await res.json();
      if (data && data.token) {
        await AsyncStorage.setItem('authToken', data.token);
        setAuthToken(data.token);
        setCurrentUser(data.user);
        setUserRole(data.user.role);
        setIsLoggedIn(true);
        setUserAddresses(data.user.addresses || []);
        return data;
      }
      return { error: data.error || 'Registration failed' };
    } catch (err) {
      console.log('Register error:', err);
      return { error: 'Network error' };
    }
  };

  const forgotPassword = async (email) => {
    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      return await res.json();
    } catch (err) {
      console.log('Forgot password error:', err);
      return { error: 'Network error' };
    }
  };

  const resetPassword = async (email, token, newPassword) => {
    try {
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, token, newPassword })
      });
      return await res.json();
    } catch (err) {
      console.log('Reset password error:', err);
      return { error: 'Network error' };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('authToken');
    setAuthToken(null);
    setCurrentUser(null);
    setIsLoggedIn(false);
  };

  const addAddress = async (addressData) => {
    if (!currentUser) return;
    try {
      const res = await apiFetch(`/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addressData, userId: currentUser.id })
      });
      const newAddress = await res.json();
      if (newAddress && !newAddress.error) {
        setUserAddresses(prev => [...prev, newAddress]);
        if (!currentAddress) setCurrentAddress(newAddress);
      }
      return newAddress;
    } catch (err) {
      console.log('Add address error:', err);
      return { error: err.message || 'Network error' };
    }
  };

  const updateAddress = async (id, addressData) => {
    if (!currentUser) return;
    try {
      const res = await apiFetch(`/addresses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressData)
      });
      const updatedAddress = await res.json();
      if (updatedAddress && !updatedAddress.error) {
        setUserAddresses(prev => prev.map(a => a.id === id ? updatedAddress : a));
        if (currentAddress && currentAddress.id === id) {
          setCurrentAddress(updatedAddress);
        }
      }
      return updatedAddress;
    } catch (err) {
      console.log('Update address error:', err);
      return { error: err.message || 'Network error' };
    }
  };

  const placeOrder = async (orderData) => {
    if (!currentUser) return;
    try {
      const res = await apiFetch(`/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...orderData, userId: currentUser.id })
      });
      const order = await res.json();
      setOrders(prev => [order, ...prev]);
      clearCart();
      return order;
    } catch (err) {
      console.log('Place order error:', err);
    }
  };

  const fetchOrders = async () => {
    if (!currentUser) return;
    try {
      const res = await apiFetch(`/orders/${currentUser.id}`);
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.log('Fetch orders error:', err);
    }
  };

  const cancelOrder = async (orderId) => {
    try {
      const res = await apiFetch(`/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data && !data.error) {
        setOrders(prev => prev.map(o => o.id === orderId ? data : o));
        return data;
      } else {
        console.log('Cancel order server error:', data?.error);
        return null;
      }
    } catch (err) {
      console.log('Cancel order network error:', err);
      return null;
    }
  };

  const prepayOrder = async (orderId, paymentMethod, paymentStatus) => {
    try {
      const res = await apiFetch(`/orders/${orderId}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod, paymentStatus })
      });
      const data = await res.json();
      if (data && !data.error) {
        setOrders(prev => prev.map(o => o.id === orderId ? data : o));
        return data;
      } else {
        console.log('Prepay order server error:', data?.error);
        return null;
      }
    } catch (err) {
      console.log('Prepay order network error:', err);
      return null;
    }
  };

  const fetchFavourites = async () => {
    if (!currentUser) return;
    try {
      const res = await apiFetch(`/favourites/${currentUser.id}`);
      const data = await res.json();
      setFavourites(data.map(f => f.productId));
      setFavouriteProducts(data.map(f => f.product).filter(Boolean));
    } catch (err) {
      console.log('Fetch favourites error:', err);
    }
  };

  const fetchWallet = async () => {
    if (!currentUser) return;
    try {
      const res = await apiFetch(`/wallet/${currentUser.id}`);
      const data = await res.json();
      if (data && !data.error) {
        setWalletBalance(data.balance);
        setWalletTransactions(data.transactions);
      }
    } catch (err) {
      console.log('Fetch wallet error:', err);
    }
  };

  const addWalletMoney = async (amount) => {
    if (!currentUser) return null;
    try {
      const res = await apiFetch(`/wallet/add`, {
        method: 'POST',
        body: JSON.stringify({ userId: currentUser.id, amount })
      });
      const data = await res.json();
      if (data && data.success) {
        setWalletBalance(data.balance);
        fetchWallet(); // refresh transaction logs
        return data;
      }
      return { error: data.error || 'Failed to add money' };
    } catch (err) {
      console.log('Add wallet money error:', err);
      return { error: 'Network error' };
    }
  };

  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await apiFetch(`/notifications/${currentUser.id}`);
      const data = await res.json();
      setNotifications(data);
    } catch (err) {
      console.log('Fetch notifications error:', err);
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      const res = await apiFetch(`/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
      return data;
    } catch (err) {
      console.log('Mark read error:', err);
    }
  };

  const toggleFavourite = async (productId) => {
    if (!currentUser) return;
    try {
      const res = await apiFetch(`/favourites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, productId })
      });
      const result = await res.json();
      if (result.action === 'added') {
        setFavourites(prev => [...prev, productId]);
        fetchFavourites(); // Re-fetch to get complete product details
      } else {
        setFavourites(prev => prev.filter(id => id !== productId));
        setFavouriteProducts(prev => prev.filter(p => p.id !== productId));
      }
    } catch (err) {
      console.log('Toggle favourite error:', err);
    }
  };

  const fetchAdminOrders = async () => {
    try {
      const res = await apiFetch(`/admin/orders`);
      return await res.json();
    } catch (err) {
      console.log('Fetch admin orders error:', err);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const res = await apiFetch(`/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      return await res.json();
    } catch (err) {
      console.log('Update status error:', err);
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
    
    const isWorking = await testConnection(formattedUrl);
    if (isWorking) {
      await AsyncStorage.setItem('customApiUrl', formattedUrl);
      setApiUrl(formattedUrl);
      setIsServerConnected(true);
      
      await loadStoredUser(formattedUrl);
      fetchProducts();
      fetchCategories();
      fetchPaymentMethods();
      fetchBanners();
      fetchBestSellers();
      fetchTrendingProducts();
      
      return { success: true };
    } else {
      return { success: false, error: 'Could not connect to backend server at this address.' };
    }
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

    const connected = await testConnection(currentUrl);
    if (connected) {
      setIsServerConnected(true);
      await loadStoredUser(currentUrl);
      fetchProducts();
      fetchCategories();
      fetchPaymentMethods();
      fetchBanners();
      fetchBestSellers();
      fetchTrendingProducts();
    } else {
      setIsServerConnected(false);
      setIsAuthLoading(false);
    }
    setIsConnectionChecking(false);
  };

  useEffect(() => {
    initializeSystem();
  }, []);

  useEffect(() => {
    if (isLoggedIn && currentUser) {
      fetchOrders();
      fetchFavourites();
      fetchNotifications();
      fetchWallet();
      
      // Register for push notifications and update profile if token changed
      (async () => {
        const token = await registerForPushNotificationsAsync();
        if (token && currentUser.expoPushToken !== token) {
          console.log('[Push Token Sync] Saving token to database:', token);
          updateProfile({ expoPushToken: token });
        }
      })();
    }
  }, [isLoggedIn, currentUser]);

  const [recentlyViewed, setRecentlyViewed] = useState([]);

  const addToRecentlyViewed = (product) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(p => p.id !== product.id);
      return [product, ...filtered].slice(0, 5); // Keep last 5
    });
  };

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prevCart.filter(item => item.id !== product.id);
    });
  };

  const clearCart = () => setCart([]);

  const theme = {
    primary: '#00b894',
    background: '#ffffff',
    card: '#ffffff',
    text: '#2d3436',
    subText: '#636e72',
    border: '#f1f2f6',
    input: '#f8f9fa'
  };

  return (
    <AppContext.Provider value={{ 
      isLoggedIn, setIsLoggedIn, 
      isAuthLoading,
      apiUrl, setApiUrl,
      isServerConnected, setIsServerConnected,
      isConnectionChecking,
      testConnection, saveCustomApiUrl,
      userRole, setUserRole, 
      currentUser, setCurrentUser,
      currentAddress, setCurrentAddress,
      userAddresses, setUserAddresses,
      cart, setCart,
      addToCart, removeFromCart, clearCart,
      products, setProducts, fetchProducts,
      hasMoreProducts, isLoadingMoreProducts, productPage,
      categories, setCategories,
      orders, setOrders,
      favourites, setFavourites,
      favouriteProducts, setFavouriteProducts,
      walletBalance, setWalletBalance,
      walletTransactions, setWalletTransactions,
      notifications, setNotifications,
      paymentMethods, setPaymentMethods,
      banners, setBanners,
      recentlyViewed, setRecentlyViewed,
      addToRecentlyViewed,
      loginWithEmail, register, forgotPassword, resetPassword, logout, addAddress, updateAddress, deleteAddress, placeOrder, fetchOrders, cancelOrder, prepayOrder, fetchFavourites, fetchWallet, addWalletMoney,
      toggleFavourite, fetchAdminOrders, updateOrderStatus,
      fetchNotifications, markNotificationRead,
      addPaymentMethod, deletePaymentMethod,
      validatePromo, addReview,
      fetchAdminStats, seedProducts,
      updateProfile,
      bestSellers, fetchBestSellers,
      trendingProducts, fetchTrendingProducts,
      createRazorpayOrder, createRazorpayPaymentLink, checkRazorpayPaymentLink, verifyRazorpayPayment,
      resolveImageUrl,
      apiFetch,
      theme
    }}>
      {children}
    </AppContext.Provider>
  );
};
