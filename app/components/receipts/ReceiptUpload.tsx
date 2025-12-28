/**
 * ReceiptUpload Component
 * Handles image upload via file picker, camera, or drag-and-drop
 */

import { useState, useRef } from "react";
import { Form, useNavigation } from "react-router";
import { Upload, Camera, X, Image as ImageIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

interface ReceiptUploadProps {
  onUploadStart?: () => void;
  onUploadComplete?: (imageUrl: string, receiptId: string) => void;
  onError?: (error: string) => void;
}

export function ReceiptUpload({
  onUploadStart,
  onUploadComplete,
  onError,
}: ReceiptUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigation = useNavigation();
  const isUploading = navigation.state === "submitting";

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find((file) =>
      ["image/jpeg", "image/png", "image/heic"].includes(file.type)
    );

    if (!imageFile) {
      onError?.("Please drop a valid image file (JPEG, PNG, or HEIC)");
      return;
    }

    await uploadFile(imageFile);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handleCameraCapture = async () => {
    try {
      // Create file input with capture attribute for mobile camera
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "environment"; // Use rear camera

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          await uploadFile(file);
        }
      };

      input.click();
    } catch (error) {
      onError?.("Failed to access camera");
    }
  };

  const uploadFile = async (file: File) => {
    // Validate file size
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      onError?.("File size must be less than 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    onUploadStart?.();

    // Upload via form
    const formData = new FormData();
    formData.append("_action", "upload-file");
    formData.append("file", file);

    try {
      const response = await fetch("/action/upload-receipt", {
        method: "POST",
        body: formData,
      });

      const data = await response.json() as {
        success?: boolean;
        error?: string;
        imageUrl?: string;
        receiptId?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Upload failed");
      }

      if (data.imageUrl && data.receiptId) {
        onUploadComplete?.(data.imageUrl, data.receiptId);
      }
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : "Failed to upload receipt"
      );
      setPreview(null);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {!preview ? (
        <Card
          className={`border-2 border-dashed transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="flex flex-col items-center justify-center p-12 space-y-4">
            <ImageIcon className="w-16 h-16 text-muted-foreground" />

            <div className="text-center space-y-2">
              <p className="text-lg font-medium">
                Upload your receipt
              </p>
              <p className="text-sm text-muted-foreground">
                Drag and drop, or select from the options below
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="default"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Browse Files
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleCameraCapture}
                disabled={isUploading}
                className="gap-2"
              >
                <Camera className="w-4 h-4" />
                Camera
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/heic"
              onChange={handleFileSelect}
              className="hidden"
            />

            <p className="text-xs text-muted-foreground">
              Supported formats: JPEG, PNG, HEIC • Max size: 5MB
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background"
            onClick={clearPreview}
          >
            <X className="w-4 h-4" />
          </Button>

          <CardContent className="p-4">
            <img
              src={preview}
              alt="Receipt preview"
              className="w-full h-auto rounded-lg"
            />
          </CardContent>
        </Card>
      )}

      {isUploading && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Uploading receipt...
          </p>
        </div>
      )}
    </div>
  );
}
