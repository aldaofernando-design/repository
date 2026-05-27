import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Dimensions, 
  Animated 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

interface DownloadProgressModalProps {
  visible: boolean;
  progress: number; // 0 to 100
  statusMessage: string;
}

export const DownloadProgressModal: React.FC<DownloadProgressModalProps> = ({ 
  visible, 
  progress, 
  statusMessage 
}) => {
  // Animación del ancho de la barra de progreso
  const progressPercent = Math.min(Math.max(progress, 0), 100);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icono de Descarga animado/destacado */}
          <View style={styles.iconContainer}>
            {progressPercent < 100 ? (
              <ActivityIndicator size="large" color="#FF5E00" />
            ) : (
              <Ionicons name="checkmark-circle" size={48} color="#30D158" />
            )}
          </View>

          {/* Título de descarga */}
          <Text style={styles.title}>
            {progressPercent < 100 ? 'Descargando Informe' : '¡Descarga Completa!'}
          </Text>

          {/* Mensaje de estado dinámico */}
          <Text style={styles.statusText}>{statusMessage}</Text>

          {/* Barra de progreso */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
          </View>

          {/* Indicador de porcentaje */}
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
    backgroundColor: 'rgba(28, 28, 30, 0.95)', // Dark glassmorphism
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
    height: 40, // Altura fija para evitar saltos al cambiar de texto
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
    backgroundColor: '#FF5E00', // Accent orange color
  },
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF5E00',
  },
});
