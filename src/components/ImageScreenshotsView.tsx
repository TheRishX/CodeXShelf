import React, { useState, useEffect, useRef } from 'react';
import { 
  Clipboard, Image as ImageIcon, Trash2, Cloud, CheckCircle, AlertCircle, 
  Loader2, RefreshCw, Eye, ExternalLink, ShieldAlert, Folder, Download, Search
} from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { CustomUser } from '../types';

interface ImageScreenshotsViewProps {
  currentUser: CustomUser;
}

interface ScreenshotFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  size?: string;
  webViewLink?: string;
}

// In-memory static cache for the access token to persist during the session
// in accordance with the security best-practice of not storing OAuth keys in localStorage.
let cachedAccessToken: string | null = null;

export function ImageScreenshotsView({ currentUser }: ImageScreenshotsViewProps) {
  const [token, setToken] = useState<string | null>(cachedAccessToken);
  const [files, setFiles] = useState<ScreenshotFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Real-time local clipboard preview state
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<ScreenshotFile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Hidden file input ref for fallback upload selection
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Retrieve files from Google Drive using the cached session access token
  const fetchScreenshots = async (accessToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/drive/screenshots?username=${encodeURIComponent(currentUser.name || 'Rish')}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setFiles(result.files || []);
      } else {
        if (response.status === 401) {
          // Token expired or invalid
          setToken(null);
          cachedAccessToken = null;
          setError("Google connection has expired. Please re-authenticate below.");
        } else {
          setError(result.error || "Failed to list screenshots from Google Drive.");
        }
      }
    } catch (err: any) {
      console.error("Error fetching screenshots:", err);
      setError("Failed to communicate with the online backup server.");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch screenshots when token is established
  useEffect(() => {
    if (token) {
      fetchScreenshots(token);
    }
  }, [token]);

  // Handle Google OAuth re-authentication to retrieve a fresh Drive API scoped accessToken.
  // This executes Firebase signInWithPopup requesting the https://www.googleapis.com/auth/drive.file scope.
  const handleConnectGoogle = async () => {
    setIsAuthLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;
      if (accessToken) {
        cachedAccessToken = accessToken;
        setToken(accessToken);
      } else {
        setError("Could not extract a valid Google OAuth token from the sign-in response.");
      }
    } catch (err: any) {
      console.error("OAuth flow blocked or aborted:", err);
      setError(err.message || "Sign-in popup was blocked or closed before completing.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  /**
   * Clipboard Paste Event Handler
   * 
   * This is the core clipboard API integration. Under standard browser events, 
   * when a user pastes inside an active context block, we intercept the pasteboards event 
   * items list. If any file entry matches an image mime-type, we parse the item into a native
   * File blob and generate a lightweight local Object URL for immediate preview. 
   * We also read the file contents as base64 to execute our backend Google Drive upload proxy.
   */
  const processImageFile = async (file: File) => {
    setError(null);
    setPreviewFileName(file.name || `screenshot_${Date.now()}.png`);

    // Create instant local preview object URL
    const localUrl = URL.createObjectURL(file);
    setPreviewImage(localUrl);

    // Read the file as Base64 to transfer to server-side API proxy
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target?.result as string;
      if (!base64Data) return;

      if (!token) {
        setError("You must connect your Google Drive account first before syncing pasted images.");
        return;
      }

      setUploading(true);
      try {
        const uploadResponse = await fetch('/api/drive/screenshots', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: currentUser.name || 'Rish',
            name: file.name || `pasted_snapshot_${Date.now()}.png`,
            mimeType: file.type || 'image/png',
            base64Data: base64Data
          })
        });

        const uploadResult = await uploadResponse.json();
        if (uploadResult.success) {
          // Trigger hot fresh reload in the screenshots gallery list
          await fetchScreenshots(token);
          // Auto clear preview on successful upload
          setPreviewImage(null);
          setPreviewFileName('');
        } else {
          setError(uploadResult.error || "Failed to persist paste data to your Google Drive.");
        }
      } catch (err: any) {
        console.error("Paste upload failure:", err);
        setError("Communication error uploading snapshot payload to Server.");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Add a global paste window event listener when the component is focused
  useEffect(() => {
    const handleGlobalPaste = (event: ClipboardEvent) => {
      // Avoid intercepting clipboard pastes on input fields where typing occurs
      const activeElement = document.activeElement;
      if (activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.getAttribute('contenteditable') === 'true'
      )) {
        return;
      }

      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            processImageFile(file);
            break; // process the first pasted image
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [token, currentUser]);

  // Click & Drag Fallback Support
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFileList = e.target.files;
    if (selectedFileList && selectedFileList.length > 0) {
      processImageFile(selectedFileList[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      const firstFile = droppedFiles[0];
      if (firstFile.type.startsWith('image/')) {
        processImageFile(firstFile);
      } else {
        setError("Only valid image files are supported in this screenshots synchronization zone.");
      }
    }
  };

  /**
   * Delete Screenshot Handler
   * 
   * CRITICAL ACTION MANDATE: Because we are mutating/deleting user data, we must explicitly
   * prompt the user with a confirmation modal/dialog block before carrying out the destructive action.
   */
  const handleDeleteScreenshot = async (fileId: string, fileName: string) => {
    const isConfirmed = window.confirm(`Are you absolutely sure you want to permanently delete this screenshot "${fileName}" from your Google Drive folder? This action cannot be undone.`);
    if (!isConfirmed) return;

    if (!token) {
      setError("Credentials have expired. Please re-authenticate first.");
      return;
    }

    setLoading(true);
    try {
      const deleteResponse = await fetch(`/api/drive/screenshots/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const deleteResult = await deleteResponse.json();
      if (deleteResult.success) {
        setFiles(prev => prev.filter(f => f.id !== fileId));
        if (selectedFile?.id === fileId) {
          setSelectedFile(null);
        }
      } else {
        setError(deleteResult.error || "Failed to remove the target file from Google Drive.");
      }
    } catch (err: any) {
      console.error("Delete call failure:", err);
      setError("An error occurred trying to remove your online screenshot backup.");
    } finally {
      setLoading(false);
    }
  };

  // Human-readable size converter
  const formatBytes = (bytesStr?: string | number) => {
    if (!bytesStr) return 'Unknown size';
    const bytes = Number(bytesStr);
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filtering list by simple search query
  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in">
      
      {/* Upper header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold font-sans tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Cloud className="w-8 h-8 text-violet-500" />
            Image Screenshots Sync
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-sans">
            Paste screenshots anywhere on this screen to instantly upload and synch from your dedicated <span className="font-semibold text-slate-800 dark:text-slate-200">"{currentUser.name || 'Rish'} Screenshots Notes"</span> folder on Google Drive.
          </p>
        </div>

        {token && (
          <div className="flex items-center gap-3.5">
            <button 
              onClick={() => fetchScreenshots(token)}
              disabled={loading}
              className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-350 transition-all border border-slate-200 dark:border-slate-800 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-extrabold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Drive Connected
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl flex items-start gap-3.5 text-slate-700 dark:text-slate-300">
          <AlertCircle className="w-5.5 h-5.5 text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-extrabold text-slate-900 dark:text-white">Notice / Operational Warning:</span> {error}
          </div>
        </div>
      )}

      {/* Main layout: Clipboard Drop Zone */}
      {!token ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-md max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-950/30 text-violet-650 dark:text-violet-400 mb-2">
            <Folder className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Connect to Google Drive</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              To write screenshots, create folders, and sync files automatically, we require authentication with your Google Account under local secure scope permissions.
            </p>
          </div>

          <button
            onClick={handleConnectGoogle}
            disabled={isAuthLoading}
            className="gsi-material-button text-slate-900 dark:text-white inline-flex items-center justify-center cursor-pointer transition-all hover:scale-[1.02] shadow-md border border-slate-200 dark:border-slate-800 rounded-xl"
          >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents font-semibold">{isAuthLoading ? "Authorizing Security..." : "Authorize with Google Account"}</span>
            </div>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Drag/Drop paste capture center - Takes 1 column on desktops */}
          <div className="lg:col-span-1 space-y-6">
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="group border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-violet-500/80 dark:hover:border-violet-500/80 rounded-2xl p-8 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all text-center cursor-pointer flex flex-col items-center justify-center min-h-[340px] relative overflow-hidden"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              {/* Glowing decorative circles */}
              <div className="absolute -top-16 -left-16 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-colors pointer-events-none" />
              <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />

              {uploading ? (
                <div className="flex flex-col items-center gap-4 animate-pulse">
                  <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
                  <div className="space-y-1">
                    <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Syncing with Google Drive...</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-sans">Uploading Base64 picture block streams</p>
                  </div>
                </div>
              ) : previewImage ? (
                <div className="space-y-4 w-full h-full relative z-10">
                  <p className="text-xs font-mono font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">Screenshot Captured!</p>
                  <div className="aspect-video w-full rounded-xl border border-slate-200 dark:border-slate-850 overflow-hidden bg-slate-50 dark:bg-slate-950 relative flex items-center justify-center shadow-inner">
                    <img 
                      src={previewImage} 
                      alt="Local pasteboard capture" 
                      className="max-h-52 w-auto object-contain object-center rounded"
                    />
                  </div>
                  <div className="text-xs font-mono truncate text-slate-500 dark:text-slate-450 px-2 mt-2">
                    {previewFileName}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 relative z-10 py-4">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-50 dark:bg-violet-955/20 text-violet-600 dark:text-violet-400 shadow-sm border border-violet-100 dark:border-violet-900/30">
                    <Clipboard className="w-6 h-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                      Press <kbd className="font-mono bg-slate-100 dark:bg-slate-800 border border-slate-205 dark:border-slate-700 px-1.5 py-0.5 rounded text-xs">Ctrl + V</kbd> to Paste
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                      Click inside this card or hit paste anywhere on this page to upload an image from your clipboard instantly. Or drag-and-drop / select a file.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Instruction Panel */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl space-y-3.5">
              <h4 className="text-xs font-mono uppercase tracking-wider font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                Active recall workflow loop
              </h4>
              <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2 list-disc list-inside bg-transparent p-0">
                <li>Capture web errors or conceptual code listings.</li>
                <li>Press <span className="font-bold">Ctrl+V / Cmd+V</span> to sync instantly.</li>
                <li>Everything is backed up chronologically to your GDrive.</li>
                <li>Requires <span className="font-mono text-[11px] text-violet-600 dark:text-violet-400 font-bold whitespace-nowrap">drive.file</span> isolation security.</li>
              </ul>
            </div>
          </div>

          {/* Right section: Gallery listing - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Search and counters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="w-4.5 h-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input 
                  type="text"
                  placeholder="Filter by file name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9.5 pr-4 py-2.5 outline-none focus:border-violet-500/80 transition-all font-sans text-slate-700 dark:text-slate-200"
                />
              </div>

              <span className="text-xs text-slate-450 font-mono">
                Showing {filteredFiles.length} of {files.length} screenshots
              </span>
            </div>

            {/* Files List / Gallery Grid */}
            {loading ? (
              <div className="flex flex-col items-center justify-center p-20 space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                <p className="text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">Fetching Drive Archives...</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center p-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No synchronized screenshots found</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                    {searchQuery ? "No files match your custom filter term." : "Paste a picture block or select a file to establish your chronological backup notes database!"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredFiles.map((file) => {
                  // Connect image elements to our backend secure image streaming proxy route, passing the accessToken!
                  const imageSrc = `/api/drive/file/${file.id}?token=${encodeURIComponent(token)}`;

                  return (
                    <div 
                      key={file.id}
                      className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col"
                    >
                      {/* Image Preview Window */}
                      <div 
                        onClick={() => setSelectedFile(file)}
                        className="aspect-video w-full bg-slate-50 dark:bg-slate-950 relative overflow-hidden flex items-center justify-center cursor-zoom-in border-b border-slate-100 dark:border-slate-850"
                      >
                        <img 
                          src={imageSrc} 
                          alt={file.name} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                          <Eye className="w-6 h-6 text-white drop-shadow-md" />
                        </div>
                      </div>

                      {/* Info & Action bar */}
                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold font-sans text-slate-800 dark:text-slate-200 truncate pr-5" title={file.name}>
                            {file.name}
                          </h4>
                          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                            <span>{new Date(file.createdTime).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{formatBytes(file.size)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-3">
                          <a 
                            href={imageSrc} 
                            download={file.name}
                            className="inline-flex items-center gap-1.5 text-[10px] font-mono hover:text-violet-600 dark:hover:text-violet-400 text-slate-505 transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </a>

                          <div className="flex items-center gap-2">
                            {file.webViewLink && (
                              <a 
                                href={file.webViewLink} 
                                target="_blank" 
                                rel="noreferrer"
                                className="p-1 px-1.5 rounded bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 font-mono text-[10px] text-slate-500 dark:text-slate-400 transition-colors inline-flex items-center gap-1"
                                title="Open in Google Drive"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Drive
                              </a>
                            )}

                            <button 
                              onClick={() => handleDeleteScreenshot(file.id, file.name)}
                              className="p-1 rounded bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 transition-colors border border-red-100 dark:border-red-900/30 cursor-pointer"
                              title="Delete screenshot from Drive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full-view Zoom Preview Modal */}
      {selectedFile && token && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedFile(null)}
        >
          <div 
            className="bg-slate-900 dark:bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header bar */}
            <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="truncate pr-4">
                <span className="text-xs font-mono text-slate-400 block mb-0.5">SCREENS SYNC DETAIL</span>
                <span className="font-sans font-extrabold block text-sm truncate">{selectedFile.name}</span>
              </div>
              <button 
                onClick={() => setSelectedFile(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white transition-colors cursor-pointer"
              >
                Close (ESC)
              </button>
            </div>

            {/* Picture block */}
            <div className="bg-slate-950 overflow-auto p-4 flex items-center justify-center min-h-[400px] max-h-[70vh]">
              <img 
                src={`/api/drive/file/${selectedFile.id}?token=${encodeURIComponent(token)}`} 
                alt={selectedFile.name} 
                referrerPolicy="no-referrer"
                className="max-h-full max-w-full rounded object-contain cursor-default"
              />
            </div>

            {/* Control stats line */}
            <div className="p-4 bg-slate-950/85 border-t border-slate-800 flex flex-wrap gap-4 items-center justify-between text-[11px] font-mono text-slate-400">
              <div className="flex gap-4">
                <span>DATE: {new Date(selectedFile.createdTime).toLocaleString()}</span>
                <span>SIZE: {formatBytes(selectedFile.size)}</span>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href={`/api/drive/file/${selectedFile.id}?token=${encodeURIComponent(token)}`} 
                  download={selectedFile.name}
                  className="p-2 px-3 bg-violet-600 hover:bg-violet-500 rounded-lg text-white font-bold transition-all transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download File
                </a>
                <button 
                  onClick={() => {
                    handleDeleteScreenshot(selectedFile.id, selectedFile.name);
                  }}
                  className="p-2 px-3 bg-red-950/40 hover:bg-red-950/70 text-red-400 border border-red-900/40 rounded-lg font-bold transition-colors"
                >
                  Delete Archival
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
