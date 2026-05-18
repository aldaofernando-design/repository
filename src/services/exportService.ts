import * as FileSystem from 'expo-file-system/legacy';
import * as MailComposer from 'expo-mail-composer';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

const DATABASE_NAME = 'proyectos.db';

export const exportDatabase = async () => {
  try {
    // 1. Verificar disponibilidad y preparar exportación
    const dbDir = `${FileSystem.documentDirectory}SQLite/`;
    const dbFile = `${dbDir}${DATABASE_NAME}`;
    const exportPath = `${FileSystem.cacheDirectory}${DATABASE_NAME}`;

    // 2. Verificar si el archivo existe
    const fileInfo = await FileSystem.getInfoAsync(dbFile);
    if (!fileInfo.exists) {
      Alert.alert('Error', 'No se encontró el archivo de base de datos.');
      return;
    }

    // 3. Copiar el archivo a la zona de cache
    await FileSystem.copyAsync({
      from: dbFile,
      to: exportPath
    });

    // 4. Intentar enviar por MailComposer o fallback a Sharing
    const isMailAvailable = await MailComposer.isAvailableAsync();

    if (isMailAvailable) {
      await MailComposer.composeAsync({
        recipients: [],
        subject: `Exportación DB - Proyectos App - ${new Date().toLocaleDateString()}`,
        body: 'Se adjunta la base de datos del sistema.',
        attachments: [exportPath],
      });
    } else {
      // Fallback a compartir (permite enviar por WhatsApp, Drive, Mail, etc.)
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(exportPath, {
          mimeType: 'application/x-sqlite3',
          dialogTitle: 'Exportar Base de Datos',
          UTI: 'public.database'
        });
      } else {
        Alert.alert('Error', 'No hay opciones de exportación disponibles en este dispositivo.');
      }
    }

  } catch (error) {
    console.error('Error al exportar la base de datos:', error);
    Alert.alert('Error', 'Ocurrió un error al intentar exportar la base de datos.');
  }
};
