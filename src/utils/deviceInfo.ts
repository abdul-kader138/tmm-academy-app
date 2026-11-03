import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = '@tmm_academy_device_id';

export async function getDeviceId(): Promise<string> {
  try {
    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
      await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'fallback_device_id';
  }
}

export function getDeviceName(): string {
  if (Platform.OS === 'ios') {
    return 'iPhone App';
  } else if (Platform.OS === 'android') {
    return 'Android Phone App';
  }
  return 'Mobile Client';
}
