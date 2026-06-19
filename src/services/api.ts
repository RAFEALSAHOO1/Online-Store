import { User, Product, Category, Cart, Order, Review, Wishlist, AdminStats, Address, OrderStatus, PaymentStatus } from '../types';

const API_BASE = '/api';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('luxecart_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! Status: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  // Auth
  async register(data: { name: string; email: string; password?: string; phone?: string }): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ user: User; token: string }>(res);
  },

  async login(data: { email: string; password?: string }): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ user: User; token: string }>(res);
  },

  async getProfile(): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<{ user: User }>(res);
  },

  async updateProfile(data: Partial<User>): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ user: User }>(res);
  },

  // Products
  async getProducts(params?: {
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    brand?: string;
  }): Promise<Product[]> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== '') {
          query.append(key, String(val));
        }
      });
    }
    const res = await fetch(`${API_BASE}/products?${query.toString()}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<Product[]>(res);
  },

  async getProduct(id: string): Promise<Product & { reviews: Review[] }> {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<Product & { reviews: Review[] }>(res);
  },

  async createProduct(data: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Product>(res);
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Product>(res);
  },

  async deleteProduct(id: string): Promise<{ message: string; deleted: Product }> {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<{ message: string; deleted: Product }>(res);
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<Category[]>(res);
  },

  async createCategory(data: Partial<Category>): Promise<Category> {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Category>(res);
  },

  async deleteCategory(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<{ message: string }>(res);
  },

  // Wishlist
  async getWishlist(): Promise<{ productIds: string[]; products: Product[] }> {
    const res = await fetch(`${API_BASE}/wishlist`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<{ productIds: string[]; products: Product[] }>(res);
  },

  async toggleWishlist(productId: string): Promise<Wishlist> {
    const res = await fetch(`${API_BASE}/wishlist/toggle`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ productId }),
    });
    return handleResponse<Wishlist>(res);
  },

  // Cart
  async getCart(): Promise<{ userId: string; items: { product: Product; quantity: number }[] }> {
    const res = await fetch(`${API_BASE}/cart`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<{ userId: string; items: { product: Product; quantity: number }[] }>(res);
  },

  async syncCart(items: { productId: string; quantity: number }[]): Promise<Cart> {
    const res = await fetch(`${API_BASE}/cart`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ items }),
    });
    return handleResponse<Cart>(res);
  },

  async clearCart(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/cart/clear`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<{ message: string }>(res);
  },

  // Orders
  async createOrder(data: {
    items: { productId: string; quantity: number }[];
    shippingAddress: Address;
    paymentMethod: string;
  }): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Order>(res);
  },

  async getOrders(): Promise<Order[]> {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<Order[]>(res);
  },

  async getOrder(id: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<Order>(res);
  },

  async updateOrderStatus(id: string, data: { orderStatus: OrderStatus; paymentStatus?: PaymentStatus }): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Order>(res);
  },

  // Reviews
  async submitReview(data: { productId: string; rating: number; comment: string }): Promise<Review> {
    const res = await fetch(`${API_BASE}/reviews`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Review>(res);
  },

  async deleteReview(id: string): Promise<{ message: string; deleted: Review }> {
    const res = await fetch(`${API_BASE}/reviews/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<{ message: string; deleted: Review }>(res);
  },

  // Admin Analytics
  async getAnalytics(): Promise<AdminStats> {
    const res = await fetch(`${API_BASE}/analytics`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<AdminStats>(res);
  }
};
