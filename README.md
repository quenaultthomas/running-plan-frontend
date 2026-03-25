# Running Plan Frontend

Interface React pour l'application Running Plan.

## Stack

- Vite + React + TypeScript
- Tailwind CSS
- React Router v6
- Axios (avec intercepteur JWT)
- React Hook Form

## Lancement local

### Prérequis

- Node.js >= 18
- npm >= 9

### Installation

```bash
npm install
```

### Configuration

Copier le fichier d'environnement et renseigner l'URL du backend :

```bash
cp .env.example .env.local
```

Éditer `.env.local` :

```
VITE_API_URL=http://localhost:8080
```

### Démarrer en développement

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:5173](http://localhost:5173).

### Build de production

```bash
npm run build
```

Le résultat est généré dans le dossier `dist/`.

## Routes

| Route | Accès | Description |
|---|---|---|
| `/login` | Public | Connexion |
| `/register` | Public | Inscription |
| `/dashboard` | Protégé | Tableau de bord |
| `/plan/new` | Protégé | Créer un plan |
| `/plan/prompt` | Protégé | Générer par IA |
| `/plan/import` | Protégé | Importer un plan |

> Les routes protégées redirigent vers `/login` si aucun JWT n'est présent dans le `localStorage`.

## Déploiement Netlify

Le fichier `netlify.toml` configure le redirect SPA (`/* → /index.html`).

Définir la variable d'environnement `VITE_API_URL` dans les paramètres Netlify du projet.
