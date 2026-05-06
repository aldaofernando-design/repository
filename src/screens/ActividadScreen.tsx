import React, { useContext, useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, Text, Dimensions, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { ActivityCard } from '../components/ActivityCard';
import { colors } from '../theme/colors';
import { AppContext } from '../context/AppContext';

const { height: screenHeight } = Dimensions.get('window');

export const ActividadScreen = ({ navigation }: any) => {
  const context = useContext(AppContext);
  const currentUser = context?.currentUser;
  
  const allPlannings = context?.plannings || [];
  const allSites = context?.sites || [];
  const allUsers = context?.users || [];

  const [locationPermission, setLocationPermission] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'No podremos mostrar tu ubicación actual en el mapa.');
        return;
      }
      setLocationPermission(true);
    })();
  }, []);

  // Función auxiliar para tener la fecha local YYYY-MM-DD correcta en base al huso horario
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Filter logic
  const filteredPlannings = allPlannings.filter(planning => {
    // 1. Mostrar si está 'En ejecución' o si está 'Planificado' PARA HOY
    const isEnEjecucion = planning.status === 'En ejecución';
    const isPlanificadoHoy = planning.status === 'Planificado' && planning.date === todayString;
    
    if (!isEnEjecucion && !isPlanificadoHoy) return false;

    // 2. Check Role
    if (currentUser?.role === 'Trabajador') {
      return planning.workerId === currentUser.id;
    }
    
    return true;
  });

  const planningsParaMapa = filteredPlannings.filter(p => p.status === 'Planificado' && p.date === todayString);

  const renderItem = ({ item }: { item: any }) => {
    const site = allSites.find(s => s.id === item.siteId);
    const worker = allUsers.find(u => u.id === item.workerId);
    
    return (
      <ActivityCard 
        planning={item} 
        site={site} 
        worker={worker} 
        onPress={() => navigation.navigate('DetalleActividad', { planningId: item.id })}
      />
    );
  };

  // Coordenadas de inicio (Santiago por defecto si no hay sitios)
  const mapRegion = {
    latitude: -33.4489,
    longitude: -70.6693,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  if (planningsParaMapa.length > 0) {
    const firstSite = allSites.find(s => s.id === planningsParaMapa[0].siteId);
    if (firstSite) {
      mapRegion.latitude = firstSite.lat;
      mapRegion.longitude = firstSite.lng;
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Actividades ({todayString})</Text>
      </View>
      
      <View style={styles.listContainer}>
        <FlatList
          data={filteredPlannings}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay actividades en ejecución o planificadas para hoy.</Text>
          }
        />
      </View>

      <View style={styles.mapContainer}>
        <Text style={styles.mapTitle}>Mapa de Sitios Planificados (Hoy)</Text>
        <MapView 
          style={styles.map} 
          initialRegion={mapRegion}
          showsUserLocation={locationPermission}
          showsMyLocationButton={locationPermission}
        >
          {planningsParaMapa.map(plan => {
            const site = allSites.find(s => s.id === plan.siteId);
            if (!site) return null;
            return (
              <Marker
                key={plan.id}
                coordinate={{ latitude: site.lat, longitude: site.lng }}
                title={site.name}
                description={site.code}
                pinColor={colors.warning}
              />
            );
          })}
        </MapView>
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
  listContainer: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 32,
    fontSize: 16,
    paddingHorizontal: 20,
  },
  mapContainer: {
    height: screenHeight * 0.4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    padding: 12,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  map: {
    flex: 1,
  }
});
