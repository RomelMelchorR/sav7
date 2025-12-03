import React from "react";
import "./ProgressBar.css";

const ProgressBar = ({ progress, currentRow, totalRows, startTime, onCancel, onClose, fileName }) => {
  const calculateTimeRemaining = () => {
    if (!startTime || !totalRows || currentRow === 0) return "Calculando...";
    const elapsed = Date.now() - startTime;
    const rate = currentRow / (elapsed || 1);
    const remainingRows = Math.max(totalRows - currentRow, 0);
    const remaining = remainingRows / (rate || 1);
    if (remaining <= 0) return "Finalizando...";
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return minutes > 0 ? `${minutes}m ${seconds}s restantes` : `${seconds}s restantes`;
  };

  const formatElapsedTime = () => {
    if (!startTime) return "0s";
    const elapsed = Date.now() - startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return (
    <div className="progress-container">
      <div className="progress-header">
        <div className="progress-title">
          <h3>Importando registros...</h3>
          {fileName ? <div className="progress-filename">{fileName}</div> : null}
        </div>
        <div className="progress-buttons">
          <button
            onClick={progress < 100 ? onCancel : onClose}
            className="close-button"
            title={progress < 100 ? "Cancelar importación" : "Cerrar barra de progreso"}
          >
            ×
          </button>
        </div>
      </div>

      <div className="progress-bar-wrapper">
        <div className="progress-bar">
          <div className={`progress-fill ${progress === 100 ? "completed" : ""}`} style={{ width: `${progress}%` }}></div>
        </div>
        <div className="progress-text">{progress}%</div>
      </div>

      <div className="progress-details">
        <div className="progress-info">
          <span>Fila {formatNumber(currentRow)} de {formatNumber(totalRows)}</span>
          <span>Tiempo transcurrido: {formatElapsedTime()}</span>
          {progress < 100 && <span>Tiempo restante: {calculateTimeRemaining()}</span>}
          {progress === 100 && <span>Completado</span>}
        </div>
      </div>

      <div className="progress-status">
        {progress < 100 ? "Procesando registros... Por favor espere." : "Importacion completada exitosamente."}
      </div>
    </div>
  );
};

export default ProgressBar;
