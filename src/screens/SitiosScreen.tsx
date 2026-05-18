import React, { useContext, useEffect, useState, useRef } from 'react';
import { View, FlatList, StyleSheet, Text, Dimensions, Alert, TouchableOpacity, Animated, TextInput, ScrollView } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { AppContext } from '../context/AppContext';
import { exportDatabase } from '../services/exportService';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const SHEET_MIN_HEIGHT = 110;
const SHEET_MID_HEIGHT = 500;
const SHEET_MAX_HEIGHT = screenHeight - 150;

export const SitiosScreen = ({ navigation }: any) => {
  const context = useContext(AppContext);
  const sites = context?.sites || [];
  const plannings = context?.plannings || [];

  const [locationPermission, setLocationPermission] = useState(false);
  const mapRef = useRef<MapView>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('satellite');

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [selectedCommune, setSelectedCommune] = useState('Todas');

  const uniqueCommunes = ['Todas', ...Array.from(new Set(sites.map(s => s.commune)))];
  const statuses = ['Todos', 'Planificado', 'Ejecutado', 'Sin Asignar'];

  // Animación del Bottom Sheet
  const [sheetState, setSheetState] = useState<'hidden' | 'half' | 'full'>('half');
  const sheetHeight = useRef(new Animated.Value(SHEET_MID_HEIGHT)).current;

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
    let nextState: 'hidden' | 'half' | 'full' = 'half';
    let toValue = SHEET_MID_HEIGHT;

    if (sheetState === 'half') {
      nextState = 'full';
      toValue = SHEET_MAX_HEIGHT;
    } else if (sheetState === 'full') {
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
    mapRef.current?.animateToRegion({
      latitude: site.lat,
      longitude: site.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 1000);
    setSelectedSiteId(site.id);
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

  const filteredSites = sites.filter(site => {
    const status = site.estadoExcel || 'Sin Asignar';
    const matchesSearch = site.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          site.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'Todos' || status === selectedStatus;
    const matchesCommune = selectedCommune === 'Todas' || site.commune === selectedCommune;

    return matchesSearch && matchesStatus && matchesCommune;
  });

  const renderSiteItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.listItem}
      onPress={() => {
        if (context?.currentUser?.role === 'Trabajador') {
          navigation.navigate('Actividad');
        } else {
          focusOnSite(item);
        }
      }}
    >
      <View style={[
        styles.listItemIcon, 
        { backgroundColor: item.estadoExcel === 'Ejecutado' ? '#30D15820' : '#0A84FF20' }
      ]}>
        <Ionicons 
          name="business" 
          size={24} 
          color={item.estadoExcel === 'Ejecutado' ? '#30D158' : '#0A84FF'} 
        />
      </View>
      <View style={styles.listItemText}>
        <Text style={styles.listItemTitle}>{item.code} - {item.name}</Text>
        <Text style={styles.listItemSub}>{item.estadoExcel}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.3)" />
    </TouchableOpacity>
  );

  const selectedSite = sites.find(s => s.id === selectedSiteId);

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
        showsUserLocation={locationPermission}
      >
        {filteredSites.map(site => {
          if (typeof site.lat !== 'number' || typeof site.lng !== 'number' || isNaN(site.lat) || isNaN(site.lng)) {
            return null;
          }
          return (
          <Marker
            key={site.id}
            coordinate={{ latitude: site.lat, longitude: site.lng }}
            onPress={() => {
              if (context?.currentUser?.role === 'Trabajador') {
                navigation.navigate('Actividad');
              } else {
                setSelectedSiteId(site.id);
              }
            }}
          >
            <View style={styles.customMarker}>
              <View style={[
                styles.markerBubble, 
                { backgroundColor: site.estadoExcel === 'Ejecutado' ? '#30D158' : '#0A84FF' }
              ]}>
                <Text style={styles.markerText}>{site.code}</Text>
              </View>
              <View style={[
                styles.markerArrow, 
                { borderBottomColor: site.estadoExcel === 'Ejecutado' ? '#30D158' : '#0A84FF' }
              ]} />
            </View>
          </Marker>
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
        <TouchableOpacity style={styles.sheetHandleContainer} onPress={toggleSheet} activeOpacity={1}>
          <View style={styles.sheetHandle} />
        </TouchableOpacity>

        <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
          {selectedSiteId && selectedSite ? (
            <View style={styles.detailContainer}>
              <View style={styles.detailHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailTitle}>{selectedSite.code} - {selectedSite.name}</Text>
                  <View style={styles.communeBadge}>
                    <Ionicons name="location" size={14} color="rgba(255, 255, 255, 0.7)" />
                    <Text style={styles.communeBadgeText}>{selectedSite.commune}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedSiteId(null)}>
                  <Ionicons name="close-circle" size={30} color="rgba(255, 255, 255, 0.3)" />
                </TouchableOpacity>
              </View>

              <View style={styles.actionGrid}>
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
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Información del Sitio</Text>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Dirección</Text>
                  <Text style={styles.infoValue}>{selectedSite.address}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Región</Text>
                  <Text style={styles.infoValue}>{selectedSite.region}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Estado en Planilla</Text>
                  <Text style={styles.infoValue}>{selectedSite.estadoExcel}</Text>
                </View>
              </View>
            </View>
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

              <View style={styles.filtersSection}>
                <Text style={styles.filterTitle}>Filtrar por Estado:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  {statuses.map(s => (
                    <TouchableOpacity 
                      key={s} 
                      style={[styles.chip, selectedStatus === s && styles.chipSelected]}
                      onPress={() => setSelectedStatus(s)}
                    >
                      <Text style={[styles.chipText, selectedStatus === s && styles.chipTextSelected]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.filterTitle}>Filtrar por Comuna:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  {uniqueCommunes.map(c => (
                    <TouchableOpacity 
                      key={c} 
                      style={[styles.chip, selectedCommune === c && styles.chipSelected]}
                      onPress={() => setSelectedCommune(c)}
                    >
                      <Text style={[styles.chipText, selectedCommune === c && styles.chipTextSelected]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <FlatList
                data={filteredSites}
                keyExtractor={item => item.id}
                renderItem={renderSiteItem}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No se encontraron sitios con estos filtros.</Text>
                }
              />
            </View>
          )}
        </Animated.View>
      </Animated.View>
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
  sheetHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 75, // Clips the list before the TabBar area
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
  filtersSection: {
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 10,
  },
  chipsScroll: {
    marginBottom: 15,
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#0A84FF',
  },
  chipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextSelected: {
    fontWeight: '700',
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
  communeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  communeBadgeText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
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
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  markerBubble: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '180deg' }],
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
