/**
 * Client-Side End-to-End Encryption Service using Web Crypto API (AES-GCM 256-bit).
 * Encrypts and decrypts all local task items, conversation logs, and secret preferences.
 */

const DEFAULT_KEY_SALT = 'jarvis_quantum_entropy_salt_2026';
let cryptoKeyCache: CryptoKey | null = null;
let currentPassphrase = 'JARVIS_MASTER_SECURITY_KEY_99';

// Derive AES-GCM Key from passphrase
async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(DEFAULT_KEY_SALT),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function setPassphrase(newPassphrase: string) {
  currentPassphrase = newPassphrase;
  cryptoKeyCache = await deriveKey(newPassphrase);
}

export async function getCryptoKey(): Promise<CryptoKey> {
  if (!cryptoKeyCache) {
    cryptoKeyCache = await deriveKey(currentPassphrase);
  }
  return cryptoKeyCache;
}

/**
 * Encrypts arbitrary JS object or string using AES-GCM.
 * Returns base64 payload containing IV + Ciphertext.
 */
export async function encryptData(data: any): Promise<string> {
  try {
    const key = await getCryptoKey();
    const enc = new TextEncoder();
    const plaintext = JSON.stringify(data);
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      enc.encode(plaintext)
    );

    // Combine IV (12 bytes) + Encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    // Convert to base64
    let binary = '';
    const bytes = new Uint8Array(combined);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (err) {
    console.error('E2E Encryption error:', err);
    throw err;
  }
}

/**
 * Decrypts base64 AES-GCM payload and parses as JSON.
 */
export async function decryptData(cipherBase64: string): Promise<any> {
  try {
    const key = await getCryptoKey();
    const binary = atob(cipherBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const iv = bytes.slice(0, 12);
    const encryptedData = bytes.slice(12);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      encryptedData
    );

    const dec = new TextDecoder();
    const decryptedText = dec.decode(decryptedBuffer);
    return JSON.parse(decryptedText);
  } catch (err) {
    console.warn('E2E Decryption failed or data was unencrypted fallback:', err);
    return null;
  }
}

/**
 * Encrypted LocalStorage helper
 */
export async function saveEncryptedItem(storageKey: string, data: any): Promise<void> {
  try {
    const cipher = await encryptData(data);
    localStorage.setItem(`enc_${storageKey}`, cipher);
  } catch (err) {
    // Fallback to plain if crypto fails in restricted environments
    localStorage.setItem(storageKey, JSON.stringify(data));
  }
}

export async function loadEncryptedItem<T>(storageKey: string, defaultValue: T): Promise<T> {
  try {
    const cipher = localStorage.getItem(`enc_${storageKey}`);
    if (cipher) {
      const decrypted = await decryptData(cipher);
      if (decrypted !== null) return decrypted as T;
    }
    const plain = localStorage.getItem(storageKey);
    if (plain) {
      return JSON.parse(plain) as T;
    }
  } catch (err) {
    console.warn(`Could not load ${storageKey}:`, err);
  }
  return defaultValue;
}
