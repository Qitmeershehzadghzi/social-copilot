"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Crop, Eraser, Hash, Minimize2, Pencil, Sparkles, CalendarIcon, Loader2, Send, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { getPlatformConfig, getStrictestPlatformLimit } from "@/lib/platforms";
import { useRouter, useSearchParams } from "next/navigation";

type ConnectedAccount = {
  id: string;
  platform: string;
  accountName?: string;
  accountHandle?: string | null;
};

type UploadedMedia = {
  id: string;
  url: string;
  type: "image" | "video";
  size?: number;
  width?: number | null;
  height?: number | null;
};

type PostDetail = {
  id: string;
  content: string;
  status: "draft" | "scheduled" | "published" | "failed";
  scheduledAt: string | null;
  scheduledEndAt: string | null;
  targets: Array<{ platform: string }>;
  mediaAssets: UploadedMedia[];
};

type TransformOption = {
  id: string;
  label: string;
  description: string;
  transform: string;
  icon: React.ComponentType<{ className?: string }>;
  needsPrompt?: boolean;
  needsSize?: boolean;
};

const AI_TRANSFORM_OPTIONS: TransformOption[] = [
  {
    id: "bgremove",
    label: "Remove BG",
    description: "Remove image background with ImageKit AI.",
    transform: "e-bgremove",
    icon: Eraser,
  },
  {
    id: "removedotbg",
    label: "Precise BG",
    description: "Higher quality background removal.",
    transform: "e-removedotbg",
    icon: Sparkles,
  },
  {
    id: "upscale",
    label: "Upscale",
    description: "Increase image resolution.",
    transform: "e-upscale",
    icon: Sparkles,
  },
  {
    id: "changebg",
    label: "Change BG",
    description: "Replace background from a prompt.",
    transform: "e-changebg",
    icon: Wand2,
    needsPrompt: true,
  },
  {
    id: "edit",
    label: "AI Edit",
    description: "Edit the image from a prompt.",
    transform: "e-edit",
    icon: Pencil,
    needsPrompt: true,
  },
  {
    id: "genfill",
    label: "Gen Fill",
    description: "Extend image edges to a new size.",
    transform: "bg-genfill",
    icon: Crop,
    needsPrompt: true,
    needsSize: true,
  },
];

