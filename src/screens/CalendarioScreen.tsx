import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, Dimensions, Animated, TouchableOpacity, FlatList, Modal, Alert, PanResponder, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { AppContext } from '../context/AppContext';
import { getElapsedTime, formatTime, getSantiagoTodayString } from '../services/timeUtils';
import { SelectDropdown } from '../components/SelectDropdown';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const SHEET_MIN_HEIGHT = 110;
const SHEET_MID_HEIGHT = 450;
const SHEET_MAX_HEIGHT = 450; // Para el calendario no necesitamos que suba tanto si solo es el calendario

// Configurar calendario en español
LocaleConfig.locales['es'] = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene.', 'Feb.', 'Mar', 'Abr', 'May', 'Jun', 'Jul.', 'Ago', 'Sept.', 'Oct.', 'Nov.', 'Dic.'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom.', 'Lun.', 'Mar.', 'Mié.', 'Jue.', 'Vie.', 'Sáb.'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

export const CalendarioScreen = ({ navigation }: any) => {
  const context = useContext(AppContext);
  const currentUser = context?.currentUser;
  const allPlannings = context?.plannings || [];
  const allSites = context?.sites || [];
  const allUsers = context?.users || [];
  
  const notifications = context?.notifications || [];
  const unreadNotificationsCount = context?.unreadNotificationsCount || 0;
  const markNotificationAsRead = context?.markNotificationAsRead;
  const markAllNotificationsAsRead = context?.markAllNotificationsAsRead;
  const deleteNotification = context?.deleteNotification;

  const todayString = getSantiagoTodayString();
  const [selectedDate, setSelectedDate] = useState(todayString);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 15000); // refresh every 15 seconds
    return () => clearInterval(timer);
  }, []);

  // Animación del Bottom Sheet (Contiene el Calendario)
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

  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const [isPlanningModalVisible, setIsPlanningModalVisible] = useState(false);
  const [isNotificationsModalVisible, setIsNotificationsModalVisible] = useState(false);
  const [modalSelectedProject, setModalSelectedProject] = useState<string | null>(null);
  const [modalSelectedSite, setModalSelectedSite] = useState<string | null>(null);
  const [modalSelectedWorker, setModalSelectedWorker] = useState<string | null>(null);

  const modalSiteOptions = allSites
    .filter(s => {
      const isEjecutado = s.estadoExcel === 'Ejecutado' || allPlannings.some(p => p.siteId === s.id && p.status === 'Ejecutado');
      const isEnEjecucion = s.estadoExcel === 'En ejecución' || allPlannings.some(p => p.siteId === s.id && p.status === 'En ejecución');
      if (isEjecutado || isEnEjecucion) return false;
      return !modalSelectedProject || s.proyecto === modalSelectedProject;
    })
    .map(s => ({ id: s.id, label: `${s.code} - ${s.name}` }));

  const modalWorkerOptions = allUsers
    .filter(u => u.role === 'Trabajador')
    .map(u => ({ id: u.id, label: u.name }));

  const handleModalPlanificar = () => {
    if (!modalSelectedProject || !modalSelectedSite || !modalSelectedWorker) {
      Alert.alert('Faltan datos', 'Debes seleccionar un proyecto, un sitio y un trabajador.');
      return;
    }

    const plannedForToday = allPlannings.find(p => p.siteId === modalSelectedSite && p.date === todayString);
    if (plannedForToday && selectedDate !== todayString) {
      Alert.alert('Restricción', 'Este sitio ya está planificado para el día de hoy y no se puede planificar para un día diferente.');
      return;
    }

    if (selectedDate < todayString) {
      Alert.alert('Restricción', 'No puedes planificar o replanificar para una fecha anterior a la de hoy.');
      return;
    }

    const existingPlanning = allPlannings.find(p => p.siteId === modalSelectedSite && p.date === selectedDate);
    if (existingPlanning) {
      if (existingPlanning.workerId !== modalSelectedWorker) {
        const resetFields = {
          startTime: null,
          endTime: null,
          datosGenerales: null,
          hallazgos: null,
          evidenciaSalida: null,
          apagado3G: null,
          apagadoBAFI: null,
          apagadoAntenaSector1: null,
          apagadoAntenaSector2: null,
          apagadoAntenaSector3: null,
          configurarRETU: null,
          cambioChapa: null,
        };
        context?.updatePlanning(existingPlanning.id, {
          workerId: modalSelectedWorker,
          status: 'Planificado',
          ...resetFields
        } as any);
        setModalSelectedProject(null);
        setModalSelectedSite(null);
        setModalSelectedWorker(null);
        setIsPlanningModalVisible(false);
        Alert.alert('Éxito', 'Planificación actualizada correctamente.');
        return;
      }
      Alert.alert('Sitio ya planificado', 'Este sitio ya está planificado para este día con el mismo trabajador.');
      return;
    }

    context?.addPlanning({
      siteId: modalSelectedSite,
      workerId: modalSelectedWorker,
      date: selectedDate,
      status: 'Planificado'
    });

    setModalSelectedProject(null);
    setModalSelectedSite(null);
    setModalSelectedWorker(null);
    setIsPlanningModalVisible(false);
    Alert.alert('Éxito', 'Sitio planificado correctamente.');
  };

  const projectsList = Array.from(new Set(
    allSites
      .map(s => s.proyecto)
      .filter((p): p is string => !!p)
  ));
  const projectOptions = [
    { id: 'Todos', label: 'Todos' },
    ...projectsList.map(p => ({ id: p, label: p }))
  ];

  const statusOptions = [
    { id: 'Todos', label: 'Todos' },
    { id: 'Planificado', label: 'Planificado' },
    { id: 'En ejecución', label: 'En ejecución' },
    { id: 'Ejecutado', label: 'Ejecutado' },
    { id: 'Pospuesto', label: 'Pospuesto' },
  ];

  // Filtrar planificaciones
  const workerPlannings = allPlannings.filter(p => {
    const isOwner = currentUser?.role === 'Trabajador' ? p.workerId === currentUser?.id : true;
    if (!isOwner) return false;

    if (currentUser?.role !== 'Trabajador') {
      const site = allSites.find(s => s.id === p.siteId);
      if (!site) return false;
      if (selectedProject && selectedProject !== 'Todos' && site.proyecto !== selectedProject) {
        return false;
      }
      if (selectedStatus && selectedStatus !== 'Todos' && p.status !== selectedStatus) {
        return false;
      }
    }
    return (p.status === 'Planificado' || p.status === 'En ejecución' || p.status === 'Ejecutado' || p.status === 'Pospuesto');
  });

  // Marcar fechas en el calendario
  const markedDates: any = {};
  workerPlannings.forEach(p => {
    markedDates[p.date] = { 
      marked: true, 
      dotColor: '#0A84FF',
      selected: p.date === selectedDate,
      selectedColor: p.date === selectedDate ? '#0A84FF' : undefined,
    };
  });
  if (!markedDates[selectedDate]) {
    markedDates[selectedDate] = { selected: true, selectedColor: '#0A84FF' };
  }

  // Plannings del día seleccionado
  const planningsForSelectedDate = workerPlannings.filter(p => p.date === selectedDate);

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

  const renderPlanningItem = ({ item }: { item: any }) => {
    const site = allSites.find(s => s.id === item.siteId);
    if (!site) return null;

    const worker = allUsers.find(u => u.id === item.workerId);

    return (
      <TouchableOpacity 
        style={styles.listItem}
        onPress={() => navigation.navigate('Actividad', { autoSelectSiteId: item.siteId })}
      >
        <View style={[
          styles.listItemIcon, 
          { 
            backgroundColor: item.status === 'Ejecutado' ? colors.success + '15' :
                            item.status === 'En ejecución' ? 'rgba(255, 149, 0, 0.15)' : 
                            item.status === 'Pospuesto' ? colors.danger + '15' : 'rgba(10, 132, 255, 0.15)' 
          }
        ]}>
          <Ionicons 
            name={item.status === 'Ejecutado' ? "checkmark-done-circle" : 
                  item.status === 'En ejecución' ? "time" : 
                  item.status === 'Pospuesto' ? "close-circle" : "calendar"} 
            size={24} 
            color={item.status === 'Ejecutado' ? colors.success : 
                   item.status === 'En ejecución' ? "#FF9500" : 
                   item.status === 'Pospuesto' ? colors.danger : "#0A84FF"} 
          />
        </View>
        <View style={styles.listItemText}>
          <Text style={styles.listItemTitle}>{site.code} - {site.name}</Text>
          <Text style={[styles.statusText, { 
            color: item.status === 'Ejecutado' ? colors.success : 
                   item.status === 'En ejecución' ? '#FF9500' : 
                   item.status === 'Pospuesto' ? colors.danger : '#0A84FF' 
          }]}>
            {item.status === 'Ejecutado' && item.endTime ? `Ejecutado • Fin: ${formatTime(item.endTime)}` : 
             item.status === 'En ejecución' ? `En ejecución • ${getElapsedTime(item.startTime)}` : 
             item.status === 'Pospuesto' ? 'Pospuesto' : item.status}
            {currentUser?.role !== 'Trabajador' && worker ? ` • ${worker.name}` : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.3)" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContent}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Actividades del día</Text>
            <Text style={styles.headerSubtitle}>{selectedDate}</Text>
            {currentUser?.role !== 'Trabajador' && (
              <TouchableOpacity 
                style={styles.newPlanningTextButton} 
                onPress={() => {
                  if (selectedDate < todayString) {
                    Alert.alert('Restricción', 'No puedes planificar visitas para fechas anteriores a hoy.');
                    return;
                  }
                  setIsPlanningModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.newPlanningTextButtonText}>Nueva Planificación</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TouchableOpacity 
              style={styles.notificationButton} 
              onPress={() => setIsNotificationsModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications" size={24} color="#fff" />
              {unreadNotificationsCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unreadNotificationsCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {currentUser?.role !== 'Trabajador' && (
          <View style={styles.filtersRow}>
            <View style={styles.filterWrapper}>
              <SelectDropdown
                label="Proyecto"
                value={selectedProject}
                options={projectOptions}
                onSelect={setSelectedProject}
                placeholder="Todos"
              />
            </View>
            <View style={styles.filterWrapper}>
              <SelectDropdown
                label="Estado"
                value={selectedStatus}
                options={statusOptions}
                onSelect={setSelectedStatus}
                placeholder="Todos"
              />
            </View>
          </View>
        )}
        
        <FlatList
          data={planningsForSelectedDate}
          keyExtractor={item => item.id}
          renderItem={renderPlanningItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={60} color="rgba(255, 255, 255, 0.1)" />
              <Text style={styles.emptyText}>No hay actividades registradas para este día.</Text>
            </View>
          }
        />
      </View>

      <Animated.View style={[styles.bottomSheet, { height: sheetHeight }]}>
        <View style={styles.sheetHandleContainer} {...panResponder.panHandlers}>
          <TouchableOpacity style={styles.sheetHandleTapArea} onPress={toggleSheet} activeOpacity={0.8}>
            <View style={styles.sheetHandle} />
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.sheetContent, { opacity: contentOpacity }]}>
          <Calendar
            current={selectedDate}
            minDate={currentUser?.role === 'Trabajador' ? todayString : undefined}
            onDayPress={(day: any) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'transparent',
              textSectionTitleColor: 'rgba(255, 255, 255, 0.5)',
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
        </Animated.View>
      </Animated.View>

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
              <Text style={styles.modalSubtitle}>Fecha: {selectedDate}</Text>
            </View>

            <View style={styles.modalForm}>
              <SelectDropdown 
                label="1. Seleccionar Proyecto"
                value={modalSelectedProject}
                options={projectOptions.filter(o => o.id !== 'Todos')}
                onSelect={(val) => {
                  setModalSelectedProject(val);
                  setModalSelectedSite(null);
                }}
                placeholder="Elegir proyecto..."
              />

              <SelectDropdown 
                label="2. Seleccionar Sitio"
                value={modalSelectedSite}
                options={modalSiteOptions}
                onSelect={modalSelectedProject ? setModalSelectedSite : () => {}}
                placeholder={modalSelectedProject ? "Elegir sitio..." : "Selecciona primero un proyecto"}
                disabled={!modalSelectedProject}
                searchable={true}
              />

              <SelectDropdown 
                label="3. Asignar Trabajador"
                value={modalSelectedWorker}
                options={modalWorkerOptions}
                onSelect={setModalSelectedWorker}
                placeholder="Elegir trabajador..."
                searchable={true}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} 
                  onPress={() => {
                    setModalSelectedProject(null);
                    setModalSelectedSite(null);
                    setModalSelectedWorker(null);
                    setIsPlanningModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalBtnText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: '#0A84FF' }]} 
                  onPress={handleModalPlanificar}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalBtnText}>Planificar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Notificaciones */}
      <Modal
        visible={isNotificationsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsNotificationsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="notifications" size={24} color="#0A84FF" />
                <Text style={styles.modalTitle}>Notificaciones</Text>
              </View>
              <TouchableOpacity 
                style={[styles.closeBtn, { position: 'absolute', top: 14, right: 20 }]} 
                onPress={() => setIsNotificationsModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="rgba(255, 255, 255, 0.6)" />
              </TouchableOpacity>
            </View>

            {notifications.length > 0 && (
              <TouchableOpacity 
                style={styles.markAllReadBtn}
                onPress={() => markAllNotificationsAsRead?.()}
              >
                <Ionicons name="checkmark-done" size={16} color="#0A84FF" />
                <Text style={styles.markAllReadText}>Marcar todas como leídas</Text>
              </TouchableOpacity>
            )}

            <FlatList
              data={notifications}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => {
                const isUnread = !item.is_read;
                const formattedDate = new Date(item.created_at).toLocaleString('es-CL', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <View
                    style={[styles.notificationItem, isUnread && styles.notificationItemUnread]}
                  >
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                      onPress={() => {
                        if (isUnread) {
                          markNotificationAsRead?.(item.id);
                        }
                        setIsNotificationsModalVisible(false);
                        const targetSiteId = item.site_id || context?.plannings.find(p => p.id === item.planning_id)?.siteId;
                        if (targetSiteId) {
                          navigation.navigate('Actividad', { autoSelectSiteId: targetSiteId });
                        }
                      }}
                    >
                      <View style={styles.notificationIconCol}>
                        <View style={[
                          styles.notificationIconBg,
                          { 
                            backgroundColor: item.type === 'planning_reopened' 
                              ? 'rgba(255, 69, 58, 0.15)' 
                              : item.type === 'planning_executed'
                              ? 'rgba(48, 209, 88, 0.15)'
                              : 'rgba(10, 132, 255, 0.15)' 
                          }
                        ]}>
                          <Ionicons 
                            name={
                              item.type === 'planning_reopened' ? 'refresh' :
                              item.type === 'planning_executed' ? 'checkmark-done-circle' :
                              'calendar'
                            } 
                            size={20} 
                            color={
                              item.type === 'planning_reopened' ? '#FF453A' :
                              item.type === 'planning_executed' ? '#30D158' :
                              '#0A84FF'
                            } 
                          />
                        </View>
                      </View>
                      <View style={styles.notificationTextCol}>
                        <Text style={[styles.notificationMsg, isUnread && styles.notificationMsgUnread]}>
                          {item.message}
                        </Text>
                        <Text style={styles.notificationTime}>{formattedDate}</Text>
                      </View>
                      {isUnread && <View style={styles.unreadIndicatorDot} />}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ padding: 8, marginLeft: 8 }}
                      onPress={() => deleteNotification?.(item.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color="rgba(255, 69, 58, 0.65)" />
                    </TouchableOpacity>
                  </View>
                );
              }}
              contentContainerStyle={styles.notificationsListContent}
              ListEmptyComponent={
                <View style={styles.emptyNotificationsContainer}>
                  <Ionicons name="notifications-off-outline" size={48} color="rgba(255, 255, 255, 0.15)" />
                  <Text style={styles.emptyNotificationsText}>No tienes notificaciones por ahora.</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 25,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'capitalize',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0A84FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '85%',
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
  listContent: {
    paddingBottom: 150, // Espacio para que el panel no tape el último item
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  listItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  listItemText: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  listItemSub: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0A84FF',
    marginTop: 2,
  },
  emptyContainer: {
    marginTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 20,
    fontSize: 16,
    paddingHorizontal: 40,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 50 : 15,
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
  sheetContent: {
    paddingHorizontal: 10,
    paddingBottom: 85,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 15,
  },
  filterWrapper: {
    flex: 1,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginRight: 15,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF453A',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginRight: 20,
    marginVertical: 10,
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
  },
  markAllReadText: {
    color: '#0A84FF',
    fontSize: 13,
    fontWeight: '600',
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    position: 'relative',
  },
  notificationItemUnread: {
    backgroundColor: 'rgba(10, 132, 255, 0.03)',
  },
  notificationIconCol: {
    marginRight: 14,
  },
  notificationIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationTextCol: {
    flex: 1,
  },
  notificationMsg: {
    fontSize: 14.5,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 20,
  },
  notificationMsgUnread: {
    color: '#ffffff',
    fontWeight: '500',
  },
  notificationTime: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 5,
  },
  unreadIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0A84FF',
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -4,
  },
  notificationsListContent: {
    paddingBottom: 40,
  },
  emptyNotificationsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 15,
  },
  emptyNotificationsText: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 14,
    textAlign: 'center',
  },
  newPlanningTextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A84FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  newPlanningTextButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
