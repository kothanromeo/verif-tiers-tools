import { frVatFromSiren, luhn } from './ids';
import { mod97, ribKey, ribToIban } from './iban';

/*
 * Fichier clients d'exemple. Les deux premières lignes sont de vraies entreprises
 * (données publiques de l'annuaire officiel) ; les autres sont fictives et contiennent
 * chacune une erreur typique.
 */

/** Complète un préfixe avec le chiffre qui rend la clé de Luhn valide. */
export function luhnComplete(base: string): string {
  for (let k = 0; k <= 9; k++) if (luhn(base + k)) return base + k;
  return base + '0';
}

/** SIRET valide pour un SIREN donné (NIC 0001x). */
export const siretFor = (siren: string) => luhnComplete(siren + '0001');

const frIban = (bank: string, branch: string, account: string) => ribToIban(bank, branch, account, ribKey(bank, branch, account));

export function ibanFromBban(country: string, bban: string): string {
  const digits = [...(bban + country + '00')].map((c) => (c >= 'A' ? String(c.charCodeAt(0) - 55) : c)).join('');
  return country + String(98 - mod97(digits)).padStart(2, '0') + bban;
}

export function sampleCsv(): string {
  // SIREN fictifs : clé valide, mais non attribués (vérifié dans l’annuaire).
  const sA = luhnComplete('00123456');
  const sB = luhnComplete('00987654');
  const sC = luhnComplete('00456789');
  const sD = luhnComplete('05420120'); // SIREN commençant par 0
  const sE = luhnComplete('00345678');
  const ibanOk = frIban('12345', '00123', '00012345678');
  const ibanTypo = ibanOk.slice(0, 20) + (ibanOk[20] === '9' ? '1' : '9') + ibanOk.slice(21);
  const rib = ['30006', '00001', '12345678901'];
  const ribText = rib.join('') + ribKey(rib[0], rib[1], rib[2]);
  const beFirst8 = '04123456';
  const beVat = `BE${beFirst8}${String(97 - (Number(beFirst8) % 97)).padStart(2, '0')}`;
  const beBban = '3101234567' + String(Number('3101234567') % 97 || 97).padStart(2, '0');

  const rows = [
    ['Code client', 'Raison sociale', 'SIREN', 'SIRET', 'N° TVA intracommunautaire', 'IBAN', 'BIC', 'Code postal', 'Ville', 'Pays'],
    ['C001', 'DANONE', '552032534', '55203253400703', 'FR27552032534', '', '', '75009', 'PARIS', 'France'],
    ['C002', 'LA POSTE', '356000000', '35600000049639', frVatFromSiren('356000000'), '', '', '75015', 'PARIS', 'France'],
    ['C003', 'ATELIER BOIS ET CIE', sA, siretFor(sA), frVatFromSiren(sA), ibanOk, 'AGRIFRPPXXX', '69003', 'LYON', 'France'],
    ['C004', 'STUDIO GRAPHIQUE NORD', '7,98654E+08', '', '', '', '', '59000', 'LILLE', 'France'],
    ['C005', 'BOULANGERIE MARTIN', sB, '', `FR00${sB}`, ibanTypo, '', '38000', 'GRENOBLE', 'France'],
    ['C006', 'GARAGE DES ALPES', sC, siretFor(sE), '', frIban('20041', '01005', '0500013M026'), 'PSSTFRPPXXX', '73000', 'CHAMBERY', 'France'],
    ['C007', 'CABINET DUVAL', sD.slice(1), '', frVatFromSiren(sD), '', '', '75011', 'PARIS', 'France'],
    ['C008', 'SOCIETE DES EAUX VIVES', '', '', '', ribText, '', '13001', 'MARSEILLE', 'France'],
    ['C009', 'BRASSERIE BRUXELLOISE', '', '', beVat, ibanFromBban('BE', beBban), 'GEBABEBB', '1000', 'BRUXELLES', 'Belgique'],
    ['C010', 'MENUISERIE ROUX', sE, '', frVatFromSiren(sE), frIban('30003', '01234', '00050123456'), 'DEUTDEFFXXX', '42000', 'SAINT-ETIENNE', 'France'],
    ['C011', 'BOULANGERIE NUMIDIE', '', '', '', '', '', '38000', 'GRENOBLE', 'France'],
  ];
  return rows.map((r) => r.map((v) => (/[;"]/.test(v) ? `"${v}"` : v)).join(';')).join('\r\n') + '\r\n';
}
