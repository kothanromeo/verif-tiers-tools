<div align="center">

# Vérif Tiers

**Vérifier un fichier clients ou fournisseurs : SIREN, SIRET, TVA intracommunautaire, IBAN et BIC, ligne par ligne, dans le navigateur.**

[**→ Ouvrir le vérificateur**](https://verif-tiers-tools.kothanromeo.dev/) · [Guides](https://verif-tiers-tools.kothanromeo.dev/guides/) · [Signaler un problème](https://github.com/kothanromeo/verif-tiers-tools/issues)

![Tests](https://github.com/kothanromeo/verif-tiers-tools/actions/workflows/ci.yml/badge.svg)
![Licence MIT](https://img.shields.io/badge/licence-MIT-blue)

</div>

---

Depuis le 1<sup>er</sup> septembre 2026, le **SIREN du client** est une mention obligatoire des factures entre entreprises, et c'est lui qui achemine les factures électroniques. Dans la plupart des fichiers clients, il manque, il est faux, ou Excel l'a transformé en `5,52E+08`.

Vérif Tiers contrôle tout le fichier d'un coup et le rend avec une colonne « anomalies ».

## Fonctionnalités

- **Lecture** de fichiers Excel (.xlsx) et CSV (séparateur et encodage détectés), avec reconnaissance automatique des colonnes, modifiable avant la vérification.
- **SIREN et SIRET** : clé de Luhn, exception des établissements de La Poste, zéro de tête perdu, notation scientifique d'Excel, SIRET saisi dans la colonne SIREN.
- **TVA intracommunautaire** : clé française recalculée à partir du SIREN, numéro attendu quand la colonne est vide, formats des 27 États membres (et XI, GB, CH, NO), clé belge.
- **IBAN** : longueur par pays, modulo 97, clé RIB française, RIB saisi à la place d'un IBAN (avec l'IBAN proposé).
- **BIC** : format et pays cohérent avec l'IBAN.
- **Cohérence** : SIRET appartenant à un autre SIREN, numéro de TVA d'une autre entreprise.
- **Annuaire (facultatif)** : sur demande, l'API publique [Recherche d'entreprises](https://recherche-entreprises.api.gouv.fr/) vérifie l'existence et l'activité de chaque SIREN, compare les noms et retrouve les SIREN manquants à partir du nom et du code postal. Seuls les SIREN, noms et codes postaux sont envoyés ; jamais les IBAN.
- **Exports** : le fichier d'origine complété des résultats, en Excel ou en CSV.
- **Vérification unitaire** : pages dédiées pour un SIREN/SIRET, un numéro de TVA, un IBAN/RIB/BIC.

## Structure

```
src/lib/
├── ids.ts        SIREN, SIRET (Luhn, La Poste), TVA (clé FR, formats UE, clé BE)
├── iban.ts       IBAN (modulo 97, longueurs), clé RIB, RIB → IBAN, BIC
├── table.ts      Lecture CSV et XLSX
├── check.ts      Détection des colonnes et contrôle de chaque ligne
├── annuaire.ts   Client de l'API Recherche d'entreprises (débit limité, reprises)
├── export.ts     Export XLSX et CSV des résultats
├── xlsx.ts       Écriture XLSX (Office Open XML + fflate)
└── sample.ts     Fichier d'exemple avec une anomalie de chaque type
src/scripts/
├── tiers-ui.ts   Interface du vérificateur de fichier
└── quick-ui.ts   Vérification d'un numéro isolé
```

## Développement

```bash
npm install
npm run dev     # http://localhost:4321/
npm test        # tests Vitest
npm run build   # site statique dans dist/
```

## Limites

Une clé valide prouve qu'un numéro est bien formé, pas qu'il existe : c'est le rôle de l'étape annuaire pour les SIREN, et du service européen VIES pour les numéros de TVA étrangers (non interrogé). Un IBAN valide ne dit rien du titulaire du compte : tout changement d'IBAN fournisseur doit être confirmé par un autre canal.

## Contribuer

Issues et pull requests bienvenues : formats de TVA à affiner, en-têtes de colonnes mal reconnus. **Ne publiez jamais un vrai fichier clients** : anonymisez noms, numéros et IBAN.

## Licence

[MIT](LICENSE) © Roméo Kothan
