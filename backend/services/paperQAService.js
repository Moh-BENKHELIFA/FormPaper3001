const axios = require('axios');

const PAPERQA_API_URL = process.env.PAPERQA_API_URL || 'http://localhost:8000';

class PaperQAService {
  async healthCheck() {
    try {
      const response = await axios.get(`${PAPERQA_API_URL}/health`, { timeout: 5000 });
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('[PaperQA] Health check failed:', error.message);
      return false;
    }
  }

  async checkStatus(paperId) {
    try {
      const response = await axios.get(`${PAPERQA_API_URL}/api/paperqa/status/${paperId}`);
      return response.data;
    } catch (error) {
      console.error(`[PaperQA] Status check error for paper ${paperId}:`, error.message);
      throw new Error(`Erreur de vérification du statut: ${error.message}`);
    }
  }

  async indexPaper(paperId, pdfPath, ollamaModel = 'llama3.1:8b') {
    try {
      console.log(`[PaperQA] Starting indexation for paper ${paperId}`);
      console.log(`[PaperQA] PDF path: ${pdfPath}`);
      console.log(`[PaperQA] Ollama model: ${ollamaModel}`);

      const response = await axios.post(`${PAPERQA_API_URL}/api/paperqa/index`, {
        paper_id: paperId,
        pdf_path: pdfPath,
        ollama_model: ollamaModel
      }, {
        timeout: 600000
      });

      console.log(`[PaperQA] Indexation completed for paper ${paperId}`);
      return response.data;
    } catch (error) {
      console.error(`[PaperQA] Index error for paper ${paperId}:`, error.message);
      const detail = error.response?.data?.detail || error.message;
      throw new Error(`Erreur d'indexation PaperQA: ${detail}`);
    }
  }

  async query(paperId, pdfPath, question, llmModel = 'llama-3.3-70b-versatile') {
    try {
      console.log(`[PaperQA] Querying paper ${paperId}: "${question}"`);
      console.log(`[PaperQA] Using Groq model: ${llmModel}`);

      const response = await axios.post(`${PAPERQA_API_URL}/api/paperqa/query`, {
        question: question,
        paper_id: paperId,
        pdf_path: pdfPath,
        llm_model: llmModel
      }, {
        timeout: 120000
      });

      console.log(`[PaperQA] Query successful for paper ${paperId}`);
      return response.data;
    } catch (error) {
      console.error(`[PaperQA] Query error for paper ${paperId}:`, error.message);
      const detail = error.response?.data?.detail || error.message;
      throw new Error(`Erreur de requête PaperQA: ${detail}`);
    }
  }
}

module.exports = new PaperQAService();
