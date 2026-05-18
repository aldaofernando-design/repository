import React, { useContext, useState, useRef } from 'react';
import { View, StyleSheet, Text, Dimensions, Animated, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { AppContext } from '../context/AppContext';
import { getElapsedTime, formatTime } from '../services/timeUtils';

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

  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [selectedDate, setSelectedDate] = useState(todayString);

  // Animación del Bottom Sheet (Contiene el Calendario)
  const [sheetState, setSheetState] = useState<'hidden' | 'half'>('half');
  const sheetHeight = useRef(new Animated.Value(SHEET_MID_HEIGHT)).current;

  const contentOpacity = sheetHeight.interpolate({
    inputRange: [SHEET_MIN_HEIGHT, SHEET_MIN_HEIGHT + 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Filtrar planificaciones del trabajador (Planificado o En ejecución)
  const workerPlannings = allPlannings.filter(p => 
    p.workerId === currentUser?.id && 
    (p.status === 'Planificado' || p.status === 'En ejecución' || p.status === 'Ejecutado')
  );

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

    return (
      <TouchableOpacity 
        style={styles.listItem}
        onPress={() => navigation.navigate('Actividad', { autoSelectSiteId: item.siteId })}
      >
        <View style={[
          styles.listItemIcon, 
          { 
            backgroundColor: item.status === 'Ejecutado' ? colors.success + '15' :
                            item.status === 'En ejecución' ? 'rgba(255, 149, 0, 0.15)' : 'rgba(10, 132, 255, 0.15)' 
          }
        ]}>
          <Ionicons 
            name={item.status === 'Ejecutado' ? "checkmark-done-circle" : item.status === 'En ejecución' ? "time" : "calendar"} 
            size={24} 
            color={item.status === 'Ejecutado' ? colors.success : item.status === 'En ejecución' ? "#FF9500" : "#0A84FF"} 
          />
        </View>
        <View style={styles.listItemText}>
          <Text style={styles.listItemTitle}>{site.code} - {site.name}</Text>
          <Text style={[styles.statusText, { 
            color: item.status === 'Ejecutado' ? colors.success : item.status === 'En ejecución' ? '#FF9500' : '#0A84FF' 
          }]}>
            {item.status === 'Ejecutado' ? `Ejecutado • ${formatTime(item.endTime)}` : 
             item.status === 'En ejecución' ? `En ejecución • ${getElapsedTime(item.startTime)}` : item.status}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.3)" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContent}>
        <Text style={styles.headerTitle}>Actividades del día</Text>
        <Text style={styles.headerSubtitle}>{selectedDate}</Text>
        
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
        <TouchableOpacity style={styles.sheetHandleContainer} onPress={toggleSheet} activeOpacity={1}>
          <View style={styles.sheetHandle} />
        </TouchableOpacity>

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
    marginBottom: 30,
    textTransform: 'capitalize',
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
  sheetHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  sheetContent: {
    paddingHorizontal: 10,
  },
});
