// @vitest-environment happy-dom
import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { checkSiren, checkSiret, checkVat, frVatFromSiren, luhn } from '../src/lib/ids';
import { checkBic, checkIban, ribKey, ribToIban } from '../src/lib/iban';
import { readTable, parseCsv } from '../src/lib/table';
import { checkAll, guessMapping, stats } from '../src/lib/check';
import { applyEnrichment, toXlsx, toCsv } from '../src/lib/export';
import { createClient, nameSimilarity } from '../src/lib/annuaire';
import { sampleCsv } from '../src/lib/sample';
import { writeXlsx } from '../src/lib/xlsx';

describe('SIREN, SIRET, TVA', () => {
  it('SIREN', () => {
    expect(checkSiren('552 032 534').status).toBe('ok');
    expect(checkSiren('552032535').status).toBe('invalid');
    expect(checkSiren('5,52033E+08').message).toMatch(/notation scientifique/);
    expect(checkSiren('').status).toBe('empty');
    expect(checkSiren('55203253400703')).toMatchObject({ status: 'format', siren: '552032534' });
  });
  it('SIRET et exception La Poste', () => {
    expect(checkSiret('55203253400703').status).toBe('ok');
    expect(checkSiret('55203253400704').status).toBe('invalid');
    expect(checkSiret('35600000049639').status).toBe('ok');
    expect(checkSiret('35600000000048').status).toBe('ok'); // siège : Luhn
    expect(checkSiret('35600000049638').status).toBe('invalid');
  });
  it('TVA française : clé recalculée', () => {
    expect(frVatFromSiren('552032534')).toBe('FR27552032534');
    expect(checkVat('FR 27 552 032 534').status).toBe('ok');
    expect(checkVat('FR00552032534').message).toContain('FR27552032534');
    expect(checkVat('FRAB552032534').status).toBe('unverifiable');
    expect(checkVat('27552032534')).toMatchObject({ status: 'format', siren: '552032534' });
  });
  it('TVA étrangère', () => {
    expect(checkVat('BE0412345659').status).toMatch(/ok|invalid/);
    expect(checkVat('DE123456789').status).toBe('unverifiable');
    expect(checkVat('DE12345678').status).toBe('format');
    expect(checkVat('GR123456789').value).toBe('EL123456789');
    expect(checkVat('ZZ1234').status).toBe('format');
  });
});

describe('IBAN, RIB, BIC', () => {
  const iban = ribToIban('30006', '00001', '12345678901', ribKey('30006', '00001', '12345678901'));
  it('IBAN français et clé RIB', () => {
    expect(checkIban(iban).status).toBe('ok');
    expect(checkIban('FR14 2004 1010 0505 0001 3M02 606').status).toBe('ok');
    expect(checkIban('DE89 3704 0044 0532 0130 00').status).toBe('ok');
    expect(checkIban('GB82 WEST 1234 5698 7654 32').status).toBe('ok');
    expect(checkIban(iban.slice(0, -1) + (iban.endsWith('1') ? '2' : '1')).status).toBe('invalid');
    expect(checkIban(iban.slice(0, -1)).message).toMatch(/26 caractères au lieu de 27/);
  });
  it('RIB saisi à la place de l’IBAN', () => {
    const r = checkIban(iban.slice(4));
    expect(r.status).toBe('format');
    expect(r.value).toBe(iban);
  });
  it('BIC', () => {
    expect(checkBic('AGRIFRPPXXX', 'FR').status).toBe('ok');
    expect(checkBic('DEUTDEFF', 'FR').status).toBe('invalid');
    expect(checkBic('AGRIFR', 'FR').status).toBe('format');
  });
});

describe('Lecture de tableaux', () => {
  it('CSV avec guillemets et séparateur détecté', () => {
    const { rows, separator } = parseCsv('a;b\r\n"x;1";"dit ""bonjour"""\r\n');
    expect(separator).toBe(';');
    expect(rows[1]).toEqual(['x;1', 'dit "bonjour"']);
  });
  it('XLSX', () => {
    const bytes = writeXlsx([{ name: 'Clients', header: ['Nom', 'SIREN'], widths: [10, 10], rows: [['DANONE', '552032534'], ['X', 552032534]] }]);
    const t = readTable(bytes, 'clients.xlsx');
    expect(t.source).toBe('XLSX');
    expect(t.headers).toEqual(['Nom', 'SIREN']);
    expect(t.rows).toEqual([['DANONE', '552032534'], ['X', '552032534']]);
  });
});

