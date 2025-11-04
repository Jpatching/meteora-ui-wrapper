'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  value: string | null;
  onChange: (uri: string) => void;
  onError?: (error: string) => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  onError,
}) => {
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [preview, setPreview] = useState<string | null>(value);
  const [uploadProgress, setUploadProgress] = useState<{
    originalSize: number;
    processedSize: number;
    compressed: boolean;
  } | null>(null);

  const uploadImage = async (file: File) => {
    setUploading(true);
    setCompressing(true);
    const loadingToast = toast.loading('Compressing and uploading image...');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/metadata/upload-image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setCompressing(false);
        onChange(result.uri);
        setPreview(URL.createObjectURL(file));
        setUploadProgress({
          originalSize: result.originalSize,
          processedSize: result.processedSize,
          compressed: result.compressed,
        });
        toast.success('Image uploaded successfully!', { id: loadingToast });
      } else {
        toast.error(result.error || 'Failed to upload image', { id: loadingToast });
        onError?.(result.error || 'Failed to upload image');
      }
    } catch (error: any) {
      toast.error('Upload failed: ' + error.message, { id: loadingToast });
      onError?.(error.message);
    } finally {
      setUploading(false);
      setCompressing(false);
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        uploadImage(acceptedFiles[0]);
      }
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    disabled: uploading,
  });

  const handleRemove = () => {
    setPreview(null);
    setUploadProgress(null);
    onChange('');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (preview && value) {
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-text-secondary">
          Token Image
        </label>
        <div className="relative">
          <div className="relative rounded-xl overflow-hidden border-2 border-border-light bg-bg-secondary">
            <img
              src={preview}
              alt="Token preview"
              className="w-full h-64 object-cover"
            />
            <div className="absolute top-2 right-2">
              <Button
                variant="danger"
                size="sm"
                onClick={handleRemove}
                className="shadow-lg"
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          </div>
          {uploadProgress && (
            <div className="mt-2 p-3 bg-bg-tertiary rounded-lg border border-border-light">
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-success" />
                <span className="text-text-primary">
                  {uploadProgress.compressed ? (
                    <>
                      Compressed from {formatFileSize(uploadProgress.originalSize)} to{' '}
                      {formatFileSize(uploadProgress.processedSize)}
                    </>
                  ) : (
                    <>Size: {formatFileSize(uploadProgress.originalSize)}</>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-text-secondary">
        Token Image <span className="text-error">*</span>
      </label>
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-8
          transition-all duration-200 cursor-pointer
          ${
            isDragActive
              ? 'border-primary bg-primary/10 scale-[1.02]'
              : 'border-border-light hover:border-primary/50 hover:bg-bg-tertiary'
          }
          ${uploading ? 'cursor-not-allowed opacity-60' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center text-center gap-4">
          {compressing ? (
            <>
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <div>
                <p className="text-base font-medium text-text-primary mb-1">
                  Compressing image...
                </p>
                <p className="text-sm text-text-secondary">
                  Optimizing your image for IPFS upload
                </p>
              </div>
            </>
          ) : uploading ? (
            <>
              <Upload className="h-12 w-12 text-primary animate-pulse" />
              <div>
                <p className="text-base font-medium text-text-primary mb-1">
                  Uploading to IPFS...
                </p>
                <p className="text-sm text-text-secondary">
                  Please wait while we upload your image
                </p>
              </div>
            </>
          ) : isDragActive ? (
            <>
              <ImageIcon className="h-12 w-12 text-primary" />
              <div>
                <p className="text-base font-medium text-text-primary mb-1">
                  Drop your image here
                </p>
                <p className="text-sm text-text-secondary">
                  Release to upload
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 rounded-full bg-bg-tertiary border border-border-light">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-base font-medium text-text-primary mb-1">
                  Drag & drop your token image here
                </p>
                <p className="text-sm text-text-secondary mb-2">
                  or click to browse
                </p>
                <p className="text-xs text-text-muted">
                  PNG, JPG, or WebP • Max 5MB • Auto-compressed if &gt;1MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      <p className="text-xs text-text-muted">
        Your image will be uploaded to IPFS via Lighthouse Storage and automatically
        compressed for optimal storage.
      </p>
    </div>
  );
};
