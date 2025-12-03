import React, { useState } from 'react';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose, onConfirm }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleClose = () => {
    setUsername('');
    setPassword('');
    setError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Por favor, ingrese usuario y contraseña.');
      return;
    }

    try {
      await onConfirm(username, password);
      setUsername('');
      setPassword('');
      handleClose();
    } catch (err) {
      setError(err.message || 'Error de autenticación');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={handleClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <h2>Autenticación Requerida</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Usuario</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingrese su usuario"
              autoFocus
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingrese su contraseña"
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="modal-buttons">
            <button type="button" className="cancel" onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className="confirm">
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
