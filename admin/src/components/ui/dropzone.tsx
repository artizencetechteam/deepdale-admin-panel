import { cn } from "../../lib/cn";
import { Upload, X } from "lucide-react";
import { useCallback, useState } from "react";

type DropzoneProps = {
  onFileDrop: (file: File) => void;
  accept?: string;
  maxSize?: number | undefined; // in bytes
  disabled?: boolean;
  className?: string;
};

export function Dropzone({ onFileDrop, accept, maxSize, disabled, className }: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
      setError(null);

      if (disabled) return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        if (maxSize && file.size > maxSize) {
          setError(`File is too large (max ${Math.round(maxSize / 1024 / 1024)}MB)`);
          return;
        }
        onFileDrop(file);
      }
    },
    [disabled, maxSize, onFileDrop]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (maxSize && file.size > maxSize) {
        setError(`File is too large (max ${Math.round(maxSize / 1024 / 1024)}MB)`);
        return;
      }
      onFileDrop(file);
      e.target.value = ""; // Reset
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed p-8 transition-all duration-300",
          isDragActive
            ? "border-teal-600 bg-teal-50/50"
            : "border-[color:var(--dd-border)] bg-white/60 hover:bg-white/80",
          disabled && "cursor-not-allowed opacity-50",
          error && "border-rose-300 bg-rose-50/30"
        )}
      >
        <input
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={handleInputChange}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-600 mb-4">
          <Upload className="h-6 w-6" />
        </div>

        <div className="text-center">
            <p className="text-sm font-semibold text-[color:var(--dd-text)]">
                Drag and drop your file here
            </p>
            <p className="mt-1 text-xs text-[color:var(--dd-muted)]">
                Or click to browse from your device
            </p>
        </div>

        {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                <X className="h-3 w-3" />
                {error}
            </div>
        )}
      </div>
    </div>
  );
}
