"""
RAG (Retrieval-Augmented Generation) package
Handles knowledge base queries and embeddings
"""

from .knowledge_base import KnowledgeBasePool
from .embeddings import EmbeddingService

__all__ = ["KnowledgeBasePool", "EmbeddingService"]
