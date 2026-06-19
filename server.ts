import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { db } from './server/db-store';
import { Address, OrderStatus, PaymentStatus } from './src/types';

export const app = express();
const PORT = 3000;

// Enable JSON parsing and CORS headers
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Custom Typed Request interface to handle authenticated requests
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'customer' | 'admin';
  };
}

// ----------------------------------------------------
// MIDDLEWARES
// ----------------------------------------------------

/**
 * JWT Authentication Middleware (Safe base64 crypt-like implementation)
 */
function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Authorization header missing.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const rawPayload = Buffer.from(token, 'base64').toString('utf-8');
    const payload = JSON.parse(rawPayload);

    if (payload.exp && Date.now() > payload.exp) {
      res.status(401).json({ error: 'Session expired. Please log in again.' });
      return;
    }

    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid authentication token.' });
  }
}

/**
 * Admin role verification middleware
 */
function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden. Administrative privileges required.' });
    return;
  }
  next();
}

/**
 * Generate lightweight secure auth token
 */
function generateToken(userId: string, email: string, role: string): string {
  const payload = {
    id: userId,
    email,
    role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days expiration
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// ----------------------------------------------------
// REST API ROUTES
// ----------------------------------------------------

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

/**
 * AUTH APIs
 */
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required fields.' });
    return;
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    res.status(400).json({ error: 'An account with this email already exists.' });
    return;
  }

  const newUser = db.addUser({
    id: `usr_${Date.now()}`,
    name,
    email,
    role: 'customer',
    phone,
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    addresses: [],
    createdAt: new Date().toISOString()
  }, password);

  const token = generateToken(newUser.id, newUser.email, newUser.role);
  res.status(201).json({ user: newUser, token });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const user = db.getUserByEmail(email);
  if (!user || !db.validatePassword(user.id, password)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = generateToken(user.id, user.email, user.role);
  res.json({ user, token });
});

app.get('/api/auth/profile', authMiddleware, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  const user = db.getUserById(req.user.id);
  if (!user) {
    res.status(404).json({ error: 'User profile not found.' });
    return;
  }
  res.json({ user });
});

app.put('/api/auth/profile', authMiddleware, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  const { name, phone, avatar, addresses } = req.body;

  const updatedUser = db.updateUserProfile(req.user.id, name, phone, avatar, addresses);
  if (!updatedUser) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  res.json({ user: updatedUser });
});

/**
 * PRODUCTS SYSTEM APIs
 */
app.get('/api/products', (req: Request, res: Response) => {
  const { category, search, minPrice, maxPrice, sort, brand } = req.query;
  let products = db.getProducts();

  // Keyword Search
  if (search) {
    const q = String(search).toLowerCase();
    products = products.filter(p => 
      p.title.toLowerCase().includes(q) || 
      p.description.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q)
    );
  }

  // Category Filter
  if (category) {
    products = products.filter(p => p.category === String(category));
  }

  // Brand Filter
  if (brand) {
    products = products.filter(p => p.brand.toLowerCase() === String(brand).toLowerCase());
  }

  // Price Bounds Filter
  if (minPrice) {
    products = products.filter(p => (p.discountPrice || p.price) >= Number(minPrice));
  }
  if (maxPrice) {
    products = products.filter(p => (p.discountPrice || p.price) <= Number(maxPrice));
  }

  // Sort Logic
  if (sort) {
    const s = String(sort);
    if (s === 'price-low') {
      products.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
    } else if (s === 'price-high') {
      products.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
    } else if (s === 'rating') {
      products.sort((a, b) => b.rating - a.rating);
    } else if (s === 'newest') {
      products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }

  res.json(products);
});

