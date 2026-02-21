import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidV4 } from "uuid";
import { useDropzone } from "react-dropzone";
import type { FileRejection } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, FileMusic } from "lucide-react";
import { api } from "@/trpc/react";
import useProject from "@/hooks/use-project";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";

const MAX_FILES = 5;
const MAX_SIZE = 1024 * 1024 * 50; // 50 MB for audio files

const Uploader = () => {
  const { project } = useProject();

  const processMeeting = useMutation({
    mutationFn: async (data: {
      meetingUrl: string;
      meetingId: string;
      projectId: string;
    }) => {
      const { meetingUrl, meetingId, projectId } = data;
      const response = await axios.post("/api/process-meeting", {
        meetingUrl,
        meetingId,
        projectId,
      });

      return response.data;
    },
  });

  const router = useRouter();
  const [files, setFiles] = useState<
    Array<{
      id: string; // unique identifier
      file: File; // the file itself
      uploading: boolean; // is the file currently uploading
      progress: number; // upload progress in percentage
      key?: string; // key of the file for storage reference
      isDeleting: boolean; // is the file currently being deleted
      error: boolean; // has the file upload failed
      objectURL?: string; // object URL for previewing the file image while uploading to bucket s3
    }>
  >([]);

  const uploadMeeting = api.project.uploadMeeting.useMutation();

  async function removeFile(fileId: string) {
    try {
      // console.log("Removing file with ID:", fileId);

      // Find the file in files array which we have to remove

      const fileToRemove = files.find((f) => f.id === fileId);

      // if we got the file which we had to remove , before calling route handler, Revoke the object URL to free up memory or prevent memory leaks

      if (fileToRemove) {
        if (fileToRemove.objectURL) {
          URL.revokeObjectURL(fileToRemove.objectURL);
        }
      }

      // Set the file as deleting to show loading state

      setFiles((prevFiles) =>
        prevFiles.map((item) =>
          item.id === fileId ? { ...item, isDeleting: true } : item,
        ),
      );

      // Call the delete route handler to delete the file from S3 : This will delete the file from the S3 bucket (here we don't need progress tracking )

      const deleteFileResponse = await fetch("/api/s3/delete", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          key: fileToRemove?.key,
        }),
      });

      // Check if the delete request was successful
      if (!deleteFileResponse.ok) {
        toast.error("Failed to delete file");

        // Reset the file state to show error
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

      // Remove the file from the files array
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

  // where File is native file object from the web browser API

  async function uploadFile(file: File) {
    // console.log("Uploading file:", file);

    /*

    - prevFiles are all of items present in the files array and now we are updating the state of the files array to indicate that the individual file is currently being uploaded. 
    
    - This is done by finding the file in the array based on its reference and updating its uploading property.

    */

    setFiles((prev) =>
      prev.map((item) =>
        item.file === file ? { ...item, uploading: true } : item,
      ),
    );

    try {
      /*

      - POST request to the "/api/s3/upload" endpoint on the server.

      - The server will respond with a presigned URL that we can use to upload the file directly to S3.

      - The POST request includes a JSON body with the file's name, content type, and size.
      
      */

      const presignedUrlResponse = await fetch("/api/s3/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          // The file's name (e.g. "my_file.txt")
          fileName: file.name,
          // The file's content type (e.g. "text/plain")
          contentType: file.type,
          // The file's size in bytes
          size: file.size,
        }),
      });

      // Check if the response is ok
      if (!presignedUrlResponse.ok) {
        toast.error("Failed to get Presigned URL");

        // Reset the file state to indicate that the upload failed

        setFiles((prevFiles) =>
          prevFiles.map((item) =>
            item.file === file
              ? { ...item, uploading: false, progress: 0, error: true }
              : item,
          ),
        );

        return;
      }

      // Extract the presigned URL and key from the response

      const { presignedUrl, key } = await presignedUrlResponse.json();

      /*
      
      - Now we are using the presigned URL to upload the file directly to S3.

      - The presigned URL is a temporary URL that allows us to upload the file directly to S3 without going through our server.

      - We can say that easy POST req to fetch to the presigned URL, and let's upload the file directly to S3 bucket.
      
      - But fetch does not provide progress tracking for uploading file, it only provides for downloading file.
      
         - Solution 1. Using axios is a promise-based HTTP client for node.js and browsers that provides progress tracking for both uploading and downloading files.

           - But I cannot want to install external dependencies just to track upload progress.
      
      -------------------------------------------

      - Solution 2. Using XMLHttpRequest(XHR)
         
          - It is a built-in browser javascript API to create HTTP requests. 
          
          - It's method provides the ability to send network requests between the browser and a server.

          - It allows us to track the progress of the upload.

      -------------------------------------------

      XHR v/s Fetch

      - fetch  
         - newer part of modern JS
         - promise-based API
         - supports streaming
         - no upload progress events
         - Built in and simpler
         - Cleaner especially with async/await

      - XHR: 
          - Older , legacy API
          - Callback based
          - Limited streaming
          - Has download/upload progress events
          - More verbose API and error-prone
  
      */

      // Create a Promise-based wrapper for XMLHttpRequest : this allows us to use async/await similar syntax with XMLHttpRequest

      await new Promise<void>((resolve, reject) => {
        // intialize new XMLHttpRequest
        const xhr = new XMLHttpRequest();

        // event to track upload progress

        // onprogress callback exposes the event handler , this event fires periodically during the upload (or as we send data from client to server)

        // In this case , send our file to s3 bucket

        xhr.upload.onprogress = (event) => {
          // check if the event length is computable or not

          if (event.lengthComputable) {
            // calculate the percentage of the upload
            const percentageCompleted = (event.loaded / event.total) * 100;

            // update the progress of the file
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

        // event to track upload completion
        // onload event fires when the upload is complete

        xhr.onload = async () => {
          if (xhr.status == 200 || xhr.status == 204) {
            // notify to server

            console.log("Upload done, calling /api/audio/complete", {
              key,
              bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME,
              mimeType: file.type,
              size: file.size,
            });

            const res = await fetch("/api/audio/db/upload", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                key, // jo server ne diya tha
                mimeType: file.type,
                size: file.size,
              }),
            });

            console.log("complete api status:", res.status);

            const data = await res.json();
            console.log("complete api response:", data);

            const url = `https://audios.t3.storage.dev/${data.audioKey}`;

            if (!project) return;

            uploadMeeting.mutate(
              {
                projectId: project.id,
                meetingUrl: url,
                name: file.name,
              },
              {
                onSuccess: (meeting) => {
                  toast.success("Meeting uploaded successfully");
                  router.push("/meetings");

                  processMeeting.mutateAsync({
                    meetingUrl: url,
                    meetingId: meeting.id,
                    projectId: project.id,
                  });
                },
                onError: () => {
                  toast.error("Failed to upload meeting");
                },
              },
            );

            // update the file status , progress to 100% and set uploading to false

            setFiles((prevFiles) =>
              prevFiles.map((item) =>
                item.file === file
                  ? { ...item, progress: 100, uploading: false, error: false }
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

        // open the connection or intialize the request to s3 bucket with PUT method using the presigned URL

        xhr.open("PUT", presignedUrl);

        // set the content type of the request : we have to pass content type of the file because in putobjectCommand we are passing the content type

        xhr.setRequestHeader("Content-Type", file.type);

        // send the file to s3 bucket
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

  // Runs when files are ACCEPTED for accepting single or multiple files upload

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Handle accepted files
      // console.log(acceptedFiles);

      if (acceptedFiles.length > 0) {
        // Here we are adding the newly accepted files to the files state array.

        // For each file, we are creating a new object with properties for the file itself, the uploading status, progress, and more.

        setFiles((prevFiles) => [
          ...prevFiles, // Keep the existing files along with the newly accepted files

          ...acceptedFiles.map((file) => ({
            id: uuidV4(), // generate a simple unique id
            file: file,
            uploading: false, // Initially, the file is not uploading
            progress: 0, // Initially, the progress is 0
            isDeleting: false, // Initially, the file is not being deleted
            error: false, // Initially, there is no error
            objectURL: URL.createObjectURL(file), // Create a local blob URL for the file to actually display it in the user interface
          })),
        ]);
      }

      // benefit of objectUrl or creating a blob objectURL is that we won't re-render the image anymore

      // If we could rendering the image from the server, it would be re-rendered every time the component re-renders or progress changes

      acceptedFiles.forEach(uploadFile);
    },
    [uploadFile],
  );

  // Runs when files are REJECTED
  const onDropRejected = useCallback((rejectionFiles: FileRejection[]) => {
    // Handle file rejections

    if (rejectionFiles.length > 0) {
      rejectionFiles.forEach((rejectionFile) => {
        // Loop through each error for the rejected file

        // we want to have some sort of validation for the files

        rejectionFile.errors.forEach((error) => {
          // switch case based on error code

          switch (error.code) {
            case "file-too-large":
              toast.error("File size exceeds 5MB");
              break;

            case "file-invalid-type":
              toast.error("Only MP3, WAV, M4A, OGG audio files allowed");
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
    }
  }, []);

  /* 
  
  - useDropzone hook from react-dropzone exposes two main functions: getRootProps and getInputProps and isDragActive boolean
     
     - isDragActive is a boolean that indicates if the user is currently dragging a file

     - getRootProps returns the props to be spread on the root element

     - getInputProps returns the props to be spread on the input element

     - both functions are needed for the internal state system to work properly

  - Dropzone Property getters

     - The dropzone property getters are just two functions that return objects with properties  which we need to use to create the drag and drop zone

     - root properties can be applied to whatever element we want to make draggable but input properties should be applied to the input element

  - useDropzone hook exposes functions that rely on javascript bundle - so we have to mark component as use client

  -----------------------------------------------

  Step1. Create client side state to later on display the files

  Step2. Create route handler to generate presigned URL

  Step3. Call route handler to get our presigned URL

  Step4. Upload file using the presigned URL

  Step5. Showcases uploaded files 

  Step6. Allow user to delete files

  */

  /*
  
  - onDrop: Function to handle when files are dropped into our dropzone area , this could be one or multiple files (Array of files)

  - onDropRejected: Function to handle when files are rejected

  */

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected, // function to handle when files are rejected because of size, type, or count

    maxFiles: MAX_FILES, // maximum number of files allowed
    maxSize: MAX_SIZE, // maximum size of each file
    accept: {
      "audio/*": [".mp3", ".wav", ".m4a", ".ogg"], // allowed only to accept audio file types
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
            <FileMusic className="h-8 w-8 md:h-12 md:w-12" />
          </div>

          {/* If we are dragging files over the dropzone , then isDragActive will be true otherwise false */}

          {isDragActive ? (
            <p className="text-primary text-lg font-medium">
              Drop files to upload
            </p>
          ) : (
            <>
              <p className="text-base font-medium">Create a new meeting</p>

              <p className="text-muted-foreground text-sm">
                Analyse your meeting with CodeSense powered by AI.
              </p>

              <Button size="sm" className="mt-2 rounded-md px-6">
                Select Meeting
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="group bg-background relative overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="bg-muted relative flex h-36 items-center justify-center px-4">
              <audio
                controls
                src={file.objectURL}
                className="w-full max-w-full rounded-md"
              />

              <div className="pointer-events-none absolute inset-0 bg-black/30 opacity-0 transition group-hover:opacity-100" />

              <Button
                variant="destructive"
                size="icon"
                className="absolute top-3 right-3 h-8 w-8 opacity-0 transition group-hover:opacity-100"
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
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 backdrop-blur-sm">
                  <p className="text-sm font-medium text-white">
                    Uploading {file.progress}%
                  </p>
                  <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="bg-primary h-full transition-all"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5 p-4">
              <p className="truncate text-sm leading-tight font-medium">
                {file.file.name}
              </p>

              <div className="text-muted-foreground flex items-center justify-between text-xs">
                <span>{(file.file.size / 1024).toFixed(1)} KB</span>
                <span className="bg-muted rounded-full px-2 py-0.5 uppercase">
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

/*

We use pre-built library : react dropzone for drag and drop functionality which already styled and works well.

Simple React hook to create a HTML compliant drag and drop zone for files.

React dropzone provides us with a hook called useDropzone which we can use to handle the drag and drop functionality.


*/

/*

- The `useCallback` hook in React is used to memoize a function. 

- Memoization is the process of caching the result of a function call

   - so that it can be reused instead of recomputing it every time the function is called.

   - This can be useful when dealing with expensive computations

      - or when a function is used as a dependency in a dependency array for useEffect or useMemo.

- In the context of React, `useCallback` is often used to avoid unnecessary re-renders.

   - When a component re-renders, all of its functions are recreated 

      - which can cause unnecessary re-renders of child components if those functions are passed as props.

  - By using `useCallback`, we can ensure that the function is only recreated when its dependencies change, preventing unnecessary re-renders of child components.


     - The `useCallback` hook takes two arguments: the function to be memoized and an array of dependencies.

     - If the dependencies change, the function is recreated.

     - If the dependencies do not change, the memoized function is returned.

*/
