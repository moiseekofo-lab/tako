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
