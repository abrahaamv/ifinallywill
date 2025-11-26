/**
 * Knowledge Base Page - Complete Redesign
 * Library-style UI with upload, document cards, and multiple views
 * Supports multi-file upload with drag-and-drop
 */

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Progress,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@platform/ui';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Database,
  Eye,
  File,
  FileText,
  Loader2,
  Search,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { trpc } from '../utils/trpc';

interface FileWithMeta {
  file: File;
  title: string;
  category: string;
  status: 'pending' | 'reading' | 'uploading' | 'success' | 'error';
  error?: string;
  content?: string;
}

export function KnowledgePage() {
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Multi-file upload state
  const [multiFiles, setMultiFiles] = useState<FileWithMeta[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [defaultCategory, setDefaultCategory] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: documentsData,
    isLoading,
    error,
    refetch,
  } = trpc.knowledge.list.useQuery({
    limit: 50,
    offset: 0,
  });

  const {
    data: selectedDocument,
    isLoading: isLoadingDocument,
  } = trpc.knowledge.get.useQuery(
    { id: selectedDocId || '' },
    { enabled: !!selectedDocId }
  );

  const deleteMutation = trpc.knowledge.delete.useMutation({
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      setDeleteDocId(null);
      refetch();
    },
  });

  const batchUploadMutation = trpc.knowledge.uploadBatch.useMutation({
    onSuccess: () => {
      // Mark all files as success
      setMultiFiles((prev) =>
        prev.map((f) => ({ ...f, status: 'success' as const }))
      );
      setIsUploading(false);
      setUploadProgress(100);
      refetch();

      // Reset after delay
      setTimeout(() => {
        setMultiFiles([]);
        setUploadProgress(0);
        setShowUploadModal(false);
      }, 2000);
    },
    onError: (error) => {
      setMultiFiles((prev) =>
        prev.map((f) =>
          f.status === 'uploading'
            ? { ...f, status: 'error' as const, error: error.message }
            : f
        )
      );
      setIsUploading(false);
    },
  });

  const documents = documentsData?.documents || [];
  const totalCount = documentsData?.total || 0;

  const filteredDocuments = documents.filter(
    (doc) =>
      searchQuery === '' ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.category?.toLowerCase() ?? '').includes(searchQuery.toLowerCase())
  );

  // Multi-file upload helpers
  const getFileTitle = (fileName: string): string => {
    // Remove extension and convert to title case
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    return nameWithoutExt
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const isValidFileType = (file: File): boolean => {
    const validTypes = [
      'text/plain',
      'text/markdown',
      'text/md',
      'application/json',
      'text/csv',
    ];
    const validExtensions = ['.txt', '.md', '.json', '.csv', '.markdown'];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();

    return validTypes.includes(file.type) || validExtensions.includes(extension);
  };

  const addFiles = useCallback((files: FileList | File[]) => {
    const newFiles: FileWithMeta[] = [];

    for (const file of Array.from(files)) {
      // Skip if file already added
      if (multiFiles.some((f) => f.file.name === file.name && f.file.size === file.size)) {
        continue;
      }

      // Validate file type
      if (!isValidFileType(file)) {
        newFiles.push({
          file,
          title: getFileTitle(file.name),
          category: defaultCategory || 'general',
          status: 'error',
          error: 'Unsupported file type. Use TXT, MD, JSON, or CSV.',
        });
        continue;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        newFiles.push({
          file,
          title: getFileTitle(file.name),
          category: defaultCategory || 'general',
          status: 'error',
          error: 'File size must be less than 10MB',
        });
        continue;
      }

      newFiles.push({
        file,
        title: getFileTitle(file.name),
        category: defaultCategory || 'general',
        status: 'pending',
      });
    }

    setMultiFiles((prev) => [...prev, ...newFiles]);
  }, [multiFiles, defaultCategory]);

  const removeFile = (index: number) => {
    setMultiFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFileTitle = (index: number, title: string) => {
    setMultiFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, title } : f))
    );
  };

  const updateFileCategory = (index: number, category: string) => {
    setMultiFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, category } : f))
    );
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        addFiles(files);
      }
    },
    [addFiles]
  );

  const handleMultiFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
    // Reset input
    if (multiFileInputRef.current) {
      multiFileInputRef.current.value = '';
    }
  };

  // Batch upload handler
  const handleBatchUpload = async () => {
    const validFiles = multiFiles.filter((f) => f.status === 'pending');
    if (validFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Read all files
    const filesToUpload: Array<{
      title: string;
      content: string;
      category: string;
      fileName: string;
      fileType: string;
      fileSize: number;
    }> = [];

    // Mark files as reading
    setMultiFiles((prev) =>
      prev.map((f) =>
        f.status === 'pending' ? { ...f, status: 'reading' as const } : f
      )
    );

    try {
      for (let i = 0; i < validFiles.length; i++) {
        const fileMeta = validFiles[i];
        if (!fileMeta) continue;

        const content = await readFileAsText(fileMeta.file);

        filesToUpload.push({
          title: fileMeta.title,
          content,
          category: fileMeta.category || 'general',
          fileName: fileMeta.file.name,
          fileType: fileMeta.file.type || 'text/plain',
          fileSize: fileMeta.file.size,
        });

        setUploadProgress(Math.round(((i + 1) / validFiles.length) * 50));
      }

      // Mark files as uploading
      setMultiFiles((prev) =>
        prev.map((f) =>
          f.status === 'reading' ? { ...f, status: 'uploading' as const } : f
        )
      );

      // Upload batch
      await batchUploadMutation.mutateAsync({
        files: filesToUpload,
      });
    } catch (error) {
      console.error('Batch upload error:', error);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const getFileIcon = (status: FileWithMeta['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'reading':
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <File className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDocumentIcon = (category: string | null) => {
    const icons: Record<string, any> = {
      documentation: BookOpen,
      api: Database,
      guide: FileText,
      general: FileText,
    };
    return icons[category || ''] || FileText;
  };

  const handleViewDocument = (docId: string) => {
    setSelectedDocId(docId);
    setIsViewerOpen(true);
  };

  const handleDeleteClick = (docId: string) => {
    setDeleteDocId(docId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteDocId) return;
    await deleteMutation.mutateAsync({ id: deleteDocId });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Knowledge Base</h1>
          <p className="mt-2 text-muted-foreground">Manage documents for RAG-enhanced AI responses</p>
        </div>
        <Button onClick={() => setShowUploadModal(!showUploadModal)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </div>

      {/* Upload Form - Multi-file with Drag & Drop */}
      {showUploadModal && (
        <Card className="border shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upload Documents</CardTitle>
                <CardDescription>
                  Drag and drop files or click to select. Supports TXT, MD, JSON, CSV files.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowUploadModal(false);
                  setMultiFiles([]);
                  setUploadProgress(0);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Default Category */}
            <div className="space-y-2">
              <Label htmlFor="defaultCategory">Default Category (optional)</Label>
              <Input
                id="defaultCategory"
                value={defaultCategory}
                onChange={(e) => setDefaultCategory(e.target.value)}
                placeholder="e.g., documentation, faq, guide"
              />
            </div>

            {/* Drag & Drop Zone */}
            <div
              className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                isDragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={multiFileInputRef}
                type="file"
                multiple
                accept=".txt,.md,.json,.csv,.markdown"
                onChange={handleMultiFileSelect}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-primary">Click to upload</span> or drag and drop
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                TXT, MD, JSON, CSV (max 10MB each, up to 20 files)
              </p>
            </div>

            {/* File List */}
            {multiFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Files ({multiFiles.length})</Label>
                  {multiFiles.length > 1 && !isUploading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMultiFiles([])}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear all
                    </Button>
                  )}
                </div>

                <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-2">
                  {multiFiles.map((fileMeta, index) => (
                    <div
                      key={`${fileMeta.file.name}-${index}`}
                      className={`flex items-start gap-3 rounded-md p-2 ${
                        fileMeta.status === 'error' ? 'bg-red-50' : 'bg-gray-50'
                      }`}
                    >
                      <div className="mt-2">{getFileIcon(fileMeta.status)}</div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <Input
                          value={fileMeta.title}
                          onChange={(e) => updateFileTitle(index, e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Document title"
                          disabled={fileMeta.status !== 'pending'}
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            value={fileMeta.category}
                            onChange={(e) => updateFileCategory(index, e.target.value)}
                            className="h-7 flex-1 text-xs"
                            placeholder="Category"
                            disabled={fileMeta.status !== 'pending'}
                          />
                          <span className="text-xs text-muted-foreground">
                            {(fileMeta.file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        {fileMeta.error && (
                          <p className="text-xs text-red-500">{fileMeta.error}</p>
                        )}
                        {fileMeta.status === 'success' && (
                          <p className="text-xs text-green-500">Uploaded successfully</p>
                        )}
                      </div>
                      {fileMeta.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {uploadProgress < 50 ? 'Reading files...' : 'Uploading and processing...'}
                  </span>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleBatchUpload}
                disabled={isUploading || multiFiles.filter((f) => f.status === 'pending').length === 0}
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload {multiFiles.filter((f) => f.status === 'pending').length} File
                    {multiFiles.filter((f) => f.status === 'pending').length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowUploadModal(false);
                  setMultiFiles([]);
                  setUploadProgress(0);
                }}
                disabled={isUploading}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card className="border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
              <BookOpen className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">{isLoading ? '—' : totalCount}</p>
          </CardContent>
        </Card>

        <Card className="border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Total Chunks</p>
              <Database className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">
              {isLoading ? '—' : documents.reduce((sum, doc) => sum + (doc.chunkCount || 0), 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Embeddings</p>
              <Sparkles className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">
              {isLoading ? '—' : documents.reduce((sum, doc) => sum + (doc.chunkCount || 0), 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Library Interface */}
      <Card className="border shadow-card">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Library</CardTitle>
              <CardDescription className="mt-1">
                {filteredDocuments.length} of {totalCount} documents
              </CardDescription>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search contents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="recent" className="space-y-4">
            <TabsList>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="starred">Starred</TabsTrigger>
              <TabsTrigger value="all">All Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="recent" className="space-y-4">
              {error ? (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                  <AlertCircle className="h-5 w-5" />
                  <p>Failed to load documents: {error.message}</p>
                </div>
              ) : isLoading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-40" />
                  ))}
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="mb-4 h-16 w-16 text-gray-400" />
                  <p className="text-muted-foreground">No documents found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {searchQuery
                      ? 'Try a different search term'
                      : 'Upload your first document to get started'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredDocuments.slice(0, 6).map((doc) => {
                    const Icon = getDocumentIcon(doc.category);
                    return (
                      <Card
                        key={doc.id}
                        className="group cursor-pointer border shadow-sm transition-all hover:shadow-md"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                                <Icon className="h-5 w-5 text-primary-600" />
                              </div>
                              <div>
                                <CardTitle className="text-base">{doc.title}</CardTitle>
                                <CardDescription className="mt-1 text-xs">
                                  {doc.category}
                                </CardDescription>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Star className="h-4 w-4 text-gray-400" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-xs text-muted-foreground">
                            <div className="flex items-center justify-between">
                              <span>Chunks:</span>
                              <span className="font-medium">{doc.chunkCount || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Uploaded:</span>
                              <span className="font-medium">{formatDate(doc.createdAt)}</span>
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleViewDocument(doc.id)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(doc.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="starred">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Star className="mb-4 h-16 w-16 text-gray-400" />
                <p className="text-muted-foreground">No starred documents</p>
                <p className="mt-1 text-sm text-muted-foreground">Star documents to find them quickly</p>
              </div>
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredDocuments.map((doc) => {
                  const Icon = getDocumentIcon(doc.category);
                  return (
                    <Card
                      key={doc.id}
                      className="group cursor-pointer border shadow-sm transition-all hover:shadow-md"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                              <Icon className="h-5 w-5 text-primary-600" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{doc.title}</CardTitle>
                              <CardDescription className="mt-1 text-xs">
                                {doc.category}
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <div className="flex items-center justify-between">
                            <span>Chunks:</span>
                            <span className="font-medium">{doc.chunkCount || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Uploaded:</span>
                            <span className="font-medium">{formatDate(doc.createdAt)}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleViewDocument(doc.id)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(doc.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Document Viewer Modal */}
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedDocument?.title || 'Document'}
            </DialogTitle>
            <DialogDescription>
              {selectedDocument?.category} • Uploaded{' '}
              {selectedDocument?.createdAt && formatDate(selectedDocument.createdAt)}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {isLoadingDocument ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : selectedDocument?.content ? (
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-background p-4 rounded-lg">
                  {selectedDocument.content}
                </pre>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <AlertCircle className="mr-2 h-5 w-5" />
                No content available
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewerOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This action cannot be undone and will
              remove all associated chunks and embeddings.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
