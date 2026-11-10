---
title: "Calcul de la clé de TVA intracommunautaire : la formule, avec des exemples"
seoTitle: "Calcul clé TVA intracommunautaire : formule et exemples"
description: "Comment calculer le numéro de TVA intracommunautaire français à partir du SIREN : la formule de la clé, des exemples pas à pas et les formats des autres pays."
keywords: ["calcul clé tva intracommunautaire", "formule tva intracommunautaire", "numéro tva intracommunautaire siren", "clé tva fr", "calculer numéro tva", "tva intracommunautaire calcul", "modulo 97 tva", "format numéro tva europe", "numéro tva belge", "vies vérification tva", "numéro tva excel formule"]
published: 2026-11-10
faq:
  - q: "Peut-on calculer la clé dans Excel ?"
    a: "<p>Oui, si le SIREN est en A2 : <code>=\"FR\"&amp;TEXTE(MOD(12+3*MOD(A2;97);97);\"00\")&amp;A2</code>. Le SIREN doit être stocké en texte sur 9 chiffres, zéros compris.</p>"
  - q: "Mon numéro a des lettres à la place de la clé, est-ce normal ?"
    a: "<p>Oui, c’est possible. Certains numéros attribués par l’administration ont une clé alphanumérique, qui ne suit pas la formule. Ils sont rares mais valides. Seul le service VIES peut confirmer un tel numéro.</p>"
  - q: "Comment vérifier qu’un numéro de TVA existe vraiment ?"
    a: "<p>Sur le service VIES de la Commission européenne, qui interroge les administrations fiscales de chaque pays. Il indique si le numéro est valide à la date du jour.</p>"
---

Le numéro de TVA intracommunautaire d’une entreprise française n’est pas attribué au hasard : il se **calcule** à partir de son SIREN. C’est pratique pour compléter un fichier clients, et c’est surtout un excellent moyen de repérer les numéros faux.

## La structure du numéro

Un numéro de TVA français compte 13 caractères :

```
FR  27  552032534
│   │   └─ le SIREN (9 chiffres)
│   └───── la clé (2 caractères)
└───────── le code pays
```

## La formule de la clé

```
clé = (12 + 3 × (SIREN modulo 97)) modulo 97
```

« Modulo 97 », c’est le reste de la division par 97. Si le résultat est inférieur à 10, on l’écrit sur deux chiffres, avec un zéro devant.

### Exemple 1 : SIREN 552 032 534

1. 552 032 534 ÷ 97 = 5 691 057, reste **5**.
2. 12 + 3 × 5 = **27**.
3. 27 modulo 97 = **27**.

Le numéro de TVA est **FR27552032534**.

### Exemple 2 : SIREN 732 829 320

1. 732 829 320 modulo 97 = **43**.
2. 12 + 3 × 43 = **141**.
3. 141 modulo 97 = 141 − 97 = **44**.

Résultat : **FR44732829320**.

Vous pouvez refaire le calcul pour n’importe quel SIREN avec l’outil [calcul du numéro de TVA](/calcul-numero-tva-intracommunautaire/).

## Ce que la clé permet de détecter

Le calcul fonctionne dans les deux sens. Pour un numéro de TVA trouvé dans un fichier :

- si la clé ne correspond pas aux 9 chiffres qui suivent, **le numéro est faux** ;
- si la clé est bonne mais que les 9 chiffres ne sont pas le SIREN indiqué dans la colonne SIREN, **les deux numéros désignent deux entreprises différentes**. C’est typiquement un copier-coller sur la mauvaise ligne.

Le [vérificateur de fichier](/) fait ces deux contrôles sur chaque ligne, et calcule le numéro attendu quand la colonne TVA est vide.

## Les limites du calcul

**Une entreprise peut ne pas avoir de numéro de TVA.** Une micro-entreprise en franchise en base de TVA n’en a pas forcément : le calcul donne un numéro « théorique », que l’administration n’a pas attribué. Si le client vous en communique un, c’est celui-là qui compte.

**Quelques clés sont alphanumériques.** Une petite partie des numéros français ont une clé composée de lettres, ou d’une lettre et d’un chiffre. Ils ne suivent pas la formule et ne peuvent être confirmés que par le service européen VIES.

## Les numéros des autres pays

Chaque État membre a son propre format. Quelques exemples :

| Pays | Format | Exemple de forme |
|---|---|---|
| Allemagne | DE + 9 chiffres | DE123456789 |
| Belgique | BE + 10 chiffres (commence par 0 ou 1) | BE0123456749 |
| Espagne | ES + 9 caractères | ESX1234567X |
| Italie | IT + 11 chiffres | IT12345678901 |
| Pays-Bas | NL + 9 chiffres + B + 2 chiffres | NL123456789B01 |
| Luxembourg | LU + 8 chiffres | LU12345678 |
| Grèce | EL + 9 chiffres (et non GR) | EL123456789 |

La Belgique a, comme la France, une clé facile à recalculer : les deux derniers chiffres valent **97 moins le reste de la division des 8 premiers par 97**. Le vérificateur l’applique. Pour les autres pays, il contrôle le format, et l’existence se confirme sur VIES.

Notez le piège de la Grèce : son code TVA est **EL**, alors que son code pays ISO est GR. Un numéro « GR… » dans un fichier est une erreur de saisie fréquente.

## Pourquoi c’est important

Pour une livraison de biens à un client d’un autre État membre, l’exonération de TVA suppose notamment que le client dispose d’un numéro de TVA valide, communiqué au vendeur. Un numéro faux sur la facture peut remettre l’exonération en cause lors d’un contrôle. Et en France, avec la facture électronique, un numéro incohérent avec le SIREN est une anomalie de plus à expliquer.

Pour le SIREN lui-même, voir [SIREN, SIRET et clé de Luhn](/guides/siren-siret-cle-luhn/).
