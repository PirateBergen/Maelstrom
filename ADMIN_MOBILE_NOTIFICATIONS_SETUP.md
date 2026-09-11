# Notifications mobiles de l’administration Maelstrom

Le système envoie une notification sur le téléphone pour :

- une nouvelle réservation ;
- un nouveau message ;
- une nouvelle photo en attente de validation.

Toucher la notification ouvre directement le bon onglet de l’administration Maelstrom. Les réservations et les messages continuent également à produire les e-mails déjà existants.

Les alertes n’envoient ni nom, ni adresse e-mail, ni numéro de téléphone au service de notification. Les détails personnels restent dans l’administration Google protégée.

## Configuration privée dans Google Apps Script

Dans **Paramètres du projet > Propriétés du script**, ajouter :

- `ADMIN_APP_URL` : l’URL `/exec` du déploiement privé de l’administration, sans `?action=admin` ;
- `ADMIN_NTFY_TOPIC` : un identifiant privé et aléatoire d’au moins 20 caractères.

Ces deux valeurs ne doivent pas être ajoutées au code ni publiées sur GitHub.

## Téléphone

1. Installer l’application **ntfy** depuis l’App Store ou Google Play.
2. Ajouter un abonnement au serveur `https://ntfy.sh`.
3. Saisir exactement la valeur privée choisie pour `ADMIN_NTFY_TOPIC`.
4. Autoriser les notifications de l’application dans les réglages du téléphone.

## Test

Faire une réservation de test, envoyer un message de test, puis envoyer une photo de test. Chaque événement doit produire une notification distincte. Toucher l’alerte doit ouvrir la connexion Google puis l’administration.

Le sujet ntfy agit comme un mot de passe : ne pas le partager et le remplacer dans les propriétés du script s’il est exposé.
