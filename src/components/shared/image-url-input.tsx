"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

// ছবির URL ইনপুট + লোকাল ফাইল আপলোড বাটন — অ্যাডমিন ও সেলার ফর্মে শেয়ার্ড
// single=true হলে একটিমাত্র ছবি (যেমন ব্যানার), নাহলে প্রতি লাইনে একটি URL
export function ImageUrlInput({
  id,
  name,
  defaultValue,
  error,
  single = false,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  error?: string;
  single?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "আপলোড ব্যর্থ হয়েছে");
      const field = fieldRef.current;
      if (field) {
        if (single) {
          field.value = data.url;
        } else {
          const current = field.value.trim();
          field.value = current ? `${current}\n${data.url}` : data.url;
        }
        field.dispatchEvent(new Event("input", { bubbles: true }));
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
        <Label htmlFor={id}>
          {single ? "ছবির লিংক" : "ছবির লিংক (প্রতি লাইনে একটি)"}
        </Label>
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
      {single ? (
        <Input
          ref={fieldRef as React.Ref<HTMLInputElement>}
          id={id}
          name={name}
          defaultValue={defaultValue}
          placeholder="https://example.com/banner.jpg"
        />
      ) : (
        <Textarea
          ref={fieldRef as React.Ref<HTMLTextAreaElement>}
          id={id}
          name={name}
          rows={3}
          defaultValue={defaultValue}
          placeholder={"https://example.com/image1.jpg\nhttps://example.com/image2.jpg"}
        />
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