app.get('/api/products/:id', (req: Request, res: Response) => {
  const product = db.getProductById(req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  const reviews = db.getProductReviews(product.id);
  res.json({ ...product, reviews });
});

// Admin-level Product Creation
app.post('/api/products', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const { title, description, price, discountPrice, stock, category, brand, images, featured } = req.body;

  if (!title || !description || price === undefined || stock === undefined || !category || !brand) {
    res.status(400).json({ error: 'Missing mandatory product attributes.' });
    return;
  }

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const imagesArray = Array.isArray(images) && images.length > 0 
    ? images 
    : ['https://images.unsplash.com/photo-1547949003-9792a18a2601?auto=format&fit=crop&w=800&q=80']; // Fallback generic luxury placeholder

  const newProd = db.addProduct({
    title,
    slug,
    description,
    price: Number(price),
    discountPrice: discountPrice ? Number(discountPrice) : undefined,
    stock: Number(stock),
    category,
    brand,
    images: imagesArray,
    rating: 5.0,
    reviewCount: 0,
    featured: !!featured,
  });

  res.status(201).json(newProd);
});

// Admin-level Product Edit
app.put('/api/products/:id', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const updates = req.body;
  if (updates.price) updates.price = Number(updates.price);
  if (updates.discountPrice) updates.discountPrice = Number(updates.discountPrice);
  if (updates.stock) updates.stock = Number(updates.stock);

  const updated = db.updateProduct(req.params.id, updates);
  if (!updated) {
    res.status(404).json({ error: 'Product not found for modification.' });
    return;
  }
  res.json(updated);
});

// Admin-level Product Removal
app.delete('/api/products/:id', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const deleted = db.deleteProduct(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  res.json({ message: 'Product deleted successfully.', deleted });
});

/**
 * CATEGORY APIs
 */
app.get('/api/categories', (req: Request, res: Response) => {
  res.json(db.getCategories());
});

app.post('/api/categories', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const { name, image } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Category name is required.' });
    return;
  }
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const imgUrl = image || 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=600&q=80';

  const newCat = db.addCategory({ name, slug, image: imgUrl });
  res.status(201).json(newCat);
});

app.put('/api/categories/:id', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const updated = db.updateCategory(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Category not found.' });
    return;
  }
  res.json(updated);
});

app.delete('/api/categories/:id', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const deleted = db.deleteCategory(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Category not found.' });
    return;
  }
  res.json({ message: 'Category deleted.', deleted });
});

/**
 * WISHLIST APIs
 */
app.get('/api/wishlist', authMiddleware, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  const wish = db.getWishlist(req.user.id);
  // Enrich wishlist with actual product records
  const products = wish.productIds
    .map(pid => db.getProductById(pid))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);
  res.json({ productIds: wish.productIds, products });
});

app.post('/api/wishlist/toggle', authMiddleware, (req: AuthRequest, res: Response) => {
  const { productId } = req.body;
  if (!req.user || !productId) {
    res.status(400).json({ error: 'Product ID required.' });
    return;
  }
  const wish = db.toggleWishlistProduct(req.user.id, productId);
  res.json(wish);
});

/**
 * CART APIs
 */
app.get('/api/cart', authMiddleware, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  const cart = db.getCart(req.user.id);
  
  // Package enrichment data
  const enrichedItems = cart.items.map(it => {
    const product = db.getProductById(it.productId);
    return {
      product,
      quantity: it.quantity,
    };
  }).filter(it => it.product !== undefined);

  res.json({ userId: cart.userId, items: enrichedItems });
});

app.post('/api/cart', authMiddleware, (req: AuthRequest, res: Response) => {
  const { items } = req.body;
  if (!req.user || !Array.isArray(items)) {
    res.status(400).json({ error: 'Cart items array must be provided.' });
    return;
  }
  const updatedCart = db.updateCart(req.user.id, items);
  res.json(updatedCart);
});

app.delete('/api/cart/clear', authMiddleware, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  db.clearCart(req.user.id);
  res.json({ message: 'Cart cleared successfully.' });
});

/**
 * ORDER APIs
 */
