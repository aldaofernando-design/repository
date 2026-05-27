import { Image } from 'react-native';
import { sitesData } from './sitesData';

export const users = [
  {
    "id": "u1",
    "name": "Fernando Aldao",
    "email": "fernando.aldao@f1.services",
    "phone": "+56957897940",
    "company": "F1+",
    "role": "Coordinador",
    "photo": "http://192.168.1.84:3001/uploads/profile-u1.jpeg",
    "status": "Activo"
  },
  {
    "id": "u2",
    "name": "Pablo Aldao",
    "email": "pablo.aldao@f1.services",
    "phone": "+56952088550",
    "company": "F1+",
    "role": "Coordinador",
    "photo": "http://192.168.1.84:3001/uploads/profile-u2.png",
    "status": "Activo"
  },
  {
    "id": "u3",
    "name": "Constanza López",
    "email": "constanza.lopez@f1.services",
    "phone": "+56990706065",
    "company": "F1+",
    "role": "Coordinador",
    "photo": "http://192.168.1.84:3001/uploads/profile-u3.jpg",
    "status": "Activo"
  },
  {
    "id": "u4",
    "name": "Fabian Alister",
    "email": "fabian.alister@f1.services",
    "phone": "+56942435736",
    "company": "F1+",
    "role": "Coordinador",
    "photo": "http://192.168.1.84:3001/uploads/profile-u4.jpg",
    "status": "Activo"
  },
  {
    "id": "u5",
    "name": "Claudio Cantillana",
    "email": "claudio.cantillana@f1.services",
    "phone": "+56944455892",
    "company": "F1+",
    "role": "Coordinador",
    "photo": "http://192.168.1.84:3001/uploads/profile-u5.png",
    "status": "Activo"
  },
  {
    "id": "u6",
    "name": "Rocio Soto",
    "email": "rocio.soto@f1.services",
    "phone": "+56942435589",
    "company": "F1+",
    "role": "Coordinador",
    "photo": "http://192.168.1.84:3001/uploads/profile-u6.jpeg",
    "status": "Activo"
  },
  {
    "id": "u7",
    "name": "Gian Ferrer",
    "email": "gian.ferrer@f1.services",
    "phone": "+56942604319",
    "company": "F1+",
    "role": "Coordinador",
    "photo": "http://192.168.1.84:3001/uploads/profile-u7.jpg",
    "status": "Activo"
  },
  {
    "id": "u8",
    "name": "Daniel Molina",
    "email": "daniel.molina@teamf1services.com",
    "phone": "+56965003316",
    "company": "F1+",
    "role": "Trabajador",
    "photo": "http://192.168.1.84:3001/uploads/profile-u8.jpg",
    "status": "Activo"
  },
  {
    "id": "u9",
    "name": "Diego Quezada",
    "email": "diego.quezada@f1.services",
    "phone": "+56934211740",
    "company": "F1+",
    "role": "Trabajador",
    "photo": "http://192.168.1.84:3001/uploads/profile-u9.jpg",
    "status": "Activo"
  },
  {
    "id": "u10",
    "name": "Felipe Antipan",
    "email": "felipe.antipan@teamf1services.com",
    "phone": "+56984493478",
    "company": "F1+",
    "role": "Trabajador",
    "photo": "http://192.168.1.84:3001/uploads/profile-u10.jpeg",
    "status": "Activo"
  },
  {
    "id": "u11",
    "name": "Francisco Montenegro",
    "email": "francisco.montenegro@teamf1services.com",
    "phone": "+56966770631",
    "company": "F1+",
    "role": "Trabajador",
    "photo": "http://192.168.1.84:3001/uploads/profile-u11.png",
    "status": "Activo"
  },
  {
    "id": "u12",
    "name": "Francisco Solis",
    "email": "francisco.solis@teamf1services.com",
    "phone": "+56934410674",
    "company": "F1+",
    "role": "Trabajador",
    "photo": "http://192.168.1.84:3001/uploads/profile-u12.jpg",
    "status": "Activo"
  },
  {
    "id": "u13",
    "name": "German Contreras",
    "email": "german.contreras@teamf1services.com",
    "phone": "+56928764151",
    "company": "F1+",
    "role": "Trabajador",
    "photo": "http://192.168.1.84:3001/uploads/profile-u13.jpg",
    "status": "Activo"
  },
  {
    "id": "u14",
    "name": "Gonzalo Roco",
    "email": "gonzalo.roco@teamf1services.com",
    "phone": "+56932470395",
    "company": "F1+",
    "role": "Trabajador",
    "photo": "http://192.168.1.84:3001/uploads/profile-u14.png",
    "status": "Activo"
  },
  {
    "id": "u15",
    "name": "Hector Tovar",
    "email": "hector.tovar@teamf1services.com",
    "phone": "+56933725784",
    "company": "F1+",
    "role": "Trabajador",
    "photo": "http://192.168.1.84:3001/uploads/profile-u15.jpg",
    "status": "Activo"
  },
  {
    "id": "u16",
    "name": "Israel Tapia",
    "email": "israel.tapia@teamf1services.com",
    "phone": "+56942959732",
    "company": "F1+",
    "role": "Trabajador",
    "photo": "http://192.168.1.84:3001/uploads/profile-u16.jpeg",
    "status": "Activo"
  },
  {
    "id": "u17",
    "name": "Juan Norambuena",
    "email": "juan.norambuena@teamf1services.com",
    "phone": "+56952279395",
    "company": "F1+",
    "role": "Trabajador",
    "photo": "http://192.168.1.84:3001/uploads/profile-u17.jpeg",
    "status": "Activo"
  },
  {
    "id": "u18",
    "name": "Luis Almendras",
    "email": "luis.almendras@teamf1services.com",
    "phone": "+56965999638",
    "company": "F1+",
    "role": "Trabajador",
    "photo": "http://192.168.1.84:3001/uploads/profile-u18.png",
    "status": "Activo"
  },
  {
    "id": "u19",
    "name": "Luis Baeza",
    "email": "luis.baeza@teamf1services.com",
    "phone": "+56938618883",
    "company": "F1+",
    "role": "Trabajador",
    "photo": "http://192.168.1.84:3001/uploads/profile-u19.jpg",
    "status": "Activo"
  },
  {
    "id": "u20",
    "name": "Marcelo Ramirez",
    "email": "marcelo.ramirez@teamf1services.com",
    "phone": "+56981563165",
    "company": "F1+",
    "role": "Trabajador",
    "photo": "http://192.168.1.84:3001/uploads/profile-u20.png",
    "status": "Activo"
  },
  {
    "id": "u21",
    "name": "Raymond Rubio",
    "email": "raymond.rubio@teamf1services.com",
    "phone": "+56934410692",
    "company": "F1+",
    "role": "Trabajador",
    "photo": "http://192.168.1.84:3001/uploads/profile-u21.png",
    "status": "Activo"
  },
  {
    "id": "u22",
    "name": "Sebastian Donoso",
    "email": "sebastian.donoso@teamf1services.com",
    "phone": "+56944961965",
    "company": "F1+",
    "role": "Trabajador",
    "photo": "http://192.168.1.84:3001/uploads/profile-u22.jpeg",
    "status": "Activo"
  },
  {
    "id": "u23",
    "name": "Victor Segura",
    "email": "victor.segura@teamf1services.com",
    "phone": "+56940465681",
    "company": "F1+",
    "role": "Trabajador",
    "photo": "http://192.168.1.84:3001/uploads/profile-u23.png",
    "status": "Activo"
  }
];

export const sites = sitesData;

export const plannings = [];

export const chartData = {
  labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
  planned: [0, 0, 0, 0, 0, 0, 0],
  executed: [0, 0, 0, 0, 0, 0, 0]
};
