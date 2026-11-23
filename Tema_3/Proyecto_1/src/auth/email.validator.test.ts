import { describe, expect, it } from "vitest";
import { isValidEmail, MAX_EMAIL_LENGTH, MAX_LOCAL_PART_LENGTH } from "./email.validator";

describe("isValidEmail", () => {
  it.each([
    "usuario@dominio.com",
    "nombre.apellido@empresa.co",
    "user+tag@sub.dominio.org",
    "a_b-c@dominio.io",
    "x@d.co",
    "o'connor@dominio.ie",
    "USUARIO@DOMINIO.COM",
    "user@xn--bcher-kva.de",
  ])("acepta %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    // casos del issue #1
    "usuario@.com",
    "usuario@..com",
    "usuario@dominio..com",
    "usuario@-dominio.com",
    "usuario@dominio-.com",
    "usuario@dominio.com.",
    "usuario@dominio.c",
    ".usuario@dominio.com",
    "usuario.@dominio.com",
    "usu..ario@dominio.com",
    // formato básico
    "",
    "no-es-un-email",
    "usuario@",
    "@dominio.com",
    "usuario@dominio",
    "usuario@@dominio.com",
    "usu ario@dominio.com",
    "usuario@domi nio.com",
    "usuario@dominio.c0m",
    "usuario@dominio_x.com",
  ])("rechaza %j", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it("rechaza una parte local de más de 64 caracteres", () => {
    expect(isValidEmail(`${"a".repeat(MAX_LOCAL_PART_LENGTH)}@dominio.com`)).toBe(true);
    expect(isValidEmail(`${"a".repeat(MAX_LOCAL_PART_LENGTH + 1)}@dominio.com`)).toBe(false);
  });

  it("rechaza emails de más de 254 caracteres", () => {
    const domain = `${"d".repeat(63)}.${"e".repeat(63)}.${"f".repeat(63)}.com`; // 195 caracteres
    const fits = `${"a".repeat(MAX_EMAIL_LENGTH - domain.length - 1)}@${domain}`;
    expect(fits).toHaveLength(MAX_EMAIL_LENGTH);
    expect(isValidEmail(fits)).toBe(true);
    expect(isValidEmail(`a${fits}`)).toBe(false);
  });

  it("rechaza etiquetas de dominio de más de 63 caracteres", () => {
    expect(isValidEmail(`u@${"d".repeat(63)}.com`)).toBe(true);
    expect(isValidEmail(`u@${"d".repeat(64)}.com`)).toBe(false);
  });
});
