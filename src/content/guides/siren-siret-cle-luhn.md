---
title: "SIREN, SIRET et clé de Luhn : comment vérifier un numéro d’entreprise"
seoTitle: "Vérifier un SIREN ou un SIRET : l’algorithme de Luhn expliqué"
description: "Comment fonctionne la clé de contrôle des SIREN et SIRET : l’algorithme de Luhn pas à pas, l’exception de La Poste et les numéros abîmés par Excel."
keywords: ["algorithme de luhn", "clé de luhn siren", "vérifier siren", "vérifier siret", "siren valide", "siret valide", "contrôle siret", "siret la poste", "siren 9 chiffres siret 14 chiffres", "nic siret", "siren excel notation scientifique", "luhn excel"]
published: 2026-11-10
faq:
  - q: "Un SIREN qui passe le contrôle de Luhn existe-t-il ?"
    a: "<p>Pas forcément. Environ un nombre de 9 chiffres sur dix passe le contrôle. La clé détecte les fautes de frappe ; l’existence se vérifie dans la base Sirene, via l’annuaire des entreprises.</p>"
  - q: "Que faire d’un SIREN qui commence par 0 ?"
    a: "<p>Le conserver tel quel, en texte. Des SIREN commencent par 0, et Excel les tronque si la colonne est au format Nombre : on obtient alors 8 chiffres. Le vérificateur repère ce cas et rétablit le zéro.</p>"
  - q: "Les SIRET de La Poste sont-ils les seuls à faire exception ?"
    a: "<p>Ce sont les seuls connus et documentés. Les établissements de La Poste ont été si nombreux que la place manquait pour des numéros respectant la clé de Luhn ; une règle propre leur a été attribuée.</p>"
---

Les numéros SIREN et SIRET contiennent leur propre contrôle : leur dernier chiffre est une **clé**, calculée avec l’algorithme de Luhn. Elle permet de repérer immédiatement la plupart des erreurs de saisie, sans rien consulter.

## SIREN, SIRET, NIC : qui est qui

- Le **SIREN**, 9 chiffres, identifie l’**entreprise**. Il est attribué une fois pour toutes par l’Insee.
- Le **NIC**, 5 chiffres, numérote chaque **établissement** de l’entreprise (siège, agences, magasins…).
- Le **SIRET**, 14 chiffres, est la juxtaposition des deux : SIREN + NIC.

Une entreprise a donc un seul SIREN et autant de SIRET que d’établissements. Les 9 premiers chiffres d’un SIRET sont toujours le SIREN de l’entreprise.

## L’algorithme de Luhn

On part du chiffre le plus à droite et on remonte :

1. on garde un chiffre sur deux tel quel, en commençant par le dernier ;
2. on **double** les autres ; si le résultat dépasse 9, on lui retire 9 (ce qui revient à additionner ses deux chiffres) ;
3. on additionne le tout.

Le numéro est valide si le total est un **multiple de 10**.

### Exemple : SIREN 552 032 534

| Chiffre (de droite à gauche) | 4 | 3 | 5 | 2 | 3 | 0 | 2 | 5 | 5 |
|---|---|---|---|---|---|---|---|---|---|
| Doublé ? | non | oui | non | oui | non | oui | non | oui | non |
| Valeur retenue | 4 | 6 | 5 | 4 | 3 | 0 | 2 | 1 | 5 |

5 doublé donne 10, dont on retire 9 : 1. Total : 4 + 6 + 5 + 4 + 3 + 0 + 2 + 1 + 5 = **30**. C’est un multiple de 10, le SIREN est valide.

Remplacez le dernier 4 par un 7, et le total devient 33 : l’erreur est détectée. Le contrôle repère **toute erreur sur un seul chiffre**, et presque toutes les inversions de deux chiffres voisins.

Le SIRET se contrôle exactement de la même façon, sur ses 14 chiffres. Un SIRET valide doit en plus avoir un SIREN valide dans ses 9 premiers chiffres.

## L’exception de La Poste

Les établissements de La Poste (SIREN **356 000 000**) ont une règle à eux : la **somme simple** de leurs 14 chiffres doit être un multiple de 5. Leur siège, 356 000 000 00048, respecte quant à lui la clé de Luhn.

Exemple : le SIRET 356 000 000 49639 donne 3 + 5 + 6 + 4 + 9 + 6 + 3 + 9 = 45, multiple de 5. Il est valide, alors qu’il échoue au contrôle de Luhn.

Beaucoup de logiciels l’ignorent et rejettent à tort ces SIRET. Si vous facturez des bureaux de poste, c’est à savoir. Le [vérificateur de SIREN et SIRET](/verifier-siren-siret/) applique la bonne règle.

## Les numéros abîmés par Excel

La plupart des SIREN faux dans un fichier clients ne sont pas des fautes de frappe : c’est Excel qui les a modifiés.

**La notation scientifique.** Dans une colonne au format Nombre, un SIRET de 14 chiffres s’affiche `5,52033E+13`. Si le fichier est ensuite enregistré en CSV, c’est cette valeur qui est écrite, et les chiffres masqués sont **perdus pour de bon**. Il faut alors retrouver le numéro ailleurs.

**Les zéros de tête.** Le SIREN `042 107 651` devient `42107651`. Ici, rien n’est perdu : un nombre à 8 chiffres dans une colonne SIREN, c’est un SIREN dont le zéro a sauté. Il suffit de le rétablir, et de vérifier que la clé est bonne.

**Les espaces et les points.** `552 032 534`, `552.032.534` : ce sont des présentations, pas des erreurs. Le vérificateur les ignore.

Pour éviter tout cela : formatez les colonnes d’identifiants en **Texte** avant d’y saisir quoi que ce soit, et ouvrez les CSV via l’import de données plutôt qu’en double-cliquant.

## Après la clé, l’annuaire

Une clé valide ne garantit pas que l’entreprise existe, ni qu’elle est encore en activité. Pour cela, il faut consulter la base Sirene. Le [vérificateur de fichier](/) peut le faire pour toutes vos lignes en une fois, à votre demande, via l’API publique de l’annuaire des entreprises.

Le SIREN sert aussi à calculer le numéro de TVA : voir [le calcul de la clé de TVA intracommunautaire](/guides/calcul-cle-tva-intracommunautaire/).
