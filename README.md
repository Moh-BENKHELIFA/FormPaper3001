🎯 Description du Projet

  FormPaper3000 est une application web complète de gestion d'articles scientifiques avec système de
  prise de notes avancé. Elle permet d'importer, organiser, annoter et rechercher des papers de     
  recherche avec une interface moderne inspirée de Notion.

  🏗️ Architecture Générale

  FormPaper3000/
  ├── 🖥️ Frontend (React + TypeScript + Vite)
  ├── ⚙️ Backend (Node.js + Express + SQLite)
  ├── 📄 Scripts Python (Extraction PDF)
  └── 📋 Documentation

  ---
  📁 Arborescence Détaillée

  🖥️ FRONTEND  (/frontend/)

  frontend/
  ├── 📦 Configuration
  │   ├── package.json              # Dépendances React/TypeScript
  │   ├── vite.config.ts            # Configuration Vite
  │   ├── tailwind.config.js        # Configuration TailwindCSS
  │   ├── tsconfig.json             # Configuration TypeScript
  │   └── eslint.config.js          # Configuration ESLint
  │
  ├── 🎨 Interface Utilisateur (/src/)
  │   ├── 🏠 App.tsx                # Point d'entrée principal
  │   ├── main.tsx                  # Bootstrap de l'application
  │   │
  │   ├── 🧩 Components (/components/)
  │   │   ├── 📄 Pages Principales
  │   │   │   ├── HomePage.tsx      # Page d'accueil avec navigation
  │   │   │   ├── MainContent.tsx   # Contenu principal (grille/liste papers)
  │   │   │   ├── PaperNotes.tsx    # Interface de prise de notes
  │   │   │   └── Sidebar.tsx       # Barre latérale avec stats
  │   │   │
  │   │   ├── ➕ Ajout d'Articles
  │   │   │   ├── AddPaper.tsx      # Interface principale d'ajout
  │   │   │   ├── AddPaperByDOI.tsx # Ajout par DOI
  │   │   │   ├── AddPaperByPDF.tsx # Ajout par upload PDF
  │   │   │   └── ImageSelectionModal.tsx # Sélection d'images
  │   │   │
  │   │   ├── 📋 Affichage des Papers
  │   │   │   ├── PaperCard.tsx     # Carte d'article (vignette)
  │   │   │   ├── PaperListView.tsx # Vue liste des articles
  │   │   │   ├── PaperFilters.tsx  # Filtres et recherche
  │   │   │   └── TopMenu.tsx       # Menu supérieur
  │   │   │
  │   │   ├── 📝 Système de Notes (/commands/)
  │   │   │   ├── TextBlock.tsx     # Bloc texte
  │   │   │   ├── HeadingBlock.tsx  # Bloc titre (H1, H2, H3)
  │   │   │   ├── ListBlock.tsx     # Bloc liste à puces
  │   │   │   ├── ImageBlock.tsx    # Bloc image
  │   │   │   └── SlashCommands.tsx # Menu slash (/)
  │   │   │
  │   │   └── 🔧 Utilitaires
  │   │       └── Modal.tsx         # Modal générique
  │   │
  │   ├── 🎛️ Contextes (/contexts/)
  │   │   └── ToastContext.tsx      # Système de notifications
  │   │
  │   ├── 🔗 Services (/services/)
  │   │   ├── paperService.ts       # API calls vers backend
  │   │   ├── notesStorage.ts       # Stockage des notes
  │   │   ├── notesStorageFile.ts   # Persistence fichier
  │   │   └── navigationService.ts  # Gestion navigation
  │   │
  │   ├── 🏗️ Hooks (/hooks/)
  │   │   └── useNavigation.ts      # Hook navigation
  │   │
  │   └── 📐 Types (/types/)
  │       ├── Paper.ts              # Types articles & API
  │       ├── BlockTypes.ts         # Types système de notes
  │       └── navigation.ts         # Types navigation

  ⚙️ BACKEND (/backend/)

  backend/
  ├── 📦 Configuration
  │   ├── package.json              # Dépendances Node.js
  │   ├── server.js                 # Serveur Express principal
  │   └── requirements.txt          # Dépendances Python
  │
  ├── 🗄️ Base de Données (/src/database/)
  │   ├── database.js               # Connexion SQLite
  │   ├── init-db.js               # Initialisation DB
  │   ├── models.js                # Modèles de données
  │   ├── operations.js            # Opérations CRUD
  │   ├── fileOperations.js        # Gestion fichiers/dossiers
  │   ├── index.js                 # Point d'entrée DB
  │   └── README.md                # Documentation DB
  │
  ├── 🔌 Routes API (/src/routes/)
  │   └── notesRoutes.js           # Routes pour les notes
  │
  ├── 🐍 Scripts Python (/scripts/)
  │   ├── extract_doi.py          # Extraction DOI depuis PDF
  │   └── extract_images.py       # Extraction images depuis PDF
  │
  ├── 📁 Stockage Automatique
  │   ├── MyPapers/               # Dossiers générés auto
  │   │   ├── paper_1/            # Utilise le titre et l'ID du papier comme nom du dossier
  │   │   │   ├── document.pdf
  │   │   │   └── images/
  │   │   └── paper_2/
  │   │       ├── article.pdf
  │   │       └── images/
  │   └── uploads/                # Uploads temporaires

  ---
  🔧 Technologies Utilisées

  Frontend

  - React 19 + TypeScript - Interface utilisateur moderne
  - Vite - Build tool ultra-rapide
  - TailwindCSS - Styling utility-first
  - Lucide React - Icônes modernes
  - Axios - Client HTTP

  Backend

  - Node.js + Express.js - Serveur web
  - SQLite3 - Base de données locale
  - Multer - Upload de fichiers
  - Python - Scripts d'extraction PDF

  ---
  📋 Fonctionnalités Principales

  🏠 Gestion des Articles

  - ✅ Import par DOI - Métadonnées automatiques
  - ✅ Import par PDF - Extraction DOI + images
  - ✅ Catégorisation - Organisation flexible
  - ✅ Statuts de lecture - Non lu, En cours, Lu, Favoris
  - ✅ Recherche avancée - Filtres multiples
  - ✅ Vues multiples - Grille, Liste, Tableau

  📝 Système de Notes (Type Notion)

  - ✅ Blocs modulaires - Texte, Titres, Listes, Images
  - ✅ Commandes slash - / pour ajouter des blocs
  - ✅ Persistence JSON - Sauvegarde automatique
  - ✅ Interface drag & drop - Réorganisation intuitive

  🖼️ Gestion des Images

  - ✅ Extraction automatique - Images depuis PDF
  - ✅ Sélection intelligente - Choix images + couverture
  - ✅ Stockage organisé - Dossiers par article
  - ✅ Aperçu intégré - Visualisation dans l'interface

  📊 Statistiques & Navigation

  - ✅ Dashboard - Vue d'ensemble de la collection
  - ✅ Sidebar dynamique - Stats en temps réel
  - ✅ Navigation fluide - Entre articles et notes
  - ✅ Système de toasts - Notifications utilisateur

  ---
  🗄️ Structure de la Base de Données

  Tables Principales

  -- Articles scientifiques
  Papers (
    id, title, authors, publication_date, conference,
    reading_status, image, doi, url, folder_path, created_at
  )

  -- Catégories d'organisation
  Categories (
    id, name
  )

  -- Liaison Many-to-Many
  PaperCategories (
    id, paper_id, categorie_id
  )

  -- Descriptions et notes
  Descriptions (
    id, paper_id, texte, images
  )

  ---
  🚀 Guide de Démarrage

  Installation

  # Backend
  cd backend
  npm install
  npm run init-db
  npm run dev

  # Frontend (nouveau terminal)
  cd frontend
  npm install
  npm run dev

  Accès

  - Frontend: http://localhost:5174
  - Backend: http://localhost:5324

  ---
  🔄 Flux d'Utilisation

  1. Ajout d'un Article

  DOI/PDF → Extraction métadonnées → Sélection images →
  Catégorisation → Sauvegarde → Stockage automatique

  2. Prise de Notes

  Double-clic article → Interface notes → Blocs modulaires →
  Commandes slash → Sauvegarde JSON

  3. Navigation & Recherche

  Filters/Search → Résultats → Vues multiples →
  Sélection article → Notes/Détails

  ---
  📝 Statut du Développement

  ✅ Fonctionnalités Implémentées

  1. ✅ Base de données complète
  2. ✅ Import DOI/PDF avec images
  3. ✅ Système de vignettes/cards
  4. ✅ Navigation et double-clic
  5. ✅ Statuts de lecture
  6. ✅ Prise de notes modulaire
  7. ✅ Commandes slash
  8. ✅ Sélection d'images avec couverture

  🔄 En Cours / À Venir

  9. 🔄 Tri avancé de la liste
  10. 🔄 Vues tableau/ligne/vignette
  11. 🔄 Intégration LLM (résumés)
  12. 🔄 Chatbot pour Q&A articles
  13. 🔄 Mode sombre
  14. 🔄 Notifications de succès améliorées