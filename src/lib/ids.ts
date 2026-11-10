/*
 * Identifiants d'entreprise : SIREN, SIRET et numéro de TVA intracommunautaire.
 *
 *  - SIREN : 9 chiffres, clé de Luhn.
 *  - SIRET : SIREN + NIC (5 chiffres), clé de Luhn sur les 14 chiffres. Exception :
 *    les établissements de La Poste (SIREN 356000000), dont la somme des chiffres
 *    est un multiple de 5 (le siège, 35600000000048, respecte Luhn).
 *  - TVA française : FR + clé (2 caractères) + SIREN, avec clé = (12 + 3 × (SIREN mod 97)) mod 97.
 */

export type Status = 'ok' | 'invalid' | 'format' | 'unverifiable' | 'empty';

export interface IdResult {
  status: Status;
  /** Valeur normalisée (sans espaces ni ponctuation). */
  value: string;
  message: string;
  /** SIREN déduit (d'un SIRET ou d'un numéro de TVA français). */
  siren?: string;
}

/** Retire espaces, points, tirets ; détecte la notation scientifique d'Excel (5,52E+08). */
export function clean(raw: string | number | undefined): { value: string; scientific: boolean } {
  const s = String(raw ?? '').trim();
  const scientific = /^\d+([.,]\d+)?E\+?\d+$/i.test(s.replace(/\s/g, ''));
  return { value: s.replace(/[\s.\-_/  ]/g, '').toUpperCase(), scientific };
}

export function luhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

const SCIENTIFIC = 'Valeur en notation scientifique (ex. 5,52E+08) : Excel a converti le numéro en nombre et perdu des chiffres. Formatez la colonne en texte dans le fichier d’origine.';

export function checkSiren(raw: string | number | undefined): IdResult {
  const { value, scientific } = clean(raw);
  if (!value) return { status: 'empty', value, message: 'SIREN absent.' };
  if (scientific) return { status: 'format', value, message: SCIENTIFIC };
  if (!/^\d+$/.test(value)) return { status: 'format', value, message: `« ${raw} » contient autre chose que des chiffres.` };
  if (value.length === 8 && luhn('0' + value)) return { status: 'format', value: '0' + value, siren: '0' + value, message: '8 chiffres : le zéro initial a probablement été supprimé par un tableur.' };
  if (value.length === 14) {
    const s = checkSiret(value);
    return { ...s, status: s.status === 'ok' ? 'format' : s.status, value: value.slice(0, 9), siren: value.slice(0, 9), message: `C’est un SIRET (14 chiffres) : le SIREN est ${value.slice(0, 9)}.` };
  }
  if (value.length !== 9) return { status: 'format', value, message: `${value.length} chiffres au lieu de 9.` };
  if (!luhn(value)) return { status: 'invalid', value, message: 'Clé de contrôle invalide : faute de frappe probable.' };
  return { status: 'ok', value, siren: value, message: 'SIREN valide.' };
}

export const LA_POSTE = '356000000';

export function checkSiret(raw: string | number | undefined): IdResult {
  const { value, scientific } = clean(raw);
  if (!value) return { status: 'empty', value, message: 'SIRET absent.' };
  if (scientific) return { status: 'format', value, message: SCIENTIFIC };
  if (!/^\d+$/.test(value)) return { status: 'format', value, message: `« ${raw} » contient autre chose que des chiffres.` };
  if (value.length === 13 && luhn('0' + value)) return { status: 'format', value: '0' + value, siren: ('0' + value).slice(0, 9), message: '13 chiffres : le zéro initial a probablement été supprimé par un tableur.' };
  if (value.length !== 14) return { status: 'format', value, message: `${value.length} chiffres au lieu de 14.` };
  const siren = value.slice(0, 9);
  if (siren === LA_POSTE && value !== '35600000000048') {
    const sum = [...value].reduce((s, d) => s + Number(d), 0);
    return sum % 5 === 0
      ? { status: 'ok', value, siren, message: 'SIRET valide (établissement de La Poste : règle de la somme multiple de 5).' }
      : { status: 'invalid', value, siren, message: 'SIRET de La Poste invalide (la somme des chiffres doit être un multiple de 5).' };
  }
  if (!luhn(value)) return { status: 'invalid', value, siren, message: 'Clé de contrôle invalide : faute de frappe probable.' };
  if (!luhn(siren)) return { status: 'invalid', value, siren, message: 'Le SIRET est cohérent mais son SIREN (9 premiers chiffres) ne l’est pas.' };
  return { status: 'ok', value, siren, message: 'SIRET valide.' };
}

/** Clé de TVA française à partir d'un SIREN. */
export function frVatKey(siren: string): string {
  return String((12 + 3 * (Number(siren) % 97)) % 97).padStart(2, '0');
}

export function frVatFromSiren(siren: string): string {
  return `FR${frVatKey(siren)}${siren}`;
}

/**
 * Formats des numéros de TVA des États membres (et de l'Irlande du Nord, XI).
 * Seul le format est contrôlé, sauf pour la France et la Belgique (clé recalculée).
 */
