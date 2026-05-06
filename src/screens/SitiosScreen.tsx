import React, { useContext, useState } from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, Text, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { SiteCard } from '../components/SiteCard';
import { colors } from '../theme/colors';
import { AppContext } from '../context/AppContext';
import { Ionicons } from '@expo/vector-icons';

export const SitiosScreen = () => {
  const context = useContext(AppContext);
  const sites = context?.sites || [];
  const plannings = context?.plannings || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [selectedCommune, setSelectedCommune] = useState('Todas');

  const uniqueCommunes = ['Todas', ...Array.from(new Set(sites.map(s => s.commune)))];
  const statuses = ['Todos', 'Planificado', 'Ejecutado', 'Sin Asignar'];

  // Map to get the latest planning status for a site
  const siteStatusMap = plannings.reduce((acc, plan) => {
    acc[plan.siteId] = plan.status;
    return acc;
  }, {} as Record<string, string>);

  const filteredSites = sites.filter(site => {
    const status = siteStatusMap[site.id] || 'Sin Asignar';
    const matchesSearch = site.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          site.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'Todos' || status === selectedStatus;
    const matchesCommune = selectedCommune === 'Todas' || site.commune === selectedCommune;

    return matchesSearch && matchesStatus && matchesCommune;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Listado de Sitios</Text>
      </View>
      
      <View style={styles.filtersContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Buscar por nombre o código..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <Text style={styles.filterLabel}>Estado:</Text>
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

        <Text style={styles.filterLabel}>Comuna:</Text>
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
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <SiteCard site={item} status={siteStatusMap[item.id]} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No se encontraron sitios con estos filtros.</Text>}
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
  filtersContainer: {
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    padding: 10,
    fontSize: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  chipsScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.text,
    fontSize: 14,
  },
  chipTextSelected: {
    color: colors.surface,
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 20,
  }
});
