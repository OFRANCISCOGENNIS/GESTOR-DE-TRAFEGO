import { encryptToken, decryptToken } from "./crypto.util";

describe("crypto.util — tokens OAuth em repouso (AES-256-GCM)", () => {
  it("faz round-trip: decrypt(encrypt(x)) === x", () => {
    const token = "ya29.a0AfH6SMBx-exemplo-de-access-token-oauth";
    const enc = encryptToken(token);
    expect(decryptToken(enc)).toBe(token);
  });

  it("nunca guarda o texto puro no ciphertext", () => {
    const token = "segredo-super-sensivel";
    const enc = encryptToken(token);
    expect(enc).not.toContain(token);
  });

  it("gera IV aleatório: mesmas entradas => ciphertexts diferentes", () => {
    const token = "mesmo-token";
    expect(encryptToken(token)).not.toBe(encryptToken(token));
  });

  it("emite formato iv:authTag:ciphertext", () => {
    const enc = encryptToken("abc");
    expect(enc.split(":")).toHaveLength(3);
  });

  it("falha ao decifrar com chave errada (autenticação GCM)", () => {
    const enc = encryptToken("dados", "chave-correta");
    expect(() => decryptToken(enc, "chave-errada")).toThrow();
  });

  it("falha em payload adulterado (auth tag inválido)", () => {
    const enc = encryptToken("dados");
    const parts = enc.split(":");
    const tampered = [parts[0], parts[1], Buffer.from("outra-coisa").toString("base64")].join(":");
    expect(() => decryptToken(tampered)).toThrow();
  });
});
