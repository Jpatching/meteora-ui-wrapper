'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, Button } from '@/components/ui';
import { parseConfigFile, validateConfig, detectProtocolType } from '@/lib/config/jsonc-parser';
import toast from 'react-hot-toast';

interface ConfigUploadProps {
  onConfigLoaded: (config: any) => void;
  expectedProtocol?: string;
  templateFile?: string; // Optional template filename (e.g., "dlmm-create-pool.example.jsonc")
}

export function ConfigUpload({ onConfigLoaded, expectedProtocol, templateFile }: ConfigUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.jsonc') && !file.name.endsWith('.json')) {
        toast.error('Please upload a .jsonc or .json file');
        return;
      }

      setUploading(true);
      const loadingToast = toast.loading('Parsing config file...');

      try {
        const config = await parseConfigFile(file);

        // Validate config
        const validation = validateConfig(config);
        if (!validation.valid) {
          toast.error(
            <div>
              <p className="font-semibold">Invalid config:</p>
              <ul className="text-sm mt-1">
                {validation.errors.map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
              </ul>
            </div>,
            { id: loadingToast, duration: 5000 }
          );
          return;
        }

        // Check protocol type
        const protocol = detectProtocolType(config);
        if (expectedProtocol && protocol !== expectedProtocol) {
          toast.error(
            `This appears to be a ${protocol || 'unknown'} config, but this form expects ${expectedProtocol}`,
            { id: loadingToast }
          );
          return;
        }

        // Success!
        toast.success(
          `Config loaded! ${protocol ? `Detected ${protocol.toUpperCase()} configuration` : ''}`,
          { id: loadingToast }
        );

        onConfigLoaded(config);
      } catch (error: any) {
        toast.error(error.message || 'Failed to parse config file', { id: loadingToast });
      } finally {
        setUploading(false);
      }
    },
    [onConfigLoaded, expectedProtocol]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  return (
    <Card className={isDragging ? 'border-primary/50 bg-primary/5' : ''}>
      <CardContent className="p-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}
          `}
        >
          <div className="space-y-4">
            <div className="text-4xl">📁</div>
            <div>
              <p className="text-lg font-semibold text-foreground mb-1">
                Upload Config File
              </p>
              <p className="text-sm text-foreground-muted">
                Drag & drop your .jsonc config file here, or click to browse
              </p>
            </div>

            <input
              id="config-upload"
              type="file"
              accept=".jsonc,.json"
              onChange={handleFileInput}
              className="hidden"
              disabled={uploading}
            />

            <div className="flex gap-3 justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('config-upload')?.click()}
                loading={uploading}
                disabled={uploading}
              >
                {uploading ? 'Processing...' : 'Browse Files'}
              </Button>

              {templateFile && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = `/config-templates/${templateFile}`;
                    link.download = templateFile;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast.success('Template downloaded!');
                  }}
                >
                  📥 Download Template
                </Button>
              )}
            </div>

            <div className="text-xs text-foreground-muted">
              <p>Accepted formats: .jsonc, .json</p>
              {templateFile && (
                <p className="mt-1 text-success">
                  💡 Download the template above to see an example config with all options
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
