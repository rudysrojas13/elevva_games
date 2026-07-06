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
  clientName?: string;
  clientPrice?: number;
  clientNotes?: string;
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

  // Reseller client metadata state
  const [editingResellerOrder, setEditingResellerOrder] = useState<Order | null>(null);
  const [resellerClientName, setResellerClientName] = useState('');
  const [resellerClientPrice, setResellerClientPrice] = useState('');
  const [resellerClientNotes, setResellerClientNotes] = useState('');
  const [resellerSaving, setResellerSaving] = useState(false);

  // Dynamic product description loading state
  const [productDetail, setProductDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const activeId = selectedProductId || selectedProduct?.id;
    if (!activeId) {
      setProductDetail(null);
      return;
    }
    if (productDetail && productDetail.id === activeId) return;

    const fetchDetail = async () => {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/products/${activeId}`);
        if (res.ok) {
          const data = await res.json();
          setProductDetail(data);
        }
      } catch (err) {
        console.error('Error loading details:', err);
      } finally {
        setDetailLoading(false);
      }
    };
    fetchDetail();
  }, [selectedProductId, selectedProduct]);

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

  const handleSaveResellerMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResellerOrder) return;
    setResellerSaving(true);
    try {
      const res = await fetch(`/api/orders/${editingResellerOrder.id}/reseller-metadata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: resellerClientName,
          clientPrice: parseFloat(resellerClientPrice) || 0,
          clientNotes: resellerClientNotes
        })
      });
      if (res.ok) {
        await fetchOrders();
        setEditingResellerOrder(null);
      } else {
        const errorData = await res.json();
        alert(`Error al guardar: ${errorData.message || 'Error desconocido'}`);
      }
    } catch (err: any) {
      console.error('Error al guardar datos de la venta minorista:', err);
      alert(`Error al guardar: ${err.message || 'Error de conexión'}`);
    } finally {
      setResellerSaving(false);
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
        minHeight: '100vh',
        backgroundColor: '#070b19',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif"
      }}>
        {/* Absolute Background Glows */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          left: '-10%',
          width: '50vw',
          height: '50vw',
          background: 'radial-gradient(circle, rgba(0, 240, 255, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 1
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-10%',
          width: '50vw',
          height: '50vw',
          background: 'radial-gradient(circle, rgba(0, 114, 206, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 1
        }} />

        <div style={{
          display: 'flex',
          width: '100%',
          zIndex: 2,
          flexDirection: 'row',
          flexWrap: 'wrap'
        }}>
          
          {/* LEFT SIDE: Brand & Reseller Benefits */}
          <div className="login-showcase" style={{
            flex: '1 1 500px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '60px 80px',
            borderRight: '1px solid rgba(255,255,255,0.04)',
            background: 'linear-gradient(180deg, rgba(7, 11, 25, 0.8) 0%, rgba(13, 21, 45, 0.4) 100%)',
            boxSizing: 'border-box'
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              {/* Brand Logo */}
              <div style={{ 
                fontSize: '32px', 
                fontWeight: 900, 
                marginBottom: '20px',
                background: 'linear-gradient(135deg, #00f0ff, #0072ce)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                letterSpacing: '0.05em'
              }}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="url(#cyan-blue-grad)" strokeWidth="3">
                  <rect x="2" y="2" width="20" height="20" rx="5" strokeWidth="3"></rect>
                  <circle cx="12" cy="12" r="5" strokeWidth="3"></circle>
                </svg>
                <span>ElevvaGames🎮</span>
              </div>

              <h1 style={{ 
                fontSize: '28px', 
                fontWeight: 800, 
                color: 'white', 
                lineHeight: '1.3', 
                marginBottom: '20px',
                letterSpacing: '-0.5px'
              }}>
                El panel de distribución mayorista líder para revendedores de videojuegos
              </h1>
              
              <p style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '15px', 
                lineHeight: '1.6', 
                marginBottom: '40px' 
              }}>
                Únete a nuestra red oficial de distribuidores y obtén acceso instantáneo a nuestro amplio catálogo de juegos de PS4, PS5 y suscripciones con entrega automatizada.
              </p>

              {/* Benefits List */}
              <div className="login-benefits-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                
                {/* Benefit 1 */}
                <div style={{ display: 'flex', gap: '14px' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '10px',
                    background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2.5">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                    </svg>
                  </div>
                  <div>
                    <h4 style={{ color: 'white', fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>Entrega Inmediata</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>
                      Nuestro sistema automatizado procesa y entrega tus credenciales al instante.
                    </p>
                  </div>
                </div>

                {/* Benefit 2 */}
                <div style={{ display: 'flex', gap: '14px' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 style={{ color: 'white', fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>Soporte Personalizado</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>
                      Atención al cliente directa e inmediata a través de WhatsApp.
                    </p>
                  </div>
                </div>

                {/* Benefit 3 */}
                <div style={{ display: 'flex', gap: '14px' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '10px',
                    background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 style={{ color: 'white', fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>Mejores Precios</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>
                      Tarifas de distribuidor exclusivas con altos márgenes de ganancia para tu negocio.
                    </p>
                  </div>
                </div>

                {/* Benefit 4 */}
                <div style={{ display: 'flex', gap: '14px' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '10px',
                    background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5">
                      <rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect>
                      <path d="M12 12h.01"></path>
                      <path d="M17 12h.01"></path>
                      <path d="M7 12h.01"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 style={{ color: 'white', fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>Alquiler de Juegos</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>
                      Catálogo exclusivo con opción de alquiler por 7 días o más para tus clientes.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Interactive Login/Register Form */}
          <div style={{
            flex: '1 1 450px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            boxSizing: 'border-box'
          }}>
            <div style={{
              width: '100%',
              maxWidth: '440px',
              backgroundColor: 'rgba(13, 21, 45, 0.45)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '24px',
              padding: '40px 32px',
              boxShadow: 'var(--shadow-lg)',
              boxSizing: 'border-box'
            }}>
              
              {/* Small Logo for Mobile */}
              <div className="login-mobile-brand" style={{ 
                fontSize: '22px', 
                fontWeight: 900, 
                textAlign: 'center', 
                marginBottom: '28px',
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--ps-blue))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'none',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px'
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="url(#cyan-blue-grad)" strokeWidth="3">
                  <rect x="2" y="2" width="20" height="20" rx="5" strokeWidth="3"></rect>
                  <circle cx="12" cy="12" r="5" strokeWidth="3"></circle>
                </svg>
                <span>ElevvaGames🎮</span>
              </div>

              <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', textAlign: 'left', color: '#fff', letterSpacing: '-0.5px' }}>
                {authMode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
              </h2>
              
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '28px' }}>
                {authMode === 'login' 
                  ? 'Ingresa tus credenciales para acceder al panel de revendedores.' 
                  : 'Registra tus datos para unirte como distribuidor oficial.'}
              </p>

              {authError && (
                <div style={{ 
                  backgroundColor: 'rgba(239, 68, 68, 0.08)', 
                  border: '1px solid rgba(239, 68, 68, 0.2)', 
                  color: 'var(--accent-red)', 
                  padding: '12px 16px', 
                  borderRadius: '10px', 
                  fontSize: '13px', 
                  marginBottom: '24px',
                  lineHeight: '1.4'
                }}>
                  {authError}
                </div>
              )}

              <form onSubmit={handleAuthSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '28px' }}>
                  {authMode === 'register' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Nombre Completo</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Juan Gómez"
                        className="input-field"
                        style={{ width: '100%', height: '46px', fontSize: '14px' }}
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="input-field"
                      style={{ width: '100%', height: '46px', fontSize: '14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Contraseña</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input-field"
                      style={{ width: '100%', height: '46px', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={authSubmitting}
                  className="btn btn-primary" 
                  style={{ 
                    width: '100%', 
                    height: '48px',
                    borderRadius: '12px', 
                    fontSize: '15px', 
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, var(--ps-blue) 0%, var(--accent-cyan) 100%)',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0, 114, 206, 0.35)',
                    cursor: 'pointer'
                  }}
                >
                  {authSubmitting ? 'Procesando...' : authMode === 'login' ? 'Entrar al Panel ⚡' : 'Comenzar Ahora 🚀'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '28px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {authMode === 'login' ? (
                  <>
                    ¿No tienes cuenta de revendedor?{' '}
                    <button 
                      onClick={() => setAuthMode('register')} 
                      style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: 700, padding: 0 }}
                    >
                      Regístrate aquí
                    </button>
                  </>
                ) : (
                  <>
                    ¿Ya eres revendedor?{' '}
                    <button 
                      onClick={() => setAuthMode('login')} 
                      style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: 700, padding: 0 }}
                    >
                      Inicia sesión
                    </button>
                  </>
                )}
              </div>
            </div>
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

      {/* Top Navbar - Premium Header matching Admin */}
      <header>
        <div className="container nav-container">
          {/* Brand Logo */}
          <div className="logo" style={{ cursor: 'default', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#cyan-blue-grad)" strokeWidth="3">
              <rect x="2" y="2" width="20" height="20" rx="5" strokeWidth="3"></rect>
              <circle cx="12" cy="12" r="5" strokeWidth="3"></circle>
            </svg>
            <span>ElevvaGames🎮</span>
          </div>

          {/* Navigation Menu */}
          <ul className="nav-menu">
            <li>
              <button 
                onClick={() => setActiveTab('new-order')} 
                className={`nav-link ${activeTab === 'new-order' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Nuevo Pedido
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('orders')} 
                className={`nav-link ${activeTab === 'orders' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Mis Pedidos
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('services')} 
                className={`nav-link ${activeTab === 'services' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Servicios
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('add-funds')} 
                className={`nav-link ${activeTab === 'add-funds' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cargar Saldo
              </button>
            </li>
          </ul>

          {/* Actions (User balance + Logout) */}
          <div className="nav-actions">
            {/* User chip */}
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
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.8px', lineHeight: 1 }}>Revendedor</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.95)', marginTop: '2px', lineHeight: 1 }}>{user.name}</div>
              </div>
              <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.15)', margin: '0 4px' }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.8px', lineHeight: 1 }}>Saldo</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#00f0ff', marginTop: '2px', lineHeight: 1 }}>{formatCOP(user.balance)}</div>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ fontSize: '13px', padding: '8px 16px' }}
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Area matching Admin */}
      <main className="container" style={{ padding: '40px 24px 80px 24px' }}>
        
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
                      {detailLoading ? (
                        <p style={{ color: '#64748b', fontSize: '13px', fontStyle: 'italic', margin: '10px 0' }}>Cargando descripción...</p>
                      ) : (
                        <p 
                          style={{ color: '#475569', fontSize: '13px', lineHeight: '1.5', margin: '10px 0' }}
                          dangerouslySetInnerHTML={{ 
                            __html: productDetail?.id === selectedProductId ? productDetail.description : 'Sin descripción disponible.' 
                          }}
                        />
                      )}
                      
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
        {activeTab === 'orders' && (() => {
          // Calculate reseller statistics
          const completedResellerOrders = orders.filter(o => o.clientPrice && o.clientPrice > 0);
          const totalRevenue = completedResellerOrders.reduce((sum, o) => sum + (o.clientPrice || 0), 0);
          const totalCost = completedResellerOrders.reduce((sum, o) => sum + o.total, 0);
          const netProfit = totalRevenue - totalCost;

          return (
            <div className="panel-card">
              <h2 className="panel-title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="3">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Historial de Pedidos y Ventas
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                Aquí puedes ver el estado de tus compras mayoristas, revelar credenciales y administrar las ventas minoristas a tus clientes finales.
              </p>

              {/* STATS CARDS FOR RESELLERS */}
              {!ordersLoading && orders.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '20px',
                  marginBottom: '30px'
                }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recaudado de Clientes</span>
                    <strong style={{ fontSize: '20px', color: 'white' }}>{formatCOP(totalRevenue)}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{completedResellerOrders.length} ventas registradas</span>
                  </div>
                  
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inversión Mayorista</span>
                    <strong style={{ fontSize: '20px', color: 'white' }}>{formatCOP(totalCost)}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Costo neto pagado</span>
                  </div>

                  <div style={{
                    background: 'rgba(16, 185, 129, 0.05)',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <span style={{ fontSize: '12px', color: 'var(--accent-green)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tu Ganancia Neta</span>
                    <strong style={{ fontSize: '24px', color: 'var(--accent-green)', fontWeight: 800 }}>{formatCOP(netProfit)}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--accent-green)' }}>Margen de ganancia acumulado</span>
                  </div>
                </div>
              )}

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
                        <th>Mi Cliente / Venta</th>
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {o.clientName ? (
                                <>
                                  <strong style={{ color: 'white', fontSize: '13px' }}>{o.clientName}</strong>
                                  <span style={{ color: 'var(--accent-green)', fontSize: '12px', fontWeight: 'bold' }}>
                                    {formatCOP(o.clientPrice || 0)}
                                  </span>
                                </>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>Sin registrar</span>
                              )}
                              <button
                                onClick={() => {
                                  setEditingResellerOrder(o);
                                  setResellerClientName(o.clientName || '');
                                  setResellerClientPrice(o.clientPrice ? o.clientPrice.toString() : '');
                                  setResellerClientNotes(o.clientNotes || '');
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--accent-cyan)',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  textDecoration: 'underline',
                                  padding: 0,
                                  textAlign: 'left',
                                  marginTop: '4px',
                                  fontWeight: 600
                                }}
                              >
                                {o.clientName ? '✏️ Editar venta' : '➕ Registrar venta'}
                              </button>
                            </div>
                          </td>
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
          );
        })()}

        {/* TAB 3: SERVICIOS — Catálogo con filtros */}
        {activeTab === 'services' && (() => {
          const catColor: Record<string, string> = {
            Todos: '#0072ce',
            Alquiler: '#10b981',
            PS5: '#00aaff', 
            PS4: '#a855f7', 
            Xbox: '#22c55e',
            Suscripciones: '#f59e0b', 
            PC: '#ef4444',
          };
          const cats = ['Todos', 'Alquiler', ...Array.from(new Set(products.map(p => p.category)))];
          const filtered = products
            .filter(p => {
              let matchCat = true;
              if (svcCat === 'Alquiler') {
                matchCat = p.name.toLowerCase().includes('alquiler');
              } else if (svcCat !== 'Todos') {
                matchCat = p.category === svcCat;
              }
              const matchSearch = p.name.toLowerCase().includes(svcSearch.toLowerCase());
              return matchCat && matchSearch;
            })
            .sort((a, b) => {
              // Priority products (shown first)
              const getPriorityScore = (product: typeof a) => {
                const nameLower = product.name.toLowerCase();
                if (product.id === '5409724' || nameLower.includes('fc 26') || nameLower.includes('fifa 26') || nameLower.includes('fifa26')) return 0;
                if (product.id === '4637360-PS5' || nameLower.includes('activación de astro bot p3 (ps5)')) return 1;
                if (product.id === '5553598' || (nameLower.includes('battlefield') && nameLower.includes('p2/p3'))) return 2;
                if (product.id === '5216451' || nameLower.includes('gran turismo™ 7 ps4™ ps5 p3')) return 3;
                if (product.id === '5346653' || (nameLower.includes('demon slayer') && nameLower.includes('p3'))) return 4;
                if (product.id === '5597353' || (nameLower.includes('arc raiders') && nameLower.includes('p2/p3'))) return 5;
                return 999;
              };

              const scoreA = getPriorityScore(a);
              const scoreB = getPriorityScore(b);

              if (scoreA !== scoreB) {
                return scoreA - scoreB;
              }

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
                            {cat === 'Todos' ? products.length : 
                             cat === 'Alquiler' ? products.filter(p => p.name.toLowerCase().includes('alquiler')).length :
                             products.filter(p => p.category === cat).length}
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

                          {/* Game Cover Image container */}
                          <div style={{
                            padding: '16px 0',
                            background: '#ffffff',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            width: '100%',
                            aspectRatio: '3/4',
                          }}>
                            {/* Determine if it's PS4 or PS5 */}
                            {(p.category === 'PS4' || p.category === 'PS5') ? (
                              <div style={{
                                width: '82%',
                                height: '92%',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                boxShadow: '0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.1)',
                                border: p.category === 'PS4' ? '2px solid #003791' : '2px solid #e2e8f0',
                                display: 'flex',
                                flexDirection: 'column',
                                background: '#090e21',
                                position: 'relative',
                              }}>
                                {/* Case Header */}
                                <div style={{
                                   height: '24px',
                                   background: p.category === 'PS4' ? '#003791' : '#ffffff',
                                   color: p.category === 'PS4' ? '#ffffff' : '#000000',
                                   display: 'flex',
                                   alignItems: 'center',
                                   justifyContent: 'center',
                                   gap: '6px',
                                   fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                   borderBottom: p.category === 'PS5' ? '2.5px solid #003791' : 'none',
                                   userSelect: 'none',
                                   flexShrink: 0,
                                 }}>
                                   {/* PlayStation Icon SVG */}
                                   <svg 
                                     viewBox="0 0 16 16" 
                                     width="13" 
                                     height="13" 
                                     fill="currentColor"
                                     style={{ display: 'inline-block', opacity: 0.95 }}
                                   >
                                     <path d="M15.858 11.451c-.313.395-1.079.676-1.079.676l-5.696 2.046v-1.509l4.192-1.493c.476-.17.549-.412.162-.538-.386-.127-1.085-.09-1.56.08l-2.794.984v-1.566l.161-.054s.807-.286 1.942-.412c1.135-.125 2.525.017 3.616.43 1.23.39 1.368.962 1.056 1.356M9.625 8.883v-3.86c0-.453-.083-.87-.508-.988-.326-.105-.528.198-.528.65v9.664l-2.606-.827V2c1.108.206 2.722.692 3.59.985 2.207.757 2.955 1.7 2.955 3.825 0 2.071-1.278 2.856-2.903 2.072Zm-8.424 3.625C-.061 12.15-.271 11.41.304 10.984c.532-.394 1.436-.69 1.436-.69l3.737-1.33v1.515l-2.69.963c-.474.17-.547.411-.161.538.386.126 1.085.09 1.56-.08l1.29-.469v1.356l-.257.043a8.45 8.45 0 0 1-4.018-.323Z"/>
                                   </svg>
                                   <span style={{ 
                                     fontSize: '11px', 
                                     fontWeight: 900, 
                                     letterSpacing: '1px',
                                     transform: 'scaleY(0.9)',
                                     display: 'inline-block'
                                   }}>
                                     {p.category}
                                   </span>
                                 </div>
                                {/* Game Artwork */}
                                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                                  {p.imageUrl ? (
                                    <img
                                      src={p.imageUrl}
                                      alt={p.name}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                  ) : (
                                    <div style={{
                                      width: '100%',
                                      height: '100%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                                    }}>
                                      <div style={{ fontSize: '24px' }}>🎮</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* Standard render for Subscriptions or other categories */
                              <div style={{
                                width: '85%',
                                height: '90%',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                                display: 'flex',
                                flexDirection: 'column',
                                background: '#090e21',
                                position: 'relative',
                              }}>
                                {p.imageUrl ? (
                                  <img
                                    src={p.imageUrl}
                                    alt={p.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                ) : (
                                  <div style={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                                  }}>
                                    <div style={{ fontSize: '30px' }}>🎮</div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Stock badge overlay if out of stock */}
                            {p.stock === 0 && (
                              <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(0,0,0,0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '12px 12px 0 0',
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
          <div style={{ maxWidth: '650px', margin: '0 auto' }}>
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
                    dangerouslySetInnerHTML={{ 
                      __html: detailLoading 
                        ? 'Cargando descripción...' 
                        : (productDetail?.id === selectedProduct.id ? productDetail.description : 'Sin descripción disponible.') 
                    }}
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

      {/* EDIT RESELLER METADATA MODAL */}
      {editingResellerOrder && (
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
            maxWidth: '500px', 
            backgroundColor: 'var(--bg-secondary)', 
            border: '1px solid var(--border-focus)',
            boxShadow: '0 0 35px rgba(0, 114, 206, 0.4)',
            borderRadius: '16px',
            padding: '30px',
            position: 'relative'
          }}>
            <button 
              onClick={() => setEditingResellerOrder(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📝 Registrar / Editar Venta
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
              Registra los datos de tu cliente final para este pedido de: <strong>{editingResellerOrder.product.name}</strong>.
            </p>

            <form onSubmit={handleSaveResellerMetadata}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Nombre del Cliente Final
                </label>
                <input
                  type="text"
                  value={resellerClientName}
                  onChange={(e) => setResellerClientName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Precio de Venta Minorista (en COP)
                </label>
                <input
                  type="number"
                  value={resellerClientPrice}
                  onChange={(e) => setResellerClientPrice(e.target.value)}
                  placeholder="Ej: 25000 (para $25.000 COP)"
                  className="input-field"
                  style={{ width: '100%' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  Costo mayorista pagado por ti: <strong style={{ color: 'white' }}>{formatCOP(editingResellerOrder.total)}</strong>
                </span>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Notas Privadas / Observaciones
                </label>
                <textarea
                  value={resellerClientNotes}
                  onChange={(e) => setResellerClientNotes(e.target.value)}
                  placeholder="Ej: Entregado por WhatsApp / Pendiente de renovación"
                  className="input-field"
                  style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingResellerOrder(null)}
                  className="btn"
                  style={{ padding: '10px 18px', borderRadius: '8px', fontSize: '14px', background: 'transparent', border: '1px solid var(--border-color)', color: 'white' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resellerSaving}
                  className="btn btn-primary"
                  style={{ padding: '10px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: 700 }}
                >
                  {resellerSaving ? 'Guardando...' : 'Guardar Detalles'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
