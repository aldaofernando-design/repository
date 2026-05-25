import React, { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { DetalleActividadScreen } from '../screens/DetalleActividadScreen';
import { UsuarioFormScreen } from '../screens/UsuarioFormScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { PerfilScreen } from '../screens/PerfilScreen';
import { AppContext } from '../context/AppContext';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  const context = useContext(AppContext);
  const currentUser = context?.currentUser;
  const loadingSession = context?.loadingSession;

  if (loadingSession) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1C1C1E', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {currentUser === null ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="DetalleActividad" component={DetalleActividadScreen} />
            <Stack.Screen name="UsuarioForm" component={UsuarioFormScreen} />
            <Stack.Screen name="Perfil" component={PerfilScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
