import axios from 'axios';

const API_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:4000/api'
    : (import.meta.env.VITE_API_URL || '/api');

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 0,
});

// Interceptores: normalizar mensajes de error sin cambiar las funciones existentes
api.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
      const payload = error && error.response && error.response.data;
      const msg = (payload && (payload.error || payload.message)) || error.message || 'Error de API';
      error.message = msg;
    } catch (_) {}
    return Promise.reject(error);
  }
);

// Ejemplo de función para obtener todas las cajas
export const getAllCajas = async (filters = {}) => {
  try {
    const response = await api.get('/cajas', { params: filters });
    return response.data;
  } catch (error) {
    console.error('Error fetching cajas:', error);
    throw error;
  }
};

// --- NUEVA FUNCIÓN para obtener una caja por ID ---
export const getCajaById = async (id) => {
  try {
    const response = await api.get(`/cajas/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching caja with id ${id}:`, error);
    // Si el backend devuelve 404, podemos manejarlo aquí o en el componente
    // Por ahora, solo logueamos y relanzamos el error
    throw error;
  }
};
// --------------------------------------------------

// --- NUEVA FUNCIÓN para actualizar una caja por ID ---
export const updateCaja = async (id, cajaData, username, password) => {
  try {
    const config = {};
    if (username && password) {
      config.headers = {
        ...(config.headers || {}),
        'Authorization': 'Basic ' + btoa(`${username}:${password}`)
      };
    }
    const response = await api.put(`/cajas/${id}`, cajaData, config);
    return response.data;
  } catch (error) {
    console.error(`Error updating caja with id ${id}:`, error);
    throw error;
  }
};
// ----------------------------------------------------

// --- NUEVA FUNCIÓN para eliminar una caja por ID ---
export const deleteCaja = async (id, username, password) => {
  try {
    const response = await api.delete(`/cajas/${id}`, {
      headers: {
        'Authorization': 'Basic ' + btoa(`${username}:${password}`)
      }
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      throw new Error('Usuario o contraseña incorrectos');
    }
    console.error(`Error deleting caja with id ${id}:`, error);
    throw error;
  }
};
// ---------------------------------------------------

// --- NUEVA FUNCIÓN para descargar reporte PDF de cajas ---
export const downloadCajasPdfReport = async (filters = {}) => {
  try {
    // Realizar una solicitud GET al endpoint del reporte, pasando los filtros como query params
    const response = await api.get('/cajas/report/pdf', {
      params: filters,
      responseType: 'blob', // Importante: esperar una respuesta binaria (blob) para archivos
    });
    return response.data; // Devuelve el blob
  } catch (error) {
    console.error('Error downloading cajas PDF report:', error);
    throw error;
  }
};
// ---------------------------------------------------------

// Puedes agregar funciones similares para otros módulos (registros, inventario, etc.)

// --- NUEVA FUNCIÓN para descargar reporte PDF de registros ---
export const downloadRegistrosPdfReport = async (filters = {}) => {
  try {
    // Realizar una solicitud GET al endpoint del reporte, pasando los filtros como query params
    const response = await api.get('/registros/report/pdf', {
      params: filters,
      responseType: 'blob', // Importante: esperar una respuesta binaria (blob) para archivos
    });
    return response.data; // Devuelve el blob
  } catch (error) {
    console.error('Error downloading registros PDF report:', error);
    throw error;
  }
};
// ---------------------------------------------------------

// Ejemplo para obtener un registro por ID
export const getRegistroById = async (id) => {
  try {
    const response = await api.get(`/registros/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching registro with id ${id}:`, error);
    throw error;
  }
};

// Ejemplo para crear un registro
export const createRegistro = async (registroData) => {
  try {
    const response = await api.post('/registros', registroData);
    return response.data;
  } catch (error) {
    console.error('Error creating registro:', error);
    throw error;
  }
};

// ... otras funciones para inventario, usuarios, etc.

// --- NUEVAS FUNCIONES para el módulo de Inventario (Documentos) ---
export const getAllInventario = async (filters = {}) => {
  try {
    const response = await api.get('/inventario', { params: filters });
    return response.data;
  } catch (error) {
    console.error('Error fetching inventario items:', error);
    throw error;
  }
};

export const getInventarioById = async (id) => {
  try {
    const response = await api.get(`/inventario/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching inventario item with id ${id}:`, error);
    throw error;
  }
};

export const createInventario = async (itemData) => {
  try {
    const response = await api.post('/inventario', itemData);
    return response.data;
  } catch (error) {
    console.error('Error creating inventario item:', error);
    throw error;
  }
};

export const updateInventario = async (id, itemData) => {
  try {
    const response = await api.put(`/inventario/${id}`, itemData);
    return response.data;
  } catch (error) {
    console.error(`Error updating inventario item with id ${id}:`, error);
    throw error;
  }
};

export const deleteInventario = async (id, username, password) => {
  try {
    const headers = (username && password)
      ? { 'Authorization': 'Basic ' + btoa(`${username}:${password}`) }
      : undefined;
    const response = await api.delete(`/inventario/${id}`,(headers?{ headers }:undefined));
    return response.data;
  } catch (error) {
    console.error(`Error deleting inventario item with id ${id}:`, error);
    throw error;
  }
};
// ------------------------------------------------------------------

// Funciones para el módulo de Registros (ad_inventario_reg)
export const getAllRegistros = async (filters = {}) => {
  try {
    const response = await api.get('/registros', { params: filters });
    return response.data;
  } catch (error) {
    console.error('Error fetching registros:', error);
    throw error;
  }
};

export const updateRegistro = async (id, registroData) => {
  try {
    const response = await api.put(`/registros/${id}`, registroData);
    return response.data;
  } catch (error) {
    console.error(`Error updating registro with id ${id}:`, error);
    throw error;
  }
};

export const deleteRegistro = async (id, username, password) => {
  try {
    const headers = (username && password)
      ? { 'Authorization': 'Basic ' + btoa(`${username}:${password}`) }
      : undefined;
    const response = await api.delete(`/registros/${id}`,(headers?{ headers }:undefined));
    return response.data;
  } catch (error) {
    console.error(`Error deleting registro with id ${id}:`, error);
    throw error;
  }
};

// --- NUEVA FUNCIÓN para descargar reporte PDF de inventario ---
export const downloadInventarioPdfReport = async (filters = {}) => {
  try {
    // Realizar una solicitud GET al endpoint del reporte, pasando los filtros como query params
    const response = await api.get('/inventario/report/pdf', {
      params: filters,
      responseType: 'blob', // Importante: esperar una respuesta binaria (blob) para archivos
    });
    return response.data; // Devuelve el blob
  } catch (error) {
    console.error('Error downloading inventario PDF report:', error);
    throw error;
  }
};
// -----------------------------------------------------------

// --- NUEVA FUNCIÓN para importar cajas desde un archivo Excel ---
export const importCajasFromExcel = async (file, signal) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/cajas/import/excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal: signal, // Agregar soporte para AbortController
      timeout: 0 // sin límite para esta operación en particular
    });
    return response.data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('La importación fue cancelada');
    }
    console.error('Error importing cajas from Excel:', error);
    throw error;
  }
};

