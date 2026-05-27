import React, { createContext, useState, ReactNode, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { users as initialUsers, sites as initialSites, plannings as initialPlannings } from '../data/mockData';
import { getSession, clearSession, saveSession } from '../utils/sessionHelper';
import {
  getUsers, getSites, getPlannings,
  createPlanningApi, updatePlanningApi,
  checkApiHealth, getPlanningDetail,
  updateUserLocationApi,
  createUser, updateUserApi, uploadPhotoApi,
  getNotificationsApi, markNotificationAsReadApi, markAllNotificationsAsReadApi,
  deleteNotificationApi,
  ApiUser, ApiSite, ApiPlanning,
} from '../services/apiService';
import { API_BASE_URL } from '../config/api';
import { getSantiagoTodayString } from '../services/timeUtils';
import { playNotificationSound } from '../utils/soundHelper';



export type UserRole = 'Administrador' | 'Coordinador' | 'Trabajador';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  photo: string;
  status: 'Activo' | 'Inactivo';
  latitude?: number;
  longitude?: number;
}

export interface Site {
  id: string;
  code: string;
  name: string;
  address: string;
  commune: string;
  lat: number;
  lng: number;
  region?: number;
  apagado3G?: string;
  apagadoBAFI?: string;
  configurarRETU?: string;
  estadoExcel?: string;
  proyecto?: string;
  cambioChapa?: string;
}

