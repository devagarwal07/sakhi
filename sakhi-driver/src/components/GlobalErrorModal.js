import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  DeviceEventEmitter,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function GlobalErrorModal() {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    options: {},
  });

  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('SHOW_CUSTOM_ALERT', (alertConfig) => {
      setConfig(alertConfig);
      setVisible(true);

      // Reset animation values
      scaleAnim.setValue(0.95);
      opacityAnim.setValue(0);
      translateYAnim.setValue(20);
      shakeAnim.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 70,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          tension: 70,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Trigger shake if it's an error or invalid entry modal
        const lowerTitle = alertConfig.title?.toLowerCase() || '';
        const isErrorAlert = lowerTitle.includes('error') || 
                             lowerTitle.includes('fail') || 
                             lowerTitle.includes('invalid') || 
                             lowerTitle.includes('wrong') || 
                             lowerTitle.includes('incorrect') ||
                             lowerTitle.includes('denied');
        if (isErrorAlert) {
          triggerShake();
        }
      });
    });

    return () => subscription.remove();
  }, [scaleAnim, opacityAnim, translateYAnim]);

  const closeModal = (onPress) => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 15,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      if (typeof onPress === 'function') {
        onPress();
      }
    });
  };

  if (!visible) return null;

  const lowerTitle = config.title?.toLowerCase() || '';
  
  let iconName = 'info';
  let iconColor = '#7C3AED'; // default violet
  let iconBg = '#F5F3FF';
  
  if (lowerTitle.includes('error') || 
      lowerTitle.includes('fail') || 
      lowerTitle.includes('invalid') || 
      lowerTitle.includes('wrong') || 
      lowerTitle.includes('incorrect') ||
      lowerTitle.includes('denied')) {
    iconName = 'x-circle';
    iconColor = '#EF4444'; // Red
    iconBg = '#FEF2F2';
  } else if (lowerTitle.includes('warning') || 
             lowerTitle.includes('incomplete') || 
             lowerTitle.includes('alert') ||
             lowerTitle.includes('caution') ||
             lowerTitle.includes('attention')) {
    iconName = 'alert-triangle';
    iconColor = '#F59E0B'; // Amber
    iconBg = '#FFFBEB';
  } else if (lowerTitle.includes('success') || 
             lowerTitle.includes('verified') || 
             lowerTitle.includes('complete') ||
             lowerTitle.includes('confirm') ||
             lowerTitle.includes('saved')) {
    iconName = 'check-circle';
    iconColor = '#10B981'; // Emerald
    iconBg = '#F0FDF4';
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={() => {
        if (config.options?.cancelable !== false) {
          closeModal();
        }
      }}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            { 
              opacity: opacityAnim, 
              transform: [
                { scale: scaleAnim }, 
                { translateY: translateYAnim },
                { translateX: shakeAnim }
              ] 
            },
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
            <Feather name={iconName} size={30} color={iconColor} />
          </View>

          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.message}>{config.message}</Text>

          <View style={styles.buttonContainer}>
            {config.buttons?.map((btn, index) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              
              let buttonStyle = [styles.primaryButton];
              let textStyle = [styles.primaryButtonText];

              if (isCancel) {
                buttonStyle.push(styles.cancelButton);
                textStyle.push(styles.cancelButtonText);
              } else if (isDestructive) {
                buttonStyle.push(styles.destructiveButton);
                textStyle.push(styles.destructiveButtonText);
              } else {
                // Style primary button to match the alert context color
                buttonStyle.push({ backgroundColor: iconColor });
              }

              // Determine width based on button count
              const btnWidth = config.buttons.length === 1 ? '100%' : '48%';

              return (
                <TouchableOpacity
                  key={index.toString()}
                  style={[buttonStyle, { width: btnWidth }]}
                  activeOpacity={0.8}
                  onPress={() => closeModal(btn.onPress)}
                >
                  <Text style={textStyle}>{btn.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 26, 46, 0.6)', // Deep purple-tinted dark overlay
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 20,
    color: '#1E1B2E',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 15,
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 15,
    color: '#475569',
  },
  destructiveButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  destructiveButtonText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 15,
    color: '#EF4444',
  },
});
