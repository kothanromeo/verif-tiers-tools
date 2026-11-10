import { createClient, nameSimilarity } from '../lib/annuaire';
import { FIELD_LABELS, checkAll, guessMapping, stats, type Field, type Mapping, type RowResult } from '../lib/check';
import { applyEnrichment, type Enrichment } from '../lib/export';
import type { Status } from '../lib/ids';
import { readTable, type Table } from '../lib/table';
import { bindThanks, thanksCard, waitCard } from './creator';

/* Interface du vérificateur de fichier. Toute donnée issue du fichier passe par esc(). */

export const esc = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const MAX_ROWS = 500;
const BADGE: Record<Status, [string, string]> = {
  ok: ['ok', '✓'],
  invalid: ['err', '✕'],
  format: ['warn', '!'],
  unverifiable: ['info', '~'],
  empty: ['empty', '–'],
};

function download(data: Uint8Array | string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const badge = (s: Status, value: string, title: string) =>
  `<span class="badge ${BADGE[s][0]}" title="${esc(title)}">${BADGE[s][1]}</span> <span class="mono">${esc(value)}</span>`;

interface State {
  table: Table;
  mapping: Mapping;
  results: RowResult[];
  enrich: Map<number, Enrichment>;
  fileName: string;
  filter: 'all' | 'problems';
}

function mappingForm(table: Table, m: Mapping): string {
  const fields = Object.keys(FIELD_LABELS) as Field[];
  const opts = (f: Field) =>
    `<option value="">— aucune —</option>` +
    table.headers.map((h, i) => `<option value="${i}" ${m[f] === i ? 'selected' : ''}>${esc(h)}</option>`).join('');
  const preview = table.rows.slice(0, 4);
  return `<div class="card">
    <h3 style="margin-top:0">Colonnes détectées</h3>
    <p class="hint">${table.rows.length.toLocaleString('fr-FR')} lignes lues (${esc(table.source)}${table.sheet ? `, feuille « ${esc(table.sheet)} »` : ''}${table.separator ? `, séparateur « ${esc(table.separator === '\t' ? 'tabulation' : table.separator)} »` : ''}). Corrigez si besoin, puis lancez la vérification.</p>
    <div class="fields">${fields.map((f) => `<label>${FIELD_LABELS[f]}<select data-map="${f}">${opts(f)}</select></label>`).join('')}</div>
    <div class="table-wrap" style="margin-top:1rem"><table><thead><tr>${table.headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${preview.map((r) => `<tr>${r.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <div class="btn-row" style="margin-top:1rem"><button type="button" class="btn" data-run>Vérifier le fichier</button></div>
  </div>`;
}

function rowHtml(r: RowResult, e: Enrichment | undefined): string {
  const cls = r.level === 'error' ? 'row-err' : r.level === 'warning' ? 'row-warn' : '';
  const info = e?.info;
  const ann = info
    ? `<br><small class="${info.active ? 'pos' : 'neg'}">Annuaire : ${esc(info.name)} · ${info.active ? 'active' : 'cessée'}${e?.nameMatch !== undefined && e.nameMatch < 0.5 ? ' · <strong>nom différent</strong>' : ''}</small>`
    : info === null
      ? '<br><small class="neg">Annuaire : SIREN introuvable</small>'
      : e?.suggestion
        ? `<br><small>Suggestion : <strong class="mono">${esc(e.suggestion.siren)}</strong> ${esc(e.suggestion.name)} (${esc(e.suggestion.postcode ?? '')} ${esc(e.suggestion.city ?? '')})</small>`
        : '';
  return `<tr class="${cls}">
    <td class="num">${r.index + 2}</td>
    <td>${esc(r.name) || '<span class="hint">—</span>'}${ann}</td>
    <td>${badge(r.siren.status, r.siren.value || r.sirenFinal || '', r.siren.message)}</td>
    <td>${badge(r.siret.status, r.siret.value, r.siret.message)}</td>
    <td>${badge(r.vat.status, r.vat.value, r.vat.message)}${r.vat.status === 'empty' && r.vatExpected ? `<br><small>calculée : <span class="mono">${esc(r.vatExpected)}</span></small>` : ''}</td>
    <td>${badge(r.iban.status, r.iban.pretty ?? r.iban.value, r.iban.message)}</td>
    <td>${badge(r.bic.status, r.bic.value, r.bic.message)}</td>
    <td class="problems">${r.problems.map((p) => `<div>${esc(p)}</div>`).join('') || '<span class="pos">OK</span>'}</td>
  </tr>`;
}

function resultsHtml(st: State): string {
  const s = stats(st.results);
  const rows = st.filter === 'problems' ? st.results.filter((r) => r.level === 'error' || r.level === 'warning') : st.results;
  const sirens = st.results.filter((r) => r.sirenFinal).length;
  const missing = st.results.filter((r) => !r.sirenFinal && !r.foreign && r.name).length;
  return `<div class="stats">
      <div class="stat"><span class="stat-label">Lignes</span><strong>${s.total}</strong></div>
      <div class="stat"><span class="stat-label">Sans anomalie</span><strong class="pos">${s.ok}</strong></div>
      <div class="stat"><span class="stat-label">À vérifier</span><strong style="color:var(--warn)">${s.warning}</strong></div>
      <div class="stat"><span class="stat-label">Erreurs</span><strong class="neg">${s.error}</strong></div>
      <div class="stat"><span class="stat-label">SIREN manquants (France)</span><strong>${s.missingSiren}</strong></div>
    </div>
    <div class="export-bar card">
      <span class="export-title">Télécharger le fichier contrôlé :</span>
      <div class="btn-row"><button type="button" class="btn" data-export="xlsx">Excel (.xlsx)</button><button type="button" class="btn secondary" data-export="csv">CSV</button></div>
    </div>
    ${thanksCard('analyse')}
    <div class="card annuaire">
      <h3 style="margin-top:0">Aller plus loin : l’annuaire officiel des entreprises</h3>
      <p>Vérifie que chaque SIREN existe, que l’entreprise est toujours active et que son nom correspond, et propose un SIREN pour les lignes qui n’en ont pas (recherche par nom et code postal).</p>
      <p class="hint">⚠️ Cette étape interroge l’API publique et gratuite de l’État (recherche-entreprises.api.gouv.fr). Seuls les SIREN (${sirens}) et, pour les lignes sans SIREN, le nom et le code postal (${missing}) sont envoyés. Les IBAN, numéros de TVA et autres colonnes ne quittent pas votre navigateur.</p>
      <div class="btn-row"><button type="button" class="btn secondary" data-annuaire>Interroger l’annuaire (${sirens + missing} requêtes)</button><span class="hint" data-progress></span></div>
    </div>
    <div class="btn-row" style="margin:1rem 0 .6rem">
      <label class="choice"><input type="radio" name="filter" value="all" ${st.filter === 'all' ? 'checked' : ''}> Toutes les lignes</label>
      <label class="choice"><input type="radio" name="filter" value="problems" ${st.filter === 'problems' ? 'checked' : ''}> Seulement les lignes à corriger</label>
    </div>
    <div class="table-wrap"><table class="tiers"><thead><tr><th>Ligne</th><th>Tiers</th><th>SIREN</th><th>SIRET</th><th>TVA</th><th>IBAN</th><th>BIC</th><th>Anomalies</th></tr></thead>
    <tbody>${rows.slice(0, MAX_ROWS).map((r) => rowHtml(r, st.enrich.get(r.index))).join('')}</tbody></table></div>
    ${rows.length > MAX_ROWS ? `<p class="hint">Affichage limité aux ${MAX_ROWS} premières lignes sur ${rows.length}. L’export contient tout.</p>` : ''}
    <p class="hint">Survolez une pastille pour le détail. ✓ valide · ✕ invalide · ! à corriger · ~ format valide (existence non vérifiable ici) · – vide.</p>
    <div class="btn-row" style="margin-top:1rem"><button type="button" class="btn ghost" data-reset>Vérifier un autre fichier</button></div>`;
}

export function mountTiers(root: HTMLElement) {
  const drop = root.querySelector<HTMLElement>('[data-drop]')!;
  const input = root.querySelector<HTMLInputElement>('[data-file]')!;
  const out = root.querySelector<HTMLElement>('[data-result]')!;
  let st: State | undefined;

  const showError = (e: unknown) => {
    out.innerHTML = `<div class="banner err"><div><strong>Lecture impossible</strong><p>${esc(e instanceof Error ? e.message : e)}</p></div></div>`;
    out.hidden = false;
  };

  const renderResults = () => {
    if (!st) return;
    out.innerHTML = resultsHtml(st);
    bindThanks(out);
    out.querySelectorAll<HTMLInputElement>('input[name="filter"]').forEach((i) =>
      i.addEventListener('change', () => {
        st!.filter = i.value as State['filter'];
        renderResults();
      }),
    );
    out.querySelectorAll<HTMLButtonElement>('[data-export]').forEach((b) =>
      b.addEventListener('click', async () => {
        const { toXlsx, toCsv } = await import('../lib/export');
        const base = st!.fileName.replace(/\.[^.]+$/, '') + '-controle';
        if (b.dataset.export === 'xlsx') download(toXlsx(st!.table, st!.results, st!.enrich), `${base}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        else download(toCsv(st!.table, st!.results, st!.enrich), `${base}.csv`, 'text/csv;charset=utf-8');
      }),
    );
    out.querySelector<HTMLButtonElement>('[data-annuaire]')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      const progress = out.querySelector<HTMLElement>('[data-progress]')!;
      btn.disabled = true;
      const client = createClient();
      const todo = st!.results.filter((r) => r.sirenFinal || (!r.foreign && r.name));
      let done = 0;
      try {
        for (const r of todo) {
          const e: Enrichment = {};
          if (r.sirenFinal) {
            e.info = await client.bySiren(r.sirenFinal);
            if (e.info && r.name) e.nameMatch = nameSimilarity(r.name, e.info.name);
          } else {
            const pc = st!.mapping.postcode !== undefined ? st!.table.rows[r.index][st!.mapping.postcode] : undefined;
            const found = await client.byName(r.name, pc);
            const best = found.map((f) => [f, nameSimilarity(r.name, f.name)] as const).sort((a, b) => b[1] - a[1])[0];
            if (best && best[1] >= 0.5) e.suggestion = best[0];
          }
          st!.enrich.set(r.index, e);
          applyEnrichment(r, e);
          done++;
          progress.textContent = `${done} / ${todo.length}…`;
        }
        renderResults();
        out.querySelector<HTMLElement>('[data-progress]')!.textContent = `Annuaire interrogé : ${done} ligne(s) complétée(s). Les colonnes « Annuaire » sont ajoutées à l’export.`;
      } catch (err) {
        progress.textContent = `Interruption après ${done} ligne(s) : ${err instanceof Error ? err.message : err}`;
        btn.disabled = false;
      }
    });
    out.querySelector('[data-reset]')!.addEventListener('click', () => {
      out.hidden = true;
      out.innerHTML = '';
      drop.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const showMapping = (table: Table, fileName: string) => {
    const mapping = guessMapping(table.headers, table.rows);
    out.innerHTML = mappingForm(table, mapping);
    out.hidden = false;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    out.querySelector('[data-run]')!.addEventListener('click', () => {
      const m: Mapping = {};
      out.querySelectorAll<HTMLSelectElement>('[data-map]').forEach((s) => {
        if (s.value !== '') m[s.dataset.map as Field] = Number(s.value);
      });
      out.innerHTML = waitCard('Vérification des lignes…');
      setTimeout(() => {
        st = { table, mapping: m, results: checkAll(table.rows, m), enrich: new Map(), fileName, filter: 'all' };
        renderResults();
      }, 30);
    });
  };

  const handle = async (file?: File) => {
    if (!file) return;
    try {
      showMapping(readTable(new Uint8Array(await file.arrayBuffer()), file.name), file.name);
    } catch (e) {
      showError(e);
    }
  };

  input.addEventListener('change', () => {
    handle(input.files?.[0]);
    input.value = '';
  });
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    handle(e.dataTransfer?.files[0]);
  });
  root.querySelector<HTMLButtonElement>('button[data-sample]')!.addEventListener('click', async () => {
    const { sampleCsv } = await import('../lib/sample');
    showMapping(readTable(new TextEncoder().encode(sampleCsv()), 'exemple-clients.csv'), 'exemple-clients.csv');
  });
}
