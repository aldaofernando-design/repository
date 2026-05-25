import { Image } from 'react-native';
import { sitesData } from './sitesData';

export const users = [
  {
    id: 'u1',
    name: 'Juan Pérez',
    email: 'juan.perez@empresa.com',
    phone: '+56 9 1234 5678',
    company: 'TechCorp',
    role: 'Administrador',
    photo: 'https://i.pravatar.cc/150?u=u1',
    status: 'Activo',
  },
  {
    id: 'u2',
    name: 'María González',
    email: 'maria.g@empresa.com',
    phone: '+56 9 8765 4321',
    company: 'TechCorp',
    role: 'Coordinador',
    photo: 'https://i.pravatar.cc/150?u=u2',
    status: 'Activo',
  },
  {
    id: 'u3',
    name: 'Carlos Silva',
    email: 'carlos.s@empresa.com',
    phone: '+56 9 1122 3344',
    company: 'Contratistas Ltda',
    role: 'Trabajador',
    photo: 'https://i.pravatar.cc/150?u=u3',
    status: 'Activo',
  },
  {
    id: 'u4',
    name: 'Ana López',
    email: 'ana.lopez@empresa.com',
    phone: '+56 9 4433 2211',
    company: 'Contratistas Ltda',
    role: 'Trabajador',
    photo: 'https://i.pravatar.cc/150?u=u4',
    status: 'Activo',
  },
  {
    id: 'u5',
    name: 'Fernando Aldao',
    email: 'aldao.fernando@gmail.com',
    phone: '+56957897940',
    company: 'F1+',
    role: 'Coordinador',
    photo: Image.resolveAssetSource(require('../../assets/fernando_aldao.jpg')).uri,
    status: 'Activo',
  },
  {
    id: 'u6',
    name: 'Diego Quezada',
    email: 'diego.quezada@f1.services',
    phone: '+56934211740',
    company: 'F1+',
    role: 'Trabajador',
    photo: Image.resolveAssetSource(require('../../assets/diego_quezada.jpg')).uri,
    status: 'Activo',
  },
];

export const sites = sitesData;



