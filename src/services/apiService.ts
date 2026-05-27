/**
 * apiService.ts
 * Capa de servicio para todas las llamadas al backend REST.
 * Si la API no está disponible, lanza un error que el AppContext
 * captura para usar mockData como fallback.
 */

import { API_BASE_URL, API_TIMEOUT } from '../config/api';
import { Platform } from 'react-native';

// ── Helper: fetch con timeout ────────────────────────────────
async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

// ── Helper: parsear respuesta JSON ───────────────────────────
async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  const json = await response.json();
  return json.data as T;
}

// ── Tipos de retorno ─────────────────────────────────────────
export interface ApiUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  photo_url: string | null;
  status: string;
}

export interface ApiSite {
  id: string;
  code: string;
  name: string;
  commune: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  region: number | null;
  estado_excel: string;
  proyecto: string;
  apagado_bafi: boolean;
}

export interface ApiPlanning {
  id: string;
  site_id: string;
  worker_id: string;
  status: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  observations: string | null;
  // Campos JOIN
  site_code?: string;
  site_name?: string;
  commune?: string;
  proyecto?: string;
  worker_name?: string;
  worker_role?: string;
  worker_phone?: string;
}

export interface ApiReportSummary {
  totales: {
    sitios: number;
    usuarios: number;
    planificaciones: number;
    fotos: number;
  };
  por_estado: { status: string; count: string }[];
  por_trabajador: { worker: string; role: string; total_plannings: string; executed: string }[];
  ultimos_ejecutados: ApiPlanning[];
}

// ── USERS ────────────────────────────────────────────────────
export async function getUsers(): Promise<ApiUser[]> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/users`);
  const json = await res.json();
  return json.data as ApiUser[];
}

export async function createUser(user: ApiUser): Promise<ApiUser> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  return parseResponse<ApiUser>(res);
}

export async function updateUserApi(id: string, user: Partial<ApiUser>): Promise<ApiUser> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  return parseResponse<ApiUser>(res);
}

// ── SITES ────────────────────────────────────────────────────
export async function getSites(): Promise<ApiSite[]> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/sites`);
  const json = await res.json();
  return json.data as ApiSite[];
}

// ── PLANNINGS ────────────────────────────────────────────────
export async function getPlannings(filters?: {
  status?: string;
  worker_id?: string;
  site_id?: string;
  date?: string;
}): Promise<ApiPlanning[]> {
  const params = new URLSearchParams();
  if (filters?.status)    params.append('status',    filters.status);
  if (filters?.worker_id) params.append('worker_id', filters.worker_id);
  if (filters?.site_id)   params.append('site_id',   filters.site_id);
  if (filters?.date)      params.append('date',      filters.date);

  const url = `${API_BASE_URL}/plannings${params.toString() ? '?' + params.toString() : ''}`;
  const res  = await fetchWithTimeout(url);
  const json = await res.json();
  return json.data as ApiPlanning[];
}

export async function getPlanningDetail(id: string): Promise<ApiPlanning> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/plannings/${id}`);
  return parseResponse<ApiPlanning>(res);
}

export async function createPlanningApi(data: {
  id: string;
  site_id: string;
  worker_id: string;
  status: string;
  scheduled_date: string;
  observations?: string;
  created_by?: string;
}): Promise<ApiPlanning> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/plannings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseResponse<ApiPlanning>(res);
}

export async function updatePlanningApi(id: string, data: any): Promise<any> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/plannings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseResponse<any>(res);
}

// ── REPORTS ──────────────────────────────────────────────────
export async function getReportSummary(): Promise<ApiReportSummary> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/reports/summary`);
  return parseResponse<ApiReportSummary>(res);
}

export async function getDailyReport(date: string): Promise<ApiPlanning[]> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/reports/daily?date=${date}`);
  const json = await res.json();
  return json.data as ApiPlanning[];
}

// ── Health check ─────────────────────────────────────────────
export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL.replace('/api', '')}`);
    const json = await res.json();
    return json.status === 'OK';
  } catch {
    return false;
  }
}

// ── Subida de Fotos Físicas a la Mac ─────────────────────────
export async function uploadPhotoApi(uri: string): Promise<string> {
  const formData = new FormData();
  let cleanUri = uri;
  try {
    // 1. Decodificar completamente hasta tener @ y /
    let decoded = decodeURIComponent(uri);
    if (decoded.includes('%')) {
      decoded = decodeURIComponent(decoded);
    }

    // 2. Si contiene el prefijo de caché de Expo, asegurar formato double-percent encoded (%2540 y %252F)
    // para que la decodificación implícita nativa de React Native la resuelva a la ruta física literal con %40 y %2F
    const expIndex = decoded.indexOf('ExperienceData/');
    if (expIndex !== -1) {
      const prefix = decoded.substring(0, expIndex + 'ExperienceData/'.length);
      const rest = decoded.substring(expIndex + 'ExperienceData/'.length);
      const doubleEncodedRest = rest.replace(/@([^/]+)\/([^/]+)/g, '%2540$1%252F$2');
      cleanUri = prefix + doubleEncodedRest;
    } else {
      cleanUri = decoded;
    }
  } catch (e) {
    console.log('Error decodificando URI:', e);
  }

  const filename = cleanUri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';
  
  // @ts-ignore
  formData.append('photo', {
    uri: cleanUri,
    name: filename,
    type,
  });

  const res = await fetch(`${API_BASE_URL}/photos/upload`, {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Error en subida: ${res.status}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Fallo en la subida');
  }

  return json.url;
}

// ── Actualizar Ubicación GPS de un Trabajador ────────────────
export async function updateUserLocationApi(id: string, latitude: number, longitude: number): Promise<any> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/users/${id}/location`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude, longitude }),
  });
  
  if (!res.ok) {
    throw new Error(`Error en actualización de ubicación: ${res.status}`);
  }
  
  return parseResponse<any>(res);
}

// ── Obtener Notificaciones de un Trabajador ──────────────────
export async function getNotificationsApi(workerId: string): Promise<any> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/notifications/worker/${workerId}`);
  if (!res.ok) {
    throw new Error(`Error al obtener notificaciones: ${res.status}`);
  }
  return parseResponse<any>(res);
}

// ── Marcar Notificación como Leída ──────────────────────────
export async function markNotificationAsReadApi(id: number): Promise<any> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/notifications/${id}/read`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Error al marcar notificación como leída: ${res.status}`);
  }
  return parseResponse<any>(res);
}

// ── Marcar Todas las Notificaciones como Leídas ──────────────
export async function markAllNotificationsAsReadApi(workerId: string): Promise<any> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/notifications/worker/${workerId}/read-all`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Error al marcar todas las notificaciones como leídas: ${res.status}`);
  }
  return parseResponse<any>(res);
}

// ── Eliminar una Notificación ────────────────────────────────
export async function deleteNotificationApi(id: number): Promise<any> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/notifications/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Error al eliminar notificación: ${res.status}`);
  }
  return parseResponse<any>(res);
}