export const VAT_FORMATS: Record<string, { name: string; re: RegExp; eu: boolean }> = {
  AT: { name: 'Autriche', re: /^ATU\d{8}$/, eu: true },
  BE: { name: 'Belgique', re: /^BE[01]\d{9}$/, eu: true },
  BG: { name: 'Bulgarie', re: /^BG\d{9,10}$/, eu: true },
  CY: { name: 'Chypre', re: /^CY\d{8}[A-Z]$/, eu: true },
  CZ: { name: 'Tchéquie', re: /^CZ\d{8,10}$/, eu: true },
  DE: { name: 'Allemagne', re: /^DE\d{9}$/, eu: true },
  DK: { name: 'Danemark', re: /^DK\d{8}$/, eu: true },
  EE: { name: 'Estonie', re: /^EE\d{9}$/, eu: true },
  EL: { name: 'Grèce', re: /^EL\d{9}$/, eu: true },
  ES: { name: 'Espagne', re: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/, eu: true },
  FI: { name: 'Finlande', re: /^FI\d{8}$/, eu: true },
  FR: { name: 'France', re: /^FR[A-HJ-NP-Z0-9]{2}\d{9}$/, eu: true },
  HR: { name: 'Croatie', re: /^HR\d{11}$/, eu: true },
  HU: { name: 'Hongrie', re: /^HU\d{8}$/, eu: true },
  IE: { name: 'Irlande', re: /^IE\d[0-9A-Z+*]\d{5}[A-Z]{1,2}$/, eu: true },
  IT: { name: 'Italie', re: /^IT\d{11}$/, eu: true },
  LT: { name: 'Lituanie', re: /^LT(\d{9}|\d{12})$/, eu: true },
  LU: { name: 'Luxembourg', re: /^LU\d{8}$/, eu: true },
  LV: { name: 'Lettonie', re: /^LV\d{11}$/, eu: true },
  MT: { name: 'Malte', re: /^MT\d{8}$/, eu: true },
  NL: { name: 'Pays-Bas', re: /^NL\d{9}B\d{2}$/, eu: true },
  PL: { name: 'Pologne', re: /^PL\d{10}$/, eu: true },
  PT: { name: 'Portugal', re: /^PT\d{9}$/, eu: true },
  RO: { name: 'Roumanie', re: /^RO\d{2,10}$/, eu: true },
  SE: { name: 'Suède', re: /^SE\d{12}$/, eu: true },
  SI: { name: 'Slovénie', re: /^SI\d{8}$/, eu: true },
  SK: { name: 'Slovaquie', re: /^SK\d{10}$/, eu: true },
  XI: { name: 'Irlande du Nord', re: /^XI(\d{9}|\d{12}|GD\d{3}|HA\d{3})$/, eu: true },
  GB: { name: 'Royaume-Uni (hors UE)', re: /^GB(\d{9}|\d{12}|GD\d{3}|HA\d{3})$/, eu: false },
  CH: { name: 'Suisse (hors UE)', re: /^CHE\d{9}(MWST|TVA|IVA)?$/, eu: false },
  NO: { name: 'Norvège (hors UE)', re: /^NO\d{9}(MVA)?$/, eu: false },
};

export function checkVat(raw: string | undefined): IdResult & { country?: string } {
  let { value } = clean(raw);
  if (!value) return { status: 'empty', value, message: 'Numéro de TVA absent.' };
  if (value.startsWith('GR')) value = 'EL' + value.slice(2);
  const country = value.slice(0, 2);
  const fmt = VAT_FORMATS[country];
  if (!fmt) {
    if (/^\d{11}$/.test(value) && luhn(value.slice(2))) {
      return { status: 'format', value, message: 'Préfixe pays absent : ajoutez « FR » devant le numéro.', country: 'FR', siren: value.slice(2) };
    }
    return { status: 'format', value, message: `Préfixe pays « ${country} » inconnu. Un numéro de TVA commence par le code du pays (FR, DE, BE…).` };
  }
  if (!fmt.re.test(value)) return { status: 'format', value, country, message: `Format incorrect pour ${fmt.name}.` };

  if (country === 'FR') {
    const key = value.slice(2, 4);
    const siren = value.slice(4);
    if (!luhn(siren)) return { status: 'invalid', value, country, siren, message: `Le SIREN contenu dans le numéro (${siren}) a une clé invalide.` };
    if (!/^\d{2}$/.test(key)) {
      return { status: 'unverifiable', value, country, siren, message: 'Clé alphanumérique : ce type de clé, rare, ne peut pas être recalculé hors du service de la DGFiP.' };
    }
    const expected = frVatKey(siren);
    if (key !== expected) return { status: 'invalid', value, country, siren, message: `Clé incorrecte : pour le SIREN ${siren}, la clé attendue est ${expected} (FR${expected}${siren}).` };
    return { status: 'ok', value, country, siren, message: 'Numéro de TVA français valide.' };
  }
  if (country === 'BE') {
    const n = value.slice(2);
    const ok = 97 - (Number(n.slice(0, 8)) % 97) === Number(n.slice(8));
    return ok
      ? { status: 'ok', value, country, message: 'Numéro de TVA belge valide.' }
      : { status: 'invalid', value, country, message: 'Clé de contrôle belge incorrecte.' };
  }
  return {
    status: 'unverifiable',
    value,
    country,
    message: fmt.eu ? `Format valide pour ${fmt.name}. L’existence se vérifie sur le service européen VIES.` : `Format valide pour ${fmt.name}.`,
  };
}