function encodePromptForImageKit(prompt: string) {
  const bytes = new TextEncoder().encode(prompt);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function CreatePostPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const [imageKitConfig, setImageKitConfig] = useState<{ publicKey?: string; urlEndpoint?: string }>({});
  const imageKitPublicKey = imageKitConfig.publicKey;
  const imageKitUrlEndpoint = imageKitConfig.urlEndpoint;
  const hasImageKitConfig = Boolean(imageKitPublicKey && imageKitUrlEndpoint);

  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Media editor state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMedia, setEditingMedia] = useState<UploadedMedia | null>(null);
  const [selectedTransformId, setSelectedTransformId] = useState(AI_TRANSFORM_OPTIONS[0].id);
  const [promptInput, setPromptInput] = useState("");
  const [transformInput, setTransformInput] = useState("");
  const [genFillWidth, setGenFillWidth] = useState("1080");
  const [genFillHeight, setGenFillHeight] = useState("1080");
  const [isApplyingTransform, setIsApplyingTransform] = useState(false);

  // Post state (simplified)
  const [isPostNow, setIsPostNow] = useState(true);
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [scheduledEndTime, setScheduledEndTime] = useState("09:30");
  const [postId, setPostId] = useState<string | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load accounts');
    }
  }, []);

  const formatTimeInput = useCallback((date: Date) => {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }, []);

  const combineScheduledDateTime = useCallback((date: Date | undefined, time: string) => {
    if (!date) return null;
    const [hours = "0", minutes = "0"] = time.split(":");
    const combined = new Date(date);
    combined.setHours(Number(hours), Number(minutes), 0, 0);
    if (Number.isNaN(combined.getTime())) return null;
    return combined;
  }, []);

  const buildSchedulePayload = useCallback(() => {
    if (isPostNow || !scheduledAt) {
      return { scheduledAt: null, scheduledEndAt: null };
    }

    const start = combineScheduledDateTime(scheduledAt, scheduledTime);
    const end = combineScheduledDateTime(scheduledAt, scheduledEndTime);

    if (!start || !end || end <= start) {
      throw new Error("Please select a valid schedule start and end time");
    }

    return {
      scheduledAt: start.toISOString(),
      scheduledEndAt: end.toISOString(),
    };
  }, [combineScheduledDateTime, isPostNow, scheduledAt, scheduledEndTime, scheduledTime]);

  const applyLoadedPost = useCallback((post: PostDetail) => {
    setPostId(post.id);
    setContent(post.content);
    setSelectedPlatforms(post.targets.map((target) => target.platform));
    setUploadedMedia(post.mediaAssets || []);

    if (post.scheduledAt) {
      const start = new Date(post.scheduledAt);
      const end = post.scheduledEndAt ? new Date(post.scheduledEndAt) : new Date(start.getTime() + 30 * 60_000);
      setIsPostNow(false);
      setScheduledAt(start);
      setScheduledTime(formatTimeInput(start));
      setScheduledEndTime(formatTimeInput(end));
    } else {
      setIsPostNow(post.status !== "draft");
      setScheduledAt(undefined);
    }
  }, [formatTimeInput]);

  useEffect(() => {
    void Promise.resolve().then(fetchAccounts);
  }, [fetchAccounts]);

  useEffect(() => {
    const queryPostId = searchParams.get("postId");
    const queryDate = searchParams.get("date");

    if (queryDate && !queryPostId) {
      const parsed = new Date(queryDate);
      if (!Number.isNaN(parsed.getTime())) {
        const timeoutId = window.setTimeout(() => {
          setIsPostNow(false);
          setScheduledAt(parsed);
          setScheduledTime(formatTimeInput(parsed));
          setScheduledEndTime(formatTimeInput(new Date(parsed.getTime() + 30 * 60_000)));
        }, 0);

        return () => window.clearTimeout(timeoutId);
      }
    }

    if (!queryPostId || queryPostId === postId) return;

    const loadPost = async () => {
      setIsLoadingPost(true);
      try {
        const res = await fetch(`/api/posts/${queryPostId}`, { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const post = await res.json() as PostDetail;
        applyLoadedPost(post);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load post");
      } finally {
        setIsLoadingPost(false);
      }
    };

    void loadPost();
  }, [applyLoadedPost, formatTimeInput, postId, searchParams]);

  useEffect(() => {
    const loadImageKitConfig = async () => {
      try {
        const res = await fetch('/api/media/config');
        if (!res.ok) return;
        const data = await res.json();
        if (data.publicKey && data.urlEndpoint) setImageKitConfig({ publicKey: data.publicKey, urlEndpoint: data.urlEndpoint });
      } catch (err) {
        console.error(err);
      }
    };
    void loadImageKitConfig();
  }, []);

  const uploadMedia = async (file: File) => {
    setIsUploadingMedia(true);
    try {
      const aRes = await fetch('/api/media/auth', { method: 'GET' });
      if (!aRes.ok) throw new Error('Failed to get upload auth');
      const authData = await aRes.json();
      if (!imageKitPublicKey || !imageKitUrlEndpoint) throw new Error('ImageKit not configured');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);
      formData.append('publicKey', imageKitPublicKey);
      formData.append('signature', authData.signature);
      formData.append('expire', String(authData.expire));
      formData.append('token', authData.token);
      formData.append('useUniqueFileName', 'true');
      formData.append('urlEndpoint', imageKitUrlEndpoint);

      const uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error(`ImageKit upload failed: ${uploadRes.status}`);
      const uploadData = await uploadRes.json();

      const saveRes = await fetch('/api/media/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: uploadData.fileId, url: uploadData.url, type: file.type.startsWith('video') ? 'video' : 'image', size: uploadData.size || file.size, width: uploadData.width, height: uploadData.height })
      });
      if (!saveRes.ok) throw new Error('Failed to save uploaded media');
      const saved = await saveRes.json() as UploadedMedia;
      setUploadedMedia((cur) => [...cur, saved]);
      toast.success('Media uploaded');
    } catch (err) {
      console.error(err);
      toast.error('Upload failed');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleMediaFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadMedia(file);
    e.target.value = '';
  };

  const openMediaPicker = () => mediaInputRef.current?.click();

  const applyTransformToMedia = async (media: UploadedMedia, transform: string) => {
    if (media.type !== 'image') {
      toast.error('AI transformations are available for images only');
      return null;
    }
    setIsApplyingTransform(true);
    try {
      const res = await fetch('/api/media/transform', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mediaId: media.id, transform }) });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json() as UploadedMedia;
      setUploadedMedia((cur) => cur.map(m => m.id === updated.id ? updated : m));
      setEditingMedia(updated);
      toast.success('Transformation applied');
      return updated;
    } catch (err) {
      console.error(err);
      toast.error('Failed to apply transform');
      return null;
    } finally {
      setIsApplyingTransform(false);
    }
  };

  const buildSelectedTransform = () => {
    const selected = AI_TRANSFORM_OPTIONS.find((option) => option.id === selectedTransformId) ?? AI_TRANSFORM_OPTIONS[0];
    const prompt = promptInput.trim();

    if (selected.needsPrompt && !prompt) {
      toast.error('Enter a prompt for this transformation');
      return null;
    }

    if (selected.id === 'changebg') {
      return `${selected.transform}-prompte-${encodePromptForImageKit(prompt)}`;
    }

    if (selected.id === 'edit') {
      return `${selected.transform}-prompte-${encodePromptForImageKit(prompt)}`;
    }

    if (selected.id === 'genfill') {
      const width = Number(genFillWidth);
      const height = Number(genFillHeight);
      if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
        toast.error('Enter a valid width and height');
        return null;
      }

      const promptPart = prompt ? `-prompte-${encodePromptForImageKit(prompt)}` : '';
      return `${selected.transform}${promptPart},w-${width},h-${height},cm-pad_resize`;
    }

    return selected.transform;
  };

  const openMediaEditor = (media: UploadedMedia) => {
    if (media.type !== 'image') {
      toast.error('Image editing is available for uploaded images only');
      return;
    }

    setEditingMedia(media);
    setSelectedTransformId(AI_TRANSFORM_OPTIONS[0].id);
    setPromptInput('');
    setTransformInput('');
    setEditDialogOpen(true);
  };

  const handleMediaDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    await uploadMedia(file);
  };

  const removeUploadedMedia = async (id: string) => {
    try {
      const res = await fetch(`/api/media/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove media');
      setUploadedMedia((cur) => cur.filter(m => m.id !== id));
      toast.success('Media removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove media');
    }
  };

  const togglePlatform = (p: string) => setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);



  const saveDraft = useCallback(async () => {
    try {
      const schedule = buildSchedulePayload();
      const payload = {
        content,
        platforms: selectedPlatforms,
        mediaAssetIds: uploadedMedia.map((media) => media.id),
        scheduledAt: schedule.scheduledAt,
        scheduledEndAt: schedule.scheduledEndAt,
        status: 'draft'
      };

      if (postId) {
        await fetch(`/api/posts/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          setPostId(data.id);
        }
      }
      toast.success('Draft saved');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Auto-save failed';
      console.error('Auto-save failed', e);
      toast.error(message);
    }
  }, [buildSchedulePayload, content, postId, selectedPlatforms, uploadedMedia]);

  useEffect(() => {
    if (content.length > 0 || selectedPlatforms.length > 0) {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        saveDraft();
      }, 30000);
    }
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    }
  }, [content, selectedPlatforms, scheduledAt, isPostNow, saveDraft]);

  const runAIContentAction = async (action: "generate" | "improve" | "shorten" | "hashtags") => {
    const sourceText = action === "generate" ? aiPrompt : content;
    if (!sourceText.trim()) return;

    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: sourceText, platforms: selectedPlatforms, action })
      });
      if (res.ok) {
        const data = await res.json();
        setContent(data.text);
        setAiModalOpen(false);
      } else {
        toast.error('AI generation failed');
      }
    } catch {
      toast.error('Error connecting to AI');
    } finally {
      setIsGenerating(false);
    }
  };

  const publishPost = async () => {
    if (content.trim() === '') {
      toast.error('Post content cannot be empty');
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error('Select at least one platform');
      return;
    }
    if (selectedPlatforms.includes('youtube') && uploadedMedia.length === 0) {
      toast.error('YouTube requires a video upload before publishing.');
      return;
    }

    try {
      const schedule = buildSchedulePayload();
      const payload = {
        content,
        platforms: selectedPlatforms,
        mediaAssetIds: uploadedMedia.map((media) => media.id),
        scheduledAt: schedule.scheduledAt,
        scheduledEndAt: schedule.scheduledEndAt,
        status: schedule.scheduledAt ? 'scheduled' : 'published'
      };

      console.log('[CREATE_POST] Publishing with payload:', payload);

      const url = postId ? `/api/posts/${postId}` : '/api/posts';
      const method = postId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('[CREATE_POST] API Response status:', res.status);

      if (res.ok) {
        console.log('[CREATE_POST] Post saved successfully');
        toast.success(isPostNow ? 'Post publishing started!' : 'Post scheduled!');
        setContent('');
        setSelectedPlatforms([]);
        setUploadedMedia([]);
        setPostId(null);
        if (!isPostNow) {
          router.push('/dashboard/calendar');
        }
      } else {
        const errText = await res.text();
        console.error('[CREATE_POST] API Error:', errText);
        toast.error(`Failed to publish: ${errText}`);
      }
    } catch (error) {
      console.error('[CREATE_POST] Exception:', error);
      toast.error(error instanceof Error ? error.message : 'Error publishing post');
    }
  };

  const getStrictestLimit = () => {
    return getStrictestPlatformLimit(selectedPlatforms);
  };

  const strictLimit = getStrictestLimit();
  const charCount = content.length;
  const isWarning = charCount > strictLimit * 0.9 && charCount <= strictLimit;
  const isError = charCount > strictLimit;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-8rem)]">
      <div className="flex flex-col space-y-6 overflow-y-auto pr-2 pb-10">
        {isLoadingPost && (
          <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm text-cyan-100">
            Loading post for editing...
          </div>
        )}
        <div>
          <h3 className="text-sm font-medium text-white mb-3">Select Platforms</h3>
          {accounts.length === 0 ? (
            <p className="text-sm text-gray-400">
              No accounts connected. <a href="/dashboard/accounts" className="text-cyan-400 hover:underline">Connect accounts</a>
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {accounts.map(acc => (
                <Button
                  key={acc.id}
                  variant={selectedPlatforms.includes(acc.platform) ? "default" : "outline"}
                  className={selectedPlatforms.includes(acc.platform) 
                    ? "bg-gradient-to-r from-purple-600 to-cyan-500 text-white border-0" 
                    : "border-white/20 text-gray-300 hover:bg-white/10"}
                  onClick={() => togglePlatform(acc.platform)}
                  size="sm"
                >
                  {getPlatformConfig(acc.platform)?.shortName || acc.platform}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium text-white">Content</h3>
          <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="secondary" className="bg-purple-500/20 text-purple-300 hover:bg-purple-500/30">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate with AI
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#13131a] border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>Generate Post with AI</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input 
                  placeholder="E.g., Write an engaging post about our new product launch..." 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="bg-black/50 border-white/10 text-white"
                />
                <Button 
                  className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white"
                  onClick={() => runAIContentAction("generate")}
                  disabled={isGenerating || !aiPrompt}
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Generate
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
            onClick={() => runAIContentAction("improve")}
            disabled={isGenerating || !content.trim()}
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Improve
          </Button>
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
            onClick={() => runAIContentAction("shorten")}
            disabled={isGenerating || !content.trim()}
          >
            <Minimize2 className="mr-2 h-4 w-4" />
            Shorten
          </Button>
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
            onClick={() => runAIContentAction("hashtags")}
            disabled={isGenerating || !content.trim()}
          >
            <Hash className="mr-2 h-4 w-4" />
            Hashtags
          </Button>
        </div>

        <div className="relative">
          <Textarea 
            placeholder="What do you want to share?"
            className={`min-h-[200px] bg-[#13131a] border-white/10 text-white resize-none ${isError ? 'border-red-500 focus-visible:ring-red-500' : isWarning ? 'border-orange-500 focus-visible:ring-orange-500' : ''}`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className={`absolute bottom-3 right-3 text-xs ${isError ? 'text-red-500 font-bold' : isWarning ? 'text-orange-400' : 'text-gray-400'}`}>
            {charCount} / {strictLimit}
          </div>
        </div>

        <div
          className="border border-dashed border-white/20 rounded-lg p-6 flex flex-col items-center justify-center bg-white/5"
          onDrop={handleMediaDrop}
          onDragOver={(event) => event.preventDefault()}
        >
          <p className="text-sm text-gray-400 mb-2">Drag and drop media here</p>
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 text-gray-300"
            onClick={openMediaPicker}
            disabled={!hasImageKitConfig || isUploadingMedia}
          >
            {isUploadingMedia ? 'Uploading...' : 'Browse Files'}
          </Button>
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleMediaFileChange}
          />
          <p className="text-xs text-gray-500 mt-2">
            {hasImageKitConfig
              ? 'Images and videos will be attached to this post'
              : 'ImageKit env vars missing - upload disabled'}
          </p>
        </div>

        {uploadedMedia.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {uploadedMedia.map((media) => (
              <div key={media.id} className="group relative aspect-square overflow-hidden rounded-md border border-white/10 bg-black/30">
                {media.type === 'video' ? (
                  <video src={media.url} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={media.url} alt="Uploaded media preview" className="h-full w-full object-cover" />
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute right-2 top-2 h-7 w-7 bg-black/70 text-white hover:bg-black"
                  onClick={() => removeUploadedMedia(media.id)}
                  aria-label="Remove uploaded media"
                >
                  <X className="h-4 w-4" />
                </Button>
                {media.type === 'image' && (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute right-2 top-10 h-7 w-7 bg-black/70 text-white hover:bg-black"
                    onClick={() => openMediaEditor(media)}
                    aria-label="Edit uploaded media"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditingMedia(null); }}>
          <DialogContent className="bg-[#13131a] border-white/10 text-white max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit Media (ImageKit AI Transformations)</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {editingMedia && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-black/20 p-2 rounded flex items-center justify-center min-h-[300px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={editingMedia.url} alt="Editing preview" className="w-full max-h-[400px] object-contain" />
                  </div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-2">AI Transformations</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {AI_TRANSFORM_OPTIONS.map((option) => {
                          const Icon = option.icon;
                          const selected = selectedTransformId === option.id;

                          return (
                            <Button
                              key={option.id}
                              type="button"
                              variant={selected ? "default" : "outline"}
                              size="sm"
                              className={selected ? "justify-start text-xs" : "border-white/20 text-xs justify-start"}
                              onClick={() => setSelectedTransformId(option.id)}
                              title={option.description}
                            >
                              <Icon className="mr-2 h-4 w-4" />
                              {option.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    {AI_TRANSFORM_OPTIONS.find((option) => option.id === selectedTransformId)?.needsPrompt && (
                      <div>
                        <label className="text-sm text-gray-300">Prompt</label>
                        <Input
                          value={promptInput}
                          onChange={(event) => setPromptInput(event.target.value)}
                          placeholder="e.g. warm studio background"
                          className="mt-2 bg-black/20 border-white/10 text-white"
                        />
                      </div>
                    )}

                    {AI_TRANSFORM_OPTIONS.find((option) => option.id === selectedTransformId)?.needsSize && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm text-gray-300">Width</label>
                          <Input
                            value={genFillWidth}
                            onChange={(event) => setGenFillWidth(event.target.value)}
                            inputMode="numeric"
                            className="mt-2 bg-black/20 border-white/10 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-300">Height</label>
                          <Input
                            value={genFillHeight}
                            onChange={(event) => setGenFillHeight(event.target.value)}
                            inputMode="numeric"
                            className="mt-2 bg-black/20 border-white/10 text-white"
                          />
                        </div>
                      </div>
                    )}

                    <Button
                      type="button"
                      disabled={isApplyingTransform}
                      onClick={async () => {
                        const transform = buildSelectedTransform();
                        if (!transform) return;
                        await applyTransformToMedia(editingMedia, transform);
                      }}
                    >
                      {isApplyingTransform ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      Apply Transformation
                    </Button>

                    <div className="mt-4">
                      <label className="text-sm text-gray-300">Custom Transformation string</label>
                      <Input
                        value={transformInput}
                        onChange={(event) => setTransformInput(event.target.value)}
                        placeholder="e.g. w-800,h-600,rt-90"
                        className="mt-2 bg-black/20 border-white/10 text-white"
                      />
                      <p className="text-xs text-gray-400 mt-2">Use ImageKit syntax, for example: w-800,h-600,rt-90</p>

                      <div className="mt-4 flex gap-2">
                        <Button
                          type="button"
                          disabled={isApplyingTransform}
                          onClick={async () => {
                            if (!transformInput.trim()) return toast.error('Enter a transformation string');
                            const updated = await applyTransformToMedia(editingMedia, transformInput.trim());
                            if (updated) setTransformInput('');
                          }}
                        >
                          Apply Custom
                        </Button>
                        <Button type="button" variant="outline" onClick={() => { setEditDialogOpen(false); setEditingMedia(null); }}>Done</Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <div className="bg-[#13131a] border border-white/10 rounded-lg p-4 space-y-4">
          <div className="flex gap-4">
            <Button 
              variant={isPostNow ? "default" : "outline"} 
              className={isPostNow ? "bg-white/10 text-white border-0 flex-1" : "border-white/20 text-gray-400 hover:text-white flex-1"}
              onClick={() => setIsPostNow(true)}
            >
              Post Now
            </Button>
            <Button 
              variant={!isPostNow ? "default" : "outline"} 
              className={!isPostNow ? "bg-white/10 text-white border-0 flex-1" : "border-white/20 text-gray-400 hover:text-white flex-1"}
              onClick={() => setIsPostNow(false)}
            >
              Schedule
            </Button>
          </div>

          {!isPostNow && (
            <div className="flex flex-col space-y-3">
              <label className="text-sm text-gray-400">Select Date & Time</label>
              <Popover>
                <PopoverTrigger className="inline-flex h-9 w-full items-center justify-start gap-2 rounded-md border border-white/10 bg-black/50 px-4 py-2 text-left text-sm font-normal text-white hover:bg-white/10">
                  <CalendarIcon className="h-4 w-4" />
                  {scheduledAt ? format(scheduledAt, "PPP") : <span>Pick a date</span>}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#13131a] border-white/10 text-white">
                  <Calendar
                    mode="single"
                    required={false}
                    selected={scheduledAt}
                    onSelect={(date) => {
                      if (!date) return setScheduledAt(undefined);
                      const current = scheduledAt ? new Date(scheduledAt) : new Date();
                      date.setHours(current.getHours(), current.getMinutes(), 0, 0);
                      setScheduledAt(date);
                    }}
                    className="bg-[#13131a] text-white"
                  />
                </PopoverContent>
              </Popover>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Start time</label>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(event) => setScheduledTime(event.target.value)}
                    className="mt-1 bg-black/50 border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">End time</label>
                  <Input
                    type="time"
                    value={scheduledEndTime}
                    onChange={(event) => setScheduledEndTime(event.target.value)}
                    className="mt-1 bg-black/50 border-white/10 text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4 pt-4">
          <Button variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10" onClick={saveDraft}>
            Save Draft
          </Button>
          <Button 
            className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white"
            onClick={publishPost}
            disabled={isError}
          >
            <Send className="w-4 h-4 mr-2" />
            {isPostNow ? "Publish Now" : "Schedule Post"}
          </Button>
        </div>
      </div>

      <div className="hidden lg:flex flex-col border-l border-white/10 pl-8 h-full overflow-y-auto">
        <h3 className="text-sm font-medium text-white mb-6">Live Preview</h3>
        <Card className="bg-white text-black shadow-lg">
          <CardHeader className="flex flex-row items-center space-x-3 pb-2">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold">
              U
            </div>
            <div>
              <p className="font-semibold text-sm">Your Name</p>
              <p className="text-xs text-gray-500">@yourhandle • Just now</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">
              {content || "Your post preview will appear here as you type..."}
            </p>
            {uploadedMedia.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {uploadedMedia.map((media) => (
                  <div key={media.id} className="aspect-square overflow-hidden rounded-md bg-gray-100">
                    {media.type === 'video' ? (
                      <video src={media.url} className="h-full w-full object-cover" controls />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={media.url} alt="Post media preview" className="h-full w-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CreatePostPage() {
  return (
    <Suspense fallback={<div className="text-sm text-gray-400">Loading composer...</div>}>
      <CreatePostPageContent />
    </Suspense>
  );
}
