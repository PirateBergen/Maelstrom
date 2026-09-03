# Mise à jour réservations — 3 septembre 2026

Les fichiers locaux sont corrigés et testés. Une publication GitHub ne met pas à jour Google Apps Script : les étapes ci-dessous restent nécessaires.

## Installation dans le projet Maelstrom Reservations

1. Sauvegarder le contenu actuel de `Code.gs` dans un fichier texte.
2. Remplacer uniquement le contenu de `Code.gs` par celui du fichier `Code.gs` à la racine du projet local. Enregistrer. Ne pas remplacer `admin.gs`, `Admin.html` ni le manifeste pour cette mise à jour.
3. Vérifier les propriétés existantes, sans partager leurs valeurs secrètes :
   - `ADMIN_ALLOWED_EMAILS` contient le compte Google administrateur autorisé.
   - `RESERVATIONS_PUBLIC_URL` contient l'URL publique de réservation terminée par `/exec`, sans `?action=admin`. Ce n'est pas l'URL du déploiement privé.
4. Avec le compte Google administrateur, exécuter une fois `installDailyArchiveTrigger`, puis une fois `installReservationReminderTrigger` depuis la liste des fonctions. Accepter les autorisations Google nécessaires si elles sont demandées.
5. Dans les déclencheurs, vérifier les deux fonctions : `archivePastReservations_` (quotidien vers 4 h) et `sendReservationReminders_` (toutes les 30 minutes). Les installateurs remplacent leurs anciens déclencheurs sans supprimer ceux des autres fonctions. Le soulignement final est volontaire : ces fonctions ne peuvent pas être appelées depuis les pages publiques avec `google.script.run`.
6. Dans **Déployer → Gérer les déploiements**, modifier le déploiement public existant : crayon → nouvelle version → déployer. Conserver son URL, son exécution en tant que propriétaire et son accès public nécessaire aux formulaires.
7. Faire la même mise à jour sur le déploiement privé de l'administration, en conservant son accès **Moi uniquement** et son URL actuelle. Ne pas créer un nouveau déploiement et ne pas rendre l'administration publique.
8. Si d'autres anciens déploiements publics sont encore actifs, vérifier leur usage : une ancienne version active conserve l'ancien code. Mettre à jour ceux qui servent encore et archiver uniquement ceux identifiés comme inutilisés.

## Vérifications après déploiement

- Une demande de test crée une seule ligne et reçoit ses notifications habituelles.
- L'annulation de cette demande la déplace dans Archive sans perdre ses colonnes.
- Les trois nouvelles colonnes sont ajoutées automatiquement : `Submission ID`, `Submission fingerprint`, `Notification status`. Ne pas réorganiser les colonnes.
- Pour contrôler l'accès privé, ouvrir le lien admin dans une fenêtre privée sans connexion Google, puis avec un autre compte : les données et les actions doivent rester inaccessibles.
- Une réservation `New` n'est plus éligible au rappel. Seules les réservations `Confirmed`, non encore rappelées, proches de 24 heures avant la visite le sont. Ce n'est pas un rappel 24 heures après l'inscription.

## Ce que les protections garantissent, et leurs limites

- Les quatre anciennes fonctions techniques publiques vérifient le compte actif avant toute action. Les traitements programmés utilisent des fonctions privées.
- Une nouvelle tentative conservant la même référence n'ajoute pas une seconde réservation, même après archivage. Un ancien navigateur sans référence bénéficie d'une protection de dix minutes pour une demande identique enregistrée avec cette version.
- Un échec d'e-mail ne transforme plus un enregistrement réussi en échec de réservation. Les notifications invité et propriétaire sont tentées séparément.
- `Notification status` peut indiquer `sent`, `guest_email_failed`, `owner_email_failed`, `newsletter_failed` ou `pending`. Plusieurs échecs peuvent apparaître ensemble. `sent` signifie que les appels d'envoi n'ont pas signalé d'erreur, pas que la boîte du destinataire a reçu le message. Vérifier manuellement les échecs ; aucun renvoi massif automatique n'est ajouté.
- Le formulaire public utilise toujours un envoi `no-cors` : il ne peut pas lire la réponse détaillée du serveur. La protection contre les doublons est côté serveur ; l'écran de remerciement ne constitue pas une preuve de réception. Une vérification de réception de bout en bout reste une amélioration distincte.
- Ces tests sont réalisés sur des données simulées, pas sur les réservations réelles. Aucun audit ne garantit à lui seul l'absence de toutes les vulnérabilités.

## Tests locaux

`node --test _admin/admin.test.cjs _admin/reservations.test.cjs`
