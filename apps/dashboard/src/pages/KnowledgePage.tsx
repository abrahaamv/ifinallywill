/**
 * Knowledge Base Page (Priority 2)
 * File upload with automatic chunking and vector embeddings
 */

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@platform/ui';
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
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];

          if (!base64Data) {
            throw new Error('Failed to read file data');
          }

          setUploadProgress('Uploading and processing...');

          // Call upload mutation
          await uploadMutation.mutateAsync({
            title: uploadFormData.title,
            content: '', // Will be extracted from file
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

      reader.onerror = () => {
        setIsUploading(false);
        setUploadProgress('');
        setUploadError('Failed to read file');
      };

      reader.readAsDataURL(uploadFormData.file);
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

  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Knowledge Base</h1>
      </div>

      {/* Upload Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>
            Upload text files (.txt, .md, .json, .csv) to add to your knowledge base
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
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
                onChange={(e) => setUploadFormData({ ...uploadFormData, category: e.target.value })}
                disabled={isUploading}
              />
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
              <p className="text-xs text-gray-500">
                Supported formats: TXT, Markdown, JSON, CSV (max 10MB)
              </p>
            </div>

            {uploadProgress && (
              <div className="p-4 bg-blue-50 text-blue-800 rounded-md">{uploadProgress}</div>
            )}

            {uploadError && (
              <div className="p-4 bg-red-50 text-red-800 rounded-md">{uploadError}</div>
            )}

            {uploadSuccess && (
              <div className="p-4 bg-green-50 text-green-800 rounded-md">{uploadSuccess}</div>
            )}

            <Button type="submit" disabled={isUploading || !uploadFormData.file}>
              {isUploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Document Library */}
      <Card>
        <CardHeader>
          <CardTitle>Document Library</CardTitle>
          <CardDescription>
            {documentsData?.total || 0} document(s) in your knowledge base
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documentsData && documentsData.documents.length > 0 ? (
            <div className="space-y-4">
              {documentsData.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-md"
                >
                  <div className="flex-1">
                    <h3 className="font-medium">{doc.title}</h3>
                    {doc.category && <span className="text-sm text-gray-500">{doc.category}</span>}
                    <p className="text-xs text-gray-400 mt-1">
                      Created: {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">No documents uploaded yet</p>
              <p className="text-sm text-gray-500">Upload your first document to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
