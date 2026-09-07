import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as aesjs from 'aes-js';
import 'react-native-get-random-values';

const KEY_SUFFIX = '.encryption-key';

function keyName(storageKey: string) {
  return `${storageKey}${KEY_SUFFIX}`;
}

function randomEncryptionKey(): Uint8Array {
  const key = new Uint8Array(32);
  crypto.getRandomValues(key);
  return key;
}

function encrypt(value: string, encryptionKey: Uint8Array): string {
  const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
  const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
  return aesjs.utils.hex.fromBytes(encrypted);
}

function decrypt(value: string, encryptionKey: Uint8Array): string {
  const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
  const decrypted = cipher.decrypt(aesjs.utils.hex.toBytes(value));
  return aesjs.utils.utf8.fromBytes(decrypted);
}

export class LargeSecureStore {
  async getItem(storageKey: string): Promise<string | null> {
    const [encryptedValue, encryptionKeyHex] = await Promise.all([
      AsyncStorage.getItem(storageKey),
      SecureStore.getItemAsync(keyName(storageKey)),
    ]);

    if (!encryptedValue) return null;

    if (!encryptionKeyHex) {
      await AsyncStorage.removeItem(storageKey);
      return null;
    }

    try {
      return decrypt(encryptedValue, aesjs.utils.hex.toBytes(encryptionKeyHex));
    } catch {
      await this.removeItem(storageKey);
      return null;
    }
  }

  async setItem(storageKey: string, value: string): Promise<void> {
    const encryptionKey = randomEncryptionKey();
    const encryptionKeyHex = aesjs.utils.hex.fromBytes(encryptionKey);
    const encryptedValue = encrypt(value, encryptionKey);

    await SecureStore.setItemAsync(keyName(storageKey), encryptionKeyHex);
    try {
      await AsyncStorage.setItem(storageKey, encryptedValue);
    } catch (error) {
      await SecureStore.deleteItemAsync(keyName(storageKey));
      throw error;
    }
  }

  async removeItem(storageKey: string): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(storageKey),
      SecureStore.deleteItemAsync(keyName(storageKey)),
    ]);
  }
}

export const supabaseSessionStorage = new LargeSecureStore();
