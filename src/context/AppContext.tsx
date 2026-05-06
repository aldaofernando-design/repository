import React, { createContext, useState, ReactNode } from 'react';
import { users as initialUsers, sites as initialSites, plannings as initialPlannings } from '../data/mockData';

export type UserRole = 'Administrador' | 'Coordinador' | 'Trabajador';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  photo: string;
}

export interface Site {
  id: string;
  code: string;
  name: string;
  address: string;
  commune: string;
  lat: number;
  lng: number;
}

export interface Planning {
  id: string;
  siteId: string;
  workerId: string;
  date: string;
  status: string;
  startTime?: string;
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
  };
}

interface AppContextType {
  users: User[];
  sites: Site[];
  plannings: Planning[];
  currentUser: User;
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, updatedUser: Partial<User>) => void;
  setCurrentUserRole: (role: UserRole) => void;
  addPlanning: (planning: Omit<Planning, 'id' | 'details'>) => void;
  updatePlanning: (id: string, updatedData: Partial<Planning>) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [sites, setSites] = useState<Site[]>(initialSites);
  const [plannings, setPlannings] = useState<Planning[]>(initialPlannings);
  
  // Simulamos que el usuario actual es María González (Coordinador)
  const [currentUser, setCurrentUser] = useState<User>(initialUsers[1]);

  const addUser = (userData: Omit<User, 'id'>) => {
    const newUser = {
      ...userData,
      id: `u${Date.now()}`,
      photo: userData.photo || `https://i.pravatar.cc/150?u=${Date.now()}`,
    };
    setUsers([...users, newUser]);
  };

  const updateUser = (id: string, updatedUser: Partial<User>) => {
    setUsers(users.map(u => (u.id === id ? { ...u, ...updatedUser } : u)));
  };

  const setCurrentUserRole = (role: UserRole) => {
    setCurrentUser({ ...currentUser, role });
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
    setPlannings(plannings.map(p => (p.id === id ? { ...p, ...updatedData } : p)));
  };

  return (
    <AppContext.Provider value={{ users, sites, plannings, currentUser, addUser, updateUser, setCurrentUserRole, addPlanning, updatePlanning }}>
      {children}
    </AppContext.Provider>
  );
};
