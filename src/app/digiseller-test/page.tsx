"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function DigisellerTestPage() {
  // Login States
  const [sellerId, setSellerId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginResponse, setLoginResponse] = useState<any>(null);
  const [token, setToken] = useState('');

  // Product States
  const [productId, setProductId] = useState('');
  const [productLoading, setProductLoading] = useState(false);
  const [productResponse, setProductResponse] = useState<any>(null);

  const handleTestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginResponse(null);

    try {
      const res = await fetch('/api/digiseller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          sellerId,
          apiKey,
        }),
      });

      const data = await res.json();
      setLoginResponse(data);

      if (data.retval === 0 && data.token) {
        setToken(data.token);
      } else {
        setToken('');
      }
    } catch (err: any) {
      setLoginResponse({ error: err.message || 'Error de conexión' });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleFetchProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductLoading(true);
    setProductResponse(null);

    try {
      const res = await fetch('/api/digiseller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'product',
          productId,
          token,
        }),
      });

      const data = await res.json();
      setProductResponse(data);
    } catch (err: any) {
      setProductResponse({ error: err.message || 'Error de conexión' });
    } finally {
      setProductLoading(false);
    }
  };

  return (
    <div style={{ 
      background: 'linear-gradient(180deg, #1e0b36 0%, #0c122c 100%)', 
      minHeight: '100vh',
      color: '#f3f4f6',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, background: 'linear-gradient(135deg, #00f0ff, #0072ce)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              🔬 Digiseller API Sandbox
            </h1>
            <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '4px' }}>
              Prueba la conexión a la API oficial de Digiseller y verifica tus credenciales sin base de datos ni login.
            </p>
          </div>
          <Link href="/" style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', textDecoration: 'none', fontSize: '14px', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)' }}>
            Volver al Panel
          </Link>
        </div>

        {/* Info Alert */}
        <div style={{ background: 'rgba(0, 114, 206, 0.1)', border: '1px solid rgba(0, 114, 206, 0.2)', padding: '16px 20px', borderRadius: '12px', color: '#60a5fa', fontSize: '13px', lineHeight: '1.6', marginBottom: '30px' }}>
          <strong>¿Dónde encuentro estos datos?</strong> En tu panel de Digiseller (mostrado en tu captura de pantalla):
          <ul style={{ marginLeft: '20px', marginTop: '6px' }}>
            <li><strong>Seller ID</strong>: Es tu número de registro de Digiseller (aparece en tu perfil o esquina de cuenta).</li>
            <li><strong>API Key</strong>: Haz clic en el enlace <strong>"API"</strong> que está abajo a la izquierda en el pie de página de Digiseller. Allí podrás generar tu clave API y configurar sus permisos (activa el permiso para consultar productos).</li>
          </ul>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
          
          {/* STEP 1: AUTHENTICATION */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#00f0ff', color: '#070b19', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>1</span>
              Obtener Token de Acceso
            </h2>

            <form onSubmit={handleTestLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px', fontWeight: 600 }}>Digiseller Seller ID</label>
                <input
                  type="number"
                  required
                  value={sellerId}
                  onChange={(e) => setSellerId(e.target.value)}
                  placeholder="Ej: 1134057"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px', fontWeight: 600 }}>API Key (Secret Key)</label>
                <input
                  type="password"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Introduce tu API Key de Digiseller"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', fontSize: '14px' }}
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #00f0ff, #0072ce)', color: 'white', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s' }}
              >
                {loginLoading ? 'Conectando...' : 'Probar Conexión'}
              </button>
            </form>

            {/* Login Response output */}
            {loginResponse && (
              <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Respuesta de Digiseller:</h3>
                
                {loginResponse.retval === 0 ? (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '12px', borderRadius: '8px', color: '#34d399', fontSize: '13px', marginBottom: '10px' }}>
                    <strong>✅ ¡Conexión Exitosa!</strong> Token generado correctamente.
                  </div>
                ) : (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '8px', color: '#f87171', fontSize: '13px', marginBottom: '10px' }}>
                    <strong>❌ Fallo en la conexión</strong>. Código de error: {loginResponse.retval} - {loginResponse.desc || loginResponse.message || 'Credenciales incorrectas o IP bloqueada'}
                  </div>
                )}

                <pre style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '8px', fontSize: '12px', color: '#a7f3d0', overflowX: 'auto', fontFamily: 'monospace' }}>
                  {JSON.stringify(loginResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* STEP 2: QUERY PRODUCT */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#0072ce', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>2</span>
              Consultar un Producto de Plati.market
            </h2>

            <form onSubmit={handleFetchProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px', fontWeight: 600 }}>Token de Acceso (Autorización)</label>
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Genera el token en el paso 1 o pégalo aquí"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', fontSize: '14px', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px', fontWeight: 600 }}>ID del Producto de Plati/Digiseller</label>
                <input
                  type="text"
                  required
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  placeholder="Ej: 4156789 (puedes buscarlo en una URL de Plati)"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', fontSize: '14px' }}
                />
              </div>

              <button
                type="submit"
                disabled={productLoading || !token}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: token ? 'linear-gradient(135deg, #0072ce, #00569c)' : 'rgba(255,255,255,0.05)', color: token ? 'white' : '#6b7280', fontSize: '14px', fontWeight: 700, cursor: token ? 'pointer' : 'not-allowed' }}
              >
                {productLoading ? 'Consultando...' : 'Consultar Producto'}
              </button>
            </form>

            {/* Product Response output */}
            {productResponse && (
              <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Datos de Producto Recibidos:</h3>

                {productResponse.retval === 0 || productResponse.product ? (
                  <div style={{ background: 'rgba(0, 114, 206, 0.05)', border: '1px solid rgba(0, 114, 206, 0.1)', padding: '16px', borderRadius: '12px', marginBottom: '14px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'white', margin: '0 0 8px 0' }}>
                      {productResponse.product?.name || 'Nombre no disponible'}
                    </h4>
                    <div style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.5' }}>
                      <p>💵 Precio: <strong style={{ color: '#00f0ff' }}>${productResponse.product?.price || '0.00'} USD</strong></p>
                      <p>📦 Stock: {productResponse.product?.release ? 'Disponible' : 'Agotado'}</p>
                      <p>👤 Vendedor: {productResponse.product?.partner_percent ? `Comisión socio: ${productResponse.product?.partner_percent}%` : 'N/A'}</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '8px', color: '#f87171', fontSize: '13px', marginBottom: '10px' }}>
                    <strong>❌ Error al consultar producto</strong>: {productResponse.desc || productResponse.message || 'ID inválido o sin permisos'}
                  </div>
                )}

                <pre style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '8px', fontSize: '12px', color: '#bfdbfe', overflowX: 'auto', fontFamily: 'monospace', maxHeight: '250px' }}>
                  {JSON.stringify(productResponse, null, 2)}
                </pre>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
