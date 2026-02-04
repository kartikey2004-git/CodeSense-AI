import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidV4 } from "uuid";
import { useDropzone } from "react-dropzone";
import type { FileRejection } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Loader2, Trash2, Upload } from "lucide-react";

const MAX_FILES = 5;
const MAX_SIZE = 1024 * 1024 * 5; // 5MB

const Uploader = () => {
  const [files, setFiles] = useState<
    Array<{
      id: string; // unique identifier
      file: File; // the actual file
      uploading: boolean; // is the file currently uploading
      progress: number; // upload progress in percentage
      key?: string; // key of the file for storage reference
      isDeleting?: boolean; // is the file currently being deleted
      error: boolean; // did an error occur during upload
      objectURL: string; // URL for previewing the file
    }>
  >([]);

  async function removeFile(fileId: string) {
    try {
      const fileToRemove = files.find((f) => f.id === fileId);

      if (fileToRemove) {
        if (fileToRemove.objectURL) {
          URL.revokeObjectURL(fileToRemove.objectURL);
        }
      }

      setFiles((prevFiles) =>
        prevFiles.map((item) =>
          item.id === fileId ? { ...item, isDeleting: true } : item,
        ),
      );

      const deleteFileResponse = await fetch("/api/s3/delete", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          key: fileToRemove?.key,
        }),
      });

      if (!deleteFileResponse.ok) {
        toast.error("Failed to delete file");

        setFiles((prevFiles) =>
          prevFiles.map((item) =>
            item.id === fileId
              ? { ...item, isDeleting: false, error: true }
              : item,
          ),
        );

        return;
      }

      toast.success("File deleted successfully");

      setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId));
    } catch (error) {
      toast.error("Failed to delete file");
      setFiles((prevFiles) =>
        prevFiles.map((item) =>
          item.id === fileId
            ? { ...item, isDeleting: false, error: true }
            : item,
        ),
      );
    }
  }

  async function uploadFile(file: File) {
    console.log("Uploading file:", file);

    setFiles((prev) =>
      prev.map((item) =>
        item.file === file ? { ...item, uploading: true } : item,
      ),
    );

    try {
      const presignedUrlResponse = await fetch("/api/s3/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      if (!presignedUrlResponse.ok) {
        toast.error("Failed to get Presigned URL");

        setFiles((prevFiles) =>
          prevFiles.map((item) =>
            item.file === file
              ? { ...item, uploading: false, progress: 0, error: true }
              : item,
          ),
        );

        return;
      }

      const { presignedUrl, key } = await presignedUrlResponse.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentageCompleted = (event.loaded / event.total) * 100;

            setFiles((prevFiles) =>
              prevFiles.map((item) =>
                item.file === file
                  ? {
                      ...item,
                      progress: Math.round(percentageCompleted),
                      key: key,
                    }
                  : item,
              ),
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status == 200 || xhr.status == 204) {
            setFiles((prevFiles) =>
              prevFiles.map((item) =>
                item.file === file
                  ? { ...item, progress: 100, uploading: false, error: true }
                  : item,
              ),
            );

            toast.success("File uploaded successfully");

            resolve();
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Upload failed"));
        };

        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
    } catch (error) {
      toast.error("Upload Failed");

      setFiles((prevFiles) =>
        prevFiles.map((item) =>
          item.file === file
            ? { ...item, uploading: false, progress: 0, error: true }
            : item,
        ),
      );
    }
  }

  // Runs when files are ACCEPTED
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Handle accepted files
    // console.log(acceptedFiles);

    if (acceptedFiles.length > 0) {
      setFiles((prevFiles) => [
        ...prevFiles,
        ...acceptedFiles.map((file) => ({
          id: uuidV4(), // generate a simple unique id
          file: file,
          uploading: false,
          progress: 0,
          isDeleting: false,
          error: false,
          objectURL: URL.createObjectURL(file),
        })),
      ]);
    }

    acceptedFiles.forEach(uploadFile);
  }, []);

  // Runs when files are REJECTED
  const onDropRejected = useCallback((rejectionFiles: FileRejection[]) => {
    // Handle file rejections

    rejectionFiles.forEach((rejectionFile) => {
      // Loop through each error for the rejected file

      rejectionFile.errors.forEach((error) => {
        // switch case based on error code

        switch (error.code) {
          case "file-too-large":
            toast.error("File size exceeds 5MB");
            break;

          case "file-invalid-type":
            toast.error("Only JPG, PNG , JPEG images allowed");
            break;

          case "too-many-files":
            toast.error(`Only up to ${MAX_FILES} files allowed.`);
            break;

          default:
            toast.error("File upload error");
            break;
        }
      });
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    maxFiles: 5,
    maxSize: MAX_SIZE,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg"],
    },
  });

  return (
    <>
      <Card
        {...getRootProps()}
        className={cn(
          "relative h-64 w-full cursor-pointer border-2 border-dashed transition-colors duration-200 ease-in-out",
          isDragActive
            ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30"
            : "border-gray-300",
        )}
      >
        <CardContent className="flex h-full flex-col items-center justify-center text-center">
          <input {...getInputProps()} />

          <div
            className={cn(
              "text-primary mt-10 flex h-12 w-12 items-center justify-center rounded-full transition",
              isDragActive && "scale-110",
            )}
          >
            <Upload className="h-8 w-8 md:h-12 md:w-12" />
          </div>

          {isDragActive ? (
            <p className="text-primary text-lg font-medium">
              Drop files to upload
            </p>
          ) : (
            <>
              <p className="text-base font-medium">
                Drag & drop your files here
              </p>

              <p className="text-muted-foreground text-sm">
                or click to browse from your device
              </p>

              <Button size="sm" className="mt-2 rounded-md px-6">
                Select Files
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {files.map((file) => (
          <div
            key={file.id}
            className="group bg-background relative overflow-hidden rounded-lg border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="bg-muted relative aspect-[4/3]">
              <Image
                src={file.objectURL}
                alt={file.file.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-black/40 opacity-0 transition group-hover:opacity-100" />

              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 opacity-0 transition group-hover:opacity-100"
                onClick={() => removeFile(file.id)}
                disabled={file.uploading || file.isDeleting}
              >
                {file.isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>

              {file.uploading && !file.isDeleting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm">
                  <div className="text-lg font-semibold text-white">
                    {file.progress}%
                  </div>
                  <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="bg-primary h-full transition-all"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1 p-3">
              <p className="truncate text-sm font-medium">{file.file.name}</p>

              <div className="text-muted-foreground flex items-center justify-between text-xs">
                <span>{(file.file.size / 1024).toFixed(1)} KB</span>
                <span className="uppercase">
                  {file.file.type.split("/")[1]}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default Uploader;
