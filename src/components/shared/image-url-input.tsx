"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ছবির URL টেক্সটএরিয়া + লোকাল ফাইল আপলোড বাটন — অ্যাডমিন ও সেলার ফর্মে শেয়ার্ড
export function ImageUrlInput({
  id,
  name,
  defaultValue,
  error,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  error?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "আপলোড ব্যর্থ হয়েছে");
      const ta = document.getElementById(id) as HTMLTextAreaElement | null;
      if (ta) {
        const current = ta.value.trim();
        ta.value = current ? `${current}\n${data.url}` : data.url;
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "আপলোড ব্যর্থ হয়েছে");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <Label htmlFor={id}>ছবির লিংক (প্রতি লাইনে একটি)</Label>
        <div className="flex items-center gap-2">
          {uploadError && <span className="text-xs text-destructive">{uploadError}</span>}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" />
            {uploading ? "আপলোড হচ্ছে..." : "ছবি আপলোড"}
          </Button>
        </div>
      </div>
      <Textarea
        id={id}
        name={name}
        rows={3}
        defaultValue={defaultValue}
        placeholder={"https://example.com/image1.jpg\nhttps://example.com/image2.jpg"}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
