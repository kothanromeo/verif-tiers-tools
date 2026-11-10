---
title: "SIREN du client obligatoire : mettre à jour son fichier clients avant la facture électronique"
seoTitle: "SIREN client obligatoire sur les factures : nettoyer son fichier clients"
description: "Le SIREN du client est une mention obligatoire des factures depuis septembre 2026. Comment retrouver, vérifier et corriger les SIREN de tout un fichier clients."
keywords: ["siren client obligatoire", "siren sur facture", "mention obligatoire facture 2026", "nouvelles mentions obligatoires facture", "fichier clients facture électronique", "mettre à jour fichier clients", "trouver siren client", "réforme facture électronique siren", "annuaire facture électronique", "siren manquant", "nettoyer base clients", "données tiers facturation"]
published: 2026-11-10
faq:
  - q: "Le SIREN est-il obligatoire pour un client particulier ?"
    a: "<p>Non. La mention concerne les factures entre professionnels. Un client particulier n’a pas de SIREN, et la vente à un particulier relève du e-reporting, pas de la facture électronique.</p>"
  - q: "Et pour un client étranger ?"
    a: "<p>Un client établi hors de France n’a pas de SIREN. Ses factures ne passent pas par le circuit de la facture électronique française ; c’est son numéro de TVA (pour un client européen) qui compte, et l’opération relève du e-reporting.</p>"
  - q: "SIREN ou SIRET sur la facture ?"
    a: "<p>La mention obligatoire est le SIREN, l’identifiant de l’entreprise. Le SIRET, ou un code de service, peut servir en plus à adresser la facture à un établissement ou un service précis chez un grand client ou une entité publique.</p>"
---

Depuis le 1<sup>er</sup> septembre 2026, quatre nouvelles mentions s’ajoutent aux factures entre entreprises. La plus structurante est le **numéro SIREN du client**. Ce n’est pas un détail administratif : dans la facture électronique, c’est le SIREN qui permet de trouver dans l’annuaire central la plateforme où le client reçoit ses factures. Sans SIREN, ou avec un SIREN faux, la facture n’arrive pas au bon endroit.

Or dans la plupart des fichiers clients, la colonne SIREN est vide, à moitié remplie, ou remplie de numéros abîmés par Excel. Ce guide propose une méthode pour la remettre en état.

## Le calendrier, pour situer l’urgence

- **1<sup>er</sup> septembre 2026** : toutes les entreprises doivent pouvoir *recevoir* des factures électroniques. Les grandes entreprises et les ETI doivent les *émettre*. Les nouvelles mentions obligatoires, dont le SIREN du client, s’appliquent.
- **1<sup>er</sup> septembre 2027** : l’émission devient obligatoire pour les PME et les micro-entreprises.

Autrement dit, même une petite entreprise qui n’émet pas encore de factures électroniques doit déjà faire figurer le SIREN de ses clients professionnels sur ses factures papier ou PDF. Une mention manquante est passible d’une amende de 15 € par mention, plafonnée au quart du montant de la facture.

## Les quatre nouvelles mentions

Pour mémoire, les nouvelles mentions sont :

1. le **SIREN du client** ;
2. l’**adresse de livraison**, si elle diffère de l’adresse du client ;
3. la **nature des opérations** : livraison de biens, prestation de services, ou les deux ;
4. l’option pour le **paiement de la TVA d’après les débits**, si l’entreprise l’a choisie.

Seule la première dépend vraiment de la qualité de vos données clients. C’est celle qui demande du travail.

## Étape 1 : exporter le fichier

Exportez la liste de vos clients depuis votre logiciel de facturation, de comptabilité ou votre CRM, au format Excel ou CSV. Gardez au moins :

- la raison sociale ;
- le SIREN ou le SIRET, s’ils existent ;
- le numéro de TVA intracommunautaire ;
- le code postal, et le pays.

