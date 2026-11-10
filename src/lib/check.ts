import { checkSiren, checkSiret, checkVat, clean, frVatFromSiren, luhn, type IdResult, type Status } from './ids';
import { checkBic, checkIban, type IbanResult } from './iban';

/*
 * Vérification ligne à ligne d'un fichier de tiers (clients ou fournisseurs) :
 * détection des colonnes, contrôle de chaque identifiant, cohérence entre eux
 * et valeurs déduites (SIREN à partir du SIRET ou de la TVA, TVA attendue…).
 */

export type Field = 'name' | 'siren' | 'siret' | 'vat' | 'iban' | 'bic' | 'postcode' | 'city' | 'country';

export const FIELD_LABELS: Record<Field, string> = {
  name: 'Raison sociale',
  siren: 'SIREN',
  siret: 'SIRET',
  vat: 'N° TVA intracommunautaire',
  iban: 'IBAN',
  bic: 'BIC',
  postcode: 'Code postal',
  city: 'Ville',
  country: 'Pays',
};

export type Mapping = Partial<Record<Field, number>>;

const HEADER_PATTERNS: [Field, RegExp][] = [
  ['siret', /siret/],
  ['siren', /siren|n.?\s*identification|registration|company.?id/],
  ['vat', /tva|vat|intra|ust.?id|n.?\s*tva/],
  ['iban', /iban|rib|compte bancaire|bank account/],
  ['bic', /bic|swift/],
  ['postcode', /code.?postal|^cp$|postal|zip|post.?code/],
  ['city', /ville|commune|city|localit/],
  ['country', /^pays|country|code.?pays/],
  ['name', /raison|d[eé]nomination|^nom|^name|soci[eé]t[eé]|entreprise|company/],
  ['name', /^(client|fournisseur|tiers)$|nom|libell/],
];

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/** Devine les colonnes à partir des en-têtes, puis du contenu pour celles qui restent. */
export function guessMapping(headers: string[], rows: string[][]): Mapping {
  const m: Mapping = {};
  const used = new Set<number>();
  for (const [field, re] of HEADER_PATTERNS) {
    const i = headers.findIndex((h, idx) => !used.has(idx) && re.test(norm(h)));
    if (i >= 0 && m[field] === undefined) {
      m[field] = i;
      used.add(i);
    }
  }
  const sample = rows.slice(0, 50);
  const score = (i: number, test: (v: string) => boolean) => {
    const vals = sample.map((r) => clean(r[i]).value).filter(Boolean);
    return vals.length ? vals.filter(test).length / vals.length : 0;
  };
  const tryContent = (field: Field, test: (v: string) => boolean) => {
    if (m[field] !== undefined) return;
    const best = headers.map((_, i) => [i, used.has(i) ? 0 : score(i, test)] as const).sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 0.6) {
      m[field] = best[0];
      used.add(best[0]);
    }
  };
  tryContent('iban', (v) => /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v));
  tryContent('vat', (v) => /^(FR[0-9A-Z]{2}\d{9}|[A-Z]{2}[0-9A-Z]{8,12})$/.test(v) && !/^[A-Z]{2}\d{2}[A-Z0-9]{14,}$/.test(v));
  tryContent('siret', (v) => /^\d{14}$/.test(v));
  tryContent('siren', (v) => /^\d{9}$/.test(v));
  tryContent('bic', (v) => /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v));
  return m;
}

export type Level = 'ok' | 'warning' | 'error' | 'empty';

export interface RowResult {
  index: number;
  name: string;
  siren: IdResult;
  siret: IdResult;
  vat: IdResult & { country?: string };
  iban: IbanResult;
  bic: { status: Status; value: string; message: string };
  /** SIREN retenu pour la ligne (colonne SIREN, sinon déduit du SIRET ou de la TVA). */
  sirenFinal?: string;
  vatExpected?: string;
  /** Anomalies de cohérence entre identifiants. */
  consistency: string[];
  /** Synthèse lisible des problèmes. */
  problems: string[];
  level: Level;
  foreign: boolean;
}


export function checkRow(row: string[], m: Mapping, index: number): RowResult {
  const get = (f: Field) => (m[f] === undefined ? '' : row[m[f]!] ?? '');
  const country = norm(get('country'));
  const vatRaw = get('vat');
  const vat = checkVat(vatRaw);
  const foreign = (!!country && !/^(fr|france|fra)$/.test(country)) || (!!vat.country && vat.country !== 'FR' && vat.status !== 'empty');

  const siren = checkSiren(get('siren'));
  const siret = checkSiret(get('siret'));
  const iban = checkIban(get('iban'));
  const bic = checkBic(get('bic'), iban.country);

  const consistency: string[] = [];
  const sirenFromSiret = siret.status === 'ok' ? siret.siren : undefined;
  const sirenFromVat = vat.siren && (vat.status === 'ok' || vat.status === 'unverifiable') ? vat.siren : undefined;
  const sirenOk = siren.status === 'ok' ? siren.value : siren.siren && luhn(siren.siren) ? siren.siren : undefined;

  if (sirenOk && sirenFromSiret && sirenOk !== sirenFromSiret) consistency.push(`Le SIRET (${siret.value}) n’appartient pas au SIREN ${sirenOk}.`);
  if (sirenOk && sirenFromVat && sirenOk !== sirenFromVat) consistency.push(`Le numéro de TVA (${vat.value}) correspond au SIREN ${sirenFromVat}, pas à ${sirenOk}.`);
  if (!sirenOk && sirenFromSiret && sirenFromVat && sirenFromSiret !== sirenFromVat) consistency.push('Le SIRET et le numéro de TVA ne désignent pas la même entreprise.');

  const sirenFinal = sirenOk ?? sirenFromSiret ?? sirenFromVat;
  const vatExpected = sirenFinal && !foreign ? frVatFromSiren(sirenFinal) : undefined;

  // Erreurs : clé fausse, incohérence. Avertissements : format à corriger, donnée manquante.
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const [label, r] of [['SIREN', siren], ['SIRET', siret], ['TVA', vat], ['IBAN', iban], ['BIC', bic]] as const) {
    if (r.status === 'invalid') errors.push(`${label} : ${r.message}`);
    else if (r.status === 'format') warnings.push(`${label} : ${r.message}`);
  }
  errors.push(...consistency);
  if (!foreign && !sirenFinal && m.siren !== undefined) warnings.push('SIREN manquant : obligatoire sur les factures aux entreprises françaises depuis 2026.');
  if (!foreign && vat.status === 'empty' && vatExpected && m.vat !== undefined) warnings.push(`TVA absente : numéro calculé à partir du SIREN, ${vatExpected} (à confirmer, l’entreprise peut ne pas être assujettie).`);
  const problems = [...errors, ...warnings];

  const level: Level = errors.length ? 'error' : warnings.length ? 'warning' : [siren, siret, vat, iban].every((r) => r.status === 'empty') ? 'empty' : 'ok';
  return {
    index,
    name: get('name').trim(),
    siren,
    siret,
    vat,
    iban,
    bic,
    sirenFinal,
    vatExpected,
    consistency,
    problems,
    level,
    foreign,
  };
}

export function checkAll(rows: string[][], m: Mapping): RowResult[] {
  return rows.map((r, i) => checkRow(r, m, i));
}

export function stats(results: RowResult[]) {
  return {
    total: results.length,
    ok: results.filter((r) => r.level === 'ok').length,
    warning: results.filter((r) => r.level === 'warning').length,
    error: results.filter((r) => r.level === 'error').length,
    missingSiren: results.filter((r) => !r.sirenFinal && !r.foreign).length,
  };
}
