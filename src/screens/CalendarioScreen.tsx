import React, { useContext, useState } from 'react';
import { View, StyleSheet, SafeAreaView, Text, FlatList, TouchableOpacity } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { AppContext } from '../context/AppContext';

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

  // Fecha actual YYYY-MM-DD
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [selectedDate, setSelectedDate] = useState(todayString);

  // Filtrar planificaciones del trabajador, que sean Planificadas y fecha >= hoy
  const workerPlannings = allPlannings.filter(p => {
    if (p.workerId !== currentUser?.id) return false;
    if (p.status !== 'Planificado') return false;
    // Solo mostrar fecha actual o futura (comparación string simple funciona para YYYY-MM-DD)
    if (p.date < todayString) return false; 
    return true;
  });

  // Crear objeto markedDates para el calendario
  const markedDates: any = {};
  workerPlannings.forEach(p => {
    markedDates[p.date] = { 
      marked: true, 
      dotColor: colors.primary,
      selected: p.date === selectedDate,
      selectedColor: p.date === selectedDate ? colors.primary : undefined,
    };
  });

  // Asegurar que la fecha seleccionada siempre se marque, aunque no tenga planificación
  if (!markedDates[selectedDate]) {
    markedDates[selectedDate] = { selected: true, selectedColor: colors.primary };
  }

  // Filtrar plannings del día seleccionado
  const planningsForSelectedDate = workerPlannings.filter(p => p.date === selectedDate);

  const renderSiteCard = ({ item }: { item: any }) => {
    const site = allSites.find(s => s.id === item.siteId);
    if (!site) return null;

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('DetalleActividad', { planningId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.siteCode}>{site.code}</Text>
          <Text style={styles.siteName}>{site.name}</Text>
        </View>
        <View style={styles.cardBody}>
          <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.siteAddress}>{site.address}, {site.commune}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi Calendario</Text>
      </View>
      
      <View style={styles.calendarContainer}>
        <Calendar
          current={todayString}
          minDate={todayString}
          onDayPress={(day: any) => setSelectedDate(day.dateString)}
          markedDates={markedDates}
          theme={{
            backgroundColor: colors.background,
            calendarBackground: colors.surface,
            textSectionTitleColor: colors.textSecondary,
            selectedDayBackgroundColor: colors.primary,
            selectedDayTextColor: colors.surface,
            todayTextColor: colors.primary,
            dayTextColor: colors.text,
            textDisabledColor: '#d9e1e8',
            dotColor: colors.primary,
            selectedDotColor: colors.surface,
            arrowColor: colors.primary,
            monthTextColor: colors.text,
            textDayFontWeight: '500',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '600'
          }}
        />
      </View>

      <View style={styles.agendaContainer}>
        <Text style={styles.agendaTitle}>Planificadas para el {selectedDate}</Text>
        <FlatList
          data={planningsForSelectedDate}
          keyExtractor={item => item.id}
          renderItem={renderSiteCard}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No tienes actividades planificadas para este día.</Text>
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  calendarContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  agendaContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  agendaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    padding: 16,
    paddingBottom: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  siteCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.secondary,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  siteName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  siteAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 24,
    fontSize: 14,
  }
});
