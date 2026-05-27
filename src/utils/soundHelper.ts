import { Audio } from 'expo-av';

let isAudioInitialized = false;

export async function playNotificationSound() {
  try {
    if (!isAudioInitialized) {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        playThroughEarpieceAndroid: false,
      });
      isAudioInitialized = true;
    }

    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/notification.wav')
    );
    await sound.playAsync();
    
    // Liberar memoria al terminar de reproducir
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });
  } catch (err) {
    console.warn('Error playing notification sound:', err);
  }
}