// Función para descargar archivo de errores de cajas
export const downloadCajasErrorFile = async (filename) => {
  try {
    const response = await api.get(`/download/${filename}`, {
      responseType: 'blob' // Importante para descargar archivos
    });
    
    // Verificar que la respuesta sea válida
    if (!response.data) {
      throw new Error('No se recibieron datos del servidor');
    }

    // Crear URL del blob y descargar
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename; // nombre del archivo
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Error downloading error file:', error);
    throw error;
  }
};
// -----------------------------------------------------------

// --- NUEVA FUNCIÓN para importar registros desde un archivo Excel ---
// Función para importar desde Excel con validación de duplicados
export const importRegistrosFromExcel = async (file, signal) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/registros/import/excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      params: {
        validateDuplicates: true,  // Indica al backend que debe validar duplicados
        // Lista de campos a excluir de la comparación
        excludeFields: [
          'c_observaciones',
          'c_x1',
          'c_x2',
          'c_x3',
          'created_at',
          'updated_at',
          'created_by',
          'updated_by'
        ].join(',')
      },
      signal: signal, // Agregar soporte para AbortController
      timeout: 0 // sin límite para esta operación en particular
    });
    return response.data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('La importación fue cancelada por timeout');
    }
    if (error.response && error.response.data && error.response.data.duplicates) {
      throw {
        message: 'Se encontraron registros duplicados',
        duplicates: error.response.data.duplicates
      };
    }
    console.error('Error importing registros:', error);
    throw error;
  }
};

// --- FUNCIÓN para descargar archivo de errores ---
export const downloadErrorFile = async (filename) => {
  try {
    const response = await api.get(`/registros/download/errors/${filename}`, {
      responseType: 'blob', // Importante para descargar archivos
    });
    
    // Crear URL del blob y descargar
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Error downloading error file:', error);
    throw error;
  }
};
// -----------------------------------------------------------

// Adjuntar token JWT antes de enviar cada request
api.interceptors.request.use((config) => {
  try {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (_) {}
  return config;
});

export default api;

