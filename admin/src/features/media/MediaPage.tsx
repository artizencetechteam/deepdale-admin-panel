import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Upload, Terminal, ImageIcon, Music, Layout, FileText, CheckCircle2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "../../lib/cn";
import { Dropzone } from "../../components/ui/dropzone";
import { BackendErrorAlert } from "../../components/ui/backend-error-alert";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/empty-state";
import { Input } from "../../components/ui/field";
import { PageHeader } from "../../components/ui/page-header";
import { ReadOnlyBanner } from "../../components/ui/read-only-banner";
import { apiRequest, uploadMedia } from "../../lib/api-client";
import type { MediaAsset, MediaKind } from "../../lib/api-types";
import { useAuth } from "../../lib/auth-store";
import { getErrorMessage } from "../../lib/form-errors";
import { queryKeys } from "../../lib/query-keys";
import { canWriteContent } from "../../lib/role-utils";
import { useToast } from "../../components/ui/toast";

const mediaKinds: MediaKind[] = ["image", "audio", "svg", "document"];

const kindIcons = {
  image: ImageIcon,
  audio: Music,
  svg: Layout,
  document: FileText
};

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function MediaPage() {
  const { user, csrfToken } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = canWriteContent(user?.role);
  const [requestError, setRequestError] = useState<string>();
  const [uploadKind, setUploadKind] = useState<MediaKind>("image");
  const [filterKind, setFilterKind] = useState<MediaKind | "all">("all");
  const [file, setFile] = useState<File | null>(null);

  const mediaQuery = useQuery({
    queryKey: queryKeys.media,
    queryFn: () => apiRequest<MediaAsset[]>("/api/admin/media")
  });

  const assets = useMemo(() => {
    const items = mediaQuery.data ?? [];
    return filterKind === "all"
      ? items
      : items.filter((asset) => asset.kind === filterKind);
  }, [filterKind, mediaQuery.data]);

  const uploadMutation = useMutation({
    mutationFn: async (fileToUpload: File) => {
      if (!fileToUpload) throw new Error("Choose a file");
      if (!csrfToken) throw new Error("Missing CSRF token");
      return uploadMedia<MediaAsset>(fileToUpload, uploadKind, csrfToken);
    },
    onSuccess: async (asset: MediaAsset) => {
      setRequestError(undefined);
      setFile(null);
      setFilterKind(asset.kind);
      await queryClient.invalidateQueries({ queryKey: queryKeys.media });
      pushToast("Media uploaded");
    },
    onError: (error: unknown) => setRequestError(getErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/api/admin/media/${id}`, {
        method: "DELETE",
        csrfToken
      }),
    onSuccess: async () => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.media });
      pushToast("Media deleted");
    },
    onError: (error: unknown) => setRequestError(getErrorMessage(error))
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media Library"
        description="Upload reusable media assets, review recent uploads, and remove obsolete files."
      />
      {!canEdit ? <ReadOnlyBanner /> : null}
      <BackendErrorAlert message={requestError} />
      
      <Card className="p-0 overflow-hidden border-transparent bg-slate-50 shadow-none">
        <div className="grid lg:grid-cols-[1fr,350px]">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[color:var(--dd-text)]">Add to Library</h3>
              <div className="flex items-center gap-3">
                 <span className="text-sm font-medium text-[color:var(--dd-muted)] text-[11px] uppercase tracking-wider">Upload as:</span>
                 <div className="flex gap-1 p-1 rounded-xl bg-white border border-[color:var(--dd-border)]">
                    {mediaKinds.map(kind => (
                        <button
                            key={kind}
                            onClick={() => setUploadKind(kind)}
                            disabled={!canEdit}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                                uploadKind === kind 
                                    ? "bg-teal-600 text-white shadow-sm"
                                    : "text-[color:var(--dd-muted)] hover:bg-slate-50"
                            )}
                        >
                            {kind}
                        </button>
                    ))}
                 </div>
              </div>
            </div>

            <Dropzone 
                onFileDrop={(droppedFile) => {
                    setFile(droppedFile);
                    uploadMutation.mutate(droppedFile);
                }}
                disabled={!canEdit || uploadMutation.isPending}
                accept={uploadKind === 'image' ? 'image/*' : uploadKind === 'audio' ? 'audio/*' : uploadKind === 'svg' ? '.svg' : ''}
                maxSize={uploadKind === 'audio' ? 20 * 1024 * 1024 : 5 * 1024 * 1024}
                className="bg-white/60"
            />
            
            {uploadMutation.isPending && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-teal-50 border border-teal-100 animate-pulse">
                    <Terminal className="h-4 w-4 text-teal-600" />
                    <span className="text-sm font-semibold text-teal-700">Uploading...</span>
                </div>
            )}
          </div>

          <div className="p-6 border-l border-[color:var(--dd-border)] bg-white/40 space-y-6">
            <div className="space-y-1">
                <h3 className="text-sm font-bold text-[color:var(--dd-text)] uppercase tracking-widest text-[11px]">Quick filter</h3>
                <p className="text-xs text-[color:var(--dd-muted)]">Show only specific media types.</p>
            </div>
            
            <div className="space-y-2">
                <button
                    onClick={() => setFilterKind('all')}
                    className={cn(
                        "w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-sm font-semibold",
                        filterKind === 'all'
                            ? "bg-teal-50 border-teal-200 text-teal-700 shadow-sm"
                            : "bg-white border-[color:var(--dd-border)] text-[color:var(--dd-text)] hover:border-teal-200"
                    )}
                >
                    All assets
                    <div className="h-2 w-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
                </button>
                
                {mediaKinds.map(kind => {
                    const Icon = kindIcons[kind];
                    const isActive = filterKind === kind;
                    return (
                        <button
                            key={kind}
                            onClick={() => setFilterKind(kind)}
                            className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-sm font-semibold",
                                isActive
                                    ? "bg-teal-50 border-teal-200 text-teal-700 shadow-sm"
                                    : "bg-white border-[color:var(--dd-border)] text-[color:var(--dd-muted)] hover:border-teal-200 hover:text-[color:var(--dd-text)]"
                            )}
                        >
                            <Icon className={cn("h-4 w-4", isActive ? "text-teal-600" : "text-[color:var(--dd-muted)]")} />
                            {kind.charAt(0).toUpperCase() + kind.slice(1)}s
                        </button>
                    );
                })}
            </div>
          </div>
        </div>
      </Card>

      {assets.length === 0 ? (
        <EmptyState
          title="No media assets found"
          description="Upload the first file or change the active filter."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <Card key={asset.id} className="space-y-4 rounded-[2rem] p-5">
              <div className="group relative overflow-hidden rounded-[1.5rem] border border-[color:var(--dd-border)] bg-slate-50 shadow-inner">
                {asset.kind === "image" || asset.kind === "svg" ? (
                  <img
                    src={asset.publicUrl}
                    alt={asset.originalFilename}
                    className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : asset.kind === "audio" ? (
                  <div className="flex h-48 items-center justify-center p-6 bg-teal-50/30">
                     <div className="flex flex-col items-center gap-3">
                        <Music className="h-10 w-10 text-teal-600" />
                        <audio controls className="h-8 w-44" src={asset.publicUrl} />
                     </div>
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center bg-slate-100/50 p-6 text-center text-xs text-[color:var(--dd-muted)]">
                    <FileText className="h-8 w-8 mb-2 opacity-50" />
                    {asset.publicUrl}
                  </div>
                )}
                
                <div className="absolute top-2 right-2">
                   <div className="rounded-full bg-white/90 backdrop-blur-sm shadow-sm px-3 py-1 text-[10px] font-bold uppercase text-teal-800">
                     {asset.kind}
                   </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="font-bold text-[color:var(--dd-text)] truncate" title={asset.originalFilename}>
                    {asset.originalFilename}
                  </div>
                  <div className="text-[10px] font-medium text-[color:var(--dd-muted)] uppercase tracking-wider">
                    {formatBytes(asset.sizeBytes)} • {formatDate(asset.createdAt)}
                  </div>
                </div>

                <div className="relative group/input">
                    <Input value={asset.publicUrl} readOnly className="pr-12 text-xs h-10 rounded-xl" />
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(asset.publicUrl);
                            pushToast("URL copied to clipboard");
                        }}
                        className="absolute right-2 top-1.5 p-1 rounded-lg bg-slate-100 hover:bg-teal-600 hover:text-white transition-colors text-[color:var(--dd-muted)]"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                    </button>
                </div>

                {canEdit && (
                  <div className="flex justify-end pt-2 border-t border-[color:var(--dd-border)]/50">
                    <Button
                      variant="ghost"
                      className="h-9 px-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl"
                      onClick={() => {
                        if (confirm("Permanently delete this file?")) {
                            deleteMutation.mutate(asset.id);
                        }
                      }}
                      loading={deleteMutation.isPending}
                    >
                      {!deleteMutation.isPending && <Trash2 className="h-4 w-4 mr-2" />}
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
