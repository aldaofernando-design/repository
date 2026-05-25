import React, { useState, useContext, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  Animated, 
  Dimensions,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../context/AppContext';
import { saveSession } from '../utils/sessionHelper';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

export const LoginScreen = () => {
  const context = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const handleSendCode = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor, ingrese su correo electrónico.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Por favor, ingrese un correo electrónico válido.');
      return;
    }

    setLoading(true);

    // Simulate sending email API request
    setTimeout(() => {
      setLoading(false);
      const matchedUser = context?.users.find(
        u => u.email.toLowerCase() === email.trim().toLowerCase()
      );

      if (!matchedUser) {
        Alert.alert(
          'Acceso Denegado',
          'El correo ingresado no está registrado en el sistema. Solicite acceso a un administrador.'
        );
        return;
      }

      if (matchedUser.status === 'Inactivo') {
        Alert.alert(
          'Cuenta Inactiva',
          'Su cuenta se encuentra inactiva. Por favor, comuníquese con el administrador.'
        );
        return;
      }

      // Generate a mock 4-digit code
      const generatedCode = Math.floor(1000 + Math.random() * 9000).toString();
      setSentCode(generatedCode);
      setStep(2);

      // Show alert with the simulated code (mocking email box reception)
      Alert.alert(
        'Código Enviado',
        `[Simulación] Se ha enviado un código de acceso a su casilla:\n\n✉️ ${email.toLowerCase()}\n🔑 Código: ${generatedCode}`,
        [{ text: 'Entendido' }]
      );

      // Trigger animations for step 2
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        })
      ]).start();
    }, 1200);
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Por favor, ingrese el código de 4 dígitos.');
      return;
    }

    if (code !== sentCode) {
      Alert.alert('Código Incorrecto', 'El código de verificación ingresado no es válido. Inténtelo de nuevo.');
      return;
    }

    setLoading(true);

    setTimeout(async () => {
      const matchedUser = context?.users.find(
        u => u.email.toLowerCase() === email.trim().toLowerCase()
      );

      if (matchedUser) {
        // Save session locally
        await saveSession(matchedUser.id);
        
        // Log in user in AppContext
        context?.setCurrentUser(matchedUser);
      } else {
        setLoading(false);
        Alert.alert('Error', 'Ha ocurrido un error al iniciar sesión.');
      }
    }, 800);
  };

  const handleBackToEmail = () => {
    setStep(1);
    setCode('');
    setSentCode(null);
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.innerContainer}>
        {/* Header decoration / logo */}
        <View style={styles.logoContainer}>
          <Image source={require('../../assets/f1_logo.png')} style={styles.logoImage} />
          <Text style={styles.title}>Proyectos F1+</Text>
          <Text style={styles.subtitle}>Gestión de Personal & Actividades</Text>
        </View>

        {step === 1 ? (
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Iniciar Sesión</Text>
            <Text style={styles.description}>
              Ingrese su correo corporativo registrado. Le enviaremos un código de seguridad para ingresar.
            </Text>

            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="correo@empresa.com"
                placeholderTextColor="rgba(255,255,255,0.5)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <TouchableOpacity 
              style={styles.button} 
              onPress={handleSendCode}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FF5E00" size="small" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Enviar Código</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FF5E00" />
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View 
            style={[
              styles.formContainer, 
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <Text style={styles.sectionTitle}>Verificar Código</Text>
            <Text style={styles.description}>
              Hemos enviado un código a <Text style={styles.boldText}>{email.toLowerCase()}</Text>.
            </Text>

            <View style={styles.inputWrapper}>
              <Ionicons name="key-outline" size={20} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Código de 4 dígitos"
                placeholderTextColor="rgba(255,255,255,0.5)"
                keyboardType="number-pad"
                maxLength={4}
                autoFocus={true}
                value={code}
                onChangeText={setCode}
              />
            </View>

            <TouchableOpacity 
              style={styles.button} 
              onPress={handleVerifyCode}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FF5E00" size="small" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Iniciar Sesión</Text>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FF5E00" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBackToEmail}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.backButtonText}>Modificar correo electrónico</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF5E00', // Orange matching the logo
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
    fontWeight: '600',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Glassmorphism
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
    marginBottom: 24,
  },
  boldText: {
    color: '#fff',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#fff', // White button with orange text
    borderRadius: 14,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#FF5E00',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 6,
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
});
