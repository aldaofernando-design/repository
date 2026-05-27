import React, { useContext, useState, useRef } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  Image, 
  Dimensions, 
  Animated,
  Platform,
  PanResponder,
  Linking,
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { AppContext, User } from '../context/AppContext';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const SHEET_MIN_HEIGHT = 110;
const SHEET_MID_HEIGHT = 500;
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT - 150;

export const UsuariosScreen = ({ navigation }: any) => {
  const context = useContext(AppContext);
  const usersContext = context?.users || [];
  const currentUser = context?.currentUser;

  // Si el usuario actual es Coordinador, solo ve a los trabajadores (a menos que sea Fernando Aldao)
  const users = usersContext.filter(user => {
    if (currentUser?.role === 'Coordinador') {
      if (currentUser?.name === 'Fernando Aldao' || currentUser?.email === 'fernando.aldao@f1.services') {
        return user.role === 'Trabajador' || user.role === 'Coordinador';
      }
      return user.role === 'Trabajador';
    }
    return true; // Administrador o superusuario ven todos
  });
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Sheet Animation State
  // Animación del Bottom Sheet (2 estados: oculto, medio)
  const [sheetState, setSheetState] = useState<'hidden' | 'half'>('half');
  const sheetHeight = useRef(new Animated.Value(SHEET_MID_HEIGHT)).current;
  const startHeight = useRef(SHEET_MID_HEIGHT);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        // @ts-ignore
        startHeight.current = sheetHeight._value;
      },
      onPanResponderMove: (_, gestureState) => {
        let newHeight = startHeight.current - gestureState.dy;
        if (newHeight < SHEET_MIN_HEIGHT) {
          newHeight = SHEET_MIN_HEIGHT;
        } else if (newHeight > SHEET_MID_HEIGHT) {
          newHeight = SHEET_MID_HEIGHT + (newHeight - SHEET_MID_HEIGHT) * 0.3;
        }
        sheetHeight.setValue(newHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        // @ts-ignore
        const currentVal = sheetHeight._value;
        const middlePoint = (SHEET_MIN_HEIGHT + SHEET_MID_HEIGHT) / 2;
        
        let targetHeight = SHEET_MIN_HEIGHT;
        let nextState: 'hidden' | 'half' = 'hidden';
        
        if (gestureState.vy < -0.5) {
          targetHeight = SHEET_MID_HEIGHT;
          nextState = 'half';
        } else if (gestureState.vy > 0.5) {
          targetHeight = SHEET_MIN_HEIGHT;
          nextState = 'hidden';
        } else {
          if (currentVal > middlePoint) {
            targetHeight = SHEET_MID_HEIGHT;
            nextState = 'half';
          } else {
            targetHeight = SHEET_MIN_HEIGHT;
            nextState = 'hidden';
          }
        }
        
        Animated.spring(sheetHeight, {
          toValue: targetHeight,
          useNativeDriver: false,
          friction: 8,
          tension: 40,
        }).start();
        setSheetState(nextState);
      }
    })
  ).current;

  const contentOpacity = sheetHeight.interpolate({
    inputRange: [SHEET_MIN_HEIGHT, SHEET_MIN_HEIGHT + 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const toggleSheet = () => {
    let nextState: 'hidden' | 'half' = 'half';
    let toValue = SHEET_MID_HEIGHT;

    if (sheetState === 'half') {
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

  const handleUserPress = (user: User) => {
    setSelectedUser(user);
    // Collapse the sheet so the user can clearly see the details on the main screen
    if (sheetState === 'half') {
      let toValue = SHEET_MIN_HEIGHT;
      Animated.spring(sheetHeight, {
        toValue,
        useNativeDriver: false,
        friction: 8,
        tension: 40,
      }).start();
      setSheetState('hidden');
    }
  };

  const renderUserItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.userListItem} 
      onPress={() => handleUserPress(item)}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.photo }} style={styles.listAvatar} />
        <View style={[styles.statusDot, { backgroundColor: item.status === 'Activo' ? '#34C759' : '#8E8E93' }]} />
      </View>
      <View style={styles.userListInfo}>
        <Text style={styles.listUserName}>{item.name}</Text>
        <Text style={styles.listUserDetail}>
          {item.role} • {item.company}
          {(currentUser?.role === 'Coordinador' || currentUser?.role === 'Administrador') && ` • ${item.phone}`}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Overlay */}
      <View style={styles.headerOverlay}>
        <Text style={styles.headerTitle}>Personas</Text>
        <View style={styles.headerRightActions}>
          <TouchableOpacity 
            style={styles.headerProfileBtn}
            onPress={() => navigation.navigate('Perfil')}
            activeOpacity={0.7}
          >
            {currentUser?.photo ? (
              <Image source={{ uri: currentUser.photo }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Ionicons name="person" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerAddBtn}
            onPress={() => navigation.navigate('UsuarioForm')}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Screen Content */}
      <View style={styles.mainScreenContent}>
        {selectedUser ? (
          <ScrollView 
            style={styles.detailContent}
            contentContainerStyle={{ paddingBottom: SHEET_MIN_HEIGHT + 20 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.detailHeader}>
              <Image source={{ uri: selectedUser.photo }} style={styles.detailAvatar} />
              <View style={styles.detailTitleInfo}>
                <Text style={styles.detailName}>{selectedUser.name}</Text>
              </View>
              <TouchableOpacity 
                style={styles.closeModalBtn}
                onPress={() => setSelectedUser(null)}
              >
                <Ionicons name="close-circle" size={30} color="rgba(255,255,255,0.2)" />
              </TouchableOpacity>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={styles.actionBtn}
                onPress={() => {
                  if (selectedUser.phone) {
                    Linking.openURL(`tel:${selectedUser.phone}`);
                  } else {
                    Alert.alert('Error', 'Este usuario no tiene teléfono registrado.');
                  }
                }}
              >
                <View style={styles.actionIconCircle}>
                  <Ionicons name="call" size={24} color="#fff" />
                </View>
                <Text style={styles.actionText}>Llamar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionBtn}
                onPress={() => {
                  if (selectedUser.phone) {
                    const cleanPhone = selectedUser.phone.replace(/[^0-9]/g, '');
                    const url = `https://wa.me/${cleanPhone}`;
                    Linking.openURL(url).catch(() => {
                      Alert.alert('Error', 'No se pudo abrir WhatsApp. Verifica si está instalado.');
                    });
                  } else {
                    Alert.alert('Error', 'Este usuario no tiene teléfono registrado.');
                  }
                }}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: '#25D366' }]}>
                  <Ionicons name="logo-whatsapp" size={24} color="#fff" />
                </View>
                <Text style={[styles.actionText, { color: '#25D366' }]}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionBtn}
                onPress={() => {
                  const hasLiveCoords = selectedUser.latitude !== undefined && selectedUser.latitude !== null && selectedUser.longitude !== undefined && selectedUser.longitude !== null;
                  if (hasLiveCoords) {
                    navigation.navigate('Actividad', { autoSelectWorkerId: selectedUser.id });
                  } else {
                    Alert.alert(
                      'GPS Inactivo',
                      `${selectedUser.name} no tiene su GPS activo por lo cual no puede mostrarse en el mapa.`
                    );
                  }
                }}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: '#FF5E00' }]}>
                  <Ionicons name="location" size={24} color="#fff" />
                </View>
                <Text style={[styles.actionText, { color: '#FF5E00' }]}>Ubicación</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Ionicons name="business" size={20} color="rgba(255,255,255,0.5)" />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Empresa</Text>
                  <Text style={styles.infoValue}>{selectedUser.company}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="person" size={20} color="rgba(255,255,255,0.5)" />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Rol</Text>
                  <Text style={styles.infoValue}>{selectedUser.role}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="mail" size={20} color="rgba(255,255,255,0.5)" />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{selectedUser.email}</Text>
                </View>
              </View>
              {(currentUser?.role === 'Coordinador' || currentUser?.role === 'Administrador') && (
                <View style={styles.infoRow}>
                  <Ionicons name="call" size={20} color="rgba(255,255,255,0.5)" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Teléfono</Text>
                    <Text style={styles.infoValue}>{selectedUser.phone}</Text>
                  </View>
                </View>
              )}
            </View>

            <TouchableOpacity 
              style={styles.editFullBtn}
              onPress={() => {
                navigation.navigate('UsuarioForm', { userId: selectedUser.id });
              }}
            >
              <Text style={styles.editFullBtnText}>Editar Información</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="people" size={80} color="rgba(255,255,255,0.05)" />
            <Text style={styles.placeholderText}>Selecciona un usuario del directorio</Text>
          </View>
        )}
      </View>

      {/* Bottom List Sheet (Like ActividadScreen) */}
      <Animated.View style={[styles.bottomSheet, { height: sheetHeight }]}>
        <View style={styles.sheetHandleContainer} {...panResponder.panHandlers}>
          <TouchableOpacity style={styles.sheetHandleTapArea} onPress={toggleSheet} activeOpacity={0.8}>
            <View style={styles.sheetHandle} />
          </TouchableOpacity>
        </View>
        
        <Animated.View style={{ flex: 1, opacity: contentOpacity, marginBottom: 70 }}>
          <Text style={styles.sheetTitle}>Directorio</Text>
          <View style={styles.listContainer}>
            <FlatList
              data={users}
              keyExtractor={item => item.id}
              renderItem={renderUserItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </View>
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
  headerOverlay: {
    position: 'absolute',
    top: 60,
    left: 25,
    right: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerProfileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  headerAvatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0A84FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  mainScreenContent: {
    flex: 1,
    paddingTop: 130, // Space for the absolute header
    paddingHorizontal: 20,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: SHEET_MIN_HEIGHT,
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 50 : 15,
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
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetHandleTapArea: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2.5,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 20,
    marginBottom: 12,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  userListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  avatarContainer: {
    position: 'relative',
  },
  listAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  userListInfo: {
    flex: 1,
    marginLeft: 16,
  },
  listUserName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  listUserDetail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  
  // Detail Content Styles
  detailContent: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
  },
  detailTitleInfo: {
    marginLeft: 16,
    flex: 1,
  },
  detailName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  detailStatus: {
    fontSize: 14,
    color: '#34C759',
    marginTop: 4,
  },
  closeModalBtn: {
    alignSelf: 'flex-start',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionBtn: {
    width: (SCREEN_WIDTH - 60) / 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  actionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    color: '#fff',
    marginTop: 2,
  },
  editFullBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editFullBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});
