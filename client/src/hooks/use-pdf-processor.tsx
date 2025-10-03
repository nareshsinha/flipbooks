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
      console.log('Starting upload process...');
      setState({ isProcessing: true, progress: 0, error: null });

      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('title', title);
      
      console.log('FormData created:', {
        file: file.name,
        title: title,
        formDataHasFile: formData.has('pdf')
      });

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setState(prev => ({ 
          ...prev, 
          progress: Math.min(prev.progress + 10, 90) 
        }));
      }, 200);

      try {
        console.log('Sending API request...');

        //const response = await apiRequest('POST', '/api/documents/upload', formData);
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
          // headers are automatically set by browser for FormData
        });
        console.log('Response status:', response.status);  
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
          throw new Error(errorData.message || `Upload failed with status ${response.status}`);
        }

        const data = await response.json();
        clearInterval(progressInterval);
        setState({ isProcessing: false, progress: 100, error: null });
        return data;
      } 
      catch (error) 
      {
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

  const reset = useCallback(() => {
    setState({ isProcessing: false, progress: 0, error: null });
  }, []);

  return {
    ...state,
    uploadMutation,
    validateFile,
    reset
  };
}
