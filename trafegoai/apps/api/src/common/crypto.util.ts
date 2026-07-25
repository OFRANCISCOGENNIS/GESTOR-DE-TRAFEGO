// Criptografia de tokens OAuth em repouso (LGPD). AES-256-GCM.
// A chave vem de ENCRYPTION_KEY (32 bytes em hex/base64). Cobre round-trip nos testes.
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGO = "aes-256-gcm";

function keyFromEnv(explicit?: string): Buffer {
  const raw = explicit ?? process.env.ENCRYPTION_KEY ?? "trafegoai-dev-key-change-me";
  // Normaliza qualquer string para 32 bytes via SHA-256 (chave derivada estável).
  return createHash("sha256").update(raw).digest();
}

// Retorna "iv:authTag:ciphertext" em base64.
export function encryptToken(plaintext: string, key?: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, keyFromEnv(key), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decryptToken(payload: string, key?: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Payload criptografado inválido");
  const decipher = createDecipheriv(ALGO, keyFromEnv(key), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return dec.toString("utf8");
}
