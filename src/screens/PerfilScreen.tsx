import React, { useContext } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  Alert, 
  ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AppContext } from '../context/AppContext';
import { colors } from '../theme/colors';

export const PerfilScreen = ({ navigation }: any) => {
  const context = useContext(AppContext);
  const currentUser = context?.currentUser;

  const handlePickImage = async () => {
    if (!currentUser) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se necesita permiso para acceder a la galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const newPhotoUri = result.assets[0].uri;
      context?.updateUser(currentUser.id, { photo: newPhotoUri });
      Alert.alert('Éxito', 'Foto de perfil actualizada correctamente.');
    }
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Está seguro de que desea cerrar la sesión actual?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Cerrar Sesión', 
          style: 'destructive', 
          onPress: () => context?.logout() 
        }
      ]
    );
  };

  if (!currentUser) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Overlay */}
      <View style={styles.header}>
        {navigation && navigation.canGoBack() && (
          <TouchableOpacity 
            style={styles.backButtonHeader} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color="#fff" style={{ marginLeft: -10 }} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Mi Perfil</Text>
      </View>

      <View style={styles.mainContent}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={handlePickImage}
            activeOpacity={0.85}
          >
            {currentUser.photo ? (
              <Image source={{ uri: currentUser.photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={50} color="rgba(255,255,255,0.3)" />
              </View>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>{currentUser.name}</Text>
          <Text style={styles.userRoleBadge}>{currentUser.role}</Text>
        </View>

        {/* Info Cards */}
        <Text style={styles.sectionLabel}>INFORMACIÓN GENERAL</Text>
        <View style={styles.infoGroup}>
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={20} color="rgba(255, 255, 255, 0.4)" style={styles.infoIcon} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Correo Electrónico</Text>
              <Text style={styles.infoValue}>{currentUser.email}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="phone-portrait" size={20} color="rgba(255, 255, 255, 0.4)" style={styles.infoIcon} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Teléfono</Text>
              <Text style={styles.infoValue}>{currentUser.phone || 'No registrado'}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Ionicons name="business" size={20} color="rgba(255, 255, 255, 0.4)" style={styles.infoIcon} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Empresa / Contratista</Text>
              <Text style={styles.infoValue}>{currentUser.company || 'F1+'}</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogoutPress}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        {/* App Version Tag */}
        <Text style={styles.versionText}>Versión de Aplicación 1.2.0 • Proyectos F1+</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 25,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backButtonHeader: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  mainContent: {
    flex: 1,
    paddingBottom: 110, // Avoid overlapping TabBar
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#1C1C1E',
    borderWidth: 3,
    borderColor: '#FF5E00', // Highlight brand color
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF5E00',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  userRoleBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF5E00',
    backgroundColor: 'rgba(255, 94, 0, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginLeft: 20,
    marginBottom: 8,
    marginTop: 20,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  infoGroup: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  infoIcon: {
    marginRight: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: '#fff',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF453A',
    borderRadius: 14,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 36,
    gap: 8,
    shadowColor: '#FF453A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  versionText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.25)',
    fontSize: 12,
    marginTop: 30,
    fontWeight: '500',
  },
});
