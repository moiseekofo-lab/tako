# TaKo Render Server

Serveur Node simple prêt pour Render.

## Routes

- `GET /` : statut API
- `GET /health` : health check
- `POST /clients/nfc-card` : enregistrer une carte NFC
- `POST /payments` : enregistrer un paiement accepté
- `GET /payments` : liste des paiements en mémoire

## Déploiement Render gratuit

1. Mets le projet sur GitHub.
2. Va sur Render.
3. New > Blueprint.
4. Choisis ton repo.
5. Render utilisera `render.yaml`.
6. Dans le service web Render, ajoute la variable d'environnement `DATABASE_URL` avec l'URL PostgreSQL.

Les cartes NFC et paiements sont enregistrés dans PostgreSQL.

## OTP WhatsApp puis SMS avec Infobip

Infobip est prioritaire lorsqu'il est configuré. Ajoutez ces variables
d'environnement au service API Render :

- `INFOBIP_BASE_URL` : URL personnelle Infobip, par exemple `xxxxx.api.infobip.com`
- `INFOBIP_API_KEY` : clé API possédant la permission `sms:message:send`
- `INFOBIP_SMS_SENDER` : expéditeur SMS autorisé, par exemple `TaKo`
- `INFOBIP_WHATSAPP_SENDER` : numéro expéditeur WhatsApp Infobip, sans le signe `+`
- `INFOBIP_WHATSAPP_TEMPLATE` : nom du modèle d'authentification WhatsApp approuvé par Meta
- `INFOBIP_WHATSAPP_LANGUAGE` : langue du modèle, par exemple `fr`

Le serveur génère un code à six chiffres et tente d'abord de l'envoyer par
WhatsApp. Infobip bascule automatiquement vers le SMS si WhatsApp ne peut pas
livrer le message. Si WhatsApp n'est pas encore configuré, le serveur utilise
directement le SMS. Le code est conservé dix minutes pour validation. Les
adresses email continuent à utiliser SendGrid.
