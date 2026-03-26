\# Règles du projet

\## Git

\- Ne jamais commiter directement sur main

\- Avant de démarrer une nouvelle US, toujours faire :

&#x20; git checkout main

&#x20; git pull origin main


\- Toujours créer une branche : feature/nom-de-la-feature

\- Toujours pousser la branche sur GitHub

\- Toujours créer une Pull Request vers main via gh CLI après le push



\## Tests

\- Toute nouvelle page ou composant doit être couvert par des tests

\- Couverture minimale : 80%

\- Tests obligatoires : rendu du composant, interactions utilisateur,

&#x20; gestion des erreurs API

\- Framework : Vitest + React Testing Library

\- Les tests doivent passer avant de créer la Pull Request

