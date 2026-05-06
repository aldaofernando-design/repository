import React, { useState, useContext, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ScrollView, Linking, Alert, Image, Dimensions, Modal, StatusBar, LayoutAnimation, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { colors } from '../theme/colors';
import { AppContext } from '../context/AppContext';
import { SelectDropdown } from '../components/SelectDropdown';
const LOGO_F1 = require('../assets/logo_f1plus.png');

const SCREEN_WIDTH = Dimensions.get('window').width;

export const DetalleActividadScreen = ({ route, navigation }: any) => {
  const { planningId } = route.params || {};
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

  // Refs estables para guardar sin crear dependencias reactivas
  const planningIdRef = useRef(planning?.id);
  const observacionesRef = useRef(observaciones);
  const fotosRef = useRef(fotos);
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
  
  fotoEquipo3GEncendidoRef.current = fotoEquipo3GEncendido;
  fotoBreaker3GEncendidoRef.current = fotoBreaker3GEncendido;
  fotoBreaker3GApagadoRef.current = fotoBreaker3GApagado;
  fotoEquipo3GApagadoRef.current = fotoEquipo3GApagado;
  fotoEspacioRetiradoRef.current = fotoEspacioRetirado;
  seRetirara3GRef.current = seRetirara3G;
  fotoRRUEncendidoRef.current = fotoRRUEncendido;
  fotoRRUApagadoRef.current = fotoRRUApagado;
  
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
      if (planningIdRef.current) {
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
          }
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

  const handlePickImage = (target: 'hallazgos' | 'fotosEmpalme' | 'fotoMedidor' | 'fotoSectorMedidor', index: number | null = null) => {
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
      }, 600);
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

  if (!planning || !site) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.subtitle}>Información no encontrada.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isIniciado = planning.status === 'En ejecución' || planning.status === 'Ejecutado';

  return (
    <SafeAreaView style={styles.container}>

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

      {/* Modal de procesamiento (Ubicación y Marca de Agua) */}
      <Modal visible={isProcessing} transparent animationType="none">
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.processingTitle}>Procesando fotografía</Text>
            <Text style={styles.processingSubtitle}>Obteniendo ubicación y aplicando marca de agua...</Text>
          </View>
        </View>
      </Modal>
      
      {/* ViewShot oculto fuera de pantalla — genera la imagen con marca de agua */}
      {pendingUri && (
        <View style={styles.offscreen}>
          <ViewShot ref={viewShotRef} style={styles.watermarkContainer}>
            <Image source={{ uri: pendingUri }} style={styles.watermarkImage} resizeMode="cover" />
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
          </ViewShot>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Detalle de Actividad</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.siteInfoCard}>
          <Text style={styles.siteName}>{site.name} ({site.code})</Text>
          <Text style={styles.siteAddress}>{site.address}, {site.commune}</Text>
          {!isIniciado && (
            <TouchableOpacity style={styles.mapsBtn} onPress={openGoogleMaps}>
              <Ionicons name="navigate" size={20} color={colors.surface} />
              <Text style={styles.mapsBtnText}>Cómo llegar en Maps</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isIniciado ? (
          <TouchableOpacity style={styles.iniciarBtn} onPress={handleIniciarActividad}>
            <Ionicons name="play" size={24} color={colors.surface} />
            <Text style={styles.iniciarBtnText}>Iniciar Actividad</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.enEjecucionContainer}>
            <View style={styles.statusBadge}>
              <Ionicons name="time" size={16} color={colors.surface} />
              <Text style={styles.statusBadgeText}>
                Iniciado: {planning.startTime ? new Date(planning.startTime).toLocaleString('es-CL') : 'N/A'}
              </Text>
            </View>

            <View style={styles.folderSection}>
              {/* Header clicable Hallazgos Previos */}
              {(() => {
                const hasInfo = observaciones.trim().length > 0 || fotos.length > 0;
                const folderColor = hasInfo ? colors.success : colors.error;
                return (
                  <TouchableOpacity style={styles.folderHeader} onPress={toggleFolder} activeOpacity={0.7}>
                    <View style={styles.folderHeaderLeft}>
                      <Ionicons name={isFolderOpen ? 'folder-open' : 'folder'} size={24} color={folderColor} />
                      <Text style={[styles.folderTitle, { color: folderColor }]}>Hallazgos Previos</Text>
                      {fotos.length > 0 && (
                        <View style={styles.fotoBadge}>
                          <Text style={styles.fotoBadgeText}>{fotos.length}</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons
                      name={isFolderOpen ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                );
              })()}
              {/* Contenido expandible */}
              {isFolderOpen && (
                <View style={styles.folderBody}>
                  <Text style={styles.label}>Observaciones Encontradas</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe anomalías, riesgos o comentarios del sitio..."
                    value={observaciones}
                    onChangeText={setObservaciones}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />

                  <Text style={styles.label}>Evidencia Fotográfica ({fotos.length}/10)</Text>
                  
                  <View style={styles.photoGrid}>
                    {fotos.map((uri, idx) => (
                      <TouchableOpacity key={idx} style={styles.photoThumbContainer} onPress={() => setPreviewUri(uri)} activeOpacity={0.8}>
                        <Image source={{ uri }} style={styles.photoThumb} />
                        <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removeFoto(idx)}>
                          <Ionicons name="close-circle" size={24} color={colors.error} />
                        </TouchableOpacity>
                        <View style={styles.zoomHint}>
                          <Ionicons name="expand" size={12} color="#fff" />
                        </View>
                      </TouchableOpacity>
                    ))}
                    {fotos.length < 10 && !pendingUri && (
                      <TouchableOpacity style={styles.addPhotoBox} onPress={() => handlePickImage('hallazgos')}>
                        <Ionicons name="camera" size={32} color={colors.textSecondary} />
                        <Text style={styles.addPhotoText}>Añadir</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>

            <View style={[styles.folderSection, { marginTop: 16 }]}>
              {/* Header clicable Datos Generales */}
              {(() => {
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
                
                if (tipoEmpalme === 'Monofásico') {
                  if (fotosEmpalme[0]) completedFields++;
                } else if (tipoEmpalme === 'Trifásico') {
                  if (fotosEmpalme[0]) completedFields++;
                  if (fotosEmpalme[1]) completedFields++;
                  if (fotosEmpalme[2]) completedFields++;
                }

                const progress = Math.round((completedFields / totalFields) * 100);
                
                let dgColor = colors.error; // 0% Red
                if (progress === 100) dgColor = colors.success; // 100% Green
                else if (progress > 0) dgColor = '#FFA500'; // In progress Orange
                
                return (
                  <TouchableOpacity style={styles.folderHeader} onPress={toggleDG} activeOpacity={0.7}>
                    <View style={styles.folderHeaderLeft}>
                      <Ionicons name={isDGOpen ? 'folder-open' : 'folder'} size={24} color={dgColor} />
                      <Text style={[styles.folderTitle, { color: dgColor }]}>
                        Datos Generales ({progress}%)
                      </Text>
                    </View>
                    <Ionicons
                      name={isDGOpen ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                );
              })()}
              {/* Contenido expandible Datos Generales */}
              {isDGOpen && (
                <View style={styles.folderBody}>
                  <SelectDropdown 
                    label="Tipo de Estructura" 
                    value={tipoEstructura} 
                    options={tipoEstructuraOptions} 
                    onSelect={setTipoEstructura} 
                  />

                  {tipoEstructura !== '' && (
                    <View style={styles.photoField}>
                      <Text style={styles.label}>Foto Tipo de Estructura</Text>
                      {fotoEstructura ? (
                        <View style={styles.photoThumbContainer}>
                          <TouchableOpacity onPress={() => setPreviewUri(fotoEstructura)}>
                            <Image source={{ uri: fotoEstructura }} style={styles.photoFull} />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoEstructura')}>
                            <Ionicons name="close-circle" size={24} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoEstructura')}>
                          <Ionicons name="camera" size={32} color={colors.textSecondary} />
                          <Text style={styles.addPhotoText}>Subir Foto</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <SelectDropdown 
                    label="Tipo de Contenedor" 
                    value={tipoContenedor} 
                    options={tipoContenedorOptions} 
                    onSelect={setTipoContenedor} 
                  />

                  {tipoContenedor !== '' && (
                    <View>
                      <View style={styles.photoField}>
                        <Text style={styles.label}>Foto Vista Fuera del Contenedor</Text>
                        {fotoFueraContenedor ? (
                          <View style={styles.photoThumbContainer}>
                            <TouchableOpacity onPress={() => setPreviewUri(fotoFueraContenedor)}>
                              <Image source={{ uri: fotoFueraContenedor }} style={styles.photoFull} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoFueraContenedor')}>
                              <Ionicons name="close-circle" size={24} color={colors.error} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoFueraContenedor')}>
                            <Ionicons name="camera" size={32} color={colors.textSecondary} />
                            <Text style={styles.addPhotoText}>Subir Foto</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <Text style={styles.label}>Vistas Generales del Sitio</Text>
                      <View style={styles.photoRow}>
                        {[0, 1].map((i) => (
                          <View key={`gs-${i}`} style={[styles.photoCol, { width: '48%' }]}>
                            {fotosGeneralesSitio[i] ? (
                              <View style={styles.photoThumbContainer}>
                                <TouchableOpacity onPress={() => setPreviewUri(fotosGeneralesSitio[i])}>
                                  <Image source={{ uri: fotosGeneralesSitio[i] }} style={styles.photoThumb} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotosGeneralesSitio', i)}>
                                  <Ionicons name="close-circle" size={24} color={colors.error} />
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <TouchableOpacity style={styles.addPhotoBox} onPress={() => handlePickImage('fotosGeneralesSitio', i)}>
                                <Ionicons name="camera" size={24} color={colors.textSecondary} />
                                <Text style={styles.addPhotoText}>Añadir</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                      </View>

                      <Text style={styles.label}>Vistas Interior del Contenedor</Text>
                      <View style={styles.photoRow}>
                        {[0, 1].map((i) => (
                          <View key={`ic-${i}`} style={[styles.photoCol, { width: '48%' }]}>
                            {fotosInteriorContenedor[i] ? (
                              <View style={styles.photoThumbContainer}>
                                <TouchableOpacity onPress={() => setPreviewUri(fotosInteriorContenedor[i])}>
                                  <Image source={{ uri: fotosInteriorContenedor[i] }} style={styles.photoThumb} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotosInteriorContenedor', i)}>
                                  <Ionicons name="close-circle" size={24} color={colors.error} />
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <TouchableOpacity style={styles.addPhotoBox} onPress={() => handlePickImage('fotosInteriorContenedor', i)}>
                                <Ionicons name="camera" size={24} color={colors.textSecondary} />
                                <Text style={styles.addPhotoText}>Añadir</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <SelectDropdown 
                    label="Tipo de Empalme" 
                    value={tipoEmpalme} 
                    options={tipoEmpalmeOptions} 
                    onSelect={(val) => {
                      setTipoEmpalme(val);
                      if (val === 'Monofásico') setFotosEmpalme(['']);
                      else if (val === 'Trifásico') setFotosEmpalme(['', '', '']);
                    }} 
                  />

                  {tipoEmpalme === 'Monofásico' && (
                    <View style={styles.photoField}>
                      <Text style={styles.label}>Foto Consumo Inicial (Breaker General CA)</Text>
                      {fotosEmpalme[0] ? (
                        <View style={styles.photoThumbContainer}>
                          <TouchableOpacity onPress={() => setPreviewUri(fotosEmpalme[0])}>
                            <Image source={{ uri: fotosEmpalme[0] }} style={styles.photoFull} />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotosEmpalme', 0)}>
                            <Ionicons name="close-circle" size={24} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotosEmpalme', 0)}>
                          <Ionicons name="camera" size={32} color={colors.textSecondary} />
                          <Text style={styles.addPhotoText}>Subir Foto</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {tipoEmpalme === 'Trifásico' && (
                    <View>
                      <Text style={styles.label}>Fotos Consumo Inicial Trifásico (Fase R, S, T)</Text>
                      <View style={styles.photoRow}>
                        {['Fase R', 'Fase S', 'Fase T'].map((label, i) => (
                          <View key={i} style={styles.photoCol}>
                            <Text style={styles.smallLabel}>{label}</Text>
                            {fotosEmpalme[i] ? (
                              <View style={styles.photoThumbContainer}>
                                <TouchableOpacity onPress={() => setPreviewUri(fotosEmpalme[i])}>
                                  <Image source={{ uri: fotosEmpalme[i] }} style={styles.photoThumb} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotosEmpalme', i)}>
                                  <Ionicons name="close-circle" size={24} color={colors.error} />
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <TouchableOpacity style={styles.addPhotoBox} onPress={() => handlePickImage('fotosEmpalme', i)}>
                                <Ionicons name="camera" size={24} color={colors.textSecondary} />
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <Text style={styles.label}>Capacidad de Protección General</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: 40"
                    value={capacidadProteccion}
                    onChangeText={setCapacidadProteccion}
                    keyboardType="numeric"
                  />

                  <View style={styles.photoField}>
                    <Text style={styles.label}>Foto Medidor Eléctrico</Text>
                    {fotoMedidor ? (
                      <View style={styles.photoThumbContainer}>
                        <TouchableOpacity onPress={() => setPreviewUri(fotoMedidor)}>
                          <Image source={{ uri: fotoMedidor }} style={styles.photoFull} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoMedidor')}>
                          <Ionicons name="close-circle" size={24} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoMedidor')}>
                        <Ionicons name="camera" size={32} color={colors.textSecondary} />
                        <Text style={styles.addPhotoText}>Subir Foto</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.photoField}>
                    <Text style={styles.label}>Foto Sector del Medidor Eléctrico</Text>
                    {fotoSectorMedidor ? (
                      <View style={styles.photoThumbContainer}>
                        <TouchableOpacity onPress={() => setPreviewUri(fotoSectorMedidor)}>
                          <Image source={{ uri: fotoSectorMedidor }} style={styles.photoFull} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoSectorMedidor')}>
                          <Ionicons name="close-circle" size={24} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoSectorMedidor')}>
                        <Ionicons name="camera" size={32} color={colors.textSecondary} />
                        <Text style={styles.addPhotoText}>Subir Foto</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.label}>N° Medidor Eléctrico</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Número de medidor"
                    value={numeroMedidor}
                    onChangeText={setNumeroMedidor}
                    keyboardType="numeric"
                  />

                  <Text style={styles.label}>Lectura o Consumo Medidor Eléctrico KW_h</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Lectura actual"
                    value={lecturaConsumo}
                    onChangeText={setLecturaConsumo}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>

            <View style={[styles.folderSection, { marginTop: 16 }]}>
              {/* Header clicable Apagado de 3G 1900MHz */}
              {(() => {
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
                const progress = Math.round((completedCount / 2) * 100);
                
                let color = colors.error;
                if (progress === 100) color = colors.success;
                else if (progress > 0) color = '#FFA500';
                
                return (
                  <TouchableOpacity style={styles.folderHeader} onPress={toggleApagado} activeOpacity={0.7}>
                    <View style={styles.folderHeaderLeft}>
                      <Ionicons name={isApagadoOpen ? 'folder-open' : 'folder'} size={24} color={color} />
                      <Text style={[styles.folderTitle, { color }]}>Apagado de 3G 1900MHz ({progress}%)</Text>
                    </View>
                    <Ionicons
                      name={isApagadoOpen ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                );
              })()}
              {/* Contenido expandible Apagado */}
              {isApagadoOpen && (
                <View style={styles.folderBody}>
                  <SelectDropdown 
                    label="Estado Inicial Equipo 3G1900" 
                    value={estado3G} 
                    options={estadoEquipoOptions} 
                    onSelect={handleEstado3GChange} 
                  />

                  {estado3G === 'Encendido' && (
                    <View>
                      <View style={styles.photoField}>
                        <Text style={styles.label}>Foto de Equipo 3G1900 Encendido</Text>
                        {fotoEquipo3GEncendido ? (
                          <View style={styles.photoThumbContainer}>
                            <TouchableOpacity onPress={() => setPreviewUri(fotoEquipo3GEncendido)}>
                              <Image source={{ uri: fotoEquipo3GEncendido }} style={styles.photoFull} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoEquipo3GEncendido')}>
                              <Ionicons name="close-circle" size={24} color={colors.error} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoEquipo3GEncendido')}>
                            <Ionicons name="camera" size={32} color={colors.textSecondary} />
                            <Text style={styles.addPhotoText}>Subir Foto</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.photoField}>
                        <Text style={styles.label}>Foto de Breaker 3G1900 Encendido</Text>
                        {fotoBreaker3GEncendido ? (
                          <View style={styles.photoThumbContainer}>
                            <TouchableOpacity onPress={() => setPreviewUri(fotoBreaker3GEncendido)}>
                              <Image source={{ uri: fotoBreaker3GEncendido }} style={styles.photoFull} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBreaker3GEncendido')}>
                              <Ionicons name="close-circle" size={24} color={colors.error} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBreaker3GEncendido')}>
                            <Ionicons name="camera" size={32} color={colors.textSecondary} />
                            <Text style={styles.addPhotoText}>Subir Foto</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}

                  {( (estado3G === 'Encendido' && seApagara3G === 'Si') || (estado3G === 'Apagado' && seRetirara3G === 'Si') ) && (
                    <View>
                      <View style={styles.photoField}>
                        <Text style={styles.label}>Foto de Breaker 3G1900 Apagado</Text>
                        {fotoBreaker3GApagado ? (
                          <View style={styles.photoThumbContainer}>
                            <TouchableOpacity onPress={() => setPreviewUri(fotoBreaker3GApagado)}>
                              <Image source={{ uri: fotoBreaker3GApagado }} style={styles.photoFull} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoBreaker3GApagado')}>
                              <Ionicons name="close-circle" size={24} color={colors.error} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoBreaker3GApagado')}>
                            <Ionicons name="camera" size={32} color={colors.textSecondary} />
                            <Text style={styles.addPhotoText}>Subir Foto</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.photoField}>
                        <Text style={styles.label}>Foto de Equipo 3G1900 Apagado</Text>
                        {fotoEquipo3GApagado ? (
                          <View style={styles.photoThumbContainer}>
                            <TouchableOpacity onPress={() => setPreviewUri(fotoEquipo3GApagado)}>
                              <Image source={{ uri: fotoEquipo3GApagado }} style={styles.photoFull} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoEquipo3GApagado')}>
                              <Ionicons name="close-circle" size={24} color={colors.error} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoEquipo3GApagado')}>
                            <Ionicons name="camera" size={32} color={colors.textSecondary} />
                            <Text style={styles.addPhotoText}>Subir Foto</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}

                  {( (estado3G === 'Encendido' && seApagara3G === 'Si') || (estado3G === 'Apagado' && seRetirara3G === 'Si') || (estado3G === 'N/A') ) && (
                    <View style={styles.photoField}>
                      <Text style={styles.label}>Foto de Espacio de Equipo 3G1900 Retirado</Text>
                      {fotoEspacioRetirado ? (
                        <View style={styles.photoThumbContainer}>
                          <TouchableOpacity onPress={() => setPreviewUri(fotoEspacioRetirado)}>
                            <Image source={{ uri: fotoEspacioRetirado }} style={styles.photoFull} />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoEspacioRetirado')}>
                            <Ionicons name="close-circle" size={24} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoEspacioRetirado')}>
                          <Ionicons name="camera" size={32} color={colors.textSecondary} />
                          <Text style={styles.addPhotoText}>Subir Foto</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                  
                  {/* El selector de RRU solo aparece si 3G está completado */}
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
                    <View style={{ marginTop: 24, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }}>
                      <SelectDropdown 
                        label="Estado Inicial Equipo RRU" 
                        value={estadoRRU} 
                        options={estadoEquipoOptions} 
                        onSelect={handleEstadoRRUChange} 
                      />

                      {estadoRRU === 'Encendido' && (
                        <View style={styles.photoField}>
                          <Text style={styles.label}>Foto de Breakers RRU Encendidos</Text>
                          {fotoRRUEncendido ? (
                            <View style={styles.photoThumbContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoRRUEncendido)}>
                                <Image source={{ uri: fotoRRUEncendido }} style={styles.photoFull} />
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoRRUEncendido')}>
                                <Ionicons name="close-circle" size={24} color={colors.error} />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoRRUEncendido')}>
                              <Ionicons name="camera" size={32} color={colors.textSecondary} />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                      {( (estadoRRU === 'Encendido' && seApagaraRRU === 'Si') || (estadoRRU === 'Apagado') ) && (
                        <View style={styles.photoField}>
                          <Text style={styles.label}>Foto de Breakers RRU Apagados</Text>
                          {fotoRRUApagado ? (
                            <View style={styles.photoThumbContainer}>
                              <TouchableOpacity onPress={() => setPreviewUri(fotoRRUApagado)}>
                                <Image source={{ uri: fotoRRUApagado }} style={styles.photoFull} />
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto('fotoRRUApagado')}>
                                <Ionicons name="close-circle" size={24} color={colors.error} />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity style={styles.addPhotoLarge} onPress={() => handlePickImage('fotoRRUApagado')}>
                              <Ionicons name="camera" size={32} color={colors.textSecondary} />
                              <Text style={styles.addPhotoText}>Subir Foto</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  mapsBtnText: {
    color: colors.surface,
    fontWeight: 'bold',
    fontSize: 16,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    marginTop: 40,
  },
  iniciarBtn: {
    backgroundColor: colors.success,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  iniciarBtnText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: 'bold',
  },
  enEjecucionContainer: {
    marginTop: 8,
  },
  statusBadge: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 24,
    gap: 6,
  },
  statusBadgeText: {
    color: colors.surface,
    fontWeight: 'bold',
    fontSize: 14,
  },
  folderSection: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  folderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  folderBody: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  folderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  fotoBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  fotoBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  photoThumbContainer: {
    position: 'relative',
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  addPhotoBox: {
    width: 80,
    height: 80,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 32,
  },
  saveBtnText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
  processingText: {
    color: colors.primary,
    fontSize: 13,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  processingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingCard: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  processingSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  photoField: {
    marginBottom: 16,
  },
  photoFull: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  addPhotoLarge: {
    width: '100%',
    height: 120,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  photoCol: {
    alignItems: 'center',
    width: '30%',
  },
  smallLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  // ViewShot fuera de pantalla (invisible pero renderizable)
  offscreen: {
    position: 'absolute',
    top: -2000,
    left: 0,
    opacity: 0,
    zIndex: -1,
  },
  watermarkContainer: {
    width: SCREEN_WIDTH,
    aspectRatio: 16 / 9,
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
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    opacity: 0.5,
    marginLeft: 8,
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
    height: SCREEN_WIDTH * 0.65,
  },
  previewCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  // Zoom hint badge
  zoomHint: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    padding: 2,
  },
});
