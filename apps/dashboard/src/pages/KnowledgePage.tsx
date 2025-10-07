/**
 * Knowledge Base Page
 * Manage document uploads and RAG configuration
 */

import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@platform/ui';

export function KnowledgePage() {
  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Knowledge Base</h1>
        <Button>Upload Documents</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document Library</CardTitle>
          <CardDescription>Manage your uploaded documents and knowledge sources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">No documents uploaded yet</p>
            <Button variant="outline">Get Started</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
