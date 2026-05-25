import React, { createContext, useState, ReactNode, useEffect } from 'react';
import { Alert } from 'react-native';
import { users as initialUsers, sites as initialSites, plannings as initialPlannings } from '../data/mockData';
import { getSession, clearSession, saveSession } from '../utils/sessionHelper';
import {
  getUsers, getSites, getPlannings,
  createPlanningApi, updatePlanningApi,
  checkApiHealth,
  ApiUser, ApiSite, ApiPlanning,
} from '../services/apiService';

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
  startTime?: string;
  endTime?: string;
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
  };
  apagadoAntenaSector1?: {
    estadoAntenaSector1: string;
    fotoBreakerAntenaS1Encendido?: string;
    seApagaraAntenaS1?: string;
    fotoBreakerAntenaS1Apagado?: string;
    fotosConsumoFinal?: string[];
    ampereConsumoFinal?: string[];
  };
  apagadoAntenaSector2?: {
    estadoAntenaSector2: string;
    fotoBreakerAntenaS2Encendido?: string;
    seApagaraAntenaS2?: string;
    fotoBreakerAntenaS2Apagado?: string;
    fotosConsumoFinal?: string[];
    ampereConsumoFinal?: string[];
  };
  apagadoAntenaSector3?: {
    estadoAntenaSector3: string;
    fotoBreakerAntenaS3Encendido?: string;
    seApagaraAntenaS3?: string;
    fotoBreakerAntenaS3Apagado?: string;
    fotosConsumoFinal?: string[];
    ampereConsumoFinal?: string[];
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
  };
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
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, updatedUser: Partial<User>) => void;
  setCurrentUserRole: (role: UserRole) => void;
  addPlanning: (planning: Omit<Planning, 'id' | 'details'>) => void;
  updatePlanning: (id: string, updatedData: Partial<Planning>) => void;
  updateSite: (id: string, updatedData: Partial<Site>) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

// ── Adaptadores: API → formato interno de la App ─────────────
function adaptApiUser(u: ApiUser): User {
  return {
    id:      u.id,
    name:    u.name,
    email:   u.email,
    phone:   u.phone,
    company: u.company,
    role:    u.role,
    photo:   u.photo_url || `https://i.pravatar.cc/150?u=${u.id}`,
    status:  (u.status as 'Activo' | 'Inactivo') || 'Activo',
  };
}

function adaptApiSite(s: ApiSite): Site {
  return {
    id:          s.id,
    code:        s.code,
    name:        s.name,
    address:     s.address || '',
    commune:     s.commune || '',
    lat:         s.latitude  || 0,
    lng:         s.longitude || 0,
    region:      s.region    || undefined,
    estadoExcel: s.estado_excel,
    proyecto:    s.proyecto,
    apagadoBAFI: s.apagado_bafi ? 'SI' : 'NO',
  };
}

function adaptApiPlanning(p: ApiPlanning): Planning {
  return {
    id:        p.id,
    siteId:    p.site_id,
    workerId:  p.worker_id,
    date:      p.scheduled_date?.split('T')[0] || p.scheduled_date,
    status:    p.status,
    startTime: p.start_time  || undefined,
    endTime:   p.end_time    || undefined,
    details:   { spliceCapacity: '', photos: [] },
  };
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers]       = useState<User[]>(initialUsers as User[]);
  const [sites, setSites]       = useState<Site[]>(initialSites);
  const [plannings, setPlannings] = useState<Planning[]>(initialPlannings);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isApiConnected, setIsApiConnected] = useState(false);

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

  // ── Posponer automáticamente planificaciones pasadas ──────
  useEffect(() => {
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

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

  // ── Sesión automática como Diego Quezada (u6) ─────────────
  useEffect(() => {
    const verifySavedSession = async () => {
      try {
        const matched = users.find(u => u.id === 'u6');
        if (matched) {
          setCurrentUser(matched);
          await saveSession(matched.id);
        }
      } catch (error) {
        console.error('Error verifying session:', error);
      } finally {
        setLoadingSession(false);
      }
    };

    verifySavedSession();
  }, [users]);

  const logout = async () => {
    try {
      await clearSession();
      setCurrentUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const addUser = (userData: Omit<User, 'id'>) => {
    const newUser = {
      ...userData,
      id: `u${Date.now()}`,
      photo: userData.photo || `https://i.pravatar.cc/150?u=${Date.now()}`,
    };
    setUsers([...users, newUser]);
  };

  const updateUser = (id: string, updatedUser: Partial<User>) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        const updated = { ...u, ...updatedUser };
        if (currentUser && currentUser.id === id) {
          setCurrentUser(updated);
        }
        return updated;
      }
      return u;
    }));
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
    setPlannings(prev => prev.map(p => (p.id === id ? { ...p, ...updatedData } : p)));

    // Sincronizar cambios de estado/tiempo con la API
    if (isApiConnected && (updatedData.status || updatedData.startTime || updatedData.endTime)) {
      try {
        await updatePlanningApi(id, {
          status:     updatedData.status,
          start_time: updatedData.startTime || null,
          end_time:   updatedData.endTime   || null,
        });
        console.log(`✅ Planificación ${id} actualizada en PostgreSQL`);
      } catch (error) {
        console.log('⚠️ Error actualizando planificación en API:', error);
      }
    }
  };

  const updateSite = (id: string, updatedData: Partial<Site>) => {
    setSites(prev => prev.map(s => (s.id === id ? { ...s, ...updatedData } : s)));
  };

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
    }}>
      {children}
    </AppContext.Provider>
  );
};