// Simulamos que el s1 está planificado para hoy, y el s2 en ejecución.
export const plannings = [
  {
    id: 'p1',
    siteId: 'SA812',
    workerId: 'u3',
    date: '2026-05-18', // Fecha actualizada a hoy
    status: 'En ejecución',
    startTime: '2026-05-18T10:00:00.000Z',
    details: { spliceCapacity: '', photos: [] }
  },
  {
    id: 'p2',
    siteId: 'SA241',
    workerId: 'u3',
    date: '2026-05-11',
    status: 'Ejecutado',
    endTime: '2026-05-13T21:15:00.000Z',
    startTime: '2026-05-13T21:00:00.000Z',
    details: { spliceCapacity: '', photos: [] },
    hallazgos: {
      observaciones: 'Todo en orden, sin hallazgos críticos.',
      fotos: ['https://picsum.photos/id/10/400/300']
    },
    datosGenerales: {
      tipoEstructura: 'Ventilada',
      fotoEstructura: 'https://picsum.photos/id/11/400/300',
      tipoContenedor: 'Baterías Internas',
      fotoFueraContenedor: 'https://picsum.photos/id/12/400/300',
      fotosGeneralesSitio: ['https://picsum.photos/id/13/400/300', 'https://picsum.photos/id/14/400/300'],
      fotosInteriorContenedor: ['https://picsum.photos/id/15/400/300', 'https://picsum.photos/id/16/400/300'],
      tipoEmpalme: 'Trifásico',
      fotosEmpalme: ['https://picsum.photos/id/17/400/300', 'https://picsum.photos/id/18/400/300', 'https://picsum.photos/id/19/400/300'],
      ampereEmpalme: ['12,50', '13,20', '12,80'],
      capacidadProteccion: '40A',
      fotoMedidor: 'https://picsum.photos/id/20/400/300',
      fotoSectorMedidor: 'https://picsum.photos/id/21/400/300',
      numeroMedidor: '88776655',
      lecturaConsumo: '1540.5'
    },
    apagado3G: {
      estado3G: 'Encendido',
      seApagara3G: 'Si',
      fotoEquipo3GEncendido: 'https://picsum.photos/id/22/400/300',
      fotoBreaker3GEncendido: 'https://picsum.photos/id/23/400/300',
      fotoBreaker3GApagado: 'https://picsum.photos/id/24/400/300',
      fotoEquipo3GApagado: 'https://picsum.photos/id/25/400/300',
      fotoEspacioRetirado: 'https://picsum.photos/id/26/400/300',
      seRetirara3G: 'Si',
      estadoRRU: 'Encendido',
      seApagaraRRU: 'Si',
      fotoRRUEncendido: 'https://picsum.photos/id/27/400/300',
      fotoRRUApagado: 'https://picsum.photos/id/28/400/300'
    }
  },
  {
    id: 'p3',
    siteId: 'RM518',
    workerId: 'u4', // Ana López
    date: '2026-05-19', // Hoy
    status: 'Ejecutado',
    startTime: (() => {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      return d.toISOString();
    })(),
    endTime: (() => {
      const d = new Date();
      d.setHours(12, 41, 0, 0);
      return d.toISOString();
    })(),
    details: { spliceCapacity: '', photos: [] }
  },
  {
    id: 'p4',
    siteId: 'RM518',
    workerId: 'u3',
    date: '2026-05-12',
    status: 'Planificado',
    details: { spliceCapacity: '', photos: [] }
  },
  {
    id: 'p5',
    siteId: 'RS153',
    workerId: 'u3',
    date: '2026-05-12',
    status: 'Planificado',
    details: { spliceCapacity: '', photos: [] }
  },
  {
    id: 'p6',
    siteId: 'SA331',
    workerId: 'u3',
    date: '2026-05-12',
    status: 'Planificado',
    details: { spliceCapacity: '', photos: [] }
  },
  {
    id: 'p7',
    siteId: 'SA935',
    workerId: 'u3',
    date: '2026-05-12',
    status: 'Planificado',
    details: { spliceCapacity: '', photos: [] }
  },
  {
    id: 'p8',
    siteId: 'SA288',
    workerId: 'u3',
    date: '2026-05-14',
    status: 'Planificado',
    details: { spliceCapacity: '', photos: [] }
  },
  {
    id: 'p9',
    siteId: 'FG084',
    workerId: 'u3',
    date: '2026-05-14',
    status: 'Planificado',
    details: { spliceCapacity: '', photos: [] }
  },
  {
    id: 'p10',
    siteId: 'RM594',
    workerId: 'u3',
    date: '2026-05-14',
    status: 'Planificado',
    details: { spliceCapacity: '', photos: [] }
  },
  {
    id: 'p11',
    siteId: 'FG085',
    workerId: 'u3',
    date: '2026-05-14',
    status: 'Planificado',
    details: { spliceCapacity: '', photos: [] }
  },
  {
    id: 'p12',
    siteId: 'RS395',
    workerId: 'u3',
    date: '2026-05-13',
    status: 'Planificado',
    details: { spliceCapacity: '', photos: [] }
  },
  {
    id: 'p13',
    siteId: 'RS876',
    workerId: 'u3',
    date: '2026-05-13',
    status: 'Planificado',
    details: { spliceCapacity: '', photos: [] }
  },
  {
    id: 'p14',
    siteId: 'FN698',
    workerId: 'u5',
    date: '2026-05-19', // Hoy
    status: 'En ejecución',
    startTime: (() => {
      const d = new Date();
      d.setHours(12, 31, 0, 0);
      return d.toISOString();
    })(),
    details: { spliceCapacity: '', photos: [] }
  },
  {
    id: 'p15',
    siteId: 'SA920',
    workerId: 'u5',
    date: '2026-05-20', // Mañana
    status: 'Planificado',
    details: { spliceCapacity: '', photos: [] }
  },
  {
    id: 'p16',
    siteId: 'SA792',
    workerId: 'u3',
    date: '2026-05-19',
    status: 'Planificado',
    details: { spliceCapacity: '', photos: [] }
  },
  {
    id: 'p17',
    siteId: 'AS228',
    workerId: 'u4',
    date: '2026-05-19',
    status: 'Planificado',
    details: { spliceCapacity: '', photos: [] }
  },
  {
    id: 'p18',
    siteId: 'RM518',
    workerId: 'u4',
    date: '2026-05-19',
    status: 'Planificado',
    details: { spliceCapacity: '', photos: [] }
  },
  {
    id: 'p19',
    siteId: 'RS153',
    workerId: 'u4',
    date: '2026-05-19',
    status: 'Planificado',
    details: { spliceCapacity: '', photos: [] }
  },
  {
    id: 'p20',
    siteId: 'SA121',
    workerId: 'u5',
    date: '2026-05-21',
    status: 'Planificado',
    details: { spliceCapacity: '', photos: [] }
  },
  {
    id: 'p21',
    siteId: 'AS228',
    workerId: 'u5',
    date: '2026-05-20',
    status: 'Planificado',
    details: { spliceCapacity: '', photos: [] }
  },
  {
    id: 'p22',
    siteId: 'FN707',
    workerId: 'u5',
    date: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(), // Hoy
    status: 'Planificado',
    details: { spliceCapacity: '', photos: [] }
  },
  {
    id: 'p23',
    siteId: 'AM790', // Paradero 29 Reubicación (Apagado BAFI)
    workerId: 'u6', // Diego Quezada
    date: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(), // Hoy
    status: 'Planificado',
    details: { spliceCapacity: '', photos: [] }
  },
  {
    id: 'p24',
    siteId: 'AS070', // Av. España - Batuco (Apagado 3G)
    workerId: 'u6', // Diego Quezada
    date: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(), // Hoy
    status: 'Planificado',
    details: { spliceCapacity: '', photos: [] }
  },
];

export const chartData = {
  labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
  planned: [2, 3, 1, 4, 2, 0, 0],
  executed: [1, 2, 1, 2, 0, 0, 0]
};
