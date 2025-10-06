# PaperQA Service for FormPaper3001

Service Python utilisant PaperQA2 pour l'analyse d'articles scientifiques avec citations.

## Mode d'opération: Ollama (indexation) + Groq (requêtes)

- **Indexation**: Utilise Ollama local (gratuit, illimité, mais plus lent)
- **Requêtes**: Utilise Groq (gratuit, rapide)

## Installation

```bash
# Créer un environnement virtuel Python
python -m venv venv

# Activer l'environnement
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env et ajouter votre clé Groq API
```

## Lancement

```bash
# Assurez-vous qu'Ollama est lancé
ollama serve

# Dans un autre terminal:
python api.py
```

Le service sera disponible sur http://localhost:8000

## Endpoints

- `GET /health` - Vérifier que le service est actif
- `POST /api/paperqa/index` - Indexer un PDF
- `POST /api/paperqa/query` - Poser une question
- `GET /api/paperqa/status/{paper_id}` - Vérifier si un paper est indexé

## Test rapide

```bash
curl http://localhost:8000/health
```
