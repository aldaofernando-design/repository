export const users = [
  {
    id: 'u1',
    name: 'Juan Pérez',
    email: 'juan.perez@empresa.com',
    phone: '+56 9 1234 5678',
    company: 'TechCorp',
    role: 'Administrador',
    photo: 'https://i.pravatar.cc/150?u=u1',
  },
  {
    id: 'u2',
    name: 'María González',
    email: 'maria.g@empresa.com',
    phone: '+56 9 8765 4321',
    company: 'TechCorp',
    role: 'Coordinador',
    photo: 'https://i.pravatar.cc/150?u=u2',
  },
  {
    id: 'u3',
    name: 'Carlos Silva',
    email: 'carlos.s@empresa.com',
    phone: '+56 9 1122 3344',
    company: 'Contratistas Ltda',
    role: 'Trabajador',
    photo: 'https://i.pravatar.cc/150?u=u3',
  },
  {
    id: 'u4',
    name: 'Ana López',
    email: 'ana.lopez@empresa.com',
    phone: '+56 9 4433 2211',
    company: 'Contratistas Ltda',
    role: 'Trabajador',
    photo: 'https://i.pravatar.cc/150?u=u4',
  },
];

export const sites = [
  {
    id: 's1',
    code: 'ST-001',
    name: 'Torre Central',
    address: 'Av. Providencia 1234',
    commune: 'Providencia',
    lat: -33.4266,
    lng: -70.6146,
  },
  {
    id: 's2',
    code: 'ST-002',
    name: 'Antena Norte',
    address: 'Av. Recoleta 567',
    commune: 'Recoleta',
    lat: -33.4184,
    lng: -70.6441,
  },
  {
    id: 's3',
    code: 'ST-003',
    name: 'Celda Sur',
    address: 'Gran Avenida 8901',
    commune: 'San Miguel',
    lat: -33.4983,
    lng: -70.6559,
  },
];

// Simulamos que el s1 está planificado para Carlos, y el s2 para Ana.
export const plannings = [
  {
    id: 'p1',
    siteId: 's1',
    workerId: 'u3',
    date: '2026-05-01',
    status: 'Planificado', // Puede ser Planificado o Ejecutado
    details: {
      spliceCapacity: '',
      photos: []
    }
  },
  {
    id: 'p2',
    siteId: 's2',
    workerId: 'u4',
    date: '2026-05-02',
    status: 'Planificado',
    details: {
      spliceCapacity: '',
      photos: []
    }
  },
];

export const chartData = {
  labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
  planned: [2, 3, 1, 4, 2, 0, 0],
  executed: [1, 2, 1, 2, 0, 0, 0]
};
