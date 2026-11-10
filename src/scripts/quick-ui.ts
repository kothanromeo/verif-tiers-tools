import { createClient } from '../lib/annuaire';
import { checkSiren, checkSiret, checkVat, clean, frVatFromSiren } from '../lib/ids';
import { checkBic, checkIban } from '../lib/iban';
import { esc } from './tiers-ui';

/* Vérification d'un seul numéro : le type est détecté automatiquement. */

type Kind = 'siren' | 'siret' | 'vat' | 'iban' | 'bic';

export function detectKind(v: string): Kind | undefined {
  if (/^\d{9}$/.test(v) || /^\d{8}$/.test(v)) return 'siren';
  if (/^\d{14}$/.test(v) || /^\d{13}$/.test(v)) return 'siret';
  if (/^\d{10}[0-9A-Z]{11}\d{2}$/.test(v)) return 'iban'; // RIB
  if (/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v) && v.length >= 15) return 'iban';
  if (/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v)) return 'bic';
  if (/^[A-Z]{2,3}[0-9A-Z+*]{2,13}$/.test(v)) return 'vat';
  if (/^\d{11}$/.test(v)) return 'vat';
  return undefined;
}

const LABEL: Record<Kind, string> = { siren: 'SIREN', siret: 'SIRET', vat: 'Numéro de TVA intracommunautaire', iban: 'IBAN', bic: 'BIC' };

function line(label: string, value: string) {
  return `<div class="qrow"><span class="hint">${label}</span><span class="mono">${esc(value)}</span></div>`;
}

export function render(raw: string): { html: string; siren?: string } {
  const v = clean(raw).value;
  if (!v) return { html: '' };
  const kind = detectKind(v);
  if (!kind) return { html: `<div class="banner warn"><div><strong>Format non reconnu</strong><p>Saisissez un SIREN (9 chiffres), un SIRET (14), un numéro de TVA (FR…), un IBAN ou un BIC.</p></div></div>` };
  let status: string;
  let message: string;
  let extra = '';
  let siren: string | undefined;
  if (kind === 'siren' || kind === 'siret') {
    const r = kind === 'siren' ? checkSiren(v) : checkSiret(v);
    status = r.status;
    message = r.message;
    siren = r.siren && r.status !== 'invalid' ? r.siren : undefined;
    if (siren) extra += line('SIREN', siren) + line('TVA intracommunautaire (calculée)', frVatFromSiren(siren));
  } else if (kind === 'vat') {
    const r = checkVat(v);
    status = r.status;
    message = r.message;
    if (r.siren && r.status !== 'invalid') {
      siren = r.siren;
      extra += line('SIREN contenu', r.siren);
    }
  } else if (kind === 'iban') {
    const r = checkIban(v);
    status = r.status;
    message = r.message;
    if (r.pretty) extra += line('IBAN', r.pretty);
    if (r.rib) extra += line('Banque · guichet · compte · clé', `${r.rib.bank} · ${r.rib.branch} · ${r.rib.account} · ${r.rib.key}`);
  } else {
    const r = checkBic(v);
    status = r.status;
    message = r.message;
    extra += line('Banque · pays · ville · agence', `${v.slice(0, 4)} · ${v.slice(4, 6)} · ${v.slice(6, 8)} · ${v.slice(8) || 'XXX'}`);
  }
  const cls = status === 'ok' ? 'ok' : status === 'invalid' ? 'err' : 'warn';
  const title = status === 'ok' ? `${LABEL[kind]} valide` : status === 'invalid' ? `${LABEL[kind]} invalide` : status === 'unverifiable' ? `${LABEL[kind]} : format valide` : `${LABEL[kind]} à corriger`;
  return {
    siren,
    html: `<div class="banner ${cls}"><div><strong>${title}</strong><p>${esc(message)}</p></div></div>${extra ? `<div class="card qcard">${extra}</div>` : ''}`,
  };
}

export function mountQuick(root: HTMLElement) {
  const input = root.querySelector<HTMLInputElement>('[data-q]')!;
  const out = root.querySelector<HTMLElement>('[data-q-result]')!;
  let current: string | undefined;
  const update = () => {
    const r = render(input.value);
    current = r.siren;
    out.innerHTML =
      r.html +
      (r.siren
        ? `<div class="btn-row" style="margin-top:.6rem"><button type="button" class="btn ghost" data-lookup>Voir l’entreprise dans l’annuaire officiel</button><span class="hint" data-lookup-out></span></div>`
        : '');
    out.querySelector('[data-lookup]')?.addEventListener('click', async () => {
      const box = out.querySelector<HTMLElement>('[data-lookup-out]')!;
      box.textContent = 'Recherche…';
      try {
        const info = await createClient().bySiren(current!);
        box.innerHTML = info
          ? `<strong>${esc(info.name)}</strong> · ${info.active ? '<span class="pos">active</span>' : '<span class="neg">cessée</span>'}${info.address ? ` · ${esc(info.address)}` : ''}${info.vat ? ` · TVA ${esc(info.vat)}` : ''}`
          : '<span class="neg">Aucune entreprise avec ce SIREN dans l’annuaire.</span>';
      } catch (e) {
        box.textContent = e instanceof Error ? e.message : String(e);
      }
    });
  };
  input.addEventListener('input', update);
  if (root.dataset.example) {
    input.value = root.dataset.example;
    update();
  }
}
