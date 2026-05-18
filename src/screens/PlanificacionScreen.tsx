import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { AppContext } from '../context/AppContext';
import { SelectDropdown } from '../components/SelectDropdown';
import { ConfirmationModal } from '../components/ConfirmationModal';

export const PlanificacionScreen = ({ navigation }: any) => {
  const context = useContext(AppContext);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Modal States
  const [workerModal, setWorkerModal] = useState<{ visible: boolean, siteId: string, workerId: string }>({ visible: false, siteId: '', workerId: '' });
  const [dateModal, setDateModal] = useState<{ visible: boolean, planning: any }>({ visible: false, planning: null });
  const [successModal, setSuccessModal] = useState({ visible: false, message: '' });

  // 1. Filter Sites (Status !== Ejecutado)
  const siteStatusMap = context?.plannings.reduce((acc, plan) => {
    acc[plan.siteId] = plan.status;
    return acc;
  }, {} as Record<string, string>) || {};

  const availableSites = (context?.sites || []).filter(site => {
    const status = siteStatusMap[site.id] || site.estadoExcel || 'Sin Asignar';
    return ['Planificado', 'Sin iniciar', 'Sin Asignar', 'Sin asignar', 'En ejecución'].includes(status);
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

  const handleSiteSelect = (siteId: string) => {
    const existingPlanning = context?.plannings.find(p => p.siteId === siteId);
    
    if (existingPlanning) {
      if (existingPlanning.workerId) {
        setWorkerModal({ visible: true, siteId, workerId: existingPlanning.workerId });
      } else {
        setSelectedSite(siteId);
        setSelectedWorker(null); // Resetear trabajador si no tiene asignado
        checkPlanningDate(existingPlanning);
      }
    } else {
      setSelectedSite(siteId);
      setSelectedWorker(null); // Resetear trabajador si el sitio es nuevo en planificación
    }
  };

  const confirmWorkerChange = () => {
    const { siteId, workerId } = workerModal;
    setSelectedSite(siteId);
    setSelectedWorker(workerId);
    setWorkerModal({ ...workerModal, visible: false });
    
    const existingPlanning = context?.plannings.find(p => p.siteId === siteId);
    if (existingPlanning) checkPlanningDate(existingPlanning);
  };

  const checkPlanningDate = (planning: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [year, month, day] = planning.date.split('-').map(Number);
    const planDate = new Date(year, month - 1, day);

    if (planDate < today) {
      setDateModal({ visible: true, planning });
    } else {
      setDate(planDate);
    }
  };

  const confirmDateUpdate = () => {
    setDateModal({ ...dateModal, visible: false });
    setShowDatePicker(true);
  };

  const handlePlanificar = () => {
    if (!selectedSite || !selectedWorker) {
      Alert.alert('Faltan datos', 'Debes seleccionar un sitio y un trabajador.');
      return;
    }

    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const existingPlanning = context?.plannings.find(p => p.siteId === selectedSite);

    if (existingPlanning) {
      context?.updatePlanning(existingPlanning.id, {
        workerId: selectedWorker,
        date: dateString,
        status: 'Planificado'
      });
      setSuccessModal({ visible: true, message: 'Planificación actualizada correctamente' });
    } else {
      context?.addPlanning({
        siteId: selectedSite,
        workerId: selectedWorker,
        date: dateString,
        status: 'Planificado'
      });
      setSuccessModal({ visible: true, message: 'Actividad planificada correctamente' });
    }
  };

  const resetForm = () => {
    setSelectedSite(null);
    setSelectedWorker(null);
    setDate(new Date());
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Nueva Planificación</Text>
        
        <SelectDropdown 
          label="1. Seleccionar Sitio"
          value={selectedSite}
          options={siteOptions}
          onSelect={handleSiteSelect}
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
                  onChange={onChangeDate}
                />
              )}
            </>
          )}
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handlePlanificar}>
          <Text style={styles.submitBtnText}>Planificar Actividad</Text>
        </TouchableOpacity>

        {/* Modales Interactivos */}
        <ConfirmationModal 
          visible={workerModal.visible}
          title="Sitio Asignado"
          message="Este sitio ya tiene un trabajador responsable. ¿Deseas cambiar el responsable?"
          icon="people-outline"
          confirmLabel="Sí, cambiar"
          onConfirm={confirmWorkerChange}
          onCancel={() => setWorkerModal({ ...workerModal, visible: false })}
        />

        <ConfirmationModal 
          visible={dateModal.visible}
          title="Fecha Desactualizada"
          message="La fecha de planificación es anterior al día de hoy. ¿Deseas actualizarla?"
          icon="time-outline"
          confirmLabel="Sí, actualizar"
          onConfirm={confirmDateUpdate}
          onCancel={() => {
            setDate(new Date(dateModal.planning.date));
            setDateModal({ ...dateModal, visible: false });
          }}
        />

        <ConfirmationModal 
          visible={successModal.visible}
          title="Éxito"
          message={successModal.message}
          icon="checkmark-circle-outline"
          confirmLabel="Excelente"
          cancelLabel="Cerrar"
          onConfirm={() => {
            setSuccessModal({ ...successModal, visible: false });
            resetForm();
          }}
          onCancel={() => {
            setSuccessModal({ ...successModal, visible: false });
            resetForm();
          }}
        />
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
