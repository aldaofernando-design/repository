import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

interface ActivityCardProps {
  planning: any; // Using any for simplicity in mock
  site: any;
  worker: any;
  onPress: () => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({ planning, site, worker, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.siteName}>{site?.name} ({site?.code})</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{planning.status}</Text>
        </View>
      </View>
      
      <View style={styles.body}>
        <Text style={styles.label}>Asignado a: <Text style={styles.value}>{worker?.name}</Text></Text>
        <Text style={styles.label}>Fecha: <Text style={styles.value}>{planning.date}</Text></Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
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
    marginBottom: 12,
  },
  siteName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  statusBadge: {
    backgroundColor: colors.warning + '20', // Light warning color
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: 'bold',
  },
  body: {
    gap: 4,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  value: {
    color: colors.text,
    fontWeight: '500',
  },
});
