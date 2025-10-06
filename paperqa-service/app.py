from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
import time
from pathlib import Path
from typing import List, Optional
import uvicorn

# Import LlamaIndex
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Settings, StorageContext, load_index_from_storage
from llama_index.llms.groq import Groq
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

app = FastAPI(title="LlamaIndex RAG Service for FormPaper")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global configuration
config = {
    "groq_api_key": None,
    "ollama_base_url": "http://localhost:11434"
}

# Initialize embedding model (local, free)
embed_model = HuggingFaceEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
Settings.embed_model = embed_model

class ConfigRequest(BaseModel):
    groq_api_key: Optional[str] = None
    ollama_base_url: Optional[str] = "http://localhost:11434"

class IndexRequest(BaseModel):
    paper_id: int
    pdf_path: str
    provider: str = "groq"
    model_name: str = "llama-3.3-70b-versatile"

class QueryRequest(BaseModel):
    paper_id: int
    question: str
    history: Optional[List[dict]] = []
    provider: str = "groq"
    model_name: str = "llama-3.3-70b-versatile"

@app.post("/config")
async def set_config(req: ConfigRequest):
    """Configure API keys and endpoints"""
    if req.groq_api_key:
        config["groq_api_key"] = req.groq_api_key
        os.environ["GROQ_API_KEY"] = req.groq_api_key
    if req.ollama_base_url:
        config["ollama_base_url"] = req.ollama_base_url

    return {"success": True, "message": "Configuration updated"}

def get_index_dir(paper_id: int, pdf_path: str) -> Path:
    """Get the directory where index should be stored"""
    pdf_dir = Path(pdf_path).parent
    index_dir = pdf_dir / f"{paper_id}_llamaindex"
    return index_dir

def create_llm(provider: str, model_name: str):
    """Create LLM instance based on provider"""
    if provider == "groq":
        if not config["groq_api_key"]:
            raise ValueError("Groq API key not configured")
        return Groq(
            model=model_name,
            api_key=config["groq_api_key"],
            temperature=0.1
        )
    else:  # ollama
        return Ollama(
            model=model_name,
            base_url=config["ollama_base_url"],
            temperature=0.1
        )

@app.post("/index")
async def index_document(req: IndexRequest):
    """Index a PDF document using LlamaIndex"""
    try:
        start_time = time.time()
        paper_id = req.paper_id
        pdf_path = req.pdf_path

        if not os.path.exists(pdf_path):
            raise HTTPException(status_code=404, detail=f"PDF file not found: {pdf_path}")

        # Check if already indexed
        index_dir = get_index_dir(paper_id, pdf_path)
        if index_dir.exists() and (index_dir / "docstore.json").exists():
            # Load existing index to get chunk count
            storage_context = StorageContext.from_defaults(persist_dir=str(index_dir))
            index = load_index_from_storage(storage_context)

            # Count chunks from docstore
            docstore_path = index_dir / "docstore.json"
            with open(docstore_path, 'r', encoding='utf-8') as f:
                docstore = json.load(f)
            chunks = len(docstore.get("docstore/data", {}))

            return {
                "success": True,
                "paper_id": paper_id,
                "already_indexed": True,
                "chunks": chunks,
                "message": "Document already indexed"
            }

        # Create index directory
        index_dir.mkdir(exist_ok=True)

        # Load PDF
        print(f"[RAG] Loading PDF: {pdf_path}")
        documents = SimpleDirectoryReader(input_files=[pdf_path]).load_data()

        # Create LLM
        llm = create_llm(req.provider, req.model_name)
        Settings.llm = llm

        # Create index
        print(f"[RAG] Creating vector index for paper {paper_id}...")
        index = VectorStoreIndex.from_documents(
            documents,
            show_progress=True
        )

        # Persist index
        index.storage_context.persist(persist_dir=str(index_dir))

        # Count chunks
        docstore_path = index_dir / "docstore.json"
        with open(docstore_path, 'r', encoding='utf-8') as f:
            docstore = json.load(f)
        chunks = len(docstore.get("docstore/data", {}))

        # Save metadata
        metadata = {
            "paper_id": paper_id,
            "pdf_path": pdf_path,
            "provider": req.provider,
            "model_name": req.model_name,
            "chunks": chunks,
            "indexed_at": time.time()
        }

        metadata_path = index_dir / "metadata.json"
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)

        elapsed_time = time.time() - start_time

        return {
            "success": True,
            "paper_id": paper_id,
            "already_indexed": False,
            "chunks": chunks,
            "time_seconds": round(elapsed_time, 1),
            "index_path": str(index_dir),
            "message": f"Document indexed successfully in {elapsed_time:.1f}s"
        }

    except Exception as e:
        print(f"[RAG ERROR] Error indexing document: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error indexing document: {str(e)}")