export interface Planning {
  id: string;
  siteId: string;
  workerId: string;
  date: string;
  status: string;
  startTime?: string | null;
  endTime?: string | null;
  details: {
    spliceCapacity: string;
    photos: string[];
  };
  hallazgos?: {
    observaciones: string;
    fotos: string[];
  };
  datosGenerales?: {
    tipoEstructura: string;
    fotoEstructura?: string;
    tipoContenedor: string;
    fotoFueraContenedor?: string;
    fotosGeneralesSitio?: string[];
    fotosInteriorContenedor?: string[];
    tipoEmpalme: string;
    fotosEmpalme: string[];
    capacidadProteccion: string;
    fotoMedidor: string;
    fotoSectorMedidor: string;
    numeroMedidor: string;
    lecturaConsumo: string;
    ampereEmpalme?: string[];
    fotoDisplayRectificador?: string;
    ampereDisplayRectificador?: string;
  };
  apagado3G?: {
    estado3G: string;
    seApagara3G: string;
    fotoEquipo3GEncendido?: string;
    fotoBreaker3GEncendido?: string;
    fotoBreaker3GApagado?: string;
    fotoEquipo3GApagado?: string;
    fotoEspacioRetirado?: string;
    seRetirara3G?: string;
    estadoRRU: string;
    seApagaraRRU: string;
    fotoRRUEncendido?: string;
    fotoRRUApagado?: string;
    ampere3GEncendido?: string;
    justificacionNoApagado?: string;
  };
  cambioChapa?: {
    tipoChapa: string;
    nroSerie: string;
    estadoInicial: string;
    fotoChapaAnterior: string;
    fotoNuevaChapa: string;
    fotoLlaveProgramacion: string;
    fotoPuertaCerrada: string;
    estadoFinal: string;
    justificacion?: string;
  };
  apagadoBafiSector1?: {
    estadoBasebandSector1: string;
    fotoBreakerBaseband1Encendido?: string;
    fotoBaseband1Encendida?: string;
    confirmadoApagadoRetirar?: boolean;
    fotoBreakerBaseband1Apagado?: string;
    fotoEspacioBaseband1Retirada?: string;
    fotosConsumoFinal?: string[];
    ampereConsumoFinal?: string[];
    fotoConsumoInicialCc?: string;
    ampereConsumoInicialCc?: string;
    fotoConsumoFinalCc?: string;
    ampereConsumoFinalCc?: string;
  };
  apagadoBafiSector2?: {
    estadoBasebandSector2: string;
    fotoBreakerBaseband2Encendido?: string;
    fotoBaseband2Encendida?: string;
    confirmadoApagadoRetirar?: boolean;
    fotoBreakerBaseband2Apagado?: string;
    fotoEspacioBaseband2Retirada?: string;
    fotosConsumoFinal?: string[];
    ampereConsumoFinal?: string[];
    fotoConsumoInicialCc?: string;
    ampereConsumoInicialCc?: string;
    fotoConsumoFinalCc?: string;
    ampereConsumoFinalCc?: string;
  };
  apagadoBafiSector3?: {
    estadoBasebandSector3: string;
    fotoBreakerBaseband3Encendido?: string;
    fotoBaseband3Encendida?: string;
    confirmadoApagadoRetirar?: boolean;
    fotoBreakerBaseband3Apagado?: string;
    fotoEspacioBaseband3Retirada?: string;
    fotosConsumoFinal?: string[];
    ampereConsumoFinal?: string[];
    fotoConsumoInicialCc?: string;
    ampereConsumoInicialCc?: string;
    fotoConsumoFinalCc?: string;
    ampereConsumoFinalCc?: string;
  };
  apagadoAntenaSector1?: {
    estadoAntenaSector1: string;
    fotoBreakerAntenaS1Encendido?: string;
    seApagaraAntenaS1?: string;
    fotoBreakerAntenaS1Apagado?: string;
    fotosConsumoFinal?: string[];
    ampereConsumoFinal?: string[];
    fotoConsumoInicialCc?: string;
    fotoConsumoFinalCc?: string;
    textoCompartida5G?: string;
    confirmadoApagadoAntena?: boolean;
  };
  apagadoAntenaSector2?: {
    estadoAntenaSector2: string;
    fotoBreakerAntenaS2Encendido?: string;
    seApagaraAntenaS2?: string;
    fotoBreakerAntenaS2Apagado?: string;
    fotosConsumoFinal?: string[];
    ampereConsumoFinal?: string[];
    fotoConsumoInicialCc?: string;
    fotoConsumoFinalCc?: string;
    textoCompartida5G?: string;
    confirmadoApagadoAntena?: boolean;
  };
  apagadoAntenaSector3?: {
    estadoAntenaSector3: string;
    fotoBreakerAntenaS3Encendido?: string;
    seApagaraAntenaS3?: string;
    fotoBreakerAntenaS3Apagado?: string;
    fotosConsumoFinal?: string[];
    ampereConsumoFinal?: string[];
    fotoConsumoInicialCc?: string;
    fotoConsumoFinalCc?: string;
    textoCompartida5G?: string;
    confirmadoApagadoAntena?: boolean;
  };
  alarmasExternas?: {
    tecnologiaAlarmas: string;
    fotoAlarmasOVP?: string;
    fotoAlarmasEquipos?: string;
    migraranTecnologia?: string;
    fotoAlarmasMigradas?: string;
    fotoAlarmasFinalesOVP?: string;
    implementaranAlarmas?: string;
    motivosNoImplementacion?: string;
    fotoNoImplementacion?: string;
    tecnologiaImplementacion?: string;
    fotoAlarmasImplementadas?: string;
  };
  evidenciaSalida?: {
    fotoRectificador?: string;
    fotoContenedor1?: string;
    fotoContenedor2?: string;
    fotoSitio1?: string;
    fotoSitio2?: string;
    fotoEstructuraSalida?: string;
    fotosConsumoFinalCaEvidencia?: string[];
    ampereConsumoFinalCaEvidencia?: string[];
    fotoConsumoFinalCcRectificador?: string;
    ampereDisplayRectificadorFinal?: string;
  };
}

export interface AppNotification {
  id: number;
  worker_id: string;
  type: string;
  message: string;
  is_read: boolean;
  planning_id: string | null;
  created_at: string;
  site_id?: string;
  site_code?: string;
  site_name?: string;
}

interface AppContextType {
  users: User[];
  sites: Site[];
  plannings: Planning[];
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  loadingSession: boolean;
  isApiConnected: boolean;
  logout: () => void;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, updatedUser: Partial<User>) => Promise<void>;
  setCurrentUserRole: (role: UserRole) => void;
  addPlanning: (planning: Omit<Planning, 'id' | 'details'>) => void;
  updatePlanning: (id: string, updatedData: Partial<Planning>) => void;
  updateSite: (id: string, updatedData: Partial<Site>) => void;
  fetchAndSyncPlanning: (id: string) => Promise<Planning | null>;
  updateUserLocation: (id: string, latitude: number, longitude: number) => Promise<void>;
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  fetchNotifications: () => Promise<void>;
  markNotificationAsRead: (id: number) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

const backendOrigin = API_BASE_URL.replace('/api', '');

function rewriteUploadUrl(url: any): any {
  if (typeof url === 'string' && url.includes('/uploads/')) {
    const uploadsIndex = url.indexOf('/uploads/');
    if (uploadsIndex !== -1) {
      return backendOrigin + url.substring(uploadsIndex);
    }
  }
  return url;
}

