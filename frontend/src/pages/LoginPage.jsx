import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

const API_BASE =
  import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/+$/, '')
    : '/api';

function LoginPage() {
  const [formData, setFormData] = useState({ nombre_completo: '', password: '' });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({ nombre_completo: false, password: false });
  const navigate = useNavigate();

  useEffect(() => { document.title = 'Iniciar Sesión - Sistema de Almacén'; }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error de autenticación');
      const storage = sessionStorage;
      storage.setItem('usuario', JSON.stringify(data.usuario));
      if (data.token) storage.setItem('token', data.token);
      window.dispatchEvent(new Event('usuarioLogin'));
      navigate('/cajas');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const isFieldInvalid = (field) => touched[field] && !formData[field];

  return (
    <div className="login-bg">
      <div className="lines-angles">
        <div className="animated-line straight"></div>
        <div className="animated-line angle"></div>
        <div className="animated-line angle2"></div>
        <div className="animated-line straight2"></div>
      </div>
      <div className="login-container">
        <div className="login-content">
          <form onSubmit={handleSubmit} className="login-form-card" noValidate autoComplete="off">
            <div className="logo-container">
              <img src="/sunat_logo.png" alt="Logo SUNAT" className="login-logo"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling?.classList.remove('hidden'); }} />
              <span className="logo-fallback hidden">SUNAT</span>
            </div>

            <h1 className="login-title">ADUANAS / SUNAT <br /><br />SISTEMA DE CONTROL DE ARCHIVO</h1>
            <p className="login-subtitle"><br />Iniciar Sesión</p>

            <div className="login-field">
              <label htmlFor="nombre_completo">Usuario</label>
              <div className="input-container">
                <input type="text" id="nombre_completo" name="nombre_completo" value={formData.nombre_completo}
                  onChange={handleChange} onBlur={handleBlur} className={isFieldInvalid('nombre_completo') ? 'invalid' : ''}
                  required autoFocus aria-describedby={error ? 'login-error' : undefined} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password">Contraseña</label>
              <div className="input-container">
                <input type="password" id="password" name="password" value={formData.password}
                  onChange={handleChange} onBlur={handleBlur} className={isFieldInvalid('password') ? 'invalid' : ''}
                  required aria-describedby={error ? 'login-error' : undefined} autoComplete="new-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
              </div></div>            <button type="submit" className={`login-btn ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
              {isLoading ? 'Ingresando...' : 'Ingresar'}
            </button>

            {error && (
              <div className="error-message" id="login-error" role="alert">{error}</div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
