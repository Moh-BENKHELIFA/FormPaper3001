from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
import shutil
from pathlib import Path
from typing import List, Optional
import uvicorn

# Import RAG-Anything
from raganything import RAGAnything

app = FastAPI(title="RAG-Anything Service for FormPaper")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
STORAGE_DIR = Path("./rag_storage")
STORAGE_DIR.mkdir(exist_ok=True)

# Store RAG instances per paper
rag_instances = {}

class ProcessDocumentRequest(BaseModel):
    paper_id: int
    pdf_path: str
    llm_model: str = "gpt-4o"
    embedding_model: str = "text-embedding-3-small"

class QueryRequest(BaseModel):
    paper_id: int
    question: str
    history: Optional[List[dict]] = []
    llm_model: str = "gpt-4o"

class ConfigRequest(BaseModel):
    openai_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    ollama_base_url: Optional[str] = "http://localhost:11434"

# Global configuration
config = {
    "openai_api_key": None,
    "groq_api_key": None,
    "ollama_base_url": "http://localhost:11434"
}

@app.post("/config")
async def set_config(req: ConfigRequest):
    """Configure API keys and endpoints"""
    if req.openai_api_key:
        config["openai_api_key"] = req.openai_api_key
        os.environ["OPENAI_API_KEY"] = req.openai_api_key
    if req.groq_api_key:
        config["groq_api_key"] = req.groq_api_key
        os.environ["GROQ_API_KEY"] = req.groq_api_key
    if req.ollama_base_url:
        config["ollama_base_url"] = req.ollama_base_url

    return {"success": True, "message": "Configuration updated"}

@app.post("/process")
async def process_document(req: ProcessDocumentRequest):
    """Process a PDF document and create RAG index"""
    try:
        paper_id = str(req.paper_id)
        pdf_path = req.pdf_path

        if not os.path.exists(pdf_path):
            raise HTTPException(status_code=404, detail=f"PDF file not found: {pdf_path}")

        # Create storage directory for this paper
        paper_storage = STORAGE_DIR / paper_id
        paper_storage.mkdir(exist_ok=True)

        # Initialize RAG-Anything
        rag = RAGAnything(
            working_dir=str(paper_storage),
            llm_model=req.llm_model,
            embedding_model=req.embedding_model
        )

        # Process the document
        print(f"Processing document {pdf_path} for paper {paper_id}...")
        rag.insert(pdf_path)

        # Store RAG instance
        rag_instances[paper_id] = rag

        return {
            "success": True,
            "paper_id": paper_id,
            "message": "Document processed successfully",
            "storage_path": str(paper_storage)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")

@app.post("/query")
async def query_document(req: QueryRequest):
    """Query a processed document using RAG"""
    try:
        paper_id = str(req.paper_id)

        # Check if RAG instance exists
        if paper_id not in rag_instances:
            # Try to load from storage
            paper_storage = STORAGE_DIR / paper_id
            if not paper_storage.exists():
                raise HTTPException(
                    status_code=404,
                    detail=f"No processed document found for paper {paper_id}"
                )

            # Reload RAG instance
            rag = RAGAnything(
                working_dir=str(paper_storage),
                llm_model=req.llm_model
            )
            rag_instances[paper_id] = rag

        rag = rag_instances[paper_id]

        # Build query with history context
        query_text = req.question
        if req.history:
            # Add last 3 exchanges for context
            context_messages = []
            for msg in req.history[-6:]:  # Last 3 exchanges (6 messages)
                role = "User" if msg.get("type") == "user" else "Assistant"
                context_messages.append(f"{role}: {msg.get('content', '')}")

            if context_messages:
                query_text = "\n".join(context_messages) + f"\nUser: {req.question}"

        # Query RAG
        print(f"Querying RAG for paper {paper_id}: {req.question}")
        response = rag.query(query_text, mode="local")

        return {
            "success": True,
            "paper_id": paper_id,
            "response": response,
            "question": req.question
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error querying document: {str(e)}")

@app.get("/status/{paper_id}")
async def get_status(paper_id: int):
    """Check if a document has been processed"""
    paper_id_str = str(paper_id)
    paper_storage = STORAGE_DIR / paper_id_str

    is_processed = paper_storage.exists()
    is_loaded = paper_id_str in rag_instances

    return {
        "paper_id": paper_id,
        "processed": is_processed,
        "loaded": is_loaded,
        "storage_path": str(paper_storage) if is_processed else None
    }

@app.delete("/delete/{paper_id}")
async def delete_document(paper_id: int):
    """Delete processed document data"""
    try:
        paper_id_str = str(paper_id)
        paper_storage = STORAGE_DIR / paper_id_str

        # Remove from memory
        if paper_id_str in rag_instances:
            del rag_instances[paper_id_str]

        # Remove from disk
        if paper_storage.exists():
            shutil.rmtree(paper_storage)

        return {
            "success": True,
            "paper_id": paper_id,
            "message": "Document data deleted"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting document: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "RAG-Anything Service",
        "loaded_documents": len(rag_instances)
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5005)
