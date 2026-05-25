import { DeviceEventEmitter } from 'react-native';

class CustomAlert {
  /**
   * Mimics the native Alert.alert signature.
   * @param {string} title - The alert title
   * @param {string} message - The alert message
   * @param {Array} buttons - Array of button objects { text, onPress, style }
   * @param {object} options - Options object (e.g. { cancelable: true })
   */
  static alert(title, message, buttons = [], options = {}) {
    // If no buttons are provided, mimic native behavior and add an "OK" button
    const defaultButtons = buttons && buttons.length > 0 
      ? buttons 
      : [{ text: 'OK', onPress: () => {} }];

    DeviceEventEmitter.emit('SHOW_CUSTOM_ALERT', {
      title,
      message,
      buttons: defaultButtons,
      options,
    });
  }
}

export default CustomAlert;
