# RAG-Anything Service for FormPaper

Microservice Python utilisant RAG-Anything pour optimiser les conversations avec l'IA sur les documents PDF.

## Installation

```bash
pip install -r requirements.txt
```

## Démarrage

```bash
python app.py
```

Le service démarre sur http://localhost:5005

## Endpoints

### POST /config
Configure les clés API
```json
{
  "openai_api_key": "sk-...",
  "groq_api_key": "gsk_...",
  "ollama_base_url": "http://localhost:11434"
}
```

### POST /process
Traite un document PDF et crée l'index RAG
```json
{
  "paper_id": 123,
  "pdf_path": "C:/path/to/paper.pdf",
  "llm_model": "gpt-4o",
  "embedding_model": "text-embedding-3-small"
}
```

### POST /query
Interroge un document traité
```json
{
  "paper_id": 123,
  "question": "Quelle est la méthodologie utilisée ?",
  "history": [
    {"type": "user", "content": "..."},
    {"type": "ai", "content": "..."}
  ],
  "llm_model": "gpt-4o"
}
```

### GET /status/{paper_id}
Vérifie si un document a été traité

### DELETE /delete/{paper_id}
Supprime les données d'un document

### GET /health
Vérification de santé du service