function rewriteUploadsInObject(obj: any): any {
  if (typeof obj === 'string') {
    return rewriteUploadUrl(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(rewriteUploadsInObject);
  }
  if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      newObj[key] = rewriteUploadsInObject(obj[key]);
    }
    return newObj;
  }
  return obj;
}

// ── Adaptadores: API → formato interno de la App ─────────────
function adaptApiUser(u: any): User {
  return {
    id:      u.id,
    name:    u.name,
    email:   u.email,
    phone:   u.phone,
    company: u.company,
    role:    u.role,
    photo:   u.photo_url ? rewriteUploadUrl(u.photo_url) : `https://i.pravatar.cc/150?u=${u.id}`,
    status:  (u.status as 'Activo' | 'Inactivo') || 'Activo',
    latitude:  u.latitude !== null && u.latitude !== undefined ? parseFloat(u.latitude) : undefined,
    longitude: u.longitude !== null && u.longitude !== undefined ? parseFloat(u.longitude) : undefined,
  };
}

function adaptApiSite(s: ApiSite): Site {
  return {
    id:          s.id,
    code:        s.code,
    name:        s.name,
    address:     s.address || '',
    commune:     s.commune || '',
    lat:         parseFloat(s.latitude  as any) || 0,
    lng:         parseFloat(s.longitude as any) || 0,
    region:      s.region    || undefined,
    estadoExcel: s.estado_excel,
    proyecto:    s.proyecto,
    apagadoBAFI: s.apagado_bafi ? 'SI' : 'NO',
  };
}

