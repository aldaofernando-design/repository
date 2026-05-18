import React, { useState, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Alert, 
  Image, 
  Switch,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SelectDropdown } from '../components/SelectDropdown';
import { colors } from '../theme/colors';
import { AppContext, User } from '../context/AppContext';

export const UsuarioFormScreen = ({ route, navigation }: any) => {
  const { userId } = route.params || {};
  const context = useContext(AppContext);
  const currentUserRole = context?.currentUser.role || 'Trabajador';
  
  const existingUser = userId ? context?.users.find(u => u.id === userId) : null;

  const [name, setName] = useState(existingUser?.name || '');
  const [email, setEmail] = useState(existingUser?.email || '');
  const [phone, setPhone] = useState(existingUser?.phone || '');
  const [company, setCompany] = useState(existingUser?.company || '');
  const [photo, setPhoto] = useState(existingUser?.photo || '');
  const [status, setStatus] = useState<any>(existingUser?.status || 'Activo');
  
  const initialRole = existingUser?.role || (currentUserRole === 'Coordinador' ? 'Trabajador' : 'Trabajador');
  const [role, setRole] = useState(initialRole);

  const handlePickImage = async () => {
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
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    if (!name || !email || !role) {
      Alert.alert("Campos incompletos", "Por favor completa el nombre, correo y rol.");
      return;
    }

    const userData: any = { 
      name, 
      email, 
      phone, 
      company, 
      role, 
      photo, 
      status 
    };

    if (existingUser) {
      context?.updateUser(existingUser.id, userData);
    } else {
      context?.addUser(userData);
    }
    navigation.goBack();
  };

  const availableRoles = currentUserRole === 'Administrador' 
    ? ['Administrador', 'Coordinador', 'Trabajador'] 
    : ['Trabajador'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerSideBtn}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{existingUser ? 'Perfil' : 'Nuevo Usuario'}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerSideBtn}>
          <Text style={styles.doneText}>Listo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} bounces={true}>
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={50} color="rgba(255,255,255,0.3)" />
              </View>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePickImage}>
            <Text style={styles.changePhotoText}>Cambiar foto</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.group}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Nombre</Text>
            <TextInput 
              style={styles.rowInput} 
              value={name} 
              onChangeText={setName} 
              placeholder="Obligatorio" 
              placeholderTextColor="rgba(255,255,255,0.2)"
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email</Text>
            <TextInput 
              style={styles.rowInput} 
              value={email} 
              onChangeText={setEmail} 
              placeholder="correo@ejemplo.com" 
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="rgba(255,255,255,0.2)"
            />
          </View>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <Text style={styles.rowLabel}>Teléfono</Text>
            <TextInput 
              style={styles.rowInput} 
              value={phone} 
              onChangeText={setPhone} 
              placeholder="+56 9..." 
              keyboardType="phone-pad"
              placeholderTextColor="rgba(255,255,255,0.2)"
            />
          </View>
        </View>

        <Text style={styles.groupLabel}>ORGANIZACIÓN</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Empresa</Text>
            <TextInput 
              style={styles.rowInput} 
              value={company} 
              onChangeText={setCompany} 
              placeholder="Empresa asociada" 
              placeholderTextColor="rgba(255,255,255,0.2)"
            />
          </View>
          <View style={[styles.row, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'stretch' }]}>
            <SelectDropdown 
              label="Rol" 
              value={role} 
              options={availableRoles.map(r => ({ id: r, label: r }))} 
              onSelect={setRole} 
            />
          </View>
        </View>

        <Text style={styles.groupLabel}>ESTADO DE CUENTA</Text>
        <View style={styles.group}>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <Text style={styles.rowLabel}>Usuario Activo</Text>
            <Switch 
              value={status === 'Activo'} 
              onValueChange={(val) => setStatus(val ? 'Activo' : 'Inactivo')}
              trackColor={{ false: "#3a3a3c", true: "#34C759" }}
              thumbColor={Platform.OS === 'ios' ? '#fff' : (status === 'Activo' ? '#fff' : '#f4f3f4')}
            />
          </View>
        </View>

        {existingUser && (
          <TouchableOpacity style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>Eliminar Usuario</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 54,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerSideBtn: {
    minWidth: 70,
  },
  cancelText: {
    color: '#007AFF',
    fontSize: 17,
  },
  doneText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'right',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1C1C1E',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  changePhotoText: {
    color: '#007AFF',
    fontSize: 15,
  },
  groupLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginLeft: 20,
    marginBottom: 8,
    marginTop: 24,
  },
  group: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    minHeight: 44,
  },
  rowLabel: {
    fontSize: 17,
    color: '#fff',
    width: 120,
  },
  rowInput: {
    flex: 1,
    fontSize: 17,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
  },
  rolePicker: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  roleItem: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  roleItemSelected: {
    backgroundColor: '#007AFF',
  },
  roleText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  roleTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  deleteBtn: {
    marginTop: 40,
    backgroundColor: '#1C1C1E',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 40,
  },
  deleteBtnText: {
    color: '#FF3B30',
    fontSize: 17,
    fontWeight: '400',
  }
});
