# Administration Maelstrom — activation

## Ce qui est préparé

- L’entrée est `/admin.html` sur le site. Aucun client, message ou secret n’est stocké sur GitHub Pages.
- La console française est servie par Google Apps Script après contrôle du compte Google actif.
- Réservations actives et archives, filtre par date, confirmation finale et annulation avec e-mail anglais au client.
- Photos en attente/publiées/refusées, approbation et retrait réversible, référence et aperçu.
- Nouveaux messages du formulaire, lecture et lien de réponse ouvrant la messagerie habituelle.
- Journal des mutations dans l’onglet `Admin log` du classeur existant.

**État : préparation locale vérifiée. L’accès privé et les clés Cloudinary ne sont pas encore configurés.**
La limite de cette première version : l’entrée est sur le site, la console protégée s’ouvre sur Google. Aucun service payant supplémentaire ni migration du site public n’est nécessaire.

## 1. Les trois fichiers Apps Script

Depuis le Google Sheets des réservations, ouvrir Extensions → Apps Script.

1. Faire une copie de sauvegarde du `Code.gs` actuellement déployé.
2. Remplacer son contenu par le `Code.gs` local du dossier MAELSTROM. Il conserve les réservations, annulations, rappels, newsletter et limite galerie déjà préparés.
3. Ajouter un fichier **Script** nommé `Admin` et y copier `_admin/Admin.gs` (le fichier deviendra `Admin.gs`).
4. Ajouter un fichier **HTML** nommé `Admin` et y copier `_admin/Admin.html`.
5. Enregistrer. Ne pas exécuter `doGet` ou `doPost` à la main.

Les seuls raccordements ajoutés à `Code.gs` sont :
- dans `doGet`, `action=admin` appelle `renderAdminPage_()` ;
- dans `handleContactMessage_`, après validation et limitation de fréquence, `saveContactMessageForAdmin_(message)` conserve le nouveau message avant l’e-mail.

Les anciens e-mails ne sont pas importés. La capture débute après mise à jour du déploiement public. Les onglets Messages/Admin log sont créés au premier usage. Aucun onglet de réservations n’est remplacé.

## 2. Propriétés privées du script

Dans Paramètres du projet → Propriétés du script, **ajouter sans effacer les propriétés Brevo** :

| Propriété | Valeur |
| --- | --- |
| `ADMIN_ALLOWED_EMAILS` | `emytheplatypus@gmail.com` |
| `CLOUDINARY_API_KEY` | Clé API du compte Cloudinary **yfquewjr** |
| `CLOUDINARY_API_SECRET` | Secret API Cloudinary, saisi uniquement ici |
| `RESERVATIONS_PUBLIC_URL` | URL `/exec` du déploiement public actuel, la même que dans `reservations-config.js` |

L’absence d’adresse autorisée, une identité Google vide ou un autre compte bloquent l’administration avant toute lecture des clients. Ne jamais remplacer `Session.getActiveUser()` par `getEffectiveUser()` : ce dernier pourrait donner l’identité du propriétaire à un visiteur anonyme sur le déploiement public.

Les secrets Cloudinary ne doivent pas être envoyés dans une conversation ou ajoutés aux fichiers du site. Sans eux, réservations/messages fonctionnent mais l’onglet galerie indique que Cloudinary n’est pas connecté.

Si un manifeste Apps Script contient une liste `oauthScopes` explicite, préserver ses autorisations et ajouter au besoin `https://www.googleapis.com/auth/userinfo.email`, l’accès aux feuilles, l’envoi d’e-mails et les requêtes externes. Sinon Apps Script détecte les services utilisés. Accepter les autorisations demandées avec le compte propriétaire uniquement.

## 3. Garder le déploiement public, créer un second déploiement privé

**Ne pas rendre privé le déploiement existant des réservations : cela bloquerait les visiteurs.**

1. Déployer → Gérer les déploiements : mettre à jour le déploiement public actuel vers une nouvelle version, en gardant son URL et ses réglages (exécuter en tant que propriétaire, accès tout le monde).
2. Déployer → Nouveau déploiement → Application Web.
3. Description : `Maelstrom administration privée`.
4. Exécuter en tant que : **Moi**, connecté comme `emytheplatypus@gmail.com`.
5. Qui a accès : **Moi uniquement**.
6. Déployer. Copier cette **nouvelle** URL `/exec`, sans remplacer celle des réservations.
7. Ouvrir cette URL suivie de `?action=admin` avec le compte autorisé.