describe('Fichier d’exemple', () => {
  const table = readTable(new TextEncoder().encode(sampleCsv()), 'clients.csv');
  const m = guessMapping(table.headers, table.rows);
  const res = checkAll(table.rows, m);
  const byCode = (c: string) => res[table.rows.findIndex((r) => r[0] === c)];
  it('détecte les colonnes', () => {
    expect(m).toMatchObject({ name: 1, siren: 2, siret: 3, vat: 4, iban: 5, bic: 6, postcode: 7, city: 8, country: 9 });
  });
  it('trouve chaque erreur', () => {
    expect(byCode('C001').level).toBe('ok');
    expect(byCode('C002').level).toBe('ok');
    expect(byCode('C003').level).toBe('ok');
    expect(byCode('C004').problems.join()).toMatch(/notation scientifique/);
    expect(byCode('C005').vat.status).toBe('invalid');
    expect(byCode('C005').iban.status).toBe('invalid');
    expect(byCode('C006').consistency[0]).toMatch(/n’appartient pas/);
    expect(byCode('C007').siren.message).toMatch(/zéro initial/);
    expect(byCode('C007').sirenFinal).toMatch(/^0/);
    expect(byCode('C008').iban.message).toMatch(/RIB/);
    expect(byCode('C009').foreign).toBe(true);
    expect(byCode('C009').iban.status).toBe('ok');
    expect(byCode('C009').vat.status).toBe('ok');
    expect(byCode('C010').bic.status).toBe('invalid');
    expect(byCode('C011').problems.join()).toMatch(/SIREN manquant/);
    const s = stats(res);
    expect(s.total).toBe(11);
  });
  it('exporte', () => {
    const x = toXlsx(table, res);
    mkdirSync('tests/out', { recursive: true });
    writeFileSync('tests/out/controle.xlsx', x);
    writeFileSync('tests/out/clients.csv', sampleCsv());
    expect(readTable(x, 'x.xlsx').headers).toContain('Anomalies');
    expect(toCsv(table, res).split('\r\n')[0]).toContain('SIREN retenu');
  });
});

describe('Annuaire (API simulée)', () => {
  it('limite le débit et réessaie après un 429', async () => {
    let calls = 0;
    const fake = vi.fn(async () => {
      calls++;
      if (calls === 1) return { ok: false, status: 429, json: async () => ({}), headers: { get: () => '0.01' } };
      return { ok: true, status: 200, json: async () => ({ results: [{ siren: '552032534', nom_complet: 'DANONE', etat_administratif: 'A', tva: ['FR27552032534'], siege: { adresse: 'PARIS' }, statut_diffusion: 'O' }] }), headers: { get: () => null } };
    });
    const c = createClient(fake, 1);
    const info = await c.bySiren('552032534');
    expect(info).toMatchObject({ name: 'DANONE', active: true, vat: 'FR27552032534' });
    expect(calls).toBe(2);
  });
  it('compare les raisons sociales', () => {
    expect(nameSimilarity('Danone SA', 'DANONE')).toBe(1);
    expect(nameSimilarity('Boulangerie Martin SARL', 'BOULANGERIE MARTIN & FILS')).toBe(1);
    expect(nameSimilarity('Garage des Alpes', 'Plomberie Durand')).toBe(0);
  });
  it('luhn', () => expect(luhn('552032534')).toBe(true));
});

describe('Résultats de l’annuaire', () => {
  it('signale un SIREN introuvable et une entreprise cessée', () => {
    const table = readTable(new TextEncoder().encode(sampleCsv()), 'clients.csv');
    const results = checkAll(table.rows, guessMapping(table.headers, table.rows));
    const danone = results[0];
    expect(danone.level).toBe('ok');
    applyEnrichment(danone, { info: null });
    expect(danone.level).toBe('error');
    expect(danone.problems.at(-1)).toMatch(/introuvable/);
    const poste = results[1];
    applyEnrichment(poste, { info: { siren: '356000000', name: 'LA POSTE', active: false, closedOn: '2020-01-31', diffusible: true }, nameMatch: 1 });
    expect(poste.level).toBe('warning');
    expect(poste.problems.at(-1)).toMatch(/cessée le 31\/01\/2020/);
  });
});
