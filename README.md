# Odoo Checklist Companion

Interface web (Next.js) permettant aux managers de définir des exigences qualité et aux opérateurs d&apos;exécuter des check-lists d&apos;échantillonnage par ordre de production.

## Structure

- `webapp/` &mdash; Application Next.js prête à déployer (App Router, TypeScript).

## Démarrage rapide

```bash
cd webapp
npm install
npm run dev
```

Ensuite rendez-vous sur [http://localhost:3000](http://localhost:3000) pour le poste opérateur ou [http://localhost:3000/manager](http://localhost:3000/manager) pour la configuration manager.

## Scripts principaux

- `npm run dev` &mdash; Serveur de développement.
- `npm run lint` &mdash; Vérification ESLint.
- `npm run build` &mdash; Build de production Next.js.
- `npm start` &mdash; Servir le build de production.

## Fonctionnalités

- **Configuration manager** : création/édition d&apos;exigences (règles d&apos;échantillonnage, check-lists dynamiques) et association d&apos;ordres de fabrication.
- **Poste opérateur** : scan d&apos;ordre, calcul automatique du nombre d&apos;échantillons, saisie guidée des check-lists et sauvegarde automatique des contrôles.
- **Stockage local** : configuration et historique conservés côté navigateur pour un usage immédiat sans backend.

## Déploiement

La commande `npm run build` produit un bundle optimisé. L&apos;application est compatible avec un déploiement Vercel (`vercel deploy --prod`). 
