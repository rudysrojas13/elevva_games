"use client";

import { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  balance: number;
}

interface ProductOption {
  label: string;
  price: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  options: string; // JSON string of ProductOption[]
  category: string;
  imageUrl: string;
  stock: number;
  active: boolean;
}

interface Order {
  id: string;
  productId: string;
  product: Product;
  total: number;
  status: string;
  credentials?: string;
  createdAt: string;
}

export default function StorePage() {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Auth Form Inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Panel State
  const [activeTab, setActiveTab] = useState<'new-order' | 'orders' | 'services' | 'add-funds'>('new-order');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // New Order State
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderMessage, setOrderMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Funds State
  const [depositAmount, setDepositAmount] = useState('');
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [depositMessage, setDepositMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // View Credentials State
  const [viewingCredentialsOrder, setViewingCredentialsOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);

  // Services catalog filter state
  const [svcSearch, setSvcSearch] = useState('');
  const [svcCat, setSvcCat] = useState('Todos');
  const [svcSort, setSvcSort] = useState<'az' | 'price-asc' | 'price-desc' | 'stock'>('az');

  // Product detail modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(0);

  // Check auth session
  useEffect(() => {
    checkSession();
  }, []);

  // Fetch data when authenticated
  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchOrders();
    }
  }, [user]);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.error('Error verificando sesión:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);

    try {
      const endpoint = authMode === 'login' ? '/api/auth' : '/api/auth'; // In SMM, registration usually goes to another endpoint or we register/login.
      // Wait, we can implement registration by checking if email is already registered or writing a simple registration API.
      // Let's support both login and registration. If the endpoint for registration is not written, we can write it or merge it.
      // Wait! Let's write a simple register handler. Let's make POST to `/api/auth` for login, and let's check if we need an api/auth/register route.
      // Oh! Since we only have /api/auth POST for login in our schema, let's write `/api/auth/register` to support registration!
      // Let's first make a quick API call. If authMode is 'register', we'll hit `/api/auth/register`.
      
      const url = authMode === 'login' ? '/api/auth' : '/api/auth/register';
      const body = authMode === 'login' 
        ? { email, password } 
        : { name, email, password };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error en autenticación');
      }

      if (data.success && data.user) {
        setUser(data.user);
        // Clear inputs
        setName('');
        setEmail('');
        setPassword('');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Algo salió mal');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      setUser(null);
      setActiveTab('new-order');
    } catch (err) {
      console.error('Error cerrando sesión:', err);
    }
  };

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Error obteniendo productos:', err);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Error obteniendo pedidos:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Format price helper
  const formatCOP = (val: number) => {
    const actualPesos = Math.round(val * 1000);
    return '$' + actualPesos.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Filtered products for dropdown and services list
  const filteredProducts = products.filter(p => {
    if (selectedCategory === 'Todos') return true;
    return p.category === selectedCategory;
  });

  const selectedProductForOrder = products.find(p => p.id === selectedProductId);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    setOrderMessage(null);
    setOrderSubmitting(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProductId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Error al procesar el pedido');
      }

      setOrderMessage({
        type: 'success',
        text: `¡Pedido realizado con éxito! Se descontaron ${formatCOP(data.total)} de tu saldo.`
      });

      // Update user balance locally
      if (user) {
        setUser({
          ...user,
          balance: user.balance - data.total
        });
      }

      // Reload products & orders
      fetchProducts();
      fetchOrders();
      setSelectedProductId('');

      // Auto switch to orders list tab after 2 seconds
      setTimeout(() => {
        setActiveTab('orders');
        setOrderMessage(null);
      }, 2000);

    } catch (err: any) {
      setOrderMessage({
        type: 'error',
        text: err.message || 'Error interno'
      });
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleSimulatedDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(depositAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setDepositMessage({ type: 'error', text: 'Ingresa un monto válido mayor a 0' });
      return;
    }

    setDepositMessage(null);
    setDepositSubmitting(true);

    try {
      const res = await fetch('/api/auth/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parsedAmount }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al procesar depósito');
      }

      setDepositMessage({
        type: 'success',
        text: `¡Carga exitosa! Se han añadido ${formatCOP(parsedAmount)} a tu cuenta.`
      });

      // Update user locally
      setUser(data.user);
      setDepositAmount('');

      // Clear success message after 3 seconds
      setTimeout(() => setDepositMessage(null), 3000);

    } catch (err: any) {
      setDepositMessage({ type: 'error', text: err.message || 'Error al cargar saldo' });
    } finally {
      setDepositSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#070b19' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // LOGIN / REGISTRATION VIEW
  if (!user) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh', 
        padding: '20px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '450px',
          backgroundColor: 'rgba(13, 21, 45, 0.7)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          padding: '40px 30px',
          boxShadow: 'var(--shadow-lg)'
        }}>
          {/* Brand */}
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#cyan-blue-grad)" strokeWidth="3">
              <rect x="2" y="2" width="20" height="20" rx="5" strokeWidth="3"></rect>
              <circle cx="12" cy="12" r="5" strokeWidth="3"></circle>
            </svg>
            <span>PLAYSTORE PANEL</span>
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px', textAlign: 'center', color: '#fff' }}>
            {authMode === 'login' ? 'Iniciar Sesión en el Panel' : 'Registrarse como Revendedor'}
          </h2>

          {authError && (
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
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {authMode === 'register' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Juan Gómez"
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Contraseña</label>
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

            <button 
              type="submit" 
              disabled={authSubmitting}
              className="btn btn-primary" 
              style={{ width: '100%', padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: 700 }}
            >
              {authSubmitting ? 'Procesando...' : authMode === 'login' ? 'Entrar al Panel' : 'Registrar Cuenta'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {authMode === 'login' ? (
              <>
                ¿No tienes cuenta de revendedor?{' '}
                <button 
                  onClick={() => setAuthMode('register')} 
                  style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                >
                  Regístrate aquí
                </button>
              </>
            ) : (
              <>
                ¿Ya eres revendedor?{' '}
                <button 
                  onClick={() => setAuthMode('login')} 
                  style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                >
                  Inicia sesión
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // PANEL VIEW (AUTHENTICATED)
  return (
    <div className="panel-container">
      {/* SVG Gradients definitions */}
      <svg style={{ width: 0, height: 0, position: 'absolute' }}>
        <defs>
          <linearGradient id="cyan-blue-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="100%" stopColor="#0072ce" />
          </linearGradient>
        </defs>
      </svg>

      {/* Top Navbar - Premium */}
      <aside className="panel-sidebar">

        {/* Top Row: Brand + User chip + Logout */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)',
          flexWrap: 'wrap', gap: '8px', minHeight: '52px',
        }}>
          {/* Brand */}
          <div className="panel-brand">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="url(#cyan-blue-grad)" strokeWidth="2.5">
              <rect x="2" y="2" width="20" height="20" rx="5"></rect>
              <circle cx="12" cy="12" r="4"></circle>
            </svg>
            <span>PLAYSTORE PANEL</span>
          </div>

          {/* User chip + Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '8px', padding: '5px 12px',
            }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(0,240,255,0.15), rgba(0,114,206,0.25))',
                border: '1px solid rgba(0,240,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: 700, color: '#00f0ff', flexShrink: 0,
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.8px', lineHeight: 1 }}>Revendedor</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.95)', marginTop: '2px', lineHeight: 1 }}>{user.name}</div>
              </div>
              <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.15)' }} />
              <div>
                <div style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.8px', lineHeight: 1 }}>Saldo</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#00f0ff', marginTop: '2px', lineHeight: 1 }}>{formatCOP(user.balance)}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)',
                borderRadius: '7px', padding: '5px 11px',
                color: 'rgba(239,68,68,0.75)', fontSize: '11px', fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.2s ease', letterSpacing: '0.2px',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Salir</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{
          display: 'flex', flexDirection: 'row',
          padding: '0 20px', gap: '0',
          overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {([
            { id: 'new-order', label: 'Nuevo Pedido', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> },
            { id: 'orders',    label: 'Mis Pedidos',  icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg> },
            { id: 'services',  label: 'Servicios',    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line></svg> },
            { id: 'add-funds', label: 'Cargar Saldo', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg> },
          ] as { id: string; label: string; icon: React.ReactNode }[]).map(tab => (
            <button
              key={tab.id}
              className={`panel-nav-btn${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
          {user.role === 'admin' && (
            <a href="/admin" className="panel-nav-btn" style={{ textDecoration: 'none' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l-.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>Administración</span>
            </a>
          )}
        </nav>
      </aside>

      {/* Main Workspace Area */}
      <main className="panel-content">
        
        {/* TAB 1: NUEVO PEDIDO */}
        {activeTab === 'new-order' && (
          <div>
            <div className="panel-card">
              <h2 className="panel-title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="3">
                  <rect x="2" y="2" width="20" height="20" rx="5" strokeWidth="3"></rect>
                  <line x1="12" y1="8" x2="12" y2="16" strokeWidth="3"></line>
                  <line x1="8" y1="12" x2="16" y2="12" strokeWidth="3"></line>
                </svg>
                Realizar Nuevo Pedido
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                Selecciona la categoría y el juego que deseas comprar. La entrega se procesará y se descontará directamente del saldo de tu monedero.
              </p>

              {orderMessage && (
                <div style={{ 
                  backgroundColor: orderMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                  border: orderMessage.type === 'success' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)', 
                  color: orderMessage.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)', 
                  padding: '16px', 
                  borderRadius: '8px', 
                  fontSize: '14px', 
                  marginBottom: '24px',
                  fontWeight: 600
                }}>
                  {orderMessage.text}
                </div>
              )}

              <form onSubmit={handlePlaceOrder}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px' }}>
                  {/* Category Dropdown */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Categoría de Consola</label>
                    <select
                      className="input-field"
                      style={{ width: '100%', height: '48px', appearance: 'auto' }}
                      value={selectedCategory}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setSelectedProductId('');
                      }}
                    >
                      <option value="Todos">Todas las Consolas / Servicios</option>
                      <option value="PS5">PlayStation 5</option>
                      <option value="PS4">PlayStation 4</option>
                      <option value="Suscripciones">Suscripciones y Licencias</option>
                    </select>
                  </div>

                  {/* Product Dropdown */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Servicio / Juego Digital</label>
                    <select
                      className="input-field"
                      style={{ width: '100%', height: '48px', appearance: 'auto' }}
                      required
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                    >
                      <option value="">Selecciona un juego...</option>
                      {filteredProducts.map(p => (
                        <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                          {p.name} - {formatCOP(p.price)} {p.stock <= 0 ? '(Agotado)' : `(Stock: ${p.stock})`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Selected Product Card Detail */}
                {selectedProductForOrder && (
                  <div style={{ 
                    display: 'flex', 
                    gap: '24px', 
                    background: '#f8fafc', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '12px', 
                    padding: '24px', 
                    marginBottom: '30px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ width: '100%', maxWidth: '120px', height: '160px', borderRadius: '8px', overflow: 'hidden', background: '#070b19', flexShrink: 0, margin: '0 auto' }}>
                      <img 
                        src={selectedProductForOrder.imageUrl} 
                        alt={selectedProductForOrder.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3';
                        }}
                      />
                    </div>

                    <div style={{ flex: '1 1 250px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ps-blue)', textTransform: 'uppercase' }}>{selectedProductForOrder.category}</span>
                          <h4 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '4px 0 10px 0' }}>{selectedProductForOrder.name}</h4>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Precio Mayorista</span>
                          <span style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{formatCOP(selectedProductForOrder.price)}</span>
                        </div>
                      </div>
                      <p style={{ color: '#475569', fontSize: '13px', lineHeight: '1.5', margin: '10px 0' }}>{selectedProductForOrder.description}</p>
                      
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', marginTop: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                        <span style={{ color: selectedProductForOrder.stock > 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                          Stock: {selectedProductForOrder.stock > 0 ? `${selectedProductForOrder.stock} cuentas listas` : 'Agotado'}
                        </span>
                        <span style={{ color: '#64748b' }}>|</span>
                        <span style={{ color: '#64748b' }}>Entrega: Instantánea tras ser procesado</span>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    disabled={orderSubmitting || !selectedProductId || (selectedProductForOrder && selectedProductForOrder.stock <= 0) || (selectedProductForOrder && user.balance < selectedProductForOrder.price)}
                    className="btn btn-primary"
                    style={{ padding: '14px 30px', borderRadius: '10px', fontSize: '15px', fontWeight: 700 }}
                  >
                    {orderSubmitting ? 'Procesando...' : 
                     (selectedProductForOrder && user.balance < selectedProductForOrder.price) ? 'Saldo Insuficiente' : 
                     'Realizar Pedido'}

                  </button>
                </div>
              </form>
            </div>

            {/* Quick Reseller Instructions */}
            <div className="panel-card" style={{ border: '1px solid rgba(0, 114, 206, 0.2)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ps-blue)" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                Instrucciones para la Venta de Licencias
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <div>
                  <h4 style={{ color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: '6px' }}>Cuentas Primarias (P2)</h4>
                  <p>Instruye a tu cliente de PS4/PS5 para agregar el usuario provisto en su consola y activar la opción <strong>"Compartir consola y juego offline"</strong> (en PS5) o <strong>"Activar como principal"</strong> (en PS4). Luego podrá descargar el juego y jugar desde su perfil de toda la vida sin necesidad de estar logueado en la cuenta del juego.</p>
                </div>
                <div>
                  <h4 style={{ color: 'var(--accent-yellow)', fontWeight: 700, marginBottom: '6px' }}>Cuentas Secundarias (P3)</h4>
                  <p>El cliente debe ingresar los datos y jugar <strong>obligatoriamente</strong> desde el usuario provisto, sin activar la consola como principal. Necesita tener conexión constante a internet. Adviértele que no debe cambiar la contraseña de la cuenta para no invalidar la garantía.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HISTORIAL DE PEDIDOS */}
        {activeTab === 'orders' && (
          <div className="panel-card">
            <h2 className="panel-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="3">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              Historial de Pedidos
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
              Aquí puedes ver el estado de todas tus compras y revelar las credenciales de los juegos que hayan sido completados.
            </p>

            {ordersLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner"></div></div>
            ) : orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Aún no has realizado ningún pedido. Ve a "Nuevo Pedido" para comprar tu primer juego.
              </div>
            ) : (
              <div className="panel-table-wrapper">
                <table className="panel-table">
                  <thead>
                    <tr>
                      <th>ID de Pedido</th>
                      <th>Consola / Juego</th>
                      <th>Fecha</th>
                      <th>Total</th>
                      <th>Estado</th>
                      <th>Credenciales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{o.id.substring(0, 8).toUpperCase()}</td>
                        <td>
                          <span style={{ 
                            fontSize: '9px', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            background: o.product.category === 'PS5' ? 'rgba(0, 114, 206, 0.2)' : 'rgba(138, 43, 226, 0.2)',
                            color: o.product.category === 'PS5' ? 'var(--accent-cyan)' : 'var(--accent-purple)',
                            marginRight: '8px',
                            fontWeight: 800
                          }}>
                            {o.product.category}
                          </span>
                          <span style={{ fontWeight: 600, color: 'white' }}>{o.product.name}</span>
                        </td>
                        <td>{new Date(o.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td style={{ fontWeight: 'bold', color: 'white' }}>{formatCOP(o.total)}</td>
                        <td>
                          <span className={`badge ${
                            o.status === 'Completado' ? 'badge-completed' :
                            o.status === 'Cancelado' ? 'badge-cancelled' : 'badge-pending'
                          }`}>
                            {o.status}
                          </span>
                        </td>
                        <td>
                          {o.status === 'Completado' ? (
                            <button
                              onClick={() => setViewingCredentialsOrder(o)}
                              className="btn btn-primary"
                              style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px' }}
                            >
                              Ver Credenciales
                            </button>
                          ) : o.status === 'Cancelado' ? (
                            <span style={{ color: 'var(--accent-red)', fontSize: '12px' }}>Saldo devuelto</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>Procesando cuenta...</span>
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

        {/* TAB 3: SERVICIOS — Catálogo con filtros */}
        {activeTab === 'services' && (() => {
          const catColor: Record<string, string> = {
            PS5: '#00aaff', PS4: '#a855f7', Xbox: '#22c55e',
            Suscripciones: '#f59e0b', PC: '#ef4444',
          };
          const cats = ['Todos', ...Array.from(new Set(products.map(p => p.category)))];
          const filtered = products
            .filter(p => {
              const matchCat = svcCat === 'Todos' || p.category === svcCat;
              const matchSearch = p.name.toLowerCase().includes(svcSearch.toLowerCase());
              return matchCat && matchSearch;
            })
            .sort((a, b) => {
              if (svcSort === 'az') return a.name.localeCompare(b.name);
              if (svcSort === 'price-asc') return a.price - b.price;
              if (svcSort === 'price-desc') return b.price - a.price;
              return b.stock - a.stock;
            });
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Header count - Now positioned above both the sidebar and the grid */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.45)' }}>
                  <span style={{ fontWeight: 700, color: 'rgba(255, 255, 255, 0.85)' }}>{filtered.length}</span> productos encontrados
                </div>
                {svcCat !== 'Todos' && (
                  <span style={{
                    fontSize: '11px', padding: '3px 10px', borderRadius: '20px',
                    background: (catColor[svcCat] || '#0072ce') + '18',
                    color: catColor[svcCat] || '#0072ce', fontWeight: 700,
                  }}>
                    {svcCat}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

                {/* ── Filtro lateral ── */}
                <div style={{ width: '210px', flexShrink: 0 }}>
                  <aside style={{
                    width: '100%',
                    background: '#ffffff', borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    padding: '20px 16px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                    position: 'sticky', top: '110px',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', marginBottom: '14px', letterSpacing: '0.2px' }}>
                      Filtrar por
                    </div>

                    {/* Search */}
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ position: 'relative' }}>
                        <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}
                          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.5">
                          <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                          type="text"
                          placeholder="Buscar juego..."
                          value={svcSearch}
                          onChange={e => setSvcSearch(e.target.value)}
                          style={{
                            width: '100%', padding: '8px 10px 8px 30px',
                            border: '1px solid #e2e8f0', borderRadius: '8px',
                            fontSize: '12px', color: '#0f172a', background: '#f8fafc',
                            outline: 'none', boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </div>

                    {/* Categories */}
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
                      Categoría
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '20px' }}>
                      {cats.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSvcCat(cat)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '7px 10px', borderRadius: '7px',
                            border: 'none', cursor: 'pointer', textAlign: 'left',
                            fontSize: '12px', fontWeight: svcCat === cat ? 700 : 500,
                            background: svcCat === cat ? (catColor[cat] ? catColor[cat] + '18' : '#0072ce18') : 'transparent',
                            color: svcCat === cat ? (catColor[cat] || '#0072ce') : '#475569',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span>{cat}</span>
                          <span style={{
                            fontSize: '10px', fontWeight: 700,
                            background: svcCat === cat ? (catColor[cat] || '#0072ce') : '#e2e8f0',
                            color: svcCat === cat ? '#fff' : '#64748b',
                            borderRadius: '10px', padding: '1px 6px',
                            minWidth: '20px', textAlign: 'center',
                          }}>
                            {cat === 'Todos' ? products.length : products.filter(p => p.category === cat).length}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Sort */}
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
                      Ordenar
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {([
                        { id: 'az', label: 'A → Z' },
                        { id: 'price-asc', label: 'Precio: menor a mayor' },
                        { id: 'price-desc', label: 'Precio: mayor a menor' },
                        { id: 'stock', label: 'Mayor stock' },
                      ] as { id: typeof svcSort; label: string }[]).map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setSvcSort(opt.id)}
                          style={{
                            padding: '7px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                            textAlign: 'left', fontSize: '12px', fontWeight: svcSort === opt.id ? 700 : 400,
                            background: svcSort === opt.id ? '#0072ce18' : 'transparent',
                            color: svcSort === opt.id ? '#0072ce' : '#475569',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </aside>
                </div>

                {/* ── Grid de productos ── */}
                <div style={{ flex: 1 }}>

                {productsLoading ? (
                  <div style={{ textAlign: 'center', padding: '60px' }}><div className="spinner"></div></div>
                ) : filtered.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: '60px 20px',
                    background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0',
                    color: '#64748b', fontSize: '14px',
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '10px' }}>🎮</div>
                    No se encontraron productos con ese filtro.
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 200px))',
                    gap: '20px',
                  }}>
                    {filtered.map(p => {
                      // Calculate display price (cheapest variant or main price)
                      let displayPrice = p.price;
                      let isFrom = false;
                      if (p.options) {
                        try {
                          const opts = JSON.parse(p.options) as ProductOption[];
                          if (opts.length > 0) {
                            displayPrice = Math.min(...opts.map(o => o.price));
                            isFrom = opts.length > 1;
                          }
                        } catch (e) {}
                      }

                      // Convert to actual pesos
                      const actualPesos = Math.round(displayPrice * 1000);
                      
                      // Calculate fake original price for aesthetic discount display (~30-50% off)
                      const discountPercent = 35; // 35% discount
                      const originalPrice = Math.ceil((actualPesos / (1 - discountPercent / 100)) / 1000) * 1000;
                      const actualDiscount = Math.round((1 - (actualPesos / originalPrice)) * 100);

                      return (
                        <div
                          key={p.id}
                          onClick={() => { setSelectedProduct(p); setSelectedOptionIdx(0); }}
                          style={{
                            background: '#ffffff',
                            borderRadius: '20px',
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            boxShadow: '0 6px 20px rgba(0,0,0,0.04)',
                            transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            width: '100%',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 24px rgba(0,0,0,0.1)';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.04)';
                          }}
                        >
                          {/* Discount Badge */}
                          <div style={{
                            position: 'absolute',
                            top: '12px',
                            left: '12px',
                            width: '42px',
                            height: '42px',
                            backgroundColor: '#d6001c',
                            borderRadius: '50%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '9px',
                            lineHeight: '1.1',
                            zIndex: 10,
                            boxShadow: '0 3px 8px rgba(214,0,28,0.3)',
                          }}>
                            <span>{actualDiscount}%</span>
                            <span style={{ fontSize: '7px' }}>OFF</span>
                          </div>

                          {/* Game Cover Image container - NO PADDING to let image's own padding merge */}
                          <div style={{
                            padding: '0',
                            background: '#ffffff',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            position: 'relative',
                            width: '100%'
                          }}>
                            <div style={{
                              width: '100%',
                              position: 'relative',
                              overflow: 'hidden',
                            }}>
                              {p.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }}
                                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              ) : (
                                <div style={{
                                  width: '100%',
                                  aspectRatio: '3/4',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                                }}>
                                  <div style={{ fontSize: '30px', marginBottom: '4px' }}>🎮</div>
                                </div>
                              )}

                              {/* Stock badge overlay if out of stock */}
                              {p.stock === 0 && (
                                <div style={{
                                  position: 'absolute',
                                  inset: 0,
                                  background: 'rgba(0,0,0,0.6)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}>
                                  <span style={{
                                    background: '#ef4444',
                                    color: '#fff',
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    padding: '3px 10px',
                                    borderRadius: '5px',
                                    letterSpacing: '0.5px',
                                  }}>AGOTADO</span>
                                </div>
                              )}
                            </div>

                            {/* Blue Divider Line stretching edge-to-edge */}
                            <div style={{
                              height: '4px',
                              backgroundColor: '#004b87',
                              width: '100%',
                              marginTop: '0px',
                            }} />
                          </div>

                          {/* Info & Pricing */}
                          <div style={{
                            padding: '12px 16px 16px 16px',
                            background: '#ffffff',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            textAlign: 'center',
                          }}>
                            <div style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color: '#0f172a',
                              lineHeight: '1.4',
                              marginBottom: '12px',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              height: '36px',
                            }}>
                              {p.name}
                            </div>

                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '4px',
                            }}>
                              {/* Original price crossed out */}
                              <span style={{
                                fontSize: '12px',
                                textDecoration: 'line-through',
                                color: '#64748b',
                                fontWeight: 500,
                              }}>
                                ${originalPrice.toLocaleString('es-CO')}
                              </span>

                              {/* Sale price */}
                              <div style={{
                                fontSize: '17px',
                                fontWeight: 800,
                                color: '#004b87',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}>
                                {isFrom && <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>Desde</span>}
                                <span>${actualPesos.toLocaleString('es-CO')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          );
        })()}


        {/* TAB 4: CARGAR SALDO */}
        {activeTab === 'add-funds' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
            {/* Real Load Instructions */}
            <div className="panel-card">
              <h2 className="panel-title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="3">
                  <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="2" y1="10" x2="22" y2="10"></line>
                </svg>
                Métodos de Carga Oficial
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
                Para recargar saldo real a tu monedero de revendedor en pesos colombianos (COP), utiliza los siguientes métodos de transferencia directa:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ color: 'white', fontWeight: 700, marginBottom: '6px' }}>Recarga por Nequi / Daviplata</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Transfiere al número celular: <strong style={{ color: 'var(--accent-cyan)' }}>300 421 8295</strong>
                  </p>
                </div>
                
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ color: 'white', fontWeight: 700, marginBottom: '6px' }}>Registro de Recarga</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Una vez hecha la transferencia, envía el comprobante de pago con tu correo electrónico de cuenta al WhatsApp del administrador para la recarga manual e instantánea en tu perfil.
                  </p>
                </div>
              </div>
            </div>

            {/* Simulated Load (Sandbox testing) */}
            <div className="panel-card" style={{ border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <h2 className="panel-title" style={{ color: 'var(--accent-green)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="3">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                Simulador de Saldo (Pruebas)
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                Utiliza esta sección para añadir saldo ficticio de forma instantánea y probar la compra y flujo completo del panel.
              </p>

              {depositMessage && (
                <div style={{ 
                  backgroundColor: depositMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                  border: depositMessage.type === 'success' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)', 
                  color: depositMessage.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  fontSize: '13px', 
                  marginBottom: '20px'
                }}>
                  {depositMessage.text}
                </div>
              )}

              <form onSubmit={handleSimulatedDeposit}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Monto de Recarga (Escala COP)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '16px', top: '12px', fontWeight: 'bold', fontSize: '16px', color: 'white' }}>$</span>
                    <input
                      type="number"
                      required
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="Monto a recargar (Ej: 100 para $100.000)"
                      className="input-field"
                      style={{ width: '100%', paddingLeft: '32px' }}
                    />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                    Nota: Ingresar "100" añadirá $100.000 COP ficticios a tu cuenta.
                  </span>
                </div>

                <button 
                  type="submit" 
                  disabled={depositSubmitting}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, backgroundColor: 'var(--accent-green)', borderColor: 'var(--accent-green)' }}
                >
                  {depositSubmitting ? 'Procesando...' : 'Cargar Saldo Simulado'}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* CREDENTIALS VIEWER MODAL */}
      {viewingCredentialsOrder && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          backgroundColor: 'rgba(0, 0, 0, 0.85)', 
          backdropFilter: 'blur(8px)',
          zIndex: 300,
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
            border: '1px solid var(--border-focus)',
            boxShadow: '0 0 35px rgba(0, 114, 206, 0.4)',
            borderRadius: '16px',
            padding: '30px',
            position: 'relative'
          }}>
            <button 
              onClick={() => {
                setViewingCredentialsOrder(null);
                setCopied(false);
              }}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Credenciales de Cuenta Entregadas
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
              Aquí están los datos de inicio de sesión asociados al pedido del juego: <strong>{viewingCredentialsOrder.product.name}</strong>.
            </p>

            <div style={{ background: '#040710', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '20px', marginBottom: '24px', position: 'relative' }}>
              <pre style={{ 
                fontFamily: 'monospace', 
                fontSize: '14px', 
                color: 'var(--accent-cyan)', 
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-all', 
                lineHeight: '1.6' 
              }}>
                {viewingCredentialsOrder.credentials || "Los datos de la cuenta aún no están cargados por el administrador."}
              </pre>
              
              {viewingCredentialsOrder.credentials && (
                <button
                  onClick={() => copyToClipboard(viewingCredentialsOrder.credentials || '')}
                  className="btn btn-secondary"
                  style={{ position: 'absolute', top: '12px', right: '12px', padding: '6px 12px', fontSize: '11px', borderRadius: '6px', minWidth: '85px' }}
                >
                  {copied ? '¡Copiado!' : 'Copiar Datos'}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="button" 
                onClick={() => {
                  setViewingCredentialsOrder(null);
                  setCopied(false);
                }} 
                className="btn btn-primary" 
                style={{ flex: 1, padding: '12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail & Options Modal */}
      {selectedProduct && (() => {
        let opts: ProductOption[] = [];
        if (selectedProduct.options) {
          try {
            opts = JSON.parse(selectedProduct.options);
          } catch(e) {}
        }
        const hasOptions = opts.length > 0;
        const currentPrice = hasOptions ? opts[selectedOptionIdx].price : selectedProduct.price;

        return (
          <div 
            onClick={() => setSelectedProduct(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}>
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '800px',
                maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
                boxShadow: '0 24px 64px rgba(0,0,0,0.3)'
            }}>
              {/* Header */}
              <div style={{
                padding: '20px 24px', borderBottom: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                position: 'sticky', top: 0, background: '#fff', zIndex: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px',
                    padding: '4px 10px', borderRadius: '6px',
                    background: selectedProduct.category === 'PS5' ? '#00aaff' : selectedProduct.category === 'PS4' ? '#a855f7' : '#f59e0b',
                    color: '#fff', textTransform: 'uppercase'
                  }}>
                    {selectedProduct.category}
                  </span>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {selectedProduct.name}
                  </h2>
                </div>
                <button onClick={() => setSelectedProduct(null)} style={{
                  background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer',
                  padding: '4px', borderRadius: '50%'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                {/* Left: Image & Description */}
                <div style={{ flex: '1 1 400px', padding: '24px', borderRight: '1px solid #e2e8f0' }}>
                  <div style={{
                    width: '100%', aspectRatio: '16/9', borderRadius: '12px', overflow: 'hidden',
                    background: '#0f172a', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {selectedProduct.imageUrl ? (
                      <img src={selectedProduct.imageUrl} alt={selectedProduct.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ fontSize: '64px' }}>🎮</div>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Descripción del Servicio
                  </div>
                  <div 
                    dangerouslySetInnerHTML={{ __html: selectedProduct.description || 'Sin descripción disponible.' }}
                    style={{
                      fontSize: '14px', color: '#475569', lineHeight: '1.6',
                      maxHeight: '300px', overflowY: 'auto', paddingRight: '10px'
                    }} 
                  />
                </div>

                {/* Right: Pricing & Purchase */}
                <div style={{ flex: '1 1 300px', padding: '24px', background: '#f8fafc' }}>
                  
                  {hasOptions && (
                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Selecciona el paquete
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {opts.map((opt, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedOptionIdx(idx)}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '12px 16px', borderRadius: '10px',
                              border: selectedOptionIdx === idx ? '2px solid #0072ce' : '1px solid #cbd5e1',
                              background: selectedOptionIdx === idx ? '#eff6ff' : '#fff',
                              cursor: 'pointer', transition: 'all 0.15s ease', textAlign: 'left'
                            }}
                          >
                            <span style={{ fontSize: '14px', fontWeight: selectedOptionIdx === idx ? 700 : 500, color: '#0f172a' }}>
                              {opt.label}
                            </span>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: selectedOptionIdx === idx ? '#0072ce' : '#64748b' }}>
                              {formatCOP(opt.price)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                    padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                      Total a descontar
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '24px' }}>
                      {formatCOP(currentPrice)}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#64748b' }}>Tu saldo actual</span>
                      <span style={{ fontWeight: 700, color: user.balance >= currentPrice ? '#10b981' : '#ef4444' }}>
                        {formatCOP(user.balance)}
                      </span>
                    </div>

                    {orderMessage && (
                      <div style={{
                        padding: '12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '16px',
                        background: orderMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
                        color: orderMessage.type === 'success' ? '#16a34a' : '#ef4444',
                        border: `1px solid ${orderMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`
                      }}>
                        {orderMessage.text}
                      </div>
                    )}

                    <button
                      onClick={async () => {
                        setOrderMessage(null);
                        setOrderSubmitting(true);
                        try {
                          const res = await fetch('/api/orders', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              productId: selectedProduct.id,
                              priceOverride: currentPrice, // Assuming the backend allows/checks this or we just use it for display
                              optionLabel: hasOptions ? opts[selectedOptionIdx].label : undefined 
                            }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.message || 'Error al procesar el pedido');
                          
                          setOrderMessage({ type: 'success', text: '¡Pedido realizado con éxito!' });
                          fetchProducts();
                          fetchOrders();
                          setTimeout(() => {
                            setSelectedProduct(null);
                            setActiveTab('orders');
                            setOrderMessage(null);
                          }, 1500);
                        } catch (err: any) {
                          setOrderMessage({ type: 'error', text: err.message });
                        } finally {
                          setOrderSubmitting(false);
                        }
                      }}
                      disabled={orderSubmitting || selectedProduct.stock <= 0 || user.balance < currentPrice}
                      style={{
                        width: '100%', padding: '14px', borderRadius: '8px', border: 'none',
                        background: selectedProduct.stock <= 0 ? '#94a3b8' : user.balance < currentPrice ? '#ef4444' : '#0072ce',
                        color: '#fff', fontSize: '15px', fontWeight: 700, cursor: (orderSubmitting || selectedProduct.stock <= 0 || user.balance < currentPrice) ? 'not-allowed' : 'pointer',
                        transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                      }}
                    >
                      {orderSubmitting ? (
                        <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '3px', borderTopColor: '#fff', borderRightColor: '#fff', borderBottomColor: '#fff', borderLeftColor: 'transparent' }}></div>
                      ) : selectedProduct.stock <= 0 ? (
                        'Producto Agotado'
                      ) : user.balance < currentPrice ? (
                        'Saldo Insuficiente'
                      ) : (
                        <>Comprar Ahora</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
