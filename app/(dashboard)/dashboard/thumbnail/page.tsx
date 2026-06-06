"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Download, Image as ImageIcon, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const EXAMPLES = [
  "A dramatic tech tutorial thumbnail about AI automation, neon desk setup, bold empty space for title",
  "Fitness transformation thumbnail, energetic gym lighting, surprised expression, before-and-after composition",
  "Pakistani food vlog thumbnail for spicy biryani, rich colors, steam, cinematic close-up",
];

type ThumbnailResponse = {
  imageUrl?: string;
  error?: string;
  details?: string;
};

export default function ThumbnailPage() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const generateThumbnail = async () => {
    if (!prompt.trim()) {
      toast.error("Prompt is required");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const responseText = await res.text();
      let data: ThumbnailResponse | null = null;

      try {
        data = responseText ? JSON.parse(responseText) as ThumbnailResponse : null;
      } catch {
        data = responseText ? { error: responseText } : null;
      }

      if (!res.ok) {
        throw new Error(data?.error || `Thumbnail generation failed (${res.status})`);
      }

      if (!data?.imageUrl) {
        throw new Error("Gemini did not return an image");
      }

      setImageUrl(data.imageUrl);
      toast.success("Thumbnail generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate thumbnail");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadThumbnail = () => {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = "gemini-thumbnail.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
      <Card className="bg-white/5 border-white/10 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            Gemini Thumbnail Creator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Prompt</label>
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe the thumbnail style, subject, colors, mood, and text space..."
              className="min-h-40 resize-none bg-black/40 border-white/10 text-white"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-300">Quick ideas</p>
            <div className="space-y-2">
              {EXAMPLES.map((example) => (
                <Button
                  key={example}
                  type="button"
                  variant="outline"
                  className="h-auto w-full justify-start whitespace-normal border-white/20 px-3 py-2 text-left text-xs leading-5 text-gray-300 hover:bg-white/10"
                  onClick={() => setPrompt(example)}
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white"
            onClick={generateThumbnail}
            disabled={isGenerating}
          >
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
            Generate Thumbnail
          </Button>
        </CardContent>
      </Card>

      <Card className="min-h-[520px] bg-[#13131a] border-white/10 text-white">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">Preview</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-white/20 text-white hover:bg-white/10"
            onClick={downloadThumbnail}
            disabled={!imageUrl}
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-md border border-white/10 bg-black/40">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Generated thumbnail" className="h-full w-full object-cover" />
            ) : (
              <div className="max-w-sm px-6 text-center">
                <ImageIcon className="mx-auto h-12 w-12 text-cyan-400" />
                <p className="mt-4 text-sm leading-6 text-gray-400">
                  Your Gemini-generated 16:9 thumbnail will appear here.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
