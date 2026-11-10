import type { CompanyInfo } from './annuaire';
import type { RowResult } from './check';
import type { Status } from './ids';
import type { Table } from './table';
import { writeXlsx, type Sheet } from './xlsx';

/* Export du fichier d'origine, enrichi des colonnes de contrôle. */

const STATUS: Record<Status, string> = { ok: 'Valide', invalid: 'Invalide', format: 'À corriger', unverifiable: 'Format valide', empty: '' };
const LEVEL: Record<RowResult['level'], string> = { ok: 'OK', warning: 'À vérifier', error: 'Erreur', empty: 'Vide' };

export interface Enrichment {
  info?: CompanyInfo | null;
  /** Suggestion trouvée par nom et code postal (lignes sans SIREN). */
  suggestion?: CompanyInfo;
  nameMatch?: number;
}

/** Ajoute à la ligne les anomalies révélées par l'annuaire (à appeler une seule fois par ligne). */
export function applyEnrichment(r: RowResult, e: Enrichment): void {
  const raise = (level: 'warning' | 'error') => {
    if (level === 'error' || r.level !== 'error') r.level = level;
  };
  if (e.info === null) {
    r.problems.push('Annuaire : SIREN introuvable dans la base Sirene. Numéro bien formé mais non attribué : vérifiez-le auprès du client.');
    raise('error');
  } else if (e.info) {
    if (!e.info.active) {
      const on = e.info.closedOn ? ` le ${e.info.closedOn.split('-').reverse().join('/')}` : '';
      r.problems.push(`Annuaire : entreprise cessée${on}. Le client a peut-être un nouveau SIREN.`);
      raise('warning');
    }
    if (e.nameMatch !== undefined && e.nameMatch < 0.5) {
      r.problems.push(`Annuaire : le nom officiel (${e.info.name}) ne correspond pas à celui du fichier.`);
      raise('warning');
    }
  }
  if (e.suggestion) {
    r.problems.push(`Annuaire : SIREN suggéré ${e.suggestion.siren} (${e.suggestion.name}), à confirmer.`);
  }
}

const ADDED = [
  'Contrôle', 'Anomalies', 'SIREN retenu', 'SIREN', 'SIRET', 'TVA', 'TVA attendue', 'IBAN', 'IBAN formaté', 'BIC',
  'Annuaire : nom officiel', 'Annuaire : état', 'Annuaire : siège', 'Annuaire : TVA', 'Annuaire : nom concordant', 'Annuaire : SIREN suggéré',
];

function added(r: RowResult, e?: Enrichment): (string | undefined)[] {
  const info = e?.info;
  return [
    LEVEL[r.level],
    r.problems.join(' | ') || undefined,
    r.sirenFinal,
    STATUS[r.siren.status],
    STATUS[r.siret.status],
    STATUS[r.vat.status],
    r.vatExpected,
    STATUS[r.iban.status],
    r.iban.pretty,
    STATUS[r.bic.status],
    info?.name,
    info ? (info.active ? 'Active' : `Cessée${info.closedOn ? ` le ${info.closedOn.split('-').reverse().join('/')}` : ''}`) : info === null ? 'Introuvable' : undefined,
    info ? [info.address].filter(Boolean).join(' ') : undefined,
    info?.vat,
    e?.nameMatch === undefined ? undefined : e.nameMatch >= 0.5 ? 'Oui' : 'Non',
    e?.suggestion ? `${e.suggestion.siren} (${e.suggestion.name}, ${e.suggestion.postcode ?? ''} ${e.suggestion.city ?? ''})`.trim() : undefined,
  ];
}

export function toXlsx(table: Table, results: RowResult[], enrich: Map<number, Enrichment> = new Map()): Uint8Array {
  const header = [...table.headers, ...ADDED];
  const sheet: Sheet = {
    name: 'Contrôle',
    header,
    widths: [...table.headers.map((h) => Math.min(Math.max(h.length + 4, 12), 32)), 11, 60, 12, 11, 11, 13, 17, 11, 34, 11, 30, 18, 40, 17, 14, 40],
    rows: results.map((r) => [...table.rows[r.index], ...added(r, enrich.get(r.index))]),
  };
  return writeXlsx([sheet], 'Contrôle du fichier de tiers');
}

export function toCsv(table: Table, results: RowResult[], enrich: Map<number, Enrichment> = new Map()): string {
  const q = (v: string | undefined) => {
    const s = v ?? '';
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [[...table.headers, ...ADDED].map(q).join(';')];
  for (const r of results) lines.push([...table.rows[r.index], ...added(r, enrich.get(r.index))].map(q).join(';'));
  return '﻿' + lines.join('\r\n') + '\r\n';
}
