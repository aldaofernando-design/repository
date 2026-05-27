import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface UploadProgressModalProps {
  visible: boolean;
  progress: number; // 0 to 100
  statusMessage: string;
}

export const UploadProgressModal: React.FC<UploadProgressModalProps> = ({ 
  visible, 
  progress, 
  statusMessage 
}) => {
  const progressPercent = Math.min(Math.max(progress, 0), 100);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icono de Subida */}
          <View style={styles.iconContainer}>
            {progressPercent < 100 ? (
              <ActivityIndicator size="large" color="#FF5E00" />
            ) : (
              <Ionicons name="cloud-done" size={48} color="#30D158" />
            )}
          </View>

          {/* Título */}
          <Text style={styles.title}>
            {progressPercent < 100 ? 'Sincronizando Actividad' : '¡Sincronización Exitosa!'}
          </Text>

          {/* Estado de la subida */}
          <Text style={styles.statusText}>{statusMessage}</Text>

          {/* Barra de progreso */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
          </View>

          {/* Porcentaje */}
          <Text style={styles.percentageText}>{Math.round(progressPercent)}%</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.85,
    backgroundColor: 'rgba(28, 28, 30, 0.95)',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 24,
    height: 40,
    lineHeight: 20,
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#FF5E00',
  },
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF5E00',
  },
});
