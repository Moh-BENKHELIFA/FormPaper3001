# PaperQA Service for FormPaper

Microservice Python utilisant PaperQA pour le RAG sur articles scientifiques.

## Installation

```bash
pip install -r requirements.txt
```

## Démarrage

```bash
python app.py
```

Le service démarre sur http://localhost:5005

## Architecture

### Indexation
- **Quand** : Au premier clic sur l'onglet "Chat IA"
- **Stockage** : `{paper_id}_paperqa_index.json` dans le dossier du paper
- **Chunks** : ~3000 caractères par chunk avec overlap de 200

### Query
- **RAG** : Trouve les 3-5 chunks les plus pertinents
- **LLM** : Envoie seulement ces chunks à Groq/Ollama (2000-3000 tokens)
- **Résultat** : Réponse + sources avec citations

## Endpoints

### POST /config
Configure les clés API
```json
{
  "groq_api_key": "gsk_...",
  "ollama_base_url": "http://localhost:11434"
}
```

### POST /index
Indexe un document PDF
```json
{
  "paper_id": 123,
  "pdf_path": "C:/path/to/paper.pdf",
  "provider": "groq",
  "model_name": "llama-3.3-70b-versatile"
}
```

**Response** :
```json
{
  "success": true,
  "paper_id": 123,
  "already_indexed": false,
  "chunks": 42,
  "time_seconds": 12.3,
  "message": "Document indexed successfully"
}
```

### POST /query
Interroge un document via RAG
```json
{
  "paper_id": 123,
  "question": "Quelle est la méthodologie ?",
  "history": [
    {"type": "user", "content": "..."},
    {"type": "ai", "content": "..."}
  ],
  "provider": "groq",
  "model_name": "llama-3.3-70b-versatile"
}
```

**Response** :
```json
{
  "success": true,
  "paper_id": 123,
  "response": "La méthodologie utilisée est...",
  "context": "Source chunks with page numbers",
  "question": "Quelle est la méthodologie ?"
}
```

### GET /status/{paper_id}
Vérifie si un document a été indexé

### DELETE /delete/{paper_id}
Supprime l'index d'un document

### GET /health
Vérification de santé du service

## Avantages PaperQA

- ✅ **Réduit les tokens** : 14,000 → 2,500 tokens
- ✅ **Citations précises** : Numéro de page + extrait
- ✅ **Comprend la structure** : Sections scientifiques
- ✅ **Multi-document** : Peut comparer plusieurs papers
- ✅ **Compatible Groq/Ollama** : Utilise les deux providers
