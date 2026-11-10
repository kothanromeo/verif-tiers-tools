---
title: "Vérifier un IBAN et une clé RIB : les calculs, et les pièges d’un fichier fournisseurs"
seoTitle: "Vérifier un IBAN et calculer une clé RIB : méthode et formules"
description: "Comment vérifier un IBAN (modulo 97) et une clé RIB, convertir un RIB en IBAN, contrôler le BIC et éviter les erreurs dans un fichier fournisseurs."
keywords: ["vérifier iban", "clé iban calcul", "modulo 97 iban", "clé rib calcul", "formule clé rib", "convertir rib en iban", "iban france 27 caractères", "iban invalide", "bic iban cohérence", "fichier fournisseurs iban", "fraude changement iban", "contrôle iban virement"]
published: 2026-11-10
faq:
  - q: "Combien de caractères compte un IBAN français ?"
    a: "<p>27 : FR, 2 chiffres de clé, puis les 23 caractères du RIB (5 pour la banque, 5 pour le guichet, 11 pour le compte, 2 pour la clé RIB). Un IBAN monégasque compte aussi 27 caractères.</p>"
  - q: "Un IBAN peut-il contenir des lettres après le code pays ?"
    a: "<p>Oui. Le numéro de compte peut contenir des lettres dans certains pays, et même en France pour certaines banques. Pour le calcul, chaque lettre est remplacée par un nombre (A = 10, B = 11… Z = 35).</p>"
  - q: "Comment se protéger d’un faux changement d’IBAN ?"
    a: "<p>Ne jamais modifier un IBAN fournisseur sur la seule foi d’un e-mail ou d’un courrier. Rappelez le fournisseur à un numéro que vous connaissez déjà, pas à celui indiqué dans le message. La clé IBAN ne protège pas contre cette fraude : l’IBAN du fraudeur est parfaitement valide.</p>"
---

Un virement envoyé sur un IBAN mal recopié revient au mieux quelques jours plus tard, au pire se perd sur un autre compte. Bonne nouvelle : un IBAN contient deux clés de contrôle qui détectent presque toutes les erreurs de saisie. Voici comment elles fonctionnent.

## Anatomie d’un IBAN français

```
FR76 3000 6000 0112 3456 7890 189
││││ └───┘ └───┘ └──────────┘ └┘
││││ banque guichet  compte   clé RIB
││└┴─ clé IBAN
└┴─── pays
```

Après les 4 premiers caractères, on retrouve exactement l’ancien **RIB** : code banque (5), code guichet (5), numéro de compte (11), clé RIB (2).

## La clé IBAN : le modulo 97

C’est la même méthode dans tous les pays :

1. on déplace les 4 premiers caractères à la fin : `30006000011234567890189FR76` ;
2. on remplace chaque lettre par un nombre : A = 10, B = 11… F = 15, R = 27 ;
3. on obtient un très grand nombre, dont on calcule le reste de la division par 97.

L’IBAN est valide si ce reste vaut **1**.

Ce contrôle détecte toutes les erreurs portant sur un seul caractère, et toutes les inversions de deux caractères voisins. Comme le nombre est trop grand pour une calculatrice ou pour Excel, on le traite par morceaux : c’est ce que fait l’outil [vérifier un IBAN](/verifier-iban-rib/).

### La longueur, premier contrôle

Chaque pays a une longueur d’IBAN fixe : 27 pour la France, 22 pour l’Allemagne, 16 pour la Belgique, 24 pour l’Espagne, 27 pour l’Italie, 18 pour les Pays-Bas. Un caractère oublié se voit tout de suite.

## La clé RIB

Les deux derniers chiffres d’un IBAN français sont l’ancienne clé RIB. Sa formule :

```
clé RIB = 97 − ((89 × banque + 15 × guichet + 3 × compte) modulo 97)
```

Avec l’exemple ci-dessus : banque 30006, guichet 00001, compte 12345678901.

- 89 × 30 006 = 2 670 534
- 15 × 1 = 15
- 3 × 12 345 678 901 = 37 037 036 703
- total : 37 039 707 252, dont le reste par 97 vaut 8
- clé : 97 − 8 = **89**

C’est bien la clé de notre IBAN.

Si le numéro de compte contient des lettres, on les remplace avant le calcul par un chiffre selon une table propre au RIB : A et J valent 1, B, K et S valent 2, et ainsi de suite jusqu’à I et R qui valent 9.

En pratique, un IBAN dont la clé IBAN est bonne a presque toujours une clé RIB bonne aussi. Un IBAN valide avec une clé RIB fausse est le signe d’un IBAN **fabriqué** : à regarder de près.

## Convertir un RIB en IBAN

On ajoute `FR`, on calcule la clé IBAN pour que le modulo 97 tombe juste, et on colle le RIB derrière. L’outil le fait si vous saisissez les 23 caractères d’un RIB. Dans un fichier fournisseurs, un RIB tapé dans la colonne IBAN est une erreur courante : le vérificateur le signale et propose l’IBAN complet.

## Le BIC

Le BIC (8 ou 11 caractères) identifie la banque. Ses caractères 5 et 6 sont le **code pays**. Il n’est plus nécessaire pour un virement SEPA, mais s’il est renseigné il doit être cohérent avec l’IBAN : un BIC qui se termine par `DE…` pour un IBAN `FR…` révèle un copier-coller depuis la mauvaise ligne. Seule exception tolérée : un IBAN monégasque avec un BIC français, ce qui est courant.

## Les erreurs typiques d’un fichier fournisseurs

- un caractère oublié ou en trop, en recopiant un IBAN depuis un PDF ;
- la lettre `O` à la place du chiffre `0`, ou `I` à la place de `1` ;
- un RIB à la place de l’IBAN ;
- l’IBAN d’un fournisseur collé sur la ligne d’un autre.

Le [vérificateur de fichier](/) contrôle toutes les lignes d’un coup : longueur, clé IBAN, clé RIB, cohérence avec le BIC. Les IBAN restent dans votre navigateur ; ils ne sont jamais envoyés à l’annuaire.

## Ce qu’aucune clé ne détecte

La clé dit qu’un IBAN est **bien formé**. Elle ne dit pas à qui appartient le compte. La fraude au changement de coordonnées bancaires utilise des IBAN parfaitement valides. Contre elle, une seule parade : confirmer tout changement d’IBAN par un autre canal que celui qui l’annonce.

Pour le reste du fichier, voir [mettre à jour son fichier clients](/guides/siren-client-obligatoire-fichier-clients/).
