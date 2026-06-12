require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'bhusawal-basket-super-secret-key';
const prisma = new PrismaClient();
const app = express();

const ALERTS_CONFIG_PATH = path.join(__dirname, 'alerts_config.json');

const getAlertsConfig = () => {
  try {
    if (fs.existsSync(ALERTS_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(ALERTS_CONFIG_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading alerts config:', err);
  }
  return { recipient: '+919876543210', lowThreshold: 10 };
};

const saveAlertsConfig = (config) => {
  try {
    fs.writeFileSync(ALERTS_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing alerts config:', err);
    return false;
  }
};

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_ID',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'YOUR_KEY_SECRET'
});

const formatAddress = (address) => {
  if (!address) return null;
  return {
    ...address,
    detail: address.detail || `${address.completeAddress || ''}, ${address.area || ''}, ${address.city || ''}`.replace(/(^[,\s]+)|([,\s]+$)/g, '')
  };
};

const formatUser = (user) => {
  if (!user) return null;
  const { password, ...userWithoutPassword } = user;
  if (userWithoutPassword.addresses) {
    userWithoutPassword.addresses = userWithoutPassword.addresses.map(formatAddress);
    const defaultAddress = userWithoutPassword.addresses.find(a => a.isDefault) || userWithoutPassword.addresses[0];
    if (defaultAddress) {
      userWithoutPassword.address = defaultAddress.completeAddress || '';
      userWithoutPassword.city = defaultAddress.city || '';
    } else {
      userWithoutPassword.address = '';
      userWithoutPassword.city = '';
    }
  }
  return userWithoutPassword;
};

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (ex) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'OWNER')) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Requires admin privileges.' });
  }
};

const sendPushNotification = async (userId, title, body) => {
  try {
    // 1. Create DB notification
    const notification = await prisma.notification.create({
      data: { userId, title, body }
    });
    console.log(`[Notification Created] DB ID: ${notification.id} for User: ${userId}`);

    // 2. Fetch User's Expo Push Token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { expoPushToken: true }
    });

    if (user && user.expoPushToken) {
      console.log(`[Sending Push Notification] Token: ${user.expoPushToken}`);
      const message = {
        to: user.expoPushToken,
        sound: 'default',
        title: title,
        body: body,
        data: { userId, notificationId: notification.id },
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
      const resData = await response.json();
      console.log('[Expo Push Response]', resData);
    }
  } catch (error) {
    console.error('Error in sendPushNotification:', error);
  }
};

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per `window` (here, per 15 minutes)
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Limit each IP to 20 requests per 15 minutes for auth endpoints
  message: { error: 'Too many authentication attempts, please try again later.' }
});

app.use(generalLimiter);

