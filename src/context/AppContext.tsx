import React, { createContext, useState, ReactNode, useEffect } from 'react';
import { Alert } from 'react-native';
import { users as initialUsers, sites as initialSites, plannings as initialPlannings } from '../data/mockData';
import { getSession, clearSession, saveSession } from '../utils/sessionHelper';

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
    fotoEstructura?: string; // obligatoria si selecciona tipoEstructura
    tipoContenedor: string;
    fotoFueraContenedor?: string; // obligatoria si selecciona tipoContenedor
    fotosGeneralesSitio?: string[]; // 2 fotos obligatorias si selecciona tipoContenedor
    fotosInteriorContenedor?: string[]; // 2 fotos obligatorias si selecciona tipoContenedor
    tipoEmpalme: string;
    fotosEmpalme: string[];   // 1 si mono, 3 si trifasico (Consumo Inicial)
    capacidadProteccion: string;
    fotoMedidor: string;
    fotoSectorMedidor: string;
    numeroMedidor: string;
    lecturaConsumo: string;
    ampereEmpalme?: string[];
  };
  apagado3G?: {
    estado3G: string; // Encendido, Apagado, N/A
    seApagara3G: string; // Si, No, N/A (oculto en UI)
    fotoEquipo3GEncendido?: string;
    fotoBreaker3GEncendido?: string;
    fotoBreaker3GApagado?: string;
    fotoEquipo3GApagado?: string;
    fotoEspacioRetirado?: string;
    seRetirara3G?: string; // Si, No (para cuando el estado inicial es Apagado)
    estadoRRU: string; // Encendido, Apagado, N/A
    seApagaraRRU: string; // Si, No, N/A
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
    estadoBasebandSector1: string; // 'Encendido' | 'Apagado' | 'N/A'
    fotoBreakerBaseband1Encendido?: string;
    fotoBaseband1Encendida?: string;
    confirmadoApagadoRetirar?: boolean;
    fotoBreakerBaseband1Apagado?: string;
    fotoEspacioBaseband1Retirada?: string;
    fotosConsumoFinal?: string[];
    ampereConsumoFinal?: string[];
  };
  apagadoBafiSector2?: {
    estadoBasebandSector2: string; // 'Encendido' | 'Apagado' | 'N/A'
    fotoBreakerBaseband2Encendido?: string;
    fotoBaseband2Encendida?: string;
    confirmadoApagadoRetirar?: boolean;
    fotoBreakerBaseband2Apagado?: string;
    fotoEspacioBaseband2Retirada?: string;
    fotosConsumoFinal?: string[];
    ampereConsumoFinal?: string[];
  };
  apagadoBafiSector3?: {
    estadoBasebandSector3: string; // 'Encendido' | 'Apagado' | 'N/A'
    fotoBreakerBaseband3Encendido?: string;
    fotoBaseband3Encendida?: string;
    confirmadoApagadoRetirar?: boolean;
    fotoBreakerBaseband3Apagado?: string;
    fotoEspacioBaseband3Retirada?: string;
    fotosConsumoFinal?: string[];
    ampereConsumoFinal?: string[];
  };
  apagadoAntenaSector1?: {
    estadoAntenaSector1: string; // 'Encendida' | 'Apagada' | 'N/A'
    fotoBreakerAntenaS1Encendido?: string;
    seApagaraAntenaS1?: string; // 'Si' | 'No'
    fotoBreakerAntenaS1Apagado?: string;
    fotosConsumoFinal?: string[];
    ampereConsumoFinal?: string[];
  };
  apagadoAntenaSector2?: {
    estadoAntenaSector2: string; // 'Encendida' | 'Apagada' | 'N/A'
    fotoBreakerAntenaS2Encendido?: string;
    seApagaraAntenaS2?: string; // 'Si' | 'No'
    fotoBreakerAntenaS2Apagado?: string;
    fotosConsumoFinal?: string[];
    ampereConsumoFinal?: string[];
  };
  apagadoAntenaSector3?: {
    estadoAntenaSector3: string; // 'Encendida' | 'Apagada' | 'N/A'
    fotoBreakerAntenaS3Encendido?: string;
    seApagaraAntenaS3?: string; // 'Si' | 'No'
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
  logout: () => void;
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, updatedUser: Partial<User>) => void;
  setCurrentUserRole: (role: UserRole) => void;
  addPlanning: (planning: Omit<Planning, 'id' | 'details'>) => void;
  updatePlanning: (id: string, updatedData: Partial<Planning>) => void;
  updateSite: (id: string, updatedData: Partial<Site>) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(initialUsers as User[]);
  const [sites, setSites] = useState<Site[]>(initialSites);
  const [plannings, setPlannings] = useState<Planning[]>(initialPlannings);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Regla para posponer automáticamente planificaciones pasadas no iniciadas
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

  // Verificar la sesión guardada y aplicar expiración de 15 días
  useEffect(() => {
    const verifySavedSession = async () => {
      try {
        // Lanzar la aplicación como Diego Quezada (u6) por defecto
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

  const addPlanning = (planningData: Omit<Planning, 'id' | 'details'>) => {
    const newPlanning: Planning = {
      ...planningData,
      id: `p${Date.now()}`,
      details: {
        spliceCapacity: '',
        photos: []
      }
    };
    setPlannings([...plannings, newPlanning]);
  };

  const updatePlanning = (id: string, updatedData: Partial<Planning>) => {
    setPlannings(prev => prev.map(p => (p.id === id ? { ...p, ...updatedData } : p)));
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
      logout, 
      addUser, 
      updateUser, 
      setCurrentUserRole, 
      addPlanning, 
      updatePlanning, 
      updateSite 
    }}>
      {children}
    </AppContext.Provider>
  );
};
