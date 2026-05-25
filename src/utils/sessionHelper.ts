import * as FileSystem from 'expo-file-system/legacy';

const SESSION_FILE_PATH = FileSystem.documentDirectory + 'session.json';

export interface SessionData {
  userId: string;
  lastActive: string; // ISO String timestamp
}

export const saveSession = async (userId: string): Promise<void> => {
  try {
    const data: SessionData = {
      userId,
      lastActive: new Date().toISOString(),
    };
    await FileSystem.writeAsStringAsync(SESSION_FILE_PATH, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving session:', error);
  }
};

export const getSession = async (): Promise<SessionData | null> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(SESSION_FILE_PATH);
    if (fileInfo.exists) {
      const content = await FileSystem.readAsStringAsync(SESSION_FILE_PATH);
      return JSON.parse(content) as SessionData;
    }
  } catch (error) {
    console.error('Error reading session:', error);
  }
  return null;
};

export const clearSession = async (): Promise<void> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(SESSION_FILE_PATH);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(SESSION_FILE_PATH);
    }
  } catch (error) {
    console.error('Error clearing session:', error);
  }
};
