import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Heart, Trash2, Edit3, Plus, ChevronRight, Star, 
  User as UserIcon, Lock, MapPin, Phone, CreditCard, ChevronDown, Check,
  SlidersHorizontal, Search, RefreshCw, BarChart3, Package, Layers, ClipboardList, LogOut
} from 'lucide-react';
import { api } from './services/api';
import { User, Product, Category, CartItem, Order, Review, Address } from './types';

export default function App() {
  // Authentication & Session
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('luxecart_token'));
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authError, setAuthError] = useState('');

  // Catalog & Filters
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(50000);
  const [sort, setSort] = useState<string>('newest');
  const [brandFilter, setBrandFilter] = useState('');

  // Cart & Wishlist
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0); // Percentage
  const [isCouponApplied, setIsCouponApplied] = useState(false);

  // checkout form
  const [shippingAddress, setShippingAddress] = useState<Address>({
    fullName: '',
    phone: '',
    city: '',
    state: '',
    pincode: '',
    country: 'United States'
  });
  const [paymentMethod, setPaymentMethod] = useState('card');

  // Page Navigation
  // 'boutique' | 'product_detail' | 'cart' | 'checkout' | 'orders' | 'profile' | 'admin'
  const [page, setPage] = useState<'boutique' | 'product_detail' | 'cart' | 'checkout' | 'orders' | 'profile' | 'admin'>('boutique');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProductDetails, setSelectedProductDetails] = useState<(Product & { reviews: Review[] }) | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Review posting
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');

  // Admin Dashboard States
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminTab, setAdminTab] = useState<'analytics' | 'products' | 'orders' | 'categories'>('analytics');
  const [productForm, setProductForm] = useState<Partial<Product>>({
    title: '', description: '', price: 0, discountPrice: undefined, stock: 10, category: '', brand: '', images: [''], featured: false
  });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<Partial<Category>>({ name: '', image: '' });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // Notification Toast
  const [toast, setToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Lifecycle Initialization
  useEffect(() => {
    loadCategories();
    loadProducts();
    if (token) {
      loadProfileAndSync();
    }
  }, [token]);

  // Handle automatic refresh when catalog-changing filters alter
  useEffect(() => {
    loadProducts();
  }, [selectedCategory, search, minPrice, maxPrice, sort, brandFilter]);

  const loadCategories = async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (e: any) {
      console.error(e.message);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await api.getProducts({
        category: selectedCategory,
        search,
        minPrice,
        maxPrice,
        sort,
        brand: brandFilter
      });
      setProducts(data);
    } catch (e: any) {
      console.error(e.message);
    }
  };

  const loadProfileAndSync = async () => {
    try {
      const profileRes = await api.getProfile();
      setUser(profileRes.user);
      if (profileRes.user.addresses && profileRes.user.addresses.length > 0) {
        setShippingAddress(profileRes.user.addresses[0]);
      }
      
      // Load cart
      const cartRes = await api.getCart();
      setCart(cartRes.items);

      // Load wishlist
      const wishRes = await api.getWishlist();
      setWishlist(wishRes.productIds);

      // Load orders
      const ords = await api.getOrders();
      setOrders(ords);
    } catch (e: any) {
      console.error('Session expired or error syncing', e);
      handleLogout();
    }
  };

  const loadProductDetails = async (id: string) => {
    try {
      const detail = await api.getProduct(id);
      setSelectedProductDetails(detail);
      setSelectedProductId(id);
      setPage('product_detail');
    } catch (e: any) {
      triggerToast('Error loading product: ' + e.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('luxecart_token');
    setToken(null);
    setUser(null);
    setCart([]);
    setWishlist([]);
    setOrders([]);
    setPage('boutique');
    triggerToast('Logged out of luxury vault.');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') {
        const data = await api.login({ email: authEmail, password: authPassword });
        localStorage.setItem('luxecart_token', data.token);
        setToken(data.token);
        setUser(data.user);
        triggerToast(`Welcome back, ${data.user.name}`);
      } else {
        const data = await api.register({
          name: authName,
          email: authEmail,
          password: authPassword,
          phone: authPhone,
        });
        localStorage.setItem('luxecart_token', data.token);
        setToken(data.token);
        setUser(data.user);
        triggerToast(`Vault registered. Golden key granted!`);
      }
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
      setAuthPhone('');
    } catch (e: any) {
      setAuthError(e.message || 'Credentials error');
    }
  };

  // Cart Management
  const handleAddToCart = async (product: Product, quantity = 1) => {
    if (!token) {
      triggerToast('Please register or log in to acquire premium goods.');
      return;
    }
    
    const existingIndex = cart.findIndex(it => it.product.id === product.id);
    let newItems: { productId: string; quantity: number }[] = [];

    if (existingIndex !== -1) {
      const currentQty = cart[existingIndex].quantity;
      const proposedQty = currentQty + quantity;
      
      if (proposedQty > product.stock) {
        triggerToast(`Only ${product.stock} units available in security vault.`);
        return;
      }

      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity = proposedQty;
      setCart(updatedCart);
      newItems = updatedCart.map(it => ({ productId: it.product.id, quantity: it.quantity }));
    } else {
      if (quantity > product.stock) {
        triggerToast(`Only ${product.stock} units left in catalog stock.`);
        return;
      }
      const updatedCart = [...cart, { product, quantity }];
      setCart(updatedCart);
      newItems = updatedCart.map(it => ({ productId: it.product.id, quantity: it.quantity }));
    }

    try {
      await api.syncCart(newItems);
      triggerToast(`${product.title} added to visual cart.`);
    } catch (e: any) {
      triggerToast('Error updating cart on sever: ' + e.message);
    }
  };

  const updateCartQuantity = async (productId: string, quantity: number) => {
    const updatedCart = cart.map(it => {
      if (it.product.id === productId) {
        if (quantity > it.product.stock) {
          triggerToast(`Maximum premium stock (${it.product.stock}) reached.`);
          return { ...it, quantity: it.product.stock };
        }
        return { ...it, quantity: Math.max(1, quantity) };
      }
      return it;
    });

    setCart(updatedCart);
    try {
      await api.syncCart(updatedCart.map(it => ({ productId: it.product.id, quantity: it.quantity })));
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleRemoveFromCart = async (productId: string) => {
    const updatedCart = cart.filter(it => it.product.id !== productId);
    setCart(updatedCart);
    try {
      await api.syncCart(updatedCart.map(it => ({ productId: it.product.id, quantity: it.quantity })));
      triggerToast('Item removed from cart.');
    } catch (e: any) {
      console.error(e);
    }
  };

  // Wishlist Toggle
  const handleToggleWishlist = async (productId: string) => {
    if (!token) {
      triggerToast('Please authenticate to organize your private catalog wishlist.');
      return;
    }
    try {
      const updated = await api.toggleWishlist(productId);
      setWishlist(updated.productIds);
      if (updated.productIds.includes(productId)) {
        triggerToast('Secured item into curated wishlist.');
      } else {
        triggerToast('Removed item from custom wishlist.');
      }
    } catch (e: any) {
      triggerToast('Error with wishlist action: ' + e.message);
    }
  };

  // Coupons Engine
  const applyCoupon = () => {
    if (couponCode.toUpperCase() === 'LUXURY20') {
      setAppliedDiscount(20);
      setIsCouponApplied(true);
      triggerToast('Premium Coupon "LUXURY20" applied! 20% savings.');
    } else if (couponCode.toUpperCase() === 'GOLD50') {
      setAppliedDiscount(50);
      setIsCouponApplied(true);
      triggerToast('Imperial Coupon "GOLD50" activated! Half-priced gold luxury.');
    } else {
      triggerToast('Voucher not recognized in luxury database.');
    }
  };

  // Checkout and Purchase Simulation
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      triggerToast('Your exquisite cart is currently empty.');
      return;
    }

    try {
      // Save current shipping address in profile first
      if (user) {
        await api.updateProfile({
          name: user.name,
          phone: user.phone || shippingAddress.phone,
          addresses: [shippingAddress]
        });
      }

      await api.createOrder({
        items: cart.map(it => ({ productId: it.product.id, quantity: it.quantity })),
        shippingAddress,
        paymentMethod
      });

      setCart([]);
      setIsCouponApplied(false);
      setAppliedDiscount(0);
      setCouponCode('');
      
      // Reload orders
      const list = await api.getOrders();
      setOrders(list);

      // Navigate to congratulations sequence
      const newlyCreated = list[0]; // most recent
      setSelectedOrder(newlyCreated);
      setPage('orders');
      triggerToast('Order placed! Packing luxury dispatch.');
    } catch (e: any) {
      triggerToast('Order placement failure: ' + e.message);
    }
  };

  // Review Module
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;
    if (!newComment.trim()) {
      triggerToast('Please write a detailed testimonial review.');
      return;
    }
    try {
      await api.submitReview({
        productId: selectedProductId,
        rating: newRating,
        comment: newComment
      });
      setNewComment('');
      loadProductDetails(selectedProductId);
      loadProducts(); // Sync average rating
      triggerToast('Thank you for expressing your connoisseur review.');
    } catch (e: any) {
      triggerToast('Review submission error: ' + e.message);
    }
  };

  // Admin Module Handlers
  const fetchAdminStats = async () => {
    try {
      const stats = await api.getAnalytics();
      setAdminStats(stats);
    } catch (e: any) {
      triggerToast('Admin token verification failed: ' + e.message);
    }
  };

  useEffect(() => {
    if (page === 'admin') {
      fetchAdminStats();
    }
  }, [page, adminTab]);

  const handleAdminProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProductId) {
        await api.updateProduct(editingProductId, productForm);
        triggerToast('Product successfully recalibrated.');
      } else {
        await api.createProduct(productForm);
        triggerToast('Exquisite new product showcased in gallery.');
      }
      setProductForm({
        title: '', description: '', price: 0, discountPrice: undefined, stock: 10, category: categories[0]?.id || '', brand: '', images: [''], featured: false
      });
      setEditingProductId(null);
      loadProducts();
      fetchAdminStats();
    } catch (e: any) {
      triggerToast('Product save failed: ' + e.message);
    }
  };

  const handleAdminCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCategory(categoryForm);
      triggerToast('New luxury aesthetic category designed.');
      setCategoryForm({ name: '', image: '' });
      loadCategories();
      fetchAdminStats();
    } catch (e: any) {
      triggerToast('Category save failed: ' + e.message);
    }
  };

  const handleOrderChangeStatus = async (orderId: string, status: string) => {
    try {
      await api.updateOrderStatus(orderId, { orderStatus: status as any });
      triggerToast(`Order transitioned to: ${status}`);
      
      const list = await api.getOrders();
      setOrders(list);
      fetchAdminStats();
      if (selectedOrder && selectedOrder.id === orderId) {
        const fresh = await api.getOrder(orderId);
        setSelectedOrder(fresh);
      }
    } catch (e: any) {
      triggerToast('Status update error: ' + e.message);
    }
  };

  const handleAdminDeleteProduct = async (id: string) => {
    if (!confirm('Are you absolute certain you wish to withdraw this item from supply?')) return;
    try {
      await api.deleteProduct(id);
      triggerToast('Product permanently withdrawn.');
      loadProducts();
      fetchAdminStats();
    } catch (e: any) {
      triggerToast(e.message);
    }
  };

  // Pricing math
  const cartSubtotal = cart.reduce((acc, it) => acc + (it.product.discountPrice || it.product.price) * it.quantity, 0);
  const discountMultiplier = 1 - (appliedDiscount / 100);
  const cartGiftWrapping = cart.length > 0 ? 50 : 0; // standard custom luxury package
  const cartTotal = (cartSubtotal * discountMultiplier) + cartGiftWrapping;

  return (
    <div className="min-h-screen bg-[#F8F4EC] text-[#2E2E2E] font-serif selection:bg-[#C8A96A] selection:text-white flex flex-col antialiased">
      
      {/* Dynamic Toast System */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 max-w-sm bg-[#2E2E2E] text-[#F8F4EC] border-l-4 border-[#C8A96A] px-6 py-4 rounded-lg shadow-[8px_8px_16px_rgba(0,0,0,0.15)] animate-fade-in flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C8A96A] animate-pulse"></span>
            <p className="text-sm font-sans tracking-wide">{toast}</p>
          </div>
        </div>
      )}

      {/* TOP NOTIFICATION RIBBON */}
      <div className="bg-[#2E2E2E] text-[#F8F4EC] text-xs py-2 px-4 text-center tracking-[0.2em] uppercase font-sans flex items-center justify-center gap-2 border-b border-[#C8A96A]/20">
        <span>Connoisseur Collection: Apply luxury vouchers <b>LUXURY20</b> or <b>GOLD50</b> at bag checkout</span>
      </div>

      {/* LUXURY EMBOSSED NAVIGATION HEADER */}
      <header className="sticky top-0 z-40 bg-[#F8F4EC]/95 backdrop-blur-md border-b border-[#C8A96A]/20 shadow-[0_2px_15px_rgba(200,169,106,0.06)] px-4 sm:px-8 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand Brandished with Neumorphic Shield */}
          <div 
            onClick={() => { setPage('boutique'); setSelectedProductId(null); }} 
            className="group cursor-pointer flex items-center gap-3 px-4 py-2 rounded-xl"
            id="brand-logo"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#F8F4EC] shadow-[3px_3px_6px_#e3dac9,-3px_-3px_6px_#ffffff] text-[#C8A96A] border border-[#C8A96A]/20 transition-all group-hover:scale-105">
              <ShoppingBag className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-[0.1em] text-[#2E2E2E] uppercase font-serif flex items-center gap-1.5">
                LUXECART <span className="text-[#C8A96A] font-light">PRO</span>
              </h1>
              <p className="text-[9px] font-sans tracking-[0.3em] text-[#C8A96A] uppercase font-semibold">THE BOUTIQUE EXPERIENCERS</p>
            </div>
          </div>

          {/* Quick Preset Quick Account Testing Widget */}
          {!user && (
            <div className="flex gap-2 p-1.5 bg-[#2E2E2E]/5 rounded-xl border border-[#C8A96A]/10 text-[11px] font-sans">
              <span className="text-xs text-[#2E2E2E]/60 py-1 px-2 uppercase font-semibold">Test Profiles:</span>
              <button 
                onClick={async () => {
                  try {
                    const data = await api.login({ email: 'customer@luxecart.com', password: 'customer123' });
                    localStorage.setItem('luxecart_token', data.token);
                    setToken(data.token);
                    setUser(data.user);
                    triggerToast("Unlocked Julian's customer vault.");
                  } catch (e) {}
                }}
                className="bg-white hover:bg-[#C8A96A]/10 text-[#8B5A2B] font-bold px-2.5 py-1 rounded shadow-sm border border-[#C8A96A]/10 transition-colors"
                id="preset-customer"
              >
                Julian (Customer)
              </button>
              <button 
                onClick={async () => {
                  try {
                    const data = await api.login({ email: 'admin@luxecart.com', password: 'admin123' });
                    localStorage.setItem('luxecart_token', data.token);
                    setToken(data.token);
                    setUser(data.user);
                    triggerToast("Logged into admin terminal.");
                  } catch (e) {}
                }}
                className="bg-[#2E2E2E] hover:bg-[#C8A96A] text-[#F8F4EC] font-bold px-2.5 py-1 rounded shadow-sm transition-colors"
                id="preset-admin"
              >
                Eleanor (Admin)
              </button>
            </div>
          )}

          {/* Navigational Anchor Grid */}
          <nav className="flex items-center gap-1.5 sm:gap-4 flex-wrap justify-center font-sans">
            <button 
              onClick={() => { setPage('boutique'); setSelectedProductId(null); }}
              className={`px-3 py-2 text-xs uppercase tracking-widest font-black transition-all rounded-lg ${page === 'boutique' ? 'text-[#C8A96A] bg-[#2E2E2E]/5' : 'text-[#2E2E2E]/70 hover:text-[#C8A96A]'}`}
              id="nav-boutique"
            >
              Boutique
            </button>
            
            <button 
              onClick={() => { if (token) { setPage('cart'); } else { triggerToast('Please authenticate.'); } }}
              className={`relative px-3 py-2 text-xs uppercase tracking-widest font-black transition-all rounded-lg flex items-center gap-1.5 ${page === 'cart' ? 'text-[#C8A96A] bg-[#2E2E2E]/5' : 'text-[#2E2E2E]/70 hover:text-[#C8A96A]'}`}
              id="nav-cart"
            >
              <span>Bag</span>
              {cart.length > 0 && (
                <span className="w-4.5 h-4.5 rounded-full bg-[#C8A96A] text-[#F8F4EC] text-[9px] flex items-center justify-center font-bold font-mono">
                  {cart.reduce((sum, it) => sum + it.quantity, 0)}
                </span>
              )}
            </button>

            <button 
              onClick={() => { if (token) { setPage('orders'); } else { triggerToast('Please authenticate.'); } }}
              className={`px-3 py-2 text-xs uppercase tracking-widest font-black transition-all rounded-lg ${page === 'orders' ? 'text-[#C8A96A] bg-[#2E2E2E]/5' : 'text-[#2E2E2E]/70 hover:text-[#C8A96A]'}`}
              id="nav-orders"
            >
              Orders
            </button>

            <button 
              onClick={() => { if (token) { setPage('profile'); } else { triggerToast('Please authenticate.'); } }}
              className={`px-3 py-2 text-xs uppercase tracking-widest font-black transition-all rounded-lg flex items-center gap-1 ${page === 'profile' ? 'text-[#C8A96A] bg-[#2E2E2E]/5' : 'text-[#2E2E2E]/70 hover:text-[#C8A96A]'}`}
              id="nav-profile"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>{user ? user.name.split(' ')[0] : 'Profile'}</span>
            </button>

            {user?.role === 'admin' && (
              <button 
                onClick={() => { setPage('admin'); }}
                className={`px-3.5 py-2 text-xs uppercase tracking-widest font-black transition-all rounded-lg bg-[#C8A96A]/15 border border-[#C8A96A]/40 text-[#8B5A2B] hover:bg-[#C8A96A]/25`}
                id="nav-admin"
              >
                Admin Terminal
              </button>
            )}

            {user ? (
              <button 
                onClick={handleLogout}
                className="p-2 text-red-700 hover:bg-red-50 rounded-lg transition-colors ml-2"
                title="Logout Vault"
                id="nav-logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={() => { 
                  // Setup clean variables and flip page state
                  setPage('profile'); 
                  setAuthMode('login'); 
                }}
                className="px-4 py-1.5 text-xs uppercase tracking-wider bg-[#2E2E2E] text-[#F8F4EC] rounded-lg cursor-pointer hover:bg-[#C8A96A] transition-all font-semibold"
                id="nav-join"
              >
                Join Vault
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* CORE APPLICATION CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 animate-fade-in">
        
        {/* ==========================================
            1. BOUTIQUE / PRODUCT CATALOG VIEW
           ========================================== */}
        {page === 'boutique' && (
          <div className="space-y-8" id="boutique-view">
            
            {/* HERO BANNER SECTION (NEUMORPHED FRAME) */}
            <div className="relative overflow-hidden p-6 sm:p-12 rounded-3xl bg-[#F8F4EC] shadow-[12px_12px_24px_#e3dac9,-12px_-12px_24px_#ffffff] border border-[#C8A96A]/10 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 space-y-4">
                <div className="inline-block px-3 py-1 bg-[#C8A96A]/15 rounded-full text-[10px] text-[#8B5A2B] tracking-widest uppercase font-sans font-bold">
                  Curated Fine Selection
                </div>
                <h2 className="text-3xl sm:text-5xl font-extrabold text-[#2E2E2E] leading-tight font-serif">
                  Indulge In Grand <br/><span className="text-[#C8A96A]">Aesthetic Luxury</span>
                </h2>
                <p className="text-xs sm:text-sm text-[#2E2E2E]/70 max-w-md font-serif leading-relaxed">
                  Crafting a new standard in rare horology, hand-stitched aniline leathers, and heritage timepieces. Securely processed and tracked from master workshops directly to your estate doors.
                </p>
                <div className="flex gap-4 pt-2">
                  <button 
                    onClick={() => {
                      const featuredId = products.find(p => p.featured)?.id;
                      if (featuredId) loadProductDetails(featuredId);
                    }}
                    className="px-6 py-3 text-xs uppercase tracking-widest bg-[#2E2E2E] text-[#F8F4EC] rounded-xl hover:bg-[#C8A96A] transition-all font-sans font-black shadow-[3px_3px_10px_rgba(0,0,0,0.15)]"
                    id="hero-see-featured"
                  >
                    Examine Masterpiece
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedCategory('');
                      setSearch('');
                      setMinPrice(0);
                      setMaxPrice(50000);
                      triggerToast('Full catalog re-established.');
                    }}
                    className="px-6 py-3 text-xs uppercase tracking-widest bg-[#F8F4EC] text-[#2E2E2E]/80 rounded-xl hover:text-[#C8A96A] shadow-[4px_4px_8px_#ded6c8,-4px_-4px_8px_#ffffff] transition-all font-sans text-stone-600 font-bold"
                    id="hero-view-all"
                  >
                    All Collections
                  </button>
                </div>
              </div>

              {/* Spectacular Floating Highlight Image */}
              <div className="w-full md:w-[350px] h-[250px] sm:h-[300px] rounded-2xl overflow-hidden shadow-[8px_8px_16px_rgba(0,0,0,0.1)] border-4 border-white transform rotate-2 hover:rotate-0 transition-all duration-500">
                <img 
                  src="https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=800&q=80" 
                  alt="High luxury catalog banner" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* NEUMORPHIC DENSE FILTERING & SEARCH PANEL */}
            <div className="p-6 rounded-2xl bg-[#F8F4EC] shadow-[6px_6px_12px_#e3dac9,-6px_-6px_12px_#ffffff] border border-[#C8A96A]/10 space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Search Bar Capsule */}
                <div className="md:col-span-5 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C8A96A]">
                    <Search className="w-5 h-5" />
                  </span>
                  <input 
                    type="text" 
                    placeholder="Search rare Swiss Chronographs, Hermès custom Togo bags..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-[#F8F4EC] text-sm text-[#2E2E2E] rounded-xl outline-none shadow-inner border border-[#C8A96A]/10 placeholder-stone-400 font-sans tracking-wide"
                  />
                </div>

                {/* Sort Option Select */}
                <div className="md:col-span-3">
                  <select 
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="w-full px-4 py-3 bg-[#F8F4EC] text-xs uppercase tracking-wider text-[#2E2E2E] rounded-xl outline-none border border-[#C8A96A]/15 font-sans font-black shadow-sm"
                  >
                    <option value="newest">Newly Curated</option>
                    <option value="price-low">Price: Heritage (Low-High)</option>
                    <option value="price-high">Price: Imperial (High-Low)</option>
                    <option value="rating">Rating Level</option>
                  </select>
                </div>

                {/* Brands/Makers Select Filter */}
                <div className="md:col-span-4 flex items-center gap-2">
                  <span className="text-xs uppercase font-sans font-bold text-[#8B5A2B] shrink-0">Maker:</span>
                  <input 
                    type="text"
                    placeholder="Rolex, Chanel, Leica, Hermès..."
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#F8F4EC] text-xs text-[#2E2E2E] rounded-xl outline-none border border-[#C8A96A]/15 shadow-inner font-sans"
                  />
                </div>
              </div>

              {/* Price Bounds Filter Slider */}
              <div className="pt-2 border-t border-[#C8A96A]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <SlidersHorizontal className="w-4 h-4 text-[#C8A96A]" />
                  <span className="text-xs uppercase font-sans font-bold text-[#2E2E2E]/70">Imperial Price Floor to Cap:</span>
                  <span className="text-xs font-mono font-bold text-[#8B5A2B] bg-[#C8A96A]/10 px-2.5 py-1 rounded">
                    ${minPrice} - ${maxPrice}
                  </span>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-2/3">
                  <span className="text-xs font-mono text-stone-400">$0</span>
                  <input 
                    type="range"
                    min="0"
                    max="50000"
                    step="500"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-[#C8A96A] cursor-ew-resize bg-stone-200 h-1.5 rounded-lg"
                  />
                  <span className="text-xs font-mono text-stone-400">$50,000</span>
                </div>
              </div>

              {/* Horizontal Category Pill Sliders */}
              <div className="pt-2 border-t border-[#C8A96A]/10">
                <p className="text-[10px] uppercase font-sans tracking-widest font-black text-[#8B5A2B] mb-2">Explore Atelier Collections</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    onClick={() => setSelectedCategory('')}
                    className={`px-3 py-1.5 text-xs font-sans uppercase tracking-wider rounded-lg transition-all ${selectedCategory === '' ? 'bg-[#C8A96A] text-white shadow-md' : 'bg-white/80 hover:bg-[#C8A96A]/20 shadow-sm border border-[#C8A96A]/15 text-[#2E2E2E]'}`}
                  >
                    All Curated
                  </button>
                  {categories.map(cat => (
                    <button 
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3.5 py-1.5 text-xs font-sans uppercase tracking-wider rounded-lg transition-all ${selectedCategory === cat.id ? 'bg-[#C8A96A] text-white shadow-md' : 'bg-white/80 hover:bg-[#C8A96A]/20 shadow-sm border border-[#C8A96A]/15 text-[#2E2E2E]'}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* PRODUCT CATALOG GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.length === 0 ? (
                <div className="col-span-full py-16 text-center text-[#2E2E2E]/60 space-y-4">
                  <Package className="w-16 h-16 text-[#C8A96A]/40 mx-auto" />
                  <p className="text-lg font-serif">No luxury provisions conform to current search parameters.</p>
                  <button 
                    onClick={() => { setSelectedCategory(''); setSearch(''); setMinPrice(0); setMaxPrice(50000); setBrandFilter(''); }}
                    className="px-6 py-2.5 text-xs font-sans font-bold uppercase tracking-wider bg-[#2E2E2E] text-white rounded-lg hover:bg-[#C8A96A] transition-colors"
                  >
                    Reset Atelier Filters
                  </button>
                </div>
              ) : (
                products.map(prod => {
                  const hasDiscount = prod.discountPrice !== undefined && prod.discountPrice < prod.price;
                  const finalPrice = prod.discountPrice || prod.price;
                  const itemInWish = wishlist.includes(prod.id);

                  return (
                    <div 
                      key={prod.id}
                      className="group relative rounded-2xl bg-[#F8F4EC] shadow-[6px_6px_12px_#e3dac9,-6px_-6px_12px_#ffffff] border border-[#C8A96A]/10 p-4 transition-all duration-300 hover:translate-y-[-5px] hover:shadow-[10px_10px_20px_#ded6c8,-10px_-10px_20px_#ffffff] flex flex-col justify-between"
                      id={`product-card-${prod.id}`}
                    >
                      <div>
                        {/* Upper Badging and Wishlist anchor */}
                        <div className="flex justify-between items-center mb-3">
                          {prod.featured ? (
                            <span className="px-2.5 py-0.5 bg-[#C8A96A]/15 border border-[#C8A96A]/40 rounded-full text-[9px] uppercase tracking-widest font-sans font-black text-[#8B5A2B]">
                              Masterpiece
                            </span>
                          ) : (
                            <span className="text-[10px] font-sans text-stone-400 font-bold uppercase tracking-wider">
                              {prod.brand}
                            </span>
                          )}

                          <button 
                            onClick={(e) => { e.stopPropagation(); handleToggleWishlist(prod.id); }}
                            className={`p-2 rounded-full shadow-[3px_3px_6px_#ded6c8,-3px_-3px_6px_#ffffff] transition-colors hover:bg-red-50 text-stone-500`}
                          >
                            <Heart className={`w-4.5 h-4.5 ${itemInWish ? 'fill-red-500 text-red-500' : 'text-stone-400'}`} />
                          </button>
                        </div>

                        {/* Image Frame with Zoom */}
                        <div 
                          onClick={() => loadProductDetails(prod.id)}
                          className="w-full h-56 rounded-xl overflow-hidden bg-white mb-4 shadow-inner border border-[#C8A96A]/10 cursor-pointer relative"
                        >
                          <img 
                            src={prod.images[0]} 
                            alt={prod.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                          
                          {/* Stock Status Warning Overlay */}
                          {prod.stock === 0 ? (
                            <div className="absolute inset-0 bg-[#2E2E2E]/80 backdrop-blur-xs flex items-center justify-center text-xs uppercase tracking-widest font-bold text-[#F8F4EC]">
                              Withdrawn (Out of Stock)
                            </div>
                          ) : prod.stock < 5 ? (
                            <div className="absolute bottom-2 left-2 bg-[#8B5A2B] text-[9px] uppercase tracking-widest font-bold text-white px-2.5 py-0.5 rounded">
                              Only {prod.stock} Left
                            </div>
                          ) : null}
                        </div>

                        {/* Text Metadata */}
                        <div className="mb-4">
                          <h3 
                            onClick={() => loadProductDetails(prod.id)}
                            className="font-serif font-bold text-base text-[#2E2E2E] group-hover:text-[#C8A96A] cursor-pointer transition-colors line-clamp-1"
                          >
                            {prod.title}
                          </h3>
                          
                          {/* Ratings representation */}
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="flex items-center text-[#C8A96A]">
                              <Star className="w-3 h-3 fill-[#C8A96A] text-[#C8A96A]" />
                              <span className="text-xs font-mono font-bold ml-1">{prod.rating}</span>
                            </div>
                            <span className="text-[10px] text-stone-400 font-sans font-bold">({prod.reviewCount} testimonals)</span>
                          </div>

                          <p className="text-xs text-stone-500 font-serif leading-relaxed line-clamp-2 mt-2">
                            {prod.description}
                          </p>
                        </div>
                      </div>

                      {/* Pricing and Action Strip */}
                      <div className="border-t border-[#C8A96A]/10 pt-3 flex items-center justify-between">
                        <div>
                          {hasDiscount ? (
                            <div className="flex flex-col">
                              <span className="text-xs text-[#2E2E2E]/40 line-through font-mono">${prod.price.toLocaleString()}</span>
                              <span className="text-base font-extrabold text-[#8B5A2B] font-mono">${prod.discountPrice?.toLocaleString()}</span>
                            </div>
                          ) : (
                            <span className="text-base font-extrabold text-[#2E2E2E] font-mono">${prod.price.toLocaleString()}</span>
                          )}
                        </div>

                        {prod.stock > 0 ? (
                          <button 
                            onClick={() => handleAddToCart(prod)}
                            className="bg-[#2E2E2E] shrink-0 text-[#F8F4EC] hover:bg-[#C8A96A] py-2 px-3.5 rounded-lg text-xs uppercase tracking-wider font-sans font-black transition-colors shadow-md flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Acquire</span>
                          </button>
                        ) : (
                          <button 
                            disabled
                            className="disabled:opacity-50 border border-stone-300 text-stone-400 py-2 px-3.5 rounded-lg text-xs uppercase tracking-wider font-sans font-black"
                          >
                            Depleted
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

        {/* ==========================================
            2. PRODUCT DETAIL PAGE
           ========================================== */}
        {page === 'product_detail' && selectedProductDetails && (
          <div className="space-y-12" id="product-detail-view">
            
            {/* Back anchor */}
            <button 
              onClick={() => { setPage('boutique'); }}
              className="text-xs uppercase tracking-widest font-sans font-bold text-[#8B5A2B] hover:text-[#C8A96A] flex items-center gap-2 mb-4"
              id="detail-back-button"
            >
              ← Back to Curated Catalog
            </button>

            {/* Two Column Gallery and Purchase Action Suite */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 bg-[#F8F4EC] p-6 sm:p-10 rounded-3xl shadow-[8px_8px_16px_#e3dac9,-8px_-8px_16px_#ffffff] border border-[#C8A96A]/10">
              
              {/* Product Gallery Grid */}
              <div className="lg:col-span-6 space-y-4">
                <div className="w-full h-[350px] sm:h-[450px] rounded-2xl overflow-hidden shadow-inner border border-[#C8A96A]/10 bg-white">
                  <img 
                    src={selectedProductDetails.images[0]} 
                    alt={selectedProductDetails.title} 
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Secondary Showcase Carousels if multiple exists */}
                {selectedProductDetails.images.length > 1 && (
                  <div className="flex gap-4">
                    {selectedProductDetails.images.slice(1).map((src, i) => (
                      <div key={i} className="w-24 h-24 rounded-lg overflow-hidden border border-[#C8A96A]/20 shadow bg-white cursor-pointer hover:opacity-85">
                        <img src={src} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Purchase Suite Controls */}
              <div className="lg:col-span-6 space-y-6">
                <div>
                  <span className="text-xs uppercase tracking-widest font-bold text-[#8B5A2B] font-sans">
                    {selectedProductDetails.brand} Collection
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2E2E2E] tracking-tight font-serif mt-1">
                    {selectedProductDetails.title}
                  </h2>
                  
                  {/* Reviews aggregate bar */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex text-[#C8A96A]">
                      {[1,2,3,4,5].map(step => (
                        <Star key={step} className={`w-4 h-4 ${step <= Math.round(selectedProductDetails.rating) ? 'fill-[#C8A96A]' : 'text-stone-300'}`} />
                      ))}
                    </div>
                    <span className="text-xs font-mono font-black text-[#8B5A2B] bg-[#C8A96A]/10 px-2 py-0.5 rounded font-sans">{selectedProductDetails.rating} out of 5</span>
                    <span className="text-xs text-stone-400 font-sans">| {selectedProductDetails.reviewCount} customer testimonials</span>
                  </div>
                </div>

                <div className="border-t border-b border-[#C8A96A]/10 py-4">
                  {selectedProductDetails.discountPrice ? (
                    <div className="flex items-baseline gap-3">
                      <span className="text-2xl font-extrabold text-[#8B5A2B] font-mono">${selectedProductDetails.discountPrice.toLocaleString()}</span>
                      <span className="text-sm font-sans line-through text-stone-400">${selectedProductDetails.price.toLocaleString()}</span>
                    </div>
                  ) : (
                    <span className="text-2xl font-extrabold text-[#2E2E2E] font-mono">${selectedProductDetails.price.toLocaleString()}</span>
                  )}
                  <p className="text-[11px] font-sans tracking-wide text-stone-500 mt-1">Complimentary gold-threaded gift wrapping included.</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase font-sans tracking-wider font-bold text-[#2E2E2E]/70 text-[#8B5A2B]">Atelier Insight</p>
                  <p className="text-sm text-stone-600 font-serif leading-relaxed">
                    {selectedProductDetails.description}
                  </p>
                </div>

                {/* Inventory warning bar and button actions */}
                <div className="space-y-4 pt-4 border-t border-[#C8A96A]/10">
                  <div className="flex items-center justify-between text-xs font-sans">
                    <span className="font-bold text-[#2E2E2E]/70 text-[#8B5A2B]">Supply Meter:</span>
                    <span className={`font-mono font-bold px-2 py-0.5 rounded ${selectedProductDetails.stock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {selectedProductDetails.stock > 0 ? `Available to Secure (${selectedProductDetails.stock} units)` : 'Permanently Depleted'}
                    </span>
                  </div>

                  <div className="flex gap-4">
                    {selectedProductDetails.stock > 0 ? (
                      <button 
                        onClick={() => handleAddToCart(selectedProductDetails)}
                        className="flex-1 bg-[#2E2E2E] text-[#F8F4EC] hover:bg-[#C8A96A] transition-all py-4 rounded-xl text-xs uppercase tracking-widest font-sans font-black shadow-md flex items-center justify-center gap-2"
                        id="detail-acquire-button"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Acquire and Bag Goods</span>
                      </button>
                    ) : (
                      <button 
                        disabled
                        className="flex-1 py-4 border border-stone-300 text-stone-400 text-xs font-sans uppercase tracking-widest font-black rounded-xl"
                      >
                        Item Out of Stock
                      </button>
                    )}

                    <button 
                      onClick={() => handleToggleWishlist(selectedProductDetails.id)}
                      className="px-4 py-4 rounded-xl shadow-[3px_3px_6px_#ded6c8,-3px_-3px_6px_#ffffff] border border-[#C8A96A]/10 text-[#8B5A2B] hover:text-[#C8A96A]"
                      id="detail-wishlist-button"
                    >
                      <Heart className={`w-5 h-5 ${wishlist.includes(selectedProductDetails.id) ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                  </div>
                </div>

              </div>

            </div>

            {/* TESTIMONIALS & REVIEWS HUB */}
            <div className="space-y-6">
              <h3 className="text-xl sm:text-2xl font-serif font-black text-[#2E2E2E] border-b border-[#C8A96A]/20 pb-3 flex items-center gap-2">
                <span>Curated Testimonials ({selectedProductDetails.reviews.length})</span>
              </h3>

              {/* Testimonials List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {selectedProductDetails.reviews.length === 0 ? (
                  <p className="col-span-full text-stone-500 italic font-serif py-4">No connoisseur reviews published for this workpiece yet.</p>
                ) : (
                  selectedProductDetails.reviews.map(rev => (
                    <div key={rev.id} className="p-6 bg-[#F8F4EC] rounded-2xl shadow-[4px_4px_8px_#ded6c8,-4px_-4px_8px_#ffffff] border border-[#C8A96A]/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold font-serif text-[#2E2E2E]">{rev.userName}</p>
                          <p className="text-[10px] text-stone-400 font-sans uppercase tracking-wider">{new Date(rev.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="bg-[#C8A96A]/15 text-[#8B5A2B] flex items-center gap-1 font-mono text-xs px-2.5 py-1 rounded-full font-black">
                          <Star className="w-3.5 h-3.5 fill-[#C8A96A] text-[#C8A96A]" />
                          <span>{rev.rating}</span>
                        </div>
                      </div>
                      <p className="text-xs text-stone-600 font-serif leading-relaxed italic">
                        "{rev.comment}"
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* POST A TESTIMONIAL (WOODMORPHIC CABINET FORM) */}
              {token ? (
                <div className="relative overflow-hidden p-6 sm:p-8 rounded-2xl border border-[#C8A96A]/30 text-[#2E2E2E]" style={{ background: 'linear-gradient(135deg, #d2b48c, #c19a6b)', boxShadow: '8px 8px 16px #ded6c8, -8px -8px 16px #ffffff' }}>
                  
                  {/* Subtle luxurious brass highlights decorative panel */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-tr from-yellow-700/10 to-yellow-300/30 rounded-bl-full pointer-events-none"></div>

                  <h4 className="text-lg font-serif font-black mb-2 text-[#2E2E2E] uppercase tracking-wide">Write Custom Testimonial</h4>
                  <p className="text-xs text-stone-700 mb-6 font-serif">Your expert experience directly guides our workshop curators and designers.</p>

                  <form onSubmit={handleSubmitReview} className="space-y-4 font-sans text-xs">
                    
                    <div className="flex items-center gap-3">
                      <label className="uppercase tracking-widest font-bold text-[#2E2E2E] text-[10px]">Testimonial Rating:</label>
                      <div className="flex items-center gap-1.5 bg-[#2E2E2E]/10 px-3 py-1.5 rounded-lg border border-stone-800/20">
                        {[1, 2, 3, 4, 5].map(val => (
                          <button 
                            key={val}
                            type="button"
                            onClick={() => setNewRating(val)}
                            className="text-[#2E2E2E] shrink-0 hover:scale-105"
                          >
                            <Star className={`w-4 h-4 ${val <= newRating ? 'fill-[#2E2E2E] text-[#2E2E2E]' : 'text-[#2E2E2E]/30'}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="uppercase tracking-widest font-bold text-[#2E2E2E] text-[10px]">Express Your Review Commentary:</label>
                      <textarea 
                        rows={3}
                        required
                        placeholder="Detail the materials, the unboxing ceremony, or precision delivery layout..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="w-full p-3 bg-white/70 text-[#2E2E2E] rounded-xl outline-none border border-stone-800/10 focus:bg-white placeholder-stone-600 font-serif text-xs leading-relaxed"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="px-6 py-3 bg-[#2E2E2E] hover:bg-stone-900 text-[#F8F4EC] rounded-xl font-sans uppercase font-black tracking-widest cursor-pointer shadow-md text-xs"
                      id="submit-review-button"
                    >
                      Publish Testimonial
                    </button>
                  </form>
                </div>
              ) : (
                <div className="p-6 text-center text-stone-600 border border-dashed border-[#C8A96A]/40 rounded-2xl italic font-serif">
                  Please register or log in to submit details for this luxury masterpiece.
                </div>
              )}
            </div>

          </div>
        )}

        {/* ==========================================
            3. LUXURY BAG / CART
           ========================================== */}
        {page === 'cart' && (
          <div className="space-y-8" id="cart-view">
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#2E2E2E]">Your Curated Bag</h2>

            {cart.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#F8F4EC] shadow-[6px_6px_12px_#e3dac9,-6px_-6px_12px_#ffffff] border border-[#C8A96A]/15 space-y-4">
                <ShoppingBag className="w-16 h-16 text-[#C8A96A]/40 mx-auto" />
                <p className="text-lg font-serif">No luxury items are bagged currently.</p>
                <button 
                  onClick={() => setPage('boutique')} 
                  className="px-6 py-2.5 text-xs font-sans font-bold uppercase tracking-wider bg-[#2E2E2E] text-[#F8F4EC] rounded-xl hover:bg-[#C8A96A]"
                >
                  Return to Boutique Selection
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                
                {/* Cart list items */}
                <div className="lg:col-span-8 space-y-4">
                  {cart.map(it => (
                    <div 
                      key={it.product.id}
                      className="p-4 bg-[#F8F4EC] rounded-2xl border border-[#C8A96A]/10 shadow-[4px_4px_8px_#ded6c8,-4px_-4px_8px_#ffffff] flex flex-col sm:flex-row items-center justify-between gap-4"
                      id={`cart-item-${it.product.id}`}
                    >
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="w-20 h-20 bg-white rounded-lg overflow-hidden shrink-0 border border-[#C8A96A]/20">
                          <img src={it.product.images[0]} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h4 className="font-serif font-bold text-sm text-[#2E2E2E]">{it.product.title}</h4>
                          <p className="text-xs uppercase font-sans tracking-wider text-stone-400 mt-0.5">{it.product.brand}</p>
                          <span className="text-xs font-mono font-bold text-[#8B5A2B] mt-1 inline-block">
                            ${(it.product.discountPrice || it.product.price).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 justify-between w-full sm:w-auto border-t sm:border-0 pt-3 sm:pt-0">
                        {/* Quantity controls */}
                        <div className="flex items-center gap-2 bg-[#2E2E2E]/5 rounded-lg p-1 border border-[#C8A96A]/20">
                          <button 
                            onClick={() => updateCartQuantity(it.product.id, it.quantity - 1)}
                            className="w-7 h-7 text-xs font-black font-sans bg-white hover:bg-stone-50 border border-[#C8A96A]/10 shadow-sm rounded flex items-center justify-center text-[#2E2E2E]"
                            id={`qty-decrease-${it.product.id}`}
                          >
                            -
                          </button>
                          <span className="text-xs w-6 text-center font-mono font-bold">{it.quantity}</span>
                          <button 
                            onClick={() => updateCartQuantity(it.product.id, it.quantity + 1)}
                            className="w-7 h-7 text-xs font-black font-sans bg-white hover:bg-stone-50 border border-[#C8A96A]/10 shadow-sm rounded flex items-center justify-center text-[#2E2E2E]"
                            id={`qty-increase-${it.product.id}`}
                          >
                            +
                          </button>
                        </div>

                        {/* Sum price per row */}
                        <span className="text-sm font-mono font-bold text-[#2E2E2E]/80 shrink-0">
                          ${((it.product.discountPrice || it.product.price) * it.quantity).toLocaleString()}
                        </span>

                        <button 
                          onClick={() => handleRemoveFromCart(it.product.id)}
                          className="p-2 text-[#8B5A2B] hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                          title="Purge Item"
                          id={`remove-cart-item-${it.product.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Empty Bag Suite */}
                  <div className="flex justify-between items-center text-xs pt-4">
                    <button 
                      onClick={() => setPage('boutique')}
                      className="px-4 py-2 text-stone-600 hover:text-[#C8A96A] font-sans font-bold uppercase tracking-wider"
                    >
                      ← Carry On Browsing
                    </button>
                    <button 
                      onClick={async () => {
                        await api.clearCart();
                        setCart([]);
                        triggerToast('Bag evacuated.');
                      }}
                      className="px-4 py-2 border border-[#8B5A2B]/40 hover:bg-[#8B5A2B]/10 text-[#8B5A2B] font-sans font-bold rounded-lg uppercase tracking-wider transition-colors"
                      id="clear-bag-button"
                    >
                      Purge Whole Bag
                    </button>
                  </div>
                </div>

                {/* Subtotal Cabinets (Checkout Preparation Drawer) */}
                <div className="lg:col-span-4 space-y-6">
                  
                  {/* Luxury Coupon Form */}
                  <div className="p-5 rounded-2xl bg-[#F8F4EC] shadow-[4px_4px_8px_#ded6c8,-4px_-4px_8px_#ffffff] border border-[#C8A96A]/10 space-y-3">
                    <p className="text-[11px] uppercase font-sans tracking-widest font-black text-[#8B5A2B]">Exquisite Vouchers</p>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Voucher Code: LUXURY20"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-1 bg-[#F8F4EC] p-2.5 text-xs tracking-wider uppercase font-sans border border-[#C8A96A]/25 rounded-xl outline-none shadow-sm"
                      />
                      <button 
                        onClick={applyCoupon}
                        className="px-4 py-2.5 bg-[#2E2E2E] hover:bg-stone-900 text-white font-sans text-xs uppercase tracking-wider rounded-xl font-bold"
                        id="apply-coupon-button"
                      >
                        Apply
                      </button>
                    </div>
                    {isCouponApplied && (
                      <p className="text-xs text-emerald-800 font-sans flex items-center gap-1 font-bold">
                        <Check className="w-4 h-4" /> {appliedDiscount}% savings actively loaded.
                      </p>
                    )}
                  </div>

                  {/* Premium Checkout Tally Ring */}
                  <div className="p-6 rounded-2xl bg-[#F8F4EC] shadow-[6px_6px_12px_#e3dac9,-6px_-6px_12px_#ffffff] border border-[#C8A96A]/15 space-y-4">
                    <h3 className="text-lg font-serif font-black border-b border-[#C8A96A]/20 pb-2.5 text-[#2E2E2E]">Bag Summary</h3>
                    
                    <div className="space-y-2.5 text-xs font-sans">
                      <div className="flex justify-between text-stone-500">
                        <span>Items Subtotal:</span>
                        <span className="font-mono">${cartSubtotal.toLocaleString()}</span>
                      </div>
                      
                      {isCouponApplied && (
                        <div className="flex justify-between text-emerald-800 font-bold">
                          <span>Curator Gift Deductions ({appliedDiscount}%):</span>
                          <span className="font-mono">-${(cartSubtotal * (appliedDiscount / 100)).toLocaleString()}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-stone-500">
                        <span>Estate Dispatch Package Fees:</span>
                        <span className="font-mono">${cartGiftWrapping.toLocaleString()}</span>
                      </div>

                      <div className="border-t border-[#C8A96A]/20 pt-3.5 flex justify-between text-base font-extrabold text-[#2E2E2E]">
                        <span>Grand Estate Total:</span>
                        <span className="font-mono text-[#8B5A2B]">${cartTotal.toLocaleString()}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => setPage('checkout')}
                      className="w-full bg-[#2E2E2E] text-[#F8F4EC] hover:bg-[#C8A96A] transition-all py-3.5 rounded-xl text-xs uppercase tracking-widest font-sans font-black shadow-md block text-center"
                      id="proceed-checkout-button"
                    >
                      Begin Security Checkout
                    </button>
                  </div>

                </div>

              </div>
            )}
          </div>
        )}

        {/* ==========================================
            4. CHECKOUT SCREEN (WOODMORPHIC EXQUISITE)
           ========================================== */}
        {page === 'checkout' && (
          <div className="space-y-8" id="checkout-view">
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#2E2E2E]">Security Portal Secure Checkout</h2>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              
              {/* WOODMORPHIC CABINET FORM BOX */}
              <div 
                className="lg:col-span-8 relative overflow-hidden p-6 sm:p-10 rounded-3xl border border-[#C8A96A]/30 text-[#2E2E2E]"
                style={{ background: 'linear-gradient(135deg, #d2b48c, #c19a6b)', boxShadow: '8px 8px 16px #ded6c8, -8px -8px 16px #ffffff' }}
              >
                {/* Fine circular gold bezel highlight */}
                <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-tr from-yellow-700/10 to-yellow-200/20 rounded-bl-full pointer-events-none"></div>

                <div className="border-b border-[#2E2E2E]/20 pb-4 mb-6">
                  <h3 className="text-xl font-serif font-black uppercase tracking-wide">Dispatch Address & Escrow</h3>
                  <p className="text-xs text-stone-700 mt-1 font-serif">Meticulous carriage handlers execute deliveries securely.</p>
                </div>

                <form onSubmit={handlePlaceOrder} className="space-y-6 font-sans text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="uppercase tracking-widest font-bold text-[#2E2E2E] text-[10px]">Consignee Full Name:</label>
                      <input 
                        type="text"
                        required
                        value={shippingAddress.fullName}
                        onChange={(e) => setShippingAddress({...shippingAddress, fullName: e.target.value})}
                        placeholder="Julian Vance"
                        className="w-full p-3 bg-white/70 text-[#2E2E2E] rounded-xl outline-none border border-stone-800/10 focus:bg-white placeholder-stone-600 font-serif text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="uppercase tracking-widest font-bold text-[#2E2E2E] text-[10px]">Secure Telephone Phone:</label>
                      <input 
                        type="tel"
                        required
                        value={shippingAddress.phone}
                        onChange={(e) => setShippingAddress({...shippingAddress, phone: e.target.value})}
                        placeholder="+1 (555) 012-3456"
                        className="w-full p-3 bg-white/70 text-[#2E2E2E] rounded-xl outline-none border border-stone-800/10 focus:bg-white placeholder-stone-600 font-serif text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="uppercase tracking-widest font-bold text-[#2E2E2E] text-[10px]">City / Parish:</label>
                      <input 
                        type="text"
                        required
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                        placeholder="Manhattan"
                        className="w-full p-3 bg-white/70 text-[#2E2E2E] rounded-xl outline-none border border-stone-800/10 focus:bg-white placeholder-stone-600 font-serif text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="uppercase tracking-widest font-bold text-[#2E2E2E] text-[10px]">State / Emirate:</label>
                      <input 
                        type="text"
                        required
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
                        placeholder="New York"
                        className="w-full p-3 bg-white/70 text-[#2E2E2E] rounded-xl outline-none border border-stone-800/10 focus:bg-white placeholder-stone-600 font-serif text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="uppercase tracking-widest font-bold text-[#2E2E2E] text-[10px]">ZIP / Postal Code:</label>
                      <input 
                        type="text"
                        required
                        value={shippingAddress.pincode}
                        onChange={(e) => setShippingAddress({...shippingAddress, pincode: e.target.value})}
                        placeholder="10001"
                        className="w-full p-3 bg-white/70 text-[#2E2E2E] rounded-xl outline-none border border-stone-800/10 focus:bg-white placeholder-stone-600 font-serif text-xs"
                      />
                    </div>
                  </div>

                  {/* Payment Channel Options Selector */}
                  <div className="space-y-2 border-t border-[#2E2E2E]/20 pt-4">
                    <p className="uppercase tracking-widest font-bold text-[#2E2E2E] text-[10px] mb-2">Select Escrow Escrow Medium:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      
                      <div 
                        onClick={() => setPaymentMethod('luxury_pay')}
                        className={`p-4 rounded-xl border cursor-pointer flex flex-col justify-between h-24 transition-all ${paymentMethod === 'luxury_pay' ? 'bg-[#2E2E2E] text-[#F8F4EC] border-transparent shadow-lg' : 'bg-white/50 text-[#2E2E2E] border-stone-800/25 hover:bg-white/70'}`}
                      >
                        <div className="flex justify-between items-center">
                          <CreditCard className="w-5 h-5" />
                          {paymentMethod === 'luxury_pay' && <span className="w-2 h-2 rounded-full bg-[#C8A96A]"></span>}
                        </div>
                        <div>
                          <p className="font-bold">LuxePay Vault</p>
                          <p className="text-[9px] opacity-70">Direct cryptographic release</p>
                        </div>
                      </div>

                      <div 
                        onClick={() => setPaymentMethod('card')}
                        className={`p-4 rounded-xl border cursor-pointer flex flex-col justify-between h-24 transition-all ${paymentMethod === 'card' ? 'bg-[#2E2E2E] text-[#F8F4EC] border-transparent shadow-lg' : 'bg-white/50 text-[#2E2E2E] border-stone-800/25 hover:bg-white/70'}`}
                      >
                        <div className="flex justify-between items-center">
                          <CreditCard className="w-5 h-5" />
                          {paymentMethod === 'card' ? <span className="w-2 h-2 rounded-full bg-[#C8A96A]"></span> : null}
                        </div>
                        <div>
                          <p className="font-bold">Visa / AMEX Platinum</p>
                          <p className="text-[9px] opacity-70">Standard credit wire</p>
                        </div>
                      </div>

                      <div 
                        onClick={() => setPaymentMethod('cod')}
                        className={`p-4 rounded-xl border cursor-pointer flex flex-col justify-between h-24 transition-all ${paymentMethod === 'cod' ? 'bg-[#2E2E2E] text-[#F8F4EC] border-transparent shadow-lg' : 'bg-white/50 text-[#2E2E2E] border-stone-800/25 hover:bg-white/70'}`}
                      >
                        <div className="flex justify-between items-center">
                          <MapPin className="w-5 h-5" />
                          {paymentMethod === 'cod' && <span className="w-2 h-2 rounded-full bg-[#C8A96A]"></span>}
                        </div>
                        <div>
                          <p className="font-bold">Carriage Cash Courier</p>
                          <p className="text-[9px] opacity-70">Pay hand-to-hand on estate arrival</p>
                        </div>
                      </div>

                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-[#2E2E2E] hover:bg-stone-900 text-[#F8F4EC] rounded-xl font-sans uppercase font-black tracking-widest cursor-pointer shadow-md text-xs mt-4"
                    id="conclude-payment-button"
                  >
                    Conclude Settlement & Secure Vault Cargo
                  </button>
                </form>
              </div>

              {/* Tally list overview right drawer */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-6 rounded-2xl bg-[#F8F4EC] shadow-[6px_6px_12px_#e3dac9,-6px_-6px_12px_#ffffff] border border-[#C8A96A]/15 space-y-4">
                  <h3 className="text-base font-serif font-black text-[#2E2E2E]">Consignment Roll</h3>
                  
                  <div className="divide-y divide-[#C8A96A]/10 max-h-72 overflow-y-auto pr-1">
                    {cart.map(it => (
                      <div key={it.product.id} className="py-2.5 flex items-center justify-between text-xs font-sans">
                        <div className="line-clamp-1 max-w-[200px]">
                          <span className="font-bold text-[#2E2E2E]">{it.product.title}</span>
                          <span className="text-stone-400 ml-1">x{it.quantity}</span>
                        </div>
                        <span className="font-mono text-stone-600">${((it.product.discountPrice || it.product.price) * it.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[#C8A96A]/20 pt-3 text-xs space-y-2 font-sans">
                    <div className="flex justify-between text-stone-500">
                      <span>Fine Package Fees:</span>
                      <span className="font-mono">${cartGiftWrapping}</span>
                    </div>
                    {isCouponApplied && (
                      <p className="text-emerald-800 text-[11px] font-bold flex items-center justify-between">
                        <span>Curator Discount:</span>
                        <span className="font-mono">-{appliedDiscount}%</span>
                      </p>
                    )}
                    <div className="flex justify-between font-extrabold text-[#2E2E2E] text-sm pt-2 border-t border-[#C8A96A]/10">
                      <span>Total Invoice:</span>
                      <span className="font-mono text-[#8B5A2B]">${cartTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ==========================================
            5. MY ORDERS HISTORICAL LOGS & TIMELINES
           ========================================== */}
        {page === 'orders' && (
          <div className="space-y-10" id="orders-logged-view">
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#2E2E2E]">Your Carriage Dispatches</h2>

            {orders.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#F8F4EC] shadow-[6px_6px_12px_#e3dac9,-6px_-6px_12px_#ffffff] border border-[#C8A96A]/15 space-y-3">
                <ClipboardList className="w-16 h-16 text-[#C8A96A]/40 mx-auto" />
                <p className="text-lg font-serif">No historical carriage orders recorded in this lock.</p>
                <button onClick={() => setPage('boutique')} className="px-6 py-2 bg-[#2E2E2E] text-white rounded-lg text-xs font-sans uppercase">Aquire Products</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                
                {/* Orders tracking records catalog */}
                <div className="lg:col-span-4 space-y-4 h-[650px] overflow-y-auto pr-2">
                  <p className="text-[10px] font-sans uppercase tracking-widest font-black text-[#8B5A2B]">Carriage Record Registry</p>
                  {orders.map(o => (
                    <div 
                      key={o.id}
                      onClick={() => setSelectedOrder(o)}
                      className={`p-4 bg-[#F8F4EC] rounded-2xl border transition-all cursor-pointer ${selectedOrder?.id === o.id ? 'border-[#C8A96A] shadow-md bg-[#C8A96A]/5' : 'border-[#C8A96A]/15 hover:bg-[#C8A96A]/5'}`}
                      id={`order-card-${o.id}`}
                    >
                      <div className="flex justify-between items-center text-xs font-sans">
                        <span className="font-mono font-black text-[#8B5A2B]">{o.id}</span>
                        <span className={`px-2 py-0.5 rounded uppercase tracking-wider font-bold text-[8px] ${o.orderStatus === 'delivered' ? 'bg-emerald-100 text-emerald-800' : o.orderStatus === 'shipped' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                          {o.orderStatus}
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-400 font-sans mt-1">Acquired {new Date(o.createdAt).toLocaleDateString()}</p>
                      
                      <p className="text-xs font-semibold text-stone-700 font-serif leading-none mt-3">
                        {o.items.length} rare selection pieces
                      </p>

                      <div className="flex justify-between items-end border-t border-[#C8A96A]/10 mt-3.5 pt-2">
                        <span className="text-[9px] uppercase font-sans text-stone-400">Escrow Value:</span>
                        <span className="text-sm font-mono font-semibold text-[#2E2E2E]">${o.totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* TRACKING TIMELINE SHEET (WOODMORPHIC CABINET) */}
                <div className="lg:col-span-8">
                  {selectedOrder ? (
                    <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl border border-[#C8A96A]/30 text-[#2E2E2E]" style={{ background: 'linear-gradient(135deg, #d2b48c, #c19a6b)', boxShadow: '8px 8px 16px #ded6c8, -8px -8px 16px #ffffff' }}>
                      
                      {/* Interactive metadata badge */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#2E2E2E]/20 pb-4 mb-6">
                        <div>
                          <p className="text-[10px] uppercase font-sans font-bold tracking-widest text-[#8B5A2B]">Estate Dispatch Tracking</p>
                          <h3 className="text-xl font-serif font-black">{selectedOrder.id}</h3>
                        </div>
                        <div className="text-xs text-stone-800 font-serif text-left sm:text-right mt-2 sm:mt-0 font-sans">
                          <p>Consigned Date: <b>{new Date(selectedOrder.createdAt).toLocaleString()}</b></p>
                          <p>Payment: <span className="uppercase font-bold">{selectedOrder.paymentStatus}</span> via <span className="uppercase font-semibold">{selectedOrder.paymentMethod}</span></p>
                        </div>
                      </div>

                      {/* VISUALTIMELINE GRAPHIC */}
                      <p className="text-[11px] uppercase tracking-widest font-sans font-black text-[#2E2E2E]/80 mb-4 text-[#8B5A2B]">Carriage Movement Timeline</p>
                      <div className="grid grid-cols-4 gap-2 mb-8 relative">
                        {/* Connecting background tracking rail */}
                        <div className="absolute top-[18px] left-[12.5%] right-[12.5%] h-1 bg-[#2E2E2E]/20 z-0"></div>
                        
                        {/* Connecting loaded absolute rail */}
                        <div className="absolute top-[18px] left-[12.5%] h-1 bg-[#2E2E2E] z-0 transition-all transition-duration-500" style={{
                          width: selectedOrder.orderStatus === 'delivered' ? '75%' : selectedOrder.orderStatus === 'shipped' ? '50%' : selectedOrder.orderStatus === 'processing' ? '25%' : '0%'
                        }}></div>

                        {/* Timeline Step markers */}
                        {[
                          { key: 'pending', label: 'Vault Cleared', desc: 'Pre-consignment approved' },
                          { key: 'processing', label: 'Polished & Packed', desc: 'Insulated vault boxed' },
                          { key: 'shipped', label: 'Carriage Carriage Transit', desc: 'Secure transit dispatch' },
                          { key: 'delivered', label: 'Estate Received', desc: 'Hand to hand release' }
                        ].map((step, idx) => {
                          const statusOrder = ['pending', 'processing', 'shipped', 'delivered'];
                          const currentIdx = statusOrder.indexOf(selectedOrder.orderStatus);
                          const active = statusOrder.indexOf(step.key) <= currentIdx;
                          return (
                            <div key={step.key} className="flex flex-col items-center text-center z-10 font-sans text-[10px]">
                              <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center transition-colors shadow ${active ? 'bg-[#2E2E2E] text-[#F8F4EC]' : 'bg-white text-stone-400 border border-stone-300'}`}>
                                <Check className={`w-4 h-4 ${active ? 'opacity-100' : 'opacity-20'}`} />
                              </div>
                              <p className="font-extrabold text-[#2E2E2E] mt-2 tracking-wide leading-tight">{step.label}</p>
                              <p className="text-[8px] text-stone-800 leading-tight hidden sm:block mt-0.5">{step.desc}</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Items Listing Drawer */}
                      <p className="text-[11px] uppercase tracking-widest font-sans font-black text-[#2E2E2E]/80 mb-2 text-[#8B5A2B]">Packing List Slip</p>
                      <div className="space-y-2.5 bg-white/20 p-4 rounded-xl border border-stone-800/10 mb-6">
                        {selectedOrder.items.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs text-stone-800 font-sans">
                            <div className="flex items-center gap-3">
                              <span className="w-5 h-5 rounded bg-[#2E2E2E]/10 flex items-center justify-center text-[10px] font-bold">{idx+1}</span>
                              <span className="font-serif italic text-stone-950 font-bold">{it.title}</span>
                              <span className="text-[9px] uppercase font-bold text-[#8B5A2B] bg-[#2E2E2E]/5 px-2 py-0.5 rounded">x{it.quantity}</span>
                            </div>
                            <span className="font-mono font-semibold">${(it.price * it.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="border-t border-stone-800/10 pt-2 flex justify-between font-extrabold text-sm text-[#2E2E2E]">
                          <span>Estate Receipt Amount:</span>
                          <span className="font-mono text-stone-900">${selectedOrder.totalAmount.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Shipping Consignee Address Details block */}
                      <p className="text-[11px] uppercase tracking-widest font-sans font-black text-[#2E2E2E]/80 mb-2 text-[#8B5A2B]">Consigned Estate Destination</p>
                      <div className="bg-white/40 p-4 rounded-xl font-sans text-xs text-stone-800">
                        <p className="font-serif italic font-bold text-stone-950 mb-1">{selectedOrder.shippingAddress.fullName}</p>
                        <p className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 opacity-60" /> {selectedOrder.shippingAddress.phone}</p>
                        <p className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 opacity-60" /> 
                          {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}, {selectedOrder.shippingAddress.pincode}, {selectedOrder.shippingAddress.country}
                        </p>
                      </div>

                    </div>
                  ) : (
                    <div className="p-12 text-center border-2 border-stone-400 border-dashed rounded-3xl text-stone-500 font-serif italic bg-white/20">
                      Select a specific carriage record from the panel to track transit movement maps.
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* ==========================================
            6. PROFILE COMPONENT (WOODMORPHIC CABINET)
           ========================================== */}
        {page === 'profile' && (
          <div className="max-w-xl mx-auto space-y-8" id="profile-logged-view">
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-center text-[#2E2E2E]">Registry Information</h2>

            {user ? (
              <div 
                className="relative overflow-hidden p-6 sm:p-10 rounded-3xl border border-[#C8A96A]/30 text-[#2E2E2E] space-y-6"
                style={{ background: 'linear-gradient(135deg, #d2b48c, #c19a6b)', boxShadow: '8px 8px 16px #ded6c8, -8px -8px 16px #ffffff' }}
              >
                {/* Brass visual highlights decor */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-tr from-yellow-700/10 to-transparent rounded-bl-full pointer-events-none"></div>

                <div className="flex items-center gap-5 border-b border-[#2E2E2E]/10 pb-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-[#2E2E2E] text-white flex items-center justify-center font-bold text-lg shadow">
                    {user.avatar ? (
                      <img src={user.avatar} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      user.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-black">{user.name}</h3>
                    <p className="text-xs uppercase font-sans tracking-widest text-[#8B5A2B] font-bold">{user.role} Member Profile</p>
                  </div>
                </div>

                {/* Account records block details */}
                <div className="space-y-3 font-sans text-xs text-stone-800">
                  <div className="flex justify-between border-b border-stone-800/10 pb-2">
                    <span className="font-bold">Credential Email:</span>
                    <span>{user.email}</span>
                  </div>
                  <div className="flex justify-between border-b border-stone-800/10 pb-2">
                    <span className="font-bold">Registered Telephone:</span>
                    <span>{user.phone || 'No direct telephone recorded'}</span>
                  </div>
                  <div className="flex justify-between border-b border-stone-800/10 pb-2">
                    <span className="font-bold">Member Since:</span>
                    <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <button 
                  onClick={handleLogout}
                  className="w-full bg-[#2E2E2E] hover:bg-stone-900 text-[#F8F4EC] transition-all py-3.5 rounded-xl text-xs uppercase tracking-widest font-sans font-black shadow"
                  id="profile-logout-button"
                >
                  Clear Member Session (Logout)
                </button>
              </div>
            ) : (
              
              /* USER LOGIN / REGISTRATION FOLD-OUT */
              <div 
                className="relative overflow-hidden p-6 sm:p-10 rounded-3xl border border-[#C8A96A]/30 text-[#2E2E2E] space-y-6"
                style={{ background: 'linear-gradient(135deg, #d2b48c, #c19a6b)', boxShadow: '8px 8px 16px #ded6c8, -8px -8px 16px #ffffff' }}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-tr from-yellow-700/10 to-transparent rounded-bl-full pointer-events-none"></div>

                <div className="flex justify-center gap-4 border-b border-stone-800/15 pb-4 mb-4 font-sans uppercase text-xs font-black">
                  <button 
                    onClick={() => { setAuthMode('login'); setAuthError(''); }}
                    className={`pb-1 transition-all ${authMode === 'login' ? 'border-b-2 border-[#2E2E2E] text-[#2E2E2E]' : 'text-[#2E2E2E]/55'}`}
                    id="switch-auth-login"
                  >
                    Enter Vault (Login)
                  </button>
                  <span className="text-[#2E2E2E]/25">|</span>
                  <button 
                    onClick={() => { setAuthMode('register'); setAuthError(''); }}
                    className={`pb-1 transition-all ${authMode === 'register' ? 'border-b-2 border-[#2E2E2E] text-[#2E2E2E]' : 'text-[#2E2E2E]/55'}`}
                    id="switch-auth-register"
                  >
                    Open Account (Register)
                  </button>
                </div>

                {authError && (
                  <div className="p-3 bg-red-100 text-red-800 text-xs font-sans rounded-xl border border-red-200">
                    {authError}
                  </div>
                )}

                <form onSubmit={handleAuthSubmit} className="space-y-4 font-sans text-xs">
                  {authMode === 'register' && (
                    <div className="space-y-1">
                      <label className="uppercase tracking-widest font-bold text-[#2E2E2E] text-[10px]">Your Full Name:</label>
                      <input 
                        type="text"
                        required
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Julian Vance"
                        className="w-full p-3 bg-white/70 text-[#2E2E2E] rounded-xl outline-none border border-stone-800/10 focus:bg-white placeholder-stone-600 font-serif text-xs"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="uppercase tracking-widest font-bold text-[#2E2E2E] text-[10px]">Registry Email:</label>
                    <input 
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="julian.vance@estate.com"
                      className="w-full p-3 bg-white/70 text-[#2E2E2E] rounded-xl outline-none border border-stone-800/10 focus:bg-white placeholder-stone-600 font-serif text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="uppercase tracking-widest font-bold text-[#2E2E2E] text-[10px]">Security Key Password:</label>
                    <input 
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full p-3 bg-white/70 text-[#2E2E2E] rounded-xl outline-none border border-stone-800/10 focus:bg-white placeholder-stone-600 font-serif text-xs"
                    />
                  </div>

                  {authMode === 'register' && (
                    <div className="space-y-1">
                      <label className="uppercase tracking-widest font-bold text-[#2E2E2E] text-[10px]">Private Telephone Number:</label>
                      <input 
                        type="tel"
                        value={authPhone}
                        onChange={(e) => setAuthPhone(e.target.value)}
                        placeholder="+1 (555) 012-3456"
                        className="w-full p-3 bg-white/70 text-[#2E2E2E] rounded-xl outline-none border border-stone-800/10 focus:bg-white placeholder-stone-600 font-serif text-xs"
                      />
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full py-4 bg-[#2E2E2E] hover:bg-stone-900 text-[#F8F4EC] transition-all rounded-xl font-sans uppercase font-black tracking-widest cursor-pointer shadow-md text-xs mt-2"
                    id="auth-submit-button"
                  >
                    {authMode === 'login' ? 'Conclude Authentication' : 'Establish Grand Account'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            7. ADMIN TERMINAL / ANCHORS / STATS
           ========================================== */}
        {page === 'admin' && user?.role === 'admin' && (
          <div className="space-y-8 animate-fade-in" id="admin-view">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#C8A96A]/20 pb-4 gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#2E2E2E]">Administrative Terminal</h2>
                <p className="text-xs text-stone-500 font-sans tracking-wide mt-1">Connoisseur inventory calibrators & estate dispatch systems.</p>
              </div>
              
              {/* Reset to boutique safely */}
              <button 
                onClick={() => setPage('boutique')}
                className="text-xs uppercase tracking-widest bg-white hover:bg-[#C8A96A]/10 text-[#8B5A2B] border border-[#C8A96A]/30 py-2 px-4 rounded-xl font-sans font-black shadow-sm"
              >
                ← Return to Boutique
              </button>
            </div>

            {/* NEUMORPHIC STATS MINI GRIDS */}
            {adminStats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                
                <div className="p-5 bg-[#F8F4EC] rounded-2xl shadow-[5px_5px_10px_#e3dac9,-5px_-5px_10px_#ffffff] border border-[#C8A96A]/10 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-sans font-bold text-stone-400">Ledger Revenue</p>
                    <p className="text-xl sm:text-2xl font-mono font-extrabold text-[#8B5A2B] mt-1">${adminStats.revenue.toLocaleString()}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-[#C8A96A]/55" />
                </div>

                <div className="p-5 bg-[#F8F4EC] rounded-2xl shadow-[5px_5px_10px_#e3dac9,-5px_-5px_10px_#ffffff] border border-[#C8A96A]/10 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-sans font-bold text-stone-400">Total Dispatch Orders</p>
                    <p className="text-xl sm:text-2xl font-mono font-extrabold text-[#2E2E2E] mt-1">{adminStats.ordersCount}</p>
                  </div>
                  <Package className="w-8 h-8 text-[#C8A96A]/55" />
                </div>

                <div className="p-5 bg-[#F8F4EC] rounded-2xl shadow-[5px_5px_10px_#e3dac9,-5px_-5px_10px_#ffffff] border border-[#C8A96A]/10 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-sans font-bold text-stone-400">Connoisseur Patrons</p>
                    <p className="text-xl sm:text-2xl font-mono font-extrabold text-[#2E2E2E] mt-1">{adminStats.customersCount}</p>
                  </div>
                  <UserIcon className="w-8 h-8 text-[#C8A96A]/55" />
                </div>

                <div className="p-5 bg-[#F8F4EC] rounded-2xl shadow-[5px_5px_10px_#e3dac9,-5px_-5px_10px_#ffffff] border border-[#C8A96A]/10 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-sans font-bold text-stone-400">Exquisite Vault Items</p>
                    <p className="text-xl sm:text-2xl font-mono font-extrabold text-[#8B5A2B] mt-1">{adminStats.productsCount}</p>
                  </div>
                  <Layers className="w-8 h-8 text-[#C8A96A]/55" />
                </div>

              </div>
            )}

            {/* NEUMORPHIC NAVIGATION TAB SLIDERS FOR PANEL */}
            <div className="flex bg-[#2E2E2E]/5 rounded-xl p-1.5 border border-[#C8A96A]/10">
              {[
                { tab: 'analytics', label: 'Vault Analytics', icon: BarChart3 },
                { tab: 'products', label: 'Inventory Supply', icon: Layers },
                { tab: 'orders', label: 'Dispatch Orders', icon: ClipboardList },
                { tab: 'categories', label: 'Design Categories', icon: Package }
              ].map(item => (
                <button 
                  key={item.tab}
                  onClick={() => setAdminTab(item.tab as any)}
                  className={`flex-grow sm:flex-grow-0 px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider font-sans font-black flex items-center justify-center gap-1.5 transition-all ${adminTab === item.tab ? 'bg-[#2E2E2E] text-[#F8F4EC] shadow' : 'text-stone-600 hover:text-[#C8A96A]'}`}
                  id={`admin-tab-${item.tab}`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
            </div>

            {/* 7.1 TERMINAL ANALYTICS VIEW */}
            {adminTab === 'analytics' && adminStats && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* sales trend diagram mock using beautiful pure custom styled SVGs */}
                <div className="lg:col-span-8 p-6 bg-[#F8F4EC] rounded-2xl shadow-[6px_6px_12px_#e3dac9,-6px_-6px_12px_#ffffff] border border-[#C8A96A]/10 space-y-4">
                  <h4 className="text-sm uppercase font-sans tracking-wider font-bold text-[#8B5A2B]">Dispatch Invoicing Trend (Last 30 days)</h4>
                  
                  <div className="h-64 flex items-end justify-between gap-1.5 pt-4">
                    {adminStats.salesTrend.slice(-15).map((point: any, idx: number) => {
                      const maxDaily = Math.max(...adminStats.salesTrend.map((t: any) => t.revenue), 100);
                      const normHeightPercent = (point.revenue / maxDaily) * 100;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                          <span className="text-[8px] font-mono select-none text-stone-500 mb-1 opacity-0 hover:opacity-100 transition-opacity">
                            ${point.revenue.toLocaleString()}
                          </span>
                          <div 
                            className="w-full bg-[#C8A96A] hover:bg-[#8B5A2B] rounded-t transition-all"
                            style={{ height: `${Math.max(normHeightPercent, 5)}%` }}
                          ></div>
                          <span className="text-[7.5px] font-sans tracking-wide text-stone-400 mt-2 rotate-45 origin-left truncate max-w-full">
                            {point.date}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-stone-400 text-center pt-3 font-sans">Hover bar towers to view daily invoicing release.</p>
                </div>

                {/* top sellers and categories rings summary chart */}
                <div className="lg:col-span-4 space-y-6">
                  
                  {/* Category Performance Donut Representation */}
                  <div className="p-5 bg-[#F8F4EC] rounded-2xl shadow-[6px_6px_12px_#e3dac9,-6px_-6px_12px_#ffffff] border border-[#C8A96A]/10 space-y-3">
                    <h4 className="text-xs uppercase font-sans tracking-wider font-black text-stone-400">Atelier Class Performance</h4>
                    <div className="space-y-2.5">
                      {adminStats.categoryPerformance.map((cat: any, i: number) => (
                        <div key={i} className="text-xs font-sans">
                          <div className="flex justify-between text-stone-700">
                            <span>{cat.name}</span>
                            <span className="font-mono font-bold">${cat.value.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-stone-200 h-1 rounded overflow-hidden mt-1">
                            <div className="bg-[#C8A96A] h-full" style={{ width: `${Math.min((cat.value / (adminStats.revenue || 1)) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Leaderboards top items sold */}
                  <div className="p-5 bg-[#F8F4EC] rounded-2xl shadow-[6px_6px_12px_#e3dac9,-6px_-6px_12px_#ffffff] border border-[#C8A96A]/10 space-y-3">
                    <h4 className="text-xs uppercase font-sans tracking-wider font-black text-stone-400">Top Showcased Sales</h4>
                    <div className="divide-y divide-stone-200 text-xs font-sans">
                      {adminStats.topProducts.map((p: any, i: number) => (
                        <div key={i} className="py-2 flex justify-between items-center">
                          <span className="truncate max-w-[150px] font-serif font-bold text-stone-700">{p.title}</span>
                          <div className="text-right flex flex-col">
                            <span className="font-mono font-extrabold text-[#8B5A2B]">${p.revenue.toLocaleString()}</span>
                            <span className="text-[9px] text-stone-400">{p.salesCount} custom units boxed</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* 7.2 PRODUCT MANAGEMENT INVENTORY GRID / CREATE NEW */}
            {adminTab === 'products' && (
              <div className="space-y-8">
                
                {/* WOODMORPHIC CONSOLE CABINET PORT FOR PRODUCT ADDITION */}
                <div 
                  className="relative overflow-hidden p-6 sm:p-8 rounded-3xl border border-[#C8A96A]/30 text-[#2E2E2E] space-y-4"
                  style={{ background: 'linear-gradient(135deg, #d2b48c, #c19a6b)', boxShadow: '8px 8px 16px #ded6c8, -8px -8px 16px #ffffff' }}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-tr from-yellow-700/10 to-transparent rounded-bl-full pointer-events-none"></div>

                  <h3 className="text-lg font-serif font-black uppercase tracking-wide">
                    {editingProductId ? 'Recalibrate Selected Masterpiece' : 'Showcase Brand New Luxury Goods'}
                  </h3>

                  <form onSubmit={handleAdminProductSubmit} className="space-y-4 font-sans text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="space-y-1">
                        <label className="uppercase tracking-widest font-bold text-[#2E2E2E] text-[10px]">Product Heading:</label>
                        <input 
                          type="text"
                          required
                          value={productForm.title}
                          onChange={(e) => setProductForm({...productForm, title: e.target.value})}
                          placeholder="e.g. Rolex Cosmograph Daytona Gold"
                          className="w-full p-2.5 bg-white/70 text-[#2E2E2E] rounded-xl outline-none border border-stone-800/10 focus:bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="uppercase tracking-widest font-bold text-[#2E2E2E] text-[10px]">Maker Brand:</label>
                        <input 
                          type="text"
                          required
                          value={productForm.brand}
                          onChange={(e) => setProductForm({...productForm, brand: e.target.value})}
                          placeholder="e.g. Rolex"
                          className="w-full p-2.5 bg-white/70 text-[#2E2E2E] rounded-xl outline-none border border-stone-800/10 focus:bg-white"
                        />
                      </div>

                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      
                      <div className="space-y-1">
                        <label className="uppercase tracking-widest font-bold text-[#2E2E2E] text-[10px]">Initial Price ($):</label>
                        <input 
                          type="number"
                          required
                          value={productForm.price || ''}
                          onChange={(e) => setProductForm({...productForm, price: Number(e.target.value)})}
                          placeholder="e.g. 1500"
                          className="w-full p-2.5 bg-white/70 text-[#2E2E2E] rounded-xl outline-none border border-stone-800/10 focus:bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="uppercase tracking-widest font-bold text-[#2E2E2E] text-[10px]">Discount Value Target ($):</label>
                        <input 
                          type="number"
                          value={productForm.discountPrice || ''}
                          onChange={(e) => setProductForm({...productForm, discountPrice: e.target.value ? Number(e.target.value) : undefined})}
                          placeholder="e.g. 1350"
                          className="w-full p-2.5 bg-white/70 text-[#2E2E2E] rounded-xl outline-none border border-stone-800/10 focus:bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="uppercase tracking-widest font-bold text-[#2E2E2E] text-[10px]">Supply Stock count:</label>
                        <input 
                          type="number"
                          required
                          value={productForm.stock || 0}
                          onChange={(e) => setProductForm({...productForm, stock: Number(e.target.value)})}
                          className="w-full p-2.5 bg-white/70 text-[#2E2E2E] rounded-xl outline-none border border-stone-800/10 focus:bg-white"
                        />
                      </div>

                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="space-y-1">
                        <label className="uppercase tracking-widest font-bold text-[#2E2E2E] text-[10px]">Atelier Class Category:</label>
                        <select 
                          value={productForm.category}
                          onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                          className="w-full p-2.5 bg-white/70 text-[#2E2E2E] rounded-xl outline-none border border-stone-800/10 focus:bg-white uppercase tracking-wider font-extrabold text-[10px]"
                        >
                          <option value="">Choose Atelier Class</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="uppercase tracking-widest font-bold text-[#2E2E2E] text-[10px]">Image URL Link:</label>
                        <input 
                          type="url"
                          value={productForm.images ? productForm.images[0] : ''}
                          onChange={(e) => setProductForm({...productForm, images: [e.target.value]})}
                          placeholder="Link to image (e.g. Unsplash URL)"
                          className="w-full p-2.5 bg-white/70 text-[#2E2E2E] rounded-xl outline-none border border-stone-800/10 focus:bg-white font-mono"
                        />
                      </div>

                    </div>

                    <div className="space-y-1">
                      <label className="uppercase tracking-widest font-bold text-[#2E2E2E] text-[10px]">Masterpiece Specifications:</label>
                      <textarea 
                        rows={2}
                        required
                        value={productForm.description}
                        onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                        className="w-full p-2.5 bg-white/70 text-[#2E2E2E] rounded-xl outline-none border border-stone-800/10 focus:bg-white font-serif leading-relaxed"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 pt-2">
                      <input 
                        type="checkbox"
                        id="prod-featured"
                        checked={productForm.featured}
                        onChange={(e) => setProductForm({...productForm, featured: e.target.checked})}
                        className="w-4 h-4 cursor-pointer accent-[#2E2E2E]"
                      />
                      <label htmlFor="prod-featured" className="uppercase tracking-wider font-bold text-[#2E2E2E] text-[10px] cursor-pointer">Pin to atelier entrance carousel (Featured Highlight)</label>
                    </div>

                    <div className="flex gap-4">
                      <button 
                        type="submit"
                        className="flex-1 py-3 bg-[#2E2E2E] hover:bg-stone-900 text-[#F8F4EC] rounded-xl font-sans uppercase font-black tracking-widest text-xs"
                        id="admin-product-save"
                      >
                        {editingProductId ? 'Apply Modifications' : 'Place in Gallery Exhibition'}
                      </button>
                      
                      {editingProductId && (
                        <button 
                          type="button"
                          onClick={() => {
                            setEditingProductId(null);
                            setProductForm({
                              title: '', description: '', price: 0, discountPrice: undefined, stock: 10, category: '', brand: '', images: [''], featured: false
                            });
                          }}
                          className="px-6 py-3 border border-[#8B5A2B] text-[#2E2E2E] font-bold rounded-xl font-sans uppercase text-xs"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Grid list of catalog controls */}
                <div className="p-6 bg-[#F8F4EC] rounded-2xl shadow-[6px_6px_12px_#e3dac9,-6px_-6px_12px_#ffffff] border border-[#C8A96A]/10">
                  <h4 className="text-sm uppercase font-sans tracking-wider font-bold text-[#8B5A2B] mb-4">Stock Ledger Roll</h4>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-sans">
                      <thead>
                        <tr className="border-b border-[#C8A96A]/20 uppercase tracking-wider text-stone-400 font-extrabold text-[9px]">
                          <th className="py-2.5">Showcase Item</th>
                          <th className="py-2.5">Maker</th>
                          <th className="py-2.5">Price</th>
                          <th className="py-2.5">Curator Class</th>
                          <th className="py-2.5">Supply stock</th>
                          <th className="py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#C8A96A]/10">
                        {products.map(p => (
                          <tr key={p.id} className="hover:bg-[#C8A96A]/5">
                            <td className="py-3 font-serif font-bold text-stone-800 flex items-center gap-2">
                              <img src={p.images[0]} className="w-8 h-8 rounded object-cover" />
                              <span>{p.title}</span>
                            </td>
                            <td className="py-3 uppercase text-[10px] tracking-wide text-stone-500">{p.brand}</td>
                            <td className="py-3 font-mono font-bold">${(p.discountPrice || p.price).toLocaleString()}</td>
                            <td className="py-3 truncate max-w-[120px]">{categories.find(c => c.id === p.category)?.name || 'Heritage'}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded font-mono font-bold ${p.stock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                {p.stock}
                              </span>
                            </td>
                            <td className="py-3 text-right space-x-1 shrink-0">
                              <button 
                                onClick={() => {
                                  setEditingProductId(p.id);
                                  setProductForm(p);
                                  window.scrollTo({ top: 300, behavior: 'smooth' });
                                }}
                                className="p-1 px-2.5 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded uppercase font-bold text-[8px]"
                                id={`edit-prod-${p.id}`}
                              >
                                Adjust
                              </button>
                              <button 
                                onClick={() => handleAdminDeleteProduct(p.id)}
                                className="p-1 px-2.5 bg-red-100 hover:bg-red-200 text-red-800 rounded uppercase font-bold text-[8px]"
                                id={`delete-prod-${p.id}`}
                              >
                                Withdraw
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* 7.3 DISPATCH SYSTEM ORDER CALIBRATOR */}
            {adminTab === 'orders' && (
              <div className="p-6 bg-[#F8F4EC] rounded-2xl shadow-[6px_6px_12px_#e3dac9,-6px_-6px_12px_#ffffff] border border-[#C8A96A]/10 space-y-4">
                <h4 className="text-sm uppercase font-sans tracking-wider font-bold text-[#8B5A2B]">Carriage Service Calibrator</h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-sans">
                    <thead>
                      <tr className="border-b border-[#C8A96A]/20 uppercase tracking-wider text-stone-400 font-extrabold text-[9px]">
                        <th className="py-2.5">Invoice ID</th>
                        <th className="py-2.5">Patron Box Person</th>
                        <th className="py-2.5">Acquisition Date</th>
                        <th className="py-2.5">Total Settlement</th>
                        <th className="py-2.5">Payments</th>
                        <th className="py-2.5">Carriage Progress Status</th>
                        <th className="py-2.5 text-right">Transition Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#C8A96A]/10">
                      {orders.map(o => (
                        <tr key={o.id} className="hover:bg-[#C8A96A]/5">
                          <td className="py-3 font-mono font-bold text-[#8B5A2B]">{o.id}</td>
                          <td className="py-3 font-serif italic text-stone-800 font-black">{o.shippingAddress.fullName}</td>
                          <td className="py-3 text-[10px] text-stone-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                          <td className="py-3 font-mono font-bold">${o.totalAmount.toLocaleString()}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded font-mono font-black border text-[9px] uppercase ${o.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
                              {o.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3 uppercase text-[9px] font-bold">
                            <span className={`px-2 py-0.5 rounded ${o.orderStatus === 'delivered' ? 'bg-emerald-100 text-emerald-800' : o.orderStatus === 'shipped' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                              {o.orderStatus}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <select 
                              value={o.orderStatus}
                              onChange={(e) => handleOrderChangeStatus(o.id, e.target.value)}
                              className="px-2 py-1 bg-white text-[10px] font-bold uppercase rounded border border-stone-300 outline-none"
                              id={`status-dropdown-${o.id}`}
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 7.4 DESIGN CATEGORY SEEDER OR ADDER */}
            {adminTab === 'categories' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Woodmorphic seeder port category */}
                <div 
                  className="lg:col-span-5 relative overflow-hidden p-6 rounded-3xl border border-[#C8A96A]/30 text-[#2E2E2E]"
                  style={{ background: 'linear-gradient(135deg, #d2b48c, #c19a6b)', boxShadow: '8px 8px 16px #ded6c8, -8px -8px 16px #ffffff' }}
                >
                  <h3 className="text-base font-serif font-black uppercase tracking-wide mb-4">Design Brand Class Categories</h3>
                  
                  <form onSubmit={handleAdminCategorySubmit} className="space-y-4 font-sans text-xs">
                    <div className="space-y-1">
                      <label className="uppercase tracking-widest font-bold text-[#2E2E2E] text-[10px]">Aesthetic Title Name:</label>
                      <input 
                        type="text"
                        required
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                        placeholder="e.g. Fine Silk Couture"
                        className="w-full p-2.5 bg-white/70 text-[#2E2E2E] rounded-xl outline-none border border-stone-800/10 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="uppercase tracking-widest font-bold text-[#2E2E2E] text-[10px]">Exquisite Frame Picture URL:</label>
                      <input 
                        type="url"
                        value={categoryForm.image}
                        onChange={(e) => setCategoryForm({...categoryForm, image: e.target.value})}
                        placeholder="Link to image showcase"
                        className="w-full p-2.5 bg-white/70 text-[#2E2E2E] rounded-xl outline-none border border-stone-800/10 focus:bg-white font-mono"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-3 bg-[#2E2E2E] hover:bg-stone-900 text-[#F8F4EC] rounded-xl font-sans uppercase font-black tracking-widest text-xs"
                      id="admin-category-save"
                    >
                      Establish Aesthetic Category
                    </button>
                  </form>
                </div>

                {/* Display grid categories registered */}
                <div className="lg:col-span-7 p-6 bg-[#F8F4EC] rounded-2xl shadow-[6px_6px_12px_#e3dac9,-6px_-6px_12px_#ffffff] border border-[#C8A96A]/10 space-y-4">
                  <h4 className="text-sm uppercase font-sans tracking-wider font-bold text-[#8B5A2B]">Established Curations Categories</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {categories.map(c => (
                      <div key={c.id} className="p-2 border border-[#C8A96A]/25 rounded-xl bg-white/60 flex items-center gap-3">
                        <img src={c.image} className="w-12 h-12 rounded object-cover" />
                        <div>
                          <p className="font-serif font-bold text-xs text-[#2E2E2E]">{c.name}</p>
                          <span className="text-[9px] uppercase text-stone-400 font-bold font-sans">Slug: {c.slug}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* LUXURY BRASS REVERSED SOLID FOOTER */}
      <footer className="bg-[#2E2E2E] text-[#F8F4EC]/65 text-xs py-8 px-6 mt-16 border-t-2 border-[#C8A96A]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-sm font-black tracking-widest text-[#F8F4EC] uppercase font-serif mt-1">LUXECART PRO <span className="text-[#C8A96A] font-light">ESTATE</span></h4>
            <p className="text-[10px] font-sans tracking-wider text-[#C8A96A]/75">Crafting timeless standards in online trade exhibitions.</p>
          </div>
          <div className="flex gap-4 uppercase tracking-widest font-sans font-bold text-[9px] text-[#C8A96A]">
            <span className="hover:text-white transition-colors cursor-pointer">Security Vault</span>
            <span>•</span>
            <span className="hover:text-white transition-colors cursor-pointer">Luggage carriage</span>
            <span>•</span>
            <span className="hover:text-white transition-colors cursor-pointer">Estate escrow</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
