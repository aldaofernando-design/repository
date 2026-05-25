import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, Dimensions, Animated, TouchableOpacity, FlatList, Modal, Alert, PanResponder, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { AppContext } from '../context/AppContext';
import { getElapsedTime, formatTime } from '../services/timeUtils';
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

  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
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

  const [isPlanningModalVisible, setIsPlanningModalVisible] = useState(false);
  const [modalSelectedProject, setModalSelectedProject] = useState<string | null>(null);
  const [modalSelectedSite, setModalSelectedSite] = useState<string | null>(null);
  const [modalSelectedWorker, setModalSelectedWorker] = useState<string | null>(null);

  const modalSiteOptions = allSites
    .filter(s => {
      const isEjecutado = s.estadoExcel === 'Ejecutado' || allPlannings.some(p => p.siteId === s.id && p.status === 'Ejecutado');
      if (isEjecutado) return false;
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

    const existingPlanning = allPlannings.find(p => p.siteId === modalSelectedSite && p.date === selectedDate);
    if (existingPlanning) {
      Alert.alert('Sitio ya planificado', 'Este sitio ya está planificado para este día.');
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
    { id: 'Todos', label: 'Todos los Proyectos' },
    ...projectsList.map(p => ({ id: p, label: p }))
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
          </View>
          {currentUser?.role !== 'Trabajador' && (
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={() => setIsPlanningModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {currentUser?.role !== 'Trabajador' && (
          <View style={{ marginBottom: 15 }}>
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
            minDate={todayString}
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
              />

              <SelectDropdown 
                label="3. Asignar Trabajador"
                value={modalSelectedWorker}
                options={modalWorkerOptions}
                onSelect={setModalSelectedWorker}
                placeholder="Elegir trabajador..."
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
  sheetContent: {
    paddingHorizontal: 10,
    paddingBottom: Platform.OS === 'android' ? 100 : 85,
  },
});
