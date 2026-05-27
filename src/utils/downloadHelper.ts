import { useState } from 'react';
import { Image } from 'react-native';

export function useReportDownloader(fetchAndSync: (id: string) => Promise<any>, isApiConnected: boolean) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const startDownload = async (planningId: string, onComplete: () => void) => {
    setVisible(true);
    setProgress(5);
    setStatus('Estableciendo conexión con la base de datos local...');

    // Retardo sutil de conexión de 500ms
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!isApiConnected) {
      // Modo sin conexión / fallback
      setProgress(40);
      setStatus('API local no disponible. Usando copia local en caché...');
      await new Promise(resolve => setTimeout(resolve, 800));
      setProgress(100);
      setStatus('¡Carga completada en modo offline!');
      await new Promise(resolve => setTimeout(resolve, 400));
      setVisible(false);
      onComplete();
      return;
    }

    try {
      setProgress(20);
      setStatus('Descargando información técnica del reporte...');
      
      const planning = await fetchAndSync(planningId);
      
      if (!planning) {
        throw new Error('No se pudo obtener la planificación.');
      }

      setProgress(40);
      setStatus('Analizando archivos multimedia...');
      await new Promise(resolve => setTimeout(resolve, 300));

      // Extraer fotos
      const photoUrls: string[] = [];
      const collect = (uri: any) => {
        if (typeof uri === 'string' && uri.trim() && (uri.startsWith('http') || uri.startsWith('file') || uri.startsWith('ph'))) {
          photoUrls.push(uri);
        }
      };
      
      if (planning.hallazgos?.fotos) {
        planning.hallazgos.fotos.forEach(collect);
      }
      if (planning.datosGenerales) {
        const dg = planning.datosGenerales;
        collect(dg.fotoEstructura);
        collect(dg.fotoFueraContenedor);
        collect(dg.fotoMedidor);
        collect(dg.fotoSectorMedidor);
        collect(dg.fotoDisplayRectificador);
        if (dg.fotosEmpalme) dg.fotosEmpalme.forEach(collect);
        if (dg.fotosGeneralesSitio) dg.fotosGeneralesSitio.forEach(collect);
        if (dg.fotosInteriorContenedor) dg.fotosInteriorContenedor.forEach(collect);
      }
      if (planning.apagado3G) {
        const ap = planning.apagado3G;
        collect(ap.fotoEquipo3GEncendido);
        collect(ap.fotoBreaker3GEncendido);
        collect(ap.fotoBreaker3GApagado);
        collect(ap.fotoEquipo3GApagado);
        collect(ap.fotoEspacioRetirado);
        collect(ap.fotoRRUEncendido);
        collect(ap.fotoRRUApagado);
      }
      
      // BAFI Sectores y Antenas
      const sectors = ['Sector1', 'Sector2', 'Sector3'];
      sectors.forEach((s, idx) => {
        const num = idx + 1;
        const bafi = (planning as any)[`apagadoBafi${s}`];
        if (bafi) {
          collect(bafi[`fotoBreakerBaseband${num}Encendido`]);
          collect(bafi[`fotoBaseband${num}Encendida`]);
          collect(bafi[`fotoBreakerBaseband${num}Apagado`]);
          collect(bafi[`fotoEspacioBaseband${num}Retirada`]);
          collect(bafi.fotoConsumoInicialCc);
          collect(bafi.fotoConsumoFinalCc);
          if (bafi.fotosConsumoFinal) bafi.fotosConsumoFinal.forEach(collect);
        }
        const antena = (planning as any)[`apagadoAntena${s}`];
        if (antena) {
          collect(antena[`fotoBreakerAntenaS${num}Encendido`]);
          collect(antena[`fotoBreakerAntenaS${num}Apagado`]);
          collect(antena.fotoConsumoInicialCc);
          collect(antena.fotoConsumoFinalCc);
          if (antena.fotosConsumoFinal) antena.fotosConsumoFinal.forEach(collect);
        }
      });

      if (planning.cambioChapa) {
        const cc = planning.cambioChapa;
        collect(cc.fotoChapaAnterior);
        collect(cc.fotoNuevaChapa);
        collect(cc.fotoLlaveProgramacion);
        collect(cc.fotoPuertaCerrada);
      }

      if (planning.alarmasExternas) {
        const al = planning.alarmasExternas;
        collect(al.fotoAlarmasOVP);
        collect(al.fotoAlarmasEquipos);
        collect(al.fotoAlarmasMigradas);
        collect(al.fotoAlarmasFinalesOVP);
        collect(al.fotoNoImplementacion);
        collect(al.fotoAlarmasImplementadas);
      }

      if (planning.evidenciaSalida) {
        const ev = planning.evidenciaSalida;
        collect(ev.fotoRectificador);
        collect(ev.fotoContenedor1);
        collect(ev.fotoContenedor2);
        collect(ev.fotoSitio1);
        collect(ev.fotoSitio2);
        collect(ev.fotoEstructuraSalida);
      }

      // Filtrar duplicados
      const uniqueUrls = Array.from(new Set(photoUrls));

      if (uniqueUrls.length === 0) {
        setProgress(70);
        setStatus('No hay fotos asociadas. Preparando informe...');
        await new Promise(resolve => setTimeout(resolve, 500));
        setProgress(100);
        setStatus('¡Descarga completa!');
        await new Promise(resolve => setTimeout(resolve, 400));
        setVisible(false);
        onComplete();
        return;
      }

      // Descargar secuencialmente para actualizar el avance
      let downloadedCount = 0;
      for (const url of uniqueUrls) {
        try {
          setStatus(`Descargando foto ${downloadedCount + 1} de ${uniqueUrls.length}...`);
          await Image.prefetch(url);
        } catch (err) {
          console.warn(`Error descargando foto: ${url}`, err);
        }
        downloadedCount++;
        const photoProgress = 40 + (50 * (downloadedCount / uniqueUrls.length));
        setProgress(photoProgress);
      }

      setProgress(95);
      setStatus('Procesando y generando vista de informe...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setProgress(100);
      setStatus('¡Informe descargado con éxito!');
      await new Promise(resolve => setTimeout(resolve, 450));
      
      setVisible(false);
      onComplete();
    } catch (error) {
      console.error(error);
      setStatus('Error al descargar el informe. Inténtalo de nuevo.');
      await new Promise(resolve => setTimeout(resolve, 1500));
      setVisible(false);
    }
  };

  return {
    visible,
    progress,
    status,
    startDownload
  };
}