Si Google ne fournit pas l’identité du compte actif, l’accès reste refusé. Ne pas supprimer ce contrôle. Vérifier le compte propriétaire et les autorisations ; signaler le blocage plutôt que d’utiliser l’identité effective comme contournement.

## 4. Raccorder l’entrée du site

Envoyer uniquement la nouvelle URL privée `/exec` à l’assistant (ce n’est pas un secret). Elle sera placée dans `admin-config.js` puis publiée. Aucun mot de passe ne sera placé dans le site.

## 5. Vérifications réelles avant de déclarer l’espace opérationnel

- Le compte autorisé voit ses réservations réelles ; un autre compte et une fenêtre privée non connectée sont refusés.
- Les demandes RPC d’administration anonymes et les sessions expirées ne renvoient aucune donnée.
- Confirmer une **réservation de test** : statut Confirmed + e-mail anglais reçu. Réessayer ne doit pas renvoyer un deuxième e-mail.
- Annuler cette réservation de test : archives + e-mail reçu. Vérifier que le lien d’annulation des réservations publiques reste public et utilisable.
- Envoyer un message de test depuis le site : réception dans la boîte habituelle et l’onglet Messages. Marquer comme lu.
- Envoyer une photo de test : voir la référence, approuver, vérifier la galerie publique, retirer, vérifier sa disparition après expiration des caches.
- Vérifier qu’une photo hors galerie ne peut pas être modifiée par ces actions.
- Les tests automatiques du dossier `_admin` utilisent des données simulées et ne remplacent pas ces vérifications réelles.

## Usage et limites

### Mise à jour calendrier (3 septembre 2026)

Le nouvel onglet Calendrier propose Jour / Semaine (lundi–dimanche) / Mois, Aujourd’hui,
la navigation entre périodes et le choix d’une date. Les horaires sont ceux de Bergen.
Les cartes indiquent l’heure d’arrivée exacte, le nom, le nombre de personnes et le statut.
Un clic ouvre les coordonnées et les actions existantes de confirmation/annulation.
Les compteurs indiquent les réservations et les personnes, pas la capacité disponible.
Il n’y a ni durée d’occupation supposée, ni déplacement de réservation, ni plan de tables.
Le calendrier inclut les archives non annulées pour consulter le passé ; les annulations
restent consultables dans Réservations → Archives mais ne comptent pas dans le planning.
Les vues semaine/mois défilent horizontalement sur un petit écran. Les journées chargées
affichent trois cartes dans la vue mois, puis un bouton ouvrant la journée complète.
La période entière (42 jours maximum) est chargée, sans limite de 50 réservations.

Pour activer cette mise à jour :

1. Sauvegarder les deux fichiers Admin actuels dans Apps Script.
2. Remplacer le contenu de `admin.gs` / `Admin.gs` par `_admin/Admin.gs`.
3. Ouvrir `_admin/Admin.html` **dans le Bloc-notes**, pas comme une page web,
   puis copier son code complet dans le fichier **Admin.html** d’Apps Script.
4. Enregistrer. Ne pas modifier Code.gs, le manifeste ou les propriétés secrètes.
5. Déployer → Gérer les déploiements → choisir **Maelstrom administration privée**
   (l’URL commence par `AKfycbwFofBE5stmKV`), crayon → Nouvelle version → Déployer.
   Garder « Moi uniquement » et la même URL. Le déploiement public reste inchangé.
6. Actualiser l’administration ; tester un jour connu, une semaine, un mois et les détails.

Les fichiers sont prêts dans le dépôt ; la mise à jour Apps Script doit être effectuée
par le propriétaire. Une publication GitHub ne met pas à jour le déploiement Google.

Chaque action est vérifiée côté serveur, protégée par une session d’une heure et enregistrée. En cas de réponse réseau incertaine, actualiser avant de réessayer. Une erreur d’envoi d’e-mail n’annule pas la mise à jour du statut : un avertissement demande de prévenir le client manuellement.

« Retirer / Refuser » ne supprime pas les fichiers Cloudinary : il retire le tag public et applique le refus. Le cache peut retarder l’effet. Pour une demande d’effacement définitif, supprimer ensuite le fichier dans Cloudinary et vérifier les copies restantes. La console n’effectue aucune suppression définitive en lot.

Les archives ne sont pas un système de suppression automatique. Les durées promises dans la politique de confidentialité demandent une procédure de nettoyage, notamment pour Messages, Archive et Admin log. Ne pas considérer cette interface comme une certification de conformité.

Références utilisées :
- https://developers.google.com/apps-script/reference/base/session
- https://developers.google.com/apps-script/guides/web
- https://cloudinary.com/documentation/admin_api
