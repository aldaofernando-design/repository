import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface SiteCardProps {
  site: {
    code: string;
    name: string;
    address: string;
    commune: string;
    lat: number;
    lng: number;
  };
}

export const SiteCard: React.FC<SiteCardProps> = ({ site }) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.code}>{site.code}</Text>
        <Text style={styles.name}>{site.name}</Text>
      </View>
      <View style={styles.details}>
        <Text style={styles.detailText}>{site.address}, {site.commune}</Text>
        <Text style={styles.coordText}>Lat: {site.lat} | Lng: {site.lng}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  code: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.secondary,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  details: {
    marginTop: 4,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  coordText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
});
