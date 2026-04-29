import React from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, Text } from 'react-native';
import { ActivityCard } from '../components/ActivityCard';
import { plannings, sites, users } from '../data/mockData';
import { colors } from '../theme/colors';

export const ActividadScreen = ({ navigation }: any) => {
  // Simulando vista de Administrador (ve todas las planificaciones)
  const renderItem = ({ item }: { item: any }) => {
    const site = sites.find(s => s.id === item.siteId);
    const worker = users.find(u => u.id === item.workerId);
    
    return (
      <ActivityCard 
        planning={item} 
        site={site} 
        worker={worker} 
        onPress={() => navigation.navigate('DetalleActividad', { planningId: item.id })}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Actividades Planificadas</Text>
      </View>
      <FlatList
        data={plannings}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
      />
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
  list: {
    padding: 16,
  },
});
