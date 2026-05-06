import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
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
  // Default role depends on current user
  const initialRole = existingUser?.role || (currentUserRole === 'Coordinador' ? 'Trabajador' : 'Coordinador');
  const [role, setRole] = useState(initialRole);

  const handleSave = () => {
    if (!name || !email || !role) {
      Alert.alert("Error", "El nombre, correo y rol son obligatorios.");
      return;
    }

    if (existingUser) {
      context?.updateUser(existingUser.id, { name, email, phone, company, role });
    } else {
      context?.addUser({ name, email, phone, company, role, photo: '' });
    }
    navigation.goBack();
  };

  const availableRoles = currentUserRole === 'Administrador' 
    ? ['Coordinador', 'Trabajador'] 
    : ['Trabajador']; // Coordinador solo puede crear trabajadores

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{existingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Nombre Completo *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ej. Juan Pérez" />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Correo Electrónico *</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="correo@empresa.com" keyboardType="email-address" autoCapitalize="none" />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Teléfono</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+56 9 1234 5678" keyboardType="phone-pad" />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Empresa</Text>
          <TextInput style={styles.input} value={company} onChangeText={setCompany} placeholder="Nombre de la empresa" />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Rol asignado *</Text>
          <View style={styles.roleContainer}>
            {availableRoles.map(r => (
              <TouchableOpacity 
                key={r} 
                style={[styles.roleChip, role === r && styles.roleChipSelected]}
                onPress={() => setRole(r)}
              >
                <Text style={[styles.roleText, role === r && styles.roleTextSelected]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Guardar Usuario</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    marginRight: 16,
  },
  backBtnText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  roleChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  roleChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleText: {
    color: colors.text,
    fontWeight: '500',
  },
  roleTextSelected: {
    color: colors.surface,
  },
  saveBtn: {
    backgroundColor: colors.success,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
