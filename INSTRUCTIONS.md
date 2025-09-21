# 🚀 Guide de Démarrage - FormPaper3001

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- **Node.js** (version 18 ou plus récente)
- **Python** (version 3.8 ou plus récente)
- **npm** ou **yarn**

## 🛠️ Installation

### 1. Installation du Backend

```bash
cd backend
npm install
pip install -r requirements.txt
```

### 2. Installation du Frontend

```bash
cd frontend
npm install
```

## 🗄️ Initialisation de la Base de Données

```bash
cd backend
npm run init-db
```

Cette commande va :
- Créer la base de données SQLite `formpaper.db`
- Initialiser les tables nécessaires
- Insérer des données d'exemple

## 🚀 Démarrage de l'Application

### 1. Démarrer le Backend

```bash
cd backend
npm run dev
```

Le serveur sera disponible sur : http://localhost:8777

### 2. Démarrer le Frontend (nouveau terminal)

```bash
cd frontend
npm run dev
```

L'application sera disponible sur : http://localhost:8666

## 📱 Utilisation

### Ajouter un Article

1. **Par DOI** :
   - Cliquez sur "Ajouter un article"
   - Entrez le DOI de l'article
   - Les métadonnées seront récupérées automatiquement

2. **Par PDF** :
   - Cliquez sur "Ajouter un article"
   - Téléchargez votre fichier PDF
   - Le DOI et les images seront extraits automatiquement

### Prendre des Notes

1. Double-cliquez sur un article dans la grille
2. Utilisez l'interface de notes type Notion
3. Les notes sont sauvegardées automatiquement

### Navigation

- **Sidebar** : Statistiques et navigation principale
- **Filtres** : Recherche et tri des articles
- **Vues** : Grille, Liste ou Tableau

## 🔧 Scripts Disponibles

### Backend
- `npm run dev` : Démarrage en mode développement
- `npm run start` : Démarrage en production
- `npm run init-db` : Initialisation de la base de données

### Frontend
- `npm run dev` : Démarrage en mode développement
- `npm run build` : Build de production
- `npm run lint` : Vérification du code

## 📁 Structure du Projet

```
FormPaper3001/
├── 🖥️ frontend/           # Application React + TypeScript
│   ├── src/
│   │   ├── components/     # Composants React
│   │   ├── contexts/       # Contextes (Toast)
│   │   ├── hooks/          # Hooks personnalisés
│   │   ├── services/       # Services API
│   │   └── types/          # Types TypeScript
│   └── package.json
├── ⚙️ backend/             # Serveur Node.js + Express
│   ├── src/
│   │   ├── database/       # Gestion SQLite
│   │   └── routes/         # Routes API
│   ├── scripts/            # Scripts Python
│   └── package.json
└── README.md
```

## 📊 Fonctionnalités

### ✅ Implémentées
- Import par DOI avec métadonnées automatiques
- Import par PDF avec extraction DOI/images
- Système de notes modulaire
- Gestion des statuts de lecture
- Recherche et filtres
- Vues multiples (grille/liste/tableau)
- Stockage local des notes

### 🔄 En Développement
- Système de catégories avancé
- Export des notes
- Mode sombre
- Intégration LLM pour résumés

## 🐛 Dépannage

### Problèmes Courants

1. **Erreur Python** : Vérifiez que toutes les dépendances Python sont installées
2. **Port occupé** : Changez les ports dans `vite.config.ts` et `server.js`
3. **Base de données** : Relancez `npm run init-db` si nécessaire

### Logs

- Backend : Consultez la console où vous avez lancé `npm run dev`
- Frontend : Ouvrez les outils de développement du navigateur

## 📞 Support

Pour toute question ou problème :
1. Vérifiez les logs d'erreur
2. Consultez la documentation
3. Redémarrez les serveurs

---

🎯 **FormPaper3001** - Votre gestionnaire d'articles scientifiques moderne !