// Web Crypto API helpers for End-to-End Encryption (AES-GCM 256-bit with PBKDF2)

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
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
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(data: unknown, passphrase: string): Promise<{ ciphertext: string; iv: string; salt: string }> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const enc = new TextEncoder();
  const encodedData = enc.encode(JSON.stringify(data));

  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encodedData
  );

  return {
    ciphertext: arrayBufferToBase64(encryptedContent),
    iv: arrayBufferToBase64(iv.buffer),
    salt: arrayBufferToBase64(salt.buffer),
  };
}

export async function decryptData(
  encryptedPackage: { ciphertext: string; iv: string; salt: string },
  passphrase: string
): Promise<unknown> {
  const salt = new Uint8Array(base64ToArrayBuffer(encryptedPackage.salt));
  const iv = new Uint8Array(base64ToArrayBuffer(encryptedPackage.iv));
  const ciphertextBuffer = base64ToArrayBuffer(encryptedPackage.ciphertext);

  const key = await deriveKey(passphrase, salt);

  const decryptedContent = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertextBuffer
  );

  const dec = new TextDecoder();
  return JSON.parse(dec.decode(decryptedContent));
}

export async function calculateSHA256(text: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Simulated TOTP (Time-based One-Time Password) generator & verifier
export function generate2FASecret(): { secret: string; uri: string } {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 16; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const uri = `otpauth://totp/BukuKasPro:user@finvault.app?secret=${secret}&issuer=BukuKasPro`;
  return { secret, uri };
}

// Generate simple deterministic 6-digit TOTP code based on 30s epoch interval
export function getSimulatedTOTPCode(secret: string, timestampOffset = 0): string {
  const timeStep = Math.floor((Date.now() + timestampOffset) / 30000);
  let hash = 0;
  for (let i = 0; i < secret.length; i++) {
    hash = (hash * 31 + secret.charCodeAt(i) + timeStep) % 1000000;
  }
  return Math.abs(hash).toString().padStart(6, '0');
}

export const generateTOTPCode = (secret: string, offset = 0) => Promise.resolve(getSimulatedTOTPCode(secret, offset));

export function verifyTOTPCode(secret: string, userCode: string): boolean {
  if (!secret || !userCode || userCode.trim().length !== 6) return false;
  const current = getSimulatedTOTPCode(secret, 0);
  const prev = getSimulatedTOTPCode(secret, -30000); // 30s drift tolerance
  const next = getSimulatedTOTPCode(secret, 30000);
  const cleanCode = userCode.trim();
  return cleanCode === current || cleanCode === prev || cleanCode === next;
}
