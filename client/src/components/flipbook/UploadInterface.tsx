import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, BookOpen, Smartphone, Settings } from "lucide-react";

export default function UploadInterface() {
  const [, setLocation] = useLocation();
  const [dragActive, setDragActive] = useState(false);
  const [title, setTitle] = useState("");
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async ({ file, title }: { file: File; title: string }) => {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('title', title);
      
      const response = await apiRequest('POST', '/api/documents/upload', formData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "PDF uploaded and processed successfully",
      });
      setLocation(`/document/${data.document.id}`);
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload PDF",
        variant: "destructive",
      });
    },
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleFileUpload = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a PDF smaller than 50MB",
        variant: "destructive",
      });
      return;
    }

    const defaultTitle = file.name.replace('.pdf', '');
    if (!title) {
      setTitle(defaultTitle);
    }

    uploadMutation.mutate({ file, title: title || defaultTitle });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 
              className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
              data-testid="app-title"
            >
              FlipBook Pro
            </h1>
            <p className="text-muted-foreground text-lg">
              Transform your PDFs into interactive flipbooks with realistic page-turning animations
            </p>
          </div>

          <div className="mb-8">
            <div className="mb-4">
              <Label htmlFor="title">Document Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter document title"
                className="mt-1"
                data-testid="input-title"
              />
            </div>

            <div
              className={`upload-zone ${dragActive ? 'drag-over' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              data-testid="upload-zone"
            >
              <div className="mb-4">
                <Upload className="w-16 h-16 text-muted-foreground mb-4 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Upload Your PDF</h3>
              <p className="text-muted-foreground mb-4">
                Drag and drop your PDF file here, or click to browse
              </p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileInput}
                className="hidden"
                id="file-input"
                data-testid="input-file"
              />
              <Button 
                asChild
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={uploadMutation.isPending}
                data-testid="button-choose-file"
              >
                <label htmlFor="file-input" className="cursor-pointer">
                  {uploadMutation.isPending ? "Processing..." : "Choose File"}
                </label>
              </Button>
              <p className="text-sm text-muted-foreground mt-3">
                Supports PDF files up to 50MB
              </p>
            </div>
          </div>

          {uploadMutation.isPending && (
            <div className="text-center py-12">
              <div className="loading-spinner mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold mb-2">Processing Your PDF</h3>
              <p className="text-muted-foreground">
                Converting pages and generating flipbook...
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <BookOpen className="w-8 h-8 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">Realistic Page Turns</h3>
                <p className="text-muted-foreground text-sm">
                  Experience smooth 3D page-turning animations that mimic real books
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <Smartphone className="w-8 h-8 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">Responsive Design</h3>
                <p className="text-muted-foreground text-sm">
                  Optimized for desktop, tablet, and mobile devices
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <Settings className="w-8 h-8 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">Advanced Controls</h3>
                <p className="text-muted-foreground text-sm">
                  Zoom, thumbnails, autoplay, sound effects, and more
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
