import { CheckCircle2, Music, ImageIcon, Layout, FileText, Terminal, Upload, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

import { apiRequest, uploadMedia } from "../../lib/api-client";
import type { MediaAsset, MediaKind } from "../../lib/api-types";
import { useAuth } from "../../lib/auth-store";
import { queryKeys } from "../../lib/query-keys";
import { getErrorMessage } from "../../lib/form-errors";
import { canWriteContent } from "../../lib/role-utils";
import { useToast } from "../../components/ui/toast";
import { Button } from "./button";
import { FormField, Select } from "./field";
import { Dropzone } from "./dropzone";

interface MediaFieldProps {
  label: string;
  hint?: string;
  value: string | undefined;
  onChange: (value: string) => void;
  kind?: MediaKind;
  disabled?: boolean;
  maxSize?: number;
}

export function MediaField({ 
  label, 
  hint, 
  value, 
  onChange, 
  kind = "image",
  disabled,
  maxSize
}: MediaFieldProps) {
  const { user, csrfToken } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = canWriteContent(user?.role);
  const [requestError, setRequestError] = useState<string>();

  const mediaQuery = useQuery({
    queryKey: queryKeys.media,
    queryFn: () => apiRequest<MediaAsset[]>("/api/admin/media")
  });

  const assets = useMemo(() => {
    const items = mediaQuery.data ?? [];
    return items.filter((asset) => asset.kind === kind);
  }, [kind, mediaQuery.data]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!file) throw new Error("Choose a file");
      if (maxSize && file.size > maxSize) {
        throw new Error(`File is too large (max ${Math.round(maxSize / 1024 / 1024)}MB)`);
      }
      if (!csrfToken) throw new Error("Missing CSRF token");
      return uploadMedia<MediaAsset>(file, kind, csrfToken);
    },
    onSuccess: async (asset) => {
      setRequestError(undefined);
      onChange(asset.publicUrl);
      await queryClient.invalidateQueries({ queryKey: queryKeys.media });
      pushToast("Media uploaded");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) uploadMutation.mutate(file);
  };

  const deferredValue = useDeferredValue(value);

  return (
    <div className="flex flex-col gap-4">
      <FormField label={label} hint={hint} error={requestError} />
      
      {value ? (
        <div className="group relative overflow-hidden rounded-[2rem] border border-[color:var(--dd-border)] bg-slate-50 shadow-inner">
          {kind === "image" || kind === "svg" ? (
            <img src={value} alt={label} className="!h-80 w-full object-contain transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="flex h-80 items-center justify-center p-6 text-center">
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-[color:var(--dd-border)]">
                <span className="text-xs font-mono break-all text-[color:var(--dd-muted)]">{value}</span>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center pointer-events-none">
            <span className="text-white text-xs font-bold uppercase tracking-widest">Active Asset</span>
          </div>
        </div>
      ) : (
        <Dropzone
          onFileDrop={(file) => uploadMutation.mutate(file)}
          accept={kind === 'image' ? 'image/*' : kind === 'audio' ? 'audio/*' : kind === 'svg' ? '.svg' : ''}
          maxSize={maxSize}
          disabled={disabled || uploadMutation.isPending}
          className="bg-slate-50/50"
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[1fr,240px] gap-3">
        <Select
          value={deferredValue ?? ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled || assets.length === 0}
          className="rounded-[1.4rem]"
        >
          <option value="">Choose from library...</option>
          {assets.slice(0, 15).map((asset) => (
            <option key={asset.id} value={asset.publicUrl}>
              {asset.originalFilename}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          <label className="flex-1">
            <input
              type="file"
              className="hidden"
              disabled={disabled || uploadMutation.isPending}
              onChange={handleUpload}
            />
            <Button variant="secondary" type="button" disabled={disabled || uploadMutation.isPending} className="w-full rounded-[1.4rem]">
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </label>
          {value && (
            <Button
              variant="secondary"
              type="button"
              onClick={() => onChange('')}
              className="rounded-[1.4rem] px-3 text-rose-600 hover:text-rose-700"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {uploadMutation.isPending && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-teal-50 border border-teal-100 animate-pulse">
          <Terminal className="h-4 w-4 text-teal-600" />
          <span className="text-sm font-semibold text-teal-700">Uploading...</span>
        </div>
      )}
    </div>
  );
}