Le code postal paraît accessoire, mais il est très utile pour retrouver un SIREN manquant : il y a beaucoup de « Boulangerie du Centre » en France, beaucoup moins dans le 38000.

Profitez-en pour exporter vos fournisseurs. Les mêmes contrôles s’appliquent, avec en plus les IBAN, qui méritent toute votre attention (voir [vérifier un IBAN](/guides/verifier-iban-cle-rib/)).

## Étape 2 : repérer ce qui ne va pas

Les problèmes rencontrés dans un fichier clients réel sont toujours les mêmes :

| Ce qu’on trouve | Ce que ça veut dire |
|---|---|
| `5,52032E+08` | Excel a converti le SIREN en nombre, en notation scientifique. Les derniers chiffres sont perdus. |
| `42107651` (8 chiffres) | Le zéro de tête a disparu : le vrai SIREN est `042107651`. |
| 14 chiffres dans la colonne SIREN | C’est un SIRET. Le SIREN, ce sont ses 9 premiers chiffres. |
| Un SIREN qui échoue à la clé de Luhn | Une faute de frappe. |
| Un SIRET dont les 9 premiers chiffres ne sont pas le SIREN | Deux entreprises différentes, ou un copier-coller sur la mauvaise ligne. |
| Un numéro de TVA dont la clé ne correspond pas au SIREN | L’un des deux est faux. |
| Rien | Le SIREN n’a jamais été saisi. |

Le [vérificateur de fichier](/) fait tous ces contrôles d’un coup. Il signale chaque ligne en erreur ou en avertissement et vous rend le fichier avec une colonne « anomalies ». Le principe des clés est expliqué dans [SIREN, SIRET et clé de Luhn](/guides/siren-siret-cle-luhn/).

## Étape 3 : compléter les SIREN manquants

Pour les lignes sans SIREN, deux sources fiables :

- **la facture ou le devis du client** lui-même : tout professionnel doit faire figurer son SIREN sur ses documents commerciaux ;
- **l’annuaire des entreprises**, alimenté par la base Sirene de l’Insee, consultable gratuitement.

Le vérificateur interroge cet annuaire pour vous, si vous le demandez : il cherche chaque client sans SIREN par son nom et son code postal, et propose le SIREN trouvé. Pour les lignes qui ont déjà un SIREN, il vérifie que l’entreprise existe, qu’elle est toujours active et que son nom officiel ressemble à celui de votre fichier.

Une suggestion reste une suggestion : une homonymie est toujours possible. Vérifiez les cas douteux avant de les reporter dans votre logiciel.

## Étape 4 : surveiller les entreprises fermées

Un client dont l’entreprise est **cessée** dans la base Sirene mérite une vérification : a-t-il été racheté, a-t-il changé de structure (passage d’une entreprise individuelle à une société, par exemple) ? Dans ce cas, il a un nouveau SIREN, et c’est celui-là qui doit figurer sur vos factures.

## Étape 5 : corriger à la source, et protéger la colonne

Reportez les corrections **dans votre logiciel**, pas seulement dans le fichier Excel : c’est lui qui produit les factures.

Si vous devez retravailler le fichier dans Excel, formatez d’abord les colonnes SIREN, SIRET, TVA et IBAN en **Texte**, avant d’y coller quoi que ce soit. C’est la seule protection efficace contre la notation scientifique et la perte des zéros. À l’ouverture d’un CSV, passez par *Données > À partir d’un fichier texte* pour choisir le type de chaque colonne, plutôt que par un double-clic.

## Et le numéro de TVA ?

Pour un client français assujetti, le numéro de TVA se déduit du SIREN par un calcul simple, détaillé dans [le calcul de la clé de TVA](/guides/calcul-cle-tva-intracommunautaire/). Le vérificateur le calcule automatiquement quand la colonne est vide, et signale les numéros incohérents.

Une fois le fichier propre, le plus dur est fait : il ne reste qu’à garder la bonne habitude de demander le SIREN à chaque nouveau client.
