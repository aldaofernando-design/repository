import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { UsuariosScreen } from '../screens/UsuariosScreen';
import { SitiosScreen } from '../screens/SitiosScreen';
import { PlanificacionScreen } from '../screens/PlanificacionScreen';
import { ActividadScreen } from '../screens/ActividadScreen';
import { AvanceScreen } from '../screens/AvanceScreen';
import { CalendarioScreen } from '../screens/CalendarioScreen';
import { colors } from '../theme/colors';
import { AppContext } from '../context/AppContext';

// En Expo Go, Ionicons generalmente está disponible
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
  const context = useContext(AppContext);
  const isTrabajador = context?.currentUser.role === 'Trabajador';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = 'help-outline';

          if (route.name === 'Usuarios') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Sitios') {
            iconName = focused ? 'business' : 'business-outline';
          } else if (route.name === 'Planificacion') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Actividad') {
            iconName = focused ? 'clipboard' : 'clipboard-outline';
          } else if (route.name === 'Avance') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Calendario') {
            iconName = focused ? 'calendar-sharp' : 'calendar-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      {!isTrabajador && <Tab.Screen name="Usuarios" component={UsuariosScreen} />}
      {!isTrabajador && <Tab.Screen name="Sitios" component={SitiosScreen} />}
      
      {/* Trabajador: ve Calendario, Actividad */}
      {isTrabajador && <Tab.Screen name="Calendario" component={CalendarioScreen} />}
      <Tab.Screen name="Actividad" component={ActividadScreen} />
      
      {/* Administrador/Coordinador: ven Planificación y Avance en vez de Calendario */}
      {!isTrabajador && <Tab.Screen name="Planificacion" component={PlanificacionScreen} options={{ title: 'Planif.' }} />}
      {!isTrabajador && <Tab.Screen name="Avance" component={AvanceScreen} />}
    </Tab.Navigator>
  );
};
