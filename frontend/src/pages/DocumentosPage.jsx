import React, { useState, useEffect } from 'react';
import {
  getAllRegistros,
  updateRegistro,
  deleteRegistro,
  createRegistro,
  downloadRegistrosPdfReport,
  importRegistrosFromExcel,
  downloadErrorFile,
} from '../services/api';
import * as XLSX from 'xlsx';
import './DocumentosPage.css';
import AuthModal from '../components/AuthModal';
import ProgressBar from '../components/ProgressBar';

const DocumentosPage = () => {
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Importación Excel
  const [importStatus, setImportStatus] = useState(null);
  const [importError, setImportError] = useState(null);
  const [errorExcelPath, setErrorExcelPath] = useState(null);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentRow, setCurrentRow] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [currentFileName, setCurrentFileName] = useState('');
  const [abortController, setAbortController] = useState(null);
  const [progressInterval, setProgressInterval] = useState(null);

  // Filtros de búsqueda
  const [filters, setFilters] = useState({
    id: '',
    n_documento: '',
    r_social: '',
    n_caja: '',
    c_observaciones: '',
    n_ruc: '',
    id_inventario: '',
    f_extrema: '',
    cod_uni_org_act: '',
    cod_uni_org_ant: '',
  });

  // Edición
  const [editingDocument, setEditingDocument] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Eliminación
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDelete, setBulkDelete] = useState(false);

  // Creación
  const [isCreating, setIsCreating] = useState(false);
  const [newFormData, setNewFormData] = useState({});
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100);
  const [totalItems, setTotalItems] = useState(0);

  // Modal auth
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);

  const fetchDocumentos = async (currentFilters = filters, page = currentPage, limit = itemsPerPage) => {
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(currentFilters).filter(([_, value]) => value !== '')
      );
      const data = await getAllRegistros({ ...cleanFilters, limit, offset });
      setDocumentos(data.registros);
      setTotalItems(data.total);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchDocumentos({}, 1, itemsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (importStatus && !importError) {
      const timer = setTimeout(() => setImportStatus(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [importStatus, importError]);

  const closeImportMessage = () => {
    setImportStatus(null);
    setImportError(null);
    setErrorExcelPath(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const handleSearch = () => fetchDocumentos(filters, 1, itemsPerPage);

  const handleResetSearch = () => {
    const resetFilters = Object.fromEntries(Object.keys(filters).map((k) => [k, '']));
    setFilters(resetFilters);
    setCurrentPage(1);
    fetchDocumentos(resetFilters, 1, itemsPerPage);
  };

  // Selección
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllCurrentPage = () => {
    const allIds = documentos.map((d) => d.id);
    const allSelected = allIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) allIds.forEach((id) => next.delete(id));
      else allIds.forEach((id) => next.add(id));
      return next;
    });
  };

  // Paginación
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      fetchDocumentos(filters, page, itemsPerPage);
    }
  };

  const isFiltered = Object.values(filters).some((v) => v !== '');

  // Reporte PDF
  const handleDownloadPdfReport = async () => {
    try {
      const blob = await downloadRegistrosPdfReport(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reporte_registros.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Error al descargar PDF:', err);
      alert('Hubo un error al descargar el reporte PDF.');
    }
  };

  // Edición
  const handleEditClick = (doc) => {
    setEditingDocument(doc);
    setEditFormData({
      id: doc.id,
      n_caja: doc.n_caja || null,
      id_inventario: doc.id_inventario || null,
      n_paquete: doc.n_paquete || null,
      n_registro: doc.n_registro || null,
      tomo: doc.tomo || null,
      r_inicial: doc.r_inicial || null,
      r_final: doc.r_final || null,
      folios: doc.folios || null,
      t_documental: doc.t_documental || null,
      n_documento: doc.n_documento || null,
      r_social: doc.r_social || null,
      n_ruc: doc.n_ruc || null,
      f_extrema: doc.f_extrema ? new Date(doc.f_extrema).toISOString().split('T')[0] : null,
      c_observaciones: doc.c_observaciones || null,
      c_x1: doc.c_x1 || null,
      c_x2: doc.c_x2 || null,
      c_x3: doc.c_x3 || null,
      cod_uni_org_act: doc.cod_uni_org_act || null,
      cod_uni_org_ant: doc.cod_uni_org_ant || null,
      updated_by: doc.updated_by || null,
    });
    setSaveError(null);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateRegistro(editFormData.id, editFormData);
      setEditingDocument(null);
      setEditFormData({});
      fetchDocumentos(filters, currentPage, itemsPerPage);
    } catch (err) {
      setSaveError(err);
      console.error('Error al guardar:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingDocument(null);
    setEditFormData({});
    setSaveError(null);
  };

  // Eliminación
  const handleDeleteClick = (id) => {
    setDocumentToDelete(id);
    setShowAuthModal(true);
  };

  const handleBulkDeleteClick = () => {
    if (selectedIds.size === 0) return;
    setBulkDelete(true);
    setShowAuthModal(true);
  };

  const handleAuthConfirm = async (username, password) => {
    try {
      if (bulkDelete) {
        setDeletingId('bulk');
        for (const id of Array.from(selectedIds)) {
          await deleteRegistro(id, username, password);
        }
        setSelectedIds(new Set());
      } else if (documentToDelete) {
        setDeletingId(documentToDelete);
        await deleteRegistro(documentToDelete, username, password);
        setDocumentToDelete(null);
      }
      fetchDocumentos(filters, currentPage, itemsPerPage);
      setShowAuthModal(false);
    } catch (err) {
      setDeleteError(err);
      throw err;
    } finally {
      setDeletingId(null);
      setBulkDelete(false);
    }
  };

  const handleAuthCancel = () => {
    setShowAuthModal(false);
    setDocumentToDelete(null);
  };

  // Creación
  const handleCreateClick = () => {
    setIsCreating(true);
    setNewFormData({
      n_caja: null,
      id_inventario: null,
      n_paquete: null,
      n_registro: null,
      tomo: null,
      r_inicial: null,
      r_final: null,
      folios: null,
      t_documental: '',
      n_documento: '',
      r_social: '',
      n_ruc: null,
      f_extrema: '',
      c_observaciones: '',
      c_x1: '',
      c_x2: '',
      c_x3: '',
      cod_uni_org_act: '',
      cod_uni_org_ant: null,
      updated_by: null,
    });
    setCreateError(null);
  };

  const handleNewFormChange = (e) => {
    const { name, value } = e.target;
    const nullableFields = [
      'n_caja', 'id_inventario', 'n_paquete', 'n_registro', 'tomo', 'r_inicial',
      'r_final', 'folios', 't_documental', 'n_documento', 'r_social', 'n_ruc',
      'f_extrema', 'c_observaciones', 'c_x1', 'c_x2', 'c_x3', 'cod_uni_org_ant'
    ];
    setNewFormData((prev) => ({
      ...prev,
      [name]: nullableFields.includes(name) && value === '' ? null : value,
    }));
  };

  const handleSaveNew = async () => {
    setIsCreatingDocument(true);
    setCreateError(null);
    try {
      await createRegistro(newFormData);
      setIsCreating(false);
      setNewFormData({});
      fetchDocumentos(filters, 1, itemsPerPage);
    } catch (err) {
      setCreateError(err);
      console.error('Error al crear documento:', err);
    } finally {
      setIsCreatingDocument(false);
    }
  };

  const handleCancelNew = () => {
    setIsCreating(false);
    setNewFormData({});
    setCreateError(null);
  };

  // Importación Excel
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setImportError('Por favor, seleccione un archivo Excel (.xlsx o .xls)');
      return;
    }
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      setImportError('El archivo es demasiado grande. Máximo 100MB.');
      return;
    }

    try {
      let realRows = 0;
      try {
        const buf = await file.arrayBuffer();
        const workbook = XLSX.read(buf, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        realRows = jsonData.length;
      } catch (err) {
        console.warn('No se pudo contar filas localmente, usando estimaci?n por tama?o:', err);
        realRows = Math.max(1, Math.round(file.size / 200));
      }

      // Velocidad adaptativa de simulación para que la barra no salte bruscamente.
      // Usamos un ritmo conservador y desaceleramos cerca del 95%.
      const rowsPerSecond = Math.max(80, Math.round(realRows / 150)); // aprox. 150s para archivos grandes
      const intervalMs = 1000;

      setCurrentFileName(file.name);
      setShowProgress(true);
      setProgress(0);
      setCurrentRow(0);
      setTotalRows(realRows);
      setStartTime(Date.now());
      setImportStatus(null);
      setImportError(null);
      setErrorExcelPath(null);

      const controller = new AbortController();
      setAbortController(controller);

      const interval = setInterval(() => {
        setProgress((prev) => {
          // Incremento moderado; no pasar 95% hasta que termine el backend
          const increment = Math.max(0.5, (rowsPerSecond / realRows) * 100);
          const next = Math.min(prev + increment, 95);
          setCurrentRow(Math.round((next / 100) * realRows));
          return next;
        });
      }, intervalMs);
      setProgressInterval(interval);

      const result = await importRegistrosFromExcel(file, controller.signal);
      clearInterval(interval);
      setProgressInterval(null);
      setProgress(100);

      if (result.totalRows) {
        setTotalRows(result.totalRows);
        setCurrentRow(result.totalRows);
      }

      if (result.results && result.results.errors && result.results.errors.length > 0) {
        if (result.errorExcelPath) setErrorExcelPath(result.errorExcelPath);
        const duplicateErrors = result.results.errors.filter((e) => e.type === 'duplicate');
        const otherErrors = result.results.errors.filter((e) => e.type !== 'duplicate');
        let msg = `Importación completada con ${result.results.errors.length} errores.`;
        if (duplicateErrors.length > 0) msg += `\n• ${duplicateErrors.length} duplicados`;
        if (otherErrors.length > 0) msg += `\n• ${otherErrors.length} de validación`;
        msg += `\n\nDescargue el archivo de errores para ver detalles.`;
        setImportError(msg);
        setImportStatus(null);
      } else {
        const ok = result?.results?.success?.length ?? 0;
        setImportStatus(`Importación completada: ${ok} documentos importados en ${result.totalTime || '?'}s`);
      }

      fetchDocumentos(filters, currentPage, itemsPerPage);
    } catch (error) {
      if (error.name === 'AbortError') {
        setImportError('La importación fue cancelada.');
      } else if (error.response && error.response.status === 413) {
        setImportError('El archivo es demasiado grande. Máximo 100MB.');
      } else if (error.response && error.response.status === 500) {
        setImportError('Error del servidor. Verifique el formato del Excel.');
      } else if (error.duplicates) {
        const duplicatesMessage = error.duplicates
          .map((d) => `Registro ${d.n_documento || 'sin número'} (RUC: ${d.n_ruc || 'N/A'})`)
          .join('\n');
        setImportError(`Registros duplicados:\n${duplicatesMessage}`);
      } else {
        setImportError(error.message || 'Error al importar el archivo');
      }

      if (progressInterval) {
        clearInterval(progressInterval);
        setProgressInterval(null);
      }
      if (abortController) abortController.abort();
      setShowProgress(false);
      setProgress(0);
      setCurrentRow(0);
      setTotalRows(0);
      setStartTime(null);
      setAbortController(null);
      console.error('Error en la importación:', error);
    } finally {
      const fileInput = document.getElementById('excel-upload');
      if (fileInput) fileInput.value = '';
    }
  };

  const handleCloseProgress = () => {
    if (progressInterval) {
      clearInterval(progressInterval);
      setProgressInterval(null);
    }
    if (abortController) abortController.abort();
    setShowProgress(false);
    setProgress(0);
    setCurrentRow(0);
    setTotalRows(0);
    setStartTime(null);
    setAbortController(null);
    setCurrentFileName('');
  };

  const handleCancelImport = () => handleCloseProgress();

  const handleDownloadErrorFile = async () => {
    if (!errorExcelPath) return;
    try {
      await downloadErrorFile(errorExcelPath);
    } catch (err) {
      console.error('Error al descargar archivo de errores:', err);
      setImportError('Error al descargar el archivo de errores');
    }
  };

  return (
    <div className="modulo-container">
      <div className="modulo-header">
        <h1 className="modulo-title">Gestión de Documentos</h1>
        {!editingDocument && !isCreating && (
          <div className="modulo-actions doc-actions">
            <button onClick={handleCreateClick} disabled={isCreating}>+ Crear Nuevo Documento</button>
            <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} style={{ display: 'none' }} id="excel-upload" />
            <button onClick={() => document.getElementById('excel-upload').click()}>Importar desde Excel</button>
            <button onClick={handleDownloadPdfReport}>Descargar Reporte PDF</button>
          </div>
        )}
      </div>

      {loading && !isFiltered && currentPage === 1 && documentos.length === 0 && (
        <div className="success-message" style={{ margin: '8px 0' }}>Cargando documentos...</div>
      )}
      {error && !editingDocument && !isCreating && (
        <div className="error-message" style={{ margin: '8px 0' }}>Error al cargar documentos: {error.message}</div>
      )}

      {showProgress && (
        <ProgressBar
          progress={Math.round(progress)}
          currentRow={currentRow}
          totalRows={totalRows}
          startTime={startTime}
          fileName={currentFileName}
          onCancel={handleCancelImport}
          onClose={handleCloseProgress}
        />
      )}

      {importStatus && (
        <div className="import-message success">
          {importStatus}
          <button onClick={closeImportMessage} title="Cerrar mensaje" style={{ background: 'none', border: 'none', color: '#2ecc71', fontSize: 18, cursor: 'pointer', marginLeft: 10, fontWeight: 'bold' }}>×</button>
        </div>
      )}
      {importError && (
        <div className="import-message error" style={{ whiteSpace: 'pre-line' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              {importError}
              {errorExcelPath && (
                <div style={{ marginTop: 10 }}>
                  <button onClick={handleDownloadErrorFile} style={{ backgroundColor: '#ff6b6b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 14, marginRight: 10 }}>Descargar Registros con Errores</button>
                </div>
              )}
            </div>
            <button onClick={closeImportMessage} title="Cerrar mensaje" style={{ background: 'none', border: 'none', color: '#e74c3c', fontSize: 18, cursor: 'pointer', marginLeft: 10, fontWeight: 'bold', flexShrink: 0 }}>×</button>
          </div>
        </div>
      )}

      {!editingDocument && !isCreating && (
        <div className="modulo-filtros-panel">
          <div className="filtro-item">
            <label htmlFor="n_documento">N° Documento</label>
            <input type="text" name="n_documento" id="n_documento" placeholder="N° Documento" value={filters.n_documento} onChange={handleInputChange} />
          </div>
          <div className="filtro-item">
            <label htmlFor="r_social">Razón Social</label>
            <input type="text" name="r_social" id="r_social" placeholder="Razón Social" value={filters.r_social} onChange={handleInputChange} />
          </div>
          <div className="filtro-item">
            <label htmlFor="n_caja">N° Caja</label>
            <input type="text" name="n_caja" id="n_caja" placeholder="N° Caja" value={filters.n_caja} onChange={handleInputChange} />
          </div>
          <div className="filtro-item">
            <label htmlFor="c_observaciones">Observaciones</label>
            <input type="text" name="c_observaciones" id="c_observaciones" placeholder="Observaciones" value={filters.c_observaciones} onChange={handleInputChange} />
          </div>
          <div className="filtro-item">
            <label htmlFor="n_ruc">RUC</label>
            <input type="text" name="n_ruc" id="n_ruc" placeholder="RUC" value={filters.n_ruc} onChange={handleInputChange} />
          </div>
          <div className="filtro-item">
            <label htmlFor="id_inventario">N° ID Inventario</label>
            <input type="text" name="id_inventario" id="id_inventario" placeholder="N° ID Inventario" value={filters.id_inventario} onChange={handleInputChange} />
          </div>
          <div className="filtro-item">
            <label htmlFor="f_extrema">Fecha Extrema</label>
            <input type="date" name="f_extrema" id="f_extrema" value={filters.f_extrema} onChange={handleInputChange} />
          </div>
          <div className="filtro-item">
            <label htmlFor="cod_uni_org_act">Cod. Uni. Org. Act.</label>
            <input type="text" name="cod_uni_org_act" id="cod_uni_org_act" placeholder="Cod. Uni. Org. Act." value={filters.cod_uni_org_act} onChange={handleInputChange} />
          </div>
          <div className="filtro-item">
            <label htmlFor="cod_uni_org_ant">Cod. Uni. Org. Ant.</label>
            <input type="text" name="cod_uni_org_ant" id="cod_uni_org_ant" placeholder="Cod. Uni. Org. Ant." value={filters.cod_uni_org_ant} onChange={handleInputChange} />
          </div>
          <div className="filtros-botones" style={{ gridColumn: '1 / -1' }}>
            <button className="buscar-btn" onClick={handleSearch}>Buscar</button>
            {isFiltered && <button className="limpiar-btn" onClick={handleResetSearch}>Resetear Búsqueda</button>}
          </div>
        </div>
      )}

      {editingDocument && (
        <div className="documentos-editar">
          <h2>Editar Documento (ID: {editingDocument.id})</h2>
          {isSaving && <div>Guardando cambios...</div>}
          {saveError && <div>Error al guardar: {saveError.message}</div>}
          <div className="documentos-form-grid">
            <div className="form-item"><label>ID</label><input type="text" value={editFormData.id} disabled /></div>
            <div className="form-item"><label>Nro Caja</label><input type="text" name="n_caja" value={editFormData.n_caja || ''} onChange={handleEditFormChange} /></div>
            <div className="form-item"><label>ID Inventario</label><input type="text" name="id_inventario" value={editFormData.id_inventario || ''} onChange={handleEditFormChange} /></div>
            <div className="form-item"><label>Nro Paquete</label><input type="text" name="n_paquete" value={editFormData.n_paquete || ''} onChange={handleEditFormChange} /></div>
            <div className="form-item"><label>Nro Registro</label><input type="text" name="n_registro" value={editFormData.n_registro || ''} onChange={handleEditFormChange} /></div>
            <div className="form-item"><label>Tomo</label><input type="text" name="tomo" value={editFormData.tomo || ''} onChange={handleEditFormChange} /></div>
            <div className="form-item"><label>R Inicial</label><input type="text" name="r_inicial" value={editFormData.r_inicial || ''} onChange={handleEditFormChange} /></div>
            <div className="form-item"><label>R Final</label><input type="text" name="r_final" value={editFormData.r_final || ''} onChange={handleEditFormChange} /></div>
            <div className="form-item"><label>Folios</label><input type="text" name="folios" value={editFormData.folios || ''} onChange={handleEditFormChange} /></div>
            <div className="form-item"><label>Tipo Documental</label><input type="text" name="t_documental" value={editFormData.t_documental || ''} onChange={handleEditFormChange} /></div>
            <div className="form-item"><label>Nro Documento</label><input type="text" name="n_documento" value={editFormData.n_documento || ''} onChange={handleEditFormChange} /></div>
            <div className="form-item"><label>Razón Social</label><input type="text" name="r_social" value={editFormData.r_social || ''} onChange={handleEditFormChange} /></div>
            <div className="form-item"><label>Nro RUC</label><input type="text" name="n_ruc" value={editFormData.n_ruc || ''} onChange={handleEditFormChange} /></div>
            <div className="form-item"><label>Fecha Extrema</label><input type="date" name="f_extrema" value={editFormData.f_extrema || ''} onChange={handleEditFormChange} /></div>
            <div className="form-item full-span"><label>Observaciones</label><textarea name="c_observaciones" value={editFormData.c_observaciones || ''} onChange={handleEditFormChange}></textarea></div>
            <div className="form-item"><label>C X1</label><input type="text" name="c_x1" value={editFormData.c_x1 || ''} onChange={handleEditFormChange} /></div>
            <div className="form-item"><label>C X2</label><input type="text" name="c_x2" value={editFormData.c_x2 || ''} onChange={handleEditFormChange} /></div>
            <div className="form-item"><label>C X3</label><input type="text" name="c_x3" value={editFormData.c_x3 || ''} onChange={handleEditFormChange} /></div>
            <div className="form-item"><label>Cod. Uni. Org. Act.</label><input type="text" name="cod_uni_org_act" value={editFormData.cod_uni_org_act || ''} onChange={handleEditFormChange} /></div>
            <div className="form-item"><label>Cod. Uni. Org. Ant.</label><input type="text" name="cod_uni_org_ant" value={editFormData.cod_uni_org_ant || ''} onChange={handleEditFormChange} /></div>
          </div>
          <div className="form-actions">
            <button onClick={handleSaveEdit} disabled={isSaving}>Guardar Cambios</button>
            <button onClick={handleCancelEdit} disabled={isSaving}>Cancelar</button>
          </div>
        </div>
      )}

      {isCreating && (
        <div className="documentos-crear">
          <h2>Crear Nuevo Documento</h2>
          {isCreatingDocument && <div>Creando documento...</div>}
          {createError && <div>Error al crear: {createError.message}</div>}
          <div>
            <label>Nro Caja:</label>
            <input type="text" name="n_caja" value={newFormData.n_caja || ''} onChange={handleNewFormChange} /><br />
            <label>ID Inventario:</label>
            <input type="text" name="id_inventario" value={newFormData.id_inventario || ''} onChange={handleNewFormChange} /><br />
            <label>Nro Paquete:</label>
            <input type="text" name="n_paquete" value={newFormData.n_paquete || ''} onChange={handleNewFormChange} /><br />
            <label>Nro Registro:</label>
            <input type="text" name="n_registro" value={newFormData.n_registro || ''} onChange={handleNewFormChange} /><br />
            <label>Tomo:</label>
            <input type="text" name="tomo" value={newFormData.tomo || ''} onChange={handleNewFormChange} /><br />
            <label>R Inicial:</label>
            <input type="text" name="r_inicial" value={newFormData.r_inicial || ''} onChange={handleNewFormChange} /><br />
            <label>R Final:</label>
            <input type="text" name="r_final" value={newFormData.r_final || ''} onChange={handleNewFormChange} /><br />
            <label>Folios:</label>
            <input type="text" name="folios" value={newFormData.folios || ''} onChange={handleNewFormChange} /><br />
            <label>Tipo Documental:</label>
            <input type="text" name="t_documental" value={newFormData.t_documental || ''} onChange={handleNewFormChange} /><br />
            <label>Nro Documento:</label>
            <input type="text" name="n_documento" value={newFormData.n_documento || ''} onChange={handleNewFormChange} /><br />
            <label>Razón Social:</label>
            <input type="text" name="r_social" value={newFormData.r_social || ''} onChange={handleNewFormChange} /><br />
            <label>Nro RUC:</label>
            <input type="text" name="n_ruc" value={newFormData.n_ruc || ''} onChange={handleNewFormChange} /><br />
            <label>Fecha Extrema:</label>
            <input type="date" name="f_extrema" value={newFormData.f_extrema || ''} onChange={handleNewFormChange} /><br />
            <label>Observaciones:</label>
            <textarea name="c_observaciones" value={newFormData.c_observaciones || ''} onChange={handleNewFormChange}></textarea><br />
            <label>C X1:</label>
            <input type="text" name="c_x1" value={newFormData.c_x1 || ''} onChange={handleNewFormChange} /><br />
            <label>C X2:</label>
            <input type="text" name="c_x2" value={newFormData.c_x2 || ''} onChange={handleNewFormChange} /><br />
            <label>C X3:</label>
            <input type="text" name="c_x3" value={newFormData.c_x3 || ''} onChange={handleNewFormChange} /><br />
            <label>Cod. Uni. Org. Act.:</label>
            <input type="text" name="cod_uni_org_act" value={newFormData.cod_uni_org_act || ''} onChange={handleNewFormChange} /><br />
            <label>Cod. Uni. Org. Ant.:</label>
            <input type="text" name="cod_uni_org_ant" value={newFormData.cod_uni_org_ant || ''} onChange={handleNewFormChange} /><br />
            <button onClick={handleSaveNew} disabled={isCreatingDocument}>Crear Documento</button>
            <button onClick={handleCancelNew} disabled={isCreatingDocument}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Barra superior de paginación/acciones */}
      {!isCreating && !editingDocument && totalItems > 0 && (
        <div className="table-toolbar">
          <div className="toolbar-info">
            <span>Resultados: {totalItems}</span>
            <span>Página {currentPage} de {totalPages}</span>
          </div>
          <div className="toolbar-actions">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>Anterior</button>
            <span className="page-chip">Página {currentPage}</span>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Siguiente</button>
            <button className="delete bulk-delete" onClick={handleBulkDeleteClick} disabled={selectedIds.size === 0} title="Eliminar seleccionados">
              Eliminar seleccionados ({selectedIds.size})
            </button>
          </div>
        </div>
      )}

      {/* Tabla de documentos */}
      {!isCreating && !editingDocument && documentos && documentos.length > 0 ? (
        <div className="modulo-table-container">
          <table className="modulo-table">
            <thead>
              <tr>
                <th style={{ width: '48px' }}>
                  <input type="checkbox" onChange={toggleSelectAllCurrentPage} checked={documentos.length > 0 && documentos.every((d) => selectedIds.has(d.id))} aria-label="Seleccionar todos" />
                </th>
                <th>N° Caja</th>
                <th>ID Inventario</th>
                <th>N° Paquete</th>
                <th>N° Registro</th>
                <th>Tomo</th>
                <th>R. Inicial</th>
                <th>R. Final</th>
                <th>Folios</th>
                <th>Tipo Documental</th>
                <th>N° Documento</th>
                <th>Razón Social</th>
                <th>RUC</th>
                <th>Fecha Extrema</th>
                <th>Observaciones</th>
                <th>X1</th>
                <th>X2</th>
                <th>X3</th>
                <th>Cod. Uni. Org. Act</th>
                <th>Cod. Uni. Org. Ant</th>
                <th>Creado por</th>
                <th>Actualizado por</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <input type="checkbox" checked={selectedIds.has(doc.id)} onChange={() => toggleSelect(doc.id)} aria-label={`Seleccionar doc ${doc.id}`} />
                  </td>
                  <td>{doc.n_caja}</td>
                  <td>{doc.id_inventario}</td>
                  <td>{doc.n_paquete}</td>
                  <td>{doc.n_registro}</td>
                  <td>{doc.tomo}</td>
                  <td>{doc.r_inicial}</td>
                  <td>{doc.r_final}</td>
                  <td>{doc.folios}</td>
                  <td>{doc.t_documental}</td>
                  <td>{doc.n_documento}</td>
                  <td>{doc.r_social}</td>
                  <td>{doc.n_ruc}</td>
                  <td>{doc.f_extrema ? new Date(doc.f_extrema).toLocaleDateString() : ''}</td>
                  <td>{doc.c_observaciones}</td>
                  <td>{doc.c_x1}</td>
                  <td>{doc.c_x2}</td>
                  <td>{doc.c_x3}</td>
                  <td>{doc.cod_uni_org_act}</td>
                  <td>{doc.cod_uni_org_ant}</td>
                  <td>{doc.created_by}</td>
                  <td>{doc.updated_by}</td>
                  <td className="acciones">
                    <button className="edit" onClick={() => handleEditClick(doc)}>Editar</button>
                    <button className="delete" onClick={() => handleDeleteClick(doc.id)} disabled={deletingId === doc.id}>
                      {deletingId === doc.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !isCreating && !editingDocument && !loading && isFiltered && (!documentos || documentos.length === 0) ? (
        <p>No se encontraron documentos que coincidan con la búsqueda.</p>
      ) : !isCreating && !editingDocument && !loading && (!documentos || documentos.length === 0) ? (
        <p>No hay documentos disponibles.</p>
      ) : null}

      {/* Barra inferior de paginación/acciones */}
      {!isCreating && !editingDocument && totalItems > 0 && documentos && documentos.length > 0 && (
        <div className="table-toolbar">
          <div className="toolbar-info">
            <span>Resultados: {totalItems}</span>
            <span>Página {currentPage} de {totalPages}</span>
          </div>
          <div className="toolbar-actions">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>Anterior</button>
            <span className="page-chip">Página {currentPage}</span>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Siguiente</button>
            <button className="delete bulk-delete" onClick={handleBulkDeleteClick} disabled={selectedIds.size === 0} title="Eliminar seleccionados">
              Eliminar seleccionados ({selectedIds.size})
            </button>
          </div>
        </div>
      )}

      {deleteError && <div className="error-message">Error al eliminar: {deleteError.message}</div>}

      <AuthModal isOpen={showAuthModal} onClose={handleAuthCancel} onConfirm={handleAuthConfirm} />
    </div>
  );
};

export default DocumentosPage;
