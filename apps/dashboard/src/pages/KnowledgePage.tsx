/**
 * Knowledge Base Page - RAG-Enhanced Document Management
 * Voyage Multimodal-3 embeddings with hybrid retrieval system
 */

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@platform/ui';
import { BookOpen, Database, Sparkles, Upload, Trash2, FileText, Zap } from 'lucide-react';
import { useRef, useState } from 'react';
import { trpc } from '../utils/trpc';

interface UploadFormData {
  title: string;
  category: string;
  file: File | null;
}

export function KnowledgePage() {
  const [uploadFormData, setUploadFormData] = useState<UploadFormData>({
    title: '',
    category: '',
    file: null,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch documents list
  const { data: documentsData, refetch: refetchDocuments } = trpc.knowledge.list.useQuery({
    limit: 50,
    offset: 0,
  });

  // Upload mutation
  const uploadMutation = trpc.knowledge.upload.useMutation({
    onSuccess: (data) => {
      setIsUploading(false);
      setUploadProgress('');
      setUploadSuccess(
        `Document uploaded successfully! Created ${data.processingStats.chunksCreated} chunks with ${data.processingStats.totalTokens} tokens.`
      );
      setUploadFormData({ title: '', category: '', file: null });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      refetchDocuments();
    },
    onError: (error) => {
      setIsUploading(false);
      setUploadProgress('');
      setUploadError(error.message);
    },
  });

  // Delete mutation
  const deleteMutation = trpc.knowledge.delete.useMutation({
    onSuccess: () => {
      refetchDocuments();
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFormData({
        ...uploadFormData,
        file,
        title: uploadFormData.title || file.name,
      });
      setUploadError('');
      setUploadSuccess('');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');
    setUploadSuccess('');

    if (!uploadFormData.file) {
      setUploadError('Please select a file to upload');
      return;
    }

    if (!uploadFormData.title.trim()) {
      setUploadError('Please enter a document title');
      return;
    }

    setIsUploading(true);
    setUploadProgress('Reading file...');

    try {
      // Read file content as text first (for content validation)
      const textReader = new FileReader();
      textReader.onload = async () => {
        try {
          const textContent = textReader.result as string;

          if (!textContent || textContent.trim().length === 0) {
            throw new Error('File is empty');
          }

          setUploadProgress('Processing file...');

          // Now read as base64 for upload
          const base64Reader = new FileReader();
          base64Reader.onload = async () => {
            try {
              const result = base64Reader.result as string;
              const base64Data = result.split(',')[1];

              if (!base64Data) {
                throw new Error('Failed to encode file data');
              }

              setUploadProgress('Uploading and processing...');

              // Call upload mutation with actual content
              await uploadMutation.mutateAsync({
                title: uploadFormData.title,
                content: textContent, // Use extracted text content
                category: uploadFormData.category || undefined,
                file: {
                  name: uploadFormData.file!.name,
                  type: uploadFormData.file!.type,
                  size: uploadFormData.file!.size,
                  data: base64Data,
                },
              });
            } catch (error) {
              setIsUploading(false);
              setUploadProgress('');
              setUploadError(error instanceof Error ? error.message : 'Upload failed');
            }
          };

          base64Reader.onerror = () => {
            setIsUploading(false);
            setUploadProgress('');
            setUploadError('Failed to encode file');
          };

          base64Reader.readAsDataURL(uploadFormData.file!);
        } catch (error) {
          setIsUploading(false);
          setUploadProgress('');
          setUploadError(error instanceof Error ? error.message : 'Upload failed');
        }
      };

      textReader.onerror = () => {
        setIsUploading(false);
        setUploadProgress('');
        setUploadError('Failed to read file');
      };

      textReader.readAsText(uploadFormData.file);
    } catch (error) {
      setIsUploading(false);
      setUploadProgress('');
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const handleDelete = async (documentId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      await deleteMutation.mutateAsync({ id: documentId });
    }
  };

  // Calculate stats*
  const totalDocuments = documentsData?.total || 0;
  const estimatedChunks = totalDocuments * 12; // Average ~12 chunks per doc
  const vectorEmbeddings = estimatedChunks * 1024; // 1024-dim embeddings
  const processingStatus = isUploading ? 'Processing' : 'Ready';

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header Section */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="mb-4">
            <h1 className="text-3xl font-bold">Knowledge Base Management</h1>
            <p className="text-muted-foreground mt-2">
              RAG-enhanced document repository with Voyage Multimodal-3 embeddings and hybrid
              retrieval for intelligent AI responses
            </p>
          </div>

          {/* Knowledge Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Documents</p>
                    <p className="text-2xl font-bold">{totalDocuments}*</p>
                  </div>
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Chunks Indexed</p>
                    <p className="text-2xl font-bold">{estimatedChunks}*</p>
                  </div>
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Vector Embeddings</p>
                    <p className="text-2xl font-bold">{vectorEmbeddings.toLocaleString()}*</p>
                  </div>
                  <Database className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="text-2xl font-bold">{processingStatus}</p>
                  </div>
                  <Zap className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="container mx-auto space-y-6">
          {/* Upload Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Document
              </CardTitle>
              <CardDescription>
                Upload text files (.txt, .md, .json, .csv) to enhance AI responses with your
                knowledge base**
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Document Title</Label>
                    <Input
                      id="title"
                      type="text"
                      placeholder="Enter document title"
                      value={uploadFormData.title}
                      onChange={(e) => setUploadFormData({ ...uploadFormData, title: e.target.value })}
                      disabled={isUploading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category (Optional)</Label>
                    <Input
                      id="category"
                      type="text"
                      placeholder="e.g., documentation, guides, faq"
                      value={uploadFormData.category}
                      onChange={(e) =>
                        setUploadFormData({ ...uploadFormData, category: e.target.value })
                      }
                      disabled={isUploading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file">File</Label>
                  <Input
                    id="file"
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.json,.csv,text/plain,text/markdown,application/json,text/csv"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Supported formats: TXT, Markdown, JSON, CSV (max 10MB) • Automatically chunked
                    with 512-1024 token overlap***
                  </p>
                </div>

                {uploadProgress && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200 rounded-md flex items-center gap-2">
                    <Zap className="h-4 w-4 animate-spin" />
                    {uploadProgress}
                  </div>
                )}

                {uploadError && (
                  <div className="p-4 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 rounded-md">
                    {uploadError}
                  </div>
                )}

                {uploadSuccess && (
                  <div className="p-4 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 rounded-md">
                    {uploadSuccess}
                  </div>
                )}

                <Button type="submit" disabled={isUploading || !uploadFormData.file}>
                  {isUploading ? (
                    <>
                      <Zap className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Document Library */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Document Library
              </CardTitle>
              <CardDescription>
                {documentsData?.total || 0} document(s) in your knowledge base with hybrid retrieval
                indexing***
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documentsData && documentsData.documents.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documentsData.documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              {doc.title}
                            </div>
                          </TableCell>
                          <TableCell>
                            {doc.category && (
                              <Badge variant="outline">
                                {doc.category}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(doc.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">No documents uploaded yet</p>
                  <p className="text-sm text-muted-foreground">
                    Upload your first document to enhance AI responses with RAG
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Annotation Footer */}
      <div className="border-t border-border bg-muted/30 p-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="flex items-start gap-2">
              <span className="font-bold text-primary">*</span>
              <p className="text-muted-foreground">
                <strong>Knowledge Metrics:</strong> Document count, chunk estimates (~12 per
                document), and 1024-dimensional Voyage Multimodal-3 vector embeddings. Processing
                status shows real-time upload state.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-primary">**</span>
              <p className="text-muted-foreground">
                <strong>Voyage Multimodal-3:</strong> State-of-the-art 1024-dim embeddings with
                multimodal support (text, images, PDFs). Enables semantic search across diverse
                content types with superior accuracy vs BERT/OpenAI.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-primary">***</span>
              <p className="text-muted-foreground">
                <strong>Hybrid Retrieval:</strong> Combines semantic search (Voyage embeddings),
                keyword search (BM25), and reranking for optimal relevance. Documents chunked with
                512-1024 token overlap for context preservation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