@app.post("/query")
async def query_document(req: QueryRequest):
    """Query a document using LlamaIndex RAG"""
    try:
        paper_id = req.paper_id

        # Find the paper's index directory
        base_papers_dir = Path(__file__).parent.parent / "backend" / "MyPapers"

        # Find folder containing this paper_id
        index_dir = None
        for folder in base_papers_dir.iterdir():
            if folder.is_dir() and f"_{paper_id}" in folder.name:
                potential_index = folder / f"{paper_id}_llamaindex"
                if potential_index.exists():
                    index_dir = potential_index
                    break

        if not index_dir or not index_dir.exists():
            raise HTTPException(
                status_code=404,
                detail=f"No index found for paper {paper_id}. Please index the document first."
            )

        # Load metadata
        metadata_path = index_dir / "metadata.json"
        with open(metadata_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)

        # Create LLM
        llm = create_llm(req.provider, req.model_name)
        Settings.llm = llm

        # Load index
        storage_context = StorageContext.from_defaults(persist_dir=str(index_dir))
        index = load_index_from_storage(storage_context)

        # Create query engine
        query_engine = index.as_query_engine(
            similarity_top_k=5,  # Retrieve top 5 most relevant chunks
            response_mode="compact"
        )

        # Build question with history context
        question = req.question
        if req.history and len(req.history) > 0:
            # Add recent conversation context
            context_parts = []
            for msg in req.history[-4:]:  # Last 2 exchanges
                role = "User" if msg.get("type") == "user" else "Assistant"
                content = msg.get('content', '')
                if content:
                    context_parts.append(f"{role}: {content}")

            if context_parts:
                context_text = "\n".join(context_parts)
                question = f"Previous conversation:\n{context_text}\n\nCurrent question: {req.question}"

        # Query with RAG
        print(f"[RAG] Querying paper {paper_id}: {req.question}")
        response = query_engine.query(question)

        # Extract source nodes info
        source_info = []
        if hasattr(response, 'source_nodes'):
            for node in response.source_nodes:
                source_info.append({
                    "text": node.text[:200] + "..." if len(node.text) > 200 else node.text,
                    "score": float(node.score) if hasattr(node, 'score') else None
                })

        return {
            "success": True,
            "paper_id": paper_id,
            "response": str(response),
            "sources": source_info,
            "question": req.question
        }

    except Exception as e:
        print(f"❌ Error querying document: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error querying document: {str(e)}")

@app.get("/status/{paper_id}")
async def get_status(paper_id: int):
    """Check if a document has been indexed"""
    try:
        # Search for index directory
        base_papers_dir = Path(__file__).parent.parent / "backend" / "MyPapers"

        for folder in base_papers_dir.iterdir():
            if folder.is_dir() and f"_{paper_id}" in folder.name:
                index_dir = folder / f"{paper_id}_llamaindex"
                if index_dir.exists() and (index_dir / "docstore.json").exists():
                    metadata_path = index_dir / "metadata.json"
                    if metadata_path.exists():
                        with open(metadata_path, 'r', encoding='utf-8') as f:
                            metadata = json.load(f)
                        return {
                            "paper_id": paper_id,
                            "indexed": True,
                            "chunks": metadata.get("chunks", 0),
                            "indexed_at": metadata.get("indexed_at")
                        }

        return {
            "paper_id": paper_id,
            "indexed": False
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking status: {str(e)}")

@app.delete("/delete/{paper_id}")
async def delete_index(paper_id: int):
    """Delete index for a paper"""
    try:
        base_papers_dir = Path(__file__).parent.parent / "backend" / "MyPapers"

        for folder in base_papers_dir.iterdir():
            if folder.is_dir() and f"_{paper_id}" in folder.name:
                index_dir = folder / f"{paper_id}_llamaindex"
                if index_dir.exists():
                    import shutil
                    shutil.rmtree(index_dir)
                    return {
                        "success": True,
                        "paper_id": paper_id,
                        "message": "Index deleted successfully"
                    }

        return {
            "success": False,
            "paper_id": paper_id,
            "message": "No index found"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting index: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "LlamaIndex RAG Service",
        "groq_configured": config["groq_api_key"] is not None
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5005)
