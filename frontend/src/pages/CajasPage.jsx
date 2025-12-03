import React, { useState, useEffect } from 'react';
import {
  getAllCajas,
  getCajaById,
  updateCaja,
  deleteCaja,
  downloadCajasPdfReport,
  importCajasFromExcel,
  downloadCajasErrorFile,
} from '../services/api';
import AuthModal from '../components/AuthModal';
import ProgressBar from '../components/ProgressBar';
import * as XLSX from 'xlsx';
import './CajasPage.css';

const CajasPage = () => {
  const [cajas, setCajas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    id: '', anaquel: '', cuerpo: '', nivel: '', fila: '', posicion: '',
    f_creacion: '', z_ubicacion: '', locacion: '', created_at: '', updated_at: '', created_by: '', updated_by: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100);
  const [totalItems, setTotalItems] = useState(0);

  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [deletingId, setDeletingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDelete, setBulkDelete] = useState(false);

  // Import Excel UI state
  const [importStatus, setImportStatus] = useState(null);
  const [importError, setImportError] = useState(null);
  const [errorExcelPath, setErrorExcelPath] = useState(null);
  const [excelRows, setExcelRows] = useState([]);
  const [duplicateIds, setDuplicateIds] = useState([]);
  const [updateDuplicates, setUpdateDuplicates] = useState(false);

  // Progress
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentRow, setCurrentRow] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [progressInterval, setProgressInterval] = useState(null);
  const [abortController, setAbortController] = useState(null);

  // Auth modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [cajaToDelete, setCajaToDelete] = useState(null);

  const fetchCajas = async (currentFilters = filters, page = currentPage, limit = itemsPerPage) => {
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(currentFilters).filter(([_, v]) => v !== '')
      );
      const data = await getAllCajas({ ...cleanFilters, limit, offset });
      setCajas(data.cajas || []);
      setTotalItems(data.total || 0);
      if (editingId && !(data.cajas || []).find(c => c.id === editingId)) {
        setEditingId(null);
        setEditFormData({});
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchCajas(filters, currentPage, itemsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };
  const handleSearch = () => fetchCajas(filters, 1, itemsPerPage);
  const handleResetSearch = () => {
    const reset = Object.fromEntries(Object.keys(filters).map(k => [k, '']));
    setFilters(reset);
    setCurrentPage(1);
    fetchCajas(reset, 1, itemsPerPage);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };
  const toggleSelectAllCurrentPage = () => {
    const allIds = cajas.map(c => c.id);
    const allSelected = allIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => { const next = new Set(prev); (allSelected ? allIds : allIds).forEach(id => { if (allSelected) next.delete(id); else next.add(id); }); return next; });
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const handlePageChange = (page) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };
  const isFiltered = Object.values(filters).some(v => v !== '');

  const handleEditClick = (caja) => {
    setEditingId(caja.id);
    setEditFormData({
      id: caja.id,
      anaquel: caja.anaquel || '',
      cuerpo: caja.cuerpo || '',
      nivel: caja.nivel || '',
      fila: caja.fila || '',
      posicion: caja.posicion || '',
      f_creacion: caja.f_creacion ? new Date(caja.f_creacion).toISOString().split('T')[0] : '',
      z_ubicacion: caja.z_ubicacion || '',
      locacion: caja.locacion || '',
    });
    setSaveError(null);
  };
  const handleEditFormChange = (e) => { const { name, value } = e.target; setEditFormData(prev => ({ ...prev, [name]: value })); };
  const handleSaveEdit = async (id) => {
    setIsSaving(true); setSaveError(null);
    try {
      const dataToSend = { ...editFormData };
      if (dataToSend.f_creacion === '') dataToSend.f_creacion = null;
      await updateCaja(id, dataToSend);
      setEditingId(null); setEditFormData({});
      fetchCajas(filters, currentPage, itemsPerPage);
    } catch (err) { setSaveError(err); console.error('Error saving caja:', err); } finally { setIsSaving(false); }
  };
  const handleCancelEdit = () => { setEditingId(null); setEditFormData({}); setSaveError(null); };

  const handleDeleteClick = (id) => { setCajaToDelete(id); setShowAuthModal(true); };
  const handleBulkDeleteClick = () => { if (selectedIds.size === 0) return; setBulkDelete(true); setShowAuthModal(true); };

  const handleAuthConfirm = async (username, password) => {
    try {
      if (bulkDelete && selectedIds.size > 0) {
        for (const id of selectedIds) await deleteCaja(id, username, password);
        setSelectedIds(new Set());
      } else if (updateDuplicates && duplicateIds.length > 0) {
        for (const id of duplicateIds) {
          const row = excelRows.find(r => String(findRowId(r)) === String(id));
          if (!row) continue;
          await updateCaja(id, mapExcelRowToCaja(row), username, password);
        }
        setDuplicateIds([]); setUpdateDuplicates(false);
      } else if (cajaToDelete) {
        setDeletingId(cajaToDelete);
        await deleteCaja(cajaToDelete, username, password);
        setCajaToDelete(null);
      }
      fetchCajas(filters, currentPage, itemsPerPage);
      setShowAuthModal(false);
    } catch (err) { setError(err); console.error('Error deleting/updating caja(s):', err); throw err; }
    finally { setDeletingId(null); setBulkDelete(false); setUpdateDuplicates(false); }
  };
  const handleAuthCancel = () => { setShowAuthModal(false); setCajaToDelete(null); };

  const handleCancelImport = () => { if (abortController) abortController.abort(); if (progressInterval) { clearInterval(progressInterval); setProgressInterval(null); } setShowProgress(false); setProgress(0); setCurrentRow(0); setTotalRows(0); setStartTime(null); setAbortController(null); };
  const handleCloseProgress = () => handleCancelImport();

  const handleDownloadErrorFile = async () => { if (!errorExcelPath) return; try { await downloadCajasErrorFile(errorExcelPath); } catch (e) { console.error('Error descargando archivo de errores:', e); setImportError('Error al descargar el archivo de errores'); } };

  const mapExcelRowToCaja = (row) => {
    const pick = (keys) => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
        const found = Object.keys(row).find(rk => rk.toLowerCase() === String(k).toLowerCase());
        if (found && row[found] !== undefined && row[found] !== null && row[found] !== '') return row[found];
      }
      return undefined;
    };
    const toDateISO = (v) => { if (!v) return ''; try { const d = new Date(v); return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0]; } catch { return ''; } };
    return {
      anaquel: pick(['anaquel','Anaquel']),
      cuerpo: pick(['cuerpo','Cuerpo']),
      nivel: pick(['nivel','Nivel']),
      fila: pick(['fila','Fila']),
      posicion: pick(['posicion','Posicion','posición','Posición']),
      f_creacion: toDateISO(pick(['f_creacion','f creacion','fecha creacion','Fecha Creación','Fecha Creacion'])),
      z_ubicacion: pick(['z_ubicacion','Z_ubicacion','Z Ubicacion','Z Ubicación']),
      locacion: pick(['locacion','Locacion','locación','Locación'])
    };
  };
  const findRowId = (row) => {
    const candidates = ['id','Id','ID','n_caja','N_caja','N° caja','N caja','Nro Caja','caja','Caja'];
    for (const k of candidates) {
      if (row[k] !== undefined && row[k] !== null && row[k] !== '') return String(row[k]).trim();
      const found = Object.keys(row).find(rk => rk.toLowerCase() === String(k).toLowerCase());
      if (found && row[found] !== undefined && row[found] !== null && row[found] !== '') return String(row[found]).trim();
    }
    return undefined;
  };
  const handleUpdateDuplicatesClick = () => { if (!duplicateIds || duplicateIds.length === 0) return; setUpdateDuplicates(true); setShowAuthModal(true); };

  const handleDownloadPdfReport = async () => {
    try {
      const blob = await downloadCajasPdfReport(filters);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a'); link.href = url; link.setAttribute('download', 'reporte_cajas.pdf');
      document.body.appendChild(link); link.click(); link.parentNode.removeChild(link);
    } catch (err) { console.error('Error al descargar el reporte PDF:', err); setError({ message: 'Error al descargar el reporte.' }); }
  };

  

  const handleCloseSuccessMessage = () => setImportStatus(null);
  const handleCloseErrorMessage = () => { setImportError(null); setErrorExcelPath(null); };

  
  const handleFileUpload = async (event) => {
    const file = event.target.files[0]; if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/)) { setImportError('Por favor, seleccione un archivo Excel (.xlsx o .xls)'); return; }
    const maxSize = 100 * 1024 * 1024; if (file.size > maxSize) { setImportError('El archivo es demasiado grande. El tamano maximo permitido es 100MB.'); return; }

    let parsedRows = [];
    if (file.size <= 8 * 1024 * 1024) {
      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        parsedRows = XLSX.utils.sheet_to_json(worksheet);
      } catch (e) {
        console.warn('No se pudo previsualizar el Excel en cliente:', e);
      }
    }

    // Estimar filas según tamaño para mejor barra de progreso, incluso cuando no parseamos todo
    const estimatedRows = parsedRows.length > 0 ? parsedRows.length : Math.max(1, Math.round(file.size / 200));
    const rowsPerSecond = 400;
    const intervalMs = 1000;

    try {
      setShowProgress(true); setProgress(0); setCurrentRow(0); setTotalRows(estimatedRows); setExcelRows(parsedRows); setStartTime(Date.now()); setImportStatus(null); setImportError(null); setErrorExcelPath(null);
      const controller = new AbortController(); setAbortController(controller);
      const interval = setInterval(() => {
        setCurrentRow(prev => {
          const next = Math.min(prev + rowsPerSecond, estimatedRows);
          setProgress(Math.min((next / estimatedRows) * 100, 99.9));
          return next;
        });
      }, intervalMs); setProgressInterval(interval);
      const result = await importCajasFromExcel(file, controller.signal);
      clearInterval(interval); setProgressInterval(null); setProgress(100);
      if (result && result.totalRows) { setTotalRows(result.totalRows); setCurrentRow(result.totalRows); }
      const errors = result?.results?.errors; const successCount = (result && result.results && Array.isArray(result.results.success)) ? result.results.success.length : 0;

      // Fallback: detectar duplicados consultando la API si el backend no los marca
      try {
        const idsInExcel = parsedRows.map(r => findRowId(r)).filter(Boolean);
        const existing = [];
        for (const id of idsInExcel) {
          try {
            const found = await getCajaById(id);
            if (found) existing.push(id);
          } catch (e) {
            // 404 u otros => no existe; ignorar
          }
        }
        if (existing.length > 0) setDuplicateIds(existing);
      } catch { /* no bloquear importación si falla el chequeo */ }
      if (Array.isArray(errors) && errors.length > 0) {
        if (result && result.errorExcelPath) setErrorExcelPath(result.errorExcelPath);
        const duplicates = errors.filter(e => (e.type && String(e.type).toLowerCase() === 'duplicate'));
        const dupIds = duplicates.map(d => d.id ?? d.existingId ?? d.key ?? d.cajaId).filter(v => v !== undefined && v !== null);
        const mergedDupIds = Array.from(new Set([...(duplicateIds || []), ...dupIds]));
        if (mergedDupIds.length > 0) setDuplicateIds(mergedDupIds);
        let msg = 'Importación completada con ' + errors.length + ' errores.';
        if (dupIds.length > 0) { msg += '\n• ' + dupIds.length + ' cajas ya existen (duplicadas).'; msg += '\nPuede actualizarlas con los datos del Excel.'; }
        msg += '\n\nDescargue el archivo de errores para ver los detalles completos.'; setImportError(msg); setImportStatus(null);
      } else {
        // Si no hay errores pero encontramos duplicados, informar opción de actualizar
        if ((duplicateIds || []).length > 0) {
          setImportError('Se detectaron ' + duplicateIds.length + ' cajas ya registradas en el sistema. Puede actualizarlas con los datos del Excel.');
          setImportStatus(null);
        } else {
          setImportStatus('Importación completada: ' + successCount + ' cajas importadas en ' + ((result && result.totalTime) ? result.totalTime : '?') + 's');
        }
      }
      fetchCajas(filters, currentPage, itemsPerPage);
    } catch (error) {
      if (error.name === 'AbortError') setImportError('La importación fue cancelada por el usuario.');
      else if (error.response && error.response.status === 413) setImportError('El archivo es demasiado grande. El tamaño máximo permitido es 100MB.');
      else if (error.response && error.response.status === 500) setImportError('Error del servidor. El archivo puede ser demasiado grande o contener datos inválidos.');
      else setImportError(error.message || 'Error al importar el archivo');
      if (progressInterval) { clearInterval(progressInterval); setProgressInterval(null); }
      if (abortController) abortController.abort();
      setShowProgress(false); setProgress(0); setCurrentRow(0); setTotalRows(0); setStartTime(null); setAbortController(null);
      console.error('Error en la importación:', error);
    } finally { const fileInput = document.getElementById('excel-upload'); if (fileInput) fileInput.value = ''; }
  };

  if (loading && cajas.length === 0 && !isFiltered && currentPage === 1 && !editingId) return <div>Cargando cajas...</div>;
  if (error && !editingId) return <div>Error al cargar cajas: {error.message}</div>;

  return (
    <div className="modulo-container">
      <div className="modulo-header">
        <h1 className="modulo-title">Gestión de Cajas</h1>
        <div className="modulo-actions">
          <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} style={{ display: 'none' }} id="excel-upload" />
          <button className="importar-btn" onClick={() => document.getElementById('excel-upload').click()}>Importar Excel</button>
          <button className="descargar-btn" onClick={handleDownloadPdfReport}>Descargar PDF</button>
        </div>
      </div>
      {showProgress && (
        <ProgressBar
          progress={Math.round(progress)}
          currentRow={currentRow}
          totalRows={totalRows}
          startTime={startTime}
          onCancel={handleCancelImport}
          onClose={handleCloseProgress}
        />
      )}

      {importStatus && (
        <div className="import-message success">
          {importStatus}
          <button onClick={handleCloseSuccessMessage} style={{ background: 'none', border: 'none', color: '#2ecc71', fontSize: 18, cursor: 'pointer', marginLeft: 10, fontWeight: 'bold' }} title="Cerrar">×</button>
        </div>
      )}

      {importError && (
        <div className="import-message error" style={{ whiteSpace: 'pre-line' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              {importError}
              {errorExcelPath && (
                <div style={{ marginTop: 10 }}>
                  <button onClick={handleDownloadErrorFile} style={{ background: '#ff6b6b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }}>Descargar archivo de errores</button>
                </div>
              )}
              {duplicateIds && duplicateIds.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <button onClick={handleUpdateDuplicatesClick} style={{ background: '#2d7', color: '#033', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', marginRight: 10 }}>Actualizar cajas duplicadas</button>
                </div>
              )}
            </div>
            <button onClick={handleCloseErrorMessage} style={{ background: 'none', border: 'none', color: '#e74c3c', fontSize: 18, cursor: 'pointer', marginLeft: 10, fontWeight: 'bold' }} title="Cerrar">×</button>
          </div>
        </div>
      )}

      {!editingId && (
        <div className="modulo-filtros-panel">
          <div className="filtro-item"><label htmlFor="id">N° Caja</label><input type="text" name="id" id="id" placeholder="N° Caja..." value={filters.id} onChange={handleInputChange} /></div>
          <div className="filtro-item"><label htmlFor="anaquel">Anaquel</label><input type="text" name="anaquel" id="anaquel" placeholder="Anaquel..." value={filters.anaquel} onChange={handleInputChange} /></div>
          <div className="filtro-item"><label htmlFor="cuerpo">Cuerpo</label><input type="text" name="cuerpo" id="cuerpo" placeholder="Cuerpo..." value={filters.cuerpo} onChange={handleInputChange} /></div>
          <div className="filtro-item"><label htmlFor="nivel">Nivel</label><input type="text" name="nivel" id="nivel" placeholder="Nivel..." value={filters.nivel} onChange={handleInputChange} /></div>
          <div className="filtro-item"><label htmlFor="fila">Fila</label><input type="text" name="fila" id="fila" placeholder="Fila..." value={filters.fila} onChange={handleInputChange} /></div>
          <div className="filtro-item"><label htmlFor="posicion">Posición</label><input type="text" name="posicion" id="posicion" placeholder="Posición..." value={filters.posicion} onChange={handleInputChange} /></div>
          <div className="filtro-item"><label htmlFor="f_creacion">Fecha Creación</label><input type="date" name="f_creacion" id="f_creacion" placeholder="Fecha Creación..." value={filters.f_creacion} onChange={handleInputChange} /></div>
          <div className="filtro-item"><label htmlFor="z_ubicacion">Z Ubicación</label><input type="text" name="z_ubicacion" id="z_ubicacion" placeholder="Z Ubicación..." value={filters.z_ubicacion} onChange={handleInputChange} /></div>
          <div className="filtro-item"><label htmlFor="locacion">Locación</label><input type="text" name="locacion" id="locacion" placeholder="Locación..." value={filters.locacion} onChange={handleInputChange} /></div>
          <div className="filtros-botones" style={{ gridColumn: '1 / -1' }}>
            <button className="limpiar-btn" onClick={handleResetSearch}>Limpiar</button>
            <button className="buscar-btn" onClick={handleSearch}>Buscar</button>
          </div>
        </div>
      )}

      {!editingId && cajas && cajas.length > 0 && (
        <div className="table-toolbar">
          <div className="toolbar-info">
            <span>Resultados: {totalItems}</span>
            <span>Página {currentPage} de {totalPages}</span>
          </div>
          <div className="toolbar-actions">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>Anterior</button>
            <span className="page-chip">Página {currentPage}</span>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Siguiente</button>
            <button className="delete bulk-delete" onClick={handleBulkDeleteClick} disabled={selectedIds.size === 0} title="Eliminar seleccionados">Eliminar seleccionados ({selectedIds.size})</button>
          </div>
        </div>
      )}

      <div className="modulo-table-container">
        {!editingId ? (
          cajas && cajas.length > 0 ? (
            <table className="modulo-table">
              <thead>
                <tr>
                  <th style={{ width: '48px' }}><input type="checkbox" onChange={toggleSelectAllCurrentPage} checked={cajas.length > 0 && cajas.every(c => selectedIds.has(c.id))} aria-label="Seleccionar todos" /></th>
                  <th>N° caja</th>
                  <th>Anaquel</th>
                  <th>Cuerpo</th>
                  <th>Nivel</th>
                  <th>Fila</th>
                  <th>Posición</th>
                  <th>Fecha Creación</th>
                  <th>Z Ubicación</th>
                  <th>Locación</th>
                  <th>Creado por</th>
                  <th>Actualizado por</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cajas.map((cajaItem) => (
                  <tr key={cajaItem.id}>
                    <td><input type="checkbox" checked={selectedIds.has(cajaItem.id)} onChange={() => toggleSelect(cajaItem.id)} aria-label={`Seleccionar caja ${cajaItem.id}`} /></td>
                    <td>{cajaItem.id}</td>
                    <td>{cajaItem.anaquel}</td>
                    <td>{cajaItem.cuerpo}</td>
                    <td>{cajaItem.nivel}</td>
                    <td>{cajaItem.fila}</td>
                    <td>{cajaItem.posicion}</td>
                    <td>{cajaItem.f_creacion ? new Date(cajaItem.f_creacion).toLocaleDateString() : ''}</td>
                    <td>{cajaItem.z_ubicacion}</td>
                    <td>{cajaItem.locacion}</td>
                    <td>{cajaItem.created_by || ''}</td>
                    <td>{cajaItem.updated_by || ''}</td>
                    <td className="acciones">
                      <button className="edit" onClick={() => handleEditClick(cajaItem)} title="Editar">Editar</button>
                      <button className="delete" onClick={() => handleDeleteClick(cajaItem.id)} disabled={deletingId === cajaItem.id} title="Eliminar">{deletingId === cajaItem.id ? 'Eliminando...' : 'Eliminar'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            !loading && (isFiltered ? (<p>No se encontraron cajas que coincidan con la búsqueda.</p>) : (<p>No hay cajas disponibles.</p>))
          )
        ) : (
          <div style={{ margin: '32px auto', maxWidth: 600 }}>
            <h2 className="edit-title" style={{ color: 'var(--edit-title-color)' }}>Editar Caja (ID: {editingId})</h2>
            {isSaving && <div className="success-message">Guardando cambios...</div>}
            {saveError && <div className="error-message">Error al guardar: {saveError.message}</div>}
            <div className="cajas-filtros-panel">
              <label>Anaquel <input type="text" name="anaquel" value={editFormData.anaquel || ''} onChange={handleEditFormChange} /></label>
              <label>Cuerpo <input type="text" name="cuerpo" value={editFormData.cuerpo || ''} onChange={handleEditFormChange} /></label>
              <label>Nivel <input type="text" name="nivel" value={editFormData.nivel || ''} onChange={handleEditFormChange} /></label>
              <label>Fila <input type="text" name="fila" value={editFormData.fila || ''} onChange={handleEditFormChange} /></label>
              <label>Posición <input type="text" name="posicion" value={editFormData.posicion || ''} onChange={handleEditFormChange} /></label>
              <label>Fecha Creación <input type="date" name="f_creacion" value={editFormData.f_creacion || ''} onChange={handleEditFormChange} /></label>
              <label>Ubicación Z <input type="text" name="z_ubicacion" value={editFormData.z_ubicacion || ''} onChange={handleEditFormChange} /></label>
              <label>Locación <input type="text" name="locacion" value={editFormData.locacion || ''} onChange={handleEditFormChange} /></label>
            </div>
            <div className="filtros-botones" style={{ marginTop: 16 }}>
              <button onClick={() => handleSaveEdit(editingId)} disabled={isSaving}>Guardar Cambios</button>
              <button className="reset" onClick={handleCancelEdit}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {!editingId && cajas && cajas.length > 0 && totalItems > 0 && (
        <div className="table-toolbar">
          <div className="toolbar-info">
            <span>Resultados: {totalItems}</span>
            <span>Página {currentPage} de {totalPages}</span>
          </div>
          <div className="toolbar-actions">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>Anterior</button>
            <span className="page-chip">Página {currentPage}</span>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Siguiente</button>
            <button className="delete bulk-delete" onClick={handleBulkDeleteClick} disabled={selectedIds.size === 0} title="Eliminar seleccionados">Eliminar seleccionados ({selectedIds.size})</button>
          </div>
        </div>
      )}

      <AuthModal isOpen={showAuthModal} onClose={handleAuthCancel} onConfirm={handleAuthConfirm} />
    </div>
  );
};

export default CajasPage;
