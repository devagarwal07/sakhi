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
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Shadows } from '../utils/theme';

export default function GlobalErrorModal() {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    options: {},
  });

  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('SHOW_CUSTOM_ALERT', (alertConfig) => {
      setConfig(alertConfig);
      setVisible(true);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });

    return () => subscription.remove();
  }, [scaleAnim, opacityAnim]);

  const closeModal = (onPress) => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
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

  const isError = config.title?.toLowerCase().includes('error') || 
                  config.title?.toLowerCase().includes('fail');
  const iconName = isError ? 'error-outline' : 'info-outline';
  const iconColor = isError ? Colors.error : Colors.primary;

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
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: isError ? Colors.errorContainer : Colors.primaryFixed }]}>
            <MaterialIcons name={iconName} size={32} color={iconColor} />
          </View>

          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.message}>{config.message}</Text>

          <View style={styles.buttonContainer}>
            {config.buttons?.map((btn, index) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              
              let buttonStyle = styles.primaryButton;
              let textStyle = styles.primaryButtonText;

              if (isCancel) {
                buttonStyle = styles.cancelButton;
                textStyle = styles.cancelButtonText;
              } else if (isDestructive) {
                buttonStyle = styles.destructiveButton;
                textStyle = styles.destructiveButtonText;
              }

              // If there's only one button, make it span full width.
              // If two buttons, put them side by side.
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
    flex: 1,
    backgroundColor: 'rgba(28, 26, 46, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...Shadows.card,
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
    ...Typography.titleMedium,
    color: Colors.onBackground,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    ...Typography.bodyMedium,
    color: Colors.onSurfaceVariant,
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
    backgroundColor: Colors.primaryContainer,
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    ...Typography.labelLarge,
    color: Colors.onPrimary,
  },
  cancelButton: {
    backgroundColor: Colors.surfaceContainerLow,
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    ...Typography.labelLarge,
    color: Colors.onSurface,
  },
  destructiveButton: {
    backgroundColor: Colors.errorContainer,
    borderWidth: 1,
    borderColor: Colors.error,
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  destructiveButtonText: {
    ...Typography.labelLarge,
    color: Colors.error,
  },
});
