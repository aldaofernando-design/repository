/**
 * apiService.ts
 * Capa de servicio para todas las llamadas al backend REST.
 * Si la API no está disponible, lanza un error que el AppContext
 * captura para usar mockData como fallback.
 */

import { API_BASE_URL, API_TIMEOUT } from '../config/api';

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

export async function createUser(user: Omit<ApiUser, 'id'>): Promise<ApiUser> {
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

export async function updatePlanningApi(id: string, data: {
  status?: string;
  start_time?: string | null;
  end_time?: string | null;
  observations?: string;
}): Promise<ApiPlanning> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/plannings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseResponse<ApiPlanning>(res);
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
