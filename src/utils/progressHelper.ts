import { Planning, Site } from '../context/AppContext';

export const calculatePlanningProgress = (planning: Planning | undefined, site: Site | undefined): number => {
  if (!planning) return 0;
  const isIloq = site?.proyecto === 'iLOQ';

  const calculateDatosProgress = () => {
    const dg = planning.datosGenerales;
    if (!dg) return 0;
    const totalFields = dg.tipoEmpalme === 'Trifásico' ? 17 : 15;
    let completedFields = 0;
    if (dg.tipoEstructura) completedFields++;
    if (dg.fotoEstructura) completedFields++;
    if (dg.tipoContenedor) completedFields++;
    if (dg.fotoFueraContenedor) completedFields++;
    if (dg.fotosGeneralesSitio && dg.fotosGeneralesSitio[0]) completedFields++;
    if (dg.fotosGeneralesSitio && dg.fotosGeneralesSitio[1]) completedFields++;
    if (dg.fotosInteriorContenedor && dg.fotosInteriorContenedor[0]) completedFields++;
    if (dg.fotosInteriorContenedor && dg.fotosInteriorContenedor[1]) completedFields++;
    if (dg.tipoEmpalme) completedFields++;
    if (dg.capacidadProteccion) completedFields++;
    if (dg.fotoMedidor) completedFields++;
    if (dg.fotoSectorMedidor) completedFields++;
    if (dg.numeroMedidor) completedFields++;
    if (dg.lecturaConsumo) completedFields++;
    
    if (dg.tipoEmpalme === 'Monofásico') {
      if (dg.fotosEmpalme && dg.fotosEmpalme[0]) completedFields++;
    } else if (dg.tipoEmpalme === 'Trifásico') {
      if (dg.fotosEmpalme && dg.fotosEmpalme[0]) completedFields++;
      if (dg.fotosEmpalme && dg.fotosEmpalme[1]) completedFields++;
      if (dg.fotosEmpalme && dg.fotosEmpalme[2]) completedFields++;
    }
    return Math.round((completedFields / totalFields) * 100);
  };

  const calculateChapaProgress = () => {
    const cc = planning.cambioChapa;
    if (!cc) return 0;
    let total = 8;
    let completed = 0;
    if (cc.tipoChapa) completed++;
    if (cc.nroSerie && cc.nroSerie.trim()) completed++;
    if (cc.estadoInicial) completed++;
    if (cc.fotoChapaAnterior) completed++;
    if (cc.fotoNuevaChapa) completed++;
    if (cc.fotoLlaveProgramacion) completed++;
    if (cc.fotoPuertaCerrada) completed++;
    if (cc.estadoFinal) completed++;
    return Math.round((completed / total) * 100);
  };

  const calculateApagadoProgress = () => {
    const apagado = planning.apagado3G;
    if (!apagado) return 0;
    const is3GCompleted = (() => {
      const estado3G = apagado.estado3G;
      if (estado3G === 'Encendido') {
        if (!apagado.fotoEquipo3GEncendido || !apagado.fotoBreaker3GEncendido || !apagado.seApagara3G) return false;
        if (apagado.seApagara3G === 'Si' && (!apagado.fotoBreaker3GApagado || !apagado.fotoEquipo3GApagado || !apagado.fotoEspacioRetirado)) return false;
        return true;
      }
      if (estado3G === 'Apagado') {
        if (!apagado.seRetirara3G) return false;
        if (apagado.seRetirara3G === 'Si' && (!apagado.fotoBreaker3GApagado || !apagado.fotoEquipo3GApagado || !apagado.fotoEspacioRetirado)) return false;
        return true;
      }
      if (estado3G === 'N/A') return !!apagado.fotoEspacioRetirado;
      return false;
    })();

    const isRRUCompleted = (() => {
      const estadoRRU = apagado.estadoRRU;
      if (estadoRRU === 'Encendido') {
        if (!apagado.fotoRRUEncendido || !apagado.seApagaraRRU) return false;
        if (apagado.seApagaraRRU === 'Si' && !apagado.fotoRRUApagado) return false;
        return true;
      }
      if (estadoRRU === 'Apagado') return !!apagado.fotoRRUApagado;
      if (estadoRRU === 'N/A') return true;
      return false;
    })();

    let completedCount = 0;
    if (is3GCompleted) completedCount++;
    if (isRRUCompleted && is3GCompleted) completedCount++;
    return Math.round((completedCount / 2) * 100);
  };

  const calculateBafiSector1Progress = () => {
    const bafi = planning.apagadoBafiSector1;
    if (!bafi) return 0;
    const estado = bafi.estadoBasebandSector1;
    const tipoEmpalme = planning.datosGenerales?.tipoEmpalme;
    const isTrifasico = tipoEmpalme === 'Trifásico';

    if (estado === 'Encendido') {
      const total = isTrifasico ? 10 : 6;
      let completed = 0;
      if (bafi.fotoBreakerBaseband1Encendido) completed++;
      if (bafi.fotoBaseband1Encendida) completed++;
      if (bafi.fotoBreakerBaseband1Apagado) completed++;
      if (bafi.fotoEspacioBaseband1Retirada) completed++;
      
      const cf = bafi.fotosConsumoFinal || [];
      const am = bafi.ampereConsumoFinal || [];
      if (isTrifasico) {
        if (cf[0]) completed++;
        if (cf[1]) completed++;
        if (cf[2]) completed++;
        if (am[0] && am[0] !== '00,00') completed++;
        if (am[1] && am[1] !== '00,00') completed++;
        if (am[2] && am[2] !== '00,00') completed++;
      } else {
        if (cf[0]) completed++;
        if (am[0] && am[0] !== '00,00') completed++;
      }
      return Math.round((completed / total) * 100);
    } else if (estado === 'Apagado') {
      const total = 2;
      let completed = 0;
      if (bafi.fotoBreakerBaseband1Apagado) completed++;
      if (bafi.fotoEspacioBaseband1Retirada) completed++;
      return Math.round((completed / total) * 100);
    } else if (estado === 'N/A') {
      return 100;
    }
    return 0;
  };

  const calculateBafiSector2Progress = () => {
    const bafi = planning.apagadoBafiSector2;
    if (!bafi) return 0;
    const estado = bafi.estadoBasebandSector2;
    const tipoEmpalme = planning.datosGenerales?.tipoEmpalme;
    const isTrifasico = tipoEmpalme === 'Trifásico';

    if (estado === 'Encendido') {
      const total = isTrifasico ? 10 : 6;
      let completed = 0;
      if (bafi.fotoBreakerBaseband2Encendido) completed++;
      if (bafi.fotoBaseband2Encendida) completed++;
      if (bafi.fotoBreakerBaseband2Apagado) completed++;
      if (bafi.fotoEspacioBaseband2Retirada) completed++;
      
      const cf = bafi.fotosConsumoFinal || [];
      const am = bafi.ampereConsumoFinal || [];
      if (isTrifasico) {
        if (cf[0]) completed++;
        if (cf[1]) completed++;
        if (cf[2]) completed++;
        if (am[0] && am[0] !== '00,00') completed++;
        if (am[1] && am[1] !== '00,00') completed++;
        if (am[2] && am[2] !== '00,00') completed++;
      } else {
        if (cf[0]) completed++;
        if (am[0] && am[0] !== '00,00') completed++;
      }
      return Math.round((completed / total) * 100);
    } else if (estado === 'Apagado') {
      const total = 2;
      let completed = 0;
      if (bafi.fotoBreakerBaseband2Apagado) completed++;
      if (bafi.fotoEspacioBaseband2Retirada) completed++;
      return Math.round((completed / total) * 100);
    } else if (estado === 'N/A') {
      return 100;
    }
    return 0;
  };

  const calculateBafiSector3Progress = () => {
    const bafi = planning.apagadoBafiSector3;
    if (!bafi) return 0;
    const estado = bafi.estadoBasebandSector3;
    const tipoEmpalme = planning.datosGenerales?.tipoEmpalme;
    const isTrifasico = tipoEmpalme === 'Trifásico';

    if (estado === 'Encendido') {
      const total = isTrifasico ? 10 : 6;
      let completed = 0;
      if (bafi.fotoBreakerBaseband3Encendido) completed++;
      if (bafi.fotoBaseband3Encendida) completed++;
      if (bafi.fotoBreakerBaseband3Apagado) completed++;
      if (bafi.fotoEspacioBaseband3Retirada) completed++;
      
      const cf = bafi.fotosConsumoFinal || [];
      const am = bafi.ampereConsumoFinal || [];
      if (isTrifasico) {
        if (cf[0]) completed++;
        if (cf[1]) completed++;
        if (cf[2]) completed++;
        if (am[0] && am[0] !== '00,00') completed++;
        if (am[1] && am[1] !== '00,00') completed++;
        if (am[2] && am[2] !== '00,00') completed++;
      } else {
        if (cf[0]) completed++;
        if (am[0] && am[0] !== '00,00') completed++;
      }
      return Math.round((completed / total) * 100);
    } else if (estado === 'Apagado') {
      const total = 2;
      let completed = 0;
      if (bafi.fotoBreakerBaseband3Apagado) completed++;
      if (bafi.fotoEspacioBaseband3Retirada) completed++;
      return Math.round((completed / total) * 100);
    } else if (estado === 'N/A') {
      return 100;
    }
    return 0;
  };

  const calculateAntenaSector1Progress = () => {
    const antena = planning.apagadoAntenaSector1;
    if (!antena) return 0;
    const estado = antena.estadoAntenaSector1;
    const tipoEmpalme = planning.datosGenerales?.tipoEmpalme;
    const isTrifasico = tipoEmpalme === 'Trifásico';

    if (estado === 'Encendida') {
      if (antena.seApagaraAntenaS1 === 'Si') {
        const total = isTrifasico ? 9 : 5;
        let completed = 0;
        if (antena.fotoBreakerAntenaS1Encendido) completed++;
        if (antena.seApagaraAntenaS1) completed++;
        if (antena.fotoBreakerAntenaS1Apagado) completed++;

        const cf = antena.fotosConsumoFinal || [];
        const am = antena.ampereConsumoFinal || [];
        if (isTrifasico) {
          if (cf[0]) completed++;
          if (cf[1]) completed++;
          if (cf[2]) completed++;
          if (am[0] && am[0] !== '00,00') completed++;
          if (am[1] && am[1] !== '00,00') completed++;
          if (am[2] && am[2] !== '00,00') completed++;
        } else {
          if (cf[0]) completed++;
          if (am[0] && am[0] !== '00,00') completed++;
        }
        return Math.round((completed / total) * 100);
      } else {
        const total = 2;
        let completed = 0;
        if (antena.fotoBreakerAntenaS1Encendido) completed++;
        if (antena.seApagaraAntenaS1) completed++;
        return Math.round((completed / total) * 100);
      }
    } else if (estado === 'Apagada') {
      const total = 1;
      let completed = 0;
      if (antena.fotoBreakerAntenaS1Apagado) completed++;
      return Math.round((completed / total) * 100);
    } else if (estado === 'N/A') {
      return 100;
    }
    return 0;
  };

  const calculateAntenaSector2Progress = () => {
    const antena = planning.apagadoAntenaSector2;
    if (!antena) return 0;
    const estado = antena.estadoAntenaSector2;
    const tipoEmpalme = planning.datosGenerales?.tipoEmpalme;
    const isTrifasico = tipoEmpalme === 'Trifásico';

    if (estado === 'Encendida') {
      if (antena.seApagaraAntenaS2 === 'Si') {
        const total = isTrifasico ? 9 : 5;
        let completed = 0;
        if (antena.fotoBreakerAntenaS2Encendido) completed++;
        if (antena.seApagaraAntenaS2) completed++;
        if (antena.fotoBreakerAntenaS2Apagado) completed++;

        const cf = antena.fotosConsumoFinal || [];
        const am = antena.ampereConsumoFinal || [];
        if (isTrifasico) {
          if (cf[0]) completed++;
          if (cf[1]) completed++;
          if (cf[2]) completed++;
          if (am[0] && am[0] !== '00,00') completed++;
          if (am[1] && am[1] !== '00,00') completed++;
          if (am[2] && am[2] !== '00,00') completed++;
        } else {
          if (cf[0]) completed++;
          if (am[0] && am[0] !== '00,00') completed++;
        }
        return Math.round((completed / total) * 100);
      } else {
        const total = 2;
        let completed = 0;
        if (antena.fotoBreakerAntenaS2Encendido) completed++;
        if (antena.seApagaraAntenaS2) completed++;
        return Math.round((completed / total) * 100);
      }
    } else if (estado === 'Apagada') {
      const total = 1;
      let completed = 0;
      if (antena.fotoBreakerAntenaS2Apagado) completed++;
      return Math.round((completed / total) * 100);
    } else if (estado === 'N/A') {
      return 100;
    }
    return 0;
  };

  const calculateAntenaSector3Progress = () => {
    const antena = planning.apagadoAntenaSector3;
    if (!antena) return 0;
    const estado = antena.estadoAntenaSector3;
    const tipoEmpalme = planning.datosGenerales?.tipoEmpalme;
    const isTrifasico = tipoEmpalme === 'Trifásico';

    if (estado === 'Encendida') {
      if (antena.seApagaraAntenaS3 === 'Si') {
        const total = isTrifasico ? 9 : 5;
        let completed = 0;
        if (antena.fotoBreakerAntenaS3Encendido) completed++;
        if (antena.seApagaraAntenaS3) completed++;
        if (antena.fotoBreakerAntenaS3Apagado) completed++;

        const cf = antena.fotosConsumoFinal || [];
        const am = antena.ampereConsumoFinal || [];
        if (isTrifasico) {
          if (cf[0]) completed++;
          if (cf[1]) completed++;
          if (cf[2]) completed++;
          if (am[0] && am[0] !== '00,00') completed++;
          if (am[1] && am[1] !== '00,00') completed++;
          if (am[2] && am[2] !== '00,00') completed++;
        } else {
          if (cf[0]) completed++;
          if (am[0] && am[0] !== '00,00') completed++;
        }
        return Math.round((completed / total) * 100);
      } else {
        const total = 2;
        let completed = 0;
        if (antena.fotoBreakerAntenaS3Encendido) completed++;
        if (antena.seApagaraAntenaS3) completed++;
        return Math.round((completed / total) * 100);
      }
    } else if (estado === 'Apagada') {
      const total = 1;
      let completed = 0;
      if (antena.fotoBreakerAntenaS3Apagado) completed++;
      return Math.round((completed / total) * 100);
    } else if (estado === 'N/A') {
      return 100;
    }
    return 0;
  };

  const calculateAlarmasProgress = () => {
    const alarmas = planning.alarmasExternas;
    if (!alarmas || !alarmas.tecnologiaAlarmas) return 0;
    
    const tec = alarmas.tecnologiaAlarmas;
    if (tec === 'LTE' || tec === '5G') {
      const total = 3;
      let completed = 1;
      if (alarmas.fotoAlarmasOVP) completed++;
      if (alarmas.fotoAlarmasEquipos) completed++;
      return Math.round((completed / total) * 100);
    } else if (tec === '3G' || tec === 'BAFI') {
      if (alarmas.migraranTecnologia) {
        const total = 6;
        let completed = 2;
        if (alarmas.fotoAlarmasEquipos) completed++;
        if (alarmas.fotoAlarmasOVP) completed++;
        if (alarmas.fotoAlarmasMigradas) completed++;
        if (alarmas.fotoAlarmasFinalesOVP) completed++;
        return Math.round((completed / total) * 100);
      } else {
        const total = 3;
        let completed = 1;
        if (alarmas.fotoAlarmasEquipos) completed++;
        if (alarmas.fotoAlarmasOVP) completed++;
        return Math.round((completed / total) * 100);
      }
    } else if (tec === 'No existen') {
      const impl = alarmas.implementaranAlarmas;
      if (impl === 'No') {
        const total = 4;
        let completed = 2;
        if (alarmas.motivosNoImplementacion && alarmas.motivosNoImplementacion.trim()) completed++;
        if (alarmas.fotoNoImplementacion) completed++;
        return Math.round((completed / total) * 100);
      } else if (impl === 'Si') {
        const total = 5;
        let completed = 2;
        if (alarmas.tecnologiaImplementacion) completed++;
        if (alarmas.fotoAlarmasImplementadas) completed++;
        if (alarmas.fotoAlarmasFinalesOVP) completed++;
        return Math.round((completed / total) * 100);
      } else {
        const total = 2;
        let completed = 1;
        return Math.round((completed / total) * 100);
      }
    }
    return 0;
  };

  const calculateEvidenciaSalidaProgress = () => {
    const ev = planning.evidenciaSalida;
    if (!ev) return 0;
    let completed = 0;
    const total = 6;
    if (ev.fotoRectificador) completed++;
    if (ev.fotoContenedor1) completed++;
    if (ev.fotoContenedor2) completed++;
    if (ev.fotoSitio1) completed++;
    if (ev.fotoSitio2) completed++;
    if (ev.fotoEstructuraSalida) completed++;
    return Math.round((completed / total) * 100);
  };

  if (site?.proyecto === 'Apagado BAFI') {
    const datosProgress = calculateDatosProgress();
    const s1Progress = calculateBafiSector1Progress();
    const s2Progress = calculateBafiSector2Progress();
    const s3Progress = calculateBafiSector3Progress();
    const antena1Progress = calculateAntenaSector1Progress();
    const antena2Progress = calculateAntenaSector2Progress();
    const antena3Progress = calculateAntenaSector3Progress();
    const alarmasProgress = calculateAlarmasProgress();
    const evidenciaProgress = calculateEvidenciaSalidaProgress();
    return Math.round((datosProgress + s1Progress + s2Progress + s3Progress + antena1Progress + antena2Progress + antena3Progress + alarmasProgress + evidenciaProgress) / 9);
  }

  if (isIloq) {
    return calculateChapaProgress();
  } else {
    const datosProgress = calculateDatosProgress();
    const secondProgress = calculateApagadoProgress();
    const alarmasProgress = calculateAlarmasProgress();
    const evidenciaProgress = calculateEvidenciaSalidaProgress();
    return Math.round((datosProgress + secondProgress + alarmasProgress + evidenciaProgress) / 4);
  }
};

export const getReportProgressColor = (percentage: number): string => {
  if (percentage === 100) return '#34C759'; // Green
  if (percentage === 0) return '#FF3B30'; // Red
  return '#FF9500'; // Orange
};
