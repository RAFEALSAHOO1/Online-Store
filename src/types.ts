export interface Address {
  fullName: string;
  phone: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin';
  phone?: string;
  avatar?: string;
  addresses: Address[];
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  discountPrice?: number;
  stock: number;
  category: string; // Category ID
  brand: string;
  images: string[];
  rating: number;
  reviewCount: number;
  featured: boolean;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Cart {
  userId: string;
  items: CartItem[];
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderItem {
  productId: string;
  title: string;
  image: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  shippingAddress: Address;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  totalAmount: number;
  createdAt: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  productId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Wishlist {
  userId: string;
  productIds: string[];
}

export interface AdminStats {
  revenue: number;
  ordersCount: number;
  customersCount: number;
  productsCount: number;
  salesTrend: { date: string; revenue: number; orders: number }[];
  categoryPerformance: { name: string; value: number }[];
  topProducts: { title: string; salesCount: number; revenue: number }[];
}
