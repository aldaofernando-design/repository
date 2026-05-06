import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { AppContext } from '../context/AppContext';
import { SelectDropdown } from '../components/SelectDropdown';

export const PlanificacionScreen = ({ navigation }: any) => {
  const context = useContext(AppContext);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 1. Filter Sites (Status !== Ejecutado)
  const siteStatusMap = context?.plannings.reduce((acc, plan) => {
    acc[plan.siteId] = plan.status;
    return acc;
  }, {} as Record<string, string>) || {};

  const availableSites = (context?.sites || []).filter(site => {
    const status = siteStatusMap[site.id] || 'Sin Asignar';
    return status !== 'Ejecutado';
  });

  const siteOptions = availableSites.map(s => ({
    id: s.id,
    label: `${s.code} - ${s.name}`,
    subLabel: `${s.address}, ${s.commune}`,
  }));

  // 2. Filter Workers
  const workers = (context?.users || []).filter(u => u.role === 'Trabajador');
  const workerOptions = workers.map(w => ({
    id: w.id,
    label: w.name,
    subLabel: `${w.company} (${w.phone})`,
  }));

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handlePlanificar = () => {
    if (!selectedSite || !selectedWorker) {
      Alert.alert('Faltan datos', 'Debes seleccionar un sitio y un trabajador.');
      return;
    }

    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    context?.addPlanning({
      siteId: selectedSite,
      workerId: selectedWorker,
      date: dateString,
      status: 'Planificado'
    });

    Alert.alert('Éxito', 'Actividad planificada correctamente', [
      { text: 'OK', onPress: () => {
        setSelectedSite(null);
        setSelectedWorker(null);
        setDate(new Date());
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Nueva Planificación</Text>
        
        <SelectDropdown 
          label="1. Seleccionar Sitio"
          value={selectedSite}
          options={siteOptions}
          onSelect={setSelectedSite}
          placeholder="Toca para elegir un sitio..."
          searchable
        />

        <SelectDropdown 
          label="2. Asignar Trabajador"
          value={selectedWorker}
          options={workerOptions}
          onSelect={setSelectedWorker}
          placeholder="Toca para elegir un trabajador..."
        />

        <View style={styles.section}>
          <Text style={styles.label}>3. Fecha de Planificación</Text>
          {Platform.OS === 'ios' ? (
            <View style={styles.iosDateContainer}>
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={onChangeDate}
              />
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.dateBox} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={onChangeDate}
                />
              )}
            </>
          )}
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handlePlanificar}>
          <Text style={styles.submitBtnText}>Planificar Actividad</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  dateBox: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  iosDateContainer: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    alignItems: 'flex-start',
  },
  submitBtn: {
    backgroundColor: colors.success,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
