/** Utilidades de alta/modificación de usuarios (sugerencia de username, CUIL). */

const stripAccents = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const slug = (value: string) =>
  stripAccents(value).toLowerCase().replace(/[^a-z0-9]/g, "");

/** Sugiere un nombre de usuario `nombre.apellido`, evitando los ya usados. */
export function suggestUsername(firstName: string, lastName: string, taken: string[] = []): string {
  const first = slug(firstName);
  const last = slug(lastName);
  if (!first && !last) return "";
  const base = [first, last].filter(Boolean).join(".").slice(0, 32);
  const used = new Set(taken.filter(Boolean).map((u) => u.toLowerCase()));
  if (!used.has(base)) return base;
  for (let i = 2; i < 100; i += 1) {
    const candidate = `${base}${i}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${base}${Date.now().toString().slice(-4)}`;
}

/** Deja solo dígitos y formatea como CUIL/CUIT (XX-XXXXXXXX-X). */
export function formatCuil(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

/** Valida el dígito verificador del CUIL/CUIT argentino. */
export function isValidCuil(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  const mod = 11 - (sum % 11);
  const check = mod === 11 ? 0 : mod === 10 ? 9 : mod;
  return check === Number(digits[10]);
}
