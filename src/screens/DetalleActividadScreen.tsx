import React, { useState, useContext, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Linking, Alert, Image, Dimensions, Modal, StatusBar, LayoutAnimation, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { colors } from '../theme/colors';
import { AppContext } from '../context/AppContext';
import { SelectDropdown } from '../components/SelectDropdown';
import { getElapsedTime } from '../services/timeUtils';
const LOGO_F1 = require('../assets/logo_f1plus.png');

const SCREEN_WIDTH = Dimensions.get('window').width;

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
  const isReadOnly = planning?.status === 'Ejecutado' || isPreview;

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

  // Refs estables para guardar sin crear dependencias reactivas
  const planningIdRef = useRef(planning?.id);
  const observacionesRef = useRef(observaciones);
  const fotosRef = useRef(fotos);

  useEffect(() => {
    // Si viene del Calendario como vista previa (isPreview), no verificamos fechas ni la iniciamos.
    if (!isPreview && planning && planning.status !== 'En ejecución' && planning.status !== 'Ejecutado') {
      const now = new Date();
      const todayString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
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
    }
  }, [planningId, isPreview]);

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
  
  fotoEstructuraRef.current = fotoEstructura;
  fotoFueraContenedorRef.current = fotoFueraContenedor;
  fotosGeneralesSitioRef.current = fotosGeneralesSitio;
  fotosInteriorContenedorRef.current = fotosInteriorContenedor;
  
  estado3GRef.current = estado3G;
  seApagara3GRef.current = seApagara3G;
  estadoRRURef.current = estadoRRU;
  seApagaraRRURef.current = seApagaraRRU;

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
  
  // Estado temporal para procesar la imagen pendiente
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [pendingTimestamp, setPendingTimestamp] = useState<string>('');
  const [pendingCoords, setPendingCoords] = useState<{lat: number, lng: number} | null>(null);
  // Para saber a qué campo asignar la foto que se está procesando (usamos Ref para evitar problemas de cierres en async)
  const photoTargetRef = useRef<'hallazgos' | 'fotosEmpalme' | 'fotoMedidor' | 'fotoSectorMedidor' | 'fotoEstructura' | 'fotoFueraContenedor' | 'fotosGeneralesSitio' | 'fotosInteriorContenedor' | 'fotoEquipo3GEncendido' | 'fotoBreaker3GEncendido' | 'fotoBreaker3GApagado' | 'fotoEquipo3GApagado' | 'fotoEspacioRetirado' | 'fotoRRUEncendido' | 'fotoRRUApagado'>('hallazgos');
  const pendingIndexRef = useRef<number | null>(null);

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
          },
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
            ampere3GEncendido: ampere3GEncendidoRef.current,
          },
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
        }
      });
    }
  };

  const saveApagado = () => {
    if (planningIdRef.current) {
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

  const handlePickImage = (target: string, index: number | null = null) => {
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

      // Obtener ubicación real del dispositivo
      let coords = { lat: site.lat, lng: site.lng }; // Fallback a coords del sitio
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          coords = { lat: location.coords.latitude, lng: location.coords.longitude };
        }
      } catch (e) {
        console.warn("No se pudo obtener la ubicación actual, usando coordenadas del sitio.");
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
          }
        } finally {
          setPendingUri(null);
          setIsProcessing(false);
          pendingIndexRef.current = null;
        }
      }, 1000);
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
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6 });
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
          } 
        }
      ]
    );
  };

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

  const handleGuardarRegistro = () => {
    if (planning) {
      context?.updatePlanning(planning.id, { hallazgos: { observaciones, fotos } });
      Alert.alert('Éxito', 'Registro guardado correctamente', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    }
  };

  const handleFinalize = () => {
    if (planning && site) {
      const datosProgress = calculateDatosProgress();
      const apagadoProgress = calculateApagadoProgress();

      if (datosProgress < 100 || apagadoProgress < 100) {
        Alert.alert(
          'Tareas pendientes',
          `Para finalizar la actividad debes completar el 100% de las tareas obligatorias.\n\nDatos Generales: ${datosProgress}%\nApagado 3G/RRU: ${apagadoProgress}%`,
          [{ text: 'Entendido' }]
        );
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
              isFinalizingRef.current = true;
              const now = new Date().toISOString();
              context?.updatePlanning(planning.id, {
                status: 'Ejecutado',
                endTime: now,
                hallazgos: {
                  observaciones: observaciones,
                  fotos: fotos,
                },
                datosGenerales: {
                  tipoEstructura,
                  tipoContenedor,
                  tipoEmpalme,
                  fotosEmpalme,
                  capacidadProteccion,
                  fotoMedidor,
                  fotoSectorMedidor,
                  numeroMedidor,
                  lecturaConsumo,
                  fotoEstructura,
                  fotoFueraContenedor,
                  fotosGeneralesSitio,
                  fotosInteriorContenedor,
                  ampereEmpalme,
                },
                apagado3G: {
                  estado3G,
                  seApagara3G,
                  estadoRRU,
                  seApagaraRRU,
                  fotoEquipo3GEncendido,
                  fotoBreaker3GEncendido,
                  fotoBreaker3GApagado,
                  fotoEquipo3GApagado,
                  fotoEspacioRetirado,
                  seRetirara3G,
                  fotoRRUEncendido,
                  fotoRRUApagado,
                  ampere3GEncendido,
                }
              });
              context?.updateSite(site.id, {
                estadoExcel: 'Ejecutado'
              });
              navigation.goBack();
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
              endTime: undefined
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
    const totalFields = tipoEmpalme === 'Trifásico' ? 17 : 15;
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
    if (tipoEmpalme === 'Monofásico') { if (fotosEmpalme[0]) completedFields++; }
    else if (tipoEmpalme === 'Trifásico') {
      if (fotosEmpalme[0]) completedFields++;
      if (fotosEmpalme[1]) completedFields++;
      if (fotosEmpalme[2]) completedFields++;
    }
    return Math.round((completedFields / totalFields) * 100);
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

  if (!planning || !site) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Text style={styles.subtitle}>Información no encontrada.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.modalBtnConfirm}>
          <Text style={styles.modalBtnText}>Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

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
                  if (activeAmpereTarget === 'fotoEquipo3GEncendido') {
                    setAmpere3GEncendido(tempAmpere || '00,00');
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
              <View style={styles.siteInfoOverlay}>
                <View style={styles.overlayHeaderRow}>
                  <Text style={styles.overlayTitle}>{site.code} - {site.name}</Text>
                  <TouchableOpacity onPress={() => navigation.goBack()} style={styles.overlayCloseBtn}>
                    <Ionicons name="close-circle" size={24} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                </View>
                <View style={[
                  styles.statusBadgeSmall,
                  planning.status === 'Ejecutado' && { backgroundColor: 'rgba(48, 209, 88, 0.15)' }
                ]}>
                  <Text style={[
                    styles.statusBadgeTextSmall,
                    planning.status === 'Ejecutado' && { color: '#30D158' }
                  ]}>
                    {planning.status === 'Ejecutado' ? 'Ejecutado' : `En ejecución • ${elapsedTime || getElapsedTime(planning.startTime)}`}
                  </Text>
                </View>
                
                <View style={styles.totalProgressBox}>
                  <View style={styles.totalProgressHeader}>
                    <Text style={styles.totalProgressLabel}>Avance Total</Text>
                    <Text style={styles.totalProgressPercent}>
                      {Math.round((calculateDatosProgress() + calculateApagadoProgress()) / 2)}%
                    </Text>
                  </View>
                  <View style={styles.totalProgressBarBg}>
                    <View style={[
                      styles.totalProgressBarFill, 
                      { 
                        width: `${(calculateDatosProgress() + calculateApagadoProgress()) / 2}%`,
                        backgroundColor: getProgressColor((calculateDatosProgress() + calculateApagadoProgress()) / 2)
                      }
                    ]} />
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <ScrollView 
              style={styles.formContainer} 
              contentContainerStyle={styles.formScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formSubHeader}>
                <TouchableOpacity style={styles.formBackBtn} onPress={() => setActiveFolder(null)}>
                  <Ionicons name="chevron-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.formSubTitle}>
                  {activeFolder === 'hallazgos' ? 'Hallazgos Previos' : activeFolder === 'datos' ? 'Datos Generales' : 'Apagado 3G / RRU'}
                </Text>
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
                    <Text style={styles.label}>Evidencia Fotográfica ({fotos.length}/10)</Text>
                    <View style={styles.photoGrid}>
                      {fotos.map((uri, idx) => (
                        <TouchableOpacity key={idx} style={styles.photoThumbContainer} onPress={() => setPreviewUri(uri)}>
                          <Image source={{ uri }} style={styles.photoThumb} />
                          {!isReadOnly && (
                            <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removeFoto(idx)}>
                              {!isReadOnly && <Ionicons name="close-circle" size={24} color={colors.danger} />}
                            </TouchableOpacity>
                          )}
                        </TouchableOpacity>
                      ))}
                      {!isReadOnly && fotos.length < 10 && (
                        <TouchableOpacity style={styles.addPhotoBox} onPress={() => handlePickImage('hallazgos')}>
                          <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {activeFolder === 'datos' && (
                <View>
                  <View style={styles.sectionProgressContainer}>
                    <View style={styles.progressRow}>
                      <View style={styles.sectionProgressBarBg}>
                        <View style={[styles.sectionProgressBarFill, { width: `${calculateDatosProgress()}%`, backgroundColor: getProgressColor(calculateDatosProgress()) }]} />
                      </View>
                      <Text style={styles.sectionProgressPercent}>{calculateDatosProgress()}%</Text>
                    </View>
                  </View>
                  <View style={styles.formSection}>
                    <SelectDropdown label="Tipo de Estructura" value={tipoEstructura} options={tipoEstructuraOptions} onSelect={setTipoEstructura} disabled={isReadOnly} />
                    {tipoEstructura !== '' && (
                      <View style={styles.photoField}>
                        <Text style={styles.label}>Foto Tipo de Estructura</Text>
                        {fotoEstructura ? (
                          <View style={styles.photoFullContainer}>
                            <TouchableOpacity onPress={() => setPreviewUri(fotoEstructura)}>
                              <Image source={{ uri: fotoEstructura }} style={styles.photoFull} resizeMode="cover" disabled={isReadOnly} />
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
                                <Image source={{ uri: fotoFueraContenedor }} style={styles.photoFull} resizeMode="cover" disabled={isReadOnly} />
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoFueraContenedor')}>
                                {!isReadOnly && <Ionicons name="close-circle" size={24} color={colors.danger} />}
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoFueraContenedor')}>
                              <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" disabled={isReadOnly} />
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
                                    <View style={styles.photoThumbContainer}>
                                      <TouchableOpacity onPress={() => setPreviewUri(fotosGeneralesSitio[i])}>
                                        <Image source={{ uri: fotosGeneralesSitio[i] }} style={styles.photoThumb} disabled={isReadOnly} />
                                      </TouchableOpacity>
                                      <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotosGeneralesSitio', i)}>
                                        {!isReadOnly && <Ionicons name="close-circle" size={24} color={colors.danger} />}
                                      </TouchableOpacity>
                                    </View>
                                  ) : (
                                    <TouchableOpacity style={styles.addPhotoBox} onPress={() => handlePickImage('fotosGeneralesSitio', i)}>
                                      <Ionicons name="camera" size={24} color="rgba(255,255,255,0.3)" disabled={isReadOnly} />
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
                                    <View style={styles.photoThumbContainer}>
                                      <TouchableOpacity onPress={() => setPreviewUri(fotosInteriorContenedor[i])}>
                                        <Image source={{ uri: fotosInteriorContenedor[i] }} style={styles.photoThumb} disabled={isReadOnly} />
                                      </TouchableOpacity>
                                      <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotosInteriorContenedor', i)}>
                                        {!isReadOnly && <Ionicons name="close-circle" size={24} color={colors.danger} />}
                                      </TouchableOpacity>
                                    </View>
                                  ) : (
                                    <TouchableOpacity style={styles.addPhotoBox} onPress={() => handlePickImage('fotosInteriorContenedor', i)}>
                                      <Ionicons name="camera" size={24} color="rgba(255,255,255,0.3)" disabled={isReadOnly} />
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
                      <SelectDropdown label="Tipo de Empalme" value={tipoEmpalme} options={tipoEmpalmeOptions} onSelect={(val) => {
                        setTipoEmpalme(val);
                        if (val === 'Monofásico') setFotosEmpalme(['']);
                        else if (val === 'Trifásico') setFotosEmpalme(['', '', '']);
                      }} disabled={isReadOnly} />
                    )}
                    {tipoEmpalme === 'Monofásico' && (
                      <View style={styles.photoField}>
                        <Text style={styles.label}>Foto Consumo Inicial</Text>
                        {fotosEmpalme[0] ? (
                          <View>
                            <View style={styles.photoThumbContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotosEmpalme[0])}>
                                <Image source={{ uri: fotosEmpalme[0] }} style={styles.photoFull} disabled={isReadOnly} />
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
                              <Ionicons name="create-outline" size={16} color={colors.primary} disabled={isReadOnly} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotosEmpalme', 0)}>
                            <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" disabled={isReadOnly} />
                            <Text style={styles.addPhotoText}>Subir Foto</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                    {tipoEmpalme === 'Trifásico' && (
                      <View style={{ marginTop: 10 }}>
                        <Text style={styles.label}>Fotos Consumo Inicial Trifásico</Text>
                        {['Fase R', 'Fase S', 'Fase T'].map((label, i) => (
                          <View key={i} style={styles.trifasicoRow}>
                            <View style={styles.trifasicoPhotoCol}>
                              {fotosEmpalme[i] ? (
                                <View style={styles.trifasicoPhotoWrapper}>
                                  <TouchableOpacity onPress={() => setPreviewUri(fotosEmpalme[i])}>
                                    <Image source={{ uri: fotosEmpalme[i] }} style={styles.photoThumb} disabled={isReadOnly} />
                                  </TouchableOpacity>
                                  <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotosEmpalme', i)}>
                                    {!isReadOnly && <Ionicons name="close-circle" size={24} color={colors.danger} />}
                                  </TouchableOpacity>
                                </View>
                              ) : (
                                <TouchableOpacity style={styles.trifasicoAddBox} onPress={() => handlePickImage('fotosEmpalme', i)}>
                                  <Ionicons name="camera" size={24} color="rgba(255,255,255,0.3)" disabled={isReadOnly} />
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
                                  <Ionicons name="create-outline" size={16} color={colors.primary} disabled={isReadOnly} />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                    {((tipoEmpalme === 'Monofásico' && fotosEmpalme[0]) || (tipoEmpalme === 'Trifásico' && fotosEmpalme[0] && fotosEmpalme[1] && fotosEmpalme[2])) && (
                      <View><Text style={styles.label}>Capacidad de Protección General</Text><TextInput style={styles.input} placeholder="Ej: 40" value={capacidadProteccion} onChangeText={setCapacidadProteccion} keyboardType="numeric" editable={!isReadOnly} /></View>
                    )}
                    {capacidadProteccion !== '' && (
                      <View style={styles.photoField}>
                        <Text style={styles.label}>Foto Medidor Eléctrico</Text>
                        {fotoMedidor ? (
                          <View style={styles.photoFullContainer}>
                            <TouchableOpacity onPress={() => setPreviewUri(fotoMedidor)}>
                              <Image source={{ uri: fotoMedidor }} style={styles.photoFull} resizeMode="cover" disabled={isReadOnly} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoMedidor')}>
                              {!isReadOnly && <Ionicons name="close-circle" size={24} color={colors.danger} />}
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoMedidor')}>
                            <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" disabled={isReadOnly} />
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
                              <Image source={{ uri: fotoSectorMedidor }} style={styles.photoFull} resizeMode="cover" disabled={isReadOnly} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoSectorMedidor')}>
                              {!isReadOnly && <Ionicons name="close-circle" size={24} color={colors.danger} />}
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoSectorMedidor')}>
                            <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" disabled={isReadOnly} />
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
                <View>
                  <View style={styles.sectionProgressContainer}>
                    <View style={styles.progressRow}>
                      <View style={styles.sectionProgressBarBg}>
                        <View style={[styles.sectionProgressBarFill, { width: `${calculateApagadoProgress()}%`, backgroundColor: getProgressColor(calculateApagadoProgress()) }]} disabled={isReadOnly} />
                      </View>
                      <Text style={styles.sectionProgressPercent}>{calculateApagadoProgress()}%</Text>
                    </View>
                  </View>
                  <View style={styles.formSection}>
                    <SelectDropdown label="Estado Inicial 3G1900" value={estado3G} options={estadoEquipoOptions} onSelect={handleEstado3GChange} disabled={isReadOnly} />
                    {estado3G === 'Encendido' && (
                      <View>
                        <View style={styles.photoField}>
                          <Text style={styles.label}>Foto Equipo 3G Encendido</Text>
                          {fotoEquipo3GEncendido ? (
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoEquipo3GEncendido)}>
                                <Image source={{ uri: fotoEquipo3GEncendido }} style={styles.photoFull} resizeMode="cover" disabled={isReadOnly} />
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
                              <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" disabled={isReadOnly} />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <View style={styles.photoField}>
                          <Text style={styles.label}>Foto Breaker 3G Encendido</Text>
                          {fotoBreaker3GEncendido ? (
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoBreaker3GEncendido)}>
                                <Image source={{ uri: fotoBreaker3GEncendido }} style={styles.photoFull} resizeMode="cover" disabled={isReadOnly} />
                              </TouchableOpacity>
                                {!isReadOnly && (
                                  <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBreaker3GEncendido')}>
                                    <Ionicons name="close-circle" size={24} color={colors.danger} />
                                  </TouchableOpacity>
                                )}
                            </View>
                          ) : (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBreaker3GEncendido')}>
                              <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" disabled={isReadOnly} />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                    {((estado3G === 'Encendido' && seApagara3G === 'Si') || (estado3G === 'Apagado' && seRetirara3G === 'Si')) && (
                      <View>
                        <View style={styles.photoField}>
                          <Text style={styles.label}>Foto Breaker 3G Apagado</Text>
                          {fotoBreaker3GApagado ? (
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoBreaker3GApagado)}>
                                <Image source={{ uri: fotoBreaker3GApagado }} style={styles.photoFull} resizeMode="cover" disabled={isReadOnly} />
                              </TouchableOpacity>
                                {!isReadOnly && (
                                  <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBreaker3GApagado')}>
                                    <Ionicons name="close-circle" size={24} color={colors.danger} />
                                  </TouchableOpacity>
                                )}
                            </View>
                          ) : (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBreaker3GApagado')}>
                              <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" disabled={isReadOnly} />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <View style={styles.photoField}>
                          <Text style={styles.label}>Foto Equipo 3G Apagado</Text>
                          {fotoEquipo3GApagado ? (
                            <View style={styles.photoFullContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoEquipo3GApagado)}>
                                <Image source={{ uri: fotoEquipo3GApagado }} style={styles.photoFull} resizeMode="cover" disabled={isReadOnly} />
                              </TouchableOpacity>
                                {!isReadOnly && (
                                  <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoEquipo3GApagado')}>
                                    <Ionicons name="close-circle" size={24} color={colors.danger} />
                                  </TouchableOpacity>
                                )}
                            </View>
                          ) : (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoEquipo3GApagado')}>
                              <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" disabled={isReadOnly} />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                    {((estado3G === 'Encendido' && seApagara3G === 'Si') || (estado3G === 'Apagado' && seRetirara3G === 'Si') || (estado3G === 'N/A')) && (
                      <View style={styles.photoField}>
                        <Text style={styles.label}>Foto Espacio Retirado</Text>
                        {fotoEspacioRetirado ? (
                          <View style={styles.photoFullContainer}>
                            <TouchableOpacity onPress={() => setPreviewUri(fotoEspacioRetirado)}>
                              <Image source={{ uri: fotoEspacioRetirado }} style={styles.photoFull} resizeMode="cover" disabled={isReadOnly} />
                            </TouchableOpacity>
                                {!isReadOnly && (
                                  <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoEspacioRetirado')}>
                                    <Ionicons name="close-circle" size={24} color={colors.danger} />
                                  </TouchableOpacity>
                                )}
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoEspacioRetirado')}>
                            <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" disabled={isReadOnly} />
                            <Text style={styles.addPhotoText}>Subir Foto</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                    {(() => {
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
                    })() && (
                      <View style={{ marginTop: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 16 }}>
                        <SelectDropdown label="Estado Inicial RRU" value={estadoRRU} options={estadoEquipoOptions} onSelect={handleEstadoRRUChange} disabled={isReadOnly} />
                        {estadoRRU === 'Encendido' && (
                          <View style={styles.photoField}><Text style={styles.label}>Foto Breakers RRU Encendidos</Text>{fotoRRUEncendido ? (<View style={styles.photoFullContainer}><TouchableOpacity onPress={() => setPreviewUri(fotoRRUEncendido)}><Image source={{ uri: fotoRRUEncendido }} style={styles.photoFull} resizeMode="cover" /></TouchableOpacity>{!isReadOnly && (<TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoRRUEncendido')}><Ionicons name="close-circle" size={24} color={colors.danger} /></TouchableOpacity>)}</View>) : !isReadOnly ? (<TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoRRUEncendido')}><Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" /><Text style={styles.addPhotoText}>Subir Foto</Text></TouchableOpacity>) : null}</View>
                        )}
                        {((estadoRRU === 'Encendido' && seApagaraRRU === 'Si') || (estadoRRU === 'Apagado')) && (
                          <View style={styles.photoField}><Text style={styles.label}>Foto Breakers RRU Apagados</Text>{fotoRRUApagado ? (<View style={styles.photoFullContainer}><TouchableOpacity onPress={() => setPreviewUri(fotoRRUApagado)}><Image source={{ uri: fotoRRUApagado }} style={styles.photoFull} resizeMode="cover" /></TouchableOpacity>{!isReadOnly && (<TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoRRUApagado')}><Ionicons name="close-circle" size={24} color={colors.danger} /></TouchableOpacity>)}</View>) : !isReadOnly ? (<TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoRRUApagado')}><Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" /><Text style={styles.addPhotoText}>Subir Foto</Text></TouchableOpacity>) : null}</View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          )}
        </View>

        {/* Layer 2: Floating Panel (Find My Style) */}
        {activeFolder === null && (
          <View style={styles.bottomPanel}>
            <View style={styles.panelHandle} />
          
            <View style={styles.panelContent}>
              <Text style={styles.panelTitle}>Tareas de Terreno</Text>
              
              <TouchableOpacity style={styles.menuItem} onPress={() => setActiveFolder('hallazgos')} activeOpacity={0.7}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#FF3B3020' }]}>
                  <Ionicons name="warning" size={24} color="#FF3B30" />
                </View>
                <View style={styles.menuItemText}>
                  <Text style={styles.menuItemTitle}>Hallazgos Previos</Text>
                  <Text style={styles.menuItemSub}>{fotos.length} fotos capturadas</Text>
                </View>
                <View style={styles.menuItemRight}>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.3)" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => setActiveFolder('datos')} activeOpacity={0.7}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#007AFF20' }]}>
                  <Ionicons name="list" size={24} color="#007AFF" />
                </View>
                <View style={styles.menuItemText}>
                  <Text style={styles.menuItemTitle}>Datos Generales</Text>
                  <Text style={styles.menuItemSub}>Formulario técnico</Text>
                </View>
                <View style={styles.menuItemRight}>
                  <Text style={[styles.menuProgressText, { color: calculateDatosProgress() === 100 ? colors.success : '#007AFF' }]}>
                    {calculateDatosProgress()}%
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.3)" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => setActiveFolder('apagado')} activeOpacity={0.7}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#5856D620' }]}>
                  <Ionicons name="power" size={24} color="#5856D6" />
                </View>
                <View style={styles.menuItemText}>
                  <Text style={styles.menuItemTitle}>Apagado 3G / RRU</Text>
                  <Text style={styles.menuItemSub}>Validación de equipos</Text>
                </View>
                <View style={styles.menuItemRight}>
                  <Text style={[styles.menuProgressText, { color: calculateApagadoProgress() === 100 ? colors.success : '#5856D6' }]}>
                    {calculateApagadoProgress()}%
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.3)" />
                </View>
              </TouchableOpacity>

              {planning.status === 'Ejecutado' ? (
                (context?.currentUser?.role === 'Administrador' || context?.currentUser?.role === 'Coordinador') && (
                  <TouchableOpacity style={[styles.finalButtonDashboard, { backgroundColor: colors.warning }]} onPress={handleReopen}>
                    <Text style={styles.finalButtonText}>Reabrir Actividad</Text>
                  </TouchableOpacity>
                )
              ) : (
                calculateDatosProgress() === 100 && calculateApagadoProgress() === 100 && (
                  <TouchableOpacity style={styles.finalButtonDashboard} onPress={handleFinalize}>
                    <Text style={styles.finalButtonText}>Finalizar Actividad</Text>
                  </TouchableOpacity>
                )
              )}
          </View>
        </View>
      )}
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
    top: 200,
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
    marginBottom: 20,
  },
  panelContent: {
    flex: 1,
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  menuItemSub: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuProgressText: {
    fontSize: 15,
    fontWeight: '700',
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
    width: (SCREEN_WIDTH - 80) / 3,
    aspectRatio: 1,
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
    width: (SCREEN_WIDTH - 80) / 3,
    aspectRatio: 1,
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
    backgroundColor: 'rgba(0,0,0,0.4)',
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
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
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
});