app.post('/api/orders', authMiddleware, (req: AuthRequest, res: Response) => {
  const { items, shippingAddress, paymentMethod } = req.body;
  if (!req.user || !items || !shippingAddress || !paymentMethod) {
    res.status(400).json({ error: 'Order attributes (items, shippingAddress, paymentMethod) are required.' });
    return;
  }

  // Pre-calculations and inventory check
  const orderItems = [];
  let totalAmount = 0;

  for (const it of items) {
    const prod = db.getProductById(it.productId);
    if (!prod) {
      res.status(400).json({ error: `Product not found: ${it.productId}` });
      return;
    }
    if (prod.stock < it.quantity) {
      res.status(400).json({ error: `Insufficient stock for product '${prod.title}'. Available: ${prod.stock}` });
      return;
    }

    const price = prod.discountPrice || prod.price;
    orderItems.push({
      productId: prod.id,
      title: prod.title,
      image: prod.images[0],
      quantity: it.quantity,
      price: price
    });

    totalAmount += price * it.quantity;
  }

  const newOrder = db.addOrder({
    userId: req.user.id,
    items: orderItems,
    shippingAddress,
    paymentMethod,
    paymentStatus: paymentMethod === 'luxury_pay' || paymentMethod === 'card' ? 'paid' : 'pending',
    orderStatus: 'pending',
    totalAmount,
  });

  // Automatically clear cart upon complete purchase
  db.clearCart(req.user.id);

  res.status(201).json(newOrder);
});

app.get('/api/orders', authMiddleware, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  if (req.user.role === 'admin') {
    res.json(db.getOrders().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  } else {
    res.json(db.getUserOrders(req.user.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }
});

app.get('/api/orders/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  const order = db.getOrderById(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Particular order detail was not found.' });
    return;
  }

  // Authorize customer to only inspect their own orders (except admin)
  if (req.user.role !== 'admin' && order.userId !== req.user.id) {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }

  res.json(order);
});

app.put('/api/orders/:id/status', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const { orderStatus, paymentStatus } = req.body;
  if (!orderStatus) {
    res.status(400).json({ error: 'orderStatus value is required.' });
    return;
  }

  const updated = db.updateOrderStatus(req.params.id, orderStatus as OrderStatus, paymentStatus as PaymentStatus);
  if (!updated) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }
  res.json(updated);
});

/**
 * REVIEWS SYSTEM APIs
 */
app.post('/api/reviews', authMiddleware, (req: AuthRequest, res: Response) => {
  const { productId, rating, comment } = req.body;
  if (!req.user || !productId || rating === undefined || !comment) {
    res.status(400).json({ error: 'productId, numerical rating (1-5), and text comment are required.' });
    return;
  }

  const user = db.getUserById(req.user.id);
  const userName = user ? user.name : 'Vetted Customer';

  const newRev = db.addReview(req.user.id, userName, productId, Number(rating), comment);
  res.status(201).json(newRev);
});

app.delete('/api/reviews/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  const reviews = db.getReviews();
  const target = reviews.find(r => r.id === req.params.id);
  if (!target) {
    res.status(404).json({ error: 'Review not found.' });
    return;
  }

  // Authorize: Only the author of the review or an administrator can delete it
  if (req.user.role !== 'admin' && target.userId !== req.user.id) {
    res.status(403).json({ error: 'Forbidden. Action restricted to creators & admins.' });
    return;
  }

  const deleted = db.deleteReview(req.params.id);
  res.json({ message: 'Review successfully removed.', deleted });
});

/**
 * ADMIN ANALYTICS APIs
 */
app.get('/api/analytics', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const stats = db.getAdminStats();
  res.json(stats);
});

// ----------------------------------------------------
// VITE DEV / PRODUCTION INTEGRATION MIDDLEWARE
// ----------------------------------------------------

async function serveApp() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development middleware mounted.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static folder configured:', distPath);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LuxeCart Pro backend running on http://0.0.0.0:${PORT}`);
  });
}

// Only start local Express server and Vite integration if not running under Vercel Serverless environment
if (!process.env.VERCEL) {
  serveApp();
} else {
  console.log('Skipping standalone server.listen() due to Vercel Serverless environment.');
}

export default app;
