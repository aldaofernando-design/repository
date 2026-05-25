import React, { useContext, useEffect, useState, useRef } from 'react';
import { View, FlatList, StyleSheet, Text, Dimensions, Alert, TouchableOpacity, Animated, Linking, Platform, Image, PanResponder, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SelectDropdown } from '../components/SelectDropdown';
import * as Location from 'expo-location';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { AppContext } from '../context/AppContext';
import { getElapsedTime, formatTime } from '../services/timeUtils';
import { SiteMarker } from '../components/MapMarkerBitmap';
import { calculatePlanningProgress, getReportProgressColor } from '../utils/progressHelper';


const getInitials = (name: string) => {
  if (!name) return '';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

// ─── Marcador de foto: borderRadius directo en Image (funciona en Android) ─────
interface PhotoMarkerProps {
  coordinate: { latitude: number; longitude: number };
  photoUri?: string;
  name: string;
  zIndex?: number;
  size?: number;
  borderColor?: string;
  onPress?: () => void;
  title?: string;
  description?: string;
}

const PhotoMarker = ({ coordinate, photoUri, name, zIndex = 100, size = 46, borderColor = '#fff', onPress, title, description }: PhotoMarkerProps) => {
  const [loaded, setLoaded] = React.useState(!photoUri);
  const r = size / 2;
  const borderWidth = size > 20 ? 3 : 1.5;
  const containerSize = size + borderWidth * 2;
  const triWidth = Math.max(3, Math.round(size * 0.15));
  const triHeight = Math.max(4, Math.round(size * 0.22));

  return (
    <Marker
      coordinate={coordinate}
      zIndex={zIndex}
      tracksViewChanges={!loaded}
      anchor={{ x: 0.5, y: 1.0 }}
      onPress={onPress}
      title={title}
      description={description}
    >
      <View collapsable={false} style={{ alignItems: 'center' }}>
        {/* Círculo de fondo + borde */}
        <View
          collapsable={false}
          style={{
            width: containerSize,
            height: containerSize,
            borderRadius: r + borderWidth,
            backgroundColor: borderColor,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 6,
          }}
        >
          {photoUri ? (
            // borderRadius en la Image directamente — única forma confiable en Android
            <Image
              source={{ uri: photoUri }}
              style={{
                width: size,
                height: size,
                borderRadius: r,   // aplicado en la Image, no en el contenedor
              }}
              onLoad={() => setLoaded(true)}
            />
          ) : (
            <View style={{
              width: size,
              height: size,
              borderRadius: r,
              backgroundColor: '#007AFF',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: Math.max(6, size * 0.3) }}>
                {getInitials(name)}
              </Text>
            </View>
          )}
        </View>
        {/* Punta triangular */}
        <View style={{
          width: 0, height: 0,
          borderLeftWidth: triWidth, borderRightWidth: triWidth, borderTopWidth: triHeight,
          borderLeftColor: 'transparent', borderRightColor: 'transparent',
          borderTopColor: borderColor,
        }} />
      </View>
    </Marker>
  );
};

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const SHEET_MIN_HEIGHT = 110; // Altura para cubrir TabBar + espacio handle
const SHEET_MID_HEIGHT = 500;
const SHEET_MAX_HEIGHT = screenHeight - 150;

export const ActividadScreen = ({ route, navigation }: any) => {
  const context = useContext(AppContext);
  const currentUser = context?.currentUser;
  
  const allPlannings = context?.plannings || [];
  const allSites = context?.sites || [];
  const allUsers = context?.users || [];

  const [locationPermission, setLocationPermission] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);

  // Animación del Bottom Sheet (2 estados: oculto, medio)
  const [sheetState, setSheetState] = useState<'hidden' | 'half'>('half');
  const sheetHeight = useRef(new Animated.Value(SHEET_MID_HEIGHT)).current;
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('satellite');
  const startHeight = useRef(SHEET_MID_HEIGHT);
  const [tracksView, setTracksView] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'android') {
      setTracksView(true);
      const timer = setTimeout(() => {
        setTracksView(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [allPlannings]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        // @ts-ignore
        startHeight.current = sheetHeight._value;
      },
      onPanResponderMove: (_, gestureState) => {
        let newHeight = startHeight.current - gestureState.dy;
        if (newHeight < SHEET_MIN_HEIGHT) {
          newHeight = SHEET_MIN_HEIGHT;
        } else if (newHeight > SHEET_MID_HEIGHT) {
          newHeight = SHEET_MID_HEIGHT + (newHeight - SHEET_MID_HEIGHT) * 0.3;
        }
        sheetHeight.setValue(newHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        // @ts-ignore
        const currentVal = sheetHeight._value;
        const middlePoint = (SHEET_MIN_HEIGHT + SHEET_MID_HEIGHT) / 2;
        
        let targetHeight = SHEET_MIN_HEIGHT;
        let nextState: 'hidden' | 'half' = 'hidden';
        
        if (gestureState.vy < -0.5) {
          targetHeight = SHEET_MID_HEIGHT;
          nextState = 'half';
        } else if (gestureState.vy > 0.5) {
          targetHeight = SHEET_MIN_HEIGHT;
          nextState = 'hidden';
        } else {
          if (currentVal > middlePoint) {
            targetHeight = SHEET_MID_HEIGHT;
            nextState = 'half';
          } else {
            targetHeight = SHEET_MIN_HEIGHT;
            nextState = 'hidden';
          }
        }
        
        Animated.spring(sheetHeight, {
          toValue: targetHeight,
          useNativeDriver: false,
          friction: 8,
          tension: 40,
        }).start();
        setSheetState(nextState);
      }
    })
  ).current;

  const contentOpacity = sheetHeight.interpolate({
    inputRange: [SHEET_MIN_HEIGHT, SHEET_MIN_HEIGHT + 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    let subscription: any;
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 10 },
          (location) => setUserLocation(location)
        );
      }
    })();
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const autoSelectSiteId = route?.params?.autoSelectSiteId;
    if (autoSelectSiteId) {
      setSelectedSiteId(autoSelectSiteId);
      const site = allSites.find(s => s.id === autoSelectSiteId);
      if (site) {
        // Focus the map on the selected site with a slight delay
        setTimeout(() => focusOnSite(site), 500);
      }
      
      // Minimize the sheet so the site details on the main screen are visible
      if (sheetState === 'half') {
        Animated.spring(sheetHeight, {
          toValue: SHEET_MIN_HEIGHT,
          useNativeDriver: false,
          friction: 8,
          tension: 40,
        }).start();
        setSheetState('hidden');
      }

      // Clear the param so it doesn't re-trigger on subsequent tab visits
      navigation.setParams({ autoSelectSiteId: undefined });
    }
  }, [route?.params?.autoSelectSiteId]);

  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const projectsList = Array.from(new Set(
    allSites
      .map(s => s.proyecto)
      .filter((p): p is string => !!p)
  ));
  const projectOptions = [
    { id: 'Todos', label: 'Todos los Proyectos' },
    ...projectsList.map(p => ({ id: p, label: p }))
  ];

  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const filteredPlannings = allPlannings.filter(planning => {
    const isEnEjecucion = planning.status === 'En ejecución';
    const isEjecutado = planning.status === 'Ejecutado';
    const isPlanificadoHoy = planning.status === 'Planificado' && planning.date === todayString;
    if (!isEnEjecucion && !isPlanificadoHoy && !isEjecutado) return false;

    // Filter by project
    const site = allSites.find(s => s.id === planning.siteId);
    if (!site) return false;
    if (currentUser?.role !== 'Trabajador' && selectedProject && selectedProject !== 'Todos' && site.proyecto !== selectedProject) {
      return false;
    }

    if (currentUser?.role === 'Trabajador') {
      return planning.workerId === currentUser.id;
    }
    return true;
  });

  const toggleSheet = () => {
    let nextState: 'hidden' | 'half' = 'half';
    let toValue = SHEET_MID_HEIGHT;

    if (sheetState === 'half') {
      nextState = 'hidden';
      toValue = SHEET_MIN_HEIGHT;
    } else {
      nextState = 'half';
      toValue = SHEET_MID_HEIGHT;
    }

    Animated.spring(sheetHeight, {
      toValue,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
    setSheetState(nextState);
  };

  const focusOnSite = (site: any) => {
    const dLat = (250 / screenHeight) * 0.005;
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: site.lat - dLat,
        longitude: site.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    }
    setSelectedSiteId(site.id);

    Animated.spring(sheetHeight, {
      toValue: SHEET_MID_HEIGHT,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
    setSheetState('half');
  };

  const openGoogleMaps = (site: any) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${site.lat},${site.lng}`;
    Linking.openURL(url);
  };

  const focusOnWorker = (workerLat: number, workerLng: number, site: any) => {
    const dLat = (250 / screenHeight) * 0.005;
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: workerLat - dLat,
        longitude: workerLng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    }
    setSelectedSiteId(site.id);

    Animated.spring(sheetHeight, {
      toValue: SHEET_MID_HEIGHT,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
    setSheetState('half');
  };

  const focusOnUserLocation = async () => {
    try {
      let coords = userLocation?.coords;
      if (!coords) {
        const location = await Location.getCurrentPositionAsync({});
        coords = location.coords;
      }
      if (coords && mapRef.current) {
        const dLat = (250 / screenHeight) * 0.005;
        mapRef.current.animateToRegion({
          latitude: coords.latitude - dLat,
          longitude: coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 1000);
      }
      Animated.spring(sheetHeight, {
        toValue: SHEET_MID_HEIGHT,
        useNativeDriver: false,
        friction: 8,
        tension: 40,
      }).start();
      setSheetState('half');
    } catch (e) {
      Alert.alert('Error', 'No se pudo obtener tu ubicación actual.');
    }
  };

  const selectedPlanning = filteredPlannings.find(p => p.siteId === selectedSiteId);
  const selectedSite = allSites.find(s => s.id === selectedSiteId);
  const assignedWorker = allUsers.find(u => u.id === selectedPlanning?.workerId);
  const displayWorkerName = assignedWorker?.name || 'Sin asignar';

  const [elapsedTime, setElapsedTime] = useState('');

  useEffect(() => {
    if (selectedPlanning?.status === 'En ejecución' && selectedPlanning?.startTime) {
      setElapsedTime(getElapsedTime(selectedPlanning.startTime));
      const interval = setInterval(() => {
        setElapsedTime(getElapsedTime(selectedPlanning.startTime));
      }, 60000); // refresh every minute
      return () => clearInterval(interval);
    } else {
      setElapsedTime('');
    }
  }, [selectedPlanning?.status, selectedPlanning?.startTime]);

  const formatDateStr = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const formatDateTimeStr = (isoString: string | undefined): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hrs = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} a las ${hrs}:${mins}`;
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'rgba(255, 255, 255, 0.4)';
    switch (status) {
      case 'En ejecución':
        return '#FF9500';
      case 'Pospuesto':
        return '#FF453A';
      case 'Planificado':
        return '#0A84FF';
      case 'Ejecutado':
        return '#30D158';
      case 'Sin Asignar':
      default:
        return 'rgba(255, 255, 255, 0.4)';
    }
  };

  const getStatusMessage = (status: string | undefined, workerName: string | undefined, planning: any) => {
    const name = workerName || 'Sin asignar';
    if (!status) return 'Sin asignar';
    switch (status) {
      case 'En ejecución':
        return `En ejecución • Asignado a: ${name} • ${elapsedTime || getElapsedTime(planning?.startTime)}`;
      case 'Pospuesto':
        return `Pospuesto • Tenía asignado a: ${name} • Desde el ${formatDateStr(planning?.date)}`;
      case 'Planificado':
        return `Planificado • Asignado a: ${name} • Para el ${formatDateStr(planning?.date)}`;
      case 'Sin Asignar':
        return 'Sin Asignar';
      case 'Ejecutado':
        return `Ejecutado • Realizado por: ${name}${planning?.endTime ? ` • El ${formatDateTimeStr(planning.endTime)}` : ''}`;
      default:
        return status || 'Sin Asignar';
    }
  };

  const renderPlanningItem = ({ item }: { item: any }) => {
    const site = allSites.find(s => s.id === item.siteId);
    const worker = allUsers.find(u => u.id === item.workerId);
    if (!site) return null;

    return (
      <TouchableOpacity 
        style={styles.listItem} 
        onPress={() => focusOnSite(site)}
      >
        <View style={[
          styles.listItemIcon, 
          { 
            backgroundColor: item.status === 'Ejecutado' ? colors.success + '15' : 
                            item.status === 'En ejecución' ? colors.warning + '15' : colors.primary + '15' 
          }
        ]}>
          <Ionicons 
            name={item.status === 'Ejecutado' ? "checkmark-done-circle" : 
                   item.status === 'En ejecución' ? "time" : "location"} 
            size={24} 
            color={item.status === 'Ejecutado' ? colors.success : 
                   item.status === 'En ejecución' ? colors.warning : colors.primary} 
          />
        </View>
        <View style={styles.listItemText}>
          <Text style={styles.listItemTitle}>{site.code} - {site.name}</Text>
          {currentUser?.role === 'Trabajador' ? (
            <Text style={[styles.statusText, { 
              color: item.status === 'Ejecutado' ? colors.success : 
                     item.status === 'En ejecución' ? '#FF9500' : '#0A84FF' 
            }]}>
            {item.status === 'Ejecutado' ? `Ejecutado • ${formatTime(item.endTime)}` : 
             item.status === 'En ejecución' ? `En ejecución • ${getElapsedTime(item.startTime)}` : item.status}
          </Text>
          ) : (
            <View style={styles.workerBadgeMini}>
              {worker?.photo ? (
                <Image source={{ uri: worker.photo }} style={styles.workerPhotoMini} />
              ) : (
                <Ionicons name="person" size={10} color={colors.textSecondary} />
              )}
              <Text style={styles.workerBadgeText}>
                {worker?.name || 'Sin asignar'}{site.proyecto ? ` • ${site.proyecto}` : ''}
              </Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.border} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType={mapType}
        initialRegion={{
          latitude: -33.4489,
          longitude: -70.6693,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        showsUserLocation={locationPermission && currentUser?.role === 'Trabajador'}
      >
        {filteredPlannings.map(plan => {
          const site = context?.sites.find(s => s.id === plan.siteId);
          if (!site || typeof site.lat !== 'number' || typeof site.lng !== 'number' || isNaN(site.lat) || isNaN(site.lng)) {
            return null;
          }
          return (
            <SiteMarker
              key={`${plan.id}-${plan.status}`}
              coordinate={{ latitude: site.lat, longitude: site.lng }}
              code={site.code}
              status={plan.status}
              onPress={() => focusOnSite(site)}
              zIndex={99}
            />
          );
        })}
        {/* Ubicación del Trabajador: usa el punto nativo de showsUserLocation */}

        {/* Marcadores de Trabajadores (Solo para Admin/Coordinador) */}
        {(currentUser?.role === 'Administrador' || currentUser?.role === 'Coordinador') && (
          allUsers
            .filter(u => u.role === 'Trabajador')
            .filter(u => filteredPlannings.some(p => p.workerId === u.id))
            .map(worker => {
              const workerPlan = filteredPlannings.find(p => p.workerId === worker.id);
              const workerSite = allSites.find(s => s.id === workerPlan?.siteId);
              if (!workerSite) return null;

              const workerLat = workerSite.lat + 0.002;
              const workerLng = workerSite.lng + 0.002;

              return (
                <PhotoMarker
                  key={`worker-${worker.id}`}
                  coordinate={{ latitude: workerLat, longitude: workerLng }}
                  photoUri={worker.photo}
                  name={worker.name}
                  zIndex={101}
                  size={24}
                  borderColor="#30D158"
                  title={worker.name}
                  description={`Técnico en terreno - ${worker.company}`}
                  onPress={() => focusOnWorker(workerLat, workerLng, workerSite)}
                />
              );
            })
        )}
      </MapView>

        {/* Controles del Mapa */}
        <View style={styles.mapControls}>
          <TouchableOpacity 
            style={styles.controlBtn} 
            onPress={() => setMapType(mapType === 'standard' ? 'satellite' : 'standard')}
          >
            <Ionicons name={mapType === 'standard' ? "earth" : "map"} size={20} color="#1C1C1E" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={focusOnUserLocation}>
            <Ionicons name="location" size={20} color="#1C1C1E" />
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.bottomSheet, { height: sheetHeight }]}>
          <View style={styles.sheetHandleContainer} {...panResponder.panHandlers}>
            <TouchableOpacity style={styles.sheetHandleTapArea} onPress={toggleSheet} activeOpacity={0.8}>
              <View style={styles.sheetHandle} />
            </TouchableOpacity>
          </View>

          <Animated.View style={{ flex: 1, opacity: contentOpacity, marginBottom: Platform.OS === 'android' ? 85 : 70 }}>
            {selectedSiteId && selectedSite ? (
              <ScrollView 
                style={styles.detailContainer} 
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                showsVerticalScrollIndicator={true}
              >
            <View style={styles.detailHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailTitle} numberOfLines={1} ellipsizeMode="tail">
                  {selectedSite.code} - {selectedSite.name}
                </Text>
                <Text style={[styles.statusSubtitle, { color: getStatusColor(selectedPlanning?.status) }]}>
                  {getStatusMessage(selectedPlanning?.status, displayWorkerName, selectedPlanning)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedSiteId(null)}>
                <Ionicons name="close-circle" size={30} color="rgba(255, 255, 255, 0.3)" />
              </TouchableOpacity>
            </View>

            <View style={styles.actionGrid}>
              {currentUser?.role === 'Trabajador' ? (
                <TouchableOpacity 
                  style={styles.actionCard}
                  onPress={() => navigation.navigate('DetalleActividad', { planningId: selectedPlanning?.id })}
                >
                  <View style={[
                    styles.actionIcon, 
                    { backgroundColor: selectedPlanning?.status === 'En ejecución' ? colors.warning : colors.success }
                  ]}>
                    <Ionicons 
                      name={selectedPlanning?.status === 'Ejecutado' ? "search" : selectedPlanning?.status === 'En ejecución' ? "time" : "play"} 
                      size={20} 
                      color="#fff" 
                    />
                  </View>
                  <Text style={styles.actionText}>
                    {selectedPlanning?.status === 'Ejecutado' ? "Mostrar Informe" : 
                     selectedPlanning?.status === 'En ejecución' ? "En ejecución" : "Iniciar Actividad"}
                  </Text>
                </TouchableOpacity>
              ) : (() => {
                const progress = calculatePlanningProgress(selectedPlanning, selectedSite);
                const iconBgColor = getReportProgressColor(progress);
                return (
                  <TouchableOpacity 
                    style={styles.actionCard}
                    onPress={() => navigation.navigate('DetalleActividad', { planningId: selectedPlanning?.id })}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: iconBgColor }]}>
                      <Ionicons name="search" size={20} color="#fff" />
                    </View>
                    <Text style={styles.actionText}>Ver Informe</Text>
                  </TouchableOpacity>
                );
              })()}

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => focusOnSite(selectedSite)}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#007AFF' }]}>
                  <Ionicons name="location" size={20} color="#fff" />
                </View>
                <Text style={styles.actionText}>Marcar Mapa</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => openGoogleMaps(selectedSite)}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#5856D6' }]}>
                  <Ionicons name="navigate" size={20} color="#fff" />
                </View>
                <Text style={styles.actionText}>Cómo llegar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tasksSection}>
              <Text style={styles.sectionTitle}>Actividades Consideradas</Text>
              
              {selectedSite.apagado3G && (
                <View style={styles.taskItem}>
                  <Ionicons 
                    name={selectedSite.apagado3G === 'SI' ? "checkmark-circle" : "close-circle"} 
                    size={20} 
                    color={selectedSite.apagado3G === 'SI' ? "#30D158" : "rgba(255, 255, 255, 0.3)"} 
                  />
                  <Text style={styles.taskText}>Apagado 3G: {selectedSite.apagado3G}</Text>
                </View>
              )}

              {selectedSite.apagadoBAFI && (
                <View style={styles.taskItem}>
                  <Ionicons 
                    name={selectedSite.apagadoBAFI === 'SI' ? "checkmark-circle" : "close-circle"} 
                    size={20} 
                    color={selectedSite.apagadoBAFI === 'SI' ? "#30D158" : "rgba(255, 255, 255, 0.3)"} 
                  />
                  <Text style={styles.taskText}>Apagado BAFI: {selectedSite.apagadoBAFI}</Text>
                </View>
              )}

              {selectedSite.configurarRETU && (
                <View style={styles.taskItem}>
                  <Ionicons 
                    name={selectedSite.configurarRETU === 'SI' ? "checkmark-circle" : "close-circle"} 
                    size={20} 
                    color={selectedSite.configurarRETU === 'SI' ? "#30D158" : "rgba(255, 255, 255, 0.3)"} 
                  />
                  <Text style={styles.taskText}>Configurar RETU: {selectedSite.configurarRETU}</Text>
                </View>
              )}

              {(selectedSite.proyecto === 'iLOQ' || selectedSite.cambioChapa === 'Si' || selectedSite.cambioChapa === 'SI') && (
                <View style={styles.taskItem}>
                  <Ionicons 
                    name="checkmark-circle" 
                    size={20} 
                    color="#30D158" 
                  />
                  <Text style={styles.taskText}>Cambio de Chapa: SI</Text>
                </View>
              )}

              {!selectedSite.apagado3G && !selectedSite.apagadoBAFI && !selectedSite.configurarRETU && 
               selectedSite.proyecto !== 'iLOQ' && selectedSite.cambioChapa !== 'Si' && selectedSite.cambioChapa !== 'SI' && (
                <Text style={styles.emptyTasksText}>Sin actividades específicas registradas.</Text>
              )}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.listContainer}>
            {/* Título eliminado */}
            {currentUser?.role !== 'Trabajador' && (
              <View style={{ marginBottom: 12 }}>
                <SelectDropdown 
                  label="Filtrar por Proyecto"
                  value={selectedProject}
                  options={projectOptions}
                  onSelect={setSelectedProject}
                  placeholder="Todos los Proyectos"
                />
              </View>
            )}
            <FlatList
              data={filteredPlannings}
              keyExtractor={item => item.id}
              renderItem={renderPlanningItem}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <Text style={styles.emptyListText}>No hay actividades para hoy.</Text>
              }
            />
          </View>
        )}
          </Animated.View>
        </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  towerMarkerContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
    height: 75,
  },
  towerIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    width: 28,
    height: 28,
    borderWidth: 1.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  towerLabel: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    minWidth: 55,
  },
  towerLabelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  nativeCallout: {
    minWidth: 160,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callout: {
    width: 200,
    padding: 10,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 12,
    color: colors.primary,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    right: 15,
    backgroundColor: 'rgba(28, 28, 30, 0.95)',
    borderRadius: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
    overflow: 'hidden',
  },
  sheetHandleContainer: {
    width: '100%',
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHandleTapArea: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  listTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  listItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  listWorkerPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  listItemText: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  listItemSub: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 0,
  },
  detailSub: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  actionCard: {
    width: (screenWidth - 80) / 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  workerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'center',
    gap: 6,
  },
  workerBadgeTextFull: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  startTimeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF9500', // Apple Orange
    marginTop: 8,
    textAlign: 'center',
  },
  tasksSection: {
    marginTop: 30,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 15,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 10,
  },
  taskText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  emptyTasksText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  workerBadgeMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  workerPhotoMini: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 4,
  },
  workerBadgeText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  startTimeText2_REMOVED: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: 'bold',
    marginTop: 4,
  },
  mapControls: {
    position: 'absolute',
    top: 160, // Bajamos más para evitar solapamiento con la brújula en distintas resoluciones
    right: 12,
    gap: 8,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  workerMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  workerMarkerInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#30D158', // Green for workers like Find My people
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  workerPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  workerMarkerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#30D158',
    transform: [{ rotate: '180deg' }],
  },
  workerCalloutName: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#000',
  },
  workerCalloutInfo: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  workerCalloutStatus: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  yoMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  yoPhotoContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: '#fff',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yoPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  yoMarkerAndroid: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yoMarkerAndroidPulse: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.25)',
  },
  yoMarkerAndroidDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
  },
  workerInitials: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyListText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 40,
  },
});
