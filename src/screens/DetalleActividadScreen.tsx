import React, { useState, useContext, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Linking, Alert, Image, Dimensions, Modal, StatusBar, LayoutAnimation, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { colors } from '../theme/colors';
import { AppContext } from '../context/AppContext';
import { getElapsedTime, getSantiagoTodayString } from '../services/timeUtils';
import { uploadPhotoApi, getPlanningDetail } from '../services/apiService';
import { UploadProgressModal } from '../components/UploadProgressModal';
import { SelectDropdown } from '../components/SelectDropdown';
const LOGO_F1 = require('../assets/logo_f1plus.png');

const SCREEN_WIDTH = Dimensions.get('window').width;

const formatDateTime = (isoString?: string | null) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (e) {
    return '';
  }
};

export const DetalleActividadScreen = ({ route, navigation }: any) => {
  const { planningId, isPreview } = route.params || {};
  const context = useContext(AppContext);
  
  const planning = context?.plannings.find(p => p.id === planningId);
  const site = context?.sites.find(s => s.id === planning?.siteId);

  const [observaciones, setObservaciones] = useState(planning?.hallazgos?.observaciones || '');
  const [fotos, setFotos] = useState<string[]>(planning?.hallazgos?.fotos || []);

  // Estados Datos Generales
  const dg = planning?.datosGenerales;
  const [tipoEstructura, setTipoEstructura] = useState(dg?.tipoEstructura || '');
  const [tipoContenedor, setTipoContenedor] = useState(dg?.tipoContenedor || '');
  const [tipoEmpalme, setTipoEmpalme] = useState(dg?.tipoEmpalme || '');
  const [fotosEmpalme, setFotosEmpalme] = useState<string[]>(dg?.fotosEmpalme || []);
  const [capacidadProteccion, setCapacidadProteccion] = useState(dg?.capacidadProteccion || '');
  const [fotoMedidor, setFotoMedidor] = useState(dg?.fotoMedidor || '');
  const [fotoSectorMedidor, setFotoSectorMedidor] = useState(dg?.fotoSectorMedidor || '');
  const [numeroMedidor, setNumeroMedidor] = useState(dg?.numeroMedidor || '');
  const [lecturaConsumo, setLecturaConsumo] = useState(dg?.lecturaConsumo || '');
  const [ampereEmpalme, setAmpereEmpalme] = useState<string[]>(dg?.ampereEmpalme || ['', '', '']);
  
  // Estado para el modal de Ampere
  const [showAmpereModal, setShowAmpereModal] = useState(false);
  const [tempAmpere, setTempAmpere] = useState('');
  const [activeAmpereTarget, setActiveAmpereTarget] = useState<string | null>(null);
  const [activeAmpereIndex, setActiveAmpereIndex] = useState<number | null>(null);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState('');
  const isFinalizingRef = useRef(false);
  const isReadOnly = planning?.status === 'Ejecutado' || isPreview || context?.currentUser?.role !== 'Trabajador';

  // ── Sincronización desde BD al abrir pantalla con status potencialmente desactualizado ──
  // Cubre dos casos:
  //   1. Ver informe: planificación "Ejecutada" → descarga datos actualizados del informe.
  //   2. Actividad reabierta: caché local dice "Ejecutado" pero en BD está "Planificado"/"En ejecución"
  //      → sincroniza para obtener el status real y habilitar edición.
  const [isSyncingFromDb, setIsSyncingFromDb] = useState(false);
  const hasSyncedFromDbRef = useRef<string | null>(null); // guarda el planningId ya sincronizado

  useEffect(() => {
    if (
      planningId &&
      context?.isApiConnected &&
      context?.fetchAndSyncPlanning &&
      hasSyncedFromDbRef.current !== planningId
    ) {
      hasSyncedFromDbRef.current = planningId;
      setIsSyncingFromDb(true);
      context.fetchAndSyncPlanning(planningId).finally(() => {
        setIsSyncingFromDb(false);
      });
    }
  }, [planningId, context?.isApiConnected]);

  // ── Iniciar ejecución automáticamente si el trabajador abre una actividad Planificada ──
  // Se dispara también cuando el status cambia post-sincronización (actividad reabierta).
  useEffect(() => {
    // Si viene del Calendario como vista previa (isPreview), no verificamos fechas ni la iniciamos.
    // Además, solo los Trabajadores pueden poner en ejecución una actividad.
    if (!isPreview && planning && planning.status !== 'En ejecución' && planning.status !== 'Ejecutado' && context?.currentUser?.role === 'Trabajador') {
      const now = new Date();
      const todayString = getSantiagoTodayString();

      
      if (planning.date !== todayString) {
        Alert.alert(
          'Acción no permitida',
          `Esta actividad está planificada para el ${planning.date}. Solo puedes iniciar actividades programadas para el día de hoy.`,
          [{ text: 'Entendido', onPress: () => navigation.goBack() }]
        );
        return;
      }

      context?.updatePlanning(planning.id, {
        status: 'En ejecución',
        startTime: now.toISOString(),
      });
      if (site) {
        context?.updateSite(site.id, {
          estadoExcel: 'En ejecución',
        });
      }
    }
  }, [planningId, isPreview, planning?.status]);

  // Actualizar el tiempo cada minuto
  useEffect(() => {
    if (planning?.status === 'En ejecución' && planning.startTime) {
      setElapsedTime(getElapsedTime(planning.startTime));
      const interval = setInterval(() => {
        setElapsedTime(getElapsedTime(planning.startTime));
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [planning?.status, planning?.startTime]);

  // Nuevas fotos obligatorias
  const [fotoEstructura, setFotoEstructura] = useState(dg?.fotoEstructura || '');
  const [fotoFueraContenedor, setFotoFueraContenedor] = useState(dg?.fotoFueraContenedor || '');
  const [fotosGeneralesSitio, setFotosGeneralesSitio] = useState<string[]>(dg?.fotosGeneralesSitio || ['', '']);
  const [fotosInteriorContenedor, setFotosInteriorContenedor] = useState<string[]>(dg?.fotosInteriorContenedor || ['', '']);
  const [fotoDisplayRectificador, setFotoDisplayRectificador] = useState(dg?.fotoDisplayRectificador || '');
  const [ampereDisplayRectificador, setAmpereDisplayRectificador] = useState(dg?.ampereDisplayRectificador || '');

  // Estados Apagado Equipo 3G1900
  const apagado = planning?.apagado3G;
  const [estado3G, setEstado3G] = useState(apagado?.estado3G || '');
  const [seApagara3G, setSeApagara3G] = useState(apagado?.seApagara3G || '');
  const [estadoRRU, setEstadoRRU] = useState(apagado?.estadoRRU || '');
  const [seApagaraRRU, setSeApagaraRRU] = useState(apagado?.seApagaraRRU || '');

  const [fotoEquipo3GEncendido, setFotoEquipo3GEncendido] = useState(apagado?.fotoEquipo3GEncendido || '');
  const [fotoBreaker3GEncendido, setFotoBreaker3GEncendido] = useState(apagado?.fotoBreaker3GEncendido || '');
  const [fotoBreaker3GApagado, setFotoBreaker3GApagado] = useState(apagado?.fotoBreaker3GApagado || '');
  const [fotoEquipo3GApagado, setFotoEquipo3GApagado] = useState(apagado?.fotoEquipo3GApagado || '');
  const [fotoEspacioRetirado, setFotoEspacioRetirado] = useState(apagado?.fotoEspacioRetirado || '');
  const [seRetirara3G, setSeRetirara3G] = useState(apagado?.seRetirara3G || '');
  const [fotoRRUEncendido, setFotoRRUEncendido] = useState(apagado?.fotoRRUEncendido || '');
  const [fotoRRUApagado, setFotoRRUApagado] = useState(apagado?.fotoRRUApagado || '');
  const [ampere3GEncendido, setAmpere3GEncendido] = useState(apagado?.ampere3GEncendido || '');
  const [justificacionNoApagado, setJustificacionNoApagado] = useState(apagado?.justificacionNoApagado || '');

  // Cambio de Chapa states & refs
  const isIloq = site?.proyecto === 'iLOQ';
  const isApagadoBafi = site?.proyecto === 'Apagado BAFI';
  const cc = planning?.cambioChapa;
  const [tipoChapa, setTipoChapa] = useState(cc?.tipoChapa || '');
  const [nroSerie, setNroSerie] = useState(cc?.nroSerie || '');
  const [estadoInicialChapa, setEstadoInicialChapa] = useState(cc?.estadoInicial || '');
  const [fotoChapaAnterior, setFotoChapaAnterior] = useState(cc?.fotoChapaAnterior || '');
  const [fotoNuevaChapa, setFotoNuevaChapa] = useState(cc?.fotoNuevaChapa || '');
  const [fotoLlaveProgramacion, setFotoLlaveProgramacion] = useState(cc?.fotoLlaveProgramacion || '');
  const [fotoPuertaCerrada, setFotoPuertaCerrada] = useState(cc?.fotoPuertaCerrada || '');
  const [estadoFinalChapa, setEstadoFinalChapa] = useState(cc?.estadoFinal || '');
  const [justificacionChapa, setJustificacionChapa] = useState(cc?.justificacion || '');

  const tipoChapaRef = useRef(tipoChapa);
  const nroSerieRef = useRef(nroSerie);
  const estadoInicialChapaRef = useRef(estadoInicialChapa);
  const fotoChapaAnteriorRef = useRef(fotoChapaAnterior);
  const fotoNuevaChapaRef = useRef(fotoNuevaChapa);
  const fotoLlaveProgramacionRef = useRef(fotoLlaveProgramacion);
  const fotoPuertaCerradaRef = useRef(fotoPuertaCerrada);
  const estadoFinalChapaRef = useRef(estadoFinalChapa);
  const justificacionChapaRef = useRef(justificacionChapa);

  // Apagado BAFI S1 states & refs
  const bafi = planning?.apagadoBafiSector1;
  const [estadoBasebandSector1, setEstadoBasebandSector1] = useState(bafi?.estadoBasebandSector1 || '');
  const [fotoBreakerBaseband1Encendido, setFotoBreakerBaseband1Encendido] = useState(bafi?.fotoBreakerBaseband1Encendido || '');
  const [fotoBaseband1Encendida, setFotoBaseband1Encendida] = useState(bafi?.fotoBaseband1Encendida || '');
  const [confirmadoApagadoRetirar, setConfirmadoApagadoRetirar] = useState(bafi?.confirmadoApagadoRetirar || false);
  const [fotoBreakerBaseband1Apagado, setFotoBreakerBaseband1Apagado] = useState(bafi?.fotoBreakerBaseband1Apagado || '');
  const [fotoEspacioBaseband1Retirada, setFotoEspacioBaseband1Retirada] = useState(bafi?.fotoEspacioBaseband1Retirada || '');
  const [fotosConsumoFinal, setFotosConsumoFinal] = useState<string[]>(bafi?.fotosConsumoFinal || ['', '', '']);
  const [ampereConsumoFinal, setAmpereConsumoFinal] = useState<string[]>(bafi?.ampereConsumoFinal || ['', '', '']);
  const [fotoConsumoInicialCc1, setFotoConsumoInicialCc1] = useState(bafi?.fotoConsumoInicialCc || '');
  const [ampereConsumoInicialCc1, setAmpereConsumoInicialCc1] = useState(bafi?.ampereConsumoInicialCc || '');
  const [fotoConsumoFinalCc1, setFotoConsumoFinalCc1] = useState(bafi?.fotoConsumoFinalCc || '');
  const [ampereConsumoFinalCc1, setAmpereConsumoFinalCc1] = useState(bafi?.ampereConsumoFinalCc || '');

  const estadoBasebandSector1Ref = useRef(estadoBasebandSector1);
  const fotoBreakerBaseband1EncendidoRef = useRef(fotoBreakerBaseband1Encendido);
  const fotoBaseband1EncendidaRef = useRef(fotoBaseband1Encendida);
  const confirmadoApagadoRetirarRef = useRef(confirmadoApagadoRetirar);
  const fotoBreakerBaseband1ApagadoRef = useRef(fotoBreakerBaseband1Apagado);
  const fotoEspacioBaseband1RetiradaRef = useRef(fotoEspacioBaseband1Retirada);
  const fotosConsumoFinalRef = useRef(fotosConsumoFinal);
  const ampereConsumoFinalRef = useRef(ampereConsumoFinal);
  const fotoConsumoInicialCc1Ref = useRef(fotoConsumoInicialCc1);
  const ampereConsumoInicialCc1Ref = useRef(ampereConsumoInicialCc1);
  const fotoConsumoFinalCc1Ref = useRef(fotoConsumoFinalCc1);
  const ampereConsumoFinalCc1Ref = useRef(ampereConsumoFinalCc1);

  // Apagado BAFI S2 states & refs
  const bafiS2 = planning?.apagadoBafiSector2;
  const [estadoBasebandSector2, setEstadoBasebandSector2] = useState(bafiS2?.estadoBasebandSector2 || '');
  const [fotoBreakerBaseband2Encendido, setFotoBreakerBaseband2Encendido] = useState(bafiS2?.fotoBreakerBaseband2Encendido || '');
  const [fotoBaseband2Encendida, setFotoBaseband2Encendida] = useState(bafiS2?.fotoBaseband2Encendida || '');
  const [confirmadoApagadoRetirarS2, setConfirmadoApagadoRetirarS2] = useState(bafiS2?.confirmadoApagadoRetirar || false);
  const [fotoBreakerBaseband2Apagado, setFotoBreakerBaseband2Apagado] = useState(bafiS2?.fotoBreakerBaseband2Apagado || '');
  const [fotoEspacioBaseband2Retirada, setFotoEspacioBaseband2Retirada] = useState(bafiS2?.fotoEspacioBaseband2Retirada || '');
  const [fotosConsumoFinalS2, setFotosConsumoFinalS2] = useState<string[]>(bafiS2?.fotosConsumoFinal || ['', '', '']);
  const [ampereConsumoFinalS2, setAmpereConsumoFinalS2] = useState<string[]>(bafiS2?.ampereConsumoFinal || ['', '', '']);
  const [fotoConsumoInicialCc2, setFotoConsumoInicialCc2] = useState(bafiS2?.fotoConsumoInicialCc || '');
  const [ampereConsumoInicialCc2, setAmpereConsumoInicialCc2] = useState(bafiS2?.ampereConsumoInicialCc || '');
  const [fotoConsumoFinalCc2, setFotoConsumoFinalCc2] = useState(bafiS2?.fotoConsumoFinalCc || '');
  const [ampereConsumoFinalCc2, setAmpereConsumoFinalCc2] = useState(bafiS2?.ampereConsumoFinalCc || '');

  const estadoBasebandSector2Ref = useRef(estadoBasebandSector2);
  const fotoBreakerBaseband2EncendidoRef = useRef(fotoBreakerBaseband2Encendido);
  const fotoBaseband2EncendidaRef = useRef(fotoBaseband2Encendida);
  const confirmadoApagadoRetirarS2Ref = useRef(confirmadoApagadoRetirarS2);
  const fotoBreakerBaseband2ApagadoRef = useRef(fotoBreakerBaseband2Apagado);
  const fotoEspacioBaseband2RetiradaRef = useRef(fotoEspacioBaseband2Retirada);
  const fotosConsumoFinalS2Ref = useRef(fotosConsumoFinalS2);
  const ampereConsumoFinalS2Ref = useRef(ampereConsumoFinalS2);
  const fotoConsumoInicialCc2Ref = useRef(fotoConsumoInicialCc2);
  const ampereConsumoInicialCc2Ref = useRef(ampereConsumoInicialCc2);
  const fotoConsumoFinalCc2Ref = useRef(fotoConsumoFinalCc2);
  const ampereConsumoFinalCc2Ref = useRef(ampereConsumoFinalCc2);

  // Apagado BAFI S3 states & refs
  const bafiS3 = planning?.apagadoBafiSector3;
  const [estadoBasebandSector3, setEstadoBasebandSector3] = useState(bafiS3?.estadoBasebandSector3 || '');
  const [fotoBreakerBaseband3Encendido, setFotoBreakerBaseband3Encendido] = useState(bafiS3?.fotoBreakerBaseband3Encendido || '');
  const [fotoBaseband3Encendida, setFotoBaseband3Encendida] = useState(bafiS3?.fotoBaseband3Encendida || '');
  const [confirmadoApagadoRetirarS3, setConfirmadoApagadoRetirarS3] = useState(bafiS3?.confirmadoApagadoRetirar || false);
  const [fotoBreakerBaseband3Apagado, setFotoBreakerBaseband3Apagado] = useState(bafiS3?.fotoBreakerBaseband3Apagado || '');
  const [fotoEspacioBaseband3Retirada, setFotoEspacioBaseband3Retirada] = useState(bafiS3?.fotoEspacioBaseband3Retirada || '');
  const [fotosConsumoFinalS3, setFotosConsumoFinalS3] = useState<string[]>(bafiS3?.fotosConsumoFinal || ['', '', '']);
  const [ampereConsumoFinalS3, setAmpereConsumoFinalS3] = useState<string[]>(bafiS3?.ampereConsumoFinal || ['', '', '']);
  const [fotoConsumoInicialCc3, setFotoConsumoInicialCc3] = useState(bafiS3?.fotoConsumoInicialCc || '');
  const [ampereConsumoInicialCc3, setAmpereConsumoInicialCc3] = useState(bafiS3?.ampereConsumoInicialCc || '');
  const [fotoConsumoFinalCc3, setFotoConsumoFinalCc3] = useState(bafiS3?.fotoConsumoFinalCc || '');
  const [ampereConsumoFinalCc3, setAmpereConsumoFinalCc3] = useState(bafiS3?.ampereConsumoFinalCc || '');

  const estadoBasebandSector3Ref = useRef(estadoBasebandSector3);
  const fotoBreakerBaseband3EncendidoRef = useRef(fotoBreakerBaseband3Encendido);
  const fotoBaseband3EncendidaRef = useRef(fotoBaseband3Encendida);
  const confirmadoApagadoRetirarS3Ref = useRef(confirmadoApagadoRetirarS3);
  const fotoBreakerBaseband3ApagadoRef = useRef(fotoBreakerBaseband3Apagado);
  const fotoEspacioBaseband3RetiradaRef = useRef(fotoEspacioBaseband3Retirada);
  const fotosConsumoFinalS3Ref = useRef(fotosConsumoFinalS3);
  const ampereConsumoFinalS3Ref = useRef(ampereConsumoFinalS3);
  const fotoConsumoInicialCc3Ref = useRef(fotoConsumoInicialCc3);
  const ampereConsumoInicialCc3Ref = useRef(ampereConsumoInicialCc3);
  const fotoConsumoFinalCc3Ref = useRef(fotoConsumoFinalCc3);
  const ampereConsumoFinalCc3Ref = useRef(ampereConsumoFinalCc3);

  // Apagado Antena S1, S2, S3 states & refs
  const antena1 = planning?.apagadoAntenaSector1;
  const [estadoAntenaSector1, setEstadoAntenaSector1] = useState(antena1?.estadoAntenaSector1 || '');
  const [fotoBreakerAntenaS1Encendido, setFotoBreakerAntenaS1Encendido] = useState(antena1?.fotoBreakerAntenaS1Encendido || '');
  const [seApagaraAntenaS1, setSeApagaraAntenaS1] = useState(antena1?.seApagaraAntenaS1 || '');
  const [fotoBreakerAntenaS1Apagado, setFotoBreakerAntenaS1Apagado] = useState(antena1?.fotoBreakerAntenaS1Apagado || '');
  const [fotosConsumoFinalAntenaS1, setFotosConsumoFinalAntenaS1] = useState<string[]>(antena1?.fotosConsumoFinal || ['', '', '']);
  const [ampereConsumoFinalAntenaS1, setAmpereConsumoFinalAntenaS1] = useState<string[]>(antena1?.ampereConsumoFinal || ['', '', '']);
  const [fotoConsumoInicialCcAntenaS1, setFotoConsumoInicialCcAntenaS1] = useState(antena1?.fotoConsumoInicialCc || '');
  const [fotoConsumoFinalCcAntenaS1, setFotoConsumoFinalCcAntenaS1] = useState(antena1?.fotoConsumoFinalCc || '');
  const [textoCompartida5GAntenaS1, setTextoCompartida5GAntenaS1] = useState(antena1?.textoCompartida5G || '');
  const [confirmadoApagadoAntenaS1, setConfirmadoApagadoAntenaS1] = useState(antena1?.confirmadoApagadoAntena || false);

  const antena2 = planning?.apagadoAntenaSector2;
  const [estadoAntenaSector2, setEstadoAntenaSector2] = useState(antena2?.estadoAntenaSector2 || '');
  const [fotoBreakerAntenaS2Encendido, setFotoBreakerAntenaS2Encendido] = useState(antena2?.fotoBreakerAntenaS2Encendido || '');
  const [seApagaraAntenaS2, setSeApagaraAntenaS2] = useState(antena2?.seApagaraAntenaS2 || '');
  const [fotoBreakerAntenaS2Apagado, setFotoBreakerAntenaS2Apagado] = useState(antena2?.fotoBreakerAntenaS2Apagado || '');
  const [fotosConsumoFinalAntenaS2, setFotosConsumoFinalAntenaS2] = useState<string[]>(antena2?.fotosConsumoFinal || ['', '', '']);
  const [ampereConsumoFinalAntenaS2, setAmpereConsumoFinalAntenaS2] = useState<string[]>(antena2?.ampereConsumoFinal || ['', '', '']);
  const [fotoConsumoInicialCcAntenaS2, setFotoConsumoInicialCcAntenaS2] = useState(antena2?.fotoConsumoInicialCc || '');
  const [fotoConsumoFinalCcAntenaS2, setFotoConsumoFinalCcAntenaS2] = useState(antena2?.fotoConsumoFinalCc || '');
  const [textoCompartida5GAntenaS2, setTextoCompartida5GAntenaS2] = useState(antena2?.textoCompartida5G || '');
  const [confirmadoApagadoAntenaS2, setConfirmadoApagadoAntenaS2] = useState(antena2?.confirmadoApagadoAntena || false);

  const antena3 = planning?.apagadoAntenaSector3;
  const [estadoAntenaSector3, setEstadoAntenaSector3] = useState(antena3?.estadoAntenaSector3 || '');
  const [fotoBreakerAntenaS3Encendido, setFotoBreakerAntenaS3Encendido] = useState(antena3?.fotoBreakerAntenaS3Encendido || '');
  const [seApagaraAntenaS3, setSeApagaraAntenaS3] = useState(antena3?.seApagaraAntenaS3 || '');
  const [fotoBreakerAntenaS3Apagado, setFotoBreakerAntenaS3Apagado] = useState(antena3?.fotoBreakerAntenaS3Apagado || '');
  const [fotosConsumoFinalAntenaS3, setFotosConsumoFinalAntenaS3] = useState<string[]>(antena3?.fotosConsumoFinal || ['', '', '']);
  const [ampereConsumoFinalAntenaS3, setAmpereConsumoFinalAntenaS3] = useState<string[]>(antena3?.ampereConsumoFinal || ['', '', '']);
  const [fotoConsumoInicialCcAntenaS3, setFotoConsumoInicialCcAntenaS3] = useState(antena3?.fotoConsumoInicialCc || '');
  const [fotoConsumoFinalCcAntenaS3, setFotoConsumoFinalCcAntenaS3] = useState(antena3?.fotoConsumoFinalCc || '');
  const [textoCompartida5GAntenaS3, setTextoCompartida5GAntenaS3] = useState(antena3?.textoCompartida5G || '');
  const [confirmadoApagadoAntenaS3, setConfirmadoApagadoAntenaS3] = useState(antena3?.confirmadoApagadoAntena || false);

  const [isBafiGroupExpanded, setIsBafiGroupExpanded] = useState(false);
  const [isAntenasGroupExpanded, setIsAntenasGroupExpanded] = useState(false);

  const estadoAntenaSector1Ref = useRef(estadoAntenaSector1);
  const fotoBreakerAntenaS1EncendidoRef = useRef(fotoBreakerAntenaS1Encendido);
  const seApagaraAntenaS1Ref = useRef(seApagaraAntenaS1);
  const fotoBreakerAntenaS1ApagadoRef = useRef(fotoBreakerAntenaS1Apagado);
  const fotosConsumoFinalAntenaS1Ref = useRef(fotosConsumoFinalAntenaS1);
  const ampereConsumoFinalAntenaS1Ref = useRef(ampereConsumoFinalAntenaS1);
  const fotoConsumoInicialCcAntenaS1Ref = useRef(fotoConsumoInicialCcAntenaS1);
  const fotoConsumoFinalCcAntenaS1Ref = useRef(fotoConsumoFinalCcAntenaS1);
  const textoCompartida5GAntenaS1Ref = useRef(textoCompartida5GAntenaS1);
  const confirmadoApagadoAntenaS1Ref = useRef(confirmadoApagadoAntenaS1);

  const estadoAntenaSector2Ref = useRef(estadoAntenaSector2);
  const fotoBreakerAntenaS2EncendidoRef = useRef(fotoBreakerAntenaS2Encendido);
  const seApagaraAntenaS2Ref = useRef(seApagaraAntenaS2);
  const fotoBreakerAntenaS2ApagadoRef = useRef(fotoBreakerAntenaS2Apagado);
  const fotosConsumoFinalAntenaS2Ref = useRef(fotosConsumoFinalAntenaS2);
  const ampereConsumoFinalAntenaS2Ref = useRef(ampereConsumoFinalAntenaS2);
  const fotoConsumoInicialCcAntenaS2Ref = useRef(fotoConsumoInicialCcAntenaS2);
  const fotoConsumoFinalCcAntenaS2Ref = useRef(fotoConsumoFinalCcAntenaS2);
  const textoCompartida5GAntenaS2Ref = useRef(textoCompartida5GAntenaS2);
  const confirmadoApagadoAntenaS2Ref = useRef(confirmadoApagadoAntenaS2);

  const estadoAntenaSector3Ref = useRef(estadoAntenaSector3);
  const fotoBreakerAntenaS3EncendidoRef = useRef(fotoBreakerAntenaS3Encendido);
  const seApagaraAntenaS3Ref = useRef(seApagaraAntenaS3);
  const fotoBreakerAntenaS3ApagadoRef = useRef(fotoBreakerAntenaS3Apagado);
  const fotosConsumoFinalAntenaS3Ref = useRef(fotosConsumoFinalAntenaS3);
  const ampereConsumoFinalAntenaS3Ref = useRef(ampereConsumoFinalAntenaS3);
  const fotoConsumoInicialCcAntenaS3Ref = useRef(fotoConsumoInicialCcAntenaS3);
  const fotoConsumoFinalCcAntenaS3Ref = useRef(fotoConsumoFinalCcAntenaS3);
  const textoCompartida5GAntenaS3Ref = useRef(textoCompartida5GAntenaS3);
  const confirmadoApagadoAntenaS3Ref = useRef(confirmadoApagadoAntenaS3);

  // Alarmas Externas states & refs
  const alarmas = planning?.alarmasExternas;
  const [tecnologiaAlarmas, setTecnologiaAlarmas] = useState(alarmas?.tecnologiaAlarmas || '');
  const [fotoAlarmasOVP, setFotoAlarmasOVP] = useState(alarmas?.fotoAlarmasOVP || '');
  const [fotoAlarmasEquipos, setFotoAlarmasEquipos] = useState(alarmas?.fotoAlarmasEquipos || '');
  const [migraranTecnologia, setMigraranTecnologia] = useState(alarmas?.migraranTecnologia || '');
  const [fotoAlarmasMigradas, setFotoAlarmasMigradas] = useState(alarmas?.fotoAlarmasMigradas || '');
  const [fotoAlarmasFinalesOVP, setFotoAlarmasFinalesOVP] = useState(alarmas?.fotoAlarmasFinalesOVP || '');
  const [implementaranAlarmas, setImplementaranAlarmas] = useState(alarmas?.implementaranAlarmas || '');
  const [motivosNoImplementacion, setMotivosNoImplementacion] = useState(alarmas?.motivosNoImplementacion || '');
  const [fotoNoImplementacion, setFotoNoImplementacion] = useState(alarmas?.fotoNoImplementacion || '');
  const [tecnologiaImplementacion, setTecnologiaImplementacion] = useState(alarmas?.tecnologiaImplementacion || '');
  const [fotoAlarmasImplementadas, setFotoAlarmasImplementadas] = useState(alarmas?.fotoAlarmasImplementadas || '');

  const tecnologiaAlarmasRef = useRef(tecnologiaAlarmas);
  const fotoAlarmasOVPRef = useRef(fotoAlarmasOVP);
  const fotoAlarmasEquiposRef = useRef(fotoAlarmasEquipos);
  const migraranTecnologiaRef = useRef(migraranTecnologia);
  const fotoAlarmasMigradasRef = useRef(fotoAlarmasMigradas);
  const fotoAlarmasFinalesOVPRef = useRef(fotoAlarmasFinalesOVP);
  const implementaranAlarmasRef = useRef(implementaranAlarmas);
  const motivosNoImplementacionRef = useRef(motivosNoImplementacion);
  const fotoNoImplementacionRef = useRef(fotoNoImplementacion);
  const tecnologiaImplementacionRef = useRef(tecnologiaImplementacion);
  const fotoAlarmasImplementadasRef = useRef(fotoAlarmasImplementadas);

  // Evidencia Salida del Sitio states & refs
  const evidencia = planning?.evidenciaSalida;
  const [fotoRectificador, setFotoRectificador] = useState(evidencia?.fotoRectificador || '');
  const [fotoContenedor1, setFotoContenedor1] = useState(evidencia?.fotoContenedor1 || '');
  const [fotoContenedor2, setFotoContenedor2] = useState(evidencia?.fotoContenedor2 || '');
  const [fotoSitio1, setFotoSitio1] = useState(evidencia?.fotoSitio1 || '');
  const [fotoSitio2, setFotoSitio2] = useState(evidencia?.fotoSitio2 || '');
  const [fotoEstructuraSalida, setFotoEstructuraSalida] = useState(evidencia?.fotoEstructuraSalida || '');
  const [fotosConsumoFinalCaEvidencia, setFotosConsumoFinalCaEvidencia] = useState<string[]>(
    evidencia?.fotosConsumoFinalCaEvidencia || (tipoEmpalme === 'Trifásico' ? ['', '', ''] : [''])
  );
  const [ampereConsumoFinalCaEvidencia, setAmpereConsumoFinalCaEvidencia] = useState<string[]>(
    evidencia?.ampereConsumoFinalCaEvidencia || (tipoEmpalme === 'Trifásico' ? ['', '', ''] : [''])
  );
  const [fotoConsumoFinalCcRectificador, setFotoConsumoFinalCcRectificador] = useState(
    evidencia?.fotoConsumoFinalCcRectificador || ''
  );
  const [ampereDisplayRectificadorFinal, setAmpereDisplayRectificadorFinal] = useState(
    evidencia?.ampereDisplayRectificadorFinal || ''
  );

  const fotoRectificadorRef = useRef(fotoRectificador);
  const fotoContenedor1Ref = useRef(fotoContenedor1);
  const fotoContenedor2Ref = useRef(fotoContenedor2);
  const fotoSitio1Ref = useRef(fotoSitio1);
  const fotoSitio2Ref = useRef(fotoSitio2);
  const fotoEstructuraSalidaRef = useRef(fotoEstructuraSalida);
  const fotosConsumoFinalCaEvidenciaRef = useRef(fotosConsumoFinalCaEvidencia);
  const ampereConsumoFinalCaEvidenciaRef = useRef(ampereConsumoFinalCaEvidencia);
  const fotoConsumoFinalCcRectificadorRef = useRef(fotoConsumoFinalCcRectificador);
  const ampereDisplayRectificadorFinalRef = useRef(ampereDisplayRectificadorFinal);

  // Refs estables para guardar sin crear dependencias reactivas
  const planningIdRef = useRef(planning?.id);
  const observacionesRef = useRef(observaciones);
  const fotosRef = useRef(fotos);

  // Estados para controlar el popup de avance de la subida
  const [uploadVisible, setUploadVisible] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');

  const contextRef = useRef(context);


  // Refs Datos Generales
  const tipoEstructuraRef = useRef(tipoEstructura);
  const tipoContenedorRef = useRef(tipoContenedor);
  const tipoEmpalmeRef = useRef(tipoEmpalme);
  const fotosEmpalmeRef = useRef(fotosEmpalme);
  const capacidadProteccionRef = useRef(capacidadProteccion);
  const fotoMedidorRef = useRef(fotoMedidor);
  const fotoSectorMedidorRef = useRef(fotoSectorMedidor);
  const numeroMedidorRef = useRef(numeroMedidor);
  const lecturaConsumoRef = useRef(lecturaConsumo);
  const fotoDisplayRectificadorRef = useRef(fotoDisplayRectificador);
  const ampereDisplayRectificadorRef = useRef(ampereDisplayRectificador);
  
  const fotoEstructuraRef = useRef(fotoEstructura);
  const fotoFueraContenedorRef = useRef(fotoFueraContenedor);
  const fotosGeneralesSitioRef = useRef(fotosGeneralesSitio);
  const fotosInteriorContenedorRef = useRef(fotosInteriorContenedor);

  const estado3GRef = useRef(estado3G);
  const seApagara3GRef = useRef(seApagara3G);
  const estadoRRURef = useRef(estadoRRU);
  const seApagaraRRURef = useRef(seApagaraRRU);

  const fotoEquipo3GEncendidoRef = useRef(fotoEquipo3GEncendido);
  const fotoBreaker3GEncendidoRef = useRef(fotoBreaker3GEncendido);
  const fotoBreaker3GApagadoRef = useRef(fotoBreaker3GApagado);
  const fotoEquipo3GApagadoRef = useRef(fotoEquipo3GApagado);
  const fotoEspacioRetiradoRef = useRef(fotoEspacioRetirado);
  const seRetirara3GRef = useRef(seRetirara3G);
  const fotoRRUEncendidoRef = useRef(fotoRRUEncendido);
  const fotoRRUApagadoRef = useRef(fotoRRUApagado);
  const ampereEmpalmeRef = useRef(ampereEmpalme);
  const ampere3GEncendidoRef = useRef(ampere3GEncendido);

  // Mantener refs sincronizados
  observacionesRef.current = observaciones;
  fotosRef.current = fotos;
  contextRef.current = context;
  tipoEstructuraRef.current = tipoEstructura;
  tipoContenedorRef.current = tipoContenedor;
  tipoEmpalmeRef.current = tipoEmpalme;
  fotosEmpalmeRef.current = fotosEmpalme;
  capacidadProteccionRef.current = capacidadProteccion;
  fotoMedidorRef.current = fotoMedidor;
  fotoSectorMedidorRef.current = fotoSectorMedidor;
  numeroMedidorRef.current = numeroMedidor;
  lecturaConsumoRef.current = lecturaConsumo;
  fotoDisplayRectificadorRef.current = fotoDisplayRectificador;
  ampereDisplayRectificadorRef.current = ampereDisplayRectificador;
  
  fotoEstructuraRef.current = fotoEstructura;
  fotoFueraContenedorRef.current = fotoFueraContenedor;
  fotosGeneralesSitioRef.current = fotosGeneralesSitio;
  fotosInteriorContenedorRef.current = fotosInteriorContenedor;
  
  estado3GRef.current = estado3G;
  seApagara3GRef.current = seApagara3G;
  estadoRRURef.current = estadoRRU;
  seApagaraRRURef.current = seApagaraRRU;

  tipoChapaRef.current = tipoChapa;
  nroSerieRef.current = nroSerie;
  estadoInicialChapaRef.current = estadoInicialChapa;
  fotoChapaAnteriorRef.current = fotoChapaAnterior;
  fotoNuevaChapaRef.current = fotoNuevaChapa;
  fotoLlaveProgramacionRef.current = fotoLlaveProgramacion;
  fotoPuertaCerradaRef.current = fotoPuertaCerrada;
  estadoFinalChapaRef.current = estadoFinalChapa;
  justificacionChapaRef.current = justificacionChapa;

  estadoBasebandSector1Ref.current = estadoBasebandSector1;
  fotoBreakerBaseband1EncendidoRef.current = fotoBreakerBaseband1Encendido;
  fotoBaseband1EncendidaRef.current = fotoBaseband1Encendida;
  confirmadoApagadoRetirarRef.current = confirmadoApagadoRetirar;
  fotoBreakerBaseband1ApagadoRef.current = fotoBreakerBaseband1Apagado;
  fotoEspacioBaseband1RetiradaRef.current = fotoEspacioBaseband1Retirada;
  fotosConsumoFinalRef.current = fotosConsumoFinal;
  ampereConsumoFinalRef.current = ampereConsumoFinal;
  fotoConsumoInicialCc1Ref.current = fotoConsumoInicialCc1;
  ampereConsumoInicialCc1Ref.current = ampereConsumoInicialCc1;
  fotoConsumoFinalCc1Ref.current = fotoConsumoFinalCc1;
  ampereConsumoFinalCc1Ref.current = ampereConsumoFinalCc1;

  estadoBasebandSector2Ref.current = estadoBasebandSector2;
  fotoBreakerBaseband2EncendidoRef.current = fotoBreakerBaseband2Encendido;
  fotoBaseband2EncendidaRef.current = fotoBaseband2Encendida;
  confirmadoApagadoRetirarS2Ref.current = confirmadoApagadoRetirarS2;
  fotoBreakerBaseband2ApagadoRef.current = fotoBreakerBaseband2Apagado;
  fotoEspacioBaseband2RetiradaRef.current = fotoEspacioBaseband2Retirada;
  fotosConsumoFinalS2Ref.current = fotosConsumoFinalS2;
  ampereConsumoFinalS2Ref.current = ampereConsumoFinalS2;
  fotoConsumoInicialCc2Ref.current = fotoConsumoInicialCc2;
  ampereConsumoInicialCc2Ref.current = ampereConsumoInicialCc2;
  fotoConsumoFinalCc2Ref.current = fotoConsumoFinalCc2;
  ampereConsumoFinalCc2Ref.current = ampereConsumoFinalCc2;

  estadoBasebandSector3Ref.current = estadoBasebandSector3;
  fotoBreakerBaseband3EncendidoRef.current = fotoBreakerBaseband3Encendido;
  fotoBaseband3EncendidaRef.current = fotoBaseband3Encendida;
  confirmadoApagadoRetirarS3Ref.current = confirmadoApagadoRetirarS3;
  fotoBreakerBaseband3ApagadoRef.current = fotoBreakerBaseband3Apagado;
  fotoEspacioBaseband3RetiradaRef.current = fotoEspacioBaseband3Retirada;
  fotosConsumoFinalS3Ref.current = fotosConsumoFinalS3;
  ampereConsumoFinalS3Ref.current = ampereConsumoFinalS3;
  fotoConsumoInicialCc3Ref.current = fotoConsumoInicialCc3;
  ampereConsumoInicialCc3Ref.current = ampereConsumoInicialCc3;
  fotoConsumoFinalCc3Ref.current = fotoConsumoFinalCc3;
  ampereConsumoFinalCc3Ref.current = ampereConsumoFinalCc3;

  estadoAntenaSector1Ref.current = estadoAntenaSector1;
  fotoBreakerAntenaS1EncendidoRef.current = fotoBreakerAntenaS1Encendido;
  seApagaraAntenaS1Ref.current = seApagaraAntenaS1;
  fotoBreakerAntenaS1ApagadoRef.current = fotoBreakerAntenaS1Apagado;
  fotosConsumoFinalAntenaS1Ref.current = fotosConsumoFinalAntenaS1;
  ampereConsumoFinalAntenaS1Ref.current = ampereConsumoFinalAntenaS1;
  fotoConsumoInicialCcAntenaS1Ref.current = fotoConsumoInicialCcAntenaS1;
  fotoConsumoFinalCcAntenaS1Ref.current = fotoConsumoFinalCcAntenaS1;
  textoCompartida5GAntenaS1Ref.current = textoCompartida5GAntenaS1;
  confirmadoApagadoAntenaS1Ref.current = confirmadoApagadoAntenaS1;

  estadoAntenaSector2Ref.current = estadoAntenaSector2;
  fotoBreakerAntenaS2EncendidoRef.current = fotoBreakerAntenaS2Encendido;
  seApagaraAntenaS2Ref.current = seApagaraAntenaS2;
  fotoBreakerAntenaS2ApagadoRef.current = fotoBreakerAntenaS2Apagado;
  fotosConsumoFinalAntenaS2Ref.current = fotosConsumoFinalAntenaS2;
  ampereConsumoFinalAntenaS2Ref.current = ampereConsumoFinalAntenaS2;
  fotoConsumoInicialCcAntenaS2Ref.current = fotoConsumoInicialCcAntenaS2;
  fotoConsumoFinalCcAntenaS2Ref.current = fotoConsumoFinalCcAntenaS2;
  textoCompartida5GAntenaS2Ref.current = textoCompartida5GAntenaS2;
  confirmadoApagadoAntenaS2Ref.current = confirmadoApagadoAntenaS2;

  estadoAntenaSector3Ref.current = estadoAntenaSector3;
  fotoBreakerAntenaS3EncendidoRef.current = fotoBreakerAntenaS3Encendido;
  seApagaraAntenaS3Ref.current = seApagaraAntenaS3;
  fotoBreakerAntenaS3ApagadoRef.current = fotoBreakerAntenaS3Apagado;
  fotosConsumoFinalAntenaS3Ref.current = fotosConsumoFinalAntenaS3;
  ampereConsumoFinalAntenaS3Ref.current = ampereConsumoFinalAntenaS3;
  fotoConsumoInicialCcAntenaS3Ref.current = fotoConsumoInicialCcAntenaS3;
  fotoConsumoFinalCcAntenaS3Ref.current = fotoConsumoFinalCcAntenaS3;
  textoCompartida5GAntenaS3Ref.current = textoCompartida5GAntenaS3;
  confirmadoApagadoAntenaS3Ref.current = confirmadoApagadoAntenaS3;

  const getProgressColor = (pct: number) => {
    if (pct === 100) return colors.success;
    if (pct > 70) return colors.primary;
    if (pct > 30) return '#FF9500'; // Orange
    return colors.danger; // Red
  };
  
  fotoEquipo3GEncendidoRef.current = fotoEquipo3GEncendido;
  fotoBreaker3GEncendidoRef.current = fotoBreaker3GEncendido;
  fotoBreaker3GApagadoRef.current = fotoBreaker3GApagado;
  fotoEquipo3GApagadoRef.current = fotoEquipo3GApagado;
  fotoEspacioRetiradoRef.current = fotoEspacioRetirado;
  seRetirara3GRef.current = seRetirara3G;
  fotoRRUEncendidoRef.current = fotoRRUEncendido;
  fotoRRUApagadoRef.current = fotoRRUApagado;
  ampereEmpalmeRef.current = ampereEmpalme;
  ampere3GEncendidoRef.current = ampere3GEncendido;

  tecnologiaAlarmasRef.current = tecnologiaAlarmas;
  fotoAlarmasOVPRef.current = fotoAlarmasOVP;
  fotoAlarmasEquiposRef.current = fotoAlarmasEquipos;
  migraranTecnologiaRef.current = migraranTecnologia;
  fotoAlarmasMigradasRef.current = fotoAlarmasMigradas;
  fotoAlarmasFinalesOVPRef.current = fotoAlarmasFinalesOVP;
  implementaranAlarmasRef.current = implementaranAlarmas;
  motivosNoImplementacionRef.current = motivosNoImplementacion;
  fotoNoImplementacionRef.current = fotoNoImplementacion;
  tecnologiaImplementacionRef.current = tecnologiaImplementacion;
  fotoAlarmasImplementadasRef.current = fotoAlarmasImplementadas;

  fotoRectificadorRef.current = fotoRectificador;
  fotoContenedor1Ref.current = fotoContenedor1;
  fotoContenedor2Ref.current = fotoContenedor2;
  fotoSitio1Ref.current = fotoSitio1;
  fotoSitio2Ref.current = fotoSitio2;
  fotoEstructuraSalidaRef.current = fotoEstructuraSalida;
  fotosConsumoFinalCaEvidenciaRef.current = fotosConsumoFinalCaEvidencia;
  ampereConsumoFinalCaEvidenciaRef.current = ampereConsumoFinalCaEvidencia;
  fotoConsumoFinalCcRectificadorRef.current = fotoConsumoFinalCcRectificador;
  ampereDisplayRectificadorFinalRef.current = ampereDisplayRectificadorFinal;
  
  // Estado temporal para procesar la imagen pendiente
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [pendingTimestamp, setPendingTimestamp] = useState<string>('');
  const [pendingCoords, setPendingCoords] = useState<{lat: number, lng: number} | null>(null);
  const [entryCoords, setEntryCoords] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    const fetchEntryLocation = async () => {
      if (isReadOnly) return;
      try {
        console.log("📍 Capturando geolocalización al ingresar al apartado...");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const coords = { lat: location.coords.latitude, lng: location.coords.longitude };
          console.log("📍 Geolocalización de entrada obtenida con éxito:", coords);
          setEntryCoords(coords);
        } else {
          console.warn("⚠️ Permiso de ubicación denegado al ingresar al apartado.");
        }
      } catch (e) {
        console.warn("❌ Error al capturar geolocalización al ingresar al apartado:", e);
      }
    };

    fetchEntryLocation();
  }, [planningId, isReadOnly]);

  // Para saber a qué campo asignar la foto que se está procesando (usamos Ref para evitar problemas de cierres en async)
  const photoTargetRef = useRef<string>('hallazgos');
  const pendingIndexRef = useRef<number | null>(null);

  const hasLoadedDataRef = useRef(false);

  // ── Sincronizar estados de fotos desde el contexto cuando el planning cambia ──
  // Esto es crítico para coordinadores/admins en modo lectura: cuando fetchAndSyncPlanning
  // actualiza el planning en el contexto (después de descargar el informe), los useState
  // que ya se inicializaron no se re-inicializan automáticamente. Este efecto los sincroniza.
  useEffect(() => {
    if (!planning) return;

    // Si no es read-only y ya cargamos los datos (después de terminar la sincronización), no volver a sobreescribir para no perder cambios locales en caliente.
    if (!isReadOnly && hasLoadedDataRef.current && !isSyncingFromDb) return;

    if (!isSyncingFromDb) {
      hasLoadedDataRef.current = true;
    }

    // Helper local: preservar URLs para el trabajador, y para coordinadores solo URLs del servidor (http://...)
    const isWorker = context?.currentUser?.role === 'Trabajador';
    const srv = (uri?: string) => {
      if (!uri) return '';
      if (isWorker) return uri; // El trabajador puede ver fotos locales (file://) y de red (http://)
      return uri.startsWith('http') ? uri : ''; // El coordinador solo ve fotos subidas
    };
    const srvArr = (arr?: string[]) => (arr || []).map(u => srv(u)).filter(Boolean);

    // Hallazgos Previos
    if (planning.hallazgos) {
      setObservaciones(planning.hallazgos.observaciones || '');
      setFotos((planning.hallazgos.fotos || []).map(u => srv(u)).filter(Boolean));
    }

    // Alarmas Externas
    if (planning.alarmasExternas) {
      const al = planning.alarmasExternas;
      setTecnologiaAlarmas(al.tecnologiaAlarmas || '');
      setFotoAlarmasOVP(srv(al.fotoAlarmasOVP));
      setFotoAlarmasEquipos(srv(al.fotoAlarmasEquipos));
      setMigraranTecnologia(al.migraranTecnologia || '');
      setFotoAlarmasMigradas(srv(al.fotoAlarmasMigradas));
      setFotoAlarmasFinalesOVP(srv(al.fotoAlarmasFinalesOVP));
      setImplementaranAlarmas(al.implementaranAlarmas || '');
      setMotivosNoImplementacion(al.motivosNoImplementacion || '');
      setFotoNoImplementacion(srv(al.fotoNoImplementacion));
      setTecnologiaImplementacion(al.tecnologiaImplementacion || '');
      setFotoAlarmasImplementadas(srv(al.fotoAlarmasImplementadas));
    }

    // Evidencia Salida
    if (planning.evidenciaSalida) {
      const ev = planning.evidenciaSalida;
      setFotoRectificador(srv(ev.fotoRectificador));
      setFotoContenedor1(srv(ev.fotoContenedor1));
      setFotoContenedor2(srv(ev.fotoContenedor2));
      setFotoSitio1(srv(ev.fotoSitio1));
      setFotoSitio2(srv(ev.fotoSitio2));
      setFotoEstructuraSalida(srv(ev.fotoEstructuraSalida));
      
      const empalmeType = planning.datosGenerales?.tipoEmpalme || '';
      setFotosConsumoFinalCaEvidencia(srvArr(ev.fotosConsumoFinalCaEvidencia || (empalmeType === 'Trifásico' ? ['', '', ''] : [''])));
      setAmpereConsumoFinalCaEvidencia(ev.ampereConsumoFinalCaEvidencia || (empalmeType === 'Trifásico' ? ['', '', ''] : ['']));
      setFotoConsumoFinalCcRectificador(srv(ev.fotoConsumoFinalCcRectificador));
      setAmpereDisplayRectificadorFinal(ev.ampereDisplayRectificadorFinal || '');
    }

    // Datos Generales
    if (planning.datosGenerales) {
      const dg = planning.datosGenerales;
      setTipoEstructura(dg.tipoEstructura || '');
      setTipoContenedor(dg.tipoContenedor || '');
      setTipoEmpalme(dg.tipoEmpalme || '');
      setFotosEmpalme(srvArr(dg.fotosEmpalme));
      setCapacidadProteccion(dg.capacidadProteccion || '');
      setFotoMedidor(srv(dg.fotoMedidor));
      setFotoSectorMedidor(srv(dg.fotoSectorMedidor));
      setNumeroMedidor(dg.numeroMedidor || '');
      setLecturaConsumo(dg.lecturaConsumo || '');
      setFotoEstructura(srv(dg.fotoEstructura));
      setFotoFueraContenedor(srv(dg.fotoFueraContenedor));
      setFotosGeneralesSitio(srvArr(dg.fotosGeneralesSitio));
      setFotosInteriorContenedor(srvArr(dg.fotosInteriorContenedor));
      setFotoDisplayRectificador(srv(dg.fotoDisplayRectificador));
      setAmpereDisplayRectificador(dg.ampereDisplayRectificador || '');
      setAmpereEmpalme(dg.ampereEmpalme || ['', '', '']);
    }

    // Apagado 3G
    if (planning.apagado3G) {
      const ap = planning.apagado3G;
      setEstado3G(ap.estado3G || '');
      setSeApagara3G(ap.seApagara3G || '');
      setEstadoRRU(ap.estadoRRU || '');
      setSeApagaraRRU(ap.seApagaraRRU || '');
      setFotoEquipo3GEncendido(srv(ap.fotoEquipo3GEncendido));
      setFotoBreaker3GEncendido(srv(ap.fotoBreaker3GEncendido));
      setFotoBreaker3GApagado(srv(ap.fotoBreaker3GApagado));
      setFotoEquipo3GApagado(srv(ap.fotoEquipo3GApagado));
      setFotoEspacioRetirado(srv(ap.fotoEspacioRetirado));
      setSeRetirara3G(ap.seRetirara3G || '');
      setFotoRRUEncendido(srv(ap.fotoRRUEncendido));
      setFotoRRUApagado(srv(ap.fotoRRUApagado));
      setAmpere3GEncendido(ap.ampere3GEncendido || '');
    }

    // Apagado BAFI S1
    if (planning.apagadoBafiSector1) {
      const b = planning.apagadoBafiSector1;
      setEstadoBasebandSector1(b.estadoBasebandSector1 || '');
      setFotoBreakerBaseband1Encendido(srv(b.fotoBreakerBaseband1Encendido));
      setFotoBaseband1Encendida(srv(b.fotoBaseband1Encendida));
      setConfirmadoApagadoRetirar(b.confirmadoApagadoRetirar || false);
      setFotoBreakerBaseband1Apagado(srv(b.fotoBreakerBaseband1Apagado));
      setFotoEspacioBaseband1Retirada(srv(b.fotoEspacioBaseband1Retirada));
      setFotosConsumoFinal(srvArr(b.fotosConsumoFinal));
      setFotoConsumoInicialCc1(srv(b.fotoConsumoInicialCc));
      setAmpereConsumoInicialCc1(b.ampereConsumoInicialCc || '');
      setFotoConsumoFinalCc1(srv(b.fotoConsumoFinalCc));
      setAmpereConsumoFinalCc1(b.ampereConsumoFinalCc || '');
    }

    // Apagado BAFI S2
    if (planning.apagadoBafiSector2) {
      const b = planning.apagadoBafiSector2;
      setEstadoBasebandSector2(b.estadoBasebandSector2 || '');
      setFotoBreakerBaseband2Encendido(srv(b.fotoBreakerBaseband2Encendido));
      setFotoBaseband2Encendida(srv(b.fotoBaseband2Encendida));
      setConfirmadoApagadoRetirarS2(b.confirmadoApagadoRetirar || false);
      setFotoBreakerBaseband2Apagado(srv(b.fotoBreakerBaseband2Apagado));
      setFotoEspacioBaseband2Retirada(srv(b.fotoEspacioBaseband2Retirada));
      setFotosConsumoFinalS2(srvArr(b.fotosConsumoFinal));
      setFotoConsumoInicialCc2(srv(b.fotoConsumoInicialCc));
      setAmpereConsumoInicialCc2(b.ampereConsumoInicialCc || '');
      setFotoConsumoFinalCc2(srv(b.fotoConsumoFinalCc));
      setAmpereConsumoFinalCc2(b.ampereConsumoFinalCc || '');
    }

    // Apagado BAFI S3
    if (planning.apagadoBafiSector3) {
      const b = planning.apagadoBafiSector3;
      setEstadoBasebandSector3(b.estadoBasebandSector3 || '');
      setFotoBreakerBaseband3Encendido(srv(b.fotoBreakerBaseband3Encendido));
      setFotoBaseband3Encendida(srv(b.fotoBaseband3Encendida));
      setConfirmadoApagadoRetirarS3(b.confirmadoApagadoRetirar || false);
      setFotoBreakerBaseband3Apagado(srv(b.fotoBreakerBaseband3Apagado));
      setFotoEspacioBaseband3Retirada(srv(b.fotoEspacioBaseband3Retirada));
      setFotosConsumoFinalS3(srvArr(b.fotosConsumoFinal));
      setFotoConsumoInicialCc3(srv(b.fotoConsumoInicialCc));
      setAmpereConsumoInicialCc3(b.ampereConsumoInicialCc || '');
      setFotoConsumoFinalCc3(srv(b.fotoConsumoFinalCc));
      setAmpereConsumoFinalCc3(b.ampereConsumoFinalCc || '');
    }

    // Antenas S1, S2, S3
    if (planning.apagadoAntenaSector1) {
      const a = planning.apagadoAntenaSector1;
      setEstadoAntenaSector1(a.estadoAntenaSector1 || '');
      setFotoBreakerAntenaS1Encendido(srv(a.fotoBreakerAntenaS1Encendido));
      setSeApagaraAntenaS1(a.seApagaraAntenaS1 || '');
      setFotoBreakerAntenaS1Apagado(srv(a.fotoBreakerAntenaS1Apagado));
      setFotosConsumoFinalAntenaS1(srvArr(a.fotosConsumoFinal));
      setFotoConsumoInicialCcAntenaS1(srv(a.fotoConsumoInicialCc));
      setFotoConsumoFinalCcAntenaS1(srv(a.fotoConsumoFinalCc));
      setTextoCompartida5GAntenaS1(a.textoCompartida5G || '');
      setConfirmadoApagadoAntenaS1(a.confirmadoApagadoAntena || false);
    }
    if (planning.apagadoAntenaSector2) {
      const a = planning.apagadoAntenaSector2;
      setEstadoAntenaSector2(a.estadoAntenaSector2 || '');
      setFotoBreakerAntenaS2Encendido(srv(a.fotoBreakerAntenaS2Encendido));
      setSeApagaraAntenaS2(a.seApagaraAntenaS2 || '');
      setFotoBreakerAntenaS2Apagado(srv(a.fotoBreakerAntenaS2Apagado));
      setFotosConsumoFinalAntenaS2(srvArr(a.fotosConsumoFinal));
      setFotoConsumoInicialCcAntenaS2(srv(a.fotoConsumoInicialCc));
      setFotoConsumoFinalCcAntenaS2(srv(a.fotoConsumoFinalCc));
      setTextoCompartida5GAntenaS2(a.textoCompartida5G || '');
      setConfirmadoApagadoAntenaS2(a.confirmadoApagadoAntena || false);
    }
    if (planning.apagadoAntenaSector3) {
      const a = planning.apagadoAntenaSector3;
      setEstadoAntenaSector3(a.estadoAntenaSector3 || '');
      setFotoBreakerAntenaS3Encendido(srv(a.fotoBreakerAntenaS3Encendido));
      setSeApagaraAntenaS3(a.seApagaraAntenaS3 || '');
      setFotoBreakerAntenaS3Apagado(srv(a.fotoBreakerAntenaS3Apagado));
      setFotosConsumoFinalAntenaS3(srvArr(a.fotosConsumoFinal));
      setFotoConsumoInicialCcAntenaS3(srv(a.fotoConsumoInicialCc));
      setFotoConsumoFinalCcAntenaS3(srv(a.fotoConsumoFinalCc));
      setTextoCompartida5GAntenaS3(a.textoCompartida5G || '');
      setConfirmadoApagadoAntenaS3(a.confirmadoApagadoAntena || false);
    }

    // Cambio de Chapa (iLOQ)
    if (planning.cambioChapa) {
      const cc = planning.cambioChapa;
      setTipoChapa(cc.tipoChapa || '');
      setNroSerie(cc.nroSerie || '');
      setEstadoInicialChapa(cc.estadoInicial || '');
      setFotoChapaAnterior(srv(cc.fotoChapaAnterior));
      setFotoNuevaChapa(srv(cc.fotoNuevaChapa));
      setFotoLlaveProgramacion(srv(cc.fotoLlaveProgramacion));
      setFotoPuertaCerrada(srv(cc.fotoPuertaCerrada));
      setEstadoFinalChapa(cc.estadoFinal || '');
      setJustificacionChapa(cc.justificacion || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planning, isSyncingFromDb, isReadOnly]);


  // Estado para UI
  const [isProcessing, setIsProcessing] = useState(false);

  // Preview modal
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  // Carpeta Hallazgos Previos: minimizada por defecto
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  // Carpeta Datos Generales: minimizada por defecto
  const [isDGOpen, setIsDGOpen] = useState(false);
  // Carpeta Apagado Equipo 3G1900: minimizada por defecto
  const [isApagadoOpen, setIsApagadoOpen] = useState(false);

  // Auto-guardar al salir de la pantalla usando el listener de navegación (estable, sin loops)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (planningIdRef.current && !isFinalizingRef.current) {
        contextRef.current?.updatePlanning(planningIdRef.current, {
          hallazgos: {
            observaciones: observacionesRef.current,
            fotos: fotosRef.current,
          },
          datosGenerales: {
            tipoEstructura: tipoEstructuraRef.current,
            tipoContenedor: tipoContenedorRef.current,
            tipoEmpalme: tipoEmpalmeRef.current,
            fotosEmpalme: fotosEmpalmeRef.current,
            capacidadProteccion: capacidadProteccionRef.current,
            fotoMedidor: fotoMedidorRef.current,
            fotoSectorMedidor: fotoSectorMedidorRef.current,
            numeroMedidor: numeroMedidorRef.current,
            lecturaConsumo: lecturaConsumoRef.current,
            fotoEstructura: fotoEstructuraRef.current,
            fotoFueraContenedor: fotoFueraContenedorRef.current,
            fotosGeneralesSitio: fotosGeneralesSitioRef.current,
            fotosInteriorContenedor: fotosInteriorContenedorRef.current,
            ampereEmpalme: ampereEmpalmeRef.current,
            fotoDisplayRectificador: fotoDisplayRectificadorRef.current,
            ampereDisplayRectificador: ampereDisplayRectificadorRef.current,
          },
          cambioChapa: isIloq ? {
            tipoChapa: tipoChapaRef.current,
            nroSerie: nroSerieRef.current,
            estadoInicial: estadoInicialChapaRef.current,
            fotoChapaAnterior: fotoChapaAnteriorRef.current,
            fotoNuevaChapa: fotoNuevaChapaRef.current,
            fotoLlaveProgramacion: fotoLlaveProgramacionRef.current,
            fotoPuertaCerrada: fotoPuertaCerradaRef.current,
            estadoFinal: estadoFinalChapaRef.current,
            justificacion: justificacionChapaRef.current,
          } : undefined,
          apagado3G: (!isIloq && !isApagadoBafi) ? {
            estado3G: estado3GRef.current,
            seApagara3G: seApagara3GRef.current,
            estadoRRU: estadoRRURef.current,
            seApagaraRRU: seApagaraRRURef.current,
            fotoEquipo3GEncendido: fotoEquipo3GEncendidoRef.current,
            fotoBreaker3GEncendido: fotoBreaker3GEncendidoRef.current,
            fotoBreaker3GApagado: fotoBreaker3GApagadoRef.current,
            fotoEquipo3GApagado: fotoEquipo3GApagadoRef.current,
            fotoEspacioRetirado: fotoEspacioRetiradoRef.current,
            seRetirara3G: seRetirara3GRef.current,
            fotoRRUEncendido: fotoRRUEncendidoRef.current,
            fotoRRUApagado: fotoRRUApagadoRef.current,
            ampere3GEncendido: ampere3GEncendidoRef.current,
          } : undefined,
          apagadoBafiSector1: isApagadoBafi ? {
            estadoBasebandSector1: estadoBasebandSector1Ref.current,
            fotoBreakerBaseband1Encendido: fotoBreakerBaseband1EncendidoRef.current,
            fotoBaseband1Encendida: fotoBaseband1EncendidaRef.current,
            confirmadoApagadoRetirar: confirmadoApagadoRetirarRef.current,
            fotoBreakerBaseband1Apagado: fotoBreakerBaseband1ApagadoRef.current,
            fotoEspacioBaseband1Retirada: fotoEspacioBaseband1RetiradaRef.current,
            fotosConsumoFinal: fotosConsumoFinalRef.current,
            ampereConsumoFinal: ampereConsumoFinalRef.current,
            fotoConsumoInicialCc: fotoConsumoInicialCc1Ref.current,
            ampereConsumoInicialCc: ampereConsumoInicialCc1Ref.current,
            fotoConsumoFinalCc: fotoConsumoFinalCc1Ref.current,
            ampereConsumoFinalCc: ampereConsumoFinalCc1Ref.current,
          } : undefined,
          apagadoBafiSector2: isApagadoBafi ? {
            estadoBasebandSector2: estadoBasebandSector2Ref.current,
            fotoBreakerBaseband2Encendido: fotoBreakerBaseband2EncendidoRef.current,
            fotoBaseband2Encendida: fotoBaseband2EncendidaRef.current,
            confirmadoApagadoRetirar: confirmadoApagadoRetirarS2Ref.current,
            fotoBreakerBaseband2Apagado: fotoBreakerBaseband2ApagadoRef.current,
            fotoEspacioBaseband2Retirada: fotoEspacioBaseband2RetiradaRef.current,
            fotosConsumoFinal: fotosConsumoFinalS2Ref.current,
            ampereConsumoFinal: ampereConsumoFinalS2Ref.current,
            fotoConsumoInicialCc: fotoConsumoInicialCc2Ref.current,
            ampereConsumoInicialCc: ampereConsumoInicialCc2Ref.current,
            fotoConsumoFinalCc: fotoConsumoFinalCc2Ref.current,
            ampereConsumoFinalCc: ampereConsumoFinalCc2Ref.current,
          } : undefined,
          apagadoBafiSector3: isApagadoBafi ? {
            estadoBasebandSector3: estadoBasebandSector3Ref.current,
            fotoBreakerBaseband3Encendido: fotoBreakerBaseband3EncendidoRef.current,
            fotoBaseband3Encendida: fotoBaseband3EncendidaRef.current,
            confirmadoApagadoRetirar: confirmadoApagadoRetirarS3Ref.current,
            fotoBreakerBaseband3Apagado: fotoBreakerBaseband3ApagadoRef.current,
            fotoEspacioBaseband3Retirada: fotoEspacioBaseband3RetiradaRef.current,
            fotosConsumoFinal: fotosConsumoFinalS3Ref.current,
            ampereConsumoFinal: ampereConsumoFinalS3Ref.current,
            fotoConsumoInicialCc: fotoConsumoInicialCc3Ref.current,
            ampereConsumoInicialCc: ampereConsumoInicialCc3Ref.current,
            fotoConsumoFinalCc: fotoConsumoFinalCc3Ref.current,
            ampereConsumoFinalCc: ampereConsumoFinalCc3Ref.current,
          } : undefined,
           apagadoAntenaSector1: isApagadoBafi ? {
            estadoAntenaSector1: estadoAntenaSector1Ref.current,
            fotoBreakerAntenaS1Encendido: fotoBreakerAntenaS1EncendidoRef.current,
            seApagaraAntenaS1: seApagaraAntenaS1Ref.current,
            fotoBreakerAntenaS1Apagado: fotoBreakerAntenaS1ApagadoRef.current,
            fotosConsumoFinal: fotosConsumoFinalAntenaS1Ref.current,
            ampereConsumoFinal: ampereConsumoFinalAntenaS1Ref.current,
            fotoConsumoInicialCc: fotoConsumoInicialCcAntenaS1Ref.current,
            fotoConsumoFinalCc: fotoConsumoFinalCcAntenaS1Ref.current,
            textoCompartida5G: textoCompartida5GAntenaS1Ref.current,
            confirmadoApagadoAntena: confirmadoApagadoAntenaS1Ref.current,
          } : undefined,
          apagadoAntenaSector2: isApagadoBafi ? {
            estadoAntenaSector2: estadoAntenaSector2Ref.current,
            fotoBreakerAntenaS2Encendido: fotoBreakerAntenaS2EncendidoRef.current,
            seApagaraAntenaS2: seApagaraAntenaS2Ref.current,
            fotoBreakerAntenaS2Apagado: fotoBreakerAntenaS2ApagadoRef.current,
            fotosConsumoFinal: fotosConsumoFinalAntenaS2Ref.current,
            ampereConsumoFinal: ampereConsumoFinalAntenaS2Ref.current,
            fotoConsumoInicialCc: fotoConsumoInicialCcAntenaS2Ref.current,
            fotoConsumoFinalCc: fotoConsumoFinalCcAntenaS2Ref.current,
            textoCompartida5G: textoCompartida5GAntenaS2Ref.current,
            confirmadoApagadoAntena: confirmadoApagadoAntenaS2Ref.current,
          } : undefined,
          apagadoAntenaSector3: isApagadoBafi ? {
            estadoAntenaSector3: estadoAntenaSector3Ref.current,
            fotoBreakerAntenaS3Encendido: fotoBreakerAntenaS3EncendidoRef.current,
            seApagaraAntenaS3: seApagaraAntenaS3Ref.current,
            fotoBreakerAntenaS3Apagado: fotoBreakerAntenaS3ApagadoRef.current,
            fotosConsumoFinal: fotosConsumoFinalAntenaS3Ref.current,
            ampereConsumoFinal: ampereConsumoFinalAntenaS3Ref.current,
            fotoConsumoInicialCc: fotoConsumoInicialCcAntenaS3Ref.current,
            fotoConsumoFinalCc: fotoConsumoFinalCcAntenaS3Ref.current,
            textoCompartida5G: textoCompartida5GAntenaS3Ref.current,
            confirmadoApagadoAntena: confirmadoApagadoAntenaS3Ref.current,
          } : undefined,
          alarmasExternas: !isIloq ? {
            tecnologiaAlarmas: tecnologiaAlarmasRef.current,
            fotoAlarmasOVP: fotoAlarmasOVPRef.current,
            fotoAlarmasEquipos: fotoAlarmasEquiposRef.current,
            migraranTecnologia: migraranTecnologiaRef.current,
            fotoAlarmasMigradas: fotoAlarmasMigradasRef.current,
            fotoAlarmasFinalesOVP: fotoAlarmasFinalesOVPRef.current,
            implementaranAlarmas: implementaranAlarmasRef.current,
            motivosNoImplementacion: motivosNoImplementacionRef.current,
            fotoNoImplementacion: fotoNoImplementacionRef.current,
            tecnologiaImplementacion: tecnologiaImplementacionRef.current,
            fotoAlarmasImplementadas: fotoAlarmasImplementadasRef.current,
          } : undefined,
          evidenciaSalida: !isIloq ? {
            fotoRectificador: fotoRectificadorRef.current,
            fotoContenedor1: fotoContenedor1Ref.current,
            fotoContenedor2: fotoContenedor2Ref.current,
            fotoSitio1: fotoSitio1Ref.current,
            fotoSitio2: fotoSitio2Ref.current,
            fotoEstructuraSalida: fotoEstructuraSalidaRef.current,
            fotosConsumoFinalCaEvidencia: fotosConsumoFinalCaEvidenciaRef.current,
            ampereConsumoFinalCaEvidencia: ampereConsumoFinalCaEvidenciaRef.current,
            fotoConsumoFinalCcRectificador: fotoConsumoFinalCcRectificadorRef.current,
            ampereDisplayRectificadorFinal: ampereDisplayRectificadorFinalRef.current,
          } : undefined,
        });
      }
    });
    return unsubscribe;
  }, [navigation]); // solo depende de navigation, que es estable

  // Guardado al colapsar carpeta
  const saveHallazgos = () => {
    if (planningIdRef.current) {
      contextRef.current?.updatePlanning(planningIdRef.current, {
        hallazgos: {
          observaciones: observacionesRef.current,
          fotos: fotosRef.current,
        }
      });
    }
  };

  const saveDG = () => {
    if (planningIdRef.current) {
      contextRef.current?.updatePlanning(planningIdRef.current, {
        datosGenerales: {
          tipoEstructura: tipoEstructuraRef.current,
          tipoContenedor: tipoContenedorRef.current,
          tipoEmpalme: tipoEmpalmeRef.current,
          fotosEmpalme: fotosEmpalmeRef.current,
          capacidadProteccion: capacidadProteccionRef.current,
          fotoMedidor: fotoMedidorRef.current,
          fotoSectorMedidor: fotoSectorMedidorRef.current,
          numeroMedidor: numeroMedidorRef.current,
          lecturaConsumo: lecturaConsumoRef.current,
          fotoEstructura: fotoEstructuraRef.current,
          fotoFueraContenedor: fotoFueraContenedorRef.current,
          fotosGeneralesSitio: fotosGeneralesSitioRef.current,
          fotosInteriorContenedor: fotosInteriorContenedorRef.current,
          ampereEmpalme: ampereEmpalmeRef.current,
          fotoDisplayRectificador: fotoDisplayRectificadorRef.current,
          ampereDisplayRectificador: ampereDisplayRectificadorRef.current,
        }
      });
    }
  };

  const saveAlarmasExternas = () => {
    if (planningIdRef.current) {
      contextRef.current?.updatePlanning(planningIdRef.current, {
        alarmasExternas: {
          tecnologiaAlarmas: tecnologiaAlarmasRef.current,
          fotoAlarmasOVP: fotoAlarmasOVPRef.current,
          fotoAlarmasEquipos: fotoAlarmasEquiposRef.current,
          migraranTecnologia: migraranTecnologiaRef.current,
          fotoAlarmasMigradas: fotoAlarmasMigradasRef.current,
          fotoAlarmasFinalesOVP: fotoAlarmasFinalesOVPRef.current,
          implementaranAlarmas: implementaranAlarmasRef.current,
          motivosNoImplementacion: motivosNoImplementacionRef.current,
          fotoNoImplementacion: fotoNoImplementacionRef.current,
          tecnologiaImplementacion: tecnologiaImplementacionRef.current,
          fotoAlarmasImplementadas: fotoAlarmasImplementadasRef.current,
        }
      });
    }
  };

  const saveEvidenciaSalida = () => {
    if (planningIdRef.current) {
      contextRef.current?.updatePlanning(planningIdRef.current, {
        evidenciaSalida: {
          fotoRectificador: fotoRectificadorRef.current,
          fotoContenedor1: fotoContenedor1Ref.current,
          fotoContenedor2: fotoContenedor2Ref.current,
          fotoSitio1: fotoSitio1Ref.current,
          fotoSitio2: fotoSitio2Ref.current,
          fotoEstructuraSalida: fotoEstructuraSalidaRef.current,
          fotosConsumoFinalCaEvidencia: fotosConsumoFinalCaEvidenciaRef.current,
          ampereConsumoFinalCaEvidencia: ampereConsumoFinalCaEvidenciaRef.current,
          fotoConsumoFinalCcRectificador: fotoConsumoFinalCcRectificadorRef.current,
          ampereDisplayRectificadorFinal: ampereDisplayRectificadorFinalRef.current,
        }
      });
    }
  };

  const saveApagado = () => {
    if (planningIdRef.current) {
      if (isApagadoBafi) {
        contextRef.current?.updatePlanning(planningIdRef.current, {
          apagadoBafiSector1: {
            estadoBasebandSector1: estadoBasebandSector1Ref.current,
            fotoBreakerBaseband1Encendido: fotoBreakerBaseband1EncendidoRef.current,
            fotoBaseband1Encendida: fotoBaseband1EncendidaRef.current,
            confirmadoApagadoRetirar: confirmadoApagadoRetirarRef.current,
            fotoBreakerBaseband1Apagado: fotoBreakerBaseband1ApagadoRef.current,
            fotoEspacioBaseband1Retirada: fotoEspacioBaseband1RetiradaRef.current,
            fotosConsumoFinal: fotosConsumoFinalRef.current,
            ampereConsumoFinal: ampereConsumoFinalRef.current,
            fotoConsumoInicialCc: fotoConsumoInicialCc1Ref.current,
            ampereConsumoInicialCc: ampereConsumoInicialCc1Ref.current,
            fotoConsumoFinalCc: fotoConsumoFinalCc1Ref.current,
            ampereConsumoFinalCc: ampereConsumoFinalCc1Ref.current,
          }
        });
      } else if (isIloq) {
        contextRef.current?.updatePlanning(planningIdRef.current, {
          cambioChapa: {
            tipoChapa: tipoChapaRef.current,
            nroSerie: nroSerieRef.current,
            estadoInicial: estadoInicialChapaRef.current,
            fotoChapaAnterior: fotoChapaAnteriorRef.current,
            fotoNuevaChapa: fotoNuevaChapaRef.current,
            fotoLlaveProgramacion: fotoLlaveProgramacionRef.current,
            fotoPuertaCerrada: fotoPuertaCerradaRef.current,
            estadoFinal: estadoFinalChapaRef.current,
            justificacion: justificacionChapaRef.current,
          }
        });
      } else {
        contextRef.current?.updatePlanning(planningIdRef.current, {
          apagado3G: {
            estado3G: estado3GRef.current,
            seApagara3G: seApagara3GRef.current,
            estadoRRU: estadoRRURef.current,
            seApagaraRRU: seApagaraRRURef.current,
            fotoEquipo3GEncendido: fotoEquipo3GEncendidoRef.current,
            fotoBreaker3GEncendido: fotoBreaker3GEncendidoRef.current,
            fotoBreaker3GApagado: fotoBreaker3GApagadoRef.current,
            fotoEquipo3GApagado: fotoEquipo3GApagadoRef.current,
            fotoEspacioRetirado: fotoEspacioRetiradoRef.current,
            seRetirara3G: seRetirara3GRef.current,
            fotoRRUEncendido: fotoRRUEncendidoRef.current,
            fotoRRUApagado: fotoRRUApagadoRef.current,
          }
        });
      }
    }
  };

  const saveBafiS2 = () => {
    if (planningIdRef.current) {
      contextRef.current?.updatePlanning(planningIdRef.current, {
        apagadoBafiSector2: {
          estadoBasebandSector2: estadoBasebandSector2Ref.current,
          fotoBreakerBaseband2Encendido: fotoBreakerBaseband2EncendidoRef.current,
          fotoBaseband2Encendida: fotoBaseband2EncendidaRef.current,
          confirmadoApagadoRetirar: confirmadoApagadoRetirarS2Ref.current,
          fotoBreakerBaseband2Apagado: fotoBreakerBaseband2ApagadoRef.current,
          fotoEspacioBaseband2Retirada: fotoEspacioBaseband2RetiradaRef.current,
          fotosConsumoFinal: fotosConsumoFinalS2Ref.current,
          ampereConsumoFinal: ampereConsumoFinalS2Ref.current,
          fotoConsumoInicialCc: fotoConsumoInicialCc2Ref.current,
          ampereConsumoInicialCc: ampereConsumoInicialCc2Ref.current,
          fotoConsumoFinalCc: fotoConsumoFinalCc2Ref.current,
          ampereConsumoFinalCc: ampereConsumoFinalCc2Ref.current,
        }
      });
    }
  };

  const saveBafiS3 = () => {
    if (planningIdRef.current) {
      contextRef.current?.updatePlanning(planningIdRef.current, {
        apagadoBafiSector3: {
          estadoBasebandSector3: estadoBasebandSector3Ref.current,
          fotoBreakerBaseband3Encendido: fotoBreakerBaseband3EncendidoRef.current,
          fotoBaseband3Encendida: fotoBaseband3EncendidaRef.current,
          confirmadoApagadoRetirar: confirmadoApagadoRetirarS3Ref.current,
          fotoBreakerBaseband3Apagado: fotoBreakerBaseband3ApagadoRef.current,
          fotoEspacioBaseband3Retirada: fotoEspacioBaseband3RetiradaRef.current,
          fotosConsumoFinal: fotosConsumoFinalS3Ref.current,
          ampereConsumoFinal: ampereConsumoFinalS3Ref.current,
          fotoConsumoInicialCc: fotoConsumoInicialCc3Ref.current,
          ampereConsumoInicialCc: ampereConsumoInicialCc3Ref.current,
          fotoConsumoFinalCc: fotoConsumoFinalCc3Ref.current,
          ampereConsumoFinalCc: ampereConsumoFinalCc3Ref.current,
        }
      });
    }
  };

  const saveAntenaS1 = () => {
    if (planningIdRef.current) {
      contextRef.current?.updatePlanning(planningIdRef.current, {
        apagadoAntenaSector1: {
          estadoAntenaSector1: estadoAntenaSector1Ref.current,
          fotoBreakerAntenaS1Encendido: fotoBreakerAntenaS1EncendidoRef.current,
          seApagaraAntenaS1: seApagaraAntenaS1Ref.current,
          fotoBreakerAntenaS1Apagado: fotoBreakerAntenaS1ApagadoRef.current,
          fotosConsumoFinal: fotosConsumoFinalAntenaS1Ref.current,
          ampereConsumoFinal: ampereConsumoFinalAntenaS1Ref.current,
          fotoConsumoInicialCc: fotoConsumoInicialCcAntenaS1Ref.current,
          fotoConsumoFinalCc: fotoConsumoFinalCcAntenaS1Ref.current,
          textoCompartida5G: textoCompartida5GAntenaS1Ref.current,
          confirmadoApagadoAntena: confirmadoApagadoAntenaS1Ref.current,
        }
      });
    }
  };

  const saveAntenaS2 = () => {
    if (planningIdRef.current) {
      contextRef.current?.updatePlanning(planningIdRef.current, {
        apagadoAntenaSector2: {
          estadoAntenaSector2: estadoAntenaSector2Ref.current,
          fotoBreakerAntenaS2Encendido: fotoBreakerAntenaS2EncendidoRef.current,
          seApagaraAntenaS2: seApagaraAntenaS2Ref.current,
          fotoBreakerAntenaS2Apagado: fotoBreakerAntenaS2ApagadoRef.current,
          fotosConsumoFinal: fotosConsumoFinalAntenaS2Ref.current,
          ampereConsumoFinal: ampereConsumoFinalAntenaS2Ref.current,
          fotoConsumoInicialCc: fotoConsumoInicialCcAntenaS2Ref.current,
          fotoConsumoFinalCc: fotoConsumoFinalCcAntenaS2Ref.current,
          textoCompartida5G: textoCompartida5GAntenaS2Ref.current,
          confirmadoApagadoAntena: confirmadoApagadoAntenaS2Ref.current,
        }
      });
    }
  };

  const saveAntenaS3 = () => {
    if (planningIdRef.current) {
      contextRef.current?.updatePlanning(planningIdRef.current, {
        apagadoAntenaSector3: {
          estadoAntenaSector3: estadoAntenaSector3Ref.current,
          fotoBreakerAntenaS3Encendido: fotoBreakerAntenaS3EncendidoRef.current,
          seApagaraAntenaS3: seApagaraAntenaS3Ref.current,
          fotoBreakerAntenaS3Apagado: fotoBreakerAntenaS3ApagadoRef.current,
          fotosConsumoFinal: fotosConsumoFinalAntenaS3Ref.current,
          ampereConsumoFinal: ampereConsumoFinalAntenaS3Ref.current,
          fotoConsumoInicialCc: fotoConsumoInicialCcAntenaS3Ref.current,
          fotoConsumoFinalCc: fotoConsumoFinalCcAntenaS3Ref.current,
          textoCompartida5G: textoCompartida5GAntenaS3Ref.current,
          confirmadoApagadoAntena: confirmadoApagadoAntenaS3Ref.current,
        }
      });
    }
  };

  const handleBackToDashboard = () => {
    if (activeFolder === 'datos') {
      saveDG();
    } else if (activeFolder === 'apagado') {
      saveApagado();
    } else if (activeFolder === 'bafiS2') {
      saveBafiS2();
    } else if (activeFolder === 'bafiS3') {
      saveBafiS3();
    } else if (activeFolder === 'antenaS1') {
      saveAntenaS1();
    } else if (activeFolder === 'antenaS2') {
      saveAntenaS2();
    } else if (activeFolder === 'antenaS3') {
      saveAntenaS3();
    } else if (activeFolder === 'hallazgos') {
      saveHallazgos();
    } else if (activeFolder === 'alarmasExternas') {
      saveAlarmasExternas();
    } else if (activeFolder === 'evidenciaSalida') {
      saveEvidenciaSalida();
    }
    setActiveFolder(null);
  };

  // Helper: en modo lectura (coordinador/admin), filtrar rutas locales del móvil del técnico.
  // Solo se muestran fotos con URL del servidor (http://...). Las rutas locales se tratan como vacías.
  const resolvePhotoUri = (uri: string | undefined): string => {
    if (!uri || !uri.trim()) return '';
    if (!isReadOnly) return uri;
    return uri.startsWith('http') ? uri : '';
  };

  const toggleFolder = () => {
    if (Platform.OS === 'ios') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (isFolderOpen) saveHallazgos(); // guardar al colapsar
    setIsFolderOpen(prev => !prev);
  };

  const toggleDG = () => {
    if (Platform.OS === 'ios') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (isDGOpen) saveDG(); // guardar al colapsar
    setIsDGOpen(prev => !prev);
  };

  const toggleApagado = () => {
    if (Platform.OS === 'ios') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (isApagadoOpen) saveApagado(); // guardar al colapsar
    setIsApagadoOpen(prev => !prev);
  };

  // Lógica para mostrar popup de apagado 3G después de subir fotos de encendido
  useEffect(() => {
    if (estado3G === 'Encendido' && fotoEquipo3GEncendido && fotoBreaker3GEncendido && seApagara3G === '') {
      Alert.alert(
        'Estado Inicial Equipo 3G1900',
        '¿Se apagará el equipo?',
        [
          { text: 'No', style: 'cancel', onPress: () => setSeApagara3G('No') },
          { text: 'Si', onPress: () => setSeApagara3G('Si') },
        ]
      );
    }
  }, [fotoEquipo3GEncendido, fotoBreaker3GEncendido, estado3G, seApagara3G]);

  // Lógica para mostrar popup de apagado RRU después de subir foto de encendido
  useEffect(() => {
    if (estadoRRU === 'Encendido' && fotoRRUEncendido && seApagaraRRU === '') {
      Alert.alert(
        'Estado Inicial Equipo RRU',
        '¿Se apagarán los equipos RRU?',
        [
          { text: 'No', style: 'cancel', onPress: () => setSeApagaraRRU('No') },
          { text: 'Si', onPress: () => setSeApagaraRRU('Si') },
        ]
      );
    }
  }, [fotoRRUEncendido, estadoRRU, seApagaraRRU]);

  // Lógica para mostrar popup de apagado Antena S1 después de subir foto de encendido
  useEffect(() => {
    if (estadoAntenaSector1 === 'Encendida' && fotoBreakerAntenaS1Encendido && seApagaraAntenaS1 === '') {
      Alert.alert(
        'Apagado Antena del Sector 1',
        '¿Se apagará Antena del Sector 1?',
        [
          { text: 'No', style: 'cancel', onPress: () => setSeApagaraAntenaS1('No') },
          { text: 'Si', onPress: () => setSeApagaraAntenaS1('Si') },
        ]
      );
    }
  }, [fotoBreakerAntenaS1Encendido, estadoAntenaSector1, seApagaraAntenaS1]);

  // Lógica para mostrar popup de apagado Antena S2 después de subir foto de encendido
  useEffect(() => {
    if (estadoAntenaSector2 === 'Encendida' && fotoBreakerAntenaS2Encendido && seApagaraAntenaS2 === '') {
      Alert.alert(
        'Apagado Antena del Sector 2',
        '¿Se apagará Antena del Sector 2?',
        [
          { text: 'No', style: 'cancel', onPress: () => setSeApagaraAntenaS2('No') },
          { text: 'Si', onPress: () => setSeApagaraAntenaS2('Si') },
        ]
      );
    }
  }, [fotoBreakerAntenaS2Encendido, estadoAntenaSector2, seApagaraAntenaS2]);

  // Lógica para mostrar popup de apagado Antena S3 después de subir foto de encendido
  useEffect(() => {
    if (estadoAntenaSector3 === 'Encendida' && fotoBreakerAntenaS3Encendido && seApagaraAntenaS3 === '') {
      Alert.alert(
        'Apagado Antena del Sector 3',
        '¿Se apagará Antena del Sector 3?',
        [
          { text: 'No', style: 'cancel', onPress: () => setSeApagaraAntenaS3('No') },
          { text: 'Si', onPress: () => setSeApagaraAntenaS3('Si') },
        ]
      );
    }
  }, [fotoBreakerAntenaS3Encendido, estadoAntenaSector3, seApagaraAntenaS3]);

  // Alarmas Externas interactive popups
  useEffect(() => {
    if ((tecnologiaAlarmas === '3G' || tecnologiaAlarmas === 'BAFI') && fotoAlarmasEquipos && fotoAlarmasOVP && migraranTecnologia === '') {
      Alert.alert(
        'Migración de Alarmas',
        '¿Hacia qué tecnología se migrarán?',
        [
          { text: 'LTE', onPress: () => setMigraranTecnologia('LTE') },
          { text: '5G', onPress: () => setMigraranTecnologia('5G') },
        ],
        { cancelable: false }
      );
    }
  }, [fotoAlarmasEquipos, fotoAlarmasOVP, tecnologiaAlarmas, migraranTecnologia]);

  useEffect(() => {
    if (tecnologiaAlarmas === 'No existen' && implementaranAlarmas === '') {
      Alert.alert(
        'Implementación de Alarmas',
        '¿Se implementarán Alarmas Externas?',
        [
          { text: 'No', style: 'cancel', onPress: () => setImplementaranAlarmas('No') },
          { text: 'Si', onPress: () => setImplementaranAlarmas('Si') },
        ],
        { cancelable: false }
      );
    }
  }, [tecnologiaAlarmas, implementaranAlarmas]);

  useEffect(() => {
    if (tecnologiaAlarmas === 'No existen' && implementaranAlarmas === 'Si' && tecnologiaImplementacion === '') {
      Alert.alert(
        'Tecnología de Implementación',
        '¿En qué tecnología se implementarán?',
        [
          { text: 'LTE', onPress: () => setTecnologiaImplementacion('LTE') },
          { text: '5G', onPress: () => setTecnologiaImplementacion('5G') },
        ],
        { cancelable: false }
      );
    }
  }, [tecnologiaAlarmas, implementaranAlarmas, tecnologiaImplementacion]);

  const handleTecnologiaAlarmasChange = (val: string) => {
    setTecnologiaAlarmas(val);
    setFotoAlarmasOVP('');
    setFotoAlarmasEquipos('');
    setMigraranTecnologia('');
    setFotoAlarmasMigradas('');
    setFotoAlarmasFinalesOVP('');
    setImplementaranAlarmas('');
    setMotivosNoImplementacion('');
    setFotoNoImplementacion('');
    setTecnologiaImplementacion('');
    setFotoAlarmasImplementadas('');
  };

  const handleImplementaranAlarmasChange = (val: string) => {
    setImplementaranAlarmas(val);
    setMotivosNoImplementacion('');
    setFotoNoImplementacion('');
    setTecnologiaImplementacion('');
    setFotoAlarmasImplementadas('');
    setFotoAlarmasFinalesOVP('');
  };

  const handleSeApagaraAntenaS1Change = (val: string) => {
    setSeApagaraAntenaS1(val);
    setConfirmadoApagadoAntenaS1(false);
    setFotoBreakerAntenaS1Encendido('');
    setFotoConsumoInicialCcAntenaS1('');
    setFotoBreakerAntenaS1Apagado('');
    setFotoConsumoFinalCcAntenaS1('');
    setTextoCompartida5GAntenaS1('');

    if (val === 'Si') {
      setEstadoAntenaSector1('Encendida');
    } else if (val === 'No') {
      setEstadoAntenaSector1('Apagada');
      setTextoCompartida5GAntenaS1('Compartida con 5G');
    } else if (val === 'N/A') {
      setEstadoAntenaSector1('N/A');
    }
  };

  const handleSeApagaraAntenaS2Change = (val: string) => {
    setSeApagaraAntenaS2(val);
    setConfirmadoApagadoAntenaS2(false);
    setFotoBreakerAntenaS2Encendido('');
    setFotoConsumoInicialCcAntenaS2('');
    setFotoBreakerAntenaS2Apagado('');
    setFotoConsumoFinalCcAntenaS2('');
    setTextoCompartida5GAntenaS2('');

    if (val === 'Si') {
      setEstadoAntenaSector2('Encendida');
    } else if (val === 'No') {
      setEstadoAntenaSector2('Apagada');
      setTextoCompartida5GAntenaS2('Compartida con 5G');
    } else if (val === 'N/A') {
      setEstadoAntenaSector2('N/A');
    }
  };

  const handleSeApagaraAntenaS3Change = (val: string) => {
    setSeApagaraAntenaS3(val);
    setConfirmadoApagadoAntenaS3(false);
    setFotoBreakerAntenaS3Encendido('');
    setFotoConsumoInicialCcAntenaS3('');
    setFotoBreakerAntenaS3Apagado('');
    setFotoConsumoFinalCcAntenaS3('');
    setTextoCompartida5GAntenaS3('');

    if (val === 'Si') {
      setEstadoAntenaSector3('Encendida');
    } else if (val === 'No') {
      setEstadoAntenaSector3('Apagada');
      setTextoCompartida5GAntenaS3('Compartida con 5G');
    } else if (val === 'N/A') {
      setEstadoAntenaSector3('N/A');
    }
  };

  useEffect(() => {
    if (
      seApagaraAntenaS1 === 'Si' &&
      fotoBreakerAntenaS1Encendido &&
      fotoConsumoInicialCcAntenaS1 &&
      !confirmadoApagadoAntenaS1
    ) {
      Alert.alert(
        'Apagar Breaker y Registrar Consumo Final',
        '',
        [
          {
            text: 'OK',
            onPress: () => {
              setConfirmadoApagadoAntenaS1(true);
            }
          }
        ],
        { cancelable: false }
      );
    }
  }, [fotoBreakerAntenaS1Encendido, fotoConsumoInicialCcAntenaS1, seApagaraAntenaS1, confirmadoApagadoAntenaS1]);

  useEffect(() => {
    if (
      seApagaraAntenaS2 === 'Si' &&
      fotoBreakerAntenaS2Encendido &&
      fotoConsumoInicialCcAntenaS2 &&
      !confirmadoApagadoAntenaS2
    ) {
      Alert.alert(
        'Apagar Breaker y Registrar Consumo Final',
        '',
        [
          {
            text: 'OK',
            onPress: () => {
              setConfirmadoApagadoAntenaS2(true);
            }
          }
        ],
        { cancelable: false }
      );
    }
  }, [fotoBreakerAntenaS2Encendido, fotoConsumoInicialCcAntenaS2, seApagaraAntenaS2, confirmadoApagadoAntenaS2]);

  useEffect(() => {
    if (
      seApagaraAntenaS3 === 'Si' &&
      fotoBreakerAntenaS3Encendido &&
      fotoConsumoInicialCcAntenaS3 &&
      !confirmadoApagadoAntenaS3
    ) {
      Alert.alert(
        'Apagar Breaker y Registrar Consumo Final',
        '',
        [
          {
            text: 'OK',
            onPress: () => {
              setConfirmadoApagadoAntenaS3(true);
            }
          }
        ],
        { cancelable: false }
      );
    }
  }, [fotoBreakerAntenaS3Encendido, fotoConsumoInicialCcAntenaS3, seApagaraAntenaS3, confirmadoApagadoAntenaS3]);

  const handleEstado3GChange = (val: string) => {
    setEstado3G(val);
    if (val === 'Encendido') {
      setSeApagara3G(''); 
      setSeRetirara3G('');
    } else if (val === 'Apagado') {
      setSeApagara3G('');
      Alert.alert(
        'Apagado de 3G 1900MHz',
        '¿Se retirará el equipo?',
        [
          { text: 'No', style: 'cancel', onPress: () => setSeRetirara3G('No') },
          { text: 'Si', onPress: () => setSeRetirara3G('Si') },
        ]
      );
    } else if (val === 'N/A') {
      setSeApagara3G('N/A');
      setSeRetirara3G('N/A');
    }
  };

  const handleEstadoRRUChange = (val: string) => {
    setEstadoRRU(val);
    if (val === 'Encendido') {
      setSeApagaraRRU(''); 
    } else if (val === 'Apagado') {
      setSeApagaraRRU('');
    } else if (val === 'N/A') {
      setSeApagaraRRU('N/A');
    }
  };

  const handleEstadoBasebandSector1Change = (val: string) => {
    setEstadoBasebandSector1(val);
    setConfirmadoApagadoRetirar(false);
    setFotoBreakerBaseband1Encendido('');
    setFotoBaseband1Encendida('');
    setFotoBreakerBaseband1Apagado('');
    setFotoEspacioBaseband1Retirada('');
    setFotosConsumoFinal(['', '', '']);
    setAmpereConsumoFinal(['', '', '']);

    if (val === 'Apagado') {
      Alert.alert(
        'Registrar Consumo Final y luego retirar Baseband S1',
        '',
        [
          {
            text: 'OK',
            onPress: () => {
              setConfirmadoApagadoRetirar(true);
            }
          }
        ],
        { cancelable: false }
      );
    }
  };

  useEffect(() => {
    if (
      estadoBasebandSector1 === 'Encendido' &&
      fotoConsumoInicialCc1 &&
      !confirmadoApagadoRetirar
    ) {
      Alert.alert(
        'Apagar Breaker, Registrar Consumo Final y luego retirar Baseband S1',
        '',
        [
          {
            text: 'OK',
            onPress: () => {
              setConfirmadoApagadoRetirar(true);
            }
          }
        ],
        { cancelable: false }
      );
    }
  }, [fotoConsumoInicialCc1, estadoBasebandSector1]);

  const handleEstadoBasebandSector2Change = (val: string) => {
    setEstadoBasebandSector2(val);
    setConfirmadoApagadoRetirarS2(false);
    setFotoBreakerBaseband2Encendido('');
    setFotoBaseband2Encendida('');
    setFotoBreakerBaseband2Apagado('');
    setFotoEspacioBaseband2Retirada('');
    setFotosConsumoFinalS2(['', '', '']);
    setAmpereConsumoFinalS2(['', '', '']);

    if (val === 'Apagado') {
      Alert.alert(
        'Registrar Consumo Final y luego retirar Baseband S2',
        '',
        [
          {
            text: 'OK',
            onPress: () => {
              setConfirmadoApagadoRetirarS2(true);
            }
          }
        ],
        { cancelable: false }
      );
    }
  };

  useEffect(() => {
    if (
      estadoBasebandSector2 === 'Encendido' &&
      fotoConsumoInicialCc2 &&
      !confirmadoApagadoRetirarS2
    ) {
      Alert.alert(
        'Apagar Breaker, Registrar Consumo Final y luego retirar Baseband S2',
        '',
        [
          {
            text: 'OK',
            onPress: () => {
              setConfirmadoApagadoRetirarS2(true);
            }
          }
        ],
        { cancelable: false }
      );
    }
  }, [fotoConsumoInicialCc2, estadoBasebandSector2]);

  const handleEstadoBasebandSector3Change = (val: string) => {
    setEstadoBasebandSector3(val);
    setConfirmadoApagadoRetirarS3(false);
    setFotoBreakerBaseband3Encendido('');
    setFotoBaseband3Encendida('');
    setFotoBreakerBaseband3Apagado('');
    setFotoEspacioBaseband3Retirada('');
    setFotosConsumoFinalS3(['', '', '']);
    setAmpereConsumoFinalS3(['', '', '']);

    if (val === 'Apagado') {
      Alert.alert(
        'Registrar Consumo Final y luego retirar Baseband S3',
        '',
        [
          {
            text: 'OK',
            onPress: () => {
              setConfirmadoApagadoRetirarS3(true);
            }
          }
        ],
        { cancelable: false }
      );
    }
  };

  useEffect(() => {
    if (
      estadoBasebandSector3 === 'Encendido' &&
      fotoConsumoInicialCc3 &&
      !confirmadoApagadoRetirarS3
    ) {
      Alert.alert(
        'Apagar Breaker, Registrar Consumo Final y luego retirar Baseband S3',
        '',
        [
          {
            text: 'OK',
            onPress: () => {
              setConfirmadoApagadoRetirarS3(true);
            }
          }
        ],
        { cancelable: false }
      );
    }
  }, [fotoConsumoInicialCc3, estadoBasebandSector3]);

  const viewShotRef = useRef<ViewShot>(null);

  const openGoogleMaps = () => {
    if (site) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${site.lat},${site.lng}`;
      Linking.openURL(url);
    }
  };

  const handleIniciarActividad = () => {
    if (planning) {
      const now = new Date();
      context?.updatePlanning(planning.id, {
        status: 'En ejecución',
        startTime: now.toISOString(),
      });
    }
  };

  const handlePickImage = (target: any, index: number | null = null) => {
    if (isReadOnly) return;
    photoTargetRef.current = target;
    pendingIndexRef.current = index;
    
    Alert.alert(
      "Añadir Evidencia",
      "La foto debe ser tomada en formato HORIZONTAL.",
      [
        { text: "Cámara", onPress: openCamera },
        { text: "Galería", onPress: openGallery },
        { text: "Cancelar", style: "cancel" }
      ]
    );
  };

  const processImageResult = async (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      
      if (asset.width < asset.height) {
        Alert.alert('Formato Inválido', 'La fotografía debe ser horizontal (apaisada). Rota tu teléfono e intenta de nuevo.');
        return;
      }
      
      const now = new Date();
      setPendingTimestamp(now.toLocaleString('es-CL'));

      // Obtener ubicación: usar la capturada al ingresar al apartado (entryCoords), o fallback a coords del sitio
      let coords = entryCoords || { lat: site?.lat || 0, lng: site?.lng || 0 };
      
      // Si por alguna razón no se ha capturado entryCoords todavía, intentamos obtenerla en caliente
      if (!entryCoords) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            coords = { lat: location.coords.latitude, lng: location.coords.longitude };
            setEntryCoords(coords); // Guardar para fotos subsiguientes
          }
        } catch (e) {
          console.warn("No se pudo obtener la ubicación actual en caliente, usando coordenadas del sitio.");
        }
      }
      
      setPendingCoords(coords);
      setPendingUri(asset.uri);
      setIsProcessing(true);

      const target = photoTargetRef.current;
      const index = pendingIndexRef.current;
      
      setTimeout(async () => {
        try {
          if (viewShotRef.current) {
            const watermarkedUri = await captureRef(viewShotRef, {
              format: 'jpg',
              quality: 0.8,
            });
            
            // Asignar la foto al destino correspondiente
            if (target === 'hallazgos') {
              setFotos(prev => [...prev, watermarkedUri]);
            } else if (target === 'fotosEmpalme') {
              setFotosEmpalme(prev => {
                const newFotos = [...prev];
                if (index !== null) newFotos[index] = watermarkedUri;
                return newFotos;
              });
              // Abrir modal de ampere
              setActiveAmpereTarget(null);
              setActiveAmpereIndex(index);
              setTempAmpere(ampereEmpalmeRef.current[index || 0] || '');
              setShowAmpereModal(true);
            } else if (target === 'fotoDisplayRectificador') {
              setFotoDisplayRectificador(watermarkedUri);
              // Abrir modal de ampere
              setActiveAmpereTarget('fotoDisplayRectificador');
              setActiveAmpereIndex(0);
              setTempAmpere(ampereDisplayRectificadorRef.current || '');
              setShowAmpereModal(true);
            } else if (target === 'fotoMedidor') {
              setFotoMedidor(watermarkedUri);
            } else if (target === 'fotoSectorMedidor') {
              setFotoSectorMedidor(watermarkedUri);
            } else if (target === 'fotoEstructura') {
              setFotoEstructura(watermarkedUri);
            } else if (target === 'fotoFueraContenedor') {
              setFotoFueraContenedor(watermarkedUri);
            } else if (target === 'fotosGeneralesSitio') {
              setFotosGeneralesSitio(prev => {
                const newFotos = [...prev];
                if (index !== null) newFotos[index] = watermarkedUri;
                return newFotos;
              });
            } else if (target === 'fotosInteriorContenedor') {
              setFotosInteriorContenedor(prev => {
                const newFotos = [...prev];
                if (index !== null) newFotos[index] = watermarkedUri;
                return newFotos;
              });
            } else if (target === 'fotoEquipo3GEncendido') {
              setFotoEquipo3GEncendido(watermarkedUri);
            } else if (target === 'fotoBreaker3GEncendido') {
              setFotoBreaker3GEncendido(watermarkedUri);
            } else if (target === 'fotoBreaker3GApagado') {
              setFotoBreaker3GApagado(watermarkedUri);
            } else if (target === 'fotoEquipo3GApagado') {
              setFotoEquipo3GApagado(watermarkedUri);
            } else if (target === 'fotoEspacioRetirado') {
              setFotoEspacioRetirado(watermarkedUri);
            } else if (target === 'fotoRRUEncendido') {
              setFotoRRUEncendido(watermarkedUri);
            } else if (target === 'fotoRRUApagado') {
              setFotoRRUApagado(watermarkedUri);
            } else if (target === 'fotoChapaAnterior') {
              setFotoChapaAnterior(watermarkedUri);
            } else if (target === 'fotoNuevaChapa') {
              setFotoNuevaChapa(watermarkedUri);
            } else if (target === 'fotoLlaveProgramacion') {
              setFotoLlaveProgramacion(watermarkedUri);
            } else if (target === 'fotoPuertaCerrada') {
              setFotoPuertaCerrada(watermarkedUri);
            } else if (target === 'fotoBreakerBaseband1Encendido') {
              setFotoBreakerBaseband1Encendido(watermarkedUri);
            } else if (target === 'fotoBaseband1Encendida') {
              setFotoBaseband1Encendida(watermarkedUri);
            } else if (target === 'fotoBreakerBaseband1Apagado') {
              setFotoBreakerBaseband1Apagado(watermarkedUri);
            } else if (target === 'fotoEspacioBaseband1Retirada') {
              setFotoEspacioBaseband1Retirada(watermarkedUri);
            } else if (target === 'fotoConsumoInicialCc1') {
              setFotoConsumoInicialCc1(watermarkedUri);
            } else if (target === 'fotoConsumoFinalCc1') {
              setFotoConsumoFinalCc1(watermarkedUri);
            } else if (target === 'fotosConsumoFinal') {
              setFotosConsumoFinal(prev => {
                const newFotos = [...prev];
                if (index !== null) newFotos[index] = watermarkedUri;
                return newFotos;
              });
              setActiveAmpereTarget('fotosConsumoFinal');
              setActiveAmpereIndex(index);
              setTempAmpere(ampereConsumoFinalRef.current[index || 0] || '');
              setShowAmpereModal(true);
            } else if (target === 'fotoBreakerBaseband2Encendido') {
              setFotoBreakerBaseband2Encendido(watermarkedUri);
            } else if (target === 'fotoBaseband2Encendida') {
              setFotoBaseband2Encendida(watermarkedUri);
            } else if (target === 'fotoBreakerBaseband2Apagado') {
              setFotoBreakerBaseband2Apagado(watermarkedUri);
            } else if (target === 'fotoEspacioBaseband2Retirada') {
              setFotoEspacioBaseband2Retirada(watermarkedUri);
            } else if (target === 'fotoConsumoInicialCc2') {
              setFotoConsumoInicialCc2(watermarkedUri);
            } else if (target === 'fotoConsumoFinalCc2') {
              setFotoConsumoFinalCc2(watermarkedUri);
            } else if (target === 'fotosConsumoFinalS2') {
              setFotosConsumoFinalS2(prev => {
                const newFotos = [...prev];
                if (index !== null) newFotos[index] = watermarkedUri;
                return newFotos;
              });
              setActiveAmpereTarget('fotosConsumoFinalS2');
              setActiveAmpereIndex(index);
              setTempAmpere(ampereConsumoFinalS2Ref.current[index || 0] || '');
              setShowAmpereModal(true);
            } else if (target === 'fotoBreakerBaseband3Encendido') {
              setFotoBreakerBaseband3Encendido(watermarkedUri);
            } else if (target === 'fotoBaseband3Encendida') {
              setFotoBaseband3Encendida(watermarkedUri);
            } else if (target === 'fotoBreakerBaseband3Apagado') {
              setFotoBreakerBaseband3Apagado(watermarkedUri);
            } else if (target === 'fotoEspacioBaseband3Retirada') {
              setFotoEspacioBaseband3Retirada(watermarkedUri);
            } else if (target === 'fotoConsumoInicialCc3') {
              setFotoConsumoInicialCc3(watermarkedUri);
            } else if (target === 'fotoConsumoFinalCc3') {
              setFotoConsumoFinalCc3(watermarkedUri);
            } else if (target === 'fotosConsumoFinalS3') {
              setFotosConsumoFinalS3(prev => {
                const newFotos = [...prev];
                if (index !== null) newFotos[index] = watermarkedUri;
                return newFotos;
              });
              setActiveAmpereTarget('fotosConsumoFinalS3');
              setActiveAmpereIndex(index);
              setTempAmpere(ampereConsumoFinalS3Ref.current[index || 0] || '');
              setShowAmpereModal(true);
            } else if (target === 'fotoBreakerAntenaS1Encendido') {
              setFotoBreakerAntenaS1Encendido(watermarkedUri);
            } else if (target === 'fotoBreakerAntenaS1Apagado') {
              setFotoBreakerAntenaS1Apagado(watermarkedUri);
            } else if (target === 'fotosConsumoFinalAntenaS1') {
              setFotosConsumoFinalAntenaS1(prev => {
                const newFotos = [...prev];
                if (index !== null) newFotos[index] = watermarkedUri;
                return newFotos;
              });
              setActiveAmpereTarget('fotosConsumoFinalAntenaS1');
              setActiveAmpereIndex(index);
              setTempAmpere(ampereConsumoFinalAntenaS1Ref.current[index || 0] || '');
              setShowAmpereModal(true);
            } else if (target === 'fotoBreakerAntenaS2Encendido') {
              setFotoBreakerAntenaS2Encendido(watermarkedUri);
            } else if (target === 'fotoBreakerAntenaS2Apagado') {
              setFotoBreakerAntenaS2Apagado(watermarkedUri);
            } else if (target === 'fotosConsumoFinalAntenaS2') {
              setFotosConsumoFinalAntenaS2(prev => {
                const newFotos = [...prev];
                if (index !== null) newFotos[index] = watermarkedUri;
                return newFotos;
              });
              setActiveAmpereTarget('fotosConsumoFinalAntenaS2');
              setActiveAmpereIndex(index);
              setTempAmpere(ampereConsumoFinalAntenaS2Ref.current[index || 0] || '');
              setShowAmpereModal(true);
            } else if (target === 'fotoBreakerAntenaS3Encendido') {
              setFotoBreakerAntenaS3Encendido(watermarkedUri);
            } else if (target === 'fotoBreakerAntenaS3Apagado') {
              setFotoBreakerAntenaS3Apagado(watermarkedUri);
            } else if (target === 'fotosConsumoFinalAntenaS3') {
              setFotosConsumoFinalAntenaS3(prev => {
                const newFotos = [...prev];
                if (index !== null) newFotos[index] = watermarkedUri;
                return newFotos;
              });
              setActiveAmpereTarget('fotosConsumoFinalAntenaS3');
              setActiveAmpereIndex(index);
              setTempAmpere(ampereConsumoFinalAntenaS3Ref.current[index || 0] || '');
              setShowAmpereModal(true);
            } else if (target === 'fotoConsumoInicialCcAntenaS1') {
              setFotoConsumoInicialCcAntenaS1(watermarkedUri);
            } else if (target === 'fotoConsumoFinalCcAntenaS1') {
              setFotoConsumoFinalCcAntenaS1(watermarkedUri);
            } else if (target === 'fotoConsumoInicialCcAntenaS2') {
              setFotoConsumoInicialCcAntenaS2(watermarkedUri);
            } else if (target === 'fotoConsumoFinalCcAntenaS2') {
              setFotoConsumoFinalCcAntenaS2(watermarkedUri);
            } else if (target === 'fotoConsumoInicialCcAntenaS3') {
              setFotoConsumoInicialCcAntenaS3(watermarkedUri);
            } else if (target === 'fotoConsumoFinalCcAntenaS3') {
              setFotoConsumoFinalCcAntenaS3(watermarkedUri);
            } else if (target === 'fotoAlarmasOVP') {
              setFotoAlarmasOVP(watermarkedUri);
            } else if (target === 'fotoAlarmasEquipos') {
              setFotoAlarmasEquipos(watermarkedUri);
            } else if (target === 'fotoAlarmasMigradas') {
              setFotoAlarmasMigradas(watermarkedUri);
            } else if (target === 'fotoAlarmasFinalesOVP') {
              setFotoAlarmasFinalesOVP(watermarkedUri);
            } else if (target === 'fotoNoImplementacion') {
              setFotoNoImplementacion(watermarkedUri);
            } else if (target === 'fotoAlarmasImplementadas') {
              setFotoAlarmasImplementadas(watermarkedUri);
            } else if (target === 'fotoRectificador') {
              setFotoRectificador(watermarkedUri);
            } else if (target === 'fotoContenedor1') {
              setFotoContenedor1(watermarkedUri);
            } else if (target === 'fotoContenedor2') {
              setFotoContenedor2(watermarkedUri);
            } else if (target === 'fotoSitio1') {
              setFotoSitio1(watermarkedUri);
            } else if (target === 'fotoSitio2') {
              setFotoSitio2(watermarkedUri);
            } else if (target === 'fotoEstructuraSalida') {
              setFotoEstructuraSalida(watermarkedUri);
            } else if (target === 'fotosConsumoFinalCaEvidencia') {
              setFotosConsumoFinalCaEvidencia(prev => {
                const newFotos = [...prev];
                if (index !== null) newFotos[index] = watermarkedUri;
                return newFotos;
              });
              setActiveAmpereTarget('fotosConsumoFinalCaEvidencia');
              setActiveAmpereIndex(index);
              setTempAmpere(ampereConsumoFinalCaEvidenciaRef.current[index || 0] || '');
              setShowAmpereModal(true);
            } else if (target === 'fotoConsumoFinalCcRectificador') {
              setFotoConsumoFinalCcRectificador(watermarkedUri);
              setActiveAmpereTarget('fotoConsumoFinalCcRectificador');
              setActiveAmpereIndex(0);
              setTempAmpere(ampereDisplayRectificadorFinalRef.current || '');
              setShowAmpereModal(true);
            }
          }
        } catch (e) {
          // Fallback
          if (target === 'hallazgos') {
            setFotos(prev => [...prev, asset.uri]);
          } else if (target === 'fotosEmpalme') {
            setFotosEmpalme(prev => {
              const newFotos = [...prev];
              if (index !== null) newFotos[index] = asset.uri;
              return newFotos;
            });
            // Abrir modal de ampere (fallback)
            setActiveAmpereIndex(index);
            setTempAmpere(ampereEmpalmeRef.current[index || 0] || '');
            setShowAmpereModal(true);
          } else if (target === 'fotoDisplayRectificador') {
            setFotoDisplayRectificador(asset.uri);
            // Abrir modal de ampere
            setActiveAmpereTarget('fotoDisplayRectificador');
            setActiveAmpereIndex(0);
            setTempAmpere(ampereDisplayRectificadorRef.current || '');
            setShowAmpereModal(true);
          } else if (target === 'fotoMedidor') {
            setFotoMedidor(asset.uri);
          } else if (target === 'fotoSectorMedidor') {
            setFotoSectorMedidor(asset.uri);
          } else if (target === 'fotoEstructura') {
            setFotoEstructura(asset.uri);
          } else if (target === 'fotoFueraContenedor') {
            setFotoFueraContenedor(asset.uri);
          } else if (target === 'fotosGeneralesSitio') {
            setFotosGeneralesSitio(prev => {
              const newFotos = [...prev];
              if (index !== null) newFotos[index] = asset.uri;
              return newFotos;
            });
          } else if (target === 'fotosInteriorContenedor') {
            setFotosInteriorContenedor(prev => {
              const newFotos = [...prev];
              if (index !== null) newFotos[index] = asset.uri;
              return newFotos;
            });
          } else if (target === 'fotoEquipo3GEncendido') {
            setFotoEquipo3GEncendido(asset.uri);
          } else if (target === 'fotoBreaker3GEncendido') {
            setFotoBreaker3GEncendido(asset.uri);
          } else if (target === 'fotoBreaker3GApagado') {
            setFotoBreaker3GApagado(asset.uri);
          } else if (target === 'fotoEquipo3GApagado') {
            setFotoEquipo3GApagado(asset.uri);
          } else if (target === 'fotoEspacioRetirado') {
            setFotoEspacioRetirado(asset.uri);
          } else if (target === 'fotoRRUEncendido') {
            setFotoRRUEncendido(asset.uri);
          } else if (target === 'fotoRRUApagado') {
            setFotoRRUApagado(asset.uri);
          } else if (target === 'fotoChapaAnterior') {
            setFotoChapaAnterior(asset.uri);
          } else if (target === 'fotoNuevaChapa') {
            setFotoNuevaChapa(asset.uri);
          } else if (target === 'fotoLlaveProgramacion') {
            setFotoLlaveProgramacion(asset.uri);
          } else if (target === 'fotoPuertaCerrada') {
            setFotoPuertaCerrada(asset.uri);
          } else if (target === 'fotoBreakerBaseband1Encendido') {
            setFotoBreakerBaseband1Encendido(asset.uri);
          } else if (target === 'fotoBaseband1Encendida') {
            setFotoBaseband1Encendida(asset.uri);
          } else if (target === 'fotoBreakerBaseband1Apagado') {
            setFotoBreakerBaseband1Apagado(asset.uri);
          } else if (target === 'fotoEspacioBaseband1Retirada') {
            setFotoEspacioBaseband1Retirada(asset.uri);
          } else if (target === 'fotoConsumoInicialCc1') {
            setFotoConsumoInicialCc1(asset.uri);
          } else if (target === 'fotoConsumoFinalCc1') {
            setFotoConsumoFinalCc1(asset.uri);
          } else if (target === 'fotosConsumoFinal') {
            setFotosConsumoFinal(prev => {
              const newFotos = [...prev];
              if (index !== null) newFotos[index] = asset.uri;
              return newFotos;
            });
            setActiveAmpereTarget('fotosConsumoFinal');
            setActiveAmpereIndex(index);
            setTempAmpere(ampereConsumoFinalRef.current[index || 0] || '');
            setShowAmpereModal(true);
          } else if (target === 'fotoBreakerBaseband2Encendido') {
            setFotoBreakerBaseband2Encendido(asset.uri);
          } else if (target === 'fotoBaseband2Encendida') {
            setFotoBaseband2Encendida(asset.uri);
          } else if (target === 'fotoBreakerBaseband2Apagado') {
            setFotoBreakerBaseband2Apagado(asset.uri);
          } else if (target === 'fotoEspacioBaseband2Retirada') {
            setFotoEspacioBaseband2Retirada(asset.uri);
          } else if (target === 'fotoConsumoInicialCc2') {
            setFotoConsumoInicialCc2(asset.uri);
          } else if (target === 'fotoConsumoFinalCc2') {
            setFotoConsumoFinalCc2(asset.uri);
          } else if (target === 'fotosConsumoFinalS2') {
            setFotosConsumoFinalS2(prev => {
              const newFotos = [...prev];
              if (index !== null) newFotos[index] = asset.uri;
              return newFotos;
            });
            setActiveAmpereTarget('fotosConsumoFinalS2');
            setActiveAmpereIndex(index);
            setTempAmpere(ampereConsumoFinalS2Ref.current[index || 0] || '');
            setShowAmpereModal(true);
          } else if (target === 'fotoBreakerBaseband3Encendido') {
            setFotoBreakerBaseband3Encendido(asset.uri);
          } else if (target === 'fotoBaseband3Encendida') {
            setFotoBaseband3Encendida(asset.uri);
          } else if (target === 'fotoBreakerBaseband3Apagado') {
            setFotoBreakerBaseband3Apagado(asset.uri);
          } else if (target === 'fotoEspacioBaseband3Retirada') {
            setFotoEspacioBaseband3Retirada(asset.uri);
          } else if (target === 'fotoConsumoInicialCc3') {
            setFotoConsumoInicialCc3(asset.uri);
          } else if (target === 'fotoConsumoFinalCc3') {
            setFotoConsumoFinalCc3(asset.uri);
          } else if (target === 'fotosConsumoFinalS3') {
            setFotosConsumoFinalS3(prev => {
              const newFotos = [...prev];
              if (index !== null) newFotos[index] = asset.uri;
              return newFotos;
            });
            setActiveAmpereTarget('fotosConsumoFinalS3');
            setActiveAmpereIndex(index);
            setTempAmpere(ampereConsumoFinalS3Ref.current[index || 0] || '');
            setShowAmpereModal(true);
          } else if (target === 'fotoBreakerAntenaS1Encendido') {
            setFotoBreakerAntenaS1Encendido(asset.uri);
          } else if (target === 'fotoBreakerAntenaS1Apagado') {
            setFotoBreakerAntenaS1Apagado(asset.uri);
          } else if (target === 'fotosConsumoFinalAntenaS1') {
            setFotosConsumoFinalAntenaS1(prev => {
              const newFotos = [...prev];
              if (index !== null) newFotos[index] = asset.uri;
              return newFotos;
            });
            setActiveAmpereTarget('fotosConsumoFinalAntenaS1');
            setActiveAmpereIndex(index);
            setTempAmpere(ampereConsumoFinalAntenaS1Ref.current[index || 0] || '');
            setShowAmpereModal(true);
          } else if (target === 'fotoBreakerAntenaS2Encendido') {
            setFotoBreakerAntenaS2Encendido(asset.uri);
          } else if (target === 'fotoBreakerAntenaS2Apagado') {
            setFotoBreakerAntenaS2Apagado(asset.uri);
          } else if (target === 'fotosConsumoFinalAntenaS2') {
            setFotosConsumoFinalAntenaS2(prev => {
              const newFotos = [...prev];
              if (index !== null) newFotos[index] = asset.uri;
              return newFotos;
            });
            setActiveAmpereTarget('fotosConsumoFinalAntenaS2');
            setActiveAmpereIndex(index);
            setTempAmpere(ampereConsumoFinalAntenaS2Ref.current[index || 0] || '');
            setShowAmpereModal(true);
          } else if (target === 'fotoBreakerAntenaS3Encendido') {
            setFotoBreakerAntenaS3Encendido(asset.uri);
          } else if (target === 'fotoBreakerAntenaS3Apagado') {
            setFotoBreakerAntenaS3Apagado(asset.uri);
          } else if (target === 'fotosConsumoFinalAntenaS3') {
            setFotosConsumoFinalAntenaS3(prev => {
              const newFotos = [...prev];
              if (index !== null) newFotos[index] = asset.uri;
              return newFotos;
            });
            setActiveAmpereTarget('fotosConsumoFinalAntenaS3');
            setActiveAmpereIndex(index);
            setTempAmpere(ampereConsumoFinalAntenaS3Ref.current[index || 0] || '');
            setShowAmpereModal(true);
          } else if (target === 'fotoConsumoInicialCcAntenaS1') {
            setFotoConsumoInicialCcAntenaS1(asset.uri);
          } else if (target === 'fotoConsumoFinalCcAntenaS1') {
            setFotoConsumoFinalCcAntenaS1(asset.uri);
          } else if (target === 'fotoConsumoInicialCcAntenaS2') {
            setFotoConsumoInicialCcAntenaS2(asset.uri);
          } else if (target === 'fotoConsumoFinalCcAntenaS2') {
            setFotoConsumoFinalCcAntenaS2(asset.uri);
          } else if (target === 'fotoConsumoInicialCcAntenaS3') {
            setFotoConsumoInicialCcAntenaS3(asset.uri);
          } else if (target === 'fotoConsumoFinalCcAntenaS3') {
            setFotoConsumoFinalCcAntenaS3(asset.uri);
          } else if (target === 'fotoAlarmasOVP') {
            setFotoAlarmasOVP(asset.uri);
          } else if (target === 'fotoAlarmasEquipos') {
            setFotoAlarmasEquipos(asset.uri);
          } else if (target === 'fotoAlarmasMigradas') {
            setFotoAlarmasMigradas(asset.uri);
          } else if (target === 'fotoAlarmasFinalesOVP') {
            setFotoAlarmasFinalesOVP(asset.uri);
          } else if (target === 'fotoNoImplementacion') {
            setFotoNoImplementacion(asset.uri);
          } else if (target === 'fotoAlarmasImplementadas') {
            setFotoAlarmasImplementadas(asset.uri);
          } else if (target === 'fotoRectificador') {
            setFotoRectificador(asset.uri);
          } else if (target === 'fotoContenedor1') {
            setFotoContenedor1(asset.uri);
          } else if (target === 'fotoContenedor2') {
            setFotoContenedor2(asset.uri);
          } else if (target === 'fotoSitio1') {
            setFotoSitio1(asset.uri);
          } else if (target === 'fotoSitio2') {
            setFotoSitio2(asset.uri);
          } else if (target === 'fotoEstructuraSalida') {
            setFotoEstructuraSalida(asset.uri);
          } else if (target === 'fotosConsumoFinalCaEvidencia') {
            setFotosConsumoFinalCaEvidencia(prev => {
              const newFotos = [...prev];
              if (index !== null) newFotos[index] = asset.uri;
              return newFotos;
            });
            setActiveAmpereTarget('fotosConsumoFinalCaEvidencia');
            setActiveAmpereIndex(index);
            setTempAmpere(ampereConsumoFinalCaEvidenciaRef.current[index || 0] || '');
            setShowAmpereModal(true);
          } else if (target === 'fotoConsumoFinalCcRectificador') {
            setFotoConsumoFinalCcRectificador(asset.uri);
            setActiveAmpereTarget('fotoConsumoFinalCcRectificador');
            setActiveAmpereIndex(0);
            setTempAmpere(ampereDisplayRectificadorFinalRef.current || '');
            setShowAmpereModal(true);
          }
        } finally {
          setPendingUri(null);
          setIsProcessing(false);
          pendingIndexRef.current = null;
        }
      }, 300); // Optimizado a 300ms (antes 1000ms) para acelerar el procesamiento de fotos sin perder el render offscreen
    }
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6 });
    processImageResult(result);
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso denegado', 'Necesitamos acceso a tu cámara.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      cameraType: ImagePicker.CameraType.back,
    });
    processImageResult(result);
  };

  const removeFoto = (index: number) => {
    if (isReadOnly) return;
    Alert.alert(
      'Eliminar Foto',
      '¿Estás seguro de que deseas eliminar esta foto? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => setFotos(fotos.filter((_, i) => i !== index)) }
      ]
    );
  };

  const removePhoto = (field: string, index: number | null = null) => {
    if (isReadOnly) return;
    Alert.alert(
      'Eliminar Foto',
      '¿Estás seguro de que deseas eliminar esta foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive', 
          onPress: () => {
            if (field === 'fotosEmpalme' && index !== null) {
              const newFotos = [...fotosEmpalme];
              newFotos[index] = '';
              setFotosEmpalme(newFotos);
            } else if (field === 'fotoDisplayRectificador') {
              setFotoDisplayRectificador('');
              setAmpereDisplayRectificador('');
            } else if (field === 'fotoMedidor') setFotoMedidor('');
            else if (field === 'fotoSectorMedidor') setFotoSectorMedidor('');
            else if (field === 'fotoEstructura') setFotoEstructura('');
            else if (field === 'fotoFueraContenedor') setFotoFueraContenedor('');
            else if (field === 'fotosGeneralesSitio' && index !== null) {
              const newFotos = [...fotosGeneralesSitio];
              newFotos[index] = '';
              setFotosGeneralesSitio(newFotos);
            } else if (field === 'fotosInteriorContenedor' && index !== null) {
              const newFotos = [...fotosInteriorContenedor];
              newFotos[index] = '';
              setFotosInteriorContenedor(newFotos);
            } else if (field === 'fotoEquipo3GEncendido') setFotoEquipo3GEncendido('');
            else if (field === 'fotoBreaker3GEncendido') setFotoBreaker3GEncendido('');
            else if (field === 'fotoBreaker3GApagado') setFotoBreaker3GApagado('');
            else if (field === 'fotoEquipo3GApagado') setFotoEquipo3GApagado('');
            else if (field === 'fotoEspacioRetirado') setFotoEspacioRetirado('');
            else if (field === 'fotoRRUEncendido') setFotoRRUEncendido('');
            else if (field === 'fotoRRUApagado') setFotoRRUApagado('');
            else if (field === 'fotoChapaAnterior') setFotoChapaAnterior('');
            else if (field === 'fotoNuevaChapa') setFotoNuevaChapa('');
            else if (field === 'fotoLlaveProgramacion') setFotoLlaveProgramacion('');
            else if (field === 'fotoPuertaCerrada') setFotoPuertaCerrada('');
            else if (field === 'fotoBreakerBaseband1Encendido') {
              setFotoBreakerBaseband1Encendido('');
              setConfirmadoApagadoRetirar(false);
              setFotoBreakerBaseband1Apagado('');
              setFotoEspacioBaseband1Retirada('');
              setFotoConsumoFinalCc1('');
              setAmpereConsumoFinalCc1('');
            }
            else if (field === 'fotoBaseband1Encendida') {
              setFotoBaseband1Encendida('');
              setConfirmadoApagadoRetirar(false);
              setFotoBreakerBaseband1Apagado('');
              setFotoEspacioBaseband1Retirada('');
              setFotoConsumoFinalCc1('');
              setAmpereConsumoFinalCc1('');
            }
            else if (field === 'fotoConsumoInicialCc1') {
              setFotoConsumoInicialCc1('');
              setAmpereConsumoInicialCc1('');
              setConfirmadoApagadoRetirar(false);
              setFotoBreakerBaseband1Apagado('');
              setFotoEspacioBaseband1Retirada('');
              setFotoConsumoFinalCc1('');
              setAmpereConsumoFinalCc1('');
            }
            else if (field === 'fotoBreakerBaseband1Apagado') {
              setFotoBreakerBaseband1Apagado('');
            }
            else if (field === 'fotoEspacioBaseband1Retirada') {
              setFotoEspacioBaseband1Retirada('');
            }
            else if (field === 'fotoConsumoFinalCc1') {
              setFotoConsumoFinalCc1('');
              setAmpereConsumoFinalCc1('');
            }
            else if (field === 'fotoBreakerBaseband2Encendido') {
              setFotoBreakerBaseband2Encendido('');
              setConfirmadoApagadoRetirarS2(false);
              setFotoBreakerBaseband2Apagado('');
              setFotoEspacioBaseband2Retirada('');
              setFotoConsumoFinalCc2('');
              setAmpereConsumoFinalCc2('');
            }
            else if (field === 'fotoBaseband2Encendida') {
              setFotoBaseband2Encendida('');
              setConfirmadoApagadoRetirarS2(false);
              setFotoBreakerBaseband2Apagado('');
              setFotoEspacioBaseband2Retirada('');
              setFotoConsumoFinalCc2('');
              setAmpereConsumoFinalCc2('');
            }
            else if (field === 'fotoConsumoInicialCc2') {
              setFotoConsumoInicialCc2('');
              setAmpereConsumoInicialCc2('');
              setConfirmadoApagadoRetirarS2(false);
              setFotoBreakerBaseband2Apagado('');
              setFotoEspacioBaseband2Retirada('');
              setFotoConsumoFinalCc2('');
              setAmpereConsumoFinalCc2('');
            }
            else if (field === 'fotoBreakerBaseband2Apagado') {
              setFotoBreakerBaseband2Apagado('');
            }
            else if (field === 'fotoEspacioBaseband2Retirada') {
              setFotoEspacioBaseband2Retirada('');
            }
            else if (field === 'fotoConsumoFinalCc2') {
              setFotoConsumoFinalCc2('');
              setAmpereConsumoFinalCc2('');
            }
            else if (field === 'fotoBreakerBaseband3Encendido') {
              setFotoBreakerBaseband3Encendido('');
              setConfirmadoApagadoRetirarS3(false);
              setFotoBreakerBaseband3Apagado('');
              setFotoEspacioBaseband3Retirada('');
              setFotoConsumoFinalCc3('');
              setAmpereConsumoFinalCc3('');
            }
            else if (field === 'fotoBaseband3Encendida') {
              setFotoBaseband3Encendida('');
              setConfirmadoApagadoRetirarS3(false);
              setFotoBreakerBaseband3Apagado('');
              setFotoEspacioBaseband3Retirada('');
              setFotoConsumoFinalCc3('');
              setAmpereConsumoFinalCc3('');
            }
            else if (field === 'fotoConsumoInicialCc3') {
              setFotoConsumoInicialCc3('');
              setAmpereConsumoInicialCc3('');
              setConfirmadoApagadoRetirarS3(false);
              setFotoBreakerBaseband3Apagado('');
              setFotoEspacioBaseband3Retirada('');
              setFotoConsumoFinalCc3('');
              setAmpereConsumoFinalCc3('');
            }
            else if (field === 'fotoBreakerBaseband3Apagado') {
              setFotoBreakerBaseband3Apagado('');
            }
            else if (field === 'fotoEspacioBaseband3Retirada') {
              setFotoEspacioBaseband3Retirada('');
            }
            else if (field === 'fotoConsumoFinalCc3') {
              setFotoConsumoFinalCc3('');
              setAmpereConsumoFinalCc3('');
            }
            else if (field === 'fotoBreakerAntenaS1Encendido') {
              setFotoBreakerAntenaS1Encendido('');
              setConfirmadoApagadoAntenaS1(false);
              setFotoConsumoInicialCcAntenaS1('');
              setFotoBreakerAntenaS1Apagado('');
              setFotoConsumoFinalCcAntenaS1('');
            }
            else if (field === 'fotoConsumoInicialCcAntenaS1') {
              setFotoConsumoInicialCcAntenaS1('');
              setConfirmadoApagadoAntenaS1(false);
              setFotoBreakerAntenaS1Apagado('');
              setFotoConsumoFinalCcAntenaS1('');
            }
            else if (field === 'fotoBreakerAntenaS1Apagado') {
              setFotoBreakerAntenaS1Apagado('');
            }
            else if (field === 'fotoConsumoFinalCcAntenaS1') {
              setFotoConsumoFinalCcAntenaS1('');
            }
            else if (field === 'fotoBreakerAntenaS2Encendido') {
              setFotoBreakerAntenaS2Encendido('');
              setConfirmadoApagadoAntenaS2(false);
              setFotoConsumoInicialCcAntenaS2('');
              setFotoBreakerAntenaS2Apagado('');
              setFotoConsumoFinalCcAntenaS2('');
            }
            else if (field === 'fotoConsumoInicialCcAntenaS2') {
              setFotoConsumoInicialCcAntenaS2('');
              setConfirmadoApagadoAntenaS2(false);
              setFotoBreakerAntenaS2Apagado('');
              setFotoConsumoFinalCcAntenaS2('');
            }
            else if (field === 'fotoBreakerAntenaS2Apagado') {
              setFotoBreakerAntenaS2Apagado('');
            }
            else if (field === 'fotoConsumoFinalCcAntenaS2') {
              setFotoConsumoFinalCcAntenaS2('');
            }
            else if (field === 'fotoBreakerAntenaS3Encendido') {
              setFotoBreakerAntenaS3Encendido('');
              setConfirmadoApagadoAntenaS3(false);
              setFotoConsumoInicialCcAntenaS3('');
              setFotoBreakerAntenaS3Apagado('');
              setFotoConsumoFinalCcAntenaS3('');
            }
            else if (field === 'fotoConsumoInicialCcAntenaS3') {
              setFotoConsumoInicialCcAntenaS3('');
              setConfirmadoApagadoAntenaS3(false);
              setFotoBreakerAntenaS3Apagado('');
              setFotoConsumoFinalCcAntenaS3('');
            }
            else if (field === 'fotoBreakerAntenaS3Apagado') {
              setFotoBreakerAntenaS3Apagado('');
            }
            else if (field === 'fotoConsumoFinalCcAntenaS3') {
              setFotoConsumoFinalCcAntenaS3('');
            }
            else if (field === 'fotoAlarmasOVP') setFotoAlarmasOVP('');
            else if (field === 'fotoAlarmasEquipos') setFotoAlarmasEquipos('');
            else if (field === 'fotoAlarmasMigradas') setFotoAlarmasMigradas('');
            else if (field === 'fotoAlarmasFinalesOVP') setFotoAlarmasFinalesOVP('');
            else if (field === 'fotoNoImplementacion') setFotoNoImplementacion('');
            else if (field === 'fotoAlarmasImplementadas') setFotoAlarmasImplementadas('');
            else if (field === 'fotoRectificador') setFotoRectificador('');
            else if (field === 'fotoContenedor1') setFotoContenedor1('');
            else if (field === 'fotoContenedor2') setFotoContenedor2('');
            else if (field === 'fotoSitio1') setFotoSitio1('');
            else if (field === 'fotoSitio2') setFotoSitio2('');
            else if (field === 'fotoEstructuraSalida') setFotoEstructuraSalida('');
            else if (field === 'fotosConsumoFinalCaEvidencia' && index !== null) {
              const newFotos = [...fotosConsumoFinalCaEvidencia];
              newFotos[index] = '';
              setFotosConsumoFinalCaEvidencia(newFotos);
              const newAmperes = [...ampereConsumoFinalCaEvidencia];
              newAmperes[index] = '';
              setAmpereConsumoFinalCaEvidencia(newAmperes);
            }
            else if (field === 'fotoConsumoFinalCcRectificador') {
              setFotoConsumoFinalCcRectificador('');
              setAmpereDisplayRectificadorFinal('');
            }
          } 
        }
      ]
    );
  };

  const tecnologiaAlarmasOptions = [
    { id: '3G', label: '3G' },
    { id: 'LTE', label: 'LTE' },
    { id: '5G', label: '5G' },
    { id: 'BAFI', label: 'BAFI' },
    { id: 'No existen', label: 'No existen' },
  ];

  const tipoEstructuraOptions = [
    { id: 'Autosoportada', label: 'Autosoportada' },
    { id: 'Azotea', label: 'Azotea' },
    { id: 'Poste', label: 'Poste' },
    { id: 'Monoposte', label: 'Monoposte' },
    { id: 'Paleta Publicitaria', label: 'Paleta Publicitaria' },
    { id: 'Contraventada', label: 'Contraventada' },
    { id: 'Copa de Agua', label: 'Copa de Agua' },
    { id: 'Indoor', label: 'Indoor' },
    { id: 'Carro Movil', label: 'Carro Movil' },
    { id: 'Otro', label: 'Otro' },
  ];

  const tipoContenedorOptions = [
    { id: 'Shelter', label: 'Shelter' },
    { id: 'Gabinete Outdoor', label: 'Gabinete Outdoor' },
    { id: 'Bunker', label: 'Bunker' },
    { id: 'Otro', label: 'Otro' },
  ];

  const tipoEmpalmeOptions = [
    { id: 'Monofásico', label: 'Monofásico' },
    { id: 'Trifásico', label: 'Trifásico' },
  ];

  const estadoEquipoOptions = [
    { id: 'Encendido', label: 'Encendido' },
    { id: 'Apagado', label: 'Apagado' },
    { id: 'N/A', label: 'N/A' },
  ];

  const siNoOptions = [
    { id: 'Si', label: 'Si' },
    { id: 'No', label: 'No' },
  ];

  const handleGuardarRegistro = () => {
    if (planning) {
      context?.updatePlanning(planning.id, { hallazgos: { observaciones, fotos } });
      Alert.alert('Éxito', 'Registro guardado correctamente', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    }
  };

  const handleFinalize = () => {
    if (planning && site) {
      const datosProgress = calculateDatosProgress();
      const secondProgress = getSecondProgress();
      const alarmasProgress = calculateAlarmasProgress();
      const evidenciaProgress = calculateEvidenciaSalidaProgress();

      const hasPendingTasks = isIloq 
        ? secondProgress < 100 
        : isApagadoBafi
        ? (datosProgress < 100 || calculateBafiSector1Progress() < 100 || calculateBafiSector2Progress() < 100 || calculateBafiSector3Progress() < 100 || calculateAntenaSector1Progress() < 100 || calculateAntenaSector2Progress() < 100 || calculateAntenaSector3Progress() < 100 || alarmasProgress < 100 || evidenciaProgress < 100)
        : (datosProgress < 100 || secondProgress < 100 || alarmasProgress < 100 || evidenciaProgress < 100);

      if (hasPendingTasks) {
        let msg = `Para finalizar la actividad debes completar el 100% de las tareas obligatorias.\n\n`;
        if (isIloq) {
          msg += `Cambio de Chapa: ${secondProgress}%`;
        } else if (isApagadoBafi) {
          msg += `Datos Generales: ${datosProgress}%\nApagado BAFI S1: ${calculateBafiSector1Progress()}%\nApagado BAFI S2: ${calculateBafiSector2Progress()}%\nApagado BAFI S3: ${calculateBafiSector3Progress()}%\nApagado Antena S1: ${calculateAntenaSector1Progress()}%\nApagado Antena S2: ${calculateAntenaSector2Progress()}%\nApagado Antena S3: ${calculateAntenaSector3Progress()}%\nAlarmas Externas: ${alarmasProgress}%\nEvidencia Salida: ${evidenciaProgress}%`;
        } else {
          msg += `Datos Generales: ${datosProgress}%\nApagado 3G/RRU: ${secondProgress}%\nAlarmas Externas: ${alarmasProgress}%\nEvidencia Salida: ${evidenciaProgress}%`;
        }
        Alert.alert('Tareas pendientes', msg, [{ text: 'Entendido' }]);
        return;
      }
      
      Alert.alert(
        'Finalizar Actividad',
        '¿Estás seguro de que deseas finalizar esta actividad? Se registrará la fecha y hora actual.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Finalizar', 
            onPress: () => {
              const runUploadAndFinalize = async () => {
                isFinalizingRef.current = true;
                setUploadVisible(true);
                setUploadProgress(5);
                setUploadStatus('Estableciendo conexión con la base de datos local...');

                // 1. Recopilar todas las fotos locales para subida
                const localPhotosToUpload: { key: string; uri: string; index?: number }[] = [];

                const addLocal = (key: string, uri: any, index?: number) => {
                  if (typeof uri === 'string' && uri.trim() && !uri.startsWith('http://') && !uri.startsWith('https://')) {
                    localPhotosToUpload.push({ key, uri, index });
                  }
                };

                // Hallazgos
                fotosRef.current.forEach((uri, idx) => addLocal('fotos', uri, idx));
                
                // Datos Generales
                addLocal('fotoEstructura', fotoEstructuraRef.current);
                addLocal('fotoFueraContenedor', fotoFueraContenedorRef.current);
                addLocal('fotoMedidor', fotoMedidorRef.current);
                addLocal('fotoSectorMedidor', fotoSectorMedidorRef.current);
                addLocal('fotoDisplayRectificador', fotoDisplayRectificadorRef.current);
                fotosEmpalmeRef.current.forEach((uri, idx) => addLocal('fotosEmpalme', uri, idx));
                fotosGeneralesSitioRef.current.forEach((uri, idx) => addLocal('fotosGeneralesSitio', uri, idx));
                fotosInteriorContenedorRef.current.forEach((uri, idx) => addLocal('fotosInteriorContenedor', uri, idx));

                // Apagado 3G
                addLocal('fotoEquipo3GEncendido', fotoEquipo3GEncendidoRef.current);
                addLocal('fotoBreaker3GEncendido', fotoBreaker3GEncendidoRef.current);
                addLocal('fotoBreaker3GApagado', fotoBreaker3GApagadoRef.current);
                addLocal('fotoEquipo3GApagado', fotoEquipo3GApagadoRef.current);
                addLocal('fotoEspacioRetirado', fotoEspacioRetiradoRef.current);
                addLocal('fotoRRUEncendido', fotoRRUEncendidoRef.current);
                addLocal('fotoRRUApagado', fotoRRUApagadoRef.current);

                // BAFI S1
                addLocal('fotoBreakerBaseband1Encendido', fotoBreakerBaseband1EncendidoRef.current);
                addLocal('fotoBaseband1Encendida', fotoBaseband1EncendidaRef.current);
                addLocal('fotoBreakerBaseband1Apagado', fotoBreakerBaseband1ApagadoRef.current);
                addLocal('fotoEspacioBaseband1Retirada', fotoEspacioBaseband1RetiradaRef.current);
                addLocal('fotoConsumoInicialCc1', fotoConsumoInicialCc1Ref.current);
                addLocal('fotoConsumoFinalCc1', fotoConsumoFinalCc1Ref.current);
                fotosConsumoFinalRef.current.forEach((uri, idx) => addLocal('fotosConsumoFinal', uri, idx));

                // BAFI S2
                addLocal('fotoBreakerBaseband2Encendido', fotoBreakerBaseband2EncendidoRef.current);
                addLocal('fotoBaseband2Encendida', fotoBaseband2EncendidaRef.current);
                addLocal('fotoBreakerBaseband2Apagado', fotoBreakerBaseband2ApagadoRef.current);
                addLocal('fotoEspacioBaseband2Retirada', fotoEspacioBaseband2RetiradaRef.current);
                addLocal('fotoConsumoInicialCc2', fotoConsumoInicialCc2Ref.current);
                addLocal('fotoConsumoFinalCc2', fotoConsumoFinalCc2Ref.current);
                fotosConsumoFinalS2Ref.current.forEach((uri, idx) => addLocal('fotosConsumoFinalS2', uri, idx));

                // BAFI S3
                addLocal('fotoBreakerBaseband3Encendido', fotoBreakerBaseband3EncendidoRef.current);
                addLocal('fotoBaseband3Encendida', fotoBaseband3EncendidaRef.current);
                addLocal('fotoBreakerBaseband3Apagado', fotoBreakerBaseband3ApagadoRef.current);
                addLocal('fotoEspacioBaseband3Retirada', fotoEspacioBaseband3RetiradaRef.current);
                addLocal('fotoConsumoInicialCc3', fotoConsumoInicialCc3Ref.current);
                addLocal('fotoConsumoFinalCc3', fotoConsumoFinalCc3Ref.current);
                fotosConsumoFinalS3Ref.current.forEach((uri, idx) => addLocal('fotosConsumoFinalS3', uri, idx));

                // Antenas
                addLocal('fotoBreakerAntenaS1Encendido', fotoBreakerAntenaS1EncendidoRef.current);
                addLocal('fotoConsumoInicialCcAntenaS1', fotoConsumoInicialCcAntenaS1Ref.current);
                addLocal('fotoBreakerAntenaS1Apagado', fotoBreakerAntenaS1ApagadoRef.current);
                addLocal('fotoConsumoFinalCcAntenaS1', fotoConsumoFinalCcAntenaS1Ref.current);
                fotosConsumoFinalAntenaS1Ref.current.forEach((uri, idx) => addLocal('fotosConsumoFinalAntenaS1', uri, idx));

                addLocal('fotoBreakerAntenaS2Encendido', fotoBreakerAntenaS2EncendidoRef.current);
                addLocal('fotoConsumoInicialCcAntenaS2', fotoConsumoInicialCcAntenaS2Ref.current);
                addLocal('fotoBreakerAntenaS2Apagado', fotoBreakerAntenaS2ApagadoRef.current);
                addLocal('fotoConsumoFinalCcAntenaS2', fotoConsumoFinalCcAntenaS2Ref.current);
                fotosConsumoFinalAntenaS2Ref.current.forEach((uri, idx) => addLocal('fotosConsumoFinalAntenaS2', uri, idx));

                addLocal('fotoBreakerAntenaS3Encendido', fotoBreakerAntenaS3EncendidoRef.current);
                addLocal('fotoConsumoInicialCcAntenaS3', fotoConsumoInicialCcAntenaS3Ref.current);
                addLocal('fotoBreakerAntenaS3Apagado', fotoBreakerAntenaS3ApagadoRef.current);
                addLocal('fotoConsumoFinalCcAntenaS3', fotoConsumoFinalCcAntenaS3Ref.current);
                fotosConsumoFinalAntenaS3Ref.current.forEach((uri, idx) => addLocal('fotosConsumoFinalAntenaS3', uri, idx));

                // Cambio Chapa
                addLocal('fotoChapaAnterior', fotoChapaAnteriorRef.current);
                addLocal('fotoNuevaChapa', fotoNuevaChapaRef.current);
                addLocal('fotoLlaveProgramacion', fotoLlaveProgramacionRef.current);
                addLocal('fotoPuertaCerrada', fotoPuertaCerradaRef.current);

                // Evidencia Salida
                addLocal('fotoRectificador', fotoRectificadorRef.current);
                addLocal('fotoContenedor1', fotoContenedor1Ref.current);
                addLocal('fotoContenedor2', fotoContenedor2Ref.current);
                addLocal('fotoSitio1', fotoSitio1Ref.current);
                addLocal('fotoSitio2', fotoSitio2Ref.current);
                addLocal('fotoEstructuraSalida', fotoEstructuraSalidaRef.current);
                fotosConsumoFinalCaEvidenciaRef.current.forEach((uri, idx) => addLocal('fotosConsumoFinalCaEvidencia', uri, idx));
                addLocal('fotoConsumoFinalCcRectificador', fotoConsumoFinalCcRectificadorRef.current);

                // Alarmas Externas
                addLocal('fotoAlarmasOVP', fotoAlarmasOVPRef.current);
                addLocal('fotoAlarmasEquipos', fotoAlarmasEquiposRef.current);
                addLocal('fotoAlarmasMigradas', fotoAlarmasMigradasRef.current);
                addLocal('fotoAlarmasFinalesOVP', fotoAlarmasFinalesOVPRef.current);
                addLocal('fotoNoImplementacion', fotoNoImplementacionRef.current);
                addLocal('fotoAlarmasImplementadas', fotoAlarmasImplementadasRef.current);

                // Variables de mapeo para re-escribir los estados de fotos con URLs públicas
                const finalFotos = [...fotosRef.current];
                const finalFotosEmpalme = [...fotosEmpalmeRef.current];
                const finalFotosConsumoFinalCaEvidencia = [...fotosConsumoFinalCaEvidenciaRef.current];
                let finalFotoConsumoFinalCcRectificador = fotoConsumoFinalCcRectificadorRef.current;
                const finalFotosGeneralesSitio = [...fotosGeneralesSitioRef.current];
                const finalFotosInteriorContenedor = [...fotosInteriorContenedorRef.current];
                const finalFotosConsumoFinal = [...fotosConsumoFinalRef.current];
                const finalFotosConsumoFinalS2 = [...fotosConsumoFinalS2Ref.current];
                const finalFotosConsumoFinalS3 = [...fotosConsumoFinalS3Ref.current];
                const finalFotosConsumoFinalAntenaS1 = [...fotosConsumoFinalAntenaS1Ref.current];
                const finalFotosConsumoFinalAntenaS2 = [...fotosConsumoFinalAntenaS2Ref.current];
                const finalFotosConsumoFinalAntenaS3 = [...fotosConsumoFinalAntenaS3Ref.current];

                let finalFotoEstructura = fotoEstructuraRef.current;
                let finalFotoFueraContenedor = fotoFueraContenedorRef.current;
                let finalFotoMedidor = fotoMedidorRef.current;
                let finalFotoSectorMedidor = fotoSectorMedidorRef.current;
                let finalFotoDisplayRectificador = fotoDisplayRectificadorRef.current;
                let finalFotoEquipo3GEncendido = fotoEquipo3GEncendidoRef.current;
                let finalFotoBreaker3GEncendido = fotoBreaker3GEncendidoRef.current;
                let finalFotoBreaker3GApagado = fotoBreaker3GApagadoRef.current;
                let finalFotoEquipo3GApagado = fotoEquipo3GApagadoRef.current;
                let finalFotoEspacioRetirado = fotoEspacioRetiradoRef.current;
                let finalFotoRRUEncendido = fotoRRUEncendidoRef.current;
                let finalFotoRRUApagado = fotoRRUApagadoRef.current;
                let finalFotoBreakerBaseband1Encendido = fotoBreakerBaseband1EncendidoRef.current;
                let finalFotoBaseband1Encendida = fotoBaseband1EncendidaRef.current;
                let finalFotoBreakerBaseband1Apagado = fotoBreakerBaseband1ApagadoRef.current;
                let finalFotoEspacioBaseband1Retirada = fotoEspacioBaseband1RetiradaRef.current;
                let finalFotoConsumoInicialCc1 = fotoConsumoInicialCc1Ref.current;
                let finalFotoConsumoFinalCc1 = fotoConsumoFinalCc1Ref.current;
                let finalFotoBreakerBaseband2Encendido = fotoBreakerBaseband2EncendidoRef.current;
                let finalFotoBaseband2Encendida = fotoBaseband2EncendidaRef.current;
                let finalFotoBreakerBaseband2Apagado = fotoBreakerBaseband2ApagadoRef.current;
                let finalFotoEspacioBaseband2Retirada = fotoEspacioBaseband2RetiradaRef.current;
                let finalFotoConsumoInicialCc2 = fotoConsumoInicialCc2Ref.current;
                let finalFotoConsumoFinalCc2 = fotoConsumoFinalCc2Ref.current;
                let finalFotoBreakerBaseband3Encendido = fotoBreakerBaseband3EncendidoRef.current;
                let finalFotoBaseband3Encendida = fotoBaseband3EncendidaRef.current;
                let finalFotoBreakerBaseband3Apagado = fotoBreakerBaseband3ApagadoRef.current;
                let finalFotoEspacioBaseband3Retirada = fotoEspacioBaseband3RetiradaRef.current;
                let finalFotoConsumoInicialCc3 = fotoConsumoInicialCc3Ref.current;
                let finalFotoConsumoFinalCc3 = fotoConsumoFinalCc3Ref.current;
                let finalFotoBreakerAntenaS1Encendido = fotoBreakerAntenaS1EncendidoRef.current;
                let finalFotoConsumoInicialCcAntenaS1 = fotoConsumoInicialCcAntenaS1Ref.current;
                let finalFotoBreakerAntenaS1Apagado = fotoBreakerAntenaS1ApagadoRef.current;
                let finalFotoConsumoFinalCcAntenaS1 = fotoConsumoFinalCcAntenaS1Ref.current;

                let finalFotoBreakerAntenaS2Encendido = fotoBreakerAntenaS2EncendidoRef.current;
                let finalFotoConsumoInicialCcAntenaS2 = fotoConsumoInicialCcAntenaS2Ref.current;
                let finalFotoBreakerAntenaS2Apagado = fotoBreakerAntenaS2ApagadoRef.current;
                let finalFotoConsumoFinalCcAntenaS2 = fotoConsumoFinalCcAntenaS2Ref.current;

                let finalFotoBreakerAntenaS3Encendido = fotoBreakerAntenaS3EncendidoRef.current;
                let finalFotoConsumoInicialCcAntenaS3 = fotoConsumoInicialCcAntenaS3Ref.current;
                let finalFotoBreakerAntenaS3Apagado = fotoBreakerAntenaS3ApagadoRef.current;
                let finalFotoConsumoFinalCcAntenaS3 = fotoConsumoFinalCcAntenaS3Ref.current;
                let finalFotoChapaAnterior = fotoChapaAnteriorRef.current;
                let finalFotoNuevaChapa = fotoNuevaChapaRef.current;
                let finalFotoLlaveProgramacion = fotoLlaveProgramacionRef.current;
                let finalFotoPuertaCerrada = fotoPuertaCerradaRef.current;
                let finalFotoRectificador = fotoRectificadorRef.current;
                let finalFotoContenedor1 = fotoContenedor1Ref.current;
                let finalFotoContenedor2 = fotoContenedor2Ref.current;
                let finalFotoSitio1 = fotoSitio1Ref.current;
                let finalFotoSitio2 = fotoSitio2Ref.current;
                let finalFotoEstructuraSalida = fotoEstructuraSalidaRef.current;

                let finalFotoAlarmasOVP = fotoAlarmasOVPRef.current;
                let finalFotoAlarmasEquipos = fotoAlarmasEquiposRef.current;
                let finalFotoAlarmasMigradas = fotoAlarmasMigradasRef.current;
                let finalFotoAlarmasFinalesOVP = fotoAlarmasFinalesOVPRef.current;
                let finalFotoNoImplementacion = fotoNoImplementacionRef.current;
                let finalFotoAlarmasImplementadas = fotoAlarmasImplementadasRef.current;

                // 2. Subir las fotos una a una actualizando el progreso
                const totalPhotos = localPhotosToUpload.length;
                let uploadedCount = 0;

                setUploadProgress(15);
                setUploadStatus(`Analizando ${totalPhotos} fotos locales para subir...`);
                await new Promise(resolve => setTimeout(resolve, 400));

                if (context?.isApiConnected && totalPhotos > 0) {
                  for (const photo of localPhotosToUpload) {
                    uploadedCount++;
                    setUploadStatus(`Subiendo foto ${uploadedCount} de ${totalPhotos} a la Mac...`);
                    
                    try {
                      const webUrl = await uploadPhotoApi(photo.uri);
                      
                      // Asignar al clon correspondiente
                      if (photo.key === 'fotos' && photo.index !== undefined) finalFotos[photo.index] = webUrl;
                      else if (photo.key === 'fotosEmpalme' && photo.index !== undefined) finalFotosEmpalme[photo.index] = webUrl;
                      else if (photo.key === 'fotosGeneralesSitio' && photo.index !== undefined) finalFotosGeneralesSitio[photo.index] = webUrl;
                      else if (photo.key === 'fotosInteriorContenedor' && photo.index !== undefined) finalFotosInteriorContenedor[photo.index] = webUrl;
                      else if (photo.key === 'fotosConsumoFinal' && photo.index !== undefined) finalFotosConsumoFinal[photo.index] = webUrl;
                      else if (photo.key === 'fotosConsumoFinalS2' && photo.index !== undefined) finalFotosConsumoFinalS2[photo.index] = webUrl;
                      else if (photo.key === 'fotosConsumoFinalS3' && photo.index !== undefined) finalFotosConsumoFinalS3[photo.index] = webUrl;
                      else if (photo.key === 'fotosConsumoFinalAntenaS1' && photo.index !== undefined) finalFotosConsumoFinalAntenaS1[photo.index] = webUrl;
                      else if (photo.key === 'fotosConsumoFinalAntenaS2' && photo.index !== undefined) finalFotosConsumoFinalAntenaS2[photo.index] = webUrl;
                      else if (photo.key === 'fotosConsumoFinalAntenaS3' && photo.index !== undefined) finalFotosConsumoFinalAntenaS3[photo.index] = webUrl;
                      
                      else if (photo.key === 'fotoEstructura') finalFotoEstructura = webUrl;
                      else if (photo.key === 'fotoFueraContenedor') finalFotoFueraContenedor = webUrl;
                      else if (photo.key === 'fotoMedidor') finalFotoMedidor = webUrl;
                      else if (photo.key === 'fotoSectorMedidor') finalFotoSectorMedidor = webUrl;
                      else if (photo.key === 'fotoDisplayRectificador') finalFotoDisplayRectificador = webUrl;
                      else if (photo.key === 'fotoEquipo3GEncendido') finalFotoEquipo3GEncendido = webUrl;
                      else if (photo.key === 'fotoBreaker3GEncendido') finalFotoBreaker3GEncendido = webUrl;
                      else if (photo.key === 'fotoBreaker3GApagado') finalFotoBreaker3GApagado = webUrl;
                      else if (photo.key === 'fotoEquipo3GApagado') finalFotoEquipo3GApagado = webUrl;
                      else if (photo.key === 'fotoEspacioRetirado') finalFotoEspacioRetirado = webUrl;
                      else if (photo.key === 'fotoRRUEncendido') finalFotoRRUEncendido = webUrl;
                      else if (photo.key === 'fotoRRUApagado') finalFotoRRUApagado = webUrl;
                      else if (photo.key === 'fotoBreakerBaseband1Encendido') finalFotoBreakerBaseband1Encendido = webUrl;
                      else if (photo.key === 'fotoBaseband1Encendida') finalFotoBaseband1Encendida = webUrl;
                      else if (photo.key === 'fotoBreakerBaseband1Apagado') finalFotoBreakerBaseband1Apagado = webUrl;
                      else if (photo.key === 'fotoEspacioBaseband1Retirada') finalFotoEspacioBaseband1Retirada = webUrl;
                      else if (photo.key === 'fotoConsumoInicialCc1') finalFotoConsumoInicialCc1 = webUrl;
                      else if (photo.key === 'fotoConsumoFinalCc1') finalFotoConsumoFinalCc1 = webUrl;
                      else if (photo.key === 'fotoBreakerBaseband2Encendido') finalFotoBreakerBaseband2Encendido = webUrl;
                      else if (photo.key === 'fotoBaseband2Encendida') finalFotoBaseband2Encendida = webUrl;
                      else if (photo.key === 'fotoBreakerBaseband2Apagado') finalFotoBreakerBaseband2Apagado = webUrl;
                      else if (photo.key === 'fotoEspacioBaseband2Retirada') finalFotoEspacioBaseband2Retirada = webUrl;
                      else if (photo.key === 'fotoConsumoInicialCc2') finalFotoConsumoInicialCc2 = webUrl;
                      else if (photo.key === 'fotoConsumoFinalCc2') finalFotoConsumoFinalCc2 = webUrl;
                      else if (photo.key === 'fotoBreakerBaseband3Encendido') finalFotoBreakerBaseband3Encendido = webUrl;
                      else if (photo.key === 'fotoBaseband3Encendida') finalFotoBaseband3Encendida = webUrl;
                      else if (photo.key === 'fotoBreakerBaseband3Apagado') finalFotoBreakerBaseband3Apagado = webUrl;
                      else if (photo.key === 'fotoEspacioBaseband3Retirada') finalFotoEspacioBaseband3Retirada = webUrl;
                      else if (photo.key === 'fotoConsumoInicialCc3') finalFotoConsumoInicialCc3 = webUrl;
                      else if (photo.key === 'fotoConsumoFinalCc3') finalFotoConsumoFinalCc3 = webUrl;
                      else if (photo.key === 'fotoBreakerAntenaS1Encendido') finalFotoBreakerAntenaS1Encendido = webUrl;
                      else if (photo.key === 'fotoConsumoInicialCcAntenaS1') finalFotoConsumoInicialCcAntenaS1 = webUrl;
                      else if (photo.key === 'fotoBreakerAntenaS1Apagado') finalFotoBreakerAntenaS1Apagado = webUrl;
                      else if (photo.key === 'fotoConsumoFinalCcAntenaS1') finalFotoConsumoFinalCcAntenaS1 = webUrl;

                      else if (photo.key === 'fotoBreakerAntenaS2Encendido') finalFotoBreakerAntenaS2Encendido = webUrl;
                      else if (photo.key === 'fotoConsumoInicialCcAntenaS2') finalFotoConsumoInicialCcAntenaS2 = webUrl;
                      else if (photo.key === 'fotoBreakerAntenaS2Apagado') finalFotoBreakerAntenaS2Apagado = webUrl;
                      else if (photo.key === 'fotoConsumoFinalCcAntenaS2') finalFotoConsumoFinalCcAntenaS2 = webUrl;

                      else if (photo.key === 'fotoBreakerAntenaS3Encendido') finalFotoBreakerAntenaS3Encendido = webUrl;
                      else if (photo.key === 'fotoConsumoInicialCcAntenaS3') finalFotoConsumoInicialCcAntenaS3 = webUrl;
                      else if (photo.key === 'fotoBreakerAntenaS3Apagado') finalFotoBreakerAntenaS3Apagado = webUrl;
                      else if (photo.key === 'fotoConsumoFinalCcAntenaS3') finalFotoConsumoFinalCcAntenaS3 = webUrl;
                      else if (photo.key === 'fotoChapaAnterior') finalFotoChapaAnterior = webUrl;
                      else if (photo.key === 'fotoNuevaChapa') finalFotoNuevaChapa = webUrl;
                      else if (photo.key === 'fotoLlaveProgramacion') finalFotoLlaveProgramacion = webUrl;
                      else if (photo.key === 'fotoPuertaCerrada') finalFotoPuertaCerrada = webUrl;
                      else if (photo.key === 'fotoRectificador') finalFotoRectificador = webUrl;
                      else if (photo.key === 'fotoContenedor1') finalFotoContenedor1 = webUrl;
                      else if (photo.key === 'fotoContenedor2') finalFotoContenedor2 = webUrl;
                      else if (photo.key === 'fotoSitio1') finalFotoSitio1 = webUrl;
                      else if (photo.key === 'fotoSitio2') finalFotoSitio2 = webUrl;
                      else if (photo.key === 'fotoEstructuraSalida') finalFotoEstructuraSalida = webUrl;
                      else if (photo.key === 'fotosConsumoFinalCaEvidencia' && photo.index !== undefined) finalFotosConsumoFinalCaEvidencia[photo.index] = webUrl;
                      else if (photo.key === 'fotoConsumoFinalCcRectificador') finalFotoConsumoFinalCcRectificador = webUrl;
                      else if (photo.key === 'fotoAlarmasOVP') finalFotoAlarmasOVP = webUrl;
                      else if (photo.key === 'fotoAlarmasEquipos') finalFotoAlarmasEquipos = webUrl;
                      else if (photo.key === 'fotoAlarmasMigradas') finalFotoAlarmasMigradas = webUrl;
                      else if (photo.key === 'fotoAlarmasFinalesOVP') finalFotoAlarmasFinalesOVP = webUrl;
                      else if (photo.key === 'fotoNoImplementacion') finalFotoNoImplementacion = webUrl;
                      else if (photo.key === 'fotoAlarmasImplementadas') finalFotoAlarmasImplementadas = webUrl;

                    } catch (err) {
                      console.error(`Error subiendo foto ${photo.uri}:`, err);
                    }
                    
                    const progressPercent = 15 + (70 * (uploadedCount / totalPhotos));
                    setUploadProgress(progressPercent);
                  }
                } else if (!context?.isApiConnected) {
                  setUploadProgress(50);
                  setUploadStatus('API local no disponible. Guardando reporte en modo offline local...');
                  await new Promise(resolve => setTimeout(resolve, 800));
                }

                // 3. Subir información estructurada a la BD local
                setUploadProgress(85);
                setUploadStatus('Sincronizando información técnica en PostgreSQL...');
                const nowStr = new Date().toISOString();

                await context?.updatePlanning(planning.id, {
                  status: 'Ejecutado',
                  endTime: nowStr,
                  hallazgos: {
                    observaciones: observaciones,
                    fotos: finalFotos,
                  },
                  datosGenerales: {
                    tipoEstructura,
                    tipoContenedor,
                    tipoEmpalme,
                    fotosEmpalme: finalFotosEmpalme,
                    capacidadProteccion,
                    fotoMedidor: finalFotoMedidor,
                    fotoSectorMedidor: finalFotoSectorMedidor,
                    numeroMedidor,
                    lecturaConsumo,
                    fotoEstructura: finalFotoEstructura,
                    fotoFueraContenedor: finalFotoFueraContenedor,
                    fotosGeneralesSitio: finalFotosGeneralesSitio,
                    fotosInteriorContenedor: finalFotosInteriorContenedor,
                    ampereEmpalme: ampereEmpalmeRef.current,
                    fotoDisplayRectificador: finalFotoDisplayRectificador,
                    ampereDisplayRectificador,
                  },
                  cambioChapa: isIloq ? {
                    tipoChapa,
                    nroSerie,
                    estadoInicial: estadoInicialChapa,
                    fotoChapaAnterior: finalFotoChapaAnterior,
                    fotoNuevaChapa: finalFotoNuevaChapa,
                    fotoLlaveProgramacion: finalFotoLlaveProgramacion,
                    fotoPuertaCerrada: finalFotoPuertaCerrada,
                    estadoFinal: estadoFinalChapa,
                    justificacion: justificacionChapa,
                  } : undefined,
                  apagado3G: (!isIloq && !isApagadoBafi) ? {
                    estado3G,
                    seApagara3G,
                    estadoRRU,
                    seApagaraRRU,
                    fotoEquipo3GEncendido: finalFotoEquipo3GEncendido,
                    fotoBreaker3GEncendido: finalFotoBreaker3GEncendido,
                    fotoBreaker3GApagado: finalFotoBreaker3GApagado,
                    fotoEquipo3GApagado: finalFotoEquipo3GApagado,
                    fotoEspacioRetirado: finalFotoEspacioRetirado,
                    seRetirara3G,
                    fotoRRUEncendido: finalFotoRRUEncendido,
                    fotoRRUApagado: finalFotoRRUApagado,
                    ampere3GEncendido,
                  } : undefined,
                  apagadoBafiSector1: isApagadoBafi ? {
                    estadoBasebandSector1,
                    fotoBreakerBaseband1Encendido: finalFotoBreakerBaseband1Encendido,
                    fotoBaseband1Encendida: finalFotoBaseband1Encendida,
                    confirmadoApagadoRetirar,
                    fotoBreakerBaseband1Apagado: finalFotoBreakerBaseband1Apagado,
                    fotoEspacioBaseband1Retirada: finalFotoEspacioBaseband1Retirada,
                    fotosConsumoFinal: finalFotosConsumoFinal,
                    ampereConsumoFinal,
                    fotoConsumoInicialCc: finalFotoConsumoInicialCc1,
                    ampereConsumoInicialCc: ampereConsumoInicialCc1,
                    fotoConsumoFinalCc: finalFotoConsumoFinalCc1,
                    ampereConsumoFinalCc: ampereConsumoFinalCc1,
                  } : undefined,
                  apagadoBafiSector2: isApagadoBafi ? {
                    estadoBasebandSector2,
                    fotoBreakerBaseband2Encendido: finalFotoBreakerBaseband2Encendido,
                    fotoBaseband2Encendida: finalFotoBaseband2Encendida,
                    confirmadoApagadoRetirar: confirmadoApagadoRetirarS2,
                    fotoBreakerBaseband2Apagado: finalFotoBreakerBaseband2Apagado,
                    fotoEspacioBaseband2Retirada: finalFotoEspacioBaseband2Retirada,
                    fotosConsumoFinal: finalFotosConsumoFinalS2,
                    ampereConsumoFinal: ampereConsumoFinalS2,
                    fotoConsumoInicialCc: finalFotoConsumoInicialCc2,
                    ampereConsumoInicialCc: ampereConsumoInicialCc2,
                    fotoConsumoFinalCc: finalFotoConsumoFinalCc2,
                    ampereConsumoFinalCc: ampereConsumoFinalCc2,
                  } : undefined,
                  apagadoBafiSector3: isApagadoBafi ? {
                    estadoBasebandSector3,
                    fotoBreakerBaseband3Encendido: finalFotoBreakerBaseband3Encendido,
                    fotoBaseband3Encendida: finalFotoBaseband3Encendida,
                    confirmadoApagadoRetirar: confirmadoApagadoRetirarS3,
                    fotoBreakerBaseband3Apagado: finalFotoBreakerBaseband3Apagado,
                    fotoEspacioBaseband3Retirada: finalFotoEspacioBaseband3Retirada,
                    fotosConsumoFinal: finalFotosConsumoFinalS3,
                    ampereConsumoFinal: ampereConsumoFinalS3,
                    fotoConsumoInicialCc: finalFotoConsumoInicialCc3,
                    ampereConsumoInicialCc: ampereConsumoInicialCc3,
                    fotoConsumoFinalCc: finalFotoConsumoFinalCc3,
                    ampereConsumoFinalCc: ampereConsumoFinalCc3,
                  } : undefined,
                   apagadoAntenaSector1: isApagadoBafi ? {
                    estadoAntenaSector1,
                    fotoBreakerAntenaS1Encendido: finalFotoBreakerAntenaS1Encendido,
                    seApagaraAntenaS1,
                    fotoBreakerAntenaS1Apagado: finalFotoBreakerAntenaS1Apagado,
                    fotosConsumoFinal: finalFotosConsumoFinalAntenaS1,
                    ampereConsumoFinal: ampereConsumoFinalAntenaS1,
                    fotoConsumoInicialCc: finalFotoConsumoInicialCcAntenaS1,
                    fotoConsumoFinalCc: finalFotoConsumoFinalCcAntenaS1,
                    textoCompartida5G: textoCompartida5GAntenaS1,
                    confirmadoApagadoAntena: confirmadoApagadoAntenaS1,
                  } : undefined,
                  apagadoAntenaSector2: isApagadoBafi ? {
                    estadoAntenaSector2,
                    fotoBreakerAntenaS2Encendido: finalFotoBreakerAntenaS2Encendido,
                    seApagaraAntenaS2,
                    fotoBreakerAntenaS2Apagado: finalFotoBreakerAntenaS2Apagado,
                    fotosConsumoFinal: finalFotosConsumoFinalAntenaS2,
                    ampereConsumoFinal: ampereConsumoFinalAntenaS2,
                    fotoConsumoInicialCc: finalFotoConsumoInicialCcAntenaS2,
                    fotoConsumoFinalCc: finalFotoConsumoFinalCcAntenaS2,
                    textoCompartida5G: textoCompartida5GAntenaS2,
                    confirmadoApagadoAntena: confirmadoApagadoAntenaS2,
                  } : undefined,
                  apagadoAntenaSector3: isApagadoBafi ? {
                    estadoAntenaSector3,
                    fotoBreakerAntenaS3Encendido: finalFotoBreakerAntenaS3Encendido,
                    seApagaraAntenaS3,
                    fotoBreakerAntenaS3Apagado: finalFotoBreakerAntenaS3Apagado,
                    fotosConsumoFinal: finalFotosConsumoFinalAntenaS3,
                    ampereConsumoFinal: ampereConsumoFinalAntenaS3,
                    fotoConsumoInicialCc: finalFotoConsumoInicialCcAntenaS3,
                    fotoConsumoFinalCc: finalFotoConsumoFinalCcAntenaS3,
                    textoCompartida5G: textoCompartida5GAntenaS3,
                    confirmadoApagadoAntena: confirmadoApagadoAntenaS3,
                  } : undefined,
                  alarmasExternas: !isIloq ? {
                    tecnologiaAlarmas,
                    fotoAlarmasOVP: finalFotoAlarmasOVP,
                    fotoAlarmasEquipos: finalFotoAlarmasEquipos,
                    migraranTecnologia,
                    fotoAlarmasMigradas: finalFotoAlarmasMigradas,
                    fotoAlarmasFinalesOVP: finalFotoAlarmasFinalesOVP,
                    implementaranAlarmas,
                    motivosNoImplementacion,
                    fotoNoImplementacion: finalFotoNoImplementacion,
                    tecnologiaImplementacion,
                    fotoAlarmasImplementadas: finalFotoAlarmasImplementadas,
                  } : undefined,
                  evidenciaSalida: !isIloq ? {
                    fotoRectificador: finalFotoRectificador,
                    fotoContenedor1: finalFotoContenedor1,
                    fotoContenedor2: finalFotoContenedor2,
                    fotoSitio1: finalFotoSitio1,
                    fotoSitio2: finalFotoSitio2,
                    fotoEstructuraSalida: finalFotoEstructuraSalida,
                    fotosConsumoFinalCaEvidencia: finalFotosConsumoFinalCaEvidencia,
                    ampereConsumoFinalCaEvidencia: ampereConsumoFinalCaEvidencia,
                    fotoConsumoFinalCcRectificador: finalFotoConsumoFinalCcRectificador,
                    ampereDisplayRectificadorFinal: ampereDisplayRectificadorFinal,
                  } : undefined,
                });

                await context?.updateSite(site.id, {
                  estadoExcel: 'Ejecutado'
                });

                // 4. Verificar integridad de subida en la API (si está online)
                if (context?.isApiConnected) {
                  setUploadProgress(92);
                  setUploadStatus('Verificando integridad de datos en el servidor...');
                  try {
                    const serverData = await getPlanningDetail(planning.id);
                    
                    // Comprobar que el estado y la fecha de finalización se hayan guardado en PostgreSQL
                    const isStatusOk = serverData.status === 'Ejecutado';
                    const isEndTimeOk = !!serverData.end_time;
                    
                    if (isStatusOk && isEndTimeOk) {
                      setUploadProgress(100);
                      setUploadStatus('¡Verificación exitosa! Datos y fotos resguardados en PostgreSQL.');
                      await new Promise(resolve => setTimeout(resolve, 1500));
                    } else {
                      console.log('Verification failed: mismatch', serverData);
                      setUploadProgress(100);
                      setUploadStatus('⚠️ Sincronizado localmente. Verificación parcial en el servidor.');
                      await new Promise(resolve => setTimeout(resolve, 2500));
                    }
                  } catch (verifyErr) {
                    console.log('Error verifying planning upload:', verifyErr);
                    setUploadProgress(100);
                    setUploadStatus('⚠️ Guardado localmente. La verificación del servidor falló o expiró.');
                    await new Promise(resolve => setTimeout(resolve, 2500));
                  }
                } else {
                  setUploadProgress(100);
                  setUploadStatus('¡Guardado local completado exitosamente (modo offline)!');
                  await new Promise(resolve => setTimeout(resolve, 1500));
                }

                setUploadVisible(false);
                if (context?.currentUser?.role === 'Trabajador') {
                  navigation.navigate('MainTabs', { screen: 'Actividad' });
                } else {
                  navigation.goBack();
                }

              };

              runUploadAndFinalize();
            } 
          }
        ]
      );
    }
  };

  const handleReopen = () => {
    if (!planning || !site) return;
    Alert.alert(
      "Reabrir Actividad",
      "¿Estás seguro de que deseas reabrir esta actividad? El sitio volverá a estar 'En ejecución'.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Reabrir", 
          onPress: () => {
            context?.updatePlanning(planning.id, {
              status: 'En ejecución',
              endTime: null
            });
            context?.updateSite(site.id, {
              estadoExcel: 'En ejecución'
            });
            Alert.alert("Éxito", "La actividad ha sido reabierta.");
          } 
        }
      ]
    );
  };

  const calculateDatosProgress = () => {
    const totalFields = tipoEmpalme === 'Trifásico' ? 19 : 17;
    let completedFields = 0;
    if (tipoEstructura) completedFields++;
    if (fotoEstructura) completedFields++;
    if (tipoContenedor) completedFields++;
    if (fotoFueraContenedor) completedFields++;
    if (fotosGeneralesSitio[0]) completedFields++;
    if (fotosGeneralesSitio[1]) completedFields++;
    if (fotosInteriorContenedor[0]) completedFields++;
    if (fotosInteriorContenedor[1]) completedFields++;
    if (tipoEmpalme) completedFields++;
    if (capacidadProteccion) completedFields++;
    if (fotoMedidor) completedFields++;
    if (fotoSectorMedidor) completedFields++;
    if (numeroMedidor) completedFields++;
    if (lecturaConsumo) completedFields++;
    if (fotoDisplayRectificador) completedFields++;
    if (ampereDisplayRectificador) completedFields++;
    if (tipoEmpalme === 'Monofásico') { if (fotosEmpalme[0]) completedFields++; }
    else if (tipoEmpalme === 'Trifásico') {
      if (fotosEmpalme[0]) completedFields++;
      if (fotosEmpalme[1]) completedFields++;
      if (fotosEmpalme[2]) completedFields++;
    }
    return Math.round((completedFields / totalFields) * 100);
  };

  const calculateChapaProgress = () => {
    let total = 8;
    let completed = 0;
    if (tipoChapa) completed++;
    if (nroSerie.trim()) completed++;
    if (estadoInicialChapa) completed++;
    if (fotoChapaAnterior) completed++;
    if (fotoNuevaChapa) completed++;
    if (fotoLlaveProgramacion) completed++;
    if (fotoPuertaCerrada) completed++;
    if (estadoFinalChapa) completed++;

    return Math.round((completed / total) * 100);
  };

  const calculateBafiSector1Progress = () => {
    if (estadoBasebandSector1 === 'Encendido') {
      const total = 6;
      let completed = 0;
      if (fotoBreakerBaseband1Encendido) completed++;
      if (fotoBaseband1Encendida) completed++;
      if (fotoConsumoInicialCc1) completed++;
      if (fotoBreakerBaseband1Apagado) completed++;
      if (fotoConsumoFinalCc1) completed++;
      if (fotoEspacioBaseband1Retirada) completed++;
      return Math.round((completed / total) * 100);
    } else if (estadoBasebandSector1 === 'Apagado') {
      const total = 3;
      let completed = 0;
      if (fotoBreakerBaseband1Apagado) completed++;
      if (fotoConsumoFinalCc1) completed++;
      if (fotoEspacioBaseband1Retirada) completed++;
      return Math.round((completed / total) * 100);
    } else if (estadoBasebandSector1 === 'N/A') {
      return 100;
    }
    return 0;
  };

  const calculateBafiSector2Progress = () => {
    if (estadoBasebandSector2 === 'Encendido') {
      const total = 6;
      let completed = 0;
      if (fotoBreakerBaseband2Encendido) completed++;
      if (fotoBaseband2Encendida) completed++;
      if (fotoConsumoInicialCc2) completed++;
      if (fotoBreakerBaseband2Apagado) completed++;
      if (fotoConsumoFinalCc2) completed++;
      if (fotoEspacioBaseband2Retirada) completed++;
      return Math.round((completed / total) * 100);
    } else if (estadoBasebandSector2 === 'Apagado') {
      const total = 3;
      let completed = 0;
      if (fotoBreakerBaseband2Apagado) completed++;
      if (fotoConsumoFinalCc2) completed++;
      if (fotoEspacioBaseband2Retirada) completed++;
      return Math.round((completed / total) * 100);
    } else if (estadoBasebandSector2 === 'N/A') {
      return 100;
    }
    return 0;
  };

  const calculateBafiSector3Progress = () => {
    if (estadoBasebandSector3 === 'Encendido') {
      const total = 6;
      let completed = 0;
      if (fotoBreakerBaseband3Encendido) completed++;
      if (fotoBaseband3Encendida) completed++;
      if (fotoConsumoInicialCc3) completed++;
      if (fotoBreakerBaseband3Apagado) completed++;
      if (fotoConsumoFinalCc3) completed++;
      if (fotoEspacioBaseband3Retirada) completed++;
      return Math.round((completed / total) * 100);
    } else if (estadoBasebandSector3 === 'Apagado') {
      const total = 3;
      let completed = 0;
      if (fotoBreakerBaseband3Apagado) completed++;
      if (fotoConsumoFinalCc3) completed++;
      if (fotoEspacioBaseband3Retirada) completed++;
      return Math.round((completed / total) * 100);
    } else if (estadoBasebandSector3 === 'N/A') {
      return 100;
    }
    return 0;
  };

  const calculateAntenaSector1Progress = () => {
    if (seApagaraAntenaS1 === 'Si') {
      const total = 4;
      let completed = 0;
      if (fotoBreakerAntenaS1Encendido) completed++;
      if (fotoConsumoInicialCcAntenaS1) completed++;
      if (fotoBreakerAntenaS1Apagado) completed++;
      if (fotoConsumoFinalCcAntenaS1) completed++;
      return Math.round((completed / total) * 100);
    } else if (seApagaraAntenaS1 === 'No' || seApagaraAntenaS1 === 'N/A') {
      return 100;
    }
    return 0;
  };

  const calculateAntenaSector2Progress = () => {
    if (seApagaraAntenaS2 === 'Si') {
      const total = 4;
      let completed = 0;
      if (fotoBreakerAntenaS2Encendido) completed++;
      if (fotoConsumoInicialCcAntenaS2) completed++;
      if (fotoBreakerAntenaS2Apagado) completed++;
      if (fotoConsumoFinalCcAntenaS2) completed++;
      return Math.round((completed / total) * 100);
    } else if (seApagaraAntenaS2 === 'No' || seApagaraAntenaS2 === 'N/A') {
      return 100;
    }
    return 0;
  };

  const calculateAntenaSector3Progress = () => {
    if (seApagaraAntenaS3 === 'Si') {
      const total = 4;
      let completed = 0;
      if (fotoBreakerAntenaS3Encendido) completed++;
      if (fotoConsumoInicialCcAntenaS3) completed++;
      if (fotoBreakerAntenaS3Apagado) completed++;
      if (fotoConsumoFinalCcAntenaS3) completed++;
      return Math.round((completed / total) * 100);
    } else if (seApagaraAntenaS3 === 'No' || seApagaraAntenaS3 === 'N/A') {
      return 100;
    }
    return 0;
  };

  const calculateAlarmasProgress = () => {
    if (!tecnologiaAlarmas) return 0;
    const tec = tecnologiaAlarmas;
    if (tec === 'LTE' || tec === '5G') {
      const total = 3;
      let completed = 1;
      if (fotoAlarmasOVP) completed++;
      if (fotoAlarmasEquipos) completed++;
      return Math.round((completed / total) * 100);
    } else if (tec === '3G' || tec === 'BAFI') {
      if (migraranTecnologia) {
        const total = 6;
        let completed = 2;
        if (fotoAlarmasEquipos) completed++;
        if (fotoAlarmasOVP) completed++;
        if (fotoAlarmasMigradas) completed++;
        if (fotoAlarmasFinalesOVP) completed++;
        return Math.round((completed / total) * 100);
      } else {
        const total = 3;
        let completed = 1;
        if (fotoAlarmasEquipos) completed++;
        if (fotoAlarmasOVP) completed++;
        return Math.round((completed / total) * 100);
      }
    } else if (tec === 'No existen') {
      const impl = implementaranAlarmas;
      if (impl === 'No') {
        const total = 4;
        let completed = 2;
        if (motivosNoImplementacion && motivosNoImplementacion.trim()) completed++;
        if (fotoNoImplementacion) completed++;
        return Math.round((completed / total) * 100);
      } else if (impl === 'Si') {
        const total = 5;
        let completed = 2;
        if (tecnologiaImplementacion) completed++;
        if (fotoAlarmasImplementadas) completed++;
        if (fotoAlarmasFinalesOVP) completed++;
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
    let completed = 0;
    let total = 6;
    if (fotoRectificador) completed++;
    if (fotoContenedor1) completed++;
    if (fotoContenedor2) completed++;
    if (fotoSitio1) completed++;
    if (fotoSitio2) completed++;
    if (fotoEstructuraSalida) completed++;

    if (tipoEmpalme === 'Monofásico') {
      total += 1;
      if (fotosConsumoFinalCaEvidencia && fotosConsumoFinalCaEvidencia[0]) completed++;
    } else {
      total += 3;
      if (fotosConsumoFinalCaEvidencia && fotosConsumoFinalCaEvidencia[0]) completed++;
      if (fotosConsumoFinalCaEvidencia && fotosConsumoFinalCaEvidencia[1]) completed++;
      if (fotosConsumoFinalCaEvidencia && fotosConsumoFinalCaEvidencia[2]) completed++;
    }

    total += 1;
    if (fotoConsumoFinalCcRectificador) completed++;

    return Math.round((completed / total) * 100);
  };

  const isEvidenciaSalidaUnlocked = () => {
    if (isIloq) return false;
    const alarmasProgress = calculateAlarmasProgress();
    if (alarmasProgress < 100) return false;

    if (isApagadoBafi) {
      const bafi1 = calculateBafiSector1Progress();
      const bafi2 = calculateBafiSector2Progress();
      const bafi3 = calculateBafiSector3Progress();
      const antena1 = calculateAntenaSector1Progress();
      const antena2 = calculateAntenaSector2Progress();
      const antena3 = calculateAntenaSector3Progress();
      return bafi1 === 100 && bafi2 === 100 && bafi3 === 100 &&
             antena1 === 100 && antena2 === 100 && antena3 === 100;
    } else {
      const secondProgress = getSecondProgress();
      return secondProgress === 100;
    }
  };

  const getAmpereEmpalmeFilled = () => {
    if (tipoEmpalme === 'Monofásico') {
      return !!(ampereEmpalme[0] && ampereEmpalme[0] !== '00,00' && ampereEmpalme[0].trim() !== '');
    }
    if (tipoEmpalme === 'Trifásico') {
      return !!(
        ampereEmpalme[0] && ampereEmpalme[0] !== '00,00' && ampereEmpalme[0].trim() !== '' &&
        ampereEmpalme[1] && ampereEmpalme[1] !== '00,00' && ampereEmpalme[1].trim() !== '' &&
        ampereEmpalme[2] && ampereEmpalme[2] !== '00,00' && ampereEmpalme[2].trim() !== ''
      );
    }
    return false;
  };
  const isAmpereEmpalmeFilled = getAmpereEmpalmeFilled();

  const getCurrentFolderProgress = () => {
    if (activeFolder === 'datos') return calculateDatosProgress();
    if (activeFolder === 'apagado') return getSecondProgress();
    if (activeFolder === 'bafiS2') return calculateBafiSector2Progress();
    if (activeFolder === 'bafiS3') return calculateBafiSector3Progress();
    if (activeFolder === 'antenaS1') return calculateAntenaSector1Progress();
    if (activeFolder === 'antenaS2') return calculateAntenaSector2Progress();
    if (activeFolder === 'antenaS3') return calculateAntenaSector3Progress();
    if (activeFolder === 'alarmasExternas') return calculateAlarmasProgress();
    if (activeFolder === 'evidenciaSalida') return calculateEvidenciaSalidaProgress();
    return 0;
  };

  const getSecondProgress = () => {
    if (isApagadoBafi) return calculateBafiSector1Progress();
    return isIloq ? calculateChapaProgress() : calculateApagadoProgress();
  };

  const calculateApagadoProgress = () => {
    const is3GCompleted = (() => {
      if (estado3G === 'Encendido') {
        if (!fotoEquipo3GEncendido || !fotoBreaker3GEncendido || !seApagara3G) return false;
        if (seApagara3G === 'Si' && (!fotoBreaker3GApagado || !fotoEquipo3GApagado || !fotoEspacioRetirado)) return false;
        return true;
      }
      if (estado3G === 'Apagado') {
        if (!seRetirara3G) return false;
        if (seRetirara3G === 'Si' && (!fotoBreaker3GApagado || !fotoEquipo3GApagado || !fotoEspacioRetirado)) return false;
        return true;
      }
      if (estado3G === 'N/A') return !!fotoEspacioRetirado;
      return false;
    })();
    const isRRUCompleted = (() => {
      if (estadoRRU === 'Encendido') {
        if (!fotoRRUEncendido || !seApagaraRRU) return false;
        if (seApagaraRRU === 'Si' && !fotoRRUApagado) return false;
        return true;
      }
      if (estadoRRU === 'Apagado') return !!fotoRRUApagado;
      if (estadoRRU === 'N/A') return true;
      return false;
    })();
    let completedCount = 0;
    if (is3GCompleted) completedCount++;
    if (isRRUCompleted && is3GCompleted) completedCount++;
    return Math.round((completedCount / 2) * 100);
  };

  const renderConsumoFinalFields = (
    target: 'fotosConsumoFinal' | 'fotosConsumoFinalS2' | 'fotosConsumoFinalS3' | 'fotosConsumoFinalAntenaS1' | 'fotosConsumoFinalAntenaS2' | 'fotosConsumoFinalAntenaS3',
    fotosCF: string[],
    ampereCF: string[]
  ) => {
    if (tipoEmpalme === 'Monofásico') {
      return (
        <View style={styles.photoField}>
          <Text style={styles.label}>Foto Consumo Final de Corriente Alterna en Breaker General</Text>
          {fotosCF[0] ? (
            <View>
              <View style={styles.photoThumbContainer}>
                <TouchableOpacity onPress={() => setPreviewUri(fotosCF[0])}>
                  <Image source={{ uri: fotosCF[0] }} style={styles.photoFull} />
                </TouchableOpacity>
                {!isReadOnly && (
                  <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto(target, 0)}>
                    <Ionicons name="close-circle" size={24} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity 
                style={styles.ampereDisplay} 
                onPress={() => !isReadOnly && (setActiveAmpereTarget(target), setActiveAmpereIndex(0), setTempAmpere(ampereCF[0] || ''), setShowAmpereModal(true))}
                activeOpacity={isReadOnly ? 1 : 0.7}
              >
                <Text style={styles.ampereText}>Lectura: {ampereCF[0] || '00,00'} A</Text>
                <Ionicons name="create-outline" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            !isReadOnly ? (
              <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage(target, 0)}>
                <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                <Text style={styles.addPhotoText}>Subir Foto</Text>
              </TouchableOpacity>
            ) : null
          )}
        </View>
      );
    } else if (tipoEmpalme === 'Trifásico') {
      return (
        <View style={{ marginTop: 10 }}>
          <Text style={styles.label}>Fotos Consumo Final Trifásico</Text>
          {['Fase R', 'Fase S', 'Fase T'].map((label, i) => (
            <View key={i} style={styles.trifasicoRow}>
              <View style={styles.trifasicoPhotoCol}>
                {fotosCF[i] ? (
                  <View style={styles.trifasicoPhotoWrapper}>
                    <TouchableOpacity onPress={() => setPreviewUri(fotosCF[i])}>
                      <Image source={{ uri: fotosCF[i] }} style={styles.photoThumb} />
                    </TouchableOpacity>
                    {!isReadOnly && (
                      <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto(target, i)}>
                        <Ionicons name="close-circle" size={24} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  !isReadOnly ? (
                    <TouchableOpacity style={styles.trifasicoAddBox} onPress={() => handlePickImage(target, i)}>
                      <Ionicons name="camera" size={24} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>
                  ) : null
                )}
              </View>
              <View style={styles.trifasicoInfoCol}>
                <Text style={styles.trifasicoLabel}>{label}</Text>
                {fotosCF[i] && (
                  <TouchableOpacity 
                    style={styles.ampereDisplayTrifasico} 
                    onPress={() => !isReadOnly && (setActiveAmpereTarget(target), setActiveAmpereIndex(i), setTempAmpere(ampereCF[i] || ''), setShowAmpereModal(true))}
                    activeOpacity={isReadOnly ? 1 : 0.7}
                  >
                    <Text style={styles.ampereTextTrifasico}>{ampereCF[i] || '00,00'} A</Text>
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      );
    }
    return null;
  };

  if (!planning || !site) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Text style={{ color: colors.text, fontSize: 16, marginBottom: 20 }}>Información no encontrada.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.modalBtnConfirm}>
          <Text style={styles.modalBtnText}>Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const overallProgress = isIloq 
    ? getSecondProgress() 
    : isApagadoBafi
    ? Math.round((calculateDatosProgress() + calculateBafiSector1Progress() + calculateBafiSector2Progress() + calculateBafiSector3Progress() + calculateAntenaSector1Progress() + calculateAntenaSector2Progress() + calculateAntenaSector3Progress() + calculateAlarmasProgress() + calculateEvidenciaSalidaProgress()) / 9)
    : Math.round((calculateDatosProgress() + getSecondProgress() + calculateAlarmasProgress() + calculateEvidenciaSalidaProgress()) / 4);

  const bafiGroupProgress = Math.round(
    (calculateBafiSector1Progress() + calculateBafiSector2Progress() + calculateBafiSector3Progress()) / 3
  );

  const antenasGroupProgress = Math.round(
    (calculateAntenaSector1Progress() + calculateAntenaSector2Progress() + calculateAntenaSector3Progress()) / 3
  );

  const getFolderIconAndColor = (folder: string | null) => {
    switch (folder) {
      case 'hallazgos':
        return { icon: 'warning', color: '#FFD60A' };
      case 'datos':
        return { icon: 'list', color: '#34C759' };
      case 'alarmasExternas':
        return { icon: 'notifications-outline', color: '#FF9500' };
      case 'evidenciaSalida':
        return { icon: 'exit-outline', color: '#30B0C7' };
      case 'apagado':
        if (isApagadoBafi) {
          return { icon: 'power', color: '#0A84FF' };
        } else if (isIloq) {
          return { icon: 'key', color: '#FF2D55' };
        } else {
          return { icon: 'power', color: '#5856D6' };
        }
      case 'bafiS2':
        return { icon: 'power', color: '#FF453A' };
      case 'bafiS3':
        return { icon: 'power', color: '#FFFFFF' };
      case 'antenaS1':
        return { icon: 'power', color: '#0A84FF' };
      case 'antenaS2':
        return { icon: 'power', color: '#FF453A' };
      case 'antenaS3':
        return { icon: 'power', color: '#FFFFFF' };
      default:
        return { icon: 'folder', color: '#FFFFFF' };
    }
  };

  const isIniciado = planning.status === 'En ejecución' || planning.status === 'Ejecutado';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Modal de previsualización de foto */}
      <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewCloseBtn} onPress={() => setPreviewUri(null)}>
            <Ionicons name="close-circle" size={40} color="#fff" />
          </TouchableOpacity>
          {previewUri && (
            <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      <Modal visible={isProcessing} transparent animationType="none">
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.processingTitle}>Procesando fotografía</Text>
            <Text style={styles.processingSubtitle}>Obteniendo ubicación y aplicando marca de agua...</Text>
          </View>
        </View>
      </Modal>

      {/* Overlay de descarga de informe desde base de datos */}
      <Modal visible={isSyncingFromDb} transparent animationType="fade">
        <View style={styles.processingOverlay}>
          <View style={[styles.processingCard, { paddingVertical: 32, paddingHorizontal: 28, gap: 16 }]}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
            <Text style={[styles.processingTitle, { fontSize: 18 }]}>Cargando Informe</Text>
            <Text style={[styles.processingSubtitle, { textAlign: 'center', lineHeight: 20 }]}>Descargando información actualizada{`\n`}desde la base de datos...</Text>
          </View>
        </View>
      </Modal>

      {/* Modal para ingresar Ampere */}
      <Modal
        visible={showAmpereModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAmpereModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Lectura de Ampere</Text>
            <Text style={styles.modalSubtitle}>Ingrese el valor en formato 00,00 (A)</Text>
            
            <View style={styles.ampereInputContainer}>
              <TextInput
                style={styles.ampereInput}
                value={tempAmpere}
                onChangeText={(val) => {
                  const numeric = val.replace(/[^0-9]/g, '');
                  if (numeric.length <= 4) {
                    let formatted = numeric;
                    if (numeric.length > 2) {
                      formatted = numeric.slice(0, 2) + ',' + numeric.slice(2);
                    }
                    setTempAmpere(formatted);
                  }
                }}
                placeholder="00,00"
                keyboardType="numeric"
                maxLength={5}
                autoFocus
              />
              <Text style={styles.ampereUnit}>A</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCancel]} 
                onPress={() => setShowAmpereModal(false)}
              >
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnConfirm]} 
                onPress={() => {
                  if (activeAmpereTarget === 'fotosConsumoFinalCaEvidencia') {
                    if (activeAmpereIndex !== null) {
                      const newValues = [...ampereConsumoFinalCaEvidencia];
                      newValues[activeAmpereIndex] = tempAmpere || '00,00';
                      setAmpereConsumoFinalCaEvidencia(newValues);
                      ampereConsumoFinalCaEvidenciaRef.current = newValues;
                    }
                  } else if (activeAmpereTarget === 'fotoConsumoFinalCcRectificador') {
                    setAmpereDisplayRectificadorFinal(tempAmpere || '00,00');
                    ampereDisplayRectificadorFinalRef.current = tempAmpere || '00,00';
                  } else if (activeAmpereTarget === 'fotoEquipo3GEncendido') {
                    setAmpere3GEncendido(tempAmpere || '00,00');
                  } else if (activeAmpereTarget === 'fotoDisplayRectificador') {
                    setAmpereDisplayRectificador(tempAmpere || '00,00');
                    ampereDisplayRectificadorRef.current = tempAmpere || '00,00';
                  } else if (activeAmpereTarget === 'fotoConsumoInicialCc1') {
                    setAmpereConsumoInicialCc1(tempAmpere || '00,00');
                    ampereConsumoInicialCc1Ref.current = tempAmpere || '00,00';
                  } else if (activeAmpereTarget === 'fotoConsumoFinalCc1') {
                    setAmpereConsumoFinalCc1(tempAmpere || '00,00');
                    ampereConsumoFinalCc1Ref.current = tempAmpere || '00,00';
                  } else if (activeAmpereTarget === 'fotoConsumoInicialCc2') {
                    setAmpereConsumoInicialCc2(tempAmpere || '00,00');
                    ampereConsumoInicialCc2Ref.current = tempAmpere || '00,00';
                  } else if (activeAmpereTarget === 'fotoConsumoFinalCc2') {
                    setAmpereConsumoFinalCc2(tempAmpere || '00,00');
                    ampereConsumoFinalCc2Ref.current = tempAmpere || '00,00';
                  } else if (activeAmpereTarget === 'fotoConsumoInicialCc3') {
                    setAmpereConsumoInicialCc3(tempAmpere || '00,00');
                    ampereConsumoInicialCc3Ref.current = tempAmpere || '00,00';
                  } else if (activeAmpereTarget === 'fotoConsumoFinalCc3') {
                    setAmpereConsumoFinalCc3(tempAmpere || '00,00');
                    ampereConsumoFinalCc3Ref.current = tempAmpere || '00,00';
                  } else if (activeAmpereTarget === 'fotosConsumoFinal') {
                    if (activeAmpereIndex !== null) {
                      const newValues = [...ampereConsumoFinal];
                      newValues[activeAmpereIndex] = tempAmpere || '00,00';
                      setAmpereConsumoFinal(newValues);
                      ampereConsumoFinalRef.current = newValues;
                    }
                  } else if (activeAmpereTarget === 'fotosConsumoFinalS2') {
                    if (activeAmpereIndex !== null) {
                      const newValues = [...ampereConsumoFinalS2];
                      newValues[activeAmpereIndex] = tempAmpere || '00,00';
                      setAmpereConsumoFinalS2(newValues);
                      ampereConsumoFinalS2Ref.current = newValues;
                    }
                  } else if (activeAmpereTarget === 'fotosConsumoFinalS3') {
                    if (activeAmpereIndex !== null) {
                      const newValues = [...ampereConsumoFinalS3];
                      newValues[activeAmpereIndex] = tempAmpere || '00,00';
                      setAmpereConsumoFinalS3(newValues);
                      ampereConsumoFinalS3Ref.current = newValues;
                    }
                  } else if (activeAmpereTarget === 'fotosConsumoFinalAntenaS1') {
                    if (activeAmpereIndex !== null) {
                      const newValues = [...ampereConsumoFinalAntenaS1];
                      newValues[activeAmpereIndex] = tempAmpere || '00,00';
                      setAmpereConsumoFinalAntenaS1(newValues);
                      ampereConsumoFinalAntenaS1Ref.current = newValues;
                    }
                  } else if (activeAmpereTarget === 'fotosConsumoFinalAntenaS2') {
                    if (activeAmpereIndex !== null) {
                      const newValues = [...ampereConsumoFinalAntenaS2];
                      newValues[activeAmpereIndex] = tempAmpere || '00,00';
                      setAmpereConsumoFinalAntenaS2(newValues);
                      ampereConsumoFinalAntenaS2Ref.current = newValues;
                    }
                  } else if (activeAmpereTarget === 'fotosConsumoFinalAntenaS3') {
                    if (activeAmpereIndex !== null) {
                      const newValues = [...ampereConsumoFinalAntenaS3];
                      newValues[activeAmpereIndex] = tempAmpere || '00,00';
                      setAmpereConsumoFinalAntenaS3(newValues);
                      ampereConsumoFinalAntenaS3Ref.current = newValues;
                    }
                  } else if (activeAmpereIndex !== null) {
                    const newValues = [...ampereEmpalme];
                    newValues[activeAmpereIndex] = tempAmpere || '00,00';
                    setAmpereEmpalme(newValues);
                    ampereEmpalmeRef.current = newValues;
                  }
                  setShowAmpereModal(false);
                }}
              >
                <Text style={styles.modalBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* ViewShot oculto fuera de pantalla — genera la imagen con marca de agua */}
      <View style={styles.offscreen} pointerEvents="none">
        <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.8 }}>
          <View style={styles.watermarkContainer}>
            {pendingUri ? (
              <Image source={{ uri: pendingUri }} style={styles.watermarkImage} resizeMode="cover" />
            ) : (
              <View style={{ flex: 1, backgroundColor: '#000' }} />
            )}
            <View style={styles.watermarkBanner}>
              <View style={styles.watermarkRow}>
                <View style={styles.watermarkTextCol}>
                  <Text style={styles.watermarkTitle}>{site.code} · {site.name}</Text>
                  <Text style={styles.watermarkCoords}>
                    📍 {pendingCoords ? `${pendingCoords.lat.toFixed(5)}, ${pendingCoords.lng.toFixed(5)}` : `${site.lat.toFixed(5)}, ${site.lng.toFixed(5)}`}
                  </Text>
                  <Text style={styles.watermarkTime}>🕐 {pendingTimestamp}</Text>
                </View>
                <Image source={LOGO_F1} style={styles.watermarkLogo} resizeMode="contain" />
              </View>
            </View>
          </View>
        </ViewShot>
      </View>


      <View style={styles.mainContainer}>
        {/* Layer 1: Background (Map or Form) */}
        <View style={styles.backgroundLayer}>
          {activeFolder === null ? (
            <View style={styles.mapContainer}>
              <View style={styles.mockMap}>
                <View style={styles.mapMarker}>
                  <View style={styles.markerDot} />
                  <View style={styles.markerPulse} />
                </View>
              </View>
              <View style={styles.siteInfoOverlayCompact}>
                {/* Top Row: Title/Code and Close Button */}
                <View style={styles.headerTopRow}>
                  <Text style={styles.overlayTitleCompact}>
                    {site.code} - {site.name}
                  </Text>
                  <TouchableOpacity onPress={() => navigation.goBack()} style={styles.overlayCloseBtnCompact}>
                    <Ionicons name="close-circle" size={24} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                </View>

                {/* Middle Row: Status Badge */}
                <View style={styles.headerMiddleRow}>
                  <View style={[
                    styles.statusBadgeSmallCompact,
                    planning.status === 'Ejecutado' ? { backgroundColor: 'rgba(48, 209, 88, 0.15)' } :
                    planning.status === 'En ejecución' ? { backgroundColor: 'rgba(255, 149, 0, 0.15)' } :
                    { backgroundColor: 'rgba(10, 132, 255, 0.15)' }
                  ]}>
                    <View style={[
                      styles.statusDot,
                      planning.status === 'Ejecutado' ? { backgroundColor: '#30D158' } :
                      planning.status === 'En ejecución' ? { backgroundColor: '#FF9500' } :
                      { backgroundColor: '#0A84FF' }
                    ]} />
                    <Text style={[
                      styles.statusBadgeTextSmallCompact,
                      planning.status === 'Ejecutado' ? { color: '#30D158' } :
                      planning.status === 'En ejecución' ? { color: '#FF9500' } :
                      { color: '#0A84FF' }
                    ]}>
                      {planning.status === 'Ejecutado' 
                        ? `Ejecutado • ${formatDateTime(planning.endTime)}` 
                        : planning.status === 'En ejecución' 
                          ? `En ejecución • ${elapsedTime || getElapsedTime(planning.startTime)}` 
                          : 'Planificado'}
                    </Text>
                  </View>
                </View>

                {/* Bottom Row: Full-width Progress Bar */}
                <View style={styles.headerProgressFullWidth}>
                  <View style={styles.progressTextRow}>
                    <Text style={styles.progressLabelCompact}>Avance de la Actividad</Text>
                    <Text style={styles.progressPercentCompact}>{overallProgress}%</Text>
                  </View>
                  <View style={styles.totalProgressBarBgCompact}>
                    <View style={[
                      styles.totalProgressBarFillCompact,
                      { 
                        width: `${overallProgress}%`,
                        backgroundColor: getProgressColor(overallProgress)
                      }
                    ]} />
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <ScrollView 
                style={styles.formContainer} 
                contentContainerStyle={styles.formScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.formSubHeader}>
                  <TouchableOpacity style={styles.formBackBtn} onPress={handleBackToDashboard}>
                    <Ionicons name="chevron-back" size={24} color={getFolderIconAndColor(activeFolder).color} />
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center', marginRight: 8 }}>
                    <Ionicons 
                      name={getFolderIconAndColor(activeFolder).icon as any} 
                      size={20} 
                      color={getFolderIconAndColor(activeFolder).color} 
                    />
                    <Text style={[styles.formSubTitle, { color: getFolderIconAndColor(activeFolder).color }]}>
                      {activeFolder === 'hallazgos' 
                        ? 'Hallazgos Previos' 
                        : activeFolder === 'datos' 
                        ? 'Datos Generales' 
                        : activeFolder === 'alarmasExternas'
                        ? 'Alarmas Externas'
                        : activeFolder === 'evidenciaSalida'
                        ? 'Evidencia Salida'
                        : activeFolder === 'bafiS2'
                        ? 'Apagado BAFI S2'
                        : activeFolder === 'bafiS3'
                        ? 'Apagado BAFI S3'
                        : activeFolder === 'antenaS1'
                        ? 'Apagado Antena S1'
                        : activeFolder === 'antenaS2'
                        ? 'Apagado Antena S2'
                        : activeFolder === 'antenaS3'
                        ? 'Apagado Antena S3'
                        : (isApagadoBafi ? 'Apagado BAFI S1' : (isIloq ? 'Cambio de Chapa' : 'Apagado 3G / RRU'))}
                    </Text>
                  </View>
                  <View style={{ width: 40 }} />
                </View>
              {activeFolder === 'hallazgos' && (
                <View>
                  <View style={styles.sectionProgressContainer}>
                  </View>
                  <View style={styles.formSection}>
                    <Text style={styles.label}>Observaciones Encontradas</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Describe anomalías, riesgos o comentarios..."
                      value={observaciones}
                      onChangeText={setObservaciones}
                      multiline
                      numberOfLines={4}
                      editable={!isReadOnly}
                    />
                    <Text style={styles.label}>Evidencia Fotográfica ({isReadOnly ? (fotos.filter(u => u.startsWith('http')).length) : fotos.length}/10)</Text>
                    <View style={styles.photoGrid}>
                      {(isReadOnly ? fotos.filter(u => typeof u === 'string' && u.startsWith('http')) : fotos).map((uri, idx) => (
                        <TouchableOpacity key={idx} style={styles.photoThumbContainer} onPress={() => setPreviewUri(uri)}>
                          <Image source={{ uri }} style={styles.photoThumb} />
                          {!isReadOnly && (
                            <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removeFoto(idx)}>
                              {!isReadOnly && <Ionicons name="close-circle" size={24} color={colors.danger} />}
                            </TouchableOpacity>
                          )}
                        </TouchableOpacity>
                      ))}
                      {isReadOnly && fotos.filter(u => typeof u === 'string' && u.startsWith('http')).length === 0 && fotos.length > 0 && (
                        <View style={{ padding: 16, alignItems: 'center' }}>
                          <Ionicons name="cloud-download-outline" size={32} color="rgba(255,255,255,0.4)" />
                          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 6, textAlign: 'center' }}>
                            Las fotos se cargan al descargar el informe
                          </Text>
                        </View>
                      )}
                      {!isReadOnly && fotos.length < 10 && (
                        <TouchableOpacity style={styles.addPhotoBox} onPress={() => handlePickImage('hallazgos')}>
                          <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {activeFolder === 'alarmasExternas' && (
                <View>
                  <View style={styles.formSection}>
                    <SelectDropdown
                      label="Tecnología donde se encuentran alarmas"
                      value={tecnologiaAlarmas}
                      options={tecnologiaAlarmasOptions}
                      onSelect={handleTecnologiaAlarmasChange}
                      disabled={isReadOnly}
                    />

                    {/* LTE o 5G flow */}
                    {(tecnologiaAlarmas === 'LTE' || tecnologiaAlarmas === '5G') && (
                      <View style={{ marginTop: 16 }}>
                        <View style={styles.photoField}>
                          <Text style={styles.label}>Foto Alarmas Existentes en OVP, Regleta o Rectificador</Text>
                          {fotoAlarmasOVP ? (
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoAlarmasOVP)}>
                                <Image source={{ uri: fotoAlarmasOVP }} style={styles.photoFull} resizeMode="cover" />
                              </TouchableOpacity>
                              {!isReadOnly && (
                                <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoAlarmasOVP')}>
                                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : !isReadOnly ? (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoAlarmasOVP')}>
                              <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        <View style={styles.photoField}>
                          <Text style={styles.label}>{`Foto Alarmas Existentes en ${tecnologiaAlarmas}`}</Text>
                          {fotoAlarmasEquipos ? (
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoAlarmasEquipos)}>
                                <Image source={{ uri: fotoAlarmasEquipos }} style={styles.photoFull} resizeMode="cover" />
                              </TouchableOpacity>
                              {!isReadOnly && (
                                <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoAlarmasEquipos')}>
                                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : !isReadOnly ? (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoAlarmasEquipos')}>
                              <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>
                    )}

                    {/* 3G o BAFI flow */}
                    {(tecnologiaAlarmas === '3G' || tecnologiaAlarmas === 'BAFI') && (
                      <View style={{ marginTop: 16 }}>
                        <View style={styles.photoField}>
                          <Text style={styles.label}>{`Alarmas Existentes en Equipo (${tecnologiaAlarmas})`}</Text>
                          {fotoAlarmasEquipos ? (
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoAlarmasEquipos)}>
                                <Image source={{ uri: fotoAlarmasEquipos }} style={styles.photoFull} resizeMode="cover" />
                              </TouchableOpacity>
                              {!isReadOnly && (
                                <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoAlarmasEquipos')}>
                                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : !isReadOnly ? (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoAlarmasEquipos')}>
                              <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        <View style={styles.photoField}>
                          <Text style={styles.label}>Alarmas Existentes en OVP, Regleta o Rectificador</Text>
                          {fotoAlarmasOVP ? (
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoAlarmasOVP)}>
                                <Image source={{ uri: fotoAlarmasOVP }} style={styles.photoFull} resizeMode="cover" />
                              </TouchableOpacity>
                              {!isReadOnly && (
                                <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoAlarmasOVP')}>
                                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : !isReadOnly ? (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoAlarmasOVP')}>
                              <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        {/* Migration selections & photos */}
                        {migraranTecnologia !== '' && (
                          <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 16 }}>
                            <View style={{ backgroundColor: 'rgba(10, 132, 255, 0.1)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                              <Text style={{ color: '#0A84FF', fontWeight: 'bold' }}>Tecnología de Migración: {migraranTecnologia}</Text>
                            </View>

                            <View style={styles.photoField}>
                              <Text style={styles.label}>{`Alarmas Migradas hacia Equipo (${migraranTecnologia})`}</Text>
                              {fotoAlarmasMigradas ? (
                                <View style={styles.photoFullContainer}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotoAlarmasMigradas)}>
                                    <Image source={{ uri: fotoAlarmasMigradas }} style={styles.photoFull} resizeMode="cover" />
                                  </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoAlarmasMigradas')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ) : !isReadOnly ? (
                                <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoAlarmasMigradas')}>
                                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                  <Text style={styles.addPhotoText}>Subir Foto</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>

                            <View style={styles.photoField}>
                              <Text style={styles.label}>Alarmas Finales en OVP, Regleta o Rectificador</Text>
                              {fotoAlarmasFinalesOVP ? (
                                <View style={styles.photoFullContainer}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotoAlarmasFinalesOVP)}>
                                    <Image source={{ uri: fotoAlarmasFinalesOVP }} style={styles.photoFull} resizeMode="cover" />
                                  </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoAlarmasFinalesOVP')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ) : !isReadOnly ? (
                                <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoAlarmasFinalesOVP')}>
                                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                  <Text style={styles.addPhotoText}>Subir Foto</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {/* No existen flow */}
                    {tecnologiaAlarmas === 'No existen' && (
                      <View style={{ marginTop: 16 }}>
                        {implementaranAlarmas !== '' && (
                          <View style={{ backgroundColor: implementaranAlarmas === 'Si' ? 'rgba(48, 209, 88, 0.1)' : 'rgba(255, 69, 58, 0.1)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                            <Text style={{ color: implementaranAlarmas === 'Si' ? colors.success : colors.danger, fontWeight: 'bold' }}>
                              ¿Se implementarán Alarmas Externas?: {implementaranAlarmas}
                            </Text>
                          </View>
                        )}

                        {implementaranAlarmas === 'No' && (
                          <View>
                            <Text style={styles.label}>Motivos de por qué no se implementarán</Text>
                            <TextInput
                              style={[styles.input, styles.textArea]}
                              placeholder="Indique los motivos de la no implementación de alarmas..."
                              value={motivosNoImplementacion}
                              onChangeText={setMotivosNoImplementacion}
                              multiline
                              numberOfLines={4}
                              editable={!isReadOnly}
                            />

                            <View style={styles.photoField}>
                              <Text style={styles.label}>Foto de Respaldo de No Implementación</Text>
                              {fotoNoImplementacion ? (
                                <View style={styles.photoFullContainer}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotoNoImplementacion)}>
                                    <Image source={{ uri: fotoNoImplementacion }} style={styles.photoFull} resizeMode="cover" />
                                  </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoNoImplementacion')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ) : !isReadOnly ? (
                                <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoNoImplementacion')}>
                                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                  <Text style={styles.addPhotoText}>Subir Foto</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          </View>
                        )}

                        {implementaranAlarmas === 'Si' && tecnologiaImplementacion !== '' && (
                          <View style={{ marginTop: 16 }}>
                            <View style={{ backgroundColor: 'rgba(10, 132, 255, 0.1)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                              <Text style={{ color: '#0A84FF', fontWeight: 'bold' }}>Tecnología de Implementación: {tecnologiaImplementacion}</Text>
                            </View>

                            <View style={styles.photoField}>
                              <Text style={styles.label}>{`Alarmas Implementadas sobre Equipo (${tecnologiaImplementacion})`}</Text>
                              {fotoAlarmasImplementadas ? (
                                <View style={styles.photoFullContainer}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotoAlarmasImplementadas)}>
                                    <Image source={{ uri: fotoAlarmasImplementadas }} style={styles.photoFull} resizeMode="cover" />
                                  </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoAlarmasImplementadas')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ) : !isReadOnly ? (
                                <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoAlarmasImplementadas')}>
                                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                  <Text style={styles.addPhotoText}>Subir Foto</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>

                            <View style={styles.photoField}>
                              <Text style={styles.label}>Alarmas Finales en OVP, Regleta o Rectificador</Text>
                              {fotoAlarmasFinalesOVP ? (
                                <View style={styles.photoFullContainer}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotoAlarmasFinalesOVP)}>
                                    <Image source={{ uri: fotoAlarmasFinalesOVP }} style={styles.photoFull} resizeMode="cover" />
                                  </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoAlarmasFinalesOVP')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ) : !isReadOnly ? (
                                <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoAlarmasFinalesOVP')}>
                                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                  <Text style={styles.addPhotoText}>Subir Foto</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              )}

              {activeFolder === 'evidenciaSalida' && (
                <View>
                  <View style={styles.formSection}>
                    
                    {/* Consumo Final CA en Breaker General */}
                    <View style={{ marginBottom: 20 }}>
                      {tipoEmpalme === 'Monofásico' ? (
                        <View style={styles.photoField}>
                          <Text style={styles.label}>Consumo Final CA Monofásico Breaker General</Text>
                          {fotosConsumoFinalCaEvidencia && fotosConsumoFinalCaEvidencia[0] ? (
                            <View>
                              <View style={styles.photoFullContainer}>
                                <TouchableOpacity onPress={() => setPreviewUri(fotosConsumoFinalCaEvidencia[0])}>
                                  <Image source={{ uri: fotosConsumoFinalCaEvidencia[0] }} style={styles.photoFull} resizeMode="cover" />
                                </TouchableOpacity>
                                {!isReadOnly && (
                                  <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotosConsumoFinalCaEvidencia', 0)}>
                                    <Ionicons name="close-circle" size={24} color={colors.danger} />
                                  </TouchableOpacity>
                                )}
                              </View>
                              <TouchableOpacity 
                                style={styles.ampereDisplay} 
                                onPress={() => !isReadOnly && (setActiveAmpereTarget('fotosConsumoFinalCaEvidencia'), setActiveAmpereIndex(0), setTempAmpere(ampereConsumoFinalCaEvidencia[0] || ''), setShowAmpereModal(true))}
                                activeOpacity={isReadOnly ? 1 : 0.7}
                              >
                                <Text style={styles.ampereText}>Lectura: {ampereConsumoFinalCaEvidencia[0] || '00,00'} A</Text>
                                <Ionicons name="create-outline" size={16} color={colors.primary} />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            !isReadOnly ? (
                              <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotosConsumoFinalCaEvidencia', 0)}>
                                <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                <Text style={styles.addPhotoText}>Subir Foto</Text>
                              </TouchableOpacity>
                            ) : null
                          )}
                        </View>
                      ) : (
                        <View>
                          <Text style={styles.label}>Consumo Final CA Trifásico Breaker General</Text>
                          {['Fase R', 'Fase S', 'Fase T'].map((label, i) => (
                            <View key={i} style={styles.trifasicoRow}>
                              <View style={styles.trifasicoPhotoCol}>
                                {fotosConsumoFinalCaEvidencia && fotosConsumoFinalCaEvidencia[i] ? (
                                  <View style={styles.trifasicoPhotoWrapper}>
                                    <TouchableOpacity onPress={() => setPreviewUri(fotosConsumoFinalCaEvidencia[i])}>
                                      <Image source={{ uri: fotosConsumoFinalCaEvidencia[i] }} style={styles.photoThumb} />
                                    </TouchableOpacity>
                                    {!isReadOnly && (
                                      <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotosConsumoFinalCaEvidencia', i)}>
                                        <Ionicons name="close-circle" size={24} color={colors.danger} />
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                ) : (
                                  !isReadOnly ? (
                                    <TouchableOpacity style={styles.trifasicoAddBox} onPress={() => handlePickImage('fotosConsumoFinalCaEvidencia', i)}>
                                      <Ionicons name="camera" size={24} color="rgba(255,255,255,0.3)" />
                                    </TouchableOpacity>
                                  ) : null
                                )}
                              </View>
                              <View style={styles.trifasicoInfoCol}>
                                <Text style={styles.trifasicoLabel}>{label}</Text>
                                {fotosConsumoFinalCaEvidencia && fotosConsumoFinalCaEvidencia[i] && (
                                  <TouchableOpacity 
                                    style={styles.ampereDisplayTrifasico} 
                                    onPress={() => !isReadOnly && (setActiveAmpereTarget('fotosConsumoFinalCaEvidencia'), setActiveAmpereIndex(i), setTempAmpere(ampereConsumoFinalCaEvidencia[i] || ''), setShowAmpereModal(true))}
                                    activeOpacity={isReadOnly ? 1 : 0.7}
                                  >
                                    <Text style={styles.ampereTextTrifasico}>{ampereConsumoFinalCaEvidencia[i] || '00,00'} A</Text>
                                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* Consumo Final CC en Rectificador */}
                    <View style={{ marginBottom: 20 }}>
                      <View style={styles.photoField}>
                        <Text style={styles.label}>Consumo Final CC Rectificador (display)</Text>
                        {fotoConsumoFinalCcRectificador ? (
                          <View>
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoConsumoFinalCcRectificador)}>
                                <Image source={{ uri: fotoConsumoFinalCcRectificador }} style={styles.photoFull} resizeMode="cover" />
                              </TouchableOpacity>
                              {!isReadOnly && (
                                <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoConsumoFinalCcRectificador')}>
                                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                                </TouchableOpacity>
                              )}
                            </View>
                            <TouchableOpacity 
                              style={styles.ampereDisplay} 
                              onPress={() => !isReadOnly && (setActiveAmpereTarget('fotoConsumoFinalCcRectificador'), setActiveAmpereIndex(0), setTempAmpere(ampereDisplayRectificadorFinal || ''), setShowAmpereModal(true))}
                              activeOpacity={isReadOnly ? 1 : 0.7}
                            >
                              <Text style={styles.ampereText}>Lectura: {ampereDisplayRectificadorFinal || '00,00'} A</Text>
                              <Ionicons name="create-outline" size={16} color={colors.primary} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          !isReadOnly ? (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoConsumoFinalCcRectificador')}>
                              <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          ) : null
                        )}
                      </View>
                    </View>

                    {/* Vista General del Rectificador */}
                    <View style={styles.photoField}>
                      <Text style={styles.label}>Vista General del Rectificador</Text>
                      {fotoRectificador ? (
                        <View style={styles.photoFullContainer}>
                          <TouchableOpacity onPress={() => setPreviewUri(fotoRectificador)}>
                            <Image source={{ uri: fotoRectificador }} style={styles.photoFull} resizeMode="cover" />
                          </TouchableOpacity>
                          {!isReadOnly && (
                            <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoRectificador')}>
                              <Ionicons name="close-circle" size={24} color={colors.danger} />
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : !isReadOnly ? (
                        <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoRectificador')}>
                          <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                          <Text style={styles.addPhotoText}>Subir Foto</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {/* Vistas Interior del Contenedor (Foto 1) */}
                    <View style={styles.photoField}>
                      <Text style={styles.label}>Vista Interior del Contenedor (Foto 1/2)</Text>
                      {fotoContenedor1 ? (
                        <View style={styles.photoFullContainer}>
                          <TouchableOpacity onPress={() => setPreviewUri(fotoContenedor1)}>
                            <Image source={{ uri: fotoContenedor1 }} style={styles.photoFull} resizeMode="cover" />
                          </TouchableOpacity>
                          {!isReadOnly && (
                            <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoContenedor1')}>
                              <Ionicons name="close-circle" size={24} color={colors.danger} />
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : !isReadOnly ? (
                        <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoContenedor1')}>
                          <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                          <Text style={styles.addPhotoText}>Subir Foto</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {/* Vistas Interior del Contenedor (Foto 2) */}
                    <View style={styles.photoField}>
                      <Text style={styles.label}>Vista Interior del Contenedor (Foto 2/2)</Text>
                      {fotoContenedor2 ? (
                        <View style={styles.photoFullContainer}>
                          <TouchableOpacity onPress={() => setPreviewUri(fotoContenedor2)}>
                            <Image source={{ uri: fotoContenedor2 }} style={styles.photoFull} resizeMode="cover" />
                          </TouchableOpacity>
                          {!isReadOnly && (
                            <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoContenedor2')}>
                              <Ionicons name="close-circle" size={24} color={colors.danger} />
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : !isReadOnly ? (
                        <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoContenedor2')}>
                          <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                          <Text style={styles.addPhotoText}>Subir Foto</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {/* Vistas Generales del Sitio (Foto 1) */}
                    <View style={styles.photoField}>
                      <Text style={styles.label}>Vista General del Sitio (Foto 1/2)</Text>
                      {fotoSitio1 ? (
                        <View style={styles.photoFullContainer}>
                          <TouchableOpacity onPress={() => setPreviewUri(fotoSitio1)}>
                            <Image source={{ uri: fotoSitio1 }} style={styles.photoFull} resizeMode="cover" />
                          </TouchableOpacity>
                          {!isReadOnly && (
                            <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoSitio1')}>
                              <Ionicons name="close-circle" size={24} color={colors.danger} />
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : !isReadOnly ? (
                        <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoSitio1')}>
                          <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                          <Text style={styles.addPhotoText}>Subir Foto</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {/* Vistas Generales del Sitio (Foto 2) */}
                    <View style={styles.photoField}>
                      <Text style={styles.label}>Vista General del Sitio (Foto 2/2)</Text>
                      {fotoSitio2 ? (
                        <View style={styles.photoFullContainer}>
                          <TouchableOpacity onPress={() => setPreviewUri(fotoSitio2)}>
                            <Image source={{ uri: fotoSitio2 }} style={styles.photoFull} resizeMode="cover" />
                          </TouchableOpacity>
                          {!isReadOnly && (
                            <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoSitio2')}>
                              <Ionicons name="close-circle" size={24} color={colors.danger} />
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : !isReadOnly ? (
                        <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoSitio2')}>
                          <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                          <Text style={styles.addPhotoText}>Subir Foto</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {/* Vista General de la Estructura */}
                    <View style={styles.photoField}>
                      <Text style={styles.label}>{`Vista General de la Estructura (${tipoEstructura || 'Estructura'})`}</Text>
                      {fotoEstructuraSalida ? (
                        <View style={styles.photoFullContainer}>
                          <TouchableOpacity onPress={() => setPreviewUri(fotoEstructuraSalida)}>
                            <Image source={{ uri: fotoEstructuraSalida }} style={styles.photoFull} resizeMode="cover" />
                          </TouchableOpacity>
                          {!isReadOnly && (
                            <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoEstructuraSalida')}>
                              <Ionicons name="close-circle" size={24} color={colors.danger} />
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : !isReadOnly ? (
                        <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoEstructuraSalida')}>
                          <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                          <Text style={styles.addPhotoText}>Subir Foto</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>


                  </View>
                </View>
              )}

              {activeFolder === 'datos' && (
                <View>
                  <View style={styles.formSection}>
                    <SelectDropdown label="Tipo de Estructura" value={tipoEstructura} options={tipoEstructuraOptions} onSelect={setTipoEstructura} disabled={isReadOnly} />
                    {tipoEstructura !== '' && (
                      <View style={styles.photoField}>
                        <Text style={styles.label}>Foto Tipo de Estructura</Text>
                        {fotoEstructura ? (
                          <View style={styles.photoFullContainer}>
                            <TouchableOpacity onPress={() => setPreviewUri(fotoEstructura)}>
                              <Image source={{ uri: fotoEstructura }} style={styles.photoFull} resizeMode="cover" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoEstructura')}>
                              {!isReadOnly && <Ionicons name="close-circle" size={24} color={colors.danger} />}
                            </TouchableOpacity>
                          </View>
                        ) : !isReadOnly ? (
                          <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoEstructura')}>
                            <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                            <Text style={styles.addPhotoText}>Subir Foto</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    )}
                    {fotoEstructura !== '' && (
                      <SelectDropdown label="Tipo de Contenedor" value={tipoContenedor} options={tipoContenedorOptions} onSelect={setTipoContenedor} disabled={isReadOnly} />
                    )}
                    {tipoContenedor !== '' && (
                      <View>
                        <View style={styles.photoField}>
                          <Text style={styles.label}>Foto Vista Fuera del Contenedor</Text>
                          {fotoFueraContenedor ? (
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoFueraContenedor)}>
                                <Image source={{ uri: fotoFueraContenedor }} style={styles.photoFull} resizeMode="cover" />
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoFueraContenedor')}>
                                {!isReadOnly && <Ionicons name="close-circle" size={24} color={colors.danger} />}
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoFueraContenedor')}>
                              <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        {fotoFueraContenedor !== '' && (
                          <View>
                            <Text style={styles.label}>Vistas Generales del Sitio (2 fotos)</Text>
                            <View style={styles.photoRow}>
                              {[0, 1].map((i) => (
                                <View key={`gs-${i}`} style={styles.photoCol}>
                                  {fotosGeneralesSitio[i] ? (
                                    <View style={styles.trifasicoPhotoWrapper}>
                                      <TouchableOpacity onPress={() => setPreviewUri(fotosGeneralesSitio[i])}>
                                        <Image source={{ uri: fotosGeneralesSitio[i] }} style={styles.photoThumb} />
                                      </TouchableOpacity>
                                      <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotosGeneralesSitio', i)}>
                                        {!isReadOnly && <Ionicons name="close-circle" size={24} color={colors.danger} />}
                                      </TouchableOpacity>
                                    </View>
                                  ) : (
                                    <TouchableOpacity style={styles.addPhotoBox2Col} onPress={() => handlePickImage('fotosGeneralesSitio', i)}>
                                      <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                                        <Ionicons name="camera" size={24} color="rgba(255,255,255,0.3)" />
                                      </View>
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ))}
                            </View>
                          </View>
                        )}
                        {fotosGeneralesSitio[0] !== '' && fotosGeneralesSitio[1] !== '' && (
                          <View>
                            <Text style={styles.label}>Vistas Interior del Contenedor (2 fotos)</Text>
                            <View style={styles.photoRow}>
                              {[0, 1].map((i) => (
                                <View key={`ic-${i}`} style={styles.photoCol}>
                                  {fotosInteriorContenedor[i] ? (
                                    <View style={styles.trifasicoPhotoWrapper}>
                                      <TouchableOpacity onPress={() => setPreviewUri(fotosInteriorContenedor[i])}>
                                        <Image source={{ uri: fotosInteriorContenedor[i] }} style={styles.photoThumb} />
                                      </TouchableOpacity>
                                      <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotosInteriorContenedor', i)}>
                                        {!isReadOnly && <Ionicons name="close-circle" size={24} color={colors.danger} />}
                                      </TouchableOpacity>
                                    </View>
                                  ) : (
                                    <TouchableOpacity style={styles.addPhotoBox2Col} onPress={() => handlePickImage('fotosInteriorContenedor', i)}>
                                      <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                                        <Ionicons name="camera" size={24} color="rgba(255,255,255,0.3)" />
                                      </View>
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    )}
                    {fotosInteriorContenedor[0] !== '' && fotosInteriorContenedor[1] !== '' && (
                      <View style={{ marginTop: 20 }}>
                        <SelectDropdown label="Tipo de Empalme" value={tipoEmpalme} options={tipoEmpalmeOptions} onSelect={(val: string) => {
                          setTipoEmpalme(val);
                          tipoEmpalmeRef.current = val;
                          if (val === 'Monofásico') {
                            setFotosEmpalme(['']);
                            fotosEmpalmeRef.current = [''];
                            // Adaptar arrays de Evidencia Salida CA a 1 elemento
                            const newFotosEv = [fotosConsumoFinalCaEvidenciaRef.current[0] || ''];
                            const newAmpEv = [ampereConsumoFinalCaEvidenciaRef.current[0] || ''];
                            setFotosConsumoFinalCaEvidencia(newFotosEv);
                            fotosConsumoFinalCaEvidenciaRef.current = newFotosEv;
                            setAmpereConsumoFinalCaEvidencia(newAmpEv);
                            ampereConsumoFinalCaEvidenciaRef.current = newAmpEv;
                          } else if (val === 'Trifásico') {
                            setFotosEmpalme(['', '', '']);
                            fotosEmpalmeRef.current = ['', '', ''];
                            // Adaptar arrays de Evidencia Salida CA a 3 elementos
                            const existFotos = fotosConsumoFinalCaEvidenciaRef.current;
                            const existAmp = ampereConsumoFinalCaEvidenciaRef.current;
                            const newFotosEv = [existFotos[0] || '', existFotos[1] || '', existFotos[2] || ''];
                            const newAmpEv = [existAmp[0] || '', existAmp[1] || '', existAmp[2] || ''];
                            setFotosConsumoFinalCaEvidencia(newFotosEv);
                            fotosConsumoFinalCaEvidenciaRef.current = newFotosEv;
                            setAmpereConsumoFinalCaEvidencia(newAmpEv);
                            ampereConsumoFinalCaEvidenciaRef.current = newAmpEv;
                          }
                        }} disabled={isReadOnly} />
                      </View>
                    )}
                    {tipoEmpalme === 'Monofásico' && (
                      <View style={styles.photoField}>
                        <Text style={styles.label}>Consumo Inicial CA Monofásico Breaker General</Text>
                        {fotosEmpalme[0] ? (
                          <View>
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotosEmpalme[0])}>
                                <Image source={{ uri: fotosEmpalme[0] }} style={styles.photoFull} resizeMode="cover" />
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotosEmpalme', 0)}>
                                {!isReadOnly && <Ionicons name="close-circle" size={24} color={colors.danger} />}
                              </TouchableOpacity>
                            </View>
                            <TouchableOpacity 
                              style={styles.ampereDisplay} 
                              onPress={() => !isReadOnly && (setActiveAmpereTarget(null), setActiveAmpereIndex(0), setTempAmpere(ampereEmpalme[0]), setShowAmpereModal(true))}
                              activeOpacity={isReadOnly ? 1 : 0.7}
                            >
                              <Text style={styles.ampereText}>Lectura: {ampereEmpalme[0] || '00,00'} A</Text>
                              <Ionicons name="create-outline" size={16} color={colors.primary} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotosEmpalme', 0)}>
                            <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                            <Text style={styles.addPhotoText}>Subir Foto</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                    {tipoEmpalme === 'Trifásico' && (
                      <View style={{ marginTop: 10 }}>
                        <Text style={styles.label}>Consumo Inicial CA Trifásico Breaker General</Text>
                        {['Fase R', 'Fase S', 'Fase T'].map((label, i) => (
                          <View key={i} style={styles.trifasicoRow}>
                            <View style={styles.trifasicoPhotoCol}>
                              {fotosEmpalme[i] ? (
                                <View style={styles.trifasicoPhotoWrapper}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotosEmpalme[i])}>
                                    <Image source={{ uri: fotosEmpalme[i] }} style={styles.photoThumb} />
                                  </TouchableOpacity>
                                  <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotosEmpalme', i)}>
                                    {!isReadOnly && <Ionicons name="close-circle" size={24} color={colors.danger} />}
                                  </TouchableOpacity>
                                </View>
                              ) : (
                                <TouchableOpacity style={styles.trifasicoAddBox} onPress={() => handlePickImage('fotosEmpalme', i)}>
                                  <Ionicons name="camera" size={24} color="rgba(255,255,255,0.3)" />
                                </TouchableOpacity>
                              )}
                            </View>
                            <View style={styles.trifasicoInfoCol}>
                              <Text style={styles.trifasicoLabel}>{label}</Text>
                              {fotosEmpalme[i] && (
                                <TouchableOpacity 
                                  style={styles.ampereDisplayTrifasico} 
                                  onPress={() => !isReadOnly && (setActiveAmpereTarget(null), setActiveAmpereIndex(i), setTempAmpere(ampereEmpalme[i]), setShowAmpereModal(true))}
                                  activeOpacity={isReadOnly ? 1 : 0.7}
                                >
                                  <Text style={styles.ampereTextTrifasico}>{ampereEmpalme[i] || '00,00'} A</Text>
                                  <Ionicons name="create-outline" size={16} color={colors.primary} />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                    {isAmpereEmpalmeFilled && (
                      <View style={styles.photoField}>
                        <Text style={styles.label}>Consumo Inicial CC Rectificador (display)</Text>
                        {fotoDisplayRectificador ? (
                          <View>
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoDisplayRectificador)}>
                                <Image source={{ uri: fotoDisplayRectificador }} style={styles.photoFull} resizeMode="cover" />
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoDisplayRectificador')}>
                                {!isReadOnly && <Ionicons name="close-circle" size={24} color={colors.danger} />}
                              </TouchableOpacity>
                            </View>
                            <TouchableOpacity 
                              style={styles.ampereDisplay} 
                              onPress={() => !isReadOnly && (setActiveAmpereTarget('fotoDisplayRectificador'), setActiveAmpereIndex(0), setTempAmpere(ampereDisplayRectificador), setShowAmpereModal(true))}
                              activeOpacity={isReadOnly ? 1 : 0.7}
                            >
                              <Text style={styles.ampereText}>Lectura: {ampereDisplayRectificador || '00,00'} A</Text>
                              <Ionicons name="create-outline" size={16} color={colors.primary} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoDisplayRectificador')}>
                            <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                            <Text style={styles.addPhotoText}>Subir Foto</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                    {isAmpereEmpalmeFilled && fotoDisplayRectificador !== '' && ampereDisplayRectificador !== '' && ampereDisplayRectificador !== '00,00' && (
                      <View style={{ marginTop: 12 }}>
                        <SelectDropdown
                          label="Capacidad de Protección General"
                          value={capacidadProteccion}
                          options={[
                            { id: '16A', label: '16A' },
                            { id: '32A', label: '32A' },
                            { id: '40A', label: '40A' },
                            { id: '63A', label: '63A' },
                          ]}
                          onSelect={setCapacidadProteccion}
                          disabled={isReadOnly}
                        />
                      </View>
                    )}
                    {capacidadProteccion !== '' && (
                      <View style={styles.photoField}>
                        <Text style={styles.label}>Foto Medidor Eléctrico</Text>
                        {fotoMedidor ? (
                          <View style={styles.photoFullContainer}>
                            <TouchableOpacity onPress={() => setPreviewUri(fotoMedidor)}>
                              <Image source={{ uri: fotoMedidor }} style={styles.photoFull} resizeMode="cover" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoMedidor')}>
                              {!isReadOnly && <Ionicons name="close-circle" size={24} color={colors.danger} />}
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoMedidor')}>
                            <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                            <Text style={styles.addPhotoText}>Subir Foto</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                    {fotoMedidor !== '' && (
                      <View style={styles.photoField}>
                        <Text style={styles.label}>Foto Sector Medidor</Text>
                        {fotoSectorMedidor ? (
                          <View style={styles.photoFullContainer}>
                            <TouchableOpacity onPress={() => setPreviewUri(fotoSectorMedidor)}>
                              <Image source={{ uri: fotoSectorMedidor }} style={styles.photoFull} resizeMode="cover" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoSectorMedidor')}>
                              {!isReadOnly && <Ionicons name="close-circle" size={24} color={colors.danger} />}
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoSectorMedidor')}>
                            <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                            <Text style={styles.addPhotoText}>Subir Foto</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                    {fotoSectorMedidor !== '' && (
                      <View><Text style={styles.label}>N° Medidor</Text><TextInput style={styles.input} placeholder="Número" value={numeroMedidor} onChangeText={setNumeroMedidor} keyboardType="numeric" editable={!isReadOnly} /></View>
                    )}
                    {numeroMedidor !== '' && (
                      <View><Text style={styles.label}>Lectura Consumo KW_h</Text><TextInput style={styles.input} placeholder="Lectura" value={lecturaConsumo} onChangeText={setLecturaConsumo} keyboardType="numeric" editable={!isReadOnly} /></View>
                    )}
                  </View>
                </View>
              )}

              {activeFolder === 'apagado' && (
                isApagadoBafi ? (
                  <View>
                    <View style={styles.formSection}>
                      <SelectDropdown
                        label="Estado Baseband Sector 1"
                        value={estadoBasebandSector1}
                        options={[
                          { id: 'Encendido', label: 'Encendido' },
                          { id: 'Apagado', label: 'Apagado' },
                          { id: 'N/A', label: 'N/A' },
                        ]}
                        onSelect={handleEstadoBasebandSector1Change}
                        disabled={isReadOnly}
                      />

                      {estadoBasebandSector1 === 'Encendido' && (
                        <View style={{ gap: 12 }}>
                          <View style={styles.photoField}>
                            <Text style={styles.label}>Foto de Breaker Baseband S1 Encendido</Text>
                            {fotoBreakerBaseband1Encendido ? (
                              <View style={styles.photoFullContainer}>
                                <TouchableOpacity onPress={() => setPreviewUri(fotoBreakerBaseband1Encendido)}>
                                  <Image source={{ uri: fotoBreakerBaseband1Encendido }} style={styles.photoFull} resizeMode="cover" />
                                </TouchableOpacity>
                                {!isReadOnly && (
                                  <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBreakerBaseband1Encendido')}>
                                    <Ionicons name="close-circle" size={24} color={colors.danger} />
                                  </TouchableOpacity>
                                )}
                              </View>
                            ) : !isReadOnly ? (
                              <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBreakerBaseband1Encendido')}>
                                <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                <Text style={styles.addPhotoText}>Subir Foto</Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>

                          <View style={styles.photoField}>
                            <Text style={styles.label}>Foto de Baseband S1 Encendida</Text>
                            {fotoBaseband1Encendida ? (
                              <View style={styles.photoFullContainer}>
                                <TouchableOpacity onPress={() => setPreviewUri(fotoBaseband1Encendida)}>
                                  <Image source={{ uri: fotoBaseband1Encendida }} style={styles.photoFull} resizeMode="cover" />
                                </TouchableOpacity>
                                {!isReadOnly && (
                                  <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBaseband1Encendida')}>
                                    <Ionicons name="close-circle" size={24} color={colors.danger} />
                                  </TouchableOpacity>
                                )}
                              </View>
                            ) : !isReadOnly ? (
                              <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBaseband1Encendida')}>
                                <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                <Text style={styles.addPhotoText}>Subir Foto</Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>

                          <View style={styles.photoField}>
                            <Text style={styles.label}>Consumo Inicial CC en Baseband S1</Text>
                            {fotoConsumoInicialCc1 ? (
                              <View style={styles.photoFullContainer}>
                                <TouchableOpacity onPress={() => setPreviewUri(fotoConsumoInicialCc1)}>
                                  <Image source={{ uri: fotoConsumoInicialCc1 }} style={styles.photoFull} resizeMode="cover" />
                                </TouchableOpacity>
                                {!isReadOnly && (
                                  <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoConsumoInicialCc1')}>
                                    <Ionicons name="close-circle" size={24} color={colors.danger} />
                                  </TouchableOpacity>
                                )}
                              </View>
                            ) : !isReadOnly ? (
                              <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoConsumoInicialCc1')}>
                                <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                <Text style={styles.addPhotoText}>Subir Foto</Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>



                          {fotoBreakerBaseband1Encendido !== '' && fotoBaseband1Encendida !== '' && fotoConsumoInicialCc1 !== '' && (
                            !confirmadoApagadoRetirar ? (
                              <View style={styles.warningCard}>
                                <Ionicons name="warning" size={32} color="#FF9500" style={{ marginBottom: 8 }} />
                                <Text style={styles.warningCardText}>Apagar Breaker, Registrar Consumo Final y luego retirar Baseband S1</Text>
                                {!isReadOnly && (
                                  <TouchableOpacity style={styles.warningConfirmBtn} onPress={() => setConfirmadoApagadoRetirar(true)}>
                                    <Text style={styles.warningConfirmBtnText}>Confirmar realización</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            ) : (
                              <View style={styles.successBadge}>
                                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                                <Text style={styles.successBadgeText}>Realización confirmada</Text>
                              </View>
                            )
                          )}

                          {confirmadoApagadoRetirar && (
                            <View style={{ gap: 12 }}>
                              <View style={styles.photoField}>
                                <Text style={styles.label}>Foto de Breaker Baseband S1 Apagado</Text>
                                {fotoBreakerBaseband1Apagado ? (
                                  <View style={styles.photoFullContainer}>
                                    <TouchableOpacity onPress={() => setPreviewUri(fotoBreakerBaseband1Apagado)}>
                                      <Image source={{ uri: fotoBreakerBaseband1Apagado }} style={styles.photoFull} resizeMode="cover" />
                                    </TouchableOpacity>
                                    {!isReadOnly && (
                                      <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBreakerBaseband1Apagado')}>
                                        <Ionicons name="close-circle" size={24} color={colors.danger} />
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                ) : !isReadOnly ? (
                                  <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBreakerBaseband1Apagado')}>
                                    <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                    <Text style={styles.addPhotoText}>Subir Foto</Text>
                                  </TouchableOpacity>
                                ) : null}
                              </View>

                              <View style={styles.photoField}>
                                <Text style={styles.label}>Consumo Final CC en Baseband S1</Text>
                                {fotoConsumoFinalCc1 ? (
                                  <View style={styles.photoFullContainer}>
                                    <TouchableOpacity onPress={() => setPreviewUri(fotoConsumoFinalCc1)}>
                                      <Image source={{ uri: fotoConsumoFinalCc1 }} style={styles.photoFull} resizeMode="cover" />
                                    </TouchableOpacity>
                                    {!isReadOnly && (
                                      <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoConsumoFinalCc1')}>
                                        <Ionicons name="close-circle" size={24} color={colors.danger} />
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                ) : !isReadOnly ? (
                                  <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoConsumoFinalCc1')}>
                                    <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                    <Text style={styles.addPhotoText}>Subir Foto</Text>
                                  </TouchableOpacity>
                                ) : null}
                              </View>



                              <View style={styles.photoField}>
                                <Text style={styles.label}>Foto de Espacio de Baseband S1 Retirada</Text>
                                {fotoEspacioBaseband1Retirada ? (
                                  <View style={styles.photoFullContainer}>
                                    <TouchableOpacity onPress={() => setPreviewUri(fotoEspacioBaseband1Retirada)}>
                                      <Image source={{ uri: fotoEspacioBaseband1Retirada }} style={styles.photoFull} resizeMode="cover" />
                                    </TouchableOpacity>
                                    {!isReadOnly && (
                                      <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoEspacioBaseband1Retirada')}>
                                        <Ionicons name="close-circle" size={24} color={colors.danger} />
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                ) : !isReadOnly ? (
                                  <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoEspacioBaseband1Retirada')}>
                                    <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                    <Text style={styles.addPhotoText}>Subir Foto</Text>
                                  </TouchableOpacity>
                                ) : null}
                              </View>
                            </View>
                          )}
                        </View>
                      )}

                      {estadoBasebandSector1 === 'Apagado' && (
                        <View style={{ gap: 12 }}>
                          {!confirmadoApagadoRetirar ? (
                            <View style={styles.warningCard}>
                              <Ionicons name="warning" size={32} color="#FF9500" style={{ marginBottom: 8 }} />
                              <Text style={styles.warningCardText}>Registrar Consumo Final y luego retirar Baseband S1</Text>
                              {!isReadOnly && (
                                <TouchableOpacity style={styles.warningConfirmBtn} onPress={() => setConfirmadoApagadoRetirar(true)}>
                                  <Text style={styles.warningConfirmBtnText}>Confirmar realización</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : (
                            <View style={{ gap: 12 }}>
                              <View style={styles.successBadge}>
                                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                                <Text style={styles.successBadgeText}>Baseband S1 retirada confirmado</Text>
                              </View>

                              <View style={styles.photoField}>
                                <Text style={styles.label}>Foto de Breaker Baseband S1 Apagado</Text>
                                {fotoBreakerBaseband1Apagado ? (
                                  <View style={styles.photoFullContainer}>
                                    <TouchableOpacity onPress={() => setPreviewUri(fotoBreakerBaseband1Apagado)}>
                                      <Image source={{ uri: fotoBreakerBaseband1Apagado }} style={styles.photoFull} resizeMode="cover" />
                                    </TouchableOpacity>
                                    {!isReadOnly && (
                                      <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBreakerBaseband1Apagado')}>
                                        <Ionicons name="close-circle" size={24} color={colors.danger} />
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                ) : !isReadOnly ? (
                                  <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBreakerBaseband1Apagado')}>
                                    <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                    <Text style={styles.addPhotoText}>Subir Foto</Text>
                                  </TouchableOpacity>
                                ) : null}
                              </View>

                              <View style={styles.photoField}>
                                <Text style={styles.label}>Consumo Final CC en Baseband S1</Text>
                                {fotoConsumoFinalCc1 ? (
                                  <View style={styles.photoFullContainer}>
                                    <TouchableOpacity onPress={() => setPreviewUri(fotoConsumoFinalCc1)}>
                                      <Image source={{ uri: fotoConsumoFinalCc1 }} style={styles.photoFull} resizeMode="cover" />
                                    </TouchableOpacity>
                                    {!isReadOnly && (
                                      <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoConsumoFinalCc1')}>
                                        <Ionicons name="close-circle" size={24} color={colors.danger} />
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                ) : !isReadOnly ? (
                                  <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoConsumoFinalCc1')}>
                                    <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                    <Text style={styles.addPhotoText}>Subir Foto</Text>
                                  </TouchableOpacity>
                                ) : null}
                              </View>



                              <View style={styles.photoField}>
                                <Text style={styles.label}>Foto de Espacio de Baseband S1 Retirada</Text>
                                {fotoEspacioBaseband1Retirada ? (
                                  <View style={styles.photoFullContainer}>
                                    <TouchableOpacity onPress={() => setPreviewUri(fotoEspacioBaseband1Retirada)}>
                                      <Image source={{ uri: fotoEspacioBaseband1Retirada }} style={styles.photoFull} resizeMode="cover" />
                                    </TouchableOpacity>
                                    {!isReadOnly && (
                                      <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoEspacioBaseband1Retirada')}>
                                        <Ionicons name="close-circle" size={24} color={colors.danger} />
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                ) : !isReadOnly ? (
                                  <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoEspacioBaseband1Retirada')}>
                                    <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                    <Text style={styles.addPhotoText}>Subir Foto</Text>
                                  </TouchableOpacity>
                                ) : null}
                              </View>
                            </View>
                          )}
                        </View>
                      )}


                    </View>
                  </View>
                ) : isIloq ? (
                  <View>
                    <View style={styles.formSection}>
                      <SelectDropdown
                        label="Tipo de Chapa a Instalar"
                        value={tipoChapa}
                        options={[
                          { id: 'iLOQ S50', label: 'iLOQ S50' },
                          { id: 'Candado iLOQ', label: 'Candado iLOQ' },
                          { id: 'Chapa de Pomo', label: 'Chapa de Pomo' },
                          { id: 'Chapa de Sobreponer', label: 'Chapa de Sobreponer' },
                        ]}
                        onSelect={setTipoChapa}
                        disabled={isReadOnly}
                      />

                      <View>
                        <Text style={styles.label}>Número de Serie Nueva Chapa</Text>
                        <TextInput
                          style={[styles.input, { color: colors.text }]}
                          placeholder="Ingrese número de serie..."
                          placeholderTextColor="rgba(255,255,255,0.4)"
                          value={nroSerie}
                          onChangeText={setNroSerie}
                          editable={!isReadOnly}
                        />
                      </View>

                      <SelectDropdown
                        label="Estado Inicial de la Chapa"
                        value={estadoInicialChapa}
                        options={[
                          { id: 'Dañada', label: 'Dañada' },
                          { id: 'Operativa', label: 'Operativa' },
                          { id: 'Sin Chapa', label: 'Sin Chapa' },
                        ]}
                        onSelect={setEstadoInicialChapa}
                        disabled={isReadOnly}
                      />

                      <View style={styles.photoField}>
                        <Text style={styles.label}>Foto de la Chapa Anterior</Text>
                        {fotoChapaAnterior ? (
                          <View style={styles.photoFullContainer}>
                            <TouchableOpacity onPress={() => setPreviewUri(fotoChapaAnterior)}>
                              <Image source={{ uri: fotoChapaAnterior }} style={styles.photoFull} resizeMode="cover" />
                            </TouchableOpacity>
                            {!isReadOnly && (
                              <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoChapaAnterior')}>
                                <Ionicons name="close-circle" size={24} color={colors.danger} />
                              </TouchableOpacity>
                            )}
                          </View>
                        ) : !isReadOnly ? (
                          <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoChapaAnterior')}>
                            <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                            <Text style={styles.addPhotoText}>Subir Foto</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      <View style={styles.photoField}>
                        <Text style={styles.label}>Foto de la Nueva Chapa Instalada</Text>
                        {fotoNuevaChapa ? (
                          <View style={styles.photoFullContainer}>
                            <TouchableOpacity onPress={() => setPreviewUri(fotoNuevaChapa)}>
                              <Image source={{ uri: fotoNuevaChapa }} style={styles.photoFull} resizeMode="cover" />
                            </TouchableOpacity>
                            {!isReadOnly && (
                              <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoNuevaChapa')}>
                                <Ionicons name="close-circle" size={24} color={colors.danger} />
                              </TouchableOpacity>
                            )}
                          </View>
                        ) : !isReadOnly ? (
                          <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoNuevaChapa')}>
                            <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                            <Text style={styles.addPhotoText}>Subir Foto</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      <View style={styles.photoField}>
                        <Text style={styles.label}>Foto de la Llave Electrónica / Programación</Text>
                        {fotoLlaveProgramacion ? (
                          <View style={styles.photoFullContainer}>
                            <TouchableOpacity onPress={() => setPreviewUri(fotoLlaveProgramacion)}>
                              <Image source={{ uri: fotoLlaveProgramacion }} style={styles.photoFull} resizeMode="cover" />
                            </TouchableOpacity>
                            {!isReadOnly && (
                              <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoLlaveProgramacion')}>
                                <Ionicons name="close-circle" size={24} color={colors.danger} />
                              </TouchableOpacity>
                            )}
                          </View>
                        ) : !isReadOnly ? (
                          <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoLlaveProgramacion')}>
                            <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                            <Text style={styles.addPhotoText}>Subir Foto</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      <View style={styles.photoField}>
                        <Text style={styles.label}>Foto de la Puerta / Gabinete Cerrado</Text>
                        {fotoPuertaCerrada ? (
                          <View style={styles.photoFullContainer}>
                            <TouchableOpacity onPress={() => setPreviewUri(fotoPuertaCerrada)}>
                              <Image source={{ uri: fotoPuertaCerrada }} style={styles.photoFull} resizeMode="cover" />
                            </TouchableOpacity>
                            {!isReadOnly && (
                              <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoPuertaCerrada')}>
                                <Ionicons name="close-circle" size={24} color={colors.danger} />
                              </TouchableOpacity>
                            )}
                          </View>
                        ) : !isReadOnly ? (
                          <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoPuertaCerrada')}>
                            <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                            <Text style={styles.addPhotoText}>Subir Foto</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      <SelectDropdown
                        label="Estado Final de la Chapa"
                        value={estadoFinalChapa}
                        options={[
                          { id: 'Operativa', label: 'Operativa' },
                          { id: 'Bloqueada', label: 'Bloqueada' },
                        ]}
                        onSelect={setEstadoFinalChapa}
                        disabled={isReadOnly}
                      />
                    </View>
                  </View>
                ) : (
                  <View>
                    <View style={styles.formSection}>
                      <SelectDropdown label="Estado Inicial 3G1900" value={estado3G} options={estadoEquipoOptions} onSelect={handleEstado3GChange} disabled={isReadOnly} />
                      {estado3G === 'Encendido' && (
                        <View>
                          <View style={styles.photoField}>
                            <Text style={styles.label}>Foto Equipo 3G Encendido</Text>
                            {fotoEquipo3GEncendido ? (
                              <View style={styles.photoFullContainer}>
                                <TouchableOpacity onPress={() => setPreviewUri(fotoEquipo3GEncendido)}>
                                  <Image source={{ uri: fotoEquipo3GEncendido }} style={styles.photoFull} resizeMode="cover" />
                                </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoEquipo3GEncendido')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                  <TouchableOpacity style={styles.ampereDisplayMini} onPress={() => {
                                  setActiveAmpereTarget('fotoEquipo3GEncendido');
                                  setActiveAmpereIndex(null);
                                  setTempAmpere(ampere3GEncendido);
                                  setShowAmpereModal(true);
                                }}>
                                  <Text style={styles.ampereTextSmall}>Lectura: {ampere3GEncendido || '00,00'} A</Text>
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoEquipo3GEncendido')}>
                                <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                <Text style={styles.addPhotoText}>Subir Foto</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                          <View style={styles.photoField}>
                            <Text style={styles.label}>Foto Breaker 3G Encendido</Text>
                            {fotoBreaker3GEncendido ? (
                              <View style={styles.photoFullContainer}>
                                <TouchableOpacity onPress={() => setPreviewUri(fotoBreaker3GEncendido)}>
                                  <Image source={{ uri: fotoBreaker3GEncendido }} style={styles.photoFull} resizeMode="cover" />
                                </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBreaker3GEncendido')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                              </View>
                            ) : (
                              <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBreaker3GEncendido')}>
                                <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                <Text style={styles.addPhotoText}>Subir Foto</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                          <SelectDropdown label="¿Se apagará equipo 3G?" value={seApagara3G} options={siNoOptions} onSelect={setSeApagara3G} disabled={isReadOnly} />
                          {seApagara3G === 'Si' && (
                            <View>
                              <View style={styles.photoField}>
                                <Text style={styles.label}>Foto Breaker 3G Apagado</Text>
                                {fotoBreaker3GApagado ? (
                                  <View style={styles.photoFullContainer}>
                                    <TouchableOpacity onPress={() => setPreviewUri(fotoBreaker3GApagado)}>
                                      <Image source={{ uri: fotoBreaker3GApagado }} style={styles.photoFull} resizeMode="cover" />
                                    </TouchableOpacity>
                                      {!isReadOnly && (
                                        <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBreaker3GApagado')}>
                                          <Ionicons name="close-circle" size={24} color={colors.danger} />
                                        </TouchableOpacity>
                                      )}
                                  </View>
                                ) : (
                                  <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBreaker3GApagado')}>
                                    <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                    <Text style={styles.addPhotoText}>Subir Foto</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                              <View style={styles.photoField}>
                                <Text style={styles.label}>Foto Equipo 3G Apagado</Text>
                                {fotoEquipo3GApagado ? (
                                  <View style={styles.photoFullContainer}>
                                    <TouchableOpacity onPress={() => setPreviewUri(fotoEquipo3GApagado)}>
                                      <Image source={{ uri: fotoEquipo3GApagado }} style={styles.photoFull} resizeMode="cover" />
                                    </TouchableOpacity>
                                      {!isReadOnly && (
                                        <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoEquipo3GApagado')}>
                                          <Ionicons name="close-circle" size={24} color={colors.danger} />
                                        </TouchableOpacity>
                                      )}
                                  </View>
                                ) : (
                                  <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoEquipo3GApagado')}>
                                    <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                    <Text style={styles.addPhotoText}>Subir Foto</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                              <View style={styles.photoField}>
                                <Text style={styles.label}>Foto Espacio Retirado</Text>
                                {fotoEspacioRetirado ? (
                                  <View style={styles.photoFullContainer}>
                                    <TouchableOpacity onPress={() => setPreviewUri(fotoEspacioRetirado)}>
                                      <Image source={{ uri: fotoEspacioRetirado }} style={styles.photoFull} resizeMode="cover" />
                                    </TouchableOpacity>
                                      {!isReadOnly && (
                                        <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoEspacioRetirado')}>
                                          <Ionicons name="close-circle" size={24} color={colors.danger} />
                                        </TouchableOpacity>
                                      )}
                                  </View>
                                ) : (
                                  <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoEspacioRetirado')}>
                                    <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                    <Text style={styles.addPhotoText}>Subir Foto</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          )}
                          {seApagara3G === 'No' && (
                            <View>
                              <Text style={styles.label}>Justificación</Text>
                              <TextInput style={styles.input} placeholder="Escriba la justificación..." value={justificacionNoApagado} onChangeText={setJustificacionNoApagado} editable={!isReadOnly} />
                            </View>
                          )}
                        </View>
                      )}
                      {estado3G === 'Apagado' && (
                        <View>
                          <SelectDropdown label="¿Se retirará equipo 3G?" value={seRetirara3G} options={siNoOptions} onSelect={setSeRetirara3G} disabled={isReadOnly} />
                          {seRetirara3G === 'Si' && (
                            <View>
                              <View style={styles.photoField}>
                                <Text style={styles.label}>Foto Breaker 3G Apagado</Text>
                                {fotoBreaker3GApagado ? (
                                  <View style={styles.photoFullContainer}>
                                    <TouchableOpacity onPress={() => setPreviewUri(fotoBreaker3GApagado)}>
                                      <Image source={{ uri: fotoBreaker3GApagado }} style={styles.photoFull} resizeMode="cover" />
                                    </TouchableOpacity>
                                      {!isReadOnly && (
                                        <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBreaker3GApagado')}>
                                          <Ionicons name="close-circle" size={24} color={colors.danger} />
                                        </TouchableOpacity>
                                      )}
                                  </View>
                                ) : (
                                  <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBreaker3GApagado')}>
                                    <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                    <Text style={styles.addPhotoText}>Subir Foto</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                              <View style={styles.photoField}>
                                <Text style={styles.label}>Foto Equipo 3G Apagado</Text>
                                {fotoEquipo3GApagado ? (
                                  <View style={styles.photoFullContainer}>
                                    <TouchableOpacity onPress={() => setPreviewUri(fotoEquipo3GApagado)}>
                                      <Image source={{ uri: fotoEquipo3GApagado }} style={styles.photoFull} resizeMode="cover" />
                                    </TouchableOpacity>
                                      {!isReadOnly && (
                                        <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoEquipo3GApagado')}>
                                          <Ionicons name="close-circle" size={24} color={colors.danger} />
                                        </TouchableOpacity>
                                      )}
                                  </View>
                                ) : (
                                  <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoEquipo3GApagado')}>
                                    <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                    <Text style={styles.addPhotoText}>Subir Foto</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                              <View style={styles.photoField}>
                                <Text style={styles.label}>Foto Espacio Retirado</Text>
                                {fotoEspacioRetirado ? (
                                  <View style={styles.photoFullContainer}>
                                    <TouchableOpacity onPress={() => setPreviewUri(fotoEspacioRetirado)}>
                                      <Image source={{ uri: fotoEspacioRetirado }} style={styles.photoFull} resizeMode="cover" />
                                    </TouchableOpacity>
                                      {!isReadOnly && (
                                        <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoEspacioRetirado')}>
                                          <Ionicons name="close-circle" size={24} color={colors.danger} />
                                        </TouchableOpacity>
                                      )}
                                  </View>
                                ) : (
                                  <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoEspacioRetirado')}>
                                    <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                    <Text style={styles.addPhotoText}>Subir Foto</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          )}
                        </View>
                      )}
                      {estado3G === 'N/A' && (
                        <View>
                          <View style={styles.photoField}>
                            <Text style={styles.label}>Foto Espacio Retirado</Text>
                            {fotoEspacioRetirado ? (
                              <View style={styles.photoFullContainer}>
                                <TouchableOpacity onPress={() => setPreviewUri(fotoEspacioRetirado)}>
                                  <Image source={{ uri: fotoEspacioRetirado }} style={styles.photoFull} resizeMode="cover" />
                                </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoEspacioRetirado')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                              </View>
                            ) : (
                              <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoEspacioRetirado')}>
                                <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                <Text style={styles.addPhotoText}>Subir Foto</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      )}

                      {/* RRU Section */}
                      <SelectDropdown label="Estado Inicial RRU 1900" value={estadoRRU} options={estadoEquipoOptions} onSelect={setEstadoRRU} disabled={isReadOnly} />
                      {estadoRRU === 'Encendido' && (
                        <View>
                          <View style={styles.photoField}><Text style={styles.label}>Foto Breakers RRU Encendidos</Text>{fotoRRUEncendido ? (<View style={styles.photoFullContainer}><TouchableOpacity onPress={() => setPreviewUri(fotoRRUEncendido)}><Image source={{ uri: fotoRRUEncendido }} style={styles.photoFull} resizeMode="cover" /></TouchableOpacity>{!isReadOnly && (<TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoRRUEncendido')}><Ionicons name="close-circle" size={24} color={colors.danger} /></TouchableOpacity>)}</View>) : !isReadOnly ? (<TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoRRUEncendido')}><Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" /><Text style={styles.addPhotoText}>Subir Foto</Text></TouchableOpacity>) : null}</View>
                          <SelectDropdown label="¿Se apagará equipo RRU?" value={seApagaraRRU} options={siNoOptions} onSelect={setSeApagaraRRU} disabled={isReadOnly} />
                          {seApagaraRRU === 'Si' && (
                            <View style={styles.photoField}><Text style={styles.label}>Foto Breakers RRU Apagados</Text>{fotoRRUApagado ? (<View style={styles.photoFullContainer}><TouchableOpacity onPress={() => setPreviewUri(fotoRRUApagado)}><Image source={{ uri: fotoRRUApagado }} style={styles.photoFull} resizeMode="cover" /></TouchableOpacity>{!isReadOnly && (<TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoRRUApagado')}><Ionicons name="close-circle" size={24} color={colors.danger} /></TouchableOpacity>)}</View>) : !isReadOnly ? (<TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoRRUApagado')}><Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" /><Text style={styles.addPhotoText}>Subir Foto</Text></TouchableOpacity>) : null}</View>
                          )}
                        </View>
                      )}
                      {estadoRRU === 'Apagado' && (
                        <View style={styles.photoField}><Text style={styles.label}>Foto Breakers RRU Apagados</Text>{fotoRRUApagado ? (<View style={styles.photoFullContainer}><TouchableOpacity onPress={() => setPreviewUri(fotoRRUApagado)}><Image source={{ uri: fotoRRUApagado }} style={styles.photoFull} resizeMode="cover" /></TouchableOpacity>{!isReadOnly && (<TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoRRUApagado')}><Ionicons name="close-circle" size={24} color={colors.danger} /></TouchableOpacity>)}</View>) : !isReadOnly ? (<TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoRRUApagado')}><Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" /><Text style={styles.addPhotoText}>Subir Foto</Text></TouchableOpacity>) : null}</View>
                      )}
                    </View>
                  </View>
                )
              )}

              {activeFolder === 'bafiS2' && (
                <View>
                  <View style={styles.formSection}>
                    <SelectDropdown
                      label="Estado Baseband Sector 2"
                      value={estadoBasebandSector2}
                      options={[
                        { id: 'Encendido', label: 'Encendido' },
                        { id: 'Apagado', label: 'Apagado' },
                        { id: 'N/A', label: 'N/A' },
                      ]}
                      onSelect={handleEstadoBasebandSector2Change}
                      disabled={isReadOnly}
                    />

                    {estadoBasebandSector2 === 'Encendido' && (
                      <View style={{ gap: 12 }}>
                        <View style={styles.photoField}>
                          <Text style={styles.label}>Foto de Breaker Baseband S2 Encendido</Text>
                          {fotoBreakerBaseband2Encendido ? (
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoBreakerBaseband2Encendido)}>
                                <Image source={{ uri: fotoBreakerBaseband2Encendido }} style={styles.photoFull} resizeMode="cover" />
                              </TouchableOpacity>
                              {!isReadOnly && (
                                <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBreakerBaseband2Encendido')}>
                                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : !isReadOnly ? (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBreakerBaseband2Encendido')}>
                              <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        <View style={styles.photoField}>
                          <Text style={styles.label}>Foto de Baseband S2 Encendida</Text>
                          {fotoBaseband2Encendida ? (
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoBaseband2Encendida)}>
                                <Image source={{ uri: fotoBaseband2Encendida }} style={styles.photoFull} resizeMode="cover" />
                              </TouchableOpacity>
                              {!isReadOnly && (
                                <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBaseband2Encendida')}>
                                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : !isReadOnly ? (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBaseband2Encendida')}>
                              <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        <View style={styles.photoField}>
                          <Text style={styles.label}>Consumo Inicial CC en Baseband S2</Text>
                          {fotoConsumoInicialCc2 ? (
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoConsumoInicialCc2)}>
                                <Image source={{ uri: fotoConsumoInicialCc2 }} style={styles.photoFull} resizeMode="cover" />
                              </TouchableOpacity>
                              {!isReadOnly && (
                                <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoConsumoInicialCc2')}>
                                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : !isReadOnly ? (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoConsumoInicialCc2')}>
                              <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        {fotoBreakerBaseband2Encendido !== '' && fotoBaseband2Encendida !== '' && fotoConsumoInicialCc2 !== '' && (
                          !confirmadoApagadoRetirarS2 ? (
                            <View style={styles.warningCard}>
                              <Ionicons name="warning" size={32} color="#FF9500" style={{ marginBottom: 8 }} />
                              <Text style={styles.warningCardText}>Apagar Breaker, Registrar Consumo Final y luego retirar Baseband S2</Text>
                              {!isReadOnly && (
                                <TouchableOpacity style={styles.warningConfirmBtn} onPress={() => setConfirmadoApagadoRetirarS2(true)}>
                                  <Text style={styles.warningConfirmBtnText}>Confirmar realización</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : (
                            <View style={styles.successBadge}>
                              <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                              <Text style={styles.successBadgeText}>Realización confirmada</Text>
                            </View>
                          )
                        )}

                        {confirmadoApagadoRetirarS2 && (
                          <View style={{ gap: 12 }}>
                            <View style={styles.photoField}>
                              <Text style={styles.label}>Foto de Breaker Baseband S2 Apagado</Text>
                              {fotoBreakerBaseband2Apagado ? (
                                <View style={styles.photoFullContainer}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotoBreakerBaseband2Apagado)}>
                                    <Image source={{ uri: fotoBreakerBaseband2Apagado }} style={styles.photoFull} resizeMode="cover" />
                                  </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBreakerBaseband2Apagado')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ) : !isReadOnly ? (
                                <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBreakerBaseband2Apagado')}>
                                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                  <Text style={styles.addPhotoText}>Subir Foto</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>

                            <View style={styles.photoField}>
                              <Text style={styles.label}>Consumo Final CC en Baseband S2</Text>
                              {fotoConsumoFinalCc2 ? (
                                <View style={styles.photoFullContainer}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotoConsumoFinalCc2)}>
                                    <Image source={{ uri: fotoConsumoFinalCc2 }} style={styles.photoFull} resizeMode="cover" />
                                  </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoConsumoFinalCc2')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ) : !isReadOnly ? (
                                <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoConsumoFinalCc2')}>
                                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                  <Text style={styles.addPhotoText}>Subir Foto</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>



                            <View style={styles.photoField}>
                              <Text style={styles.label}>Foto de Espacio de Baseband S2 Retirada</Text>
                              {fotoEspacioBaseband2Retirada ? (
                                <View style={styles.photoFullContainer}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotoEspacioBaseband2Retirada)}>
                                    <Image source={{ uri: fotoEspacioBaseband2Retirada }} style={styles.photoFull} resizeMode="cover" />
                                  </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoEspacioBaseband2Retirada')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ) : !isReadOnly ? (
                                <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoEspacioBaseband2Retirada')}>
                                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                  <Text style={styles.addPhotoText}>Subir Foto</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {estadoBasebandSector2 === 'Apagado' && (
                      <View style={{ gap: 12 }}>
                        {!confirmadoApagadoRetirarS2 ? (
                          <View style={styles.warningCard}>
                            <Ionicons name="warning" size={32} color="#FF9500" style={{ marginBottom: 8 }} />
                            <Text style={styles.warningCardText}>Registrar Consumo Final y luego retirar Baseband S2</Text>
                            {!isReadOnly && (
                              <TouchableOpacity style={styles.warningConfirmBtn} onPress={() => setConfirmadoApagadoRetirarS2(true)}>
                                <Text style={styles.warningConfirmBtnText}>Confirmar realización</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ) : (
                          <View style={{ gap: 12 }}>
                            <View style={styles.successBadge}>
                              <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                              <Text style={styles.successBadgeText}>Baseband S2 retirada confirmado</Text>
                            </View>

                            <View style={styles.photoField}>
                              <Text style={styles.label}>Foto de Breaker Baseband S2 Apagado</Text>
                              {fotoBreakerBaseband2Apagado ? (
                                <View style={styles.photoFullContainer}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotoBreakerBaseband2Apagado)}>
                                    <Image source={{ uri: fotoBreakerBaseband2Apagado }} style={styles.photoFull} resizeMode="cover" />
                                  </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBreakerBaseband2Apagado')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ) : !isReadOnly ? (
                                <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBreakerBaseband2Apagado')}>
                                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                  <Text style={styles.addPhotoText}>Subir Foto</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>

                            <View style={styles.photoField}>
                              <Text style={styles.label}>Consumo Final CC en Baseband S2</Text>
                              {fotoConsumoFinalCc2 ? (
                                <View style={styles.photoFullContainer}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotoConsumoFinalCc2)}>
                                    <Image source={{ uri: fotoConsumoFinalCc2 }} style={styles.photoFull} resizeMode="cover" />
                                  </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoConsumoFinalCc2')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ) : !isReadOnly ? (
                                <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoConsumoFinalCc2')}>
                                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                  <Text style={styles.addPhotoText}>Subir Foto</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>



                            <View style={styles.photoField}>
                              <Text style={styles.label}>Foto de Espacio de Baseband S2 Retirada</Text>
                              {fotoEspacioBaseband2Retirada ? (
                                <View style={styles.photoFullContainer}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotoEspacioBaseband2Retirada)}>
                                    <Image source={{ uri: fotoEspacioBaseband2Retirada }} style={styles.photoFull} resizeMode="cover" />
                                  </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoEspacioBaseband2Retirada')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ) : !isReadOnly ? (
                                <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoEspacioBaseband2Retirada')}>
                                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                  <Text style={styles.addPhotoText}>Subir Foto</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          </View>
                        )}
                      </View>
                    )}


                  </View>
                </View>
              )}

              {activeFolder === 'bafiS3' && (
                <View>
                  <View style={styles.formSection}>
                    <SelectDropdown
                      label="Estado Baseband Sector 3"
                      value={estadoBasebandSector3}
                      options={[
                        { id: 'Encendido', label: 'Encendido' },
                        { id: 'Apagado', label: 'Apagado' },
                        { id: 'N/A', label: 'N/A' },
                      ]}
                      onSelect={handleEstadoBasebandSector3Change}
                      disabled={isReadOnly}
                    />

                    {estadoBasebandSector3 === 'Encendido' && (
                      <View style={{ gap: 12 }}>
                        <View style={styles.photoField}>
                          <Text style={styles.label}>Foto de Breaker Baseband S3 Encendido</Text>
                          {fotoBreakerBaseband3Encendido ? (
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoBreakerBaseband3Encendido)}>
                                <Image source={{ uri: fotoBreakerBaseband3Encendido }} style={styles.photoFull} resizeMode="cover" />
                              </TouchableOpacity>
                              {!isReadOnly && (
                                <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBreakerBaseband3Encendido')}>
                                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : !isReadOnly ? (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBreakerBaseband3Encendido')}>
                              <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        <View style={styles.photoField}>
                          <Text style={styles.label}>Foto de Baseband S3 Encendida</Text>
                          {fotoBaseband3Encendida ? (
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoBaseband3Encendida)}>
                                <Image source={{ uri: fotoBaseband3Encendida }} style={styles.photoFull} resizeMode="cover" />
                              </TouchableOpacity>
                              {!isReadOnly && (
                                <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBaseband3Encendida')}>
                                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : !isReadOnly ? (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBaseband3Encendida')}>
                              <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        <View style={styles.photoField}>
                          <Text style={styles.label}>Consumo Inicial CC en Baseband S3</Text>
                          {fotoConsumoInicialCc3 ? (
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoConsumoInicialCc3)}>
                                <Image source={{ uri: fotoConsumoInicialCc3 }} style={styles.photoFull} resizeMode="cover" />
                              </TouchableOpacity>
                              {!isReadOnly && (
                                <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoConsumoInicialCc3')}>
                                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : !isReadOnly ? (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoConsumoInicialCc3')}>
                              <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>



                        {fotoBreakerBaseband3Encendido !== '' && fotoBaseband3Encendida !== '' && fotoConsumoInicialCc3 !== '' && (
                          !confirmadoApagadoRetirarS3 ? (
                            <View style={styles.warningCard}>
                              <Ionicons name="warning" size={32} color="#FF9500" style={{ marginBottom: 8 }} />
                              <Text style={styles.warningCardText}>Apagar Breaker, Registrar Consumo Final y luego retirar Baseband S3</Text>
                              {!isReadOnly && (
                                <TouchableOpacity style={styles.warningConfirmBtn} onPress={() => setConfirmadoApagadoRetirarS3(true)}>
                                  <Text style={styles.warningConfirmBtnText}>Confirmar realización</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : (
                            <View style={styles.successBadge}>
                              <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                              <Text style={styles.successBadgeText}>Realización confirmada</Text>
                            </View>
                          )
                        )}

                        {confirmadoApagadoRetirarS3 && (
                          <View style={{ gap: 12 }}>
                            <View style={styles.photoField}>
                              <Text style={styles.label}>Foto de Breaker Baseband S3 Apagado</Text>
                              {fotoBreakerBaseband3Apagado ? (
                                <View style={styles.photoFullContainer}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotoBreakerBaseband3Apagado)}>
                                    <Image source={{ uri: fotoBreakerBaseband3Apagado }} style={styles.photoFull} resizeMode="cover" />
                                  </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBreakerBaseband3Apagado')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ) : !isReadOnly ? (
                                <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBreakerBaseband3Apagado')}>
                                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                  <Text style={styles.addPhotoText}>Subir Foto</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>

                            <View style={styles.photoField}>
                              <Text style={styles.label}>Consumo Final CC en Baseband S3</Text>
                              {fotoConsumoFinalCc3 ? (
                                <View style={styles.photoFullContainer}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotoConsumoFinalCc3)}>
                                    <Image source={{ uri: fotoConsumoFinalCc3 }} style={styles.photoFull} resizeMode="cover" />
                                  </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoConsumoFinalCc3')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ) : !isReadOnly ? (
                                <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoConsumoFinalCc3')}>
                                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                  <Text style={styles.addPhotoText}>Subir Foto</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>



                            <View style={styles.photoField}>
                              <Text style={styles.label}>Foto de Espacio de Baseband S3 Retirada</Text>
                              {fotoEspacioBaseband3Retirada ? (
                                <View style={styles.photoFullContainer}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotoEspacioBaseband3Retirada)}>
                                    <Image source={{ uri: fotoEspacioBaseband3Retirada }} style={styles.photoFull} resizeMode="cover" />
                                  </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoEspacioBaseband3Retirada')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ) : !isReadOnly ? (
                                <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoEspacioBaseband3Retirada')}>
                                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                  <Text style={styles.addPhotoText}>Subir Foto</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {estadoBasebandSector3 === 'Apagado' && (
                      <View style={{ gap: 12 }}>
                        {!confirmadoApagadoRetirarS3 ? (
                          <View style={styles.warningCard}>
                            <Ionicons name="warning" size={32} color="#FF9500" style={{ marginBottom: 8 }} />
                            <Text style={styles.warningCardText}>Registrar Consumo Final y luego retirar Baseband S3</Text>
                            {!isReadOnly && (
                              <TouchableOpacity style={styles.warningConfirmBtn} onPress={() => setConfirmadoApagadoRetirarS3(true)}>
                                <Text style={styles.warningConfirmBtnText}>Confirmar realización</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ) : (
                          <View style={{ gap: 12 }}>
                            <View style={styles.successBadge}>
                              <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                              <Text style={styles.successBadgeText}>Baseband S3 retirada confirmado</Text>
                            </View>

                            <View style={styles.photoField}>
                              <Text style={styles.label}>Foto de Breaker Baseband S3 Apagado</Text>
                              {fotoBreakerBaseband3Apagado ? (
                                <View style={styles.photoFullContainer}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotoBreakerBaseband3Apagado)}>
                                    <Image source={{ uri: fotoBreakerBaseband3Apagado }} style={styles.photoFull} resizeMode="cover" />
                                  </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBreakerBaseband3Apagado')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ) : !isReadOnly ? (
                                <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBreakerBaseband3Apagado')}>
                                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                  <Text style={styles.addPhotoText}>Subir Foto</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>

                            <View style={styles.photoField}>
                              <Text style={styles.label}>Consumo Final CC en Baseband S3</Text>
                              {fotoConsumoFinalCc3 ? (
                                <View style={styles.photoFullContainer}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotoConsumoFinalCc3)}>
                                    <Image source={{ uri: fotoConsumoFinalCc3 }} style={styles.photoFull} resizeMode="cover" />
                                  </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoConsumoFinalCc3')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ) : !isReadOnly ? (
                                <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoConsumoFinalCc3')}>
                                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                  <Text style={styles.addPhotoText}>Subir Foto</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>



                            <View style={styles.photoField}>
                              <Text style={styles.label}>Foto de Espacio de Baseband S3 Retirada</Text>
                              {fotoEspacioBaseband3Retirada ? (
                                <View style={styles.photoFullContainer}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotoEspacioBaseband3Retirada)}>
                                    <Image source={{ uri: fotoEspacioBaseband3Retirada }} style={styles.photoFull} resizeMode="cover" />
                                  </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoEspacioBaseband3Retirada')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ) : !isReadOnly ? (
                                <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoEspacioBaseband3Retirada')}>
                                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                  <Text style={styles.addPhotoText}>Subir Foto</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          </View>
                        )}
                      </View>
                    )}


                  </View>
                </View>
              )}

              {activeFolder === 'antenaS1' && (
                <View>
                  <View style={styles.formSection}>
                    <SelectDropdown
                      label="¿Se apagará Antena del Sector 1?"
                      value={seApagaraAntenaS1}
                      options={[
                        { id: 'Si', label: 'Si' },
                        { id: 'No', label: 'No' },
                        { id: 'N/A', label: 'N/A' },
                      ]}
                      onSelect={handleSeApagaraAntenaS1Change}
                      disabled={isReadOnly}
                    />

                    {seApagaraAntenaS1 === 'Si' && (
                      <View style={{ gap: 12, marginTop: 12 }}>
                        <View style={styles.photoField}>
                          <Text style={styles.label}>Foto de Breaker Antena S1 Encendido</Text>
                          {fotoBreakerAntenaS1Encendido ? (
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoBreakerAntenaS1Encendido)}>
                                <Image source={{ uri: fotoBreakerAntenaS1Encendido }} style={styles.photoFull} resizeMode="cover" />
                              </TouchableOpacity>
                              {!isReadOnly && (
                                <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBreakerAntenaS1Encendido')}>
                                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : !isReadOnly ? (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBreakerAntenaS1Encendido')}>
                              <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        <View style={styles.photoField}>
                          <Text style={styles.label}>Consumo Inicial CC en Antena S1</Text>
                          {fotoConsumoInicialCcAntenaS1 ? (
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoConsumoInicialCcAntenaS1)}>
                                <Image source={{ uri: fotoConsumoInicialCcAntenaS1 }} style={styles.photoFull} resizeMode="cover" />
                              </TouchableOpacity>
                              {!isReadOnly && (
                                <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoConsumoInicialCcAntenaS1')}>
                                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : !isReadOnly ? (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoConsumoInicialCcAntenaS1')}>
                              <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        {fotoBreakerAntenaS1Encendido !== '' && fotoConsumoInicialCcAntenaS1 !== '' && (
                          !confirmadoApagadoAntenaS1 ? (
                            <View style={styles.warningCard}>
                              <Ionicons name="warning" size={32} color="#FF9500" style={{ marginBottom: 8 }} />
                              <Text style={styles.warningCardText}>Registrar Consumo Final y luego retirar Baseband S1/S2/S3</Text>
                              {!isReadOnly && (
                                <TouchableOpacity style={styles.warningConfirmBtn} onPress={() => setConfirmadoApagadoAntenaS1(true)}>
                                  <Text style={styles.warningConfirmBtnText}>Confirmar realización</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : (
                            <View style={styles.successBadge}>
                              <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                              <Text style={styles.successBadgeText}>Realización confirmada</Text>
                            </View>
                          )
                        )}

                        {confirmadoApagadoAntenaS1 && (
                          <View style={{ gap: 12 }}>
                            <View style={styles.photoField}>
                              <Text style={styles.label}>Foto de Breaker Antena S1 Apagado</Text>
                              {fotoBreakerAntenaS1Apagado ? (
                                <View style={styles.photoFullContainer}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotoBreakerAntenaS1Apagado)}>
                                    <Image source={{ uri: fotoBreakerAntenaS1Apagado }} style={styles.photoFull} resizeMode="cover" />
                                  </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBreakerAntenaS1Apagado')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ) : !isReadOnly ? (
                                <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBreakerAntenaS1Apagado')}>
                                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                  <Text style={styles.addPhotoText}>Subir Foto</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>

                            <View style={styles.photoField}>
                              <Text style={styles.label}>Consumo Final CC en Antena S1</Text>
                              {fotoConsumoFinalCcAntenaS1 ? (
                                <View style={styles.photoFullContainer}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotoConsumoFinalCcAntenaS1)}>
                                    <Image source={{ uri: fotoConsumoFinalCcAntenaS1 }} style={styles.photoFull} resizeMode="cover" />
                                  </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoConsumoFinalCcAntenaS1')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ) : !isReadOnly ? (
                                <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoConsumoFinalCcAntenaS1')}>
                                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                  <Text style={styles.addPhotoText}>Subir Foto</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {seApagaraAntenaS1 === 'No' && (
                      <View style={{ gap: 12, marginTop: 12 }}>
                        <View style={styles.warningCard}>
                          <Ionicons name="information-circle" size={32} color="#0A84FF" style={{ marginBottom: 8 }} />
                          <Text style={styles.warningCardText}>Compartida con 5G</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {activeFolder === 'antenaS2' && (
                <View>
                  <View style={styles.formSection}>
                    <SelectDropdown
                      label="¿Se apagará Antena del Sector 2?"
                      value={seApagaraAntenaS2}
                      options={[
                        { id: 'Si', label: 'Si' },
                        { id: 'No', label: 'No' },
                        { id: 'N/A', label: 'N/A' },
                      ]}
                      onSelect={handleSeApagaraAntenaS2Change}
                      disabled={isReadOnly}
                    />

                    {seApagaraAntenaS2 === 'Si' && (
                      <View style={{ gap: 12, marginTop: 12 }}>
                        <View style={styles.photoField}>
                          <Text style={styles.label}>Foto de Breaker Antena S2 Encendido</Text>
                          {fotoBreakerAntenaS2Encendido ? (
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoBreakerAntenaS2Encendido)}>
                                <Image source={{ uri: fotoBreakerAntenaS2Encendido }} style={styles.photoFull} resizeMode="cover" />
                              </TouchableOpacity>
                              {!isReadOnly && (
                                <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBreakerAntenaS2Encendido')}>
                                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : !isReadOnly ? (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBreakerAntenaS2Encendido')}>
                              <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        <View style={styles.photoField}>
                          <Text style={styles.label}>Consumo Inicial CC en Antena S2</Text>
                          {fotoConsumoInicialCcAntenaS2 ? (
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoConsumoInicialCcAntenaS2)}>
                                <Image source={{ uri: fotoConsumoInicialCcAntenaS2 }} style={styles.photoFull} resizeMode="cover" />
                              </TouchableOpacity>
                              {!isReadOnly && (
                                <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoConsumoInicialCcAntenaS2')}>
                                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : !isReadOnly ? (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoConsumoInicialCcAntenaS2')}>
                              <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        {fotoBreakerAntenaS2Encendido !== '' && fotoConsumoInicialCcAntenaS2 !== '' && (
                          !confirmadoApagadoAntenaS2 ? (
                            <View style={styles.warningCard}>
                              <Ionicons name="warning" size={32} color="#FF9500" style={{ marginBottom: 8 }} />
                              <Text style={styles.warningCardText}>Registrar Consumo Final y luego retirar Baseband S1/S2/S3</Text>
                              {!isReadOnly && (
                                <TouchableOpacity style={styles.warningConfirmBtn} onPress={() => setConfirmadoApagadoAntenaS2(true)}>
                                  <Text style={styles.warningConfirmBtnText}>Confirmar realización</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : (
                            <View style={styles.successBadge}>
                              <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                              <Text style={styles.successBadgeText}>Realización confirmada</Text>
                            </View>
                          )
                        )}

                        {confirmadoApagadoAntenaS2 && (
                          <View style={{ gap: 12 }}>
                            <View style={styles.photoField}>
                              <Text style={styles.label}>Foto de Breaker Antena S2 Apagado</Text>
                              {fotoBreakerAntenaS2Apagado ? (
                                <View style={styles.photoFullContainer}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotoBreakerAntenaS2Apagado)}>
                                    <Image source={{ uri: fotoBreakerAntenaS2Apagado }} style={styles.photoFull} resizeMode="cover" />
                                  </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBreakerAntenaS2Apagado')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ) : !isReadOnly ? (
                                <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBreakerAntenaS2Apagado')}>
                                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                  <Text style={styles.addPhotoText}>Subir Foto</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>

                            <View style={styles.photoField}>
                              <Text style={styles.label}>Consumo Final CC en Antena S2</Text>
                              {fotoConsumoFinalCcAntenaS2 ? (
                                <View style={styles.photoFullContainer}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotoConsumoFinalCcAntenaS2)}>
                                    <Image source={{ uri: fotoConsumoFinalCcAntenaS2 }} style={styles.photoFull} resizeMode="cover" />
                                  </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoConsumoFinalCcAntenaS2')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ) : !isReadOnly ? (
                                <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoConsumoFinalCcAntenaS2')}>
                                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                  <Text style={styles.addPhotoText}>Subir Foto</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {seApagaraAntenaS2 === 'No' && (
                      <View style={{ gap: 12, marginTop: 12 }}>
                        <View style={styles.warningCard}>
                          <Ionicons name="information-circle" size={32} color="#0A84FF" style={{ marginBottom: 8 }} />
                          <Text style={styles.warningCardText}>Compartida con 5G</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {activeFolder === 'antenaS3' && (
                <View>
                  <View style={styles.formSection}>
                    <SelectDropdown
                      label="¿Se apagará Antena del Sector 3?"
                      value={seApagaraAntenaS3}
                      options={[
                        { id: 'Si', label: 'Si' },
                        { id: 'No', label: 'No' },
                        { id: 'N/A', label: 'N/A' },
                      ]}
                      onSelect={handleSeApagaraAntenaS3Change}
                      disabled={isReadOnly}
                    />

                    {seApagaraAntenaS3 === 'Si' && (
                      <View style={{ gap: 12, marginTop: 12 }}>
                        <View style={styles.photoField}>
                          <Text style={styles.label}>Foto de Breaker Antena S3 Encendido</Text>
                          {fotoBreakerAntenaS3Encendido ? (
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoBreakerAntenaS3Encendido)}>
                                <Image source={{ uri: fotoBreakerAntenaS3Encendido }} style={styles.photoFull} resizeMode="cover" />
                              </TouchableOpacity>
                              {!isReadOnly && (
                                <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBreakerAntenaS3Encendido')}>
                                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : !isReadOnly ? (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBreakerAntenaS3Encendido')}>
                              <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        <View style={styles.photoField}>
                          <Text style={styles.label}>Consumo Inicial CC en Antena S3</Text>
                          {fotoConsumoInicialCcAntenaS3 ? (
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoConsumoInicialCcAntenaS3)}>
                                <Image source={{ uri: fotoConsumoInicialCcAntenaS3 }} style={styles.photoFull} resizeMode="cover" />
                              </TouchableOpacity>
                              {!isReadOnly && (
                                <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoConsumoInicialCcAntenaS3')}>
                                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : !isReadOnly ? (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoConsumoInicialCcAntenaS3')}>
                              <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        {fotoBreakerAntenaS3Encendido !== '' && fotoConsumoInicialCcAntenaS3 !== '' && (
                          !confirmadoApagadoAntenaS3 ? (
                            <View style={styles.warningCard}>
                              <Ionicons name="warning" size={32} color="#FF9500" style={{ marginBottom: 8 }} />
                              <Text style={styles.warningCardText}>Registrar Consumo Final y luego retirar Baseband S1/S2/S3</Text>
                              {!isReadOnly && (
                                <TouchableOpacity style={styles.warningConfirmBtn} onPress={() => setConfirmadoApagadoAntenaS3(true)}>
                                  <Text style={styles.warningConfirmBtnText}>Confirmar realización</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : (
                            <View style={styles.successBadge}>
                              <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                              <Text style={styles.successBadgeText}>Realización confirmada</Text>
                            </View>
                          )
                        )}

                        {confirmadoApagadoAntenaS3 && (
                          <View style={{ gap: 12 }}>
                            <View style={styles.photoField}>
                              <Text style={styles.label}>Foto de Breaker Antena S3 Apagado</Text>
                              {fotoBreakerAntenaS3Apagado ? (
                                <View style={styles.photoFullContainer}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotoBreakerAntenaS3Apagado)}>
                                    <Image source={{ uri: fotoBreakerAntenaS3Apagado }} style={styles.photoFull} resizeMode="cover" />
                                  </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBreakerAntenaS3Apagado')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ) : !isReadOnly ? (
                                <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBreakerAntenaS3Apagado')}>
                                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                  <Text style={styles.addPhotoText}>Subir Foto</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>

                            <View style={styles.photoField}>
                              <Text style={styles.label}>Consumo Final CC en Antena S3</Text>
                              {fotoConsumoFinalCcAntenaS3 ? (
                                <View style={styles.photoFullContainer}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotoConsumoFinalCcAntenaS3)}>
                                    <Image source={{ uri: fotoConsumoFinalCcAntenaS3 }} style={styles.photoFull} resizeMode="cover" />
                                  </TouchableOpacity>
                                  {!isReadOnly && (
                                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoConsumoFinalCcAntenaS3')}>
                                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ) : !isReadOnly ? (
                                <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoConsumoFinalCcAntenaS3')}>
                                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                                  <Text style={styles.addPhotoText}>Subir Foto</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {seApagaraAntenaS3 === 'No' && (
                      <View style={{ gap: 12, marginTop: 12 }}>
                        <View style={styles.warningCard}>
                          <Ionicons name="information-circle" size={32} color="#0A84FF" style={{ marginBottom: 8 }} />
                          <Text style={styles.warningCardText}>Compartida con 5G</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
            {(activeFolder === 'datos' || activeFolder === 'apagado' || activeFolder === 'bafiS2' || activeFolder === 'bafiS3' || activeFolder === 'antenaS1' || activeFolder === 'antenaS2' || activeFolder === 'antenaS3' || activeFolder === 'alarmasExternas' || activeFolder === 'evidenciaSalida' || activeFolder === 'hallazgos') && (
              <View style={styles.stickyBottomContainer}>
                {!isReadOnly && activeFolder !== 'hallazgos' && (
                  <View style={styles.progressRow}>
                    <View style={styles.sectionProgressBarBg}>
                      <View style={[
                        styles.sectionProgressBarFill, 
                        { 
                          width: `${getCurrentFolderProgress()}%`, 
                          backgroundColor: getProgressColor(getCurrentFolderProgress()) 
                        }
                      ]} />
                    </View>
                    <Text style={styles.sectionProgressPercent}>
                      {getCurrentFolderProgress()}%
                    </Text>
                  </View>
                )}
                
                {(isReadOnly || getCurrentFolderProgress() === 100 || (activeFolder === 'hallazgos' && fotos.length > 0)) && (
                  <TouchableOpacity 
                    style={[
                      styles.stickyFinalizeBtn,
                      isReadOnly && { 
                        backgroundColor: 'rgba(255,255,255,0.15)', 
                        borderWidth: 1, 
                        borderColor: 'rgba(255,255,255,0.3)',
                        elevation: 0,
                        shadowOpacity: 0
                      }
                    ]} 
                    onPress={handleBackToDashboard}
                    activeOpacity={0.8}
                  >
                    <Ionicons 
                      name={isReadOnly ? 'arrow-back' : 'checkmark-circle'} 
                      size={18} 
                      color="#fff" 
                      style={{ marginRight: 6 }} 
                    />
                    <Text style={styles.stickyFinalizeText}>{isReadOnly ? 'Volver al Menú' : 'Finalizar Apartado'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
        </View>

        {/* Layer 2: Floating Panel (Find My Style) */}
        {activeFolder === null && (
          <View style={styles.bottomPanel}>
            <View style={styles.panelHandle} />
            <View style={styles.panelContent}>
              <Text style={styles.panelTitle}>Tareas de Terreno</Text>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <View style={styles.menuGrid}>
              
              <TouchableOpacity style={styles.menuItem} onPress={() => setActiveFolder('hallazgos')} activeOpacity={0.7}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#FFD60A20' }]}>
                  <Ionicons name="warning" size={21} color="#FFD60A" />
                </View>
                <View style={styles.menuItemText}>
                  <Text style={styles.menuItemTitle}>Hallazgos Previos</Text>
                  <Text style={styles.menuItemSub}>{fotos.length} fotos</Text>
                </View>
              </TouchableOpacity>

              {!isIloq && (
                <TouchableOpacity style={styles.menuItem} onPress={() => setActiveFolder('datos')} activeOpacity={0.7}>
                  <View style={[styles.menuIconContainer, { backgroundColor: '#34C75920' }]}>
                    <Ionicons name="list" size={21} color="#34C759" />
                  </View>
                  <View style={styles.menuItemText}>
                    <Text style={styles.menuItemTitle}>Datos Generales</Text>
                    <Text style={styles.menuItemSub}>Formulario técnico</Text>
                  </View>
                  {calculateDatosProgress() > 0 && (
                    <View style={styles.gridProgressBadge}>
                      <Text style={[styles.gridProgressText, { color: calculateDatosProgress() === 100 ? colors.success : '#34C759' }]}>
                        {calculateDatosProgress()}%
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {isApagadoBafi ? (
                <>
                  <TouchableOpacity 
                    style={[styles.menuItem, isBafiGroupExpanded && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} 
                    onPress={() => {
                      if (!tipoEmpalme) {
                        Alert.alert(
                          "Atención",
                          "Debe completar el campo 'Tipo de Empalme' en Datos Generales antes de ingresar a los apartados de Baseband."
                        );
                        return;
                      }
                      if (Platform.OS === 'ios') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setIsBafiGroupExpanded(prev => !prev);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(142, 142, 147, 0.15)' }]}>
                      <Ionicons name="folder" size={21} color="#8E8E93" />
                    </View>
                    <View style={styles.menuItemText}>
                      <Text style={styles.menuItemTitle}>Apagado Baseband</Text>
                      <Text style={styles.menuItemSub}>Sectores S1-S2-S3</Text>
                    </View>
                    <View style={styles.gridProgressBadge}>
                      <Text style={[styles.gridProgressText, { color: bafiGroupProgress === 100 ? colors.success : '#8E8E93' }]}>
                        {bafiGroupProgress}%
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {isBafiGroupExpanded && (
                    <View style={{ width: '100%', paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: 'rgba(255, 255, 255, 0.1)', marginLeft: 10, marginBottom: 12, gap: 4 }}>
                      <TouchableOpacity style={styles.subMenuItem} onPress={() => setActiveFolder('apagado')} activeOpacity={0.7}>
                        <View style={[styles.subIconContainer, { backgroundColor: '#0A84FF20' }]}>
                          <Ionicons name="power" size={18} color="#0A84FF" />
                        </View>
                        <View style={styles.subMenuItemText}>
                          <Text style={styles.subMenuItemTitle}>Apagado BAFI S1</Text>
                          <Text style={styles.subMenuItemSub}>Desconexión y retiro</Text>
                        </View>
                        <View style={styles.subMenuItemRight}>
                          <Text style={[styles.subProgressText, { color: calculateBafiSector1Progress() === 100 ? colors.success : '#0A84FF' }]}>
                            {calculateBafiSector1Progress()}%
                          </Text>
                          <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.3)" />
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.subMenuItem} onPress={() => setActiveFolder('bafiS2')} activeOpacity={0.7}>
                        <View style={[styles.subIconContainer, { backgroundColor: '#FF453A20' }]}>
                          <Ionicons name="power" size={18} color="#FF453A" />
                        </View>
                        <View style={styles.subMenuItemText}>
                          <Text style={styles.subMenuItemTitle}>Apagado BAFI S2</Text>
                          <Text style={styles.subMenuItemSub}>Desconexión y retiro</Text>
                        </View>
                        <View style={styles.subMenuItemRight}>
                          <Text style={[styles.subProgressText, { color: calculateBafiSector2Progress() === 100 ? colors.success : '#FF453A' }]}>
                            {calculateBafiSector2Progress()}%
                          </Text>
                          <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.3)" />
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.subMenuItem} onPress={() => setActiveFolder('bafiS3')} activeOpacity={0.7}>
                        <View style={[styles.subIconContainer, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
                          <Ionicons name="power" size={18} color="#FFFFFF" />
                        </View>
                        <View style={styles.subMenuItemText}>
                          <Text style={styles.subMenuItemTitle}>Apagado BAFI S3</Text>
                          <Text style={styles.subMenuItemSub}>Desconexión y retiro</Text>
                        </View>
                        <View style={styles.subMenuItemRight}>
                          <Text style={[styles.subProgressText, { color: calculateBafiSector3Progress() === 100 ? colors.success : '#FFFFFF' }]}>
                            {calculateBafiSector3Progress()}%
                          </Text>
                          <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.3)" />
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}

                  <TouchableOpacity 
                    style={[styles.menuItem, isAntenasGroupExpanded && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} 
                    onPress={() => {
                      if (!tipoEmpalme) {
                        Alert.alert(
                          "Atención",
                          "Debe completar el campo 'Tipo de Empalme' en Datos Generales antes de ingresar a los apartados de Antenas."
                        );
                        return;
                      }
                      if (Platform.OS === 'ios') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setIsAntenasGroupExpanded(prev => !prev);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(142, 142, 147, 0.15)' }]}>
                      <Ionicons name="folder" size={21} color="#8E8E93" />
                    </View>
                    <View style={styles.menuItemText}>
                      <Text style={styles.menuItemTitle}>Apagado Antenas</Text>
                      <Text style={styles.menuItemSub}>Sectores S1-S2-S3</Text>
                    </View>
                    <View style={styles.gridProgressBadge}>
                      <Text style={[styles.gridProgressText, { color: antenasGroupProgress === 100 ? colors.success : '#8E8E93' }]}>
                        {antenasGroupProgress}%
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {isAntenasGroupExpanded && (
                    <View style={{ width: '100%', paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: 'rgba(255, 255, 255, 0.1)', marginLeft: 10, marginBottom: 12, gap: 4 }}>
                      <TouchableOpacity style={styles.subMenuItem} onPress={() => setActiveFolder('antenaS1')} activeOpacity={0.7}>
                        <View style={[styles.subIconContainer, { backgroundColor: '#0A84FF20' }]}>
                          <Ionicons name="power" size={18} color="#0A84FF" />
                        </View>
                        <View style={styles.subMenuItemText}>
                          <Text style={styles.subMenuItemTitle}>Apagado Antena S1</Text>
                          <Text style={styles.subMenuItemSub}>Desconexión y retiro</Text>
                        </View>
                        <View style={styles.subMenuItemRight}>
                          <Text style={[styles.subProgressText, { color: calculateAntenaSector1Progress() === 100 ? colors.success : '#0A84FF' }]}>
                            {calculateAntenaSector1Progress()}%
                          </Text>
                          <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.3)" />
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.subMenuItem} onPress={() => setActiveFolder('antenaS2')} activeOpacity={0.7}>
                        <View style={[styles.subIconContainer, { backgroundColor: '#FF453A20' }]}>
                          <Ionicons name="power" size={18} color="#FF453A" />
                        </View>
                        <View style={styles.subMenuItemText}>
                          <Text style={styles.subMenuItemTitle}>Apagado Antena S2</Text>
                          <Text style={styles.subMenuItemSub}>Desconexión y retiro</Text>
                        </View>
                        <View style={styles.subMenuItemRight}>
                          <Text style={[styles.subProgressText, { color: calculateAntenaSector2Progress() === 100 ? colors.success : '#FF453A' }]}>
                            {calculateAntenaSector2Progress()}%
                          </Text>
                          <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.3)" />
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.subMenuItem} onPress={() => setActiveFolder('antenaS3')} activeOpacity={0.7}>
                        <View style={[styles.subIconContainer, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
                          <Ionicons name="power" size={18} color="#FFFFFF" />
                        </View>
                        <View style={styles.subMenuItemText}>
                          <Text style={styles.subMenuItemTitle}>Apagado Antena S3</Text>
                          <Text style={styles.subMenuItemSub}>Desconexión y retiro</Text>
                        </View>
                        <View style={styles.subMenuItemRight}>
                          <Text style={[styles.subProgressText, { color: calculateAntenaSector3Progress() === 100 ? colors.success : '#FFFFFF' }]}>
                            {calculateAntenaSector3Progress()}%
                          </Text>
                          <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.3)" />
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}

                  {!isIloq && (
                    <TouchableOpacity style={styles.menuItem} onPress={() => setActiveFolder('alarmasExternas')} activeOpacity={0.7}>
                      <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}>
                        <Ionicons name="notifications-outline" size={21} color="#FF9500" />
                      </View>
                      <View style={styles.menuItemText}>
                        <Text style={styles.menuItemTitle}>Alarmas Externas</Text>
                        <Text style={styles.menuItemSub}>Gestión alarmas</Text>
                      </View>
                      <View style={styles.gridProgressBadge}>
                        <Text style={[styles.gridProgressText, { color: calculateAlarmasProgress() === 100 ? colors.success : '#FF9500' }]}>
                          {calculateAlarmasProgress()}%
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {!isIloq && (
                    <TouchableOpacity 
                      style={styles.menuItem} 
                      onPress={() => {
                        if (!isEvidenciaSalidaUnlocked()) {
                          Alert.alert(
                            "Acceso restringido",
                            "Debe completar los apartados de Apagado Baseband, Apagado Antenas y Alarmas Externas al 100% antes de ingresar a Evidencia Salida."
                          );
                          return;
                        }
                        setActiveFolder('evidenciaSalida');
                      }} 
                      activeOpacity={0.7}
                    >
                      <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(48, 176, 199, 0.15)' }]}>
                        <Ionicons name="exit-outline" size={21} color="#30B0C7" />
                      </View>
                      <View style={styles.menuItemText}>
                        <Text style={styles.menuItemTitle}>Evidencia Salida</Text>
                        <Text style={styles.menuItemSub}>Fotos de salida</Text>
                      </View>
                      <View style={styles.gridProgressBadge}>
                        <Text style={[styles.gridProgressText, { color: calculateEvidenciaSalidaProgress() === 100 ? colors.success : '#30B0C7' }]}>
                          {calculateEvidenciaSalidaProgress()}%
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.menuItem} onPress={() => setActiveFolder('apagado')} activeOpacity={0.7}>
                    <View style={[styles.menuIconContainer, { backgroundColor: isIloq ? '#FF2D5520' : '#5856D620' }]}>
                      <Ionicons name={isIloq ? "key" : "power"} size={21} color={isIloq ? "#FF2D55" : "#5856D6"} />
                    </View>
                    <View style={styles.menuItemText}>
                      <Text style={styles.menuItemTitle}>{isIloq ? "Cambio de Chapa" : "Apagado 3G / RRU"}</Text>
                      <Text style={styles.menuItemSub}>{isIloq ? "Instalación" : "Validación"}</Text>
                    </View>
                    <View style={styles.gridProgressBadge}>
                      <Text style={[styles.gridProgressText, { color: getSecondProgress() === 100 ? colors.success : (isIloq ? '#FF2D55' : '#5856D6') }]}>
                        {getSecondProgress()}%
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {!isIloq && (
                    <TouchableOpacity style={styles.menuItem} onPress={() => setActiveFolder('alarmasExternas')} activeOpacity={0.7}>
                      <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}>
                        <Ionicons name="notifications-outline" size={21} color="#FF9500" />
                      </View>
                      <View style={styles.menuItemText}>
                        <Text style={styles.menuItemTitle}>Alarmas Externas</Text>
                        <Text style={styles.menuItemSub}>Gestión alarmas</Text>
                      </View>
                      <View style={styles.gridProgressBadge}>
                        <Text style={[styles.gridProgressText, { color: calculateAlarmasProgress() === 100 ? colors.success : '#FF9500' }]}>
                          {calculateAlarmasProgress()}%
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {!isIloq && (
                    <TouchableOpacity 
                      style={styles.menuItem} 
                      onPress={() => {
                        if (!isEvidenciaSalidaUnlocked()) {
                          Alert.alert(
                            "Acceso restringido",
                            "Debe completar los apartados de Apagado 3G/RRU y Alarmas Externas al 100% antes de ingresar a Evidencia Salida."
                          );
                          return;
                        }
                        setActiveFolder('evidenciaSalida');
                      }} 
                      activeOpacity={0.7}
                    >
                      <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(48, 176, 199, 0.15)' }]}>
                        <Ionicons name="exit-outline" size={21} color="#30B0C7" />
                      </View>
                      <View style={styles.menuItemText}>
                        <Text style={styles.menuItemTitle}>Evidencia Salida</Text>
                        <Text style={styles.menuItemSub}>Fotos de salida</Text>
                      </View>
                      <View style={styles.gridProgressBadge}>
                        <Text style={[styles.gridProgressText, { color: calculateEvidenciaSalidaProgress() === 100 ? colors.success : '#30B0C7' }]}>
                          {calculateEvidenciaSalidaProgress()}%
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </>
              )}
              
              </View>
              </ScrollView>

              {planning.status === 'Ejecutado' ? (
                (context?.currentUser?.role === 'Administrador' || context?.currentUser?.role === 'Coordinador') && (
                  <TouchableOpacity style={[styles.finalButtonDashboard, { backgroundColor: colors.warning }]} onPress={handleReopen}>
                    <Text style={styles.finalButtonText}>Reabrir Actividad</Text>
                  </TouchableOpacity>
                )
              ) : (
                overallProgress === 100 && (
                  <TouchableOpacity style={styles.finalButtonDashboard} onPress={handleFinalize}>
                    <Text style={styles.finalButtonText}>Finalizar Actividad</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
      )}
      {/* Modal de Progreso de Subida */}
      <UploadProgressModal
        visible={uploadVisible}
        progress={uploadProgress}
        statusMessage={uploadStatus}
      />
    </View>
  </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  formSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    marginBottom: 12,
  },
  formBackBtn: {
    padding: 8,
    marginLeft: -8,
  },
  formSubTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    padding: 20,
  },
  siteInfoCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  siteName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  siteAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  mapsBtn: {
    backgroundColor: '#4285F4', // Google Maps Blue
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  mainContainer: {
    flex: 1,
  },
  backgroundLayer: {
    flex: 1,
    zIndex: 1,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockMap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapMarker: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    zIndex: 2,
  },
  markerPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '40',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  siteInfoOverlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(28, 28, 30, 0.95)',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  overlayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  overlayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  overlayCloseBtn: {
    padding: 4,
  },
  totalProgressBox: {
    marginTop: 12,
  },
  totalProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  totalProgressLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  totalProgressPercent: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalProgressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  totalProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  siteInfoOverlayCompact: {
    position: 'absolute',
    top: 40,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(28, 28, 30, 0.96)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  overlayTitleCompact: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginRight: 12,
    lineHeight: 20,
  },
  overlayCloseBtnCompact: {
    padding: 2,
  },
  headerMiddleRow: {
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  statusBadgeSmallCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusBadgeTextSmallCompact: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerProgressFullWidth: {
    width: '100%',
    justifyContent: 'center',
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabelCompact: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '500',
  },
  progressPercentCompact: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  totalProgressBarBgCompact: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  totalProgressBarFillCompact: {
    height: '100%',
    borderRadius: 3,
  },
  overlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  overlaySub: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  miniMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 20,
    alignSelf: 'flex-start',
    gap: 8,
  },
  miniMapsBtnText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 15,
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  formScrollContent: {
    padding: 20,
    paddingBottom: 250,
  },
  sectionProgressContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionProgressTitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionProgressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  sectionProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionProgressPercent: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    width: 45,
    textAlign: 'right',
  },
  sectionProgressText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    fontStyle: 'italic',
  },
  subViewTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    letterSpacing: -1,
  },
  formSection: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  bottomPanel: {
    position: 'absolute',
    top: 175,
    bottom: 30,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(28, 28, 30, 0.98)',
    borderRadius: 32,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  panelCollapsed: {
    height: SCREEN_WIDTH > 400 ? 550 : 450,
  },
  panelHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  panelContent: {
    flex: 1,
  },
  panelTitle: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 13,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  menuItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 13,
    padding: 12,
    marginBottom: 10,
    width: '48%',
    height: 125,
    position: 'relative',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  menuItemText: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  menuItemSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
    textAlign: 'center',
  },
  subMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    width: '100%',
  },
  subIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  subMenuItemText: {
    flex: 1,
  },
  subMenuItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  subMenuItemSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 1,
  },
  subMenuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subProgressText: {
    fontSize: 13,
    fontWeight: '700',
  },
  gridProgressBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  gridProgressText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  finalButtonDashboard: {
    backgroundColor: colors.success,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  finalButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  navPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
  },
  backNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backNavText: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '600',
  },
  navPanelTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
    marginTop: 20,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 17,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  photoThumbContainer: {
    position: 'relative',
    width: (SCREEN_WIDTH - 104) / 3,
    height: (SCREEN_WIDTH - 104) / 3,
  },
  photoThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 14,
    zIndex: 10,
    padding: 2,
  },
  addPhotoBox: {
    width: (SCREEN_WIDTH - 104) / 3,
    height: (SCREEN_WIDTH - 104) / 3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoBox2Col: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Processing Overlay
  processingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  processingCard: {
    backgroundColor: '#1C1C1E',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    width: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  processingTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  processingSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  photoField: {
    marginTop: 4,
    marginBottom: 24,
  },
  photoFullContainer: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  photoFull: {
    width: '100%',
    height: '100%',
  },
  addPhotoLarge: {
    width: '100%',
    height: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addPhotoText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 15,
  },
  photoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  photoCol: {
    width: '48%',
    aspectRatio: 1,
  },
  smallLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 6,
    textAlign: 'center',
  },
  ampereDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
    justifyContent: 'center',
  },
  ampereText: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: 'bold',
  },
  ampereDisplayMini: {
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    padding: 6,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  ampereTextSmall: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  statusBadgeSmall: {
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  statusBadgeTextSmall: {
    color: '#0A84FF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Preview modal
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
  },
  previewCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    width: '85%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 24,
  },
  ampereInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 30,
    width: '100%',
  },
  ampereInput: {
    flex: 1,
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
  },
  ampereUnit: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.3)',
    marginLeft: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modalBtnConfirm: {
    backgroundColor: colors.primary,
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  // ViewShot
  offscreen: {
    position: 'absolute',
    top: -4000, // Much further away
    left: -4000,
    width: SCREEN_WIDTH,
    height: (SCREEN_WIDTH * 9) / 16,
    zIndex: -100,
    opacity: 0.01, // Almost invisible
  },
  watermarkContainer: {
    width: SCREEN_WIDTH,
    height: (SCREEN_WIDTH * 9) / 16,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  watermarkImage: {
    width: '100%',
    height: '100%',
  },
  watermarkBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  watermarkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  watermarkTextCol: {
    flex: 1,
    gap: 2,
  },
  watermarkTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 10,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  watermarkCoords: {
    color: '#FFFFFF',
    fontSize: 9,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  watermarkTime: {
    color: '#FFFFFF',
    fontSize: 9,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  watermarkLogo: {
    width: 40,
    height: 40,
    opacity: 0.6,
  },

  trifasicoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    gap: 16,
  },
  trifasicoPhotoCol: {
    width: 90,
    height: 90,
  },
  trifasicoPhotoWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  trifasicoAddBox: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trifasicoInfoCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  trifasicoLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  ampereDisplayTrifasico: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
    alignSelf: 'flex-start',
  },
  ampereTextTrifasico: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningCard: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#FF9500',
    borderRadius: 8,
    padding: 16,
    marginVertical: 12,
    alignItems: 'center',
  },
  warningCardText: {
    color: '#FF9500',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  warningConfirmBtn: {
    backgroundColor: '#FF9500',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  warningConfirmBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  successBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderWidth: 1,
    borderColor: '#34C759',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  successBadgeText: {
    color: '#34C759',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  stickyBottomContainer: {
    backgroundColor: '#1C1C1E',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  stickyFinalizeBtn: {
    backgroundColor: colors.success,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 12,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  stickyFinalizeText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
});
