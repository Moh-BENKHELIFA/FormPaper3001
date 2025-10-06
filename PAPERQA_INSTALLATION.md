# Installation et Configuration de PaperQA

Ce guide explique comment installer et configurer PaperQA (Mode 2: Ollama + Groq) dans FormPaper3001.

## 📋 Prérequis

1. **Python 3.11+** installé
2. **Ollama** installé et en cours d'exécution
3. **Clé API Groq** (gratuite sur https://console.groq.com)
4. **Node.js** et **npm** déjà installés

## 🚀 Installation du Service PaperQA

### Étape 1 : Vérifier Python

```bash
python --version
# Doit afficher Python 3.11 ou supérieur
```

Si Python n'est pas installé, téléchargez-le depuis https://www.python.org/downloads/

### Étape 2 : Installer les dépendances Python

```bash
cd paperqa-service

# Créer un environnement virtuel
python -m venv venv

# Activer l'environnement (Windows)
venv\Scripts\activate

# Activer l'environnement (Linux/Mac)
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt
```

**Note:** L'installation peut prendre 5-10 minutes (torch, transformers, etc.)

### Étape 3 : Configurer la clé API Groq

```bash
# Créer le fichier .env
cp .env.example .env
```

Éditer `.env` et ajouter votre clé Groq :
```
GROQ_API_KEY=gsk_votre_clé_ici
```

### Étape 4 : Vérifier qu'Ollama fonctionne

```bash
# Lancer Ollama (dans un terminal séparé)
ollama serve

# Vérifier qu'un modèle est installé
ollama list

# Si llama3.1:8b n'est pas installé :
ollama pull llama3.1:8b
```

### Étape 5 : Lancer le service PaperQA

```bash
# Dans le dossier paperqa-service avec venv activé
python api.py
```

Vous devriez voir :
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Étape 6 : Tester le service

Dans un autre terminal :
```bash
curl http://localhost:8000/health
# Expected: {"status":"healthy","service":"paperqa"}
```

## 🔄 Lancer tous les services

### Terminal 1 : Service PaperQA
```bash
cd paperqa-service
venv\Scripts\activate  # Windows
python api.py
```

### Terminal 2 : Backend Node.js
```bash
cd backend
node server.js
```

### Terminal 3 : Frontend
```bash
cd frontend
npm run dev
```

## 🧪 Test complet

1. Ouvrir le frontend : http://localhost:8668
2. Ouvrir un article
3. Dans le chat, cocher "PaperQA (Citations précises)"
4. Si l'article n'est pas indexé, l'indexation démarre automatiquement
5. Attendre l'indexation (5-10 min avec Ollama)
6. Poser une question
7. Recevoir une réponse avec citations !

## 📊 Architecture

```
Mode 2: Ollama (indexation) + Groq (requêtes)

Indexation (1 fois par PDF):
PDF → PaperQA → Ollama local → Index créé (5-10 min)

Requêtes (chaque question):
Question → PaperQA → Groq API → Réponse avec citations (5-10 sec)
```

## ⚙️ Ports utilisés

- Frontend : 8668
- Backend Node.js : 5004
- Service PaperQA : 8000
- Ollama : 11434

## 🐛 Dépannage

### Erreur "PaperQA service not available"
- Vérifier que le service Python tourne sur le port 8000
- Vérifier les logs du service PaperQA

### Erreur lors de l'indexation
- Vérifier qu'Ollama est lancé : `ollama serve`
- Vérifier que llama3.1:8b est installé : `ollama list`
- Regarder les logs du service PaperQA

### Erreur lors des requêtes
- Vérifier que la clé Groq est correcte dans `.env`
- Vérifier les limites de Groq (30 req/min)

### L'indexation est très lente
- C'est normal avec Ollama sans GPU
- Attendre 5-10 minutes pour un PDF de 20 pages
- Alternative : utiliser un modèle plus petit (llama3.1:8b → llama3.2:3b)

## 💡 Optimisations possibles

1. **Utiliser un GPU** pour accélérer Ollama
2. **Cache l'index** : une fois indexé, pas besoin de réindexer
3. **Modèle plus petit** pour l'indexation : llama3.2:3b au lieu de llama3.1:8b

## 📚 Documentation

- PaperQA: https://github.com/Future-House/paper-qa
- Ollama: https://ollama.ai
- Groq: https://console.groq.com
