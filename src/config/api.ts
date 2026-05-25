/**
 * Configuración central de la API REST
 * Modifica API_LOCAL_IP con la IP de tu Mac en la red WiFi.
 * Para obtenerla: ipconfig getifaddr en0
 */

// IP del Mac en la red local (obtenida automáticamente)
const API_LOCAL_IP = '192.168.0.44';
const API_PORT     = 3001;

// En desarrollo usa la IP local, en producción usa un dominio
export const API_BASE_URL = __DEV__
  ? `http://${API_LOCAL_IP}:${API_PORT}/api`
  : 'https://api.proyectosapp.com/api';

// Timeout para las peticiones (ms)
export const API_TIMEOUT = 8000;
