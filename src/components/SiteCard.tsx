import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { colors } from '../theme/colors';
import { Site } from '../context/AppContext';
import { Ionicons } from '@expo/vector-icons';

interface SiteCardProps {
  site: Site;
  status?: string;
  workerName?: string;
}

export const SiteCard: React.FC<SiteCardProps> = ({ site, status, workerName }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const getStatusColor = (st?: string) => {
    if (st === 'Ejecutado') return colors.success;
    if (st === 'En ejecución') return colors.warning; // Orange for En ejecución
    if (st === 'Planificado') return '#2563EB'; // Blue for Planificado
    return colors.textSecondary; // Sin asignar
  };

  return (
    <>
      <TouchableOpacity style={styles.card} onPress={() => setModalVisible(true)}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.code}>{site.code}</Text>
            <Text style={styles.name}>{site.name}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: getStatusColor(status) + '20' }]}>
            <Text style={[styles.badgeText, { color: getStatusColor(status) }]}>
              {status || site.estadoExcel || 'Sin Asignar'}
            </Text>
          </View>
        </View>
        <View style={styles.details}>
          <Text style={styles.detailText}>{site.address}</Text>
          {workerName && (
            <View style={styles.workerRow}>
              <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.workerText}>Asignado: {workerName}</Text>
            </View>
          )}
          <View style={styles.footerRow}>
            <Text style={styles.coordText}>Lat: {site.lat} | Lng: {site.lng}</Text>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          </View>
        </View>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalle del Sitio</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <DetailRow label="Código" value={site.code} />
              <DetailRow label="Nombre" value={site.name} />
              <DetailRow label="Dirección" value={site.address} />
              <DetailRow label="Comuna" value={site.commune} />
              <DetailRow label="Región" value={site.region?.toString()} />
              <DetailRow label="Coordenadas" value={`${site.lat}, ${site.lng}`} />
              
              <View style={styles.divider} />
              
              <DetailRow label="Apagado 3G" value={site.apagado3G} />
              <DetailRow label="Apagado BAFI" value={site.apagadoBAFI} />
              <DetailRow label="Configurar RETU" value={site.configurarRETU} />
              <DetailRow label="Estado Planilla" value={site.estadoExcel} />
              
              <View style={styles.divider} />
              <DetailRow label="Estado Ejecución" value={status} />
              <DetailRow label="Responsable" value={workerName} />
            </View>
            
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const DetailRow = ({ label, value }: { label: string, value?: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value || 'N/A'}</Text>
  </View>
);

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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  code: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.secondary,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
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
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  workerText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBody: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
    paddingBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textSecondary,
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  closeButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.surface,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
