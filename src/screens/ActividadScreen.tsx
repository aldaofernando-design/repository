import React, { useContext, useEffect, useState, useRef } from 'react';
import { View, FlatList, StyleSheet, Text, Dimensions, Alert, TouchableOpacity, Animated, Linking, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { AppContext } from '../context/AppContext';
import { getElapsedTime, formatTime } from '../services/timeUtils';

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

  // Animación del Bottom Sheet (3 estados: oculto, medio, expandido)
  const [sheetState, setSheetState] = useState<'hidden' | 'half' | 'full'>('half');
  const sheetHeight = useRef(new Animated.Value(SHEET_MID_HEIGHT)).current;
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('satellite');

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
      if (sheetState === 'full' || sheetState === 'half') {
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

  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const filteredPlannings = allPlannings.filter(planning => {
    const isEnEjecucion = planning.status === 'En ejecución';
    const isEjecutado = planning.status === 'Ejecutado';
    const isPlanificadoHoy = planning.status === 'Planificado' && planning.date === todayString;
    if (!isEnEjecucion && !isPlanificadoHoy && !isEjecutado) return false;
    if (currentUser?.role === 'Trabajador') {
      return planning.workerId === currentUser.id;
    }
    return true;
  });

  const toggleSheet = () => {
    let nextState: 'hidden' | 'half' | 'full' = 'half';
    let toValue = SHEET_MID_HEIGHT;

    if (sheetState === 'half') {
      nextState = 'full';
      toValue = SHEET_MAX_HEIGHT;
    } else if (sheetState === 'full') {
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
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: site.lat,
        longitude: site.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    }
    setSelectedSiteId(site.id);
  };

  const openGoogleMaps = (site: any) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${site.lat},${site.lng}`;
    Linking.openURL(url);
  };

  const goToMyLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo obtener tu ubicación actual.');
    }
  };

  const selectedPlanning = filteredPlannings.find(p => p.siteId === selectedSiteId);
  const selectedSite = allSites.find(s => s.id === selectedSiteId);

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
                {worker?.name || 'Sin asignar'}
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
            <Marker
              key={plan.id}
              coordinate={{ latitude: site.lat, longitude: site.lng }}
              onPress={() => setSelectedSiteId(site.id)}
            >
              <View style={styles.customMarker}>
                <View style={[
                  styles.markerBubble, 
                  { 
                    backgroundColor: plan.status === 'Ejecutado' ? colors.success : 
                                    plan.status === 'En ejecución' ? colors.warning : '#2563EB' 
                  }
                ]}>
                  <Text style={styles.markerText}>{site.code}</Text>
                </View>
                <View style={[
                  styles.markerArrow, 
                  { 
                    borderBottomColor: plan.status === 'Ejecutado' ? colors.success : 
                                      plan.status === 'En ejecución' ? colors.warning : '#2563EB' 
                  }
                ]} />
              </View>
            </Marker>
          );
        })}
        {/* Marcador "Yo" para el Trabajador */}
        {currentUser?.role === 'Trabajador' && userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.coords.latitude,
              longitude: userLocation.coords.longitude,
            }}
          >
            <View style={styles.yoMarkerContainer}>
              <View style={styles.yoPhotoContainer}>
                {currentUser.photo ? (
                  <Image source={{ uri: currentUser.photo }} style={styles.yoPhoto} />
                ) : (
                  <Ionicons name="person" size={30} color="#007AFF" />
                )}
              </View>
            </View>
          </Marker>
        )}

        {/* Marcadores de Trabajadores (Solo para Admin/Coordinador) */}
        {(currentUser?.role === 'Administrador' || currentUser?.role === 'Coordinador') && (
          allUsers
            .filter(u => u.role === 'Trabajador')
            .filter(u => filteredPlannings.some(p => p.workerId === u.id))
            .map(worker => {
              // Simulación de ubicación del trabajador (cerca de uno de sus sitios asignados)
              const workerPlan = filteredPlannings.find(p => p.workerId === worker.id);
              const workerSite = allSites.find(s => s.id === workerPlan?.siteId);
              if (!workerSite) return null;

              // Desplazamos un poco la ubicación para que no esté exactamente sobre el sitio
              const workerLat = workerSite.lat + 0.002;
              const workerLng = workerSite.lng + 0.002;

              return (
                <Marker
                  key={`worker-${worker.id}`}
                  coordinate={{ latitude: workerLat, longitude: workerLng }}
                  title={worker.name}
                  description={`Técnico en terreno - ${worker.company}`}
                >
                  <View style={styles.workerMarker}>
                    <View style={styles.workerMarkerInner}>
                      {worker.photo ? (
                        <Image source={{ uri: worker.photo }} style={styles.workerPhoto} />
                      ) : (
                        <Ionicons name="person" size={24} color="#fff" />
                      )}
                    </View>
                    <View style={styles.workerMarkerArrow} />
                  </View>
                </Marker>
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
          <TouchableOpacity style={styles.controlBtn} onPress={goToMyLocation}>
            <Ionicons name="location" size={20} color="#1C1C1E" />
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.bottomSheet, { height: sheetHeight }]}>
          <TouchableOpacity style={styles.sheetHandleContainer} onPress={toggleSheet} activeOpacity={1}>
            <View style={styles.sheetHandle} />
          </TouchableOpacity>

          <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
            {selectedSiteId && selectedSite ? (
              <View style={styles.detailContainer}>
            <View style={styles.detailHeader}>
              <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 50 }}>
                <Text style={styles.detailTitle} numberOfLines={1} ellipsizeMode="tail">
                  {selectedSite.code} - {selectedSite.name}
                </Text>
                {currentUser?.role !== 'Trabajador' ? (
                  <View style={styles.workerBadge}>
                    <Ionicons name="person" size={14} color="rgba(255, 255, 255, 0.7)" />
                    <Text style={styles.workerBadgeTextFull}>
                      Asignado: {selectedPlanning?.workerName || 'Sin asignar'}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, { 
                    backgroundColor: selectedPlanning?.status === 'Ejecutado' ? colors.success + '20' : 
                                    selectedPlanning?.status === 'En ejecución' ? '#FF950020' : '#0A84FF20' 
                  }]}>
                    <Text style={[styles.statusBadgeText, { 
                      color: selectedPlanning?.status === 'Ejecutado' ? colors.success : 
                             selectedPlanning?.status === 'En ejecución' ? '#FF9500' : '#0A84FF' 
                    }]}>
                      {selectedPlanning?.status} {selectedPlanning?.status === 'En ejecución' ? `• ${getElapsedTime(selectedPlanning.startTime)}` : ''}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => setSelectedSiteId(null)} style={styles.closeButton}>
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
              ) : (
                <TouchableOpacity 
                  style={styles.actionCard}
                  onPress={() => navigation.navigate('DetalleActividad', { planningId: selectedPlanning?.id })}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#34C759' }]}>
                    <Ionicons name="search" size={20} color="#fff" />
                  </View>
                  <Text style={styles.actionText}>Ver Estado</Text>
                </TouchableOpacity>
              )}

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

              {!selectedSite.apagado3G && !selectedSite.apagadoBAFI && !selectedSite.configurarRETU && (
                <Text style={styles.emptyTasksText}>Sin actividades específicas registradas.</Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {/* Título eliminado */}
            <FlatList
              data={filteredPlannings}
              keyExtractor={item => item.id}
              renderItem={renderPlanningItem}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No hay actividades para hoy.</Text>
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
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  markerBubble: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.primary,
    transform: [{ rotate: '180deg' }],
    marginTop: -2,
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
    paddingBottom: 75,
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
    textAlign: 'center',
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
    paddingHorizontal: 10,
  },
  actionCard: {
    width: (screenWidth - 60) / 3,
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
  startTimeText: {
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
    width: 60,
    height: 60,
  },
  workerMarkerInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#30D158', // Green for workers like Find My people
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  workerPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
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
});
