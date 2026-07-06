'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  stock: number;
  active: boolean;
  costUsd: number;
  trm: number;
  markupPercent: number;
  options: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  balance: number;
  createdAt: string;
}

interface Order {
  id: string;
  userId: string;
  productId: string;
  total: number;
  status: string;
  credentials?: string;
  createdAt: string;
  product: Product;
  user?: {
    name: string;
    email: string;
    balance: number;
  };
}

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Bypass admin login for local testing
  const [authLoading, setAuthLoading] = useState(false); // Bypass admin login for local testing
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Dashboard State
  const [activeTab, setActiveTab] = useState<'metrics' | 'products' | 'orders' | 'users' | 'sourcing'>('metrics');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const PRODUCTS_PER_PAGE = 25;

  // Edit Product State
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    costUsd: '',
    trm: '',
    markupPercent: '',
    category: 'PS5',
    imageUrl: '',
    stock: '',
    active: true,
    options: '',
  });

  // Edit User Balance State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userBalanceForm, setUserBalanceForm] = useState('');

  // Expand Product Variants State
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});

  // Order Delivery State
  const [deliveringOrder, setDeliveringOrder] = useState<Order | null>(null);
  const [credentialsInput, setCredentialsInput] = useState('');

  // Provider Sourcing Engine State
  const [searchQuery, setSearchQuery] = useState('capcut');
  const [searchMaxPrice, setSearchMaxPrice] = useState('4');
  const [searchMinSales, setSearchMinSales] = useState('100');
  const [searchMinRating, setSearchMinRating] = useState('10');
  const [searchPlatform, setSearchPlatform] = useState('Todas');
  const [searchSeller, setSearchSeller] = useState('');
  const [sellerAutocomplete, setSellerAutocomplete] = useState<string[]>([]);
  const [showSellerDropdown, setShowSellerDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sourcingError, setSourcingError] = useState('');

  // Import Product State
  const [isImportingProduct, setIsImportingProduct] = useState(false);
  const [importProductId, setImportProductId] = useState('');
  const [importCategory, setImportCategory] = useState('Suscripciones');
  const [importExchangeRate, setImportExchangeRate] = useState('4000');
  const [importMarkup, setImportMarkup] = useState('20');
  const [importStock, setImportStock] = useState('10');
  const [importLoading, setImportLoading] = useState(false);

  // Mount on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check auth on load
  useEffect(() => {
    if (mounted) {
      checkAuth();
    }
  }, [mounted]);

  // Fetch data if authenticated
  useEffect(() => {
    if (mounted && isAuthenticated) {
      fetchDashboardData();
    }
  }, [mounted, isAuthenticated]);

  const checkAuth = async () => {
    try {
      setAuthLoading(true);
      const res = await fetch('/api/auth');
      const data = await res.json();
      if (res.ok && data.authenticated && data.user && data.user.role === 'admin') {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.user && data.user.role === 'admin') {
          setIsAuthenticated(true);
        } else {
          setLoginError('Acceso denegado: se requieren privilegios de administrador.');
        }
      } else {
        setLoginError(data.message || 'Error al iniciar sesión');
      }
    } catch (err) {
      setLoginError('Error de conexión con el servidor.');
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth', { method: 'DELETE' });
      if (res.ok) {
        setIsAuthenticated(false);
        setEmail('');
        setPassword('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setDataLoading(true);
      const prodRes = await fetch('/api/products?all=true');
      const orderRes = await fetch('/api/orders');
      const userRes = await fetch('/api/users');

      if (prodRes.ok && orderRes.ok && userRes.ok) {
        const prodData = await prodRes.json();
        const orderData = await orderRes.json();
        const userData = await userRes.json();
        setProducts(Array.isArray(prodData) ? prodData : []);
        setOrders(Array.isArray(orderData) ? orderData : []);
        setUsers(Array.isArray(userData) ? userData : []);
      }
    } catch (err) {
      console.error('Error al cargar datos del admin:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Format COP helper
  const formatCOP = (val: number) => {
    const actualPesos = Math.round(val * 1000);
    return '$' + actualPesos.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Product Operations
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description,
      price: Math.round(product.price * 1000).toString(),
      costUsd: (product.costUsd || 0).toString(),
      trm: (product.trm || 4000).toString(),
      markupPercent: (product.markupPercent || 0).toString(),
      category: product.category,
      imageUrl: product.imageUrl,
      stock: product.stock.toString(),
      active: product.active,
      options: product.options || '',
    });
  };

  const openAddModal = () => {
    setIsAddingProduct(true);
    setProductForm({
      name: '',
      description: '',
      price: '',
      costUsd: '0',
      trm: '4000',
      markupPercent: '20',
      category: 'PS5',
      imageUrl: '',
      stock: '10',
      active: true,
      options: '',
    });
  };

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al subir');

      setProductForm(prev => ({ ...prev, imageUrl: data.url }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      alert('Error subiendo imagen: ' + message);
    } finally {
      setUploadingImage(false);
      // Reset file input so same file can be re-selected
      e.target.value = '';
    }
  };

  const updateFormPrices = (newCostUsd: string, newTrm: string, newMarkupPercent: string, newPrice: string) => {
    const c = parseFloat(newCostUsd) || 0;
    const t = parseFloat(newTrm) || 0;
    const m = parseFloat(newMarkupPercent) || 0;
    const p = parseFloat(newPrice) || 0;

    setProductForm(prev => {
      let updatedOptions = prev.options;
      if (prev.options) {
        try {
          const opts = JSON.parse(prev.options);
          if (Array.isArray(opts) && opts.length > 0) {
            const oldPrice = parseFloat(prev.price) || 0;
            const oldPriceScale = oldPrice / 1000;
            const newPriceScale = p / 1000;
            const factor = oldPriceScale > 0 ? newPriceScale / oldPriceScale : 1;

            const updated = opts.map((opt: any) => {
              if (opt.costUsd !== undefined && opt.costUsd !== null) {
                const vPrice = Math.ceil((opt.costUsd * t * (1 + m / 100)) / 1000);
                return { ...opt, price: vPrice };
              } else {
                const vPrice = Math.ceil(opt.price * factor);
                return { ...opt, price: vPrice };
              }
            });
            updatedOptions = JSON.stringify(updated);
          }
        } catch (err) {}
      }

      return {
        ...prev,
        costUsd: newCostUsd,
        trm: newTrm,
        markupPercent: newMarkupPercent,
        price: newPrice,
        options: updatedOptions,
      };
    });
  };

  const closeProductModal = () => {
    setEditingProduct(null);
    setIsAddingProduct(false);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price || !productForm.imageUrl) {
      alert('Por favor completa los campos obligatorios.');
      return;
    }

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm),
      });

      if (res.ok) {
        alert(editingProduct ? 'Juego actualizado con éxito.' : 'Juego creado con éxito.');
        closeProductModal();
        fetchDashboardData();
      } else {
        const data = await res.json();
        alert(data.message || 'Error al guardar el producto.');
      }
    } catch (err) {
      console.error(err);
      alert('Error en el servidor.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este juego? Si tiene pedidos registrados se desactivará en su lugar.')) {
      return;
    }

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchDashboardData();
      } else {
        alert('Error al intentar eliminar el juego.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Order Operations
  const handleUpdateOrderStatus = async (orderId: string, status: 'Completado' | 'Cancelado', credentials = '') => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, credentials }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al actualizar el pedido');
      }

      setDeliveringOrder(null);
      setCredentialsInput('');
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar el pedido.');
    }
  };

  // User Operations
  const handleUserBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          balance: parseFloat(userBalanceForm),
        }),
      });

      if (res.ok) {
        alert('Saldo de usuario actualizado con éxito.');
        setEditingUser(null);
        setUserBalanceForm('');
        fetchDashboardData();
      } else {
        const data = await res.json();
        alert(data.message || 'Error al actualizar saldo.');
      }
    } catch (err) {
      console.error(err);
      alert('Error al conectar con el servidor.');
    }
  };

  // Provider Sourcing Engine Search
  const handleSearchProviders = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchLoading(true);
    setSourcingError('');
    setSearchResults([]);

    try {
      const res = await fetch('/api/digiseller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          productName: searchQuery
        }),
      });

      const data = await res.json();

      if (res.ok && data.content && data.content.items) {
        const maxPrice = parseFloat(searchMaxPrice) || Infinity;
        const minSales = parseInt(searchMinSales) || 0;
        const minRating = parseFloat(searchMinRating) || 0;

        const filtered = data.content.items.filter((item: any) => {
          const price = item.price;
          const sales = item.total_sales || 0;
          const rating = item.seller_rating || 0;
          return price <= maxPrice && sales >= minSales && rating >= minRating;
        });

        setSearchResults(filtered);
      } else {
        setSourcingError(data.retdesc || data.message || 'Error al realizar la búsqueda en Digiseller.');
      }
    } catch (err) {
      console.error(err);
      setSourcingError('Error al conectar con la API de Digiseller.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Import Product from Digiseller
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importProductId) {
      alert('El ID de Producto es requerido.');
      return;
    }

    setImportLoading(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import',
          productId: importProductId,
          category: importCategory,
          exchangeRate: parseFloat(importExchangeRate) || 4000,
          markupPercent: parseFloat(importMarkup) || 0,
          stock: parseInt(importStock) || 10,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('Producto importado y sincronizado con éxito desde Digiseller.');
        setIsImportingProduct(false);
        setImportProductId('');
        fetchDashboardData();
      } else {
        alert(data.message || 'Error al importar de Digiseller.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión con el servidor.');
    } finally {
      setImportLoading(false);
    }
  };

  // Empty Catalog
  const handleEmptyCatalog = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar TODOS los productos del catálogo? Esta acción es irreversible y borrará los productos de la base de datos.')) {
      return;
    }

    try {
      const res = await fetch('/api/products', { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        alert('Se ha vaciado el catálogo correctamente.');
        fetchDashboardData();
      } else {
        alert(data.message || 'Error al vaciar el catálogo.');
      }
    } catch (err) {
      console.error(err);
      alert('Error en el servidor.');
    }
  };

  // Get Metrics
  const getMetrics = () => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    const safeProducts = Array.isArray(products) ? products : [];
    const safeUsers = Array.isArray(users) ? users : [];

    const totalSales = safeOrders
      .filter(o => o && o.status === 'Completado')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const pendingOrders = safeOrders.filter(o => o && o.status === 'Pendiente').length;
    const completedOrders = safeOrders.filter(o => o && o.status === 'Completado').length;
    const totalProducts = safeProducts.length;
    const totalUsers = safeUsers.filter(u => u && u.role !== 'admin').length;

    return {
      totalSales,
      pendingOrders,
      completedOrders,
      totalProducts,
      totalUsers,
    };
  };

  // If not mounted yet (static shell), render basic dark loader
  if (!mounted || authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#070b19' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // LOGIN VIEW
  if (!isAuthenticated) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh', 
        padding: '20px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: 'rgba(13, 21, 45, 0.7)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '40px 30px',
          boxShadow: 'var(--shadow-lg)'
        }}>
          {/* Logo */}
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 800, 
            textAlign: 'center', 
            marginBottom: '30px',
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--ps-blue))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="3">
              <rect x="2" y="2" width="20" height="20" rx="5" strokeWidth="3"></rect>
              <circle cx="12" cy="12" r="5" strokeWidth="3"></circle>
            </svg>
            <span>PLAYSTORE ADMIN</span>
          </div>

          {loginError && (
            <div style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              color: 'var(--accent-red)', 
              padding: '12px', 
              borderRadius: '8px', 
              fontSize: '13px', 
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Correo de Administrador</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@panel.com"
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Contraseña</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
              Ingresar al Dashboard
            </button>
            
            <Link href="/" className="btn btn-secondary" style={{ width: '100%', marginTop: '12px', padding: '10px', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Volver al Panel
            </Link>
          </form>
        </div>
      </div>
    );
  }

  const metrics = getMetrics();

  // AUTHENTICATED ADMIN DASHBOARD
  return (
    <>
      <svg style={{ width: 0, height: 0, position: 'absolute' }}>
        <defs>
          <linearGradient id="cyan-blue-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="100%" stopColor="#0072ce" />
          </linearGradient>
        </defs>
      </svg>

      <header>
        <div className="container nav-container">
          <Link href="/" className="logo" style={{ textDecoration: 'none' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#cyan-blue-grad)" strokeWidth="3">
              <rect x="2" y="2" width="20" height="20" rx="5" strokeWidth="3"></rect>
              <circle cx="12" cy="12" r="5" strokeWidth="3"></circle>
            </svg>
            <span>PlayStore Admin</span>
          </Link>
          
          <ul className="nav-menu">
            <li>
              <button 
                onClick={() => setActiveTab('metrics')} 
                className={`nav-link ${activeTab === 'metrics' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Métricas
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('products')} 
                className={`nav-link ${activeTab === 'products' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Juegos
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('orders')} 
                className={`nav-link ${activeTab === 'orders' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Pedidos {orders.filter(o => o.status === 'Pendiente').length > 0 && `(${orders.filter(o => o.status === 'Pendiente').length})`}
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('users')} 
                className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Revendedores
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('sourcing')} 
                className={`nav-link ${activeTab === 'sourcing' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-cyan)' }}
              >
                🔍 Buscador Proveedores
              </button>
            </li>
          </ul>

          <div className="nav-actions">
            <button onClick={handleLogout} className="btn btn-secondary" style={{ fontSize: '13px', padding: '8px 16px' }}>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '40px 24px 80px 24px' }}>
        
        {/* TAB 1: METRICS */}
        {activeTab === 'metrics' && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '28px', marginBottom: '24px' }}>Panel de Métricas</h2>
            
            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
              <div className="admin-card" style={{ padding: '24px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600 }}>Volumen de Ventas</span>
                <h3 style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--accent-green)' }}>
                  {formatCOP(metrics.totalSales)}
                </h3>
              </div>

              <div className="admin-card" style={{ padding: '24px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600 }}>Pedidos Pendientes</span>
                <h3 style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--accent-yellow)' }}>
                  {metrics.pendingOrders}
                </h3>
              </div>

              <div className="admin-card" style={{ padding: '24px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600 }}>Pedidos Completados</span>
                <h3 style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--ps-blue-hover)' }}>
                  {metrics.completedOrders}
                </h3>
              </div>

              <div className="admin-card" style={{ padding: '24px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600 }}>Juegos Activos</span>
                <h3 style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'white' }}>
                  {metrics.totalProducts}
                </h3>
              </div>

              <div className="admin-card" style={{ padding: '24px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600 }}>Revendedores Activos</span>
                <h3 style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--accent-cyan)' }}>
                  {metrics.totalUsers}
                </h3>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="admin-card" style={{ padding: '30px' }}>
              <h3 style={{ marginBottom: '16px' }}>Acciones Rápidas</h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => { setActiveTab('products'); openAddModal(); }}>
                  Agregar Nuevo Juego
                </button>
                <button className="btn btn-secondary" onClick={() => setActiveTab('orders')}>
                  Revisar Pedidos Pendientes
                </button>
                <button className="btn btn-secondary" onClick={() => setActiveTab('users')}>
                  Gestionar Saldo de Clientes
                </button>
                <button className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #0072ce, #00f0ff)', border: 'none' }} onClick={() => setActiveTab('sourcing')}>
                  🔍 Buscar Proveedores en Plati
                </button>
                <button className="btn btn-secondary" onClick={fetchDashboardData} disabled={dataLoading}>
                  {dataLoading ? 'Actualizando...' : 'Sincronizar Datos'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTS CATALOG */}
        {activeTab === 'products' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ fontSize: '28px' }}>Catálogo de Juegos y Licencias</h2>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => setIsImportingProduct(true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Importar de Digiseller
                </button>
                <button className="btn btn-primary" onClick={openAddModal}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Agregar Juego
                </button>
                <button className="btn btn-danger" style={{ background: '#ef4444', color: 'white', border: 'none' }} onClick={handleEmptyCatalog}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                  Vaciar Catálogo
                </button>
              </div>
            </div>

            {dataLoading ? (
              <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Cargando catálogo...</p>
            ) : (() => {
              const filteredProds = products.filter(p =>
                p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                p.category.toLowerCase().includes(productSearch.toLowerCase())
              );
              const totalPages = Math.max(1, Math.ceil(filteredProds.length / PRODUCTS_PER_PAGE));
              const paginated = filteredProds.slice((productPage - 1) * PRODUCTS_PER_PAGE, productPage * PRODUCTS_PER_PAGE);
              return (
              <>
                {/* Search bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <input
                    type="text"
                    placeholder="🔍 Buscar por nombre o categoría..."
                    value={productSearch}
                    onChange={e => { setProductSearch(e.target.value); setProductPage(1); }}
                    className="input-field"
                    style={{ flex: 1, margin: 0 }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {filteredProds.length} productos
                  </span>
                </div>
              <div className="admin-card" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      <th style={{ padding: '16px 20px' }}>Juego / Foto</th>
                      <th style={{ padding: '16px 20px' }}>Categoría</th>
                      <th style={{ padding: '16px 20px' }}>Costo USD</th>
                      <th style={{ padding: '16px 20px' }}>Costo COP</th>
                      <th style={{ padding: '16px 20px' }}>TRM</th>
                      <th style={{ padding: '16px 20px' }}>Ganancia (%)</th>
                      <th style={{ padding: '16px 20px' }}>Venta COP</th>
                      <th style={{ padding: '16px 20px' }}>Utilidad (COP)</th>
                      <th style={{ padding: '16px 20px' }}>Stock</th>
                      <th style={{ padding: '16px 20px' }}>Estado</th>
                      <th style={{ padding: '16px 20px', textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((product) => {
                      let opts: { label: string; price: number }[] = [];
                      if (product.options) {
                        try {
                          opts = JSON.parse(product.options);
                        } catch(e) {}
                      }
                      const hasOptions = opts.length > 0;
                      const isExpanded = expandedProducts[product.id];
                      
                      const rawId = product.id.split('-')[0];
                      const isImported = /^\d+$/.test(rawId);

                      return (
                        <React.Fragment key={product.id}>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>
                            <td style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={product.imageUrl} 
                                alt={product.name} 
                                style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '6px', background: '#090e21' }}
                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'; }}
                              />
                              <div>
                                <p style={{ fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {product.name}
                                  {isImported && (
                                    <a
                                      href={`https://plati.market/itm/${rawId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Ver en Plati.market"
                                      style={{
                                        color: 'var(--accent-cyan)',
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        opacity: 0.6,
                                        transition: 'opacity 0.2s'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                      </svg>
                                    </a>
                                  )}
                                </p>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.description}</p>
                                {hasOptions && (
                                  <button
                                    onClick={() => setExpandedProducts(prev => ({ ...prev, [product.id]: !prev[product.id] }))}
                                    style={{
                                      background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '11px',
                                      cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', gap: '4px',
                                      marginTop: '4px', fontWeight: 'bold'
                                    }}
                                  >
                                    {isExpanded ? '▲ Ocultar tarifas' : `▼ Ver ${opts.length} variantes`}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '16px 20px' }}>
                              <span style={{ fontSize: '12px', background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                {product.category}
                              </span>
                            </td>
                            <td style={{ padding: '16px 20px', fontWeight: 600, color: 'white' }}>
                              ${(product.costUsd || 0).toFixed(2)}
                            </td>
                            <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                              {formatCOP(((product.costUsd || 0) * (product.trm || 3700)) / 1000)}
                            </td>
                            <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                              ${(product.trm || 3700).toLocaleString()}
                            </td>
                            <td style={{ padding: '16px 20px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                              {(product.markupPercent || 0)}%
                            </td>
                            <td style={{ padding: '16px 20px', fontWeight: 700, color: 'white' }}>
                              {formatCOP(product.price)}
                            </td>
                            <td style={{ 
                              padding: '16px 20px', 
                              fontWeight: 700, 
                              color: (product.price - (((product.costUsd || 0) * (product.trm || 3700)) / 1000)) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                            }}>
                              {formatCOP(product.price - (((product.costUsd || 0) * (product.trm || 3700)) / 1000))}
                            </td>
                            <td style={{ padding: '16px 20px', fontWeight: 600 }}>
                              <span style={{ color: product.stock > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                {product.stock} u.
                              </span>
                            </td>
                            <td style={{ padding: '16px 20px' }}>
                              <span style={{ 
                                fontSize: '12px', 
                                color: product.active ? 'var(--accent-green)' : 'var(--text-muted)',
                                fontWeight: 'bold'
                              }}>
                                {product.active ? 'Activo (Visible)' : 'Oculto'}
                              </span>
                            </td>
                            <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button className="btn btn-secondary" onClick={() => openEditModal(product)} style={{ padding: '6px 12px', fontSize: '12px' }}>
                                  Editar
                                </button>
                                <button className="btn btn-danger" onClick={() => handleDeleteProduct(product.id)} style={{ padding: '6px 12px', fontSize: '12px', background: 'var(--accent-red)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '6px' }}>
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr>
                              <td colSpan={12} style={{ padding: '0 20px 16px 20px', background: 'rgba(0,0,0,0.1)' }}>
                                <div style={{
                                  background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                                  borderRadius: '8px', padding: '16px 20px', marginTop: '4px'
                                }}>
                                  <h4 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--text-secondary)' }}>
                                    Desglose de Tarifas por Días
                                  </h4>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', fontSize: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                                    <div>Paquete / Alquiler</div>
                                    <div>Costo USD</div>
                                    <div>Costo COP</div>
                                    <div>Venta COP</div>
                                    <div>Utilidad COP</div>
                                  </div>
                                  {opts.map((opt: any, idx) => {
                                    const vCostUsd = opt.costUsd !== undefined
                                      ? opt.costUsd
                                      : ((opt.price / (1 + (product.markupPercent || 0) / 100)) * 1000) / (product.trm || 3700);
                                    const vCostCop = (vCostUsd * (product.trm || 3700)) / 1000;
                                    const vProfit = opt.price - vCostCop;

                                    return (
                                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', fontSize: '12px', padding: '8px 0', borderBottom: idx < opts.length - 1 ? '1px dashed rgba(255,255,255,0.05)' : 'none', alignItems: 'center' }}>
                                        <div style={{ color: 'white', fontWeight: 600 }}>{opt.label}</div>
                                        <div style={{ color: 'var(--text-secondary)' }}>${vCostUsd.toFixed(2)}</div>
                                        <div style={{ color: 'var(--text-secondary)' }}>{formatCOP(vCostCop)}</div>
                                        <div style={{ color: 'white', fontWeight: 600 }}>{formatCOP(opt.price)}</div>
                                        <div style={{ color: vProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                                          {formatCOP(vProfit)}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Controles de Paginación */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setProductPage(p => Math.max(1, p - 1))}
                    disabled={productPage === 1}
                    style={{ padding: '8px 18px', opacity: productPage === 1 ? 0.4 : 1 }}
                  >
                    ← Anterior
                  </button>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Página <strong style={{ color: 'white' }}>{productPage}</strong> de <strong style={{ color: 'white' }}>{totalPages}</strong>
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setProductPage(p => Math.min(totalPages, p + 1))}
                    disabled={productPage === totalPages}
                    style={{ padding: '8px 18px', opacity: productPage === totalPages ? 0.4 : 1 }}
                  >
                    Siguiente →
                  </button>
                </div>
              )}
              </>
              );
            })()}
          </div>
        )}

        {/* TAB 3: CLIENT ORDERS */}
        {activeTab === 'orders' && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '28px', marginBottom: '24px' }}>Pedidos de Clientes</h2>

            {dataLoading ? (
              <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Cargando pedidos...</p>
            ) : orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <p style={{ color: 'var(--text-secondary)' }}>No se han recibido pedidos aún.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {orders.map((order) => (
                  <div 
                    key={order.id} 
                    className="admin-card animate-fade-in" 
                    style={{ 
                      padding: '24px', 
                      borderLeft: `4px solid ${
                        order.status === 'Pendiente' ? 'var(--accent-yellow)' :
                        order.status === 'Completado' ? 'var(--accent-green)' :
                        'var(--accent-red)'
                      }` 
                    }}
                  >
                    {/* Order header info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID DE PEDIDO</span>
                        <h4 style={{ fontSize: '16px', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                          {order.id.toUpperCase()}
                        </h4>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Recibido el: {new Date(order.createdAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ 
                          fontSize: '12px', 
                          fontWeight: 800, 
                          textTransform: 'uppercase',
                          padding: '4px 10px', 
                          borderRadius: '20px',
                          display: 'inline-block',
                          marginBottom: '8px',
                          color: '#fff',
                          background: order.status === 'Pendiente' ? 'rgba(245, 158, 11, 0.2)' :
                                      order.status === 'Completado' ? 'rgba(16, 185, 129, 0.2)' :
                                      'rgba(239, 68, 68, 0.2)',
                          border: `1px solid ${
                            order.status === 'Pendiente' ? 'var(--accent-yellow)' :
                            order.status === 'Completado' ? 'var(--accent-green)' :
                            'var(--accent-red)'
                          }`
                        }}>
                          {order.status}
                        </span>
                        <p style={{ fontSize: '18px', fontWeight: 800, color: 'white' }}>
                          Total: {formatCOP(order.total)}
                        </p>
                      </div>
                    </div>

                    {/* Customer Info & Items */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                      <div>
                        <h5 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Datos del Revendedor</h5>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{order.user?.name || 'Usuario desconocido'}</p>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>📧 {order.user?.email || 'N/A'}</p>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>💰 Saldo del Cliente: {formatCOP(order.user?.balance || 0)}</p>
                      </div>

                      <div>
                        <h5 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Juego Adquirido</h5>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={order.product?.imageUrl} 
                            alt={order.product?.name} 
                            style={{ width: '40px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                          />
                          <div>
                            <span style={{ fontSize: '10px', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginBottom: '4px' }}>{order.product?.category}</span>
                            <p style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{order.product?.name}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Credentials Info */}
                    {order.credentials && (
                      <div style={{ background: '#040710', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>DATOS ENTREGADOS</span>
                        <pre style={{ color: 'var(--accent-cyan)', fontFamily: 'monospace', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{order.credentials}</pre>
                      </div>
                    )}

                    {/* Actions */}
                    {order.status === 'Pendiente' ? (
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => handleUpdateOrderStatus(order.id, 'Cancelado')}
                          style={{ padding: '8px 16px', fontSize: '13px' }}
                        >
                          Rechazar y Reembolsar
                        </button>
                        <button 
                          className="btn btn-primary" 
                          onClick={() => {
                            setDeliveringOrder(order);
                            setCredentialsInput('');
                          }}
                          style={{ padding: '8px 16px', fontSize: '13px' }}
                        >
                          Entregar Credenciales
                        </button>
                      </div>
                    ) : order.status === 'Completado' && (
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => {
                            setDeliveringOrder(order);
                            setCredentialsInput(order.credentials || '');
                          }}
                          style={{ padding: '8px 16px', fontSize: '13px' }}
                        >
                          Editar Credenciales
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: USERS MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '28px', marginBottom: '24px' }}>Gestión de Revendedores</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
              Administra los perfiles de los revendedores y recarga su saldo directamente para permitirles comprar juegos.
            </p>

            {dataLoading ? (
              <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Cargando usuarios...</p>
            ) : (
              <div className="admin-card" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      <th style={{ padding: '16px 20px' }}>Nombre</th>
                      <th style={{ padding: '16px 20px' }}>Email</th>
                      <th style={{ padding: '16px 20px' }}>Rol</th>
                      <th style={{ padding: '16px 20px' }}>Saldo en Monedero</th>
                      <th style={{ padding: '16px 20px', textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>
                        <td style={{ padding: '16px 20px', fontWeight: 600, color: 'white' }}>{u.name}</td>
                        <td style={{ padding: '16px 20px' }}>{u.email}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ 
                            fontSize: '11px', 
                            padding: '3px 8px', 
                            borderRadius: '4px', 
                            background: u.role === 'admin' ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255,255,255,0.05)',
                            color: u.role === 'admin' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                            fontWeight: 700
                          }}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 800, color: 'white' }}>
                          {formatCOP(u.balance)}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          {u.role !== 'admin' && (
                            <button 
                              className="btn btn-primary" 
                              onClick={() => {
                                setEditingUser(u);
                                setUserBalanceForm(u.balance.toString());
                              }}
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                            >
                              Modificar Saldo
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PROVIDER SOURCING ENGINE */}
        {activeTab === 'sourcing' && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '28px', marginBottom: '12px' }}>🔍 Buscador de Proveedores Optimizado</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
              Encuentra los proveedores más baratos, con mejor reputación y ventas en el catálogo global de Digiseller (Plati) en un solo clic.
            </p>

            {/* Sourcing Search Form */}
            <div className="admin-card" style={{ padding: '24px', marginBottom: '30px' }}>
              <form onSubmit={handleSearchProviders}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Producto / Servicio</label>
                    <input
                      type="text"
                      required
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ej. FIFA, Mortal Kombat, steam"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Plataforma / Consola</label>
                    <select
                      value={searchPlatform}
                      onChange={(e) => setSearchPlatform(e.target.value)}
                      className="input-field"
                      style={{ height: '48px', appearance: 'auto' }}
                    >
                      <option value="Todas">🌐 Todas las plataformas</option>
                      <option value="PS5">🎮 PlayStation 5 (PS5)</option>
                      <option value="PS4">🎮 PlayStation 4 (PS4)</option>
                      <option value="Steam">🖥️ Steam (PC)</option>
                      <option value="Xbox">🟢 Xbox</option>
                      <option value="Nintendo">🔴 Nintendo Switch</option>
                      <option value="Epic">🟣 Epic Games</option>
                      <option value="PC">💻 PC (General)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Precio Máximo (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={searchMaxPrice}
                      onChange={(e) => setSearchMaxPrice(e.target.value)}
                      placeholder="Ej. 4"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Ventas Mínimas (Histórico)</label>
                    <input
                      type="number"
                      value={searchMinSales}
                      onChange={(e) => setSearchMinSales(e.target.value)}
                      placeholder="Ej. 100"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Reputación Mínima (Rating)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={searchMinRating}
                      onChange={(e) => setSearchMinRating(e.target.value)}
                      placeholder="Ej. 10"
                      className="input-field"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary" disabled={searchLoading} style={{ padding: '12px 24px', fontWeight: 700 }}>
                    {searchLoading ? 'Buscando en Digiseller...' : 'Escanear Proveedores'}
                  </button>
                </div>
              </form>
            </div>

            {/* Error output */}
            {sourcingError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px' }}>
                <strong>Error:</strong> {sourcingError}
              </div>
            )}

            {/* Results */}
            {searchLoading ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>
                <div className="spinner" style={{ margin: '0 auto 16px auto' }}></div>
                <p style={{ color: 'var(--text-secondary)' }}>Escaneando catálogo global y ordenando por mejores puntuaciones de seguridad...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <p style={{ color: 'var(--text-secondary)' }}>No hay búsquedas activas o ningún proveedor cumple los filtros.</p>
              </div>
            ) : (
              <div className="admin-card animate-fade-in" style={{ overflowX: 'auto' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontWeight: 700, color: 'white' }}>
                      Se encontraron {(() => {
                        return searchResults.filter(item => {
                          if (!item) return false;
                          const n = (Array.isArray(item.name) ? (item.name.find((x: any) => x?.locale === 'en-US')?.value || item.name[0]?.value) : '') || item.name_url || '';
                          const platformOk = searchPlatform === 'Todas' || n.toLowerCase().includes(searchPlatform.toLowerCase());
                          const sellerOk = !searchSeller || (item.seller_name || '').toLowerCase().includes(searchSeller.toLowerCase());
                          return platformOk && sellerOk;
                        }).length;
                      })()} proveedores óptimos
                    </span>
                    {searchPlatform !== 'Todas' && (
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: 'rgba(0,240,255,0.12)', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan)' }}>
                        🎮 {searchPlatform}
                      </span>
                    )}
                    {searchSeller && (
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid #a855f7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        👤 {searchSeller}
                        <button onClick={() => setSearchSeller('')} style={{ background: 'none', border: 'none', color: '#c084fc', cursor: 'pointer', fontSize: '13px', padding: '0', lineHeight: 1 }}>✕</button>
                      </span>
                    )}
                  </div>

                  {/* Seller filter bar */}
                  <div style={{ position: 'relative', minWidth: '240px' }}>
                    <input
                      type="text"
                      value={searchSeller}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearchSeller(val);
                        if (val.length >= 1) {
                          const unique = Array.from(new Set(
                            searchResults
                              .map(r => r?.seller_name)
                              .filter((s): s is string => !!s && s.toLowerCase().includes(val.toLowerCase()))
                          )).slice(0, 8);
                          setSellerAutocomplete(unique);
                          setShowSellerDropdown(unique.length > 0);
                        } else {
                          setShowSellerDropdown(false);
                        }
                      }}
                      onFocus={() => {
                        if (!searchSeller) {
                          const unique = Array.from(new Set(
                            searchResults.map(r => r?.seller_name).filter((s): s is string => !!s)
                          )).slice(0, 8);
                          setSellerAutocomplete(unique);
                          setShowSellerDropdown(unique.length > 0);
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowSellerDropdown(false), 150)}
                      placeholder="🔎 Filtrar por proveedor…"
                      style={{
                        width: '100%',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-tertiary)',
                        color: 'white',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                    {showSellerDropdown && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        zIndex: 50,
                        marginTop: '4px',
                        overflow: 'hidden',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      }}>
                        {sellerAutocomplete.map(s => (
                          <button
                            key={s}
                            onClick={() => { setSearchSeller(s); setShowSellerDropdown(false); }}
                            style={{
                              display: 'block',
                              width: '100%',
                              textAlign: 'left',
                              padding: '10px 16px',
                              background: 'none',
                              border: 'none',
                              color: 'white',
                              fontSize: '13px',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--border-color)',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(168,85,247,0.12)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                          >
                            👤 {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tasa estimada COP: $4.000 x 1 USD</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      <th style={{ padding: '16px 20px' }}>Producto en Plati</th>
                      <th style={{ padding: '16px 20px' }}>Precio (USD)</th>
                      <th style={{ padding: '16px 20px' }}>Costo COP (Est.)</th>
                      <th style={{ padding: '16px 20px' }}>Proveedor / Reputación</th>
                      <th style={{ padding: '16px 20px' }}>Ventas Totales</th>
                      <th style={{ padding: '16px 20px' }}>Comisión Socio</th>
                      <th style={{ padding: '16px 20px', textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults && Array.isArray(searchResults) && searchResults.filter((item) => {
                      if (!item) return false;
                      const nameEn = (Array.isArray(item.name) ? (item.name.find((n: any) => n?.locale === 'en-US')?.value || item.name[0]?.value) : '') || item.name_url || '';
                      const platformOk = searchPlatform === 'Todas' || nameEn.toLowerCase().includes(searchPlatform.toLowerCase());
                      const sellerOk = !searchSeller || (item.seller_name || '').toLowerCase().includes(searchSeller.toLowerCase());
                      return platformOk && sellerOk;
                    }).map((item) => {
                      if (!item) return null;
                      const nameObjEn = Array.isArray(item.name) ? item.name.find((n: any) => n && n.locale === 'en-US') : null;
                      const nameEn = nameObjEn?.value || (Array.isArray(item.name) && item.name[0]?.value) || item.name_url || 'Sin Nombre';
                      const isRecommended = (item.seller_rating || 0) > 50 && (item.total_sales || 0) > 500;
                      return (
                        <tr key={item.product_id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px', background: isRecommended ? 'rgba(0, 240, 255, 0.02)' : 'none' }}>
                          <td style={{ padding: '16px 20px', maxWidth: '300px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontWeight: 600, color: 'white', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{nameEn}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID de Plati: {item.product_id}</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                            ${(item.price || 0).toFixed(2)} USD
                          </td>
                          <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--accent-green)' }}>
                            {formatCOP((item.price || 0) * 4.0)}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ color: 'white', fontWeight: 600 }}>{item.seller_name || 'Desconocido'}</span>
                              <span style={{ fontSize: '12px', color: (item.seller_rating || 0) > 50 ? 'var(--accent-yellow)' : 'var(--text-secondary)' }}>
                                ⭐ Puntos: {(item.seller_rating || 0).toFixed(1)}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 20px', fontWeight: 600, color: 'white' }}>
                            📦 {item.total_sales || item.month_sales || 0} u.
                          </td>
                          <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                            {item.percent || 0}%
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button 
                                className="btn btn-secondary" 
                                onClick={() => {
                                  if (item.product_id) {
                                    navigator.clipboard.writeText(item.product_id.toString());
                                    alert(`ID de Producto ${item.product_id} copiado al portapapeles.`);
                                  }
                                }}
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                              >
                                Copiar ID
                              </button>
                              <a 
                                href={`https://plati.market/itm/${item.product_id}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="btn btn-primary"
                                style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none', background: 'var(--ps-blue-hover)' }}
                              >
                                Ver Oferta ↗
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ADD / EDIT PRODUCT MODAL */}
      {(isAddingProduct || editingProduct) && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          backgroundColor: 'rgba(0, 0, 0, 0.8)', 
          backdropFilter: 'blur(4px)',
          zIndex: 500,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ 
            width: '100%', 
            maxWidth: '550px', 
            backgroundColor: 'var(--bg-secondary)', 
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '30px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ fontSize: '22px', marginBottom: '20px' }}>
              {editingProduct ? 'Editar Datos del Juego' : 'Agregar Nuevo Juego'}
            </h2>

            <form onSubmit={handleProductSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Nombre del Juego *</label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="Ej. FIFA 25"
                    className="input-field"
                  />
                </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Categoría / Consola *</label>
                    <select
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                      className="input-field"
                      style={{ background: 'var(--bg-tertiary)' }}
                    >
                      <option value="PS5">PS5</option>
                      <option value="PS4">PS4</option>
                      <option value="Suscripciones">Suscripciones</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Costo USD *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={productForm.costUsd}
                      onChange={(e) => {
                        const val = e.target.value;
                        const c = parseFloat(val) || 0;
                        const t = parseFloat(productForm.trm) || 0;
                        const m = parseFloat(productForm.markupPercent) || 0;
                        const p = Math.round(c * t * (1 + m / 100));
                        updateFormPrices(val, productForm.trm, productForm.markupPercent, p.toString());
                      }}
                      placeholder="0.00"
                      className="input-field"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Tasa de Cambio (TRM) *</label>
                    <input
                      type="number"
                      required
                      value={productForm.trm}
                      onChange={(e) => {
                        const val = e.target.value;
                        const c = parseFloat(productForm.costUsd) || 0;
                        const t = parseFloat(val) || 0;
                        const m = parseFloat(productForm.markupPercent) || 0;
                        const p = Math.round(c * t * (1 + m / 100));
                        updateFormPrices(productForm.costUsd, val, productForm.markupPercent, p.toString());
                      }}
                      placeholder="4000"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Ganancia Markup (%) *</label>
                    <input
                      type="number"
                      required
                      value={productForm.markupPercent}
                      onChange={(e) => {
                        const val = e.target.value;
                        const c = parseFloat(productForm.costUsd) || 0;
                        const t = parseFloat(productForm.trm) || 0;
                        const m = parseFloat(val) || 0;
                        const p = Math.round(c * t * (1 + m / 100));
                        updateFormPrices(productForm.costUsd, productForm.trm, val, p.toString());
                      }}
                      placeholder="20"
                      className="input-field"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Precio de Venta COP (Final) *</label>
                    <input
                      type="number"
                      required
                      value={productForm.price}
                      onChange={(e) => {
                        const val = e.target.value;
                        const p = parseFloat(val) || 0;
                        const c = parseFloat(productForm.costUsd) || 0;
                        const t = parseFloat(productForm.trm) || 0;
                        let m = 0;
                        if (c > 0 && t > 0) {
                          m = Math.round(((p / (c * t)) - 1) * 100);
                        }
                        updateFormPrices(productForm.costUsd, productForm.trm, m.toString(), val);
                      }}
                      placeholder="Precio Final COP"
                      className="input-field"
                      style={{ fontWeight: 'bold', color: 'var(--accent-cyan)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Stock Disponible</label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.stock}
                      onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                      placeholder="10"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Estado</label>
                    <select
                      value={productForm.active ? 'true' : 'false'}
                      onChange={(e) => setProductForm({ ...productForm, active: e.target.value === 'true' })}
                      className="input-field"
                      style={{ background: 'var(--bg-tertiary)' }}
                    >
                      <option value="true">Activo (Visible)</option>
                      <option value="false">Oculto (Inactivo)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Carátula (Imagen) *
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {productForm.imageUrl && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={productForm.imageUrl}
                          alt="Previsualización"
                          style={{ width: '60px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#090e21' }}
                        />
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Previsualización</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        id="cover-file-input"
                      />
                      <label
                        htmlFor="cover-file-input"
                        className="btn btn-secondary"
                        style={{ cursor: uploadingImage ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center', padding: '8px 16px', fontSize: '13px', margin: 0, opacity: uploadingImage ? 0.7 : 1 }}
                      >
                        {uploadingImage ? (
                          <>
                            <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                            Subiendo...
                          </>
                        ) : '📁 Subir desde PC'}
                      </label>
                      
                      <input
                        type="text"
                        required
                        value={uploadingImage ? 'Subiendo imagen...' : productForm.imageUrl}
                        disabled={uploadingImage}
                        onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                        placeholder="O ingresa URL (https://...)"
                        className="input-field"
                        style={{ flex: 1, margin: 0 }}
                      />
                      
                      {productForm.imageUrl && !uploadingImage && (
                        <button
                          type="button"
                          onClick={() => setProductForm({ ...productForm, imageUrl: '' })}
                          className="btn btn-danger"
                          style={{ padding: '8px 12px', background: '#ef4444', border: 'none', color: 'white', borderRadius: '6px' }}
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Descripción / Términos de Entrega</label>
                  <textarea
                    rows={4}
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    placeholder="Describe los detalles de la cuenta (Ej. Cuenta Primaria/Secundaria, entrega en 15 minutos, etc.)"
                    className="input-field"
                    style={{ resize: 'none' }}
                  />
                </div>

                {productForm.options && (() => {
                  let opts: { label: string; price: number }[] = [];
                  try {
                    opts = JSON.parse(productForm.options);
                  } catch (e) {}
                  if (opts.length === 0) return null;

                  return (
                    <div style={{ marginTop: '4px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Variantes del Juego (Título y Precio COP)
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        {opts.map((opt, idx) => {
                          const displayPrice = opt.price < 5000 ? Math.round(opt.price * 1000) : opt.price;
                          return (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', alignItems: 'center', borderBottom: idx < opts.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', paddingBottom: idx < opts.length - 1 ? '12px' : '0' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Título Variante</label>
                                <input
                                  type="text"
                                  value={opt.label}
                                  onChange={(e) => {
                                    const updatedOpts = [...opts];
                                    updatedOpts[idx] = { ...opt, label: e.target.value };
                                    setProductForm({ ...productForm, options: JSON.stringify(updatedOpts) });
                                  }}
                                  className="input-field"
                                  style={{ height: '38px', fontSize: '13px', margin: 0 }}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Precio COP</label>
                                <div style={{ position: 'relative' }}>
                                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '13px' }}>$</span>
                                  <input
                                    type="number"
                                    value={displayPrice}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      const updatedOpts = [...opts];
                                      updatedOpts[idx] = { ...opt, price: val / 1000 };
                                      setProductForm({ ...productForm, options: JSON.stringify(updatedOpts) });
                                    }}
                                    className="input-field"
                                    style={{ paddingLeft: '24px', fontSize: '13px', height: '38px', margin: 0 }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={closeProductModal} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER BALANCE MODAL */}
      {editingUser && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          backgroundColor: 'rgba(0, 0, 0, 0.8)', 
          backdropFilter: 'blur(4px)',
          zIndex: 500,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{ 
            width: '100%', 
            maxWidth: '450px', 
            backgroundColor: 'var(--bg-secondary)', 
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '30px'
          }}>
            <h2 style={{ fontSize: '20px', marginBottom: '10px', color: 'white' }}>Modificar Saldo de Revendedor</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Modifica el saldo disponible para el usuario: <strong>{editingUser.name}</strong> ({editingUser.email}).
            </p>

            <form onSubmit={handleUserBalanceSubmit}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Saldo en Monedero (COP)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '12px', fontWeight: 'bold', fontSize: '16px', color: 'white' }}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={userBalanceForm}
                    onChange={(e) => setUserBalanceForm(e.target.value)}
                    placeholder="Monto de saldo"
                    className="input-field"
                    style={{ width: '100%', paddingLeft: '32px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setEditingUser(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  Actualizar Saldo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELIVER CREDENTIALS MODAL */}
      {deliveringOrder && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          backgroundColor: 'rgba(0, 0, 0, 0.8)', 
          backdropFilter: 'blur(4px)',
          zIndex: 500,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{ 
            width: '100%', 
            maxWidth: '500px', 
            backgroundColor: 'var(--bg-secondary)', 
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '30px'
          }}>
            <h2 style={{ fontSize: '20px', marginBottom: '10px', color: 'white' }}>Cargar Credenciales de la Cuenta</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Escribe las credenciales que se entregarán al revendedor para el juego: <strong>{deliveringOrder.product?.name || 'Juego Desconocido'}</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Datos de Acceso (Usuario, Contraseña y Guía)
                </label>
                <textarea
                  rows={6}
                  required
                  value={credentialsInput}
                  onChange={(e) => setCredentialsInput(e.target.value)}
                  placeholder="ejemplo@correo.com:contraseñasecreta | Instrucciones de instalación: ..."
                  className="input-field"
                  style={{ resize: 'none', fontFamily: 'monospace', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="button" 
                onClick={() => {
                  setDeliveringOrder(null);
                  setCredentialsInput('');
                }} 
                className="btn btn-secondary" 
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={() => handleUpdateOrderStatus(deliveringOrder.id, 'Completado', credentialsInput)}
                className="btn btn-primary" 
                style={{ flex: 2 }}
              >
                Confirmar y Entregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT PRODUCT MODAL */}
      {isImportingProduct && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          backgroundColor: 'rgba(0, 0, 0, 0.8)', 
          backdropFilter: 'blur(4px)',
          zIndex: 500,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{ 
            width: '100%', 
            maxWidth: '500px', 
            backgroundColor: 'var(--bg-secondary)', 
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '30px'
          }}>
            <h2 style={{ fontSize: '20px', marginBottom: '10px', color: 'white' }}>Importar Producto desde Digiseller</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Ingresa el ID del producto de Digiseller (Plati) para importarlo automáticamente a tu catálogo local con su precio convertido a COP.
            </p>

            <form onSubmit={handleImportSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    ID de Producto Digiseller
                  </label>
                  <input
                    type="text"
                    required
                    value={importProductId}
                    onChange={(e) => setImportProductId(e.target.value)}
                    placeholder="Ej. 5219998"
                    className="input-field"
                  />
                </div>

                <div style={{ display: 'none' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Categoría local
                  </label>
                  <select
                    value={importCategory}
                    onChange={(e) => setImportCategory(e.target.value)}
                    className="input-field"
                    style={{ appearance: 'auto' }}
                  >
                    <option value="Auto">Automático</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      TRM (COP x 1 USD)
                    </label>
                    <input
                      type="number"
                      required
                      value={importExchangeRate}
                      onChange={(e) => setImportExchangeRate(e.target.value)}
                      placeholder="4000"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      Ganancia Markup %
                    </label>
                    <input
                      type="number"
                      required
                      value={importMarkup}
                      onChange={(e) => setImportMarkup(e.target.value)}
                      placeholder="20"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      Stock Virtual
                    </label>
                    <input
                      type="number"
                      required
                      value={importStock}
                      onChange={(e) => setImportStock(e.target.value)}
                      placeholder="10"
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsImportingProduct(false);
                    setImportProductId('');
                  }} 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  disabled={importLoading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary" 
                  style={{ flex: 2 }}
                  disabled={importLoading}
                >
                  {importLoading ? 'Importando...' : 'Sincronizar e Importar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
