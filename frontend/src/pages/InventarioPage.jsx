import React, { useState, useEffect } from 'react';


import { getAllInventario, createInventario, updateInventario, deleteInventario, downloadInventarioPdfReport } from '../services/api';
import './InventarioPage.css';
import AuthModal from '../components/AuthModal';

const InventarioPage = () => {
  const [inventarioItems, setInventarioItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Estados para los términos de búsqueda
  const [filters, setFilters] = useState({
    id: '',
    nombrearchivo: '',
    nromemo: '',
    nmesa: '',
    f_subida: '',
    estado: '',
    obs_estado: '',
    usr_creador_id: '',
    uni_org_id: '',
    created_at: '',
    updated_at: '',
    created_by: '',
    updated_by: '',
  });

  // Estado para la edición
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Estado para la Creación
  const [isCreating, setIsCreating] = useState(false); // Para controlar la visibilidad del formulario de Creación
  const [newFormData, setNewFormData] = useState({
    nombrearchivo: '',
    nromemo: '',
    nmesa: null,
    f_subida: '',
    obs_estado: '',
    estado: '',
    f_estado: '',
    usr_creador_id: null,
    uni_org_id: null,
  });
  const [isCreatingItem, setIsCreatingItem] = useState(false); // Para el estado de guardado (Creación)
  const [createError, setCreateError] = useState(null); // Para errores al crear

  // Estado para la eliminación
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  // Selección para eliminación múltiple
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDelete, setBulkDelete] = useState(false);

  // Estados para la paginación
  const [currentPage, setCurrentPage] = useState(1); // Página actual (1-indexed)
  const [itemsPerPage] = useState(100); // Límite de items por página (fijo en 100)
  const [totalItems, setTotalItems] = useState(0); // Total de items que coinciden con los filtros

  const fetchInventario = async (currentFilters = filters, page = currentPage, limit = itemsPerPage) => {
    setLoading(true);
    setError(null);
    // Calcular el offset para la paginación
    const offset = (page - 1) * limit;
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(currentFilters).filter(([_, value]) => value !== '')
      );
      // Pasar los filtros, límite y offset a la función de API
      const data = await getAllInventario({ ...cleanFilters, limit, offset });
      // La respuesta del backend ahora tiene la forma { inventarios: [...], total: ... }
      setInventarioItems(data.inventarios);
      setTotalItems(data.total);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setDeletingId(null); // Resetear estado de eliminación
    }
  };

  useEffect(() => {
    // Cargar la primera página de inventario al montar el componente
    fetchInventario({}, 1, itemsPerPage);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: value
    }));
    // Resetear a la primera página cuando cambian los filtros de búsqueda
    setCurrentPage(1);
  };

  const handleSearch = () => {
    // Llama a fetchInventario con los filtros actuales, reseteando a la página 1
    fetchInventario(filters, 1, itemsPerPage);
  };

  const handleResetSearch = () => {
    const resetFilters = Object.fromEntries(
      Object.keys(filters).map(key => [key, ''])
    );
    setFilters(resetFilters);
    setCurrentPage(1); // Resetear a la primera página
    fetchInventario(resetFilters, 1, itemsPerPage);
  };

  // Seleccionar / deseleccionar una fila
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Seleccionar / deseleccionar todas las filas visibles
  const toggleSelectAllCurrentPage = () => {
    const allIds = inventarioItems.map(i => i.id);
    const allSelected = allIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) { allIds.forEach(id => next.delete(id)); } else { allIds.forEach(id => next.add(id)); }
      return next;
    });
  };

  // Manejadores para la Creación
  const handleCreateClick = () => {
    setIsCreating(true);
    setNewFormData({
      nombrearchivo: '',
      nromemo: '',
      nmesa: null,
      f_subida: '',
      obs_estado: '',
      estado: '',
      f_estado: '',
      usr_creador_id: null,
      uni_org_id: null,
    });
    setCreateError(null);
  };

  const handleNewFormChange = (e) => {
    const { name, value } = e.target;
    setNewFormData(prevData => ({
      ...prevData,
      [name]: value // No convertimos a null aquí a menos que sea necesario por validación específica
    }));
  };

  const handleSaveNew = async () => {
    setIsCreatingItem(true);
    setCreateError(null);
    try {
      await createInventario(newFormData);
      setIsCreating(false);
      setNewFormData({});
      // Recargar el inventario para mostrar el nuevo item (probablemente en la primera página)
      fetchInventario(filters, 1, itemsPerPage); // Recargar la primera página
    } catch (err) {
      // Verificar si es un error de duplicado
      if (err.response && err.response.status === 400) {
        const errorData = err.response.data;
        setCreateError({
          message: `Error: ${errorData.details}`,
          duplicateData: errorData.duplicateData
        });
      } else {
        setCreateError({ message: 'Error al crear el registro' });
      }
      console.error('Error creating inventario item:', err);
    } finally {
      setIsCreatingItem(false);
    }
  };

  const handleCancelNew = () => {
    setIsCreating(false);
    setNewFormData({});
    setCreateError(null);
  };

  // Manejadores para la edición
  const handleEditClick = (item) => {
    setEditingItem(item);
    // Inicializar editFormData con los datos del item, manejando posibles nulls para inputs
    setEditFormData({
      id: item.id,
      nombrearchivo: item.nombrearchivo || '',
      nromemo: item.nromemo || '',
      nmesa: item.nmesa || '',
      f_subida: item.f_subida ? new Date(item.f_subida).toISOString().split('T')[0] : '', // Formato YYYY-MM-DD
      obs_estado: item.obs_estado || '',
      estado: item.estado || '',
      f_estado: item.f_estado ? new Date(item.f_estado).toISOString().split('T')[0] : '', // Formato YYYY-MM-DD
      usr_creador_id: item.usr_creador_id || '',
      uni_org_id: item.uni_org_id || '',
      // created_by, updated_by no editables en frontend
    });
    setSaveError(null);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prevData => ({
      ...prevData,
      [name]: value // No convertimos a null aquí a menos que sea necesario por validación específica
    }));
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateInventario(editingItem.id, editFormData);
      setEditingItem(null);
      setEditFormData({});
      // Recargar el inventario para mostrar los cambios
      fetchInventario(filters, currentPage, itemsPerPage); // Recargar con filtros y página actuales
    } catch (err) {
      setSaveError(err);
      console.error('Error updating inventario item:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditFormData({});
    setSaveError(null);
  };

  // Reemplazar el manejador de eliminación
  const handleDeleteClick = (id) => {
    setItemToDelete(id);
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
          await deleteInventario(id, username, password);
        }
        setSelectedIds(new Set());
      } else if (itemToDelete) {
        setDeletingId(itemToDelete);
        await deleteInventario(itemToDelete, username, password);
        setItemToDelete(null);
      }
      fetchInventario(filters, currentPage, itemsPerPage);
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
    setItemToDelete(null);
  };

  // Determina si algún campo de filtro tiene valor para mostrar el botón Reset
  const isFiltered = Object.values(filters).some(val => val !== '');

  // --- Manejador para descargar el reporte PDF ---
  const handleDownloadPdfReport = async () => {
    try {
      // Llama a la función de la API para descargar el reporte con los filtros actuales
      const blob = await downloadInventarioPdfReport(filters);

      // Crear una URL para el blob y un enlace temporal para descargar el archivo
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reporte_inventario.pdf'; // Nombre del archivo a descargar
      document.body.appendChild(a);
      a.click();

      // Limpiar después de la descarga
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Error al descargar el reporte PDF:', error);
      // Mostrar un mensaje al usuario si hubo un error
      alert('Hubo un error al descargar el reporte PDF.');
    }
  };
  // -----------------------------------------------

  // Lógica de paginación
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Cargar inventario para la nueva página con los filtros actuales
      fetchInventario(filters, page, itemsPerPage);
    }
  };

  if (loading && inventarioItems.length === 0 && !isFiltered && currentPage === 1) {
    return <div>Cargando items de inventario...</div>;
  }

  if (error && !isCreating && !editingItem) {
    return <div>Error al cargar items de inventario: {error.message}</div>;
  };

  return (
    <div className="inventario-container">
      <div className="modulo-header">
        <h1 className="modulo-title">Gestión de Archivos Fí­sicos</h1>
        {!isCreating && !editingItem && (
          <div className="modulo-actions">
            <button onClick={handleCreateClick} disabled={isCreating}>
              + Crear Nuevo Registro
            </button>
            <button onClick={handleDownloadPdfReport}>Descargar Reporte PDF</button>
          </div>
        )}
      </div>

      {!isCreating && !editingItem && (
        <div className="modulo-filtros-panel">
          <div className="filtro-item">
            <label htmlFor="id">N° ID Inventario</label>
            <input type="text" name="id" placeholder="N° ID Inventario" value={filters.id} onChange={handleInputChange} />
          </div>
          <div className="filtro-item">
            <label htmlFor="nombrearchivo">Nombre Archivo</label>
            <input type="text" name="nombrearchivo" placeholder="Nombre archivo" value={filters.nombrearchivo} onChange={handleInputChange} />
          </div>
          <div className="filtro-item">
            <label htmlFor="nromemo">N° Memo</label>
            <input type="text" name="nromemo" placeholder="N° Memo" value={filters.nromemo} onChange={handleInputChange} />
          </div>
          <div className="filtro-item">
            <label htmlFor="nmesa">N° Mesa</label>
            <input type="text" name="nmesa" placeholder="N° Mesa" value={filters.nmesa} onChange={handleInputChange} />
          </div>
          <div className="filtro-item">
            <label htmlFor="f_subida">Fecha Subida</label>
            <input type="date" name="f_subida" placeholder="Fecha Subida" value={filters.f_subida} onChange={handleInputChange} />
          </div>
          <div className="filtro-item">
            <label htmlFor="estado">Estado</label>
            <input type="text" name="estado" placeholder="Estado" value={filters.estado} onChange={handleInputChange} />
          </div>
          <div className="filtro-item">
            <label htmlFor="obs_estado">Obs. Estado</label>
            <input type="text" name="obs_estado" placeholder="Obs. Estado" value={filters.obs_estado} onChange={handleInputChange} />
          </div>
          <div className="filtro-item">
            <label htmlFor="usr_creador_id">N° ID Creador</label>
            <input type="text" name="usr_creador_id" placeholder="N° ID Creador" value={filters.usr_creador_id} onChange={handleInputChange} />
          </div>
          <div className="filtro-item">
            <label htmlFor="uni_org_id">Cod. Uni. Org.</label>
            <input type="text" name="uni_org_id" placeholder="Cod. Uni. Org." value={filters.uni_org_id} onChange={handleInputChange} />
          </div>
          <div className="filtro-item">
            <label htmlFor="created_at">Fecha Creación</label>
            <input type="date" name="created_at" placeholder="Fecha Creación" value={filters.created_at} onChange={handleInputChange} />
          </div>
          <div className="filtro-item">
            <label htmlFor="updated_at">Fecha Actualización</label>
            <input type="date" name="updated_at" placeholder="Fecha Actualización" value={filters.updated_at} onChange={handleInputChange} />
          </div>
          <div className="filtro-item">
            <label htmlFor="created_by">Creado Por</label>
            <input type="text" name="created_by" placeholder="Creado Por" value={filters.created_by} onChange={handleInputChange} />
          </div>
          <div className="filtro-item">
            <label htmlFor="updated_by">Actualizado Por</label>
            <input type="text" name="updated_by" placeholder="Actualizado Por" value={filters.updated_by} onChange={handleInputChange} />
          </div>
          <div className="filtros-botones" style={{ gridColumn: '1 / -1' }}>
            <button className="buscar-btn" onClick={handleSearch}>Buscar</button>
            {isFiltered && <button className="limpiar-btn" onClick={handleResetSearch}>Resetear Búsqueda</button>}
          </div>
        </div>
      )}

      {isCreating && (
        <div className="inventario-form">
          <h2 className="inventario-title">Crear Nuevo Registro de Archivo</h2>
          {isCreatingItem && <div>Creando registro...</div>}
          {createError && (
            <div className="error-message" style={{ marginBottom: '1rem', color: 'red' }}>
              {createError.message}
              {createError.duplicateData && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.9em' }}>
                  Registro duplicado encontrado con:
                  <ul style={{ marginTop: '0.25rem', marginBottom: '0.25rem' }}>
                    <li>Nombre de archivo: {createError.duplicateData.nombrearchivo}</li>
                    <li>Número de memo: {createError.duplicateData.nromemo}</li>
                  </ul>
                </div>
              )}
            </div>
          )}
          <div>
            <label>Nombre Archivo:</label>
            <input type="text" name="nombrearchivo" value={newFormData.nombrearchivo || ''} onChange={handleNewFormChange} /><br/>
            <label>Nro Memo:</label>
            <input type="text" name="nromemo" value={newFormData.nromemo || ''} onChange={handleNewFormChange} /><br/>
            <label>Nro Mesa:</label>
            <input type="text" name="nmesa" value={newFormData.nmesa || ''} onChange={handleNewFormChange} /><br/>
            <label>Fecha Subida:</label>
            <input type="date" name="f_subida" value={newFormData.f_subida || ''} onChange={handleNewFormChange} /><br/>
            <label>Obs. Estado:</label>
            <textarea name="obs_estado" value={newFormData.obs_estado || ''} onChange={handleNewFormChange}></textarea><br/>
            <label>Estado:</label>
            <input type="text" name="estado" value={newFormData.estado || ''} onChange={handleNewFormChange} /><br/>
            <label>Fecha Estado:</label>
            <input type="date" name="f_estado" value={newFormData.f_estado || ''} onChange={handleNewFormChange} /><br/>
            <label>ID Creador:</label>
            <input type="text" name="usr_creador_id" placeholder="ID del usuario creador" value={newFormData.usr_creador_id || ''} onChange={handleNewFormChange} /><br/>
            <label>ID Uni. Org.:</label>
            <input type="text" name="uni_org_id" placeholder="ID de la unidad orgánica" value={newFormData.uni_org_id || ''} onChange={handleNewFormChange} /><br/>

            <button onClick={handleSaveNew} disabled={isCreatingItem}>Crear Registro</button>
            <button onClick={handleCancelNew} disabled={isCreatingItem}>Cancelar</button>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="inventario-form">
          <h2 className="inventario-title">Editar Registro de Archivo (ID: {editingItem.id})</h2>
          {isSaving && <div>Guardando cambios...</div>}
          {saveError && <div>Error al guardar: {saveError.message}</div>}
          <div>
            <label>ID:</label>
            <input type="text" value={editFormData.id} disabled /><br/>
            <label>Nombre Archivo:</label>
            <input type="text" name="nombrearchivo" value={editFormData.nombrearchivo || ''} onChange={handleEditFormChange} /><br/>
            <label>Nro Memo:</label>
            <input type="text" name="nromemo" value={editFormData.nromemo || ''} onChange={handleEditFormChange} /><br/>
            <label>Nro Mesa:</label>
            <input type="text" name="nmesa" value={editFormData.nmesa || ''} onChange={handleEditFormChange} /><br/>
            <label>Fecha Subida:</label>
            <input type="date" name="f_subida" value={editFormData.f_subida || ''} onChange={handleEditFormChange} /><br/>
            <label>Obs. Estado:</label>
            <textarea name="obs_estado" value={editFormData.obs_estado || ''} onChange={handleEditFormChange}></textarea><br/>
            <label>Estado:</label>
            <input type="text" name="estado" value={editFormData.estado || ''} onChange={handleEditFormChange} /><br/>
            <label>Fecha Estado:</label>
            <input type="date" name="f_estado" value={editFormData.f_estado || ''} onChange={handleEditFormChange} /><br/>
            <label>ID Creador:</label>
            <input type="text" name="usr_creador_id" placeholder="ID del usuario creador" value={editFormData.usr_creador_id || ''} onChange={handleEditFormChange} /><br/>
            <label>ID Uni. Org.:</label>
            <input type="text" name="uni_org_id" placeholder="ID de la unidad orgánica" value={editFormData.uni_org_id || ''} onChange={handleEditFormChange} /><br/>

            <button onClick={handleSaveEdit} disabled={isSaving}>Guardar Cambios</button>
            <button onClick={handleCancelEdit} disabled={isSaving}>Cancelar</button>
          </div>
        </div>
      )}

      {/* hr removido para evitar línea extra */}

      {totalItems > 0 && !isCreating && !editingItem && (
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

      {!isCreating && !editingItem && inventarioItems && inventarioItems.length > 0 ? (
        <div className="modulo-table-container">
          <table className="modulo-table">
            <thead>
              <tr>
                <th style={{width:'48px'}}><input type="checkbox" onChange={toggleSelectAllCurrentPage} checked={inventarioItems.length>0 && inventarioItems.every(i=>selectedIds.has(i.id))} aria-label="Seleccionar todos" /></th>
                <th>ID</th>
                <th>Nombre Archivo</th>
                <th>N° Memo</th>
                <th>N° Mesa</th>
                <th>Fecha Subida</th>
                <th>Estado</th>
                <th>Obs. Estado</th>
                <th>Fecha Estado</th>
                <th>ID Creador</th>
                <th>ID Uni. Org.</th>
                <th>Creado en</th>
                <th>Actualizado en</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {inventarioItems.map((item) => (
                <tr key={item.id}>
                  <td><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} aria-label={`Seleccionar item ${item.id}`} /></td>
                  <td>{item.id}</td>
                  <td>{item.nombrearchivo}</td>
                  <td>{item.nromemo}</td>
                  <td>{item.nmesa}</td>
                  <td>{item.f_subida ? new Date(item.f_subida).toLocaleDateString() : ''}</td>
                  <td>{item.estado}</td>
                  <td>{item.obs_estado}</td>
                  <td>{item.f_estado ? new Date(item.f_estado).toLocaleDateString() : ''}</td>
                  <td>{item.usr_creador_id}</td>
                  <td>{item.uni_org_id}</td>
                  <td>{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</td>
                  <td>{item.updated_at ? new Date(item.updated_at).toLocaleString() : ''}</td>
                  <td className="acciones">
                    <button className="edit" onClick={() => handleEditClick(item)}>Editar</button>
                    <button className="delete" onClick={() => handleDeleteClick(item.id)} disabled={deletingId === item.id}>
                      {deletingId === item.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !isCreating && !editingItem && !loading && isFiltered && (!inventarioItems || inventarioItems.length === 0) ? (
        <p>No se encontraron items de inventario que coincidan con la búsqueda.</p>
      ) : !isCreating && !editingItem && !loading && (!inventarioItems || inventarioItems.length === 0) ? (
        <p>No hay items de inventario disponibles.</p>
      ) : null }

      {deleteError && <div>Error al eliminar: {deleteError.message}</div>}

      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthCancel}
        onConfirm={handleAuthConfirm}
      />
    </div>
  );
};

export default InventarioPage;

