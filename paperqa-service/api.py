from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from paperqa import Settings, Docs
import os
from pathlib import Path
import json

app = FastAPI(title="PaperQA Service for FormPaper3001")

# Charger la clé API Groq depuis settings.json du backend
def load_groq_api_key():
    settings_path = Path("../backend/settings.json")
    if settings_path.exists():
        with open(settings_path, 'r') as f:
            settings = json.load(f)
            api_key = settings.get('groqApiKey')
            if api_key:
                os.environ['GROQ_API_KEY'] = api_key
                print("[PaperQA] Groq API key loaded from settings.json")
                return True
    print("[PaperQA] No Groq API key found in settings.json")
    return False

# Charger la clé au démarrage
load_groq_api_key()

# CORS pour communiquer avec le backend Node.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5004", "http://localhost:8666", "http://localhost:8667", "http://localhost:8668"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    question: str
    paper_id: int
    pdf_path: str
    llm_model: str = "llama-3.3-70b-versatile"
    
class IndexRequest(BaseModel):
    paper_id: int
    pdf_path: str
    ollama_model: str = "llama3.1:8b"

# Cache des documents indexés
docs_cache = {}
index_dir = Path("./indexes")
index_dir.mkdir(exist_ok=True)

@app.get("/")
async def root():
    return {
        "service": "PaperQA for FormPaper3001",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "paperqa"}

@app.post("/api/paperqa/index")
async def index_paper(request: IndexRequest):
    """
    Indexe un article PDF avec PaperQA
    Utilise Ollama pour l'indexation (gratuit, illimité)
    """
    try:
        paper_id = request.paper_id
        pdf_path = request.pdf_path
        
        print(f"[PaperQA] Starting indexation for paper {paper_id}")
        print(f"[PaperQA] PDF path: {pdf_path}")
        
        # Vérifier que le PDF existe
        if not os.path.exists(pdf_path):
            raise HTTPException(status_code=404, detail=f"PDF not found: {pdf_path}")
        
        # Configuration pour l'indexation avec Ollama
        indexing_settings = Settings(
            llm=f"ollama/{request.ollama_model}",
            summary_llm=f"ollama/{request.ollama_model}",
            embedding="ollama/nomic-embed-text",
            temperature=0.1,
        )
        
        print(f"[PaperQA] Using Ollama model: {request.ollama_model}")

        # Créer l'objet Docs
        docs = Docs()

        # Ajouter le PDF
        print(f"[PaperQA] Adding PDF to index...")
        await docs.aadd(pdf_path, settings=indexing_settings)

        # Sauvegarder dans le cache
        docs_cache[paper_id] = docs

        # Sauvegarder l'index sur disque
        index_file = index_dir / f"paper_{paper_id}.json"
        print(f"[PaperQA] Saving index to {index_file}")
        
        # On sauvegarde juste les métadonnées pour info
        metadata = {
            "paper_id": paper_id,
            "pdf_path": pdf_path,
            "num_docs": len(docs.docs),
            "indexed": True
        }
        
        with open(index_file, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"[PaperQA] Indexation completed: {len(docs.docs)} chunks")

        return {
            "success": True,
            "paper_id": paper_id,
            "chunks": len(docs.docs),
            "message": f"Paper {paper_id} indexed successfully with {len(docs.docs)} chunks"
        }

    except Exception as e:
        print(f"[PaperQA] Error indexing paper {request.paper_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Indexation error: {str(e)}")

@app.post("/api/paperqa/query")
async def query_paper(request: QueryRequest):
    """
    Interroge un article avec PaperQA
    Utilise Groq pour les requêtes (rapide, gratuit)
    """
    try:
        paper_id = request.paper_id
        question = request.question
        
        print(f"[PaperQA] Query for paper {paper_id}: {question}")

        # Récupérer ou créer l'index
        if paper_id not in docs_cache:
            # Vérifier si un index existe sur disque
            index_file = index_dir / f"paper_{paper_id}.json"
            if index_file.exists():
                # Réindexer (on ne peut pas vraiment charger l'index PaperQA du disque facilement)
                print(f"[PaperQA] Index exists but not in cache, re-indexing...")
                with open(index_file, 'r') as f:
                    metadata = json.load(f)
                    pdf_path = metadata['pdf_path']
                
                # Réindexer avec Ollama
                indexing_settings = Settings(
                    llm="ollama/llama3.1:8b",
                    summary_llm="ollama/llama3.1:8b",
                    embedding="ollama/nomic-embed-text",
                )
                docs = Docs()
                await docs.aadd(pdf_path, settings=indexing_settings)
                docs_cache[paper_id] = docs
            else:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Paper {paper_id} not indexed. Please index it first."
                )
        else:
            docs = docs_cache[paper_id]
        
        # Configuration pour les requêtes avec Groq
        query_settings = Settings(
            llm=f"groq/{request.llm_model}",
            summary_llm=f"groq/{request.llm_model}",
            embedding="ollama/nomic-embed-text",
            temperature=0.1,
        )
        
        print(f"[PaperQA] Using Groq model: {request.llm_model}")

        # Poser la question
        print(f"[PaperQA] Querying document...")
        answer = await docs.aquery(question, settings=query_settings)
        
        # Extraire les citations
        citations = []
        if hasattr(answer, 'contexts') and answer.contexts:
            for ctx in answer.contexts:
                citations.append({
                    "text": ctx.text.context if hasattr(ctx.text, 'context') else str(ctx.text)[:200],
                    "score": float(ctx.score) if hasattr(ctx, 'score') else 0.0,
                    "key": ctx.key if hasattr(ctx, 'key') else ""
                })
        
        print(f"[PaperQA] Query successful with {len(citations)} citations")

        return {
            "success": True,
            "response": str(answer.answer),
            "citations": citations,
            "formatted_answer": str(answer.formatted_answer) if hasattr(answer, 'formatted_answer') else str(answer.answer),
        }

    except Exception as e:
        print(f"[PaperQA] Error querying paper {request.paper_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Query error: {str(e)}")

@app.get("/api/paperqa/status/{paper_id}")
async def check_status(paper_id: int):
    """Vérifie si un paper est indexé"""
    index_file = index_dir / f"paper_{paper_id}.json"
    
    if index_file.exists():
        with open(index_file, 'r') as f:
            metadata = json.load(f)
        return {
            "success": True,
            "indexed": True,
            "paper_id": paper_id,
            "chunks": metadata.get('num_docs', 0)
        }
    else:
        return {
            "success": True,
            "indexed": False,
            "paper_id": paper_id
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
