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
  Platform
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

  // Si el usuario actual es Coordinador, solo ve a los trabajadores
  const users = usersContext.filter(user => {
    if (currentUser?.role === 'Coordinador') {
      return user.role === 'Trabajador';
    }
    return true; // Administrador o superusuario ven todos
  });
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Sheet Animation State
  const [sheetState, setSheetState] = useState<'hidden' | 'half' | 'full'>('half');
  const sheetHeight = useRef(new Animated.Value(SHEET_MID_HEIGHT)).current;

  const contentOpacity = sheetHeight.interpolate({
    inputRange: [SHEET_MIN_HEIGHT, SHEET_MIN_HEIGHT + 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

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

  const handleUserPress = (user: User) => {
    setSelectedUser(user);
    // Collapse the sheet so the user can clearly see the details on the main screen
    if (sheetState === 'half' || sheetState === 'full') {
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
        <Text style={styles.listUserDetail}>{item.role} • {item.company}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Overlay */}
      <View style={styles.headerOverlay}>
        <Text style={styles.headerTitle}>Personas</Text>
        <TouchableOpacity 
          style={styles.headerAddBtn}
          onPress={() => navigation.navigate('UsuarioForm')}
        >
          <Ionicons name="add" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Main Screen Content */}
      <View style={styles.mainScreenContent}>
        {selectedUser ? (
          <View style={styles.detailContent}>
            <View style={styles.detailHeader}>
              <Image source={{ uri: selectedUser.photo }} style={styles.detailAvatar} />
              <View style={styles.detailTitleInfo}>
                <Text style={styles.detailName}>{selectedUser.name}</Text>
                <Text style={styles.detailStatus}>En Terreno • Hoy, 10:45</Text>
              </View>
              <TouchableOpacity 
                style={styles.closeModalBtn}
                onPress={() => setSelectedUser(null)}
              >
                <Ionicons name="close-circle" size={30} color="rgba(255,255,255,0.2)" />
              </TouchableOpacity>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn}>
                <View style={styles.actionIconCircle}>
                  <Ionicons name="call" size={24} color="#fff" />
                </View>
                <Text style={styles.actionText}>Llamar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <View style={styles.actionIconCircle}>
                  <Ionicons name="mail" size={24} color="#fff" />
                </View>
                <Text style={styles.actionText}>Mensaje</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <View style={styles.actionIconCircle}>
                  <Ionicons name="navigate" size={24} color="#fff" />
                </View>
                <Text style={styles.actionText}>Ruta</Text>
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
            </View>

            <TouchableOpacity 
              style={styles.editFullBtn}
              onPress={() => {
                navigation.navigate('UsuarioForm', { userId: selectedUser.id });
              }}
            >
              <Text style={styles.editFullBtnText}>Editar Información</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="people" size={80} color="rgba(255,255,255,0.05)" />
            <Text style={styles.placeholderText}>Selecciona un usuario del directorio</Text>
          </View>
        )}
      </View>

      {/* Bottom List Sheet (Like ActividadScreen) */}
      <Animated.View style={[styles.bottomSheet, { height: sheetHeight }]}>
        <TouchableOpacity style={styles.sheetHandleContainer} onPress={toggleSheet} activeOpacity={1}>
          <View style={styles.sheetHandle} />
        </TouchableOpacity>
        
        <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
          <Text style={styles.sheetTitle}>Directorio</Text>
          <FlatList
            data={users}
            keyExtractor={item => item.id}
            renderItem={renderUserItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
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
    left: 20,
    right: 20,
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
  headerAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
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
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 75,
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
    paddingBottom: SHEET_MIN_HEIGHT, // Ensure it doesn't overlap with the minimized sheet
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  detailAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#333',
  },
  detailTitleInfo: {
    marginLeft: 20,
    flex: 1,
  },
  detailName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  detailStatus: {
    fontSize: 15,
    color: '#34C759',
    marginTop: 4,
  },
  closeModalBtn: {
    alignSelf: 'flex-start',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  actionBtn: {
    width: (SCREEN_WIDTH - 60) / 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: '#fff',
    marginTop: 2,
  },
  editFullBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  editFullBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  }
});
