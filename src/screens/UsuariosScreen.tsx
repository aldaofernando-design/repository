import React, { useContext } from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, Text, TouchableOpacity } from 'react-native';
import { UserCard } from '../components/UserCard';
import { colors } from '../theme/colors';
import { AppContext, User } from '../context/AppContext';

export const UsuariosScreen = ({ navigation }: any) => {
  const context = useContext(AppContext);
  const currentUserRole = context?.currentUser.role || 'Trabajador';
  const users = context?.users || [];

  // Opciones de acción dependiendo del rol
  const canAddUser = currentUserRole === 'Administrador' || currentUserRole === 'Coordinador';
  
  const handleEditUser = (user: User) => {
    // Administrador puede editar a todos.
    // Coordinador solo puede editar Trabajadores.
    if (currentUserRole === 'Administrador' || (currentUserRole === 'Coordinador' && user.role === 'Trabajador')) {
      navigation.navigate('UsuarioForm', { userId: user.id });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Directorio de Usuarios</Text>
        {canAddUser && (
          <TouchableOpacity 
            style={styles.addBtn}
            onPress={() => navigation.navigate('UsuarioForm')}
          >
            <Text style={styles.addBtnText}>+ Nuevo</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={users}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <UserCard 
            user={item} 
            onEdit={
              (currentUserRole === 'Administrador' || (currentUserRole === 'Coordinador' && item.role === 'Trabajador'))
              ? () => handleEditUser(item)
              : undefined
            } 
          />
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    color: colors.surface,
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
  },
});
