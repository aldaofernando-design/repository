import React, { useContext, useEffect, useState, useRef } from 'react';
import { View, FlatList, StyleSheet, Text, Dimensions, Alert, TouchableOpacity, Animated, TextInput, ScrollView, Platform, PanResponder, Modal } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SelectDropdown } from '../components/SelectDropdown';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { AppContext } from '../context/AppContext';
import { exportDatabase } from '../services/exportService';
import { SiteMarker } from '../components/MapMarkerBitmap';
import { getElapsedTime } from '../services/timeUtils';
import { calculatePlanningProgress, getReportProgressColor } from '../utils/progressHelper';


// Configurar calendario en español
LocaleConfig.locales['es'] = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene.', 'Feb.', 'Mar', 'Abr', 'May', 'Jun', 'Jul.', 'Ago', 'Sept.', 'Oct.', 'Nov.', 'Dic.'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom.', 'Lun.', 'Mar.', 'Mié.', 'Jue.', 'Vie.', 'Sáb.'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';


const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const SHEET_MIN_HEIGHT = 110;
const SHEET_MID_HEIGHT = 500;
const SHEET_MAX_HEIGHT = screenHeight - 150;

export const SitiosScreen = ({ navigation }: any) => {
  const context = useContext(AppContext);
  const sites = context?.sites || [];
  const plannings = context?.plannings || [];
  const users = context?.users || [];
  const currentUser = context?.currentUser;
  const addPlanning = context?.addPlanning;

  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [locationPermission, setLocationPermission] = useState(false);
  const [isPlanningModalVisible, setIsPlanningModalVisible] = useState(false);
  const [modalSelectedDate, setModalSelectedDate] = useState(todayString);
  const [modalSelectedWorker, setModalSelectedWorker] = useState<string | null>(null);

  const mapRef = useRef<MapView>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('satellite');

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [selectedProject, setSelectedProject] = useState('Todos');

  const uniqueProjects = ['Todos', ...Array.from(new Set(sites.map(s => s.proyecto).filter((p): p is string => typeof p === 'string')))];
  const statuses = ['Todos', 'Planificado', 'Ejecutado', 'Pospuesto', 'Sin Asignar'];

  const projectOptions = uniqueProjects.map(p => ({ id: p, label: p }));
  const statusOptions = statuses.map(s => ({ id: s, label: s }));

  // Animación del Bottom Sheet
  const [sheetState, setSheetState] = useState<'hidden' | 'half'>('half');
  const sheetHeight = useRef(new Animated.Value(SHEET_MID_HEIGHT)).current;
  const startHeight = useRef(SHEET_MID_HEIGHT);


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

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') setLocationPermission(true);
    })();
  }, []);

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
    const dLat = (250 / screenHeight) * 0.01;
    mapRef.current?.animateToRegion({
      latitude: site.lat - dLat,
      longitude: site.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 1000);
    setSelectedSiteId(site.id);

    Animated.spring(sheetHeight, {
      toValue: SHEET_MID_HEIGHT,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
    setSheetState('half');
  };

  const goToMyLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'No se puede obtener la ubicación actual.');
      return;
    }
    let location = await Location.getCurrentPositionAsync({});
    mapRef.current?.animateToRegion({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  const getDynamicStatus = (site: any) => {
    const sitePlanning = plannings.find(p => p.siteId === site.id);
    return sitePlanning ? sitePlanning.status : (site.estadoExcel || 'Sin Asignar');
  };

  const filteredSites = sites.filter(site => {
    const status = getDynamicStatus(site);
    const matchesSearch = site.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          site.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'Todos' || status === selectedStatus;
    const matchesProject = selectedProject === 'Todos' || site.proyecto === selectedProject;

    return matchesSearch && matchesStatus && matchesProject;
  });



  const renderSiteItem = ({ item }: { item: any }) => {
    const status = getDynamicStatus(item);
    const statusColor = status === 'Ejecutado' ? '#30D158' : 
                        status === 'En ejecución' ? '#FF9500' : '#0A84FF';
    return (
      <TouchableOpacity 
        style={styles.listItem}
        onPress={() => {
          focusOnSite(item);
        }}
      >
        <View style={[
          styles.listItemIcon, 
          { backgroundColor: statusColor + '20' }
        ]}>
          <Ionicons 
            name="business" 
            size={24} 
            color={statusColor} 
          />
        </View>
        <View style={styles.listItemText}>
          <Text style={styles.listItemTitle}>{item.code} - {item.name}</Text>
          <Text style={styles.listItemSub}>{status}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.3)" />
      </TouchableOpacity>
    );
  };

  const selectedSite = sites.find(s => s.id === selectedSiteId);
  const isCoordinadorOrAdmin = currentUser?.role === 'Coordinador' || currentUser?.role === 'Administrador';
  const selectedSiteStatus = selectedSite ? getDynamicStatus(selectedSite) : '';
  const activePlanning = selectedSite ? plannings.find(p => p.siteId === selectedSite.id) : null;
  const assignedWorker = activePlanning ? users.find((u: any) => u.id === activePlanning.workerId) : null;

  const [elapsedTime, setElapsedTime] = useState('');

  useEffect(() => {
    if (selectedSiteStatus === 'En ejecución' && activePlanning?.startTime) {
      setElapsedTime(getElapsedTime(activePlanning.startTime));
      const interval = setInterval(() => {
        setElapsedTime(getElapsedTime(activePlanning.startTime));
      }, 10000);
      return () => clearInterval(interval);
    } else {
      setElapsedTime('');
    }
  }, [selectedSiteStatus, activePlanning?.startTime]);

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

  const getStatusColor = (status: string) => {
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

  const getStatusMessage = (status: string, workerName: string | undefined, planning: any) => {
    const name = workerName || 'Sin trabajador';
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

  const modalWorkerOptions = users
    .filter((u: any) => u.role === 'Trabajador')
    .map((u: any) => ({ id: u.id, label: u.name }));

  const handleModalPlanificarSubmit = () => {
    if (!selectedSite) return;
    if (!modalSelectedWorker) {
      Alert.alert('Faltan datos', 'Debes seleccionar un trabajador.');
      return;
    }

    const plannedForToday = plannings.find(p => p.siteId === selectedSite.id && p.date === todayString);
    if (plannedForToday && modalSelectedDate !== todayString) {
      Alert.alert('Restricción', 'Este sitio ya está planificado para el día de hoy y no se puede planificar para un día diferente.');
      return;
    }

    const existingPlanning = plannings.find(p => p.siteId === selectedSite.id && p.date === modalSelectedDate);
    if (existingPlanning) {
      Alert.alert('Sitio ya planificado', 'Este sitio ya está planificado para este día.');
      return;
    }

    if (addPlanning) {
      addPlanning({
        siteId: selectedSite.id,
        workerId: modalSelectedWorker,
        date: modalSelectedDate,
        status: 'Planificado'
      });
      setModalSelectedWorker(null);
      setIsPlanningModalVisible(false);
      Alert.alert('Éxito', 'Sitio planificado correctamente.');
    }
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
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }}
        showsUserLocation={locationPermission && currentUser?.role === 'Trabajador'}
      >
        {filteredSites.map(site => {
          if (typeof site.lat !== 'number' || typeof site.lng !== 'number' || isNaN(site.lat) || isNaN(site.lng)) {
            return null;
          }
          return (
            <SiteMarker
              key={`${site.id}-${getDynamicStatus(site)}`}
              coordinate={{ latitude: site.lat, longitude: site.lng }}
              code={site.code}
              status={getDynamicStatus(site)}
              onPress={() => focusOnSite(site)}
              zIndex={99}
            />
          );
        })}
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
        <View style={styles.sheetHandleContainer} {...panResponder.panHandlers}>
          <TouchableOpacity style={styles.sheetHandleTapArea} onPress={toggleSheet} activeOpacity={0.8}>
            <View style={styles.sheetHandle} />
          </TouchableOpacity>
        </View>

        <Animated.View style={{ flex: 1, opacity: contentOpacity, marginBottom: Platform.OS === 'android' ? 85 : 70 }}>
          {selectedSiteId && selectedSite ? (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }} showsVerticalScrollIndicator={true}>
              <View style={styles.detailHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailTitle}>{selectedSite.code} - {selectedSite.name}</Text>
                  {isCoordinadorOrAdmin && (
                    <Text style={[styles.statusSubtitle, { color: getStatusColor(selectedSiteStatus) }]}>
                      {getStatusMessage(selectedSiteStatus, assignedWorker?.name, activePlanning)}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setSelectedSiteId(null)}>
                  <Ionicons name="close-circle" size={30} color="rgba(255, 255, 255, 0.3)" />
                </TouchableOpacity>
              </View>

              <View style={styles.actionGrid}>
                {isCoordinadorOrAdmin ? (
                  <>
                    {/* Left Icon: Ver Estado o Planificar */}
                    {(selectedSiteStatus === 'Ejecutado' || selectedSiteStatus === 'En ejecución') ? (() => {
                      const executedPlanning = plannings.find(p => p.siteId === selectedSite.id && (p.status === 'Ejecutado' || p.status === 'En ejecución'));
                      const progress = calculatePlanningProgress(executedPlanning, selectedSite);
                      const iconBgColor = getReportProgressColor(progress);
                      return (
                        <TouchableOpacity 
                          style={styles.actionCard}
                          onPress={() => {
                            if (executedPlanning) {
                              navigation.navigate('DetalleActividad', { planningId: executedPlanning.id });
                            } else {
                              Alert.alert('Error', 'No se encontró la planificación para este sitio.');
                            }
                          }}
                        >
                          <View style={[styles.actionIcon, { backgroundColor: iconBgColor }]}>
                            <Ionicons name="search" size={20} color="#fff" />
                          </View>
                          <Text style={styles.actionText}>Ver Informe</Text>
                        </TouchableOpacity>
                      );
                    })() : (selectedSiteStatus === 'Pospuesto' || selectedSiteStatus === 'Sin Asignar') ? (
                      <TouchableOpacity 
                        style={styles.actionCard}
                        onPress={() => {
                          setModalSelectedDate(todayString);
                          setModalSelectedWorker(null);
                          setIsPlanningModalVisible(true);
                        }}
                      >
                        <View style={[styles.actionIcon, { backgroundColor: '#FF9500' }]}>
                          <Ionicons name="calendar" size={20} color="#fff" />
                        </View>
                        <Text style={styles.actionText}>Planificar</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ width: (screenWidth - 80) / 3 }} />
                    )}

                    {/* Center Icon: En el Mapa */}
                    <TouchableOpacity style={styles.actionCard} onPress={() => focusOnSite(selectedSite)}>
                      <View style={[styles.actionIcon, { backgroundColor: '#007AFF' }]}>
                        <Ionicons name="location" size={20} color="#fff" />
                      </View>
                      <Text style={styles.actionText}>En el Mapa</Text>
                    </TouchableOpacity>

                    {/* Right Column: Empty spacer */}
                    <View style={{ width: (screenWidth - 80) / 3 }} />
                  </>
                ) : (
                  <>
                    <TouchableOpacity style={styles.actionCard} onPress={() => focusOnSite(selectedSite)}>
                      <View style={[styles.actionIcon, { backgroundColor: '#007AFF' }]}>
                        <Ionicons name="location" size={20} color="#fff" />
                      </View>
                      <Text style={styles.actionText}>En el Mapa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionCard}>
                      <View style={[styles.actionIcon, { backgroundColor: '#34C759' }]}>
                        <Ionicons name="share" size={20} color="#fff" />
                      </View>
                      <Text style={styles.actionText}>Compartir</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionCard}>
                      <View style={[styles.actionIcon, { backgroundColor: '#5856D6' }]}>
                        <Ionicons name="star" size={20} color="#fff" />
                      </View>
                      <Text style={styles.actionText}>Favorito</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {isCoordinadorOrAdmin && (
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
              )}

              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Información del Sitio</Text>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Dirección</Text>
                  <Text style={styles.infoValue}>{selectedSite.address}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Comuna</Text>
                  <Text style={styles.infoValue}>{selectedSite.commune}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Región</Text>
                  <Text style={styles.infoValue}>{selectedSite.region}</Text>
                </View>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.listContainer}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color="rgba(255, 255, 255, 0.5)" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar sitios..."
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <View style={styles.dropdownsRow}>
                <View style={styles.dropdownContainer}>
                  <SelectDropdown
                    label="Proyecto"
                    value={selectedProject}
                    options={projectOptions}
                    onSelect={setSelectedProject}
                    placeholder="Todos"
                  />
                </View>
                <View style={styles.dropdownContainer}>
                  <SelectDropdown
                    label="Estado"
                    value={selectedStatus}
                    options={statusOptions}
                    onSelect={setSelectedStatus}
                    placeholder="Todos"
                  />
                </View>
              </View>

              <FlatList
                data={filteredSites}
                keyExtractor={item => item.id}
                renderItem={renderSiteItem}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No se encontraron sitios con estos filtros.</Text>
                }
              />
            </View>
          )}
        </Animated.View>
      </Animated.View>

      {/* Modal de Planificación para Coordinadores y Administradores */}
      {isCoordinadorOrAdmin && selectedSite && (
        <Modal
          visible={isPlanningModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsPlanningModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nueva Planificación</Text>
                <Text style={styles.modalSubtitle}>Sitio: {selectedSite.code} - {selectedSite.name}</Text>
              </View>

              <View style={styles.modalForm}>
                <Text style={styles.modalSectionLabel}>1. Seleccionar Fecha de Planificación</Text>
                <Calendar
                  current={modalSelectedDate}
                  onDayPress={(day: any) => setModalSelectedDate(day.dateString)}
                  markedDates={{
                    [modalSelectedDate]: {
                      selected: true,
                      selectedColor: '#0A84FF',
                    }
                  }}
                  theme={{
                    backgroundColor: '#1C1C1E',
                    calendarBackground: '#1C1C1E',
                    textSectionTitleColor: 'rgba(255, 255, 255, 0.6)',
                    selectedDayBackgroundColor: '#0A84FF',
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: '#0A84FF',
                    dayTextColor: '#ffffff',
                    textDisabledColor: 'rgba(255, 255, 255, 0.2)',
                    dotColor: '#0A84FF',
                    selectedDotColor: '#ffffff',
                    arrowColor: '#0A84FF',
                    monthTextColor: '#ffffff',
                    textDayFontWeight: '500',
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: '600',
                  }}
                />

                <View style={{ marginTop: 15 }}>
                  <SelectDropdown 
                    label="2. Asignar Trabajador"
                    value={modalSelectedWorker}
                    options={modalWorkerOptions}
                    onSelect={setModalSelectedWorker}
                    placeholder="Elegir trabajador..."
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.modalBtn, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} 
                    onPress={() => {
                      setModalSelectedWorker(null);
                      setIsPlanningModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalBtnText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.modalBtn, { backgroundColor: '#0A84FF' }]} 
                    onPress={handleModalPlanificarSubmit}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalBtnText}>Planificar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
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
  exportButton: {
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
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 20,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  dropdownsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -5,
    marginBottom: 10,
  },
  dropdownContainer: {
    flex: 1,
    paddingHorizontal: 5,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  listItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
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
  },
  emptyText: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 32,
    fontSize: 16,
  },
  detailContainer: {
    flex: 1,
    paddingHorizontal: 20,
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
  infoSection: {
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
  },
  infoItem: {
    marginBottom: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 10,
  },
  infoLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  statusSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  tasksSection: {
    marginTop: 30,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 20,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  modalForm: {
    padding: 20,
  },
  modalSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 10,
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
  nativeCallout: {
    minWidth: 160,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#000',
  },
  calloutText: {
    fontSize: 12,
    color: '#666',
  },
  calloutStatus: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0A84FF',
    marginTop: 4,
  },
});
