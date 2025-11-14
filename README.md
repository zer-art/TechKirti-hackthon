# TechKirti — PDF Chatbot

A lightweight chatbot application that accepts a PDF and lets you talk to its content. Upload one or more PDFs, the app extracts and indexes the text, and you can ask questions as if conversing with the document.

## Features

- Upload PDF(s) and extract text
- Create embeddings and index content for semantic search
- Chat interface with context-aware replies
- Support for multi-page answers, citations (page numbers), and summaries
- Option to persist index to a vector store (local or cloud)

## Tech stack (suggested)

- Frontend: React (Vite or Create React App)
- Backend: Node.js + Express or Python (FastAPI / Flask)
- Vector DB / embeddings: FAISS / Milvus / Pinecone / Weaviate
- PDF parsing: PyMuPDF, pdfplumber, or pdf.js
- LLM provider: OpenAI, Anthropic, or other compatible APIs

## Prerequisites (macOS)

- Git
- Node.js >= 16
- Python 3.8+ (if backend uses Python)
- (Optional) Docker
- LLM API key (OpenAI or chosen provider)

## Quick start (macOS)

1. Clone the repo
   - git clone <repository-url>
   - cd TechKirti-hackthon
2. Install dependencies (example)
   - cd frontend && npm install
   - cd ../backend && npm install # or: pip install -r requirements.txt
3. Create .env with required keys (example)
   - OPENAI_API_KEY=sk-...
   - VECTOR_DB_URL=...
4. Start development servers
   - cd frontend && npm run dev
   - cd ../backend && npm run dev # or: uvicorn main:app --reload
5. Open http://localhost:3000 (or shown port) and upload a PDF to start chatting.

## Usage

- Upload a PDF via the UI
- Wait for processing/indexing to complete
- Ask questions in the chat; answers include references to pages when applicable

## Testing

- Run frontend and backend test suites (if present):
  - cd frontend && npm test
  - cd backend && npm test

## Contributing

- Open an issue for bugs or feature requests
- Fork, create a branch, and open a PR with a clear description
- Keep changes focused and add tests when possible

## License

Specify a license (e.g., MIT) in LICENSE file.

## Contact

Project maintainer: Pawan — update contact info in repository
