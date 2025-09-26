import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  error: string | null;
}

export function usePdfProcessor() {
  const [state, setState] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    error: null,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, title }: { file: File; title: string }) => {
      setState({ isProcessing: true, progress: 0, error: null });

      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('title', title);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setState(prev => ({ 
          ...prev, 
          progress: Math.min(prev.progress + 10, 90) 
        }));
      }, 200);

      try {
        const response = await apiRequest('POST', '/api/documents/upload', formData);
        const data = await response.json();
        
        clearInterval(progressInterval);
        setState({ isProcessing: false, progress: 100, error: null });
        
        return data;
      } catch (error) {
        clearInterval(progressInterval);
        setState({ 
          isProcessing: false, 
          progress: 0, 
          error: error instanceof Error ? error.message : 'Upload failed' 
        });
        throw error;
      }
    },
  });

  const validateFile = useCallback((file: File): string | null => {
    if (file.type !== 'application/pdf') {
      return 'Please upload a PDF file';
    }
    
    if (file.size > 50 * 1024 * 1024) {
      return 'File size must be less than 50MB';
    }
    
    return null;
  }, []);

  return {
    ...state,
    uploadMutation,
    validateFile,
  };
}
