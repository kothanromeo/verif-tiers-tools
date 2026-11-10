/*
 * Interrogation (facultative) de l'API publique « Recherche d'entreprises » de l'État
 * (recherche-entreprises.api.gouv.fr) : gratuite, sans clé, ouverte aux navigateurs.
 * Seuls les SIREN, ou le nom et le code postal pour les lignes sans SIREN, sont envoyés.
 * Les appels sont espacés (4 par seconde) et répétés en cas de refus temporaire (429).
 */

export const API = 'https://recherche-entreprises.api.gouv.fr/search';

export interface CompanyInfo {
  siren: string;
  name: string;
  active: boolean;
  closedOn?: string;
  address?: string;
  postcode?: string;
  city?: string;
  vat?: string;
  naf?: string;
  /** false si l'entreprise a demandé que ses données ne soient pas diffusées. */
  diffusible: boolean;
}

type Fetch = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<any>; headers: { get(n: string): string | null } }>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** File d'attente : un appel toutes les `interval` ms, avec reprise sur 429 / 5xx. */
export function createClient(fetchImpl: Fetch = fetch as unknown as Fetch, interval = 250) {
  let next = 0;
  async function get(url: string): Promise<any> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const wait = next - Date.now();
      next = Math.max(Date.now(), next) + interval;
      if (wait > 0) await sleep(wait);
      const res = await fetchImpl(url);
      if (res.ok) return res.json();
      if (res.status === 429 || res.status >= 500) {
        const retry = Number(res.headers.get('Retry-After'));
        await sleep(Number.isFinite(retry) && retry > 0 ? retry * 1000 : 1000 * (attempt + 1));
        continue;
      }
      throw new Error(`Annuaire des entreprises : erreur ${res.status}`);
    }
    throw new Error('Annuaire des entreprises momentanément indisponible (trop de requêtes).');
  }

  const toInfo = (r: any): CompanyInfo => ({
    siren: r.siren,
    name: r.nom_complet ?? r.nom_raison_sociale ?? '',
    active: r.etat_administratif === 'A',
    closedOn: r.date_fermeture ?? undefined,
    address: r.siege?.adresse,
    postcode: r.siege?.code_postal,
    city: r.siege?.libelle_commune,
    vat: Array.isArray(r.tva) ? r.tva[0] : r.tva ?? undefined,
    naf: r.activite_principale,
    diffusible: r.statut_diffusion !== 'P' && r.statut_diffusion !== 'N',
  });

  return {
    async bySiren(siren: string): Promise<CompanyInfo | null> {
      const data = await get(`${API}?q=${encodeURIComponent(siren)}&page=1&per_page=1`);
      const hit = (data.results ?? []).find((r: any) => r.siren === siren);
      return hit ? toInfo(hit) : null;
    },
    async byName(name: string, postcode?: string): Promise<CompanyInfo[]> {
      const cp = postcode && /^\d{5}$/.test(postcode.trim()) ? `&code_postal=${postcode.trim()}` : '';
      const data = await get(`${API}?q=${encodeURIComponent(name)}${cp}&page=1&per_page=3`);
      return (data.results ?? []).map(toInfo);
    },
  };
}

const LEGAL_FORMS = /\b(sas|sasu|sarl|eurl|sa|sci|snc|scop|selarl|selas|eirl|ei|ets|etablissements|societe|ste|cie|et cie|groupe)\b/g;

export function normalizeName(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(LEGAL_FORMS, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/** Similarité de deux raisons sociales (0 à 1), insensible aux formes juridiques et aux accents. */
export function nameSimilarity(a: string, b: string): number {
  const A = new Set(normalizeName(a));
  const B = new Set(normalizeName(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / Math.min(A.size, B.size);
}