function adaptApiPlanning(p: any): Planning {
  const base = {
    details:   { spliceCapacity: '', photos: [] },
    ...(p.details_json || {}),
    id:        p.id,
    siteId:    p.site_id,
    workerId:  p.worker_id,
    date:      p.scheduled_date?.split('T')[0] || p.scheduled_date,
    status:    p.status,
    startTime: p.start_time  || undefined,
    endTime:   p.end_time    || undefined,
  };
  return rewriteUploadsInObject(base);
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers]       = useState<User[]>(initialUsers as User[]);
  const [sites, setSites]       = useState<Site[]>(initialSites);
  const [plannings, setPlannings] = useState<Planning[]>(initialPlannings);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unsyncedPlannings, setUnsyncedPlannings] = useState<string[]>([]);
  const isInitialLoadRef = useRef(true);

  // ── Cargar datos desde la API al iniciar ──────────────────
  useEffect(() => {
    const loadFromApi = async () => {
      try {
        const alive = await checkApiHealth();
        setIsApiConnected(alive);

        if (alive) {
          // Cargar en paralelo: usuarios, sitios y planificaciones
          const [apiUsers, apiSites, apiPlannings] = await Promise.all([
            getUsers(),
            getSites(),
            getPlannings(),
          ]);

          if (apiUsers.length > 0) {
            setUsers(apiUsers.map(adaptApiUser));
          }
          if (apiSites.length > 0) {
            setSites(apiSites.map(adaptApiSite));
          }
          if (apiPlannings.length > 0) {
            setPlannings(apiPlannings.map(adaptApiPlanning));
          }
          console.log(`✅ API conectada — ${apiUsers.length} usuarios, ${apiSites.length} sitios, ${apiPlannings.length} planificaciones`);
        } else {
          console.log('⚠️ API no disponible — usando datos locales');
        }
      } catch (error) {
        setIsApiConnected(false);
        console.log('⚠️ Error conectando a la API — usando datos locales:', error);
      }
    };

    loadFromApi();
  }, []);

  // ── Re-verificar conexión periódicamente y reconectar si es necesario ──
  // Refs para evitar dependencias reactivas y restarts de intervalo
  const planningsRef = useRef(plannings);
  planningsRef.current = plannings;
  const unsyncedPlanningsRef = useRef(unsyncedPlannings);
  unsyncedPlanningsRef.current = unsyncedPlannings;

  useEffect(() => {
    let checkInterval: any = null;

    const checkConnection = async () => {
      try {
        const alive = await checkApiHealth();
        if (alive && !isApiConnected) {
          console.log('🔄 API ha vuelto a estar disponible. Sincronizando datos...');
          
          // 1. Sincronizar cambios locales offline hacia la API antes de descargar
          const unsynced = unsyncedPlanningsRef.current;
          if (unsynced.length > 0) {
            console.log(`Pusheando ${unsynced.length} planificaciones modificadas offline...`);
            for (const id of unsynced) {
              const localPl = planningsRef.current.find(p => p.id === id);
              if (localPl) {
                try {
                  await updatePlanningApi(id, localPl);
                  console.log(`✅ Planificación offline ${id} sincronizada en PostgreSQL`);
                } catch (syncErr) {
                  console.error(`❌ Error sincronizando ${id} tras reconexión:`, syncErr);
                }
              }
            }
            setUnsyncedPlannings([]);
          }

          setIsApiConnected(true);
          
          const [apiUsers, apiSites, apiPlannings] = await Promise.all([
            getUsers(),
            getSites(),
            getPlannings(),
          ]);

          if (apiUsers.length > 0) {
            setUsers(apiUsers.map(adaptApiUser));
          }
          if (apiSites.length > 0) {
            setSites(apiSites.map(adaptApiSite));
          }
          if (apiPlannings.length > 0) {
            setPlannings(apiPlannings.map(adaptApiPlanning));
          }
          console.log(`✅ Datos sincronizados tras reconexión`);
        } else if (!alive && isApiConnected) {
          console.log('⚠️ Conexión con la API perdida. Entrando en modo offline.');
          setIsApiConnected(false);
        }
      } catch (err) {
        if (isApiConnected) {
          setIsApiConnected(false);
        }
      }
    };

    // Si está offline, verificar más seguido (cada 15s); si está online, cada 60s
    checkInterval = setInterval(checkConnection, isApiConnected ? 60000 : 15000);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [isApiConnected]);

  const lastReportTimeRef = useRef<number>(0);
  const hasReportedOnLoginRef = useRef<boolean>(false);
  const intervalIdRef = useRef<any>(null);

  // Reiniciar indicador de reporte en inicio de sesión y limpiar intervalo al cambiar de usuario o cerrar sesión
  useEffect(() => {
    hasReportedOnLoginRef.current = false;
    isInitialLoadRef.current = true;
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    // Si está offline, permitir sonidos después de 1 segundo de iniciar sesión
    const timer = setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 1000);
    return () => clearTimeout(timer);
  }, [currentUser?.id]);

  // ── Tracking GPS para Trabajadores con Planificaciones Activas (inmediato al iniciar y cada 15 min) ──
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'Trabajador') {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      return;
    }

    const todayString = getSantiagoTodayString();

    // 1. Obtener planificaciones del trabajador para el día de hoy
    const todayPlannings = plannings.filter(
      p => p.workerId === currentUser.id && p.date === todayString
    );

    // 2. ¿Tiene sitios en estado "Planificado", "Ejecutado" o "En ejecución" hoy?
    const hasTodayReportablePlanning = todayPlannings.some(
      p => p.status === 'Planificado' || p.status === 'Ejecutado' || p.status === 'En ejecución'
    );

    // 3. ¿Tiene sitios en estado "Planificado" o "En ejecución" hoy?
    const hasTodayPendingPlanning = todayPlannings.some(
      p => p.status === 'Planificado' || p.status === 'En ejecución'
    );

    const reportLocation = async (isImmediate = false) => {
      // Cooldown de 15 minutos (usamos 14 min de tolerancia) para reportes no inmediatos
      if (!isImmediate) {
        const now = Date.now();
        const timeSinceLastReport = now - lastReportTimeRef.current;
        if (timeSinceLastReport < 14 * 60 * 1000) {
          console.log(`ℹ️ Omitiendo tracking GPS: Reportado hace ${Math.round(timeSinceLastReport / 1000)}s.`);
          return;
        }
      }

      console.log(`🚀 Capturando ubicación GPS (${isImmediate ? 'Inmediato por inicio de sesión' : 'Periódico cada 15 min'})...`);

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('⚠️ Permiso de ubicación denegado para el tracking.');
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const { latitude, longitude } = loc.coords;
        console.log(`📍 Ubicación GPS capturada para ${currentUser.name}: ${latitude}, ${longitude}`);
        await updateUserLocation(currentUser.id, latitude, longitude);
        lastReportTimeRef.current = Date.now();
      } catch (err) {
        console.error('❌ Error capturando ubicación GPS:', err);
      }
    };

    // Reportar inmediatamente si tiene planificaciones hoy en estado reportable y aún no lo hizo en esta sesión
    if (hasTodayReportablePlanning && !hasReportedOnLoginRef.current) {
      hasReportedOnLoginRef.current = true;
      reportLocation(true);
    }

    // Gestionar el intervalo de 15 minutos basado en si le quedan actividades pendientes hoy
    if (hasTodayPendingPlanning) {
      if (!intervalIdRef.current) {
        console.log('🔄 Iniciando tracking GPS periódico (cada 15 min)...');
        intervalIdRef.current = setInterval(() => {
          reportLocation(false);
        }, 900000); // 15 minutos = 900,000 ms
      }
    } else {
      if (intervalIdRef.current) {
        console.log('ℹ️ Deteniendo tracking GPS periódico (no quedan sitios Planificados o En ejecución hoy).');
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    }
  }, [currentUser?.id, plannings]);

  // ── Polling periódico para mantener la aplicación actualizada (todos los roles) ──
  useEffect(() => {
    if (!currentUser) return;

    const pollData = async () => {
      if (!isApiConnected) return;
      try {
        console.log('🔄 Polling periódico de datos (usuarios, sitios y planificaciones) desde la API...');
        const [apiUsers, apiSites, apiPlannings] = await Promise.all([
          getUsers(),
          getSites(),
          getPlannings(),
        ]);

        // 1. Sincronizar Usuarios (Solo si cambiaron)
        if (apiUsers.length > 0) {
          const adaptedUsers = apiUsers.map(adaptApiUser);
          setUsers(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(adaptedUsers)) {
              console.log('🔄 Cambios detectados en usuarios, actualizando estado local...');
              return adaptedUsers;
            }
            return prev;
          });

          // Actualizar currentUser si cambió en la base de datos
          const freshCurrentUser = adaptedUsers.find(u => u.id === currentUser.id);
          if (freshCurrentUser) {
            if (
              freshCurrentUser.photo !== currentUser.photo ||
              freshCurrentUser.name !== currentUser.name ||
              freshCurrentUser.email !== currentUser.email ||
              freshCurrentUser.phone !== currentUser.phone ||
              freshCurrentUser.role !== currentUser.role ||
              freshCurrentUser.status !== currentUser.status
            ) {
              console.log('👤 Datos del perfil del usuario actual actualizados desde PostgreSQL');
              setCurrentUser(freshCurrentUser);
            }
          }
        }

        // 2. Sincronizar Sitios (Solo si cambiaron)
        if (apiSites.length > 0) {
          const adaptedSites = apiSites.map(adaptApiSite);
          setSites(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(adaptedSites)) {
              console.log('🔄 Cambios detectados en sitios, actualizando estado local...');
              return adaptedSites;
            }
            return prev;
          });
        }

        // 3. Sincronizar Planificaciones (Solo si cambiaron)
        if (apiPlannings.length > 0) {
          const adaptedPlannings = apiPlannings.map(adaptApiPlanning);
          setPlannings(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(adaptedPlannings)) {
              console.log('🔄 Cambios detectados en planificaciones, actualizando estado local...');
              return adaptedPlannings;
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn('⚠️ Error en polling periódico de datos:', err);
        setIsApiConnected(false);
      }
    };

    // Polling cada 30 segundos (30,000 ms) para mantener los datos de la app frescos
    const interval = setInterval(pollData, 30000);
    return () => clearInterval(interval);
  }, [currentUser?.id, isApiConnected]);

  // ── Posponer automáticamente planificaciones pasadas ──────
  useEffect(() => {
    const todayString = getSantiagoTodayString();

    setPlannings(prev => {
      let changed = false;
      const updated = prev.map(p => {
        if (p.status === 'Planificado' && p.date < todayString) {
          changed = true;
          return { ...p, status: 'Pospuesto' };
        }
        return p;
      });
      return changed ? updated : prev;
    });
  }, []);

  // ── Cargar sesión guardada del dispositivo ──────────────────
  useEffect(() => {
    const verifySavedSession = async () => {
      try {
        const session = await getSession();
        if (session && session.userId) {
          const matched = users.find(u => u.id === session.userId);
          if (matched) {
            setCurrentUser(matched);
            await saveSession(matched.id);
          }
        }
      } catch (error) {
        console.error('Error verifying session:', error);
      } finally {
        setLoadingSession(false);
      }
    };

    if (users.length > 0) {
      verifySavedSession();
    } else {
      setLoadingSession(false);
    }
  }, [users]);

  const logout = async () => {
    try {
      await clearSession();
      setCurrentUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const addUser = async (userData: Omit<User, 'id'>) => {
    const newId = `u${Date.now()}`;
    let photoUrl = userData.photo || `https://i.pravatar.cc/150?u=${Date.now()}`;

    // 1. Si la foto es local (ej. empieza con 'file://' o 'content://' o '/'), la subimos a la MAC
    if (photoUrl && (photoUrl.startsWith('file://') || photoUrl.startsWith('content://') || photoUrl.startsWith('/'))) {
      try {
        console.log(`Uploading new user profile image: ${photoUrl}`);
        photoUrl = await uploadPhotoApi(photoUrl);
        console.log(`Profile photo uploaded successfully, URL: ${photoUrl}`);
      } catch (err) {
        console.error('Error uploading user profile photo:', err);
      }
    }

    const newUser = {
      ...userData,
      id: newId,
      photo: photoUrl,
    };

    setUsers(prev => [...prev, newUser]);

    if (isApiConnected) {
      try {
        await createUser({
          id: newId,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          company: userData.company,
          role: userData.role,
          photo_url: photoUrl,
          status: userData.status || 'Activo',
        });
        console.log(`✅ Nuevo usuario ${newId} guardado en PostgreSQL`);
      } catch (err) {
        console.error('⚠️ Error al crear usuario en la API:', err);
      }
    }
  };

  const updateUser = async (id: string, updatedUser: Partial<User>) => {
    let photoUrl = updatedUser.photo;

    // 1. Si se actualizó la foto y es local, la subimos a la MAC
    if (photoUrl && (photoUrl.startsWith('file://') || photoUrl.startsWith('content://') || photoUrl.startsWith('/'))) {
      try {
        console.log(`Uploading updated profile image: ${photoUrl}`);
        photoUrl = await uploadPhotoApi(photoUrl);
        console.log(`Updated profile photo uploaded successfully, URL: ${photoUrl}`);
      } catch (err) {
        console.error('Error uploading updated profile photo:', err);
      }
    }

    const finalUpdatedUser = {
      ...updatedUser,
      ...(photoUrl ? { photo: photoUrl } : {}),
    };

    // Actualizar estado local
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        const updated = { ...u, ...finalUpdatedUser };
        if (currentUser && currentUser.id === id) {
          setCurrentUser(updated);
        }
        return updated;
      }
      return u;
    }));

    // Sincronizar en PostgreSQL a través de la API
    if (isApiConnected) {
      try {
        // Encontrar los datos actuales del usuario para enviarlos completos al PUT
        const currentData = users.find(u => u.id === id);
        if (currentData) {
          const apiData = {
            name: finalUpdatedUser.name !== undefined ? finalUpdatedUser.name : currentData.name,
            email: finalUpdatedUser.email !== undefined ? finalUpdatedUser.email : currentData.email,
            phone: finalUpdatedUser.phone !== undefined ? finalUpdatedUser.phone : currentData.phone,
            company: finalUpdatedUser.company !== undefined ? finalUpdatedUser.company : currentData.company,
            role: finalUpdatedUser.role !== undefined ? finalUpdatedUser.role : currentData.role,
            photo_url: photoUrl || currentData.photo,
            status: finalUpdatedUser.status !== undefined ? finalUpdatedUser.status : currentData.status,
            latitude: finalUpdatedUser.latitude !== undefined ? finalUpdatedUser.latitude : currentData.latitude,
            longitude: finalUpdatedUser.longitude !== undefined ? finalUpdatedUser.longitude : currentData.longitude,
          };
          await updateUserApi(id, apiData);
          console.log(`✅ Usuario ${id} actualizado en PostgreSQL`);
        }
      } catch (err) {
        console.error('⚠️ Error al actualizar usuario en la API:', err);
      }
    }
  };

  const setCurrentUserRole = (role: UserRole) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, role });
    }
  };

  // ── addPlanning: crea en estado local Y sincroniza con API ─
  const addPlanning = async (planningData: Omit<Planning, 'id' | 'details'>) => {
    const newId = `p${Date.now()}`;
    const newPlanning: Planning = {
      ...planningData,
      id: newId,
      details: { spliceCapacity: '', photos: [] },
    };

    // Actualizar estado local inmediatamente (UX responsive)
    setPlannings(prev => [...prev, newPlanning]);

    // Crear notificación local para pruebas instantáneas u offline
    const site = sites.find(s => s.id === planningData.siteId);
    if (site && planningData.workerId) {
      let dateStr = '';
      if (planningData.date) {
        const parts = planningData.date.split('-');
        if (parts.length === 3) {
          dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else {
          dateStr = planningData.date;
        }
      }
      const localNotif: AppNotification = {
        id: Date.now(),
        worker_id: planningData.workerId,
        type: 'planning_created',
        message: `Se te asignado la ejecución del sitio: ${site.code} - ${site.name} para el día ${dateStr}`,
        is_read: false,
        planning_id: newId,
        created_at: new Date().toISOString(),
        site_id: site.id,
        site_code: site.code,
        site_name: site.name,
      };
      if (currentUser && currentUser.id === planningData.workerId) {
        setNotifications(prev => [localNotif, ...prev]);
      }
    }

    // Sincronizar con API en segundo plano
    if (isApiConnected) {
      try {
        await createPlanningApi({
          id:             newId,
          site_id:        planningData.siteId,
          worker_id:      planningData.workerId,
          status:         planningData.status || 'Planificado',
          scheduled_date: planningData.date,
          created_by:     currentUser?.id,
        });
        console.log(`✅ Planificación ${newId} sincronizada con PostgreSQL`);
      } catch (error) {
        console.log('⚠️ Error sincronizando planificación con API:', error);
      }
    }
  };

  // ── updatePlanning: actualiza local Y sincroniza con API ──
  const updatePlanning = async (id: string, updatedData: Partial<Planning>) => {
    const oldPl = plannings.find(p => p.id === id);
    setPlannings(prev => prev.map(p => (p.id === id ? { ...p, ...updatedData } : p)));

    // Crear notificación local para pruebas instantáneas u offline si es reapertura o reasignación
    if (oldPl) {
      const statusVal = updatedData.status;
      const workerIdVal = updatedData.workerId;
      const isReopened = oldPl.status === 'Ejecutado' && (statusVal === 'Planificado' || statusVal === 'En ejecución');
      const isNewAssignment = workerIdVal && oldPl.workerId !== workerIdVal;

      if (isReopened || isNewAssignment) {
        const targetWorkerId = workerIdVal || oldPl.workerId;
        const site = sites.find(s => s.id === oldPl.siteId);
        const finalDate = updatedData.date || oldPl.date;
        let dateStr = '';
        if (finalDate) {
          const parts = finalDate.split('-');
          if (parts.length === 3) {
            dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
          } else {
            dateStr = finalDate;
          }
        }
        if (targetWorkerId && site) {
          const localNotif: AppNotification = {
            id: Date.now(),
            worker_id: targetWorkerId,
            type: isReopened ? 'planning_reopened' : 'planning_created',
            message: isReopened 
              ? `Se te ha reabierto la ejecución del sitio: ${site.code} - ${site.name} para el día ${dateStr}`
              : `Se te asignado la ejecución del sitio: ${site.code} - ${site.name} para el día ${dateStr}`,
            is_read: false,
            planning_id: id,
            created_at: new Date().toISOString(),
            site_id: site.id,
            site_code: site.code,
            site_name: site.name,
          };
          if (currentUser && currentUser.id === targetWorkerId) {
            setNotifications(prev => [localNotif, ...prev]);
          }
        }
      }

      // Si cambia a Ejecutado (finalizado), notificar a Coordinadores y Administradores en offline/local
      const isExecuted = oldPl.status !== 'Ejecutado' && statusVal === 'Ejecutado';
      if (isExecuted) {
        const site = sites.find(s => s.id === oldPl.siteId);
        const worker = users.find(u => u.id === oldPl.workerId);
        const workerName = worker ? worker.name : 'Técnico';
        const finalDate = updatedData.date || oldPl.date;
        let dateStr = '';
        if (finalDate) {
          const parts = finalDate.split('-');
          if (parts.length === 3) {
            dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
          } else {
            dateStr = finalDate;
          }
        }
        const nowTime = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

        if (site) {
          const adminsAndCoords = users.filter(u => u.role === 'Coordinador' || u.role === 'Administrador');
          adminsAndCoords.forEach(adm => {
            const localNotif: AppNotification = {
              id: Date.now() + Math.random(),
              worker_id: adm.id,
              type: 'planning_executed',
              message: `Sitio ${site.code} - ${site.name} finalizado el ${dateStr} a las ${nowTime} por ${workerName}`,
              is_read: false,
              planning_id: id,
              created_at: new Date().toISOString(),
              site_id: site.id,
              site_code: site.code,
              site_name: site.name,
            };
            if (currentUser && currentUser.id === adm.id) {
              setNotifications(prev => [localNotif, ...prev]);
            }
          });
        }
      }
    }

    // Sincronizar todos los cambios con la API
    if (isApiConnected) {
      try {
        await updatePlanningApi(id, updatedData);
        console.log(`✅ Planificación ${id} sincronizada en PostgreSQL`);
      } catch (error) {
        console.log('⚠️ Error sincronizando planificación en API:', error);
        setUnsyncedPlannings(prev => prev.includes(id) ? prev : [...prev, id]);
      }
    } else {
      setUnsyncedPlannings(prev => prev.includes(id) ? prev : [...prev, id]);
    }
  };

  const updateSite = (id: string, updatedData: Partial<Site>) => {
    setSites(prev => prev.map(s => (s.id === id ? { ...s, ...updatedData } : s)));
  };

  const fetchAndSyncPlanning = async (id: string): Promise<Planning | null> => {
    try {
      const apiPl = await getPlanningDetail(id);
      const adapted = adaptApiPlanning(apiPl);
      setPlannings(prev => {
        const exists = prev.some(p => p.id === id);
        if (exists) {
          return prev.map(p => (p.id === id ? adapted : p));
        } else {
          return [...prev, adapted];
        }
      });
      return adapted;
    } catch (error) {
      console.error('Error fetching planning detail:', error);
      return null;
    }
  };

  const updateUserLocation = async (id: string, latitude: number, longitude: number) => {
    // 1. Actualizar estado local
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, latitude, longitude } : u)));

    // 2. Enviar a la API si está conectada
    if (isApiConnected) {
      try {
        await updateUserLocationApi(id, latitude, longitude);
        console.log(`📍 Ubicación del usuario ${id} actualizada en PostgreSQL`);
      } catch (error) {
        console.warn(`⚠️ Error al guardar ubicación del usuario ${id} en API:`, error);
      }
    }
  };

  const fetchNotifications = async () => {
    if (!currentUser || !isApiConnected) return;
    try {
      const res = await getNotificationsApi(currentUser.id);
      const newNotifs = Array.isArray(res) 
        ? res 
        : (res && res.success && Array.isArray(res.data) ? res.data : []);

      isInitialLoadRef.current = false;
      setNotifications(newNotifs);
    } catch (err) {
      console.warn('⚠️ Error al obtener notificaciones:', err);
    }
  };

  const markNotificationAsRead = async (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    if (isApiConnected) {
      try {
        await markNotificationAsReadApi(id);
      } catch (err) {
        console.warn('⚠️ Error al marcar notificación como leída:', err);
      }
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!currentUser) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    if (isApiConnected) {
      try {
        await markAllNotificationsAsReadApi(currentUser.id);
      } catch (err) {
        console.warn('⚠️ Error al marcar todas las notificaciones como leídas:', err);
      }
    }
  };

  const deleteNotification = async (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (isApiConnected) {
      try {
        await deleteNotificationApi(id);
      } catch (err) {
        console.warn('⚠️ Error al eliminar notificación:', err);
      }
    }
  };

  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;

  const prevNotificationsRef = useRef<AppNotification[]>([]);

  // Sonar campana al recibir cualquier notificación nueva y no leída (online y offline)
  useEffect(() => {
    if (isInitialLoadRef.current) {
      prevNotificationsRef.current = notifications;
      return;
    }

    const prevIds = new Set(prevNotificationsRef.current.map(n => n.id));
    const hasNewUnread = notifications.some(n => !n.is_read && !prevIds.has(n.id));

    if (hasNewUnread) {
      console.log('🔊 Nueva notificación detectada, reproduciendo sonido...');
      playNotificationSound();
    }

    prevNotificationsRef.current = notifications;
  }, [notifications]);

  // Polling de Notificaciones para todos los roles (cada 30s)
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    if (!isApiConnected) return;

    fetchNotifications();

    const intervalId = setInterval(fetchNotifications, 30000); // 30 segundos
    return () => clearInterval(intervalId);
  }, [currentUser?.id, isApiConnected]);

  return (
    <AppContext.Provider value={{
      users,
      sites,
      plannings,
      currentUser,
      setCurrentUser,
      loadingSession,
      isApiConnected,
      logout,
      addUser,
      updateUser,
      setCurrentUserRole,
      addPlanning,
      updatePlanning,
      updateSite,
      fetchAndSyncPlanning,
      updateUserLocation,
      notifications,
      unreadNotificationsCount,
      fetchNotifications,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      deleteNotification,
    }}>
      {children}
    </AppContext.Provider>
  );
};
