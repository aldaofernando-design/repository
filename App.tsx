import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppProvider } from './src/context/AppContext';
import { initDatabase } from './src/services/database';

export default function App() {
  useEffect(() => {
    initDatabase().catch(err => console.error('Error initializing database:', err));
  }, []);

  return (
    <AppProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </AppProvider>
  );
}