app.use((req, res, next) => {
  console.log(`[Backend LOG] ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});
app.use('/images', express.static('public/images'));

// --- WALLET ENGINE HELPERS ---
async function getOrCreateWallet(ownerId, ownerType, type) {
  let where = {};
  let createData = { type, balance: 0.0 };
  if (ownerType === 'user') {
    where = { userId: ownerId, type };
    createData.userId = ownerId;
  } else if (ownerType === 'partner') {
    where = { partnerId: ownerId, type };
    createData.partnerId = ownerId;
  } else if (ownerType === 'vendor') {
    where = { vendorId: ownerId, type };
    createData.vendorId = ownerId;
  }

  let wallet = await prisma.wallet.findFirst({ where });
  if (!wallet) {
    wallet = await prisma.wallet.create({ data: createData });
  }
  return wallet;
}

async function transactWallet(walletId, amount, type, description, referenceId = null) {
  return await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new Error('Wallet not found');

    let newBalance = wallet.balance;
    if (type === 'CREDIT') {
      newBalance += parseFloat(amount);
    } else if (type === 'DEBIT') {
      if (wallet.balance < parseFloat(amount)) {
        throw new Error('Insufficient wallet balance');
      }
      newBalance -= parseFloat(amount);
    }

    const updatedWallet = await tx.wallet.update({
      where: { id: walletId },
      data: { balance: newBalance }
    });

    await tx.walletTransaction.create({
      data: {
        walletId,
        amount: parseFloat(amount),
        type,
        description,
        referenceId,
        status: 'SUCCESS'
      }
    });

    // Sync cached balance to primary model
    if (wallet.userId) {
      const allUserWallets = await tx.wallet.findMany({ where: { userId: wallet.userId } });
      const totalBalance = allUserWallets.reduce((sum, w) => sum + (w.id === walletId ? newBalance : w.balance), 0);
      await tx.user.update({
        where: { id: wallet.userId },
        data: { walletBalance: totalBalance }
      });
    } else if (wallet.partnerId) {
      const allPartnerWallets = await tx.wallet.findMany({ where: { partnerId: wallet.partnerId } });
      const totalBalance = allPartnerWallets.reduce((sum, w) => sum + (w.id === walletId ? newBalance : w.balance), 0);
      await tx.deliveryPartner.update({
        where: { id: wallet.partnerId },
        data: { walletBalance: totalBalance }
      });
    }

    return updatedWallet;
  }, { timeout: 30000 });
}

// --- ORDER STATUS HISTORY LOG HELPER ---
async function logOrderStatusChange(orderId, status, notes = null, updatedBy = null) {
  try {
    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        status,
        notes,
        updatedBy
      }
    });
    console.log(`[Order Status History] Order ${orderId} status changed to ${status}`);
  } catch (err) {
    console.error('Failed to log order status change:', err);
  }
}

// --- AUDIT LOG HELPER ---
async function logAuditEvent(userId, actorRole, action, entityName, entityId, details = null, req = null) {
  try {
    let ipAddress = null;
    let deviceDetails = null;
    if (req) {
      ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
      deviceDetails = req.headers['user-agent'] || null;
    }
    await prisma.auditLog.create({
      data: {
        userId,
        actorRole,
        action,
        entityName,
        entityId,
        details: details ? JSON.stringify(details) : null,
        ipAddress,
        deviceDetails
      }
    });
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}


app.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all products with optional filters
app.get('/products', async (req, res) => {
  const { search, category, sort, page, limit } = req.query;
  try {
    let where = {};
    if (search) {
      where.name = { contains: search };
    }
    if (category) {
      where.category = { name: category };
    }

    let orderBy = {};
    if (sort === 'price_low') orderBy = { price: 'asc' }; // Sort by price directly for simplicity
    if (sort === 'name') orderBy = { name: 'asc' };

    const parsedPage = page ? parseInt(page) : 1;
    const parsedLimit = limit ? parseInt(limit) : 500; // Large default so non-paginated clients still work
    const skip = (parsedPage - 1) * parsedLimit;

    const products = await prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: parsedLimit,
      include: {
        variants: true,
        category: true,
        reviews: {
          include: { user: true }
        }
      }
    });

    res.json(formatProductList(products));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper for formatting product list
const formatProductList = (products) => {
  return products.map(p => {
    const defaultVariant = p.variants.length > 0 ? p.variants[0] : {};
    return {
      id: p.id,
      name: p.name,
      brand: p.brand || 'Unbranded',
      cat: p.cat || (p.category ? p.category.name : 'Uncategorized'),
      subTag: p.subTag || 'General',
      description: p.description,
      isTrending: p.isTrending,
      trendingPriority: p.trendingPriority,
      trendingExpiry: p.trendingExpiry,
      price: p.price || defaultVariant.price || 0,
      packSize: p.packSize || defaultVariant.packSize || '',
      stock: defaultVariant.stockQuantity || 0,
      img: p.img, 
      variants: p.variants.map(v => ({
         id: v.id,
         label: v.packSize,
         price: v.price,
         stock: v.stockQuantity
      })),
      reviews: p.reviews
    };
  });
};

// Get Trending Products
app.get('/products/trending', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isTrending: true,
        OR: [
          { trendingExpiry: null },
          { trendingExpiry: { gt: new Date() } }
        ]
      },
      orderBy: { trendingPriority: 'desc' },
      include: {
        variants: true,
        category: true,
        reviews: { include: { user: true } }
      }
    });
    res.json(formatProductList(products));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Best Sellers
app.get('/products/best-sellers', async (req, res) => {
  try {
    // Rank products by total quantity sold across all variants
    const bestSellingVariants = await prisma.orderItem.groupBy({
      by: ['productVariantId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 20 // Take enough variants to get 10 unique products
    });

    const variantIds = bestSellingVariants.map(v => v.productVariantId);
    
    // Fetch products for these variants
    const products = await prisma.product.findMany({
      where: {
        variants: {
          some: { id: { in: variantIds } }
        }
      },
      include: {
        variants: true,
        category: true,
        reviews: { include: { user: true } }
      }
    });

    // Re-sort by the sold quantity (since findMany won't preserve order from variantIds)
    const sortedProducts = products.sort((a, b) => {
      const aQty = a.variants.reduce((sum, v) => {
        const variantStat = bestSellingVariants.find(sv => sv.productVariantId === v.id);
        return sum + (variantStat?._sum.quantity || 0);
      }, 0);
      const bQty = b.variants.reduce((sum, v) => {
        const variantStat = bestSellingVariants.find(sv => sv.productVariantId === v.id);
        return sum + (variantStat?._sum.quantity || 0);
      }, 0);
      return bQty - aQty;
    }).slice(0, 10);

    res.json(formatProductList(sortedProducts));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Trending Status (Admin)
app.patch('/admin/products/:id/trending', verifyToken, isAdmin, async (req, res) => {
  const { isTrending, trendingPriority, trendingExpiry } = req.body;
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { 
        isTrending, 
        trendingPriority: trendingPriority || 0, 
        trendingExpiry: trendingExpiry ? new Date(trendingExpiry) : null 
      }
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- AUTH ROUTES ---

// Register
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { name, phone, email, password } = req.body;
  if (!name || !phone || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: normalizedEmail }, { phone }] }
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Email or Phone already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, phone, email: normalizedEmail, password: hashedPassword },
      include: { addresses: true }
    });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ user: formatUser(user), token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const normalizedEmail = email.toLowerCase().trim();
  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { addresses: true }
    });

    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(400).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ user: formatUser(user), token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Current User (Auto-login session recovery)
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { addresses: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: formatUser(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Forgot Password
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required' });
  }
  const normalizedEmail = email.toLowerCase().trim();
  try {
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return res.status(400).json({ error: 'This email is not registered with us.' });

    const resetToken = crypto.randomInt(100000, 999999).toString();
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { resetToken, resetTokenExpiry }
    });

    // In production, send via email. For dev, return it.
    res.json({ success: true, message: 'Reset token generated', devToken: resetToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset Password
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const normalizedEmail = email.toLowerCase().trim();
  try {
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || user.resetToken !== token || new Date() > user.resetTokenExpiry) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { password: hashedPassword, resetToken: null, resetTokenExpiry: null }
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Get User Addresses
app.get('/addresses/:userId', verifyToken, async (req, res) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.params.userId }
    });
    res.json(addresses.map(formatAddress));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Address
app.post('/addresses', verifyToken, async (req, res) => {
  const { userId, tag, city, area, completeAddress, mapsLink, receiverName, receiverPhone, isDefault } = req.body;
  try {
    const address = await prisma.address.create({
      data: { userId, tag, city, area, completeAddress, mapsLink, receiverName, receiverPhone, isDefault }
    });
    res.json(formatAddress(address));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Address
app.patch('/addresses/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { tag, city, area, completeAddress, mapsLink, receiverName, receiverPhone, isDefault } = req.body;
  try {
    const address = await prisma.address.update({
      where: { id },
      data: { tag, city, area, completeAddress, mapsLink, receiverName, receiverPhone, isDefault }
    });
    res.json(formatAddress(address));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Address
app.delete('/addresses/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const address = await prisma.address.findUnique({ where: { id } });
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }
    if (address.userId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    await prisma.address.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update User Profile
app.patch('/users/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address, city, photo, expoPushToken } = req.body;
  try {
    await prisma.user.update({
      where: { id },
      data: { name, email, phone, photo, expoPushToken }
    });

    if (address || city) {
      let userAddress = await prisma.address.findFirst({
        where: { userId: id, isDefault: true }
      });
      if (!userAddress) {
        userAddress = await prisma.address.findFirst({
          where: { userId: id }
        });
      }

      if (userAddress) {
        await prisma.address.update({
          where: { id: userAddress.id },
          data: {
            completeAddress: address || userAddress.completeAddress,
            city: city || userAddress.city,
            area: city || userAddress.area
          }
        });
      } else {
        await prisma.address.create({
          data: {
            userId: id,
            tag: 'Home (Profile)',
            completeAddress: address || '',
            city: city || '',
            area: city || 'Default',
            isDefault: true
          }
        });
      }
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id },
      include: { addresses: true }
    });

    res.json(formatUser(updatedUser));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Place Order
app.post('/orders', verifyToken, async (req, res) => {
  const { userId, addressId, itemTotal, deliveryFee, discountAmount, grandTotal, paymentMethod, items, paymentStatus, vendorId } = req.body;
  try {
    // If WALLET, check balance first (fail fast)
    if (paymentMethod === 'WALLET') {
      const wallets = await prisma.wallet.findMany({
        where: { userId, status: 'ACTIVE' }
      });
      const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
      if (totalBalance < grandTotal) {
        return res.status(400).json({ error: 'Insufficient wallet balance' });
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      // Decrement stock for each item
      for (const item of items) {
        const updatedVariant = await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stockQuantity: {
              decrement: item.quantity
            }
          },
          include: { product: true }
        });

        const config = getAlertsConfig();
        if (updatedVariant.stockQuantity <= config.lowThreshold) {
          console.log(`[INVENTORY ALERT 🚨] Product variant ${updatedVariant.product.name} (${updatedVariant.packSize}) stock fell to ${updatedVariant.stockQuantity} (Threshold: ${config.lowThreshold}). Sending alert to ${config.recipient}`);
          try {
            const adminUsers = await tx.user.findMany({
              where: { role: { in: ['ADMIN', 'OWNER'] } }
            });
            for (const admin of adminUsers) {
              await tx.notification.create({
                data: {
                  userId: admin.id,
                  title: 'Low Stock Alert 🚨',
                  body: `${updatedVariant.product.name} (${updatedVariant.packSize}) stock is ${updatedVariant.stockQuantity} (Limit: ${config.lowThreshold})`
                }
              });
            }
          } catch (notifErr) {
            console.error('Error creating admin notification:', notifErr);
          }
        }
      }

      // Create the order and its items
      const createdOrder = await tx.order.create({
        data: {
          userId,
          addressId,
          promoId: req.body.promoId || null,
          vendorId: vendorId || null,
          itemTotal,
          deliveryFee,
          discountAmount,
          grandTotal,
          paymentMethod,
          paymentStatus: paymentStatus || (paymentMethod === 'COD' ? 'SUCCESS' : paymentMethod === 'WALLET' ? 'SUCCESS' : 'PENDING'),
          status: 'Pending', // Initial status
          orderItems: {
            create: items.map(item => ({
              productVariantId: item.variantId,
              quantity: item.quantity,
              priceAtTime: item.price
            }))
          }
        },
        include: { orderItems: true }
      });

      // Wallet deduction logic inside transaction
      if (paymentMethod === 'WALLET') {
        let remainingToDeduct = grandTotal;
        const wallets = await tx.wallet.findMany({
          where: { userId, status: 'ACTIVE' }
        });
        
        const priority = { 'PROMOTIONAL': 1, 'CASHBACK': 2, 'REFUND': 3, 'CUSTOMER': 4 };
        wallets.sort((a, b) => (priority[a.type] || 99) - (priority[b.type] || 99));

        for (const wallet of wallets) {
          if (remainingToDeduct <= 0) break;
          if (wallet.balance <= 0) continue;

          const deductAmount = Math.min(wallet.balance, remainingToDeduct);
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { decrement: deductAmount } }
          });

          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              amount: deductAmount,
              type: 'DEBIT',
              description: `Paid for Order #${createdOrder.id.slice(-6)}`,
              status: 'SUCCESS'
            }
          });

          remainingToDeduct -= deductAmount;
        }

        // Sync user's cached walletBalance
        const finalWallets = await tx.wallet.findMany({ where: { userId } });
        const finalBalance = finalWallets.reduce((sum, w) => sum + w.balance, 0);
        await tx.user.update({
          where: { id: userId },
          data: { walletBalance: finalBalance }
        });
      }

      // Create initial status log
      await tx.orderStatusHistory.create({
        data: {
          orderId: createdOrder.id,
          status: 'Pending',
          notes: 'Order placed by customer',
          updatedBy: userId
        }
      });

      // Move automatically to Preparing
      await tx.order.update({
        where: { id: createdOrder.id },
        data: { status: 'Preparing' }
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: createdOrder.id,
          status: 'Preparing',
          notes: 'Order preparation started',
          updatedBy: 'SYSTEM'
        }
      });

      return createdOrder;
    }, { timeout: 30000 });

    res.json(order);

    // Auto-assign order to the first online and approved delivery partner
    try {
      const activePartner = await prisma.deliveryPartner.findFirst({
        where: { isOnline: true, verificationStatus: 'Approved' }
      });
      if (activePartner) {
        await prisma.deliveryAssignment.create({
          data: {
            orderId: order.id,
            partnerId: activePartner.id,
            status: 'Assigned'
          }
        });
        console.log(`[Auto Assignment] Assigned order ${order.id} to rider ${activePartner.name}`);
        // Log assignment status history
        await logOrderStatusChange(order.id, 'Preparing', `Assigned to rider: ${activePartner.name}`, 'SYSTEM');
      } else {
        console.log(`[Auto Assignment] No online approved rider available for order ${order.id}`);
      }
    } catch (assignError) {
      console.error('Error auto assigning order:', assignError);
    }

    // Trigger user notification asynchronously
    sendPushNotification(
      userId,
      'Order Placed Successfully! 🎉',
      `Your order of ₹${grandTotal} has been placed. We are preparing it now!`
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get User Orders
app.get('/orders/:userId', verifyToken, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.params.userId },
      include: { 
        address: true,
        orderItems: {
          include: {
            productVariant: {
              include: { product: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel Order (User)
app.patch('/orders/:id/cancel', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.userId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (order.status !== 'Preparing' && order.status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending or preparing orders can be cancelled.' });
    }

    let updateData = { status: 'Cancelled' };
    let isRefunded = false;

    // Refund if payment was already successful (online or wallet paid)
    if (order.paymentStatus === 'SUCCESS') {
      const refundWallet = await getOrCreateWallet(order.userId, 'user', 'REFUND');
      await transactWallet(refundWallet.id, order.grandTotal, 'CREDIT', `Refund for cancelled order #${order.id.slice(-6)}`, order.id);
      updateData.paymentStatus = 'REFUNDED';
      updateData.status = 'Refunded';
      isRefunded = true;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        address: true,
        orderItems: {
          include: {
            productVariant: {
              include: { product: true }
            }
          }
        }
      }
    });

    await logOrderStatusChange(id, updatedOrder.status, isRefunded ? `Cancelled. Amount ₹${order.grandTotal} refunded to wallet` : 'Cancelled by customer', req.user.id);
    res.json(updatedOrder);
    
    // Asynchronously send push notification
    sendPushNotification(
      order.userId,
      isRefunded ? 'Order Refunded 💰' : 'Order Cancelled 🚫',
      isRefunded ? `Your order #${order.id.slice(-6)} was refunded to your wallet.` : `Your order #${order.id.slice(-6)} has been cancelled successfully.`
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Order Payment Details (Pre-pay)
app.patch('/orders/:id/payment', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { paymentStatus, paymentMethod } = req.body;
  try {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.userId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        paymentStatus: paymentStatus || order.paymentStatus,
        paymentMethod: paymentMethod || order.paymentMethod
      },
      include: {
        address: true,
        orderItems: {
          include: {
            productVariant: {
              include: { product: true }
            }
          }
        }
      }
    });
    res.json(updatedOrder);
    
    // Asynchronously send push notification
    sendPushNotification(
      order.userId,
      'Pre-payment Successful! 💳',
      `Payment of ₹${order.grandTotal} for order #${order.id.slice(-6)} is confirmed.`
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Order Tracking details for User
app.get('/api/orders/:id/tracking', verifyToken, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        deliveryAssignment: {
          include: {
            partner: {
              select: {
                id: true,
                name: true,
                phone: true,
                avatar: true,
                rating: true,
                latitude: true,
                longitude: true,
                isOnline: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify ownership
    if (order.userId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json({
      orderId: order.id,
      status: order.status,
      assignment: order.deliveryAssignment
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- ADMIN ROUTES ---

function getSafeExtension(base64) {
  if (typeof base64 !== 'string') return '.jpg';
  const prefix = base64.slice(0, 16);
  if (prefix.startsWith('/9j/')) return '.jpg';
  if (prefix.startsWith('iVBORw0KGg')) return '.png';
  if (prefix.startsWith('R0lGOD')) return '.gif';
  if (prefix.startsWith('UklGR')) return '.webp';
  return '.jpg';
}

function saveUploadedImage(filename, base64Data) {
  const basePath = path.normalize(path.join(__dirname, 'public', 'images'));
  
  // Guard: Ensure filename does not contain any directory path components
  if (path.basename(filename) !== filename) {
    throw new Error('Invalid filename structure');
  }

  // Ensure directory exists
  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
  }

  const fullPath = path.normalize(path.join(basePath, filename));

  // Guard: Verify path traversal prevention
  if (!fullPath.startsWith(basePath)) {
    throw new Error('Path traversal detected');
  }

  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(fullPath, buffer);
}

// Upload image (base64)
app.post('/admin/upload', verifyToken, isAdmin, async (req, res) => {
  let { base64 } = req.body;
  if (!base64) {
    return res.status(400).json({ error: 'No image data provided' });
  }

  try {
    if (base64.includes(';base64,')) {
      base64 = base64.split(';base64,')[1];
    }
    const ext = getSafeExtension(base64);
    const randomName = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const newFilename = `img_${randomName}${ext}`;
    
    saveUploadedImage(newFilename, base64);
    
    // Return absolute URL
    const url = `${req.protocol}://${req.get('host')}/images/${newFilename}`;
    res.json({ url });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/admin/variants/:id', verifyToken, isAdmin, async (req, res) => {
  const { price, stockQuantity } = req.body;
  try {
    const variant = await prisma.productVariant.update({
      where: { id: req.params.id },
      data: {
        price: price !== undefined ? parseFloat(price) : undefined,
        stockQuantity: stockQuantity !== undefined ? parseInt(stockQuantity) : undefined,
      },
    });
    res.json(variant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Orders (for Admin)
app.get('/admin/orders', verifyToken, isAdmin, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { 
        user: true,
        address: true,
        orderItems: {
          include: {
            productVariant: {
              include: { product: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Order Status (for Admin)
app.patch('/admin/orders/:id', verifyToken, isAdmin, async (req, res) => {
  const { status } = req.body;
  try {
    const existingOrder = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existingOrder) return res.status(404).json({ error: 'Order not found' });

    let updateData = { status };
    let isRefunded = false;

    // If order is Cancelled, Refunded, or Failed, and payment was successful, auto refund
    if ((status === 'Cancelled' || status === 'Refunded' || status === 'Failed') && existingOrder.paymentStatus === 'SUCCESS') {
      updateData.paymentStatus = 'REFUNDED';
      updateData.status = 'Refunded';
      
      const refundWallet = await getOrCreateWallet(existingOrder.userId, 'user', 'REFUND');
      await transactWallet(refundWallet.id, existingOrder.grandTotal, 'CREDIT', `Refund for order #${existingOrder.id.slice(-6)} - cancelled/refunded by admin`, req.user.id);
      isRefunded = true;
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: updateData
    });

    await logOrderStatusChange(order.id, order.status, isRefunded ? `Cancelled by admin. Amount ₹${existingOrder.grandTotal} refunded to wallet` : 'Status updated by Admin', req.user.id);

    res.json(order);

    // Trigger user notification asynchronously
    sendPushNotification(
      order.userId,
      isRefunded ? 'Order Refunded 💰' : 'Order Status Updated 📦',
      isRefunded ? `Your order #${order.id.slice(-6)} has been refunded by admin.` : `Your order #${order.id.slice(-6)} status is now: ${order.status}.`
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- FAVOURITES ROUTES ---

// Get Favourites
app.get('/favourites/:userId', verifyToken, async (req, res) => {
  try {
    const favourites = await prisma.favourite.findMany({
      where: { userId: req.params.userId },
      include: {
        product: {
          include: {
            variants: true,
            category: true,
            reviews: {
              include: { user: true }
            }
          }
        }
      }
    });
    const formatted = favourites.map(f => ({
      id: f.id,
      userId: f.userId,
      productId: f.productId,
      product: f.product ? formatProductList([f.product])[0] : null
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle Favourite
app.post('/favourites', verifyToken, async (req, res) => {
  const { userId, productId } = req.body;
  try {
    const existing = await prisma.favourite.findUnique({
      where: { userId_productId: { userId, productId } }
    });

    if (existing) {
      await prisma.favourite.delete({ where: { id: existing.id } });
      res.json({ action: 'removed' });
    } else {
      await prisma.favourite.create({ data: { userId, productId } });
      res.json({ action: 'added' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- WALLET ROUTES ---

// Get Wallet Balance & Transactions
app.get('/wallet/:userId', verifyToken, async (req, res) => {
  const { userId } = req.params;
  try {
    const wallets = await prisma.wallet.findMany({
      where: { userId }
    });
    const balance = wallets.reduce((sum, w) => sum + w.balance, 0);

    const transactions = await prisma.walletTransaction.findMany({
      where: {
        walletId: { in: wallets.map(w => w.id) }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ balance, transactions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Money to Wallet
app.post('/wallet/add', verifyToken, async (req, res) => {
  const { userId, amount } = req.body;
  try {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const wallet = await getOrCreateWallet(userId, 'user', 'TOPUP');
    await transactWallet(wallet.id, parsedAmount, 'CREDIT', 'Added money to wallet');

    const wallets = await prisma.wallet.findMany({
      where: { userId }
    });
    const balance = wallets.reduce((sum, w) => sum + w.balance, 0);

    res.json({ success: true, balance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- NOTIFICATIONS ROUTES ---

// Get User Notifications
app.get('/notifications/:userId', verifyToken, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark Notification as Read
app.patch('/notifications/:id', verifyToken, async (req, res) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- PAYMENT METHODS ROUTES ---

// Get Active Payment Methods
app.get('/payment-methods', async (req, res) => {
  try {
    const methods = await prisma.paymentMethod.findMany({
      where: { isActive: true }
    });
    res.json(methods);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Payment Method
app.post('/payment-methods', verifyToken, isAdmin, async (req, res) => {
  const { type, name, detail, icon } = req.body;
  try {
    const method = await prisma.paymentMethod.create({
      data: { type, name, detail, icon }
    });
    res.json(method);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Payment Method (Soft Delete or Hard Delete, here Hard for simplicity)
app.delete('/payment-methods/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    await prisma.paymentMethod.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- PROMO CODE ROUTES ---

// Validate Promo Code
app.post('/promo/validate', async (req, res) => {
  const { code, orderValue } = req.body;
  try {
    const promo = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!promo || !promo.isActive) {
      return res.status(404).json({ error: 'Invalid or expired promo code.' });
    }

    if (orderValue < promo.minOrderValue) {
      return res.status(400).json({ error: `Minimum order value for this code is ₹${promo.minOrderValue}` });
    }

    res.json(promo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- REVIEWS ROUTES ---

// Add Review
app.post('/reviews', verifyToken, async (req, res) => {
  const { userId, productId, rating, comment } = req.body;
  try {
    const review = await prisma.review.create({
      data: { userId, productId, rating: parseInt(rating), comment }
    });
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- CATEGORY MANAGEMENT (Admin) ---

app.post('/admin/categories', verifyToken, isAdmin, async (req, res) => {
  const { name } = req.body;
  try {
    const category = await prisma.category.create({ data: { name } });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/admin/categories/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- PRODUCT MANAGEMENT (Admin) ---

app.post('/admin/products', verifyToken, isAdmin, async (req, res) => {
  const { name, description, categoryId, brand, img, variants, isActive } = req.body;
  try {
    const product = await prisma.product.create({
      data: {
        name,
        description,
        categoryId,
        brand,
        img,
        isActive,
        variants: {
          create: variants.map(v => ({
            packSize: v.label,
            price: v.price,
            stockQuantity: v.stock || 100
          }))
        }
      },
      include: { variants: true }
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Quick update product variant stock/price (for Admin)
app.patch('/admin/variants/:id', verifyToken, isAdmin, async (req, res) => {
  const { price, stockQuantity } = req.body;
  try {
    const updated = await prisma.productVariant.update({
      where: { id: req.params.id },
      data: {
        price: price !== undefined ? parseFloat(price) : undefined,
        stockQuantity: stockQuantity !== undefined ? parseInt(stockQuantity) : undefined
      },
      include: { product: true }
    });

    const config = getAlertsConfig();
    if (updated.stockQuantity <= config.lowThreshold) {
      console.log(`[INVENTORY ALERT 🚨] Product variant ${updated.product.name} (${updated.packSize}) stock updated manually to ${updated.stockQuantity} (Threshold: ${config.lowThreshold}). Sending alert to ${config.recipient}`);
      try {
        const adminUsers = await prisma.user.findMany({
          where: { role: { in: ['ADMIN', 'OWNER'] } }
        });
        for (const admin of adminUsers) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              title: 'Low Stock Alert 🚨',
              body: `${updated.product.name} (${updated.packSize}) stock updated manually to ${updated.stockQuantity} (Limit: ${config.lowThreshold})`
            }
          });
        }
      } catch (notifErr) {
        console.error('Error creating admin notification:', notifErr);
      }
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- BANNER ROUTES ---

// Get Active Banners
app.get('/banners', async (req, res) => {
  try {
    const banners = await prisma.banner.findMany({
      where: { isActive: true }
    });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ADMIN ROUTES ---

// --- ADMIN ANALYTICS ROUTES ---

// Get Advanced Dashboard Stats
app.get('/admin/stats', verifyToken, isAdmin, async (req, res) => {
  try {
    const totalUsers = await prisma.user.count({ where: { role: 'USER' } });
    const totalOrders = await prisma.order.count();
    const activeProducts = await prisma.product.count({ where: { isActive: true } });
    
    const orders = await prisma.order.findMany({
      select: { itemTotal: true, deliveryFee: true, grandTotal: true, createdAt: true, status: true }
    });
    
    const totalRevenue = orders.reduce((acc, order) => acc + order.grandTotal, 0);
    
    // Calculate Today's Stats
    const today = new Date();
    today.setHours(0,0,0,0);
    const todaysOrders = orders.filter(o => o.createdAt >= today);
    const todaysRevenue = todaysOrders.reduce((acc, order) => acc + order.grandTotal, 0);

    // Calculate Month's Stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);
    const monthlyOrders = orders.filter(o => o.createdAt >= startOfMonth);
    const monthlyRevenue = monthlyOrders.reduce((acc, order) => acc + order.grandTotal, 0);

    // Platform Fees & Delivery Charges
    const platformFees = orders.reduce((acc, order) => acc + (order.itemTotal * 0.0075), 0);
    const deliveryCharges = orders.reduce((acc, order) => acc + order.deliveryFee, 0);

    // Vendor count (categories)
    const activeVendors = await prisma.category.count();

    // Rider statistics
    const onlineRidersCount = await prisma.deliveryPartner.count({ where: { isOnline: true } });
    
    // Busy riders (assigned to orders in progress)
    const busyRidersCount = await prisma.deliveryAssignment.count({
      where: {
        status: { in: ['Assigned', 'Accepted', 'PickedUp'] },
        partner: { isOnline: true }
      }
    });

    const availableRidersCount = Math.max(0, onlineRidersCount - busyRidersCount);
    
    // Capacity Score
    let capacityScore = 100;
    if (onlineRidersCount > 0) {
      capacityScore = Math.round((availableRidersCount / onlineRidersCount) * 100);
    }

    // Low stock count
    const config = getAlertsConfig();
    const lowStockCount = await prisma.productVariant.count({
      where: { stockQuantity: { lt: config.lowThreshold } }
    });

    // Settlements & refunds
    const pendingRefunds = orders.filter(o => o.status === 'Cancelled').length;
    const pendingSettlements = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').reduce((acc, order) => acc + order.grandTotal, 0);

    res.json({
      totalUsers,
      totalOrders,
      activeProducts,
      totalRevenue: totalRevenue.toFixed(2),
      todaysRevenue: todaysRevenue.toFixed(2),
      todaysOrders: todaysOrders.length,
      monthlyRevenue: monthlyRevenue.toFixed(2),
      platformFees,
      deliveryCharges,
      activeVendors,
      onlineRidersCount,
      busyRidersCount,
      availableRidersCount,
      capacityScore,
      avgEta: '12 mins',
      lowStockCount,
      pendingRefunds,
      pendingSettlements: '₹' + pendingSettlements.toFixed(2),
      growth: "+14.2%",
      activeArea: 'Bhusawal Taluka'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Revenue Trend (Last 7 Days)
app.get('/admin/analytics/revenue', verifyToken, isAdmin, async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { grandTotal: true, createdAt: true }
    });

    // Group by date
    const trend = new Map();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trend.set(dateStr, 0);
    }

    orders.forEach(o => {
      const dateStr = o.createdAt.toISOString().split('T')[0];
      if (trend.has(dateStr)) {
        trend.set(dateStr, trend.get(dateStr) + o.grandTotal);
      }
    });

    const result = Array.from(trend.keys()).sort().map(date => ({
      date: date.split('-').slice(1).join('/'), // MM/DD
      revenue: trend.get(date)
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Sales Distribution by Category
app.get('/admin/analytics/distribution', verifyToken, isAdmin, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        products: {
          include: {
            variants: {
              include: { orderItems: true }
            }
          }
        }
      }
    });

    const distribution = categories.map(cat => {
      let totalSales = 0;
      cat.products.forEach(p => {
        p.variants.forEach(v => {
          v.orderItems.forEach(oi => {
            totalSales += oi.priceAtTime * oi.quantity;
          });
        });
      });
      return { name: cat.name, value: totalSales };
    });

    res.json(distribution.filter(d => d.value > 0));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Inventory Alerts (Low Stock)
app.get('/admin/inventory/alerts', verifyToken, isAdmin, async (req, res) => {
  try {
    const lowStockVariants = await prisma.productVariant.findMany({
      where: { stockQuantity: { lt: 10 } },
      include: { product: true }
    });

    res.json(lowStockVariants.map(v => ({
      productId: v.productId,
      variantId: v.id,
      name: v.product.name,
      packSize: v.packSize,
      stock: v.stockQuantity
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Seed 50 Products (Reduced from 500 for faster dev response)
app.post('/admin/seed', verifyToken, isAdmin, async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    if (categories.length === 0) {
      return res.status(400).json({ error: 'Please seed categories first.' });
    }

    const productImages = [
      'https://images.unsplash.com/photo-1610832958506-aa56368176cf', // Fruits
      'https://images.unsplash.com/photo-1542838132-92c53300491e', // Grocery
      'https://images.unsplash.com/photo-1550989460-0adf9ea622e2', // Milk
      'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8', // Beverages
      'https://images.unsplash.com/photo-1518843875459-f738682238a6', // Veggies
      'https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9', // Bread
      'https://images.unsplash.com/photo-1615485240384-552d4c3f93d4', // Personal Care
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a'  // Cleaning
    ];

    for (let i = 0; i < 50; i++) {
      const cat = categories.at(Math.floor(Math.random() * categories.length));
      const imgUrl = `${productImages.at(i % productImages.length)}?q=80&w=400&auto=format&fit=crop`;
      
      await prisma.product.create({
        data: {
          name: `${cat.name} Item ${i + 1}`,
          description: `Fresh and high quality ${cat.name.toLowerCase()} for your daily needs.`,
          price: Math.floor(Math.random() * 500) + 10,
          packSize: ['500g', '1kg', '500ml', '1L', '1 pc'].at(Math.floor(Math.random() * 5)),
          img: imgUrl,
          cat: cat.name,
          subTag: cat.name === 'Fruits & Vegetables' ? 'Vegetables' : 'General',
          brand: ['Local', 'Fresh', 'Premium', 'Organic'].at(Math.floor(Math.random() * 4)),
          variants: {
            create: [
              { label: 'Small Pack', price: 50 },
              { label: 'Large Pack', price: 150 }
            ]
          }
        }
      });
    }

    res.json({ success: true, count: 50 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// A simple port listener
const PORT = process.env.PORT || 5000;
// Razorpay Endpoints
app.post('/payments/create-order', async (req, res) => {
  const { amount, currency = 'INR', receipt } = req.body;
  try {
    const options = {
      amount: amount * 100, // amount in smallest currency unit
      currency,
      receipt,
    };
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/payments/create-payment-link', async (req, res) => {
  const { amount, currency = 'INR', receipt, name, email, contact } = req.body;
  try {
    const options = {
      amount: amount * 100,
      currency,
      reference_id: receipt,
      description: 'Bhusawal Basket Order',
      customer: {
        name: name || 'Customer',
        email: email || 'customer@example.com',
        contact: contact || ''
      },
      notify: {
        sms: true,
        email: true
      },
      reminder_enable: true
    };
    const paymentLink = await razorpay.paymentLink.create(options);
    res.json(paymentLink);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/payments/check-payment-link', async (req, res) => {
  const { paymentLinkId } = req.body;
  try {
    const paymentLink = await razorpay.paymentLink.fetch(paymentLinkId);
    res.json(paymentLink);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/payments/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  
  // Allow simulated payment verification in development mode / Expo Go fallbacks
  if (razorpay_signature === 'mock_signature') {
    return res.json({ status: 'ok' });
  }

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  
  const expectedSignature = crypto
    .createHmac('sha256', razorpay.key_secret)
    .update(body.toString())
    .digest('hex');

  if (expectedSignature === razorpay_signature) {
    res.json({ status: 'ok' });
  } else {
    res.status(400).json({ status: 'failed' });
  }
});

// ==========================================
// --- DELIVERY PARTNER ECOSYSTEM ROUTES ---
// ==========================================

// Upload document for delivery partner (base64)
app.post('/api/delivery/upload', verifyToken, async (req, res) => {
  let { base64 } = req.body;
  if (!base64) {
    return res.status(400).json({ error: 'No image data provided' });
  }

  try {
    if (base64.includes(';base64,')) {
      base64 = base64.split(';base64,')[1];
    }
    const ext = getSafeExtension(base64);
    const randomName = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const finalFilename = `doc_${randomName}${ext}`;
    
    saveUploadedImage(finalFilename, base64);
    
    const url = `${req.protocol}://${req.get('host')}/images/${finalFilename}`;
    res.json({ url });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delivery Partner Registration
app.post('/api/delivery/register', authLimiter, async (req, res) => {
  const { name, phone, email, password } = req.body;
  if (!name || !phone || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const existingPartner = await prisma.deliveryPartner.findFirst({
      where: { OR: [{ email: normalizedEmail }, { phone }] }
    });
    if (existingPartner) {
      return res.status(400).json({ error: 'Email or Phone already registered as delivery partner' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const partner = await prisma.deliveryPartner.create({
      data: { name, phone, email: normalizedEmail, password: hashedPassword, verificationStatus: 'Draft' }
    });

    const token = jwt.sign({ id: partner.id, role: 'DELIVERY' }, JWT_SECRET, { expiresIn: '30d' });
    const { password: _, ...partnerWithoutPassword } = partner;
    res.json({ partner: partnerWithoutPassword, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delivery Partner Login
app.post('/api/delivery/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const normalizedEmail = email.toLowerCase().trim();
  try {
    const partner = await prisma.deliveryPartner.findUnique({
      where: { email: normalizedEmail }
    });

    if (!partner) return res.status(400).json({ error: 'Invalid email or password' });

    const isValid = await bcrypt.compare(password, partner.password);
    if (!isValid) return res.status(400).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: partner.id, role: 'DELIVERY' }, JWT_SECRET, { expiresIn: '30d' });
    const { password: _, ...partnerWithoutPassword } = partner;
    res.json({ partner: partnerWithoutPassword, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Step-by-Step Onboarding Updates
app.patch('/api/delivery/onboard', verifyToken, async (req, res) => {
  try {
    const updates = req.body;
    const allowedFields = [
      'dob', 'gender', 'address', 'avatar',
      'aadhaarUrl', 'panUrl', 'selfieUrl',
      'vehicleType', 'vehicleNumber', 'rcUrl', 'dlUrl',
      'accountNumber', 'ifsc', 'upiId',
      'emergencyName', 'emergencyPhone'
    ];

    const data = {};
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        data[field] = updates[field];
      }
    });

    const currentPartner = await prisma.deliveryPartner.findUnique({
      where: { id: req.user.id }
    });

    if (!currentPartner) {
      return res.status(404).json({ error: 'Delivery partner not found' });
    }

    const merged = { ...currentPartner, ...data };
    
    const isCompleted = merged.dob && merged.gender && merged.address && 
                        merged.vehicleType &&
                        merged.accountNumber && merged.ifsc &&
                        merged.emergencyName && merged.emergencyPhone &&
                        merged.selfieUrl &&
                        merged.aadhaarUrl && merged.panUrl &&
                        (merged.vehicleType === 'Cycle' || (merged.dlUrl && merged.rcUrl && merged.vehicleNumber));

    if (isCompleted && currentPartner.verificationStatus === 'Draft') {
      data.verificationStatus = 'Submitted';
    }

    const updatedPartner = await prisma.deliveryPartner.update({
      where: { id: req.user.id },
      data
    });

    const { password: _, ...partnerWithoutPassword } = updatedPartner;
    res.json(partnerWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch Delivery Partner Profile
app.get('/api/delivery/profile', verifyToken, async (req, res) => {
  try {
    const partner = await prisma.deliveryPartner.findUnique({
      where: { id: req.user.id }
    });
    if (!partner) return res.status(404).json({ error: 'Delivery partner not found' });
    const { password: _, ...partnerWithoutPassword } = partner;
    res.json(partnerWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Assigned/Available Orders for Rider
app.get('/api/delivery/orders/available', verifyToken, async (req, res) => {
  try {
    const assignments = await prisma.deliveryAssignment.findMany({
      where: {
        partnerId: req.user.id,
        status: { in: ['Assigned', 'Accepted', 'PickedUp'] }
      },
      include: {
        order: {
          include: {
            user: true,
            address: true,
            orderItems: {
              include: {
                productVariant: {
                  include: { product: true }
                }
              }
            }
          }
        }
      }
    });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Assignment Status (Rider Action)
app.patch('/api/delivery/orders/:id/status', verifyToken, async (req, res) => {
  const { id } = req.params; // orderId or assignmentId
  const { status } = req.body; // 'Accepted', 'PickedUp', 'Delivered', 'Cancelled'
  
  if (!['Accepted', 'PickedUp', 'Delivered', 'Cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid assignment status' });
  }

  try {
    let assignment = await prisma.deliveryAssignment.findFirst({
      where: { OR: [{ id }, { orderId: id }] }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Delivery assignment not found' });
    }

    if (assignment.partnerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. Assignment belongs to another rider.' });
    }

    const updateData = { status };
    if (status === 'Accepted') updateData.acceptedAt = new Date();
    if (status === 'PickedUp') updateData.pickedUpAt = new Date();
    if (status === 'Delivered') updateData.deliveredAt = new Date();
    if (status === 'Cancelled') updateData.cancelledAt = new Date();

    const updatedAssignment = await prisma.deliveryAssignment.update({
      where: { id: assignment.id },
      data: updateData
    });

    let orderStatus = 'Preparing';
    if (status === 'Accepted') orderStatus = 'Accepted';
    if (status === 'PickedUp') orderStatus = 'Picked Up';
    if (status === 'Delivered') orderStatus = 'Delivered';
    if (status === 'Cancelled') orderStatus = 'Cancelled';

    const orderUpdate = { status: orderStatus };
    if (status === 'Delivered') {
      const order = await prisma.order.findUnique({ where: { id: assignment.orderId } });
      if (order && order.paymentMethod === 'COD') {
        orderUpdate.paymentStatus = 'SUCCESS';
      }

      const deliveryFee = 50.0;
      const riderWallet = await getOrCreateWallet(req.user.id, 'partner', 'RIDER');
      await transactWallet(riderWallet.id, deliveryFee, 'CREDIT', `Delivery Fee for Order #${assignment.orderId.slice(-6)}`, assignment.orderId);

      await prisma.deliveryPartner.update({
        where: { id: req.user.id },
        data: {
          earnings: { increment: deliveryFee },
          deliveriesCount: { increment: 1 }
        }
      });

      await prisma.earningLog.create({
        data: {
          partnerId: req.user.id,
          orderId: assignment.orderId,
          amount: deliveryFee,
          type: 'DeliveryFee'
        }
      });
    }

    await prisma.order.update({
      where: { id: assignment.orderId },
      data: orderUpdate
    });

    await logOrderStatusChange(assignment.orderId, orderStatus, `Updated by Delivery Rider (assignment status: ${status})`, req.user.id);

    const rider = await prisma.deliveryPartner.findUnique({
      where: { id: req.user.id }
    });
    
    let notifyTitle = 'Order Update';
    let notifyBody = `Your order status is now: ${orderStatus}`;
    if (status === 'Accepted') {
      notifyTitle = 'Order Accepted 🚴';
      notifyBody = `${rider.name} has accepted your order and is heading to the store.`;
    } else if (status === 'PickedUp') {
      notifyTitle = 'Order Out for Delivery ⚡';
      notifyBody = `${rider.name} has picked up your order and is on the way!`;
    } else if (status === 'Delivered') {
      notifyTitle = 'Order Delivered! 🎉';
      notifyBody = `Your order has been delivered by ${rider.name}. Enjoy!`;
    }

    const order = await prisma.order.findUnique({ where: { id: assignment.orderId } });
    if (order) {
      sendPushNotification(order.userId, notifyTitle, notifyBody);
    }

    res.json(updatedAssignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Live Location Telemetry Pings
app.post('/api/delivery/location', verifyToken, async (req, res) => {
  const { latitude, longitude, isOnline } = req.body;
  try {
    const data = {};
    if (latitude !== undefined) data.latitude = parseFloat(latitude);
    if (longitude !== undefined) data.longitude = parseFloat(longitude);
    if (isOnline !== undefined) data.isOnline = !!isOnline;

    const partner = await prisma.deliveryPartner.update({
      where: { id: req.user.id },
      data
    });

    res.json({ success: true, isOnline: partner.isOnline });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Earnings Logs
app.get('/api/delivery/earnings', verifyToken, async (req, res) => {
  try {
    const partner = await prisma.deliveryPartner.findUnique({
      where: { id: req.user.id },
      select: { walletBalance: true, earnings: true, incentives: true, deliveriesCount: true }
    });
    
    const logs = await prisma.earningLog.findMany({
      where: { partnerId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      summary: partner,
      logs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ADMIN DELIVERY ECOSYSTEM ENDPOINTS ---

// KYC review queue
app.get('/api/admin/riders/kyc-queue', verifyToken, isAdmin, async (req, res) => {
  try {
    const riders = await prisma.deliveryPartner.findMany({
      where: { verificationStatus: { in: ['Submitted', 'Under_Review', 'Reupload_Required'] } },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(riders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin verify decision
app.patch('/api/admin/riders/:id/verify', verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { verificationStatus, reuploadRemarks } = req.body;
  if (!['Approved', 'Rejected', 'Reupload_Required', 'Under_Review'].includes(verificationStatus)) {
    return res.status(400).json({ error: 'Invalid verification status' });
  }

  try {
    const rider = await prisma.deliveryPartner.update({
      where: { id },
      data: { verificationStatus, reuploadRemarks }
    });
    res.json(rider);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete active driver roster
app.get('/api/admin/riders', verifyToken, isAdmin, async (req, res) => {
  try {
    const riders = await prisma.deliveryPartner.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        assignments: {
          take: 5,
          orderBy: { assignedAt: 'desc' }
        }
      }
    });
    res.json(riders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Suspend/unsuspend rider
app.patch('/api/admin/riders/:id/suspend', verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { suspended } = req.body;
  try {
    const rider = await prisma.deliveryPartner.update({
      where: { id },
      data: { verificationStatus: suspended ? 'Suspended' : 'Approved' }
    });
    res.json(rider);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Alert Settings API
app.get('/api/admin/alert-settings', verifyToken, isAdmin, (req, res) => {
  res.json(getAlertsConfig());
});

app.post('/api/admin/alert-settings', verifyToken, isAdmin, (req, res) => {
  const { recipient, lowThreshold } = req.body;
  const config = {
    recipient: recipient || '+919876543210',
    lowThreshold: lowThreshold !== undefined ? parseInt(lowThreshold) : 10
  };
  saveAlertsConfig(config);
  res.json({ success: true, config });
});

// Customers Directory API
app.get('/api/admin/customers', verifyToken, isAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      include: {
        orders: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const customers = users.map(u => {
      const orderCount = u.orders.length;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        wallet: '₹' + (orderCount * 50).toFixed(2), // dynamic wallet balance based on loyalty
        points: orderCount * 10, // loyalty points
        repeatUser: orderCount > 1,
        active: true
      };
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- WALLET ENDPOINTS ---

// Recharge user wallet
app.post('/api/wallets/recharge', verifyToken, async (req, res) => {
  const { userId, amount, paymentMethod } = req.body;
  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Invalid recharge amount' });
  }
  try {
    const targetUserId = userId || req.user.id;
    const wallet = await getOrCreateWallet(targetUserId, 'user', 'CUSTOMER');
    const updatedWallet = await transactWallet(
      wallet.id,
      amount,
      'CREDIT',
      `Wallet Recharge via ${paymentMethod || 'Online Pay'}`,
      `RECH_${Date.now()}`
    );
    await logAuditEvent(targetUserId, req.user.role, 'WALLET_RECHARGE', 'Wallet', wallet.id, { amount, paymentMethod }, req);
    res.json(updatedWallet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get wallet balances & details
app.get('/api/wallets/balance/:userId', verifyToken, async (req, res) => {
  const { userId } = req.params;
  if (userId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
    return res.status(403).json({ error: 'Access denied.' });
  }
  try {
    const walletTypes = ['CUSTOMER', 'CASHBACK', 'PROMOTIONAL', 'REFUND'];
    const balances = {};
    let totalBalance = 0;

    for (const type of walletTypes) {
      const wallet = await getOrCreateWallet(userId, 'user', type);
      balances[type.toLowerCase()] = wallet.balance;
      totalBalance += wallet.balance;
    }

    res.json({
      userId,
      balances,
      totalBalance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get wallet ledger
app.get('/api/wallets/ledger/:userId', verifyToken, async (req, res) => {
  const { userId } = req.params;
  if (userId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
    return res.status(403).json({ error: 'Access denied.' });
  }
  try {
    const wallets = await prisma.wallet.findMany({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    const allTransactions = wallets.reduce((list, w) => {
      const txs = w.transactions.map(t => ({ ...t, walletType: w.type }));
      return list.concat(txs);
    }, []);

    allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(allTransactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin adjust wallet
app.post('/api/admin/wallets/adjust', verifyToken, isAdmin, async (req, res) => {
  const { ownerId, ownerType, walletType, amount, type, description } = req.body;
  if (!ownerId || !ownerType || !walletType || !amount || !type) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  try {
    const wallet = await getOrCreateWallet(ownerId, ownerType, walletType);
    const updatedWallet = await transactWallet(
      wallet.id,
      amount,
      type,
      description || `Admin adjustment: ${type}`,
      `ADJ_${Date.now()}`
    );
    await logAuditEvent(ownerId, 'ADMIN', `WALLET_ADJUST_${type}`, 'Wallet', wallet.id, { amount, walletType, description }, req);
    res.json(updatedWallet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- CAPACITY ENGINE ENDPOINTS ---

// Fetch current capacity score and parameters
app.get('/api/capacity/status', async (req, res) => {
  try {
    const onlineRiders = await prisma.deliveryPartner.count({ where: { isOnline: true } });
    const busyRiders = await prisma.deliveryAssignment.count({
      where: {
        status: { in: ['Assigned', 'Accepted', 'PickedUp'] },
        partner: { isOnline: true }
      }
    });
    const storeLoad = await prisma.order.count({
      where: { status: { in: ['Preparing', 'Packed', 'Out for Delivery'] } }
    });

    let config = await prisma.capacityConfig.findUnique({ where: { id: 'default' } });
    if (!config) {
      config = await prisma.capacityConfig.create({
        data: {
          id: 'default',
          radius: 10.0,
          peakHourMultiplier: 1.0,
          emergencyPause: false,
          autoScaling: true,
          weatherMultiplier: 1.0,
          storeLoadThreshold: 50
        }
      });
    }

    let capacityScore = 100;
    if (config.emergencyPause) {
      capacityScore = 0;
    } else if (onlineRiders === 0) {
      capacityScore = 0;
    } else {
      const availableRiders = onlineRiders - busyRiders;
      let score = (availableRiders / onlineRiders) * 100;
      
      // Store load penalty
      if (storeLoad > config.storeLoadThreshold) {
        score -= (storeLoad - config.storeLoadThreshold) * 2;
      }

      // Weather penalty
      score = score * config.weatherMultiplier;

      capacityScore = Math.max(0, Math.min(100, Math.round(score)));
    }

    res.json({
      onlineRiders,
      busyRiders,
      storeLoad,
      config,
      capacityScore
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin fetch capacity config
app.get('/api/admin/capacity/config', verifyToken, isAdmin, async (req, res) => {
  try {
    let config = await prisma.capacityConfig.findUnique({ where: { id: 'default' } });
    if (!config) {
      config = await prisma.capacityConfig.create({
        data: {
          id: 'default',
          radius: 10.0,
          peakHourMultiplier: 1.0,
          emergencyPause: false,
          autoScaling: true,
          weatherMultiplier: 1.0,
          storeLoadThreshold: 50
        }
      });
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin update capacity config
app.post('/api/admin/capacity/config', verifyToken, isAdmin, async (req, res) => {
  const { radius, peakHourMultiplier, emergencyPause, autoScaling, weatherMultiplier, storeLoadThreshold } = req.body;
  try {
    const config = await prisma.capacityConfig.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        radius: radius ? parseFloat(radius) : 10.0,
        peakHourMultiplier: peakHourMultiplier ? parseFloat(peakHourMultiplier) : 1.0,
        emergencyPause: !!emergencyPause,
        autoScaling: !!autoScaling,
        weatherMultiplier: weatherMultiplier ? parseFloat(weatherMultiplier) : 1.0,
        storeLoadThreshold: storeLoadThreshold ? parseInt(storeLoadThreshold) : 50
      },
      update: {
        radius: radius !== undefined ? parseFloat(radius) : undefined,
        peakHourMultiplier: peakHourMultiplier !== undefined ? parseFloat(peakHourMultiplier) : undefined,
        emergencyPause: emergencyPause !== undefined ? !!emergencyPause : undefined,
        autoScaling: autoScaling !== undefined ? !!autoScaling : undefined,
        weatherMultiplier: weatherMultiplier !== undefined ? parseFloat(weatherMultiplier) : undefined,
        storeLoadThreshold: storeLoadThreshold !== undefined ? parseInt(storeLoadThreshold) : undefined
      }
    });

    await logAuditEvent(req.user.id, 'ADMIN', 'UPDATE_CAPACITY_CONFIG', 'CapacityConfig', 'default', config, req);
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- MULTI-VENDOR STORES ENDPOINTS ---

// Get all verified/active vendors
app.get('/api/vendors', async (req, res) => {
  try {
    // Seed default vendor if database is completely empty
    const count = await prisma.vendor.count();
    if (count === 0) {
      await prisma.vendor.create({
        data: {
          name: 'Bhusawal Basket Central Dark Store',
          ownerName: 'Admin Store Manager',
          phone: '9876543210',
          email: 'darkstore@liteapp.com',
          password: 'hashedpassword',
          verificationStatus: 'Approved',
          storeCapacity: 200,
          commissionRate: 5.0,
          latitude: 21.0489,
          longitude: 75.7867,
          active: true
        }
      });
    }

    const vendors = await prisma.vendor.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin onboard vendor store
app.post('/api/admin/vendors', verifyToken, isAdmin, async (req, res) => {
  const { name, ownerName, phone, email, password, commissionRate, storeCapacity, operatingHours, latitude, longitude } = req.body;
  if (!name || !ownerName || !phone || !email || !password) {
    return res.status(400).json({ error: 'Name, owner details, phone, email, and password are required' });
  }
  try {
    const existing = await prisma.vendor.findFirst({
      where: { OR: [{ email }, { phone }] }
    });
    if (existing) {
      return res.status(400).json({ error: 'Vendor email or phone already exists' });
    }

    const vendor = await prisma.vendor.create({
      data: {
        name,
        ownerName,
        phone,
        email,
        password: password, // In production, hash it: await bcrypt.hash(password, 10)
        commissionRate: commissionRate ? parseFloat(commissionRate) : 8.0,
        storeCapacity: storeCapacity ? parseInt(storeCapacity) : 100,
        operatingHours: operatingHours || '08:00 AM - 09:00 PM',
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        verificationStatus: 'Approved',
        active: true
      }
    });

    await logAuditEvent(req.user.id, 'ADMIN', 'ONBOARD_VENDOR', 'Vendor', vendor.id, vendor, req);
    res.json(vendor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin toggle/verify vendor status
app.patch('/api/admin/vendors/:id/verify', verifyToken, isAdmin, async (req, res) => {
  const { verificationStatus, active } = req.body;
  try {
    const vendor = await prisma.vendor.update({
      where: { id: req.params.id },
      data: {
        verificationStatus: verificationStatus !== undefined ? verificationStatus : undefined,
        active: active !== undefined ? !!active : undefined
      }
    });
    await logAuditEvent(req.user.id, 'ADMIN', 'UPDATE_VENDOR_STATUS', 'Vendor', vendor.id, { verificationStatus, active }, req);
    res.json(vendor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- CUSTOMER ADMINISTRATION ---

// Admin toggle block customer status
app.patch('/api/admin/customers/:id/status', verifyToken, isAdmin, async (req, res) => {
  const { active } = req.body;
  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: active ? 'ACTIVE' : 'BLOCKED' }
    });
    await logAuditEvent(req.user.id, 'ADMIN', active ? 'UNBLOCK_CUSTOMER' : 'BLOCK_CUSTOMER', 'User', updatedUser.id, null, req);
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin toggle VIP status
app.post('/api/admin/customers/:id/vip', verifyToken, isAdmin, async (req, res) => {
  const { isVip } = req.body;
  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: { isVip: !!isVip }
    });
    await logAuditEvent(req.user.id, 'ADMIN', 'TOGGLE_CUSTOMER_VIP', 'User', updatedUser.id, { isVip }, req);
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- LIVE GPS TRACKING & TELEMETRY ---

// Admin list telemetry / live riders map
app.get('/api/admin/telemetry', verifyToken, isAdmin, async (req, res) => {
  try {
    const riders = await prisma.deliveryPartner.findMany({
      where: { isOnline: true },
      select: {
        id: true,
        name: true,
        phone: true,
        latitude: true,
        longitude: true,
        verificationStatus: true,
        assignments: {
          where: { status: { in: ['Assigned', 'Accepted', 'PickedUp'] } }
        }
      }
    });
    res.json(riders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ORDER STATUS HISTORY ---

// Fetch status logs for an order
app.get('/api/orders/:id/status-history', verifyToken, async (req, res) => {
  try {
    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId: req.params.id },
      orderBy: { timestamp: 'asc' }
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- CUSTOMER SUPPORT TICKETS ---

// Submit support ticket
app.post('/api/tickets', verifyToken, async (req, res) => {
  const { subject, message } = req.body;
  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required' });
  }
  try {
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: req.user.id,
        subject,
        message,
        status: 'OPEN'
      }
    });
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user tickets
app.get('/api/tickets', verifyToken, async (req, res) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin list tickets
app.get('/api/admin/tickets', verifyToken, isAdmin, async (req, res) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin reply/close ticket
app.post('/api/admin/tickets/:id/reply', verifyToken, isAdmin, async (req, res) => {
  const { reply, status } = req.body;
  try {
    const ticket = await prisma.supportTicket.update({
      where: { id: req.params.id },
      data: {
        reply: reply || undefined,
        status: status || 'RESOLVED'
      }
    });
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- SECURITY SYSTEM AUDIT LOGS ---

// Admin list audit logs
app.get('/api/admin/audit-logs', verifyToken, isAdmin, async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Express Server running on port ${PORT}`);
});
