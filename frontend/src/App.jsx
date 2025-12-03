import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import CajasPage from './pages/CajasPage';
import DocumentosPage from './pages/DocumentosPage';
import InventarioPage from './pages/InventarioPage';
import LoginPage from './pages/LoginPage';

function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [usuario, setUsuario] = useState(() => {
    try {
      const ses = sessionStorage.getItem('usuario');
      if (ses) return JSON.parse(ses);
      return JSON.parse(localStorage.getItem('usuario'));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const checkUsuario = () => {
      try {
        const ses = sessionStorage.getItem('usuario'); if (ses) { setUsuario(JSON.parse(ses)); return; } setUsuario(JSON.parse(localStorage.getItem('usuario')));
      } catch {
        setUsuario(null);
      }
    };
    window.addEventListener('storage', checkUsuario);
    window.addEventListener('usuarioLogin', checkUsuario);
    return () => {
      window.removeEventListener('storage', checkUsuario);
      window.removeEventListener('usuarioLogin', checkUsuario);
    };
  }, []);

  if (!usuario && window.location.pathname !== '/login') {
    window.location.href = '/login';
    return null;
  }

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  const handleLogout = () => { sessionStorage.removeItem('usuario'); localStorage.removeItem('usuario'); sessionStorage.removeItem('token'); localStorage.removeItem('token'); window.location.href = '/login'; };

  return (
    <div>
      {window.location.pathname !== '/login' && (
        <nav className="main-navbar">
          <div className="user-bar">
            <span className="user-name">{usuario ? `Usuario: ${usuario.nombre_completo}` : ''}</span>
            <div className="user-actions">
              <button className="theme-toggle-btn" onClick={toggleTheme}>
                {theme === 'dark' ? 'Tema oscuro' : 'Tema claro'}
              </button>
              <button className="theme-toggle-btn" onClick={handleLogout}>Cerrar sesión</button>
            </div>
          </div>
          <ul className="main-menu nav-cards">
            <li className="nav-card"><Link to="/cajas">Cajas</Link></li>
            <li className="nav-card"><Link to="/documentos">Documentos</Link></li>
            <li className="nav-card"><Link to="/inventario">Inventario</Link></li>
          </ul>
        </nav>
      )}
      {window.location.pathname !== '/login' && <hr />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cajas" element={<CajasPage />} />
        <Route path="/documentos" element={<DocumentosPage />} />
        <Route path="/inventario" element={<InventarioPage />} />
        <Route path="/" element={<CajasPage />} />
      </Routes>
    </div>
  );
}

export default App;
