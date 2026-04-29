import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import { sites, users } from '../data/mockData';

export const PlanificacionScreen = () => {
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const workers = users.filter(u => u.role === 'Trabajador');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Nueva Planificación</Text>
        
        <View style={styles.section}>
          <Text style={styles.label}>1. Seleccionar Sitio</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
            {sites.map(site => (
              <TouchableOpacity 
                key={site.id} 
                style={[styles.chip, selectedSite === site.id && styles.chipSelected]}
                onPress={() => setSelectedSite(site.id)}
              >
                <Text style={[styles.chipText, selectedSite === site.id && styles.chipTextSelected]}>
                  {site.code}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>2. Asignar Trabajador</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
            {workers.map(worker => (
              <TouchableOpacity 
                key={worker.id} 
                style={[styles.chip, selectedWorker === worker.id && styles.chipSelected]}
                onPress={() => setSelectedWorker(worker.id)}
              >
                <Text style={[styles.chipText, selectedWorker === worker.id && styles.chipTextSelected]}>
                  {worker.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>3. Fecha de Planificación</Text>
          <View style={styles.dateBox}>
             <Text style={styles.dateText}>05 Mayo 2026</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.submitBtn}>
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
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  hScroll: {
    flexDirection: 'row',
  },
  chip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.text,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: colors.surface,
  },
  dateBox: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: colors.success,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
