/**
 * Knowledge Base Page - Complete Redesign
 * Library-style UI with upload, document cards, and multiple views
 * Inspired by Library interface design
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
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@platform/ui';
import {
  AlertCircle,
  BookOpen,
  Database,
  Eye,
  FileText,
  Search,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const uploadMutation = trpc.knowledge.upload.useMutation({
    onSuccess: () => {
      setIsUploading(false);
      setUploadFormData({ title: '', category: '', file: null });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setShowUploadModal(false);
      refetch();
    },
    onError: () => {
      setIsUploading(false);
    },
  });

  const deleteMutation = trpc.knowledge.delete.useMutation({
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      setDeleteDocId(null);
      refetch();
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFormData({ ...uploadFormData, file });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFormData.file || !uploadFormData.title) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      await uploadMutation.mutateAsync({
        title: uploadFormData.title,
        content,
        category: uploadFormData.category || 'general',
      });
    };
    reader.readAsText(uploadFormData.file);
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

      {/* Upload Form */}
      {showUploadModal && (
        <Card className="border shadow-card">
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
            <CardDescription>
              Add new documents to your knowledge base for AI training
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Document Title</Label>
                <Input
                  id="title"
                  value={uploadFormData.title}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, title: e.target.value })}
                  placeholder="e.g., API Documentation v2.0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={uploadFormData.category}
                  onChange={(e) =>
                    setUploadFormData({ ...uploadFormData, category: e.target.value })
                  }
                  placeholder="e.g., documentation, api, guide"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">File</Label>
                <Input
                  id="file"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".txt,.md,.pdf,.doc,.docx"
                  required
                />
                <p className="text-xs text-muted-foreground">Supported: TXT, MD, PDF, DOC, DOCX</p>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
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
