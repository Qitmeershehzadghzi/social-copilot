"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORMS } from "@/lib/platforms";
import { CalendarDays, Clipboard, Loader2, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";

type StrategyPost = {
  day: number;
  platform: string;
  content_type: string;
  title: string;
  hook: string;
  caption: string;
  hashtags: string[];
  cta: string;
  best_posting_time: string;
  goal: string;
  target_emotion: string;
};

type ContentPlan = {
  monthly_theme: string;
  strategy_summary: string;
  posts: StrategyPost[];
};

const TONES = ["Professional", "Friendly", "Bold", "Educational", "Funny", "Luxury"];
const GOALS = ["Increase engagement", "Generate leads", "Build brand awareness", "Drive sales", "Grow followers", "Educate audience"];

export default function StrategyPage() {
  const [niche, setNiche] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram", "linkedin"]);
  const [tone, setTone] = useState(TONES[0]);
  const [goal, setGoal] = useState(GOALS[0]);
  const [days, setDays] = useState(14);
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const jsonOutput = useMemo(() => plan ? JSON.stringify(plan, null, 2) : "", [plan]);

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((current) =>
      current.includes(platformId)
        ? current.filter((id) => id !== platformId)
        : [...current, platformId]
    );
  };

  const generatePlan = async () => {
    if (!niche.trim() || !targetAudience.trim()) {
      toast.error("Niche and target audience are required");
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/content-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche,
          targetAudience,
          platforms: selectedPlatforms,
          tone,
          goal,
          days,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json() as ContentPlan;
      setPlan(data);
      toast.success("Content strategy generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate strategy");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyJson = async () => {
    if (!jsonOutput) return;
    await navigator.clipboard.writeText(jsonOutput);
    toast.success("JSON copied");
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
      <Card className="bg-white/5 border-white/10 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            AI Strategy Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Niche</label>
            <Input
              value={niche}
              onChange={(event) => setNiche(event.target.value)}
              placeholder="e.g. Online bakery in Karachi"
              className="bg-black/40 border-white/10 text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Target Audience</label>
            <Textarea
              value={targetAudience}
              onChange={(event) => setTargetAudience(event.target.value)}
              placeholder="e.g. Young professionals and students who order desserts online"
              className="min-h-24 bg-black/40 border-white/10 text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => {
                const selected = selectedPlatforms.includes(platform.id);
                return (
                  <Button
                    key={platform.id}
                    type="button"
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    className={selected ? "bg-cyan-500 text-black hover:bg-cyan-400" : "border-white/20 text-gray-300 hover:bg-white/10"}
                    onClick={() => togglePlatform(platform.id)}
                  >
                    {platform.shortName}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Tone</label>
              <select
                value={tone}
                onChange={(event) => setTone(event.target.value)}
                className="h-10 w-full rounded-md border border-white/10 bg-black/40 px-3 text-sm text-white"
              >
                {TONES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-300">Posts</label>
              <Input
                type="number"
                min={3}
                max={31}
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
                className="bg-black/40 border-white/10 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Goal</label>
            <select
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              className="h-10 w-full rounded-md border border-white/10 bg-black/40 px-3 text-sm text-white"
            >
              {GOALS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white"
            onClick={generatePlan}
            disabled={isGenerating}
          >
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Target className="mr-2 h-4 w-4" />}
            Generate Content Plan
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {plan ? (
          <>
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{plan.monthly_theme}</CardTitle>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{plan.strategy_summary}</p>
                </div>
                <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10" onClick={copyJson}>
                  <Clipboard className="mr-2 h-4 w-4" />
                  Copy JSON
                </Button>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {plan.posts.map((post) => (
                <Card key={`${post.day}-${post.platform}-${post.title}`} className="bg-[#13131a] border-white/10 text-white">
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Badge className="bg-white/10 text-gray-200">Day {post.day}</Badge>
                      <span className="text-xs text-gray-400">{post.best_posting_time}</span>
                    </div>
                    <CardTitle className="text-base leading-6">{post.title}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-cyan-400/40 text-cyan-300">{post.platform}</Badge>
                      <Badge variant="outline" className="border-purple-400/40 text-purple-300">{post.content_type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <p className="font-medium text-cyan-100">{post.hook}</p>
                    <p className="whitespace-pre-wrap leading-6 text-gray-300">{post.caption}</p>
                    <div className="flex flex-wrap gap-2">
                      {post.hashtags.map((tag) => (
                        <span key={tag} className="text-xs text-cyan-300">{tag}</span>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase text-gray-500">CTA</p>
                        <p className="mt-1 text-gray-300">{post.cta}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-gray-500">Goal</p>
                        <p className="mt-1 text-gray-300">{post.goal}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-gray-500">Emotion</p>
                        <p className="mt-1 text-gray-300">{post.target_emotion}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-black/30 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="text-base">Raw JSON</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-[420px] overflow-auto rounded-md bg-black/50 p-4 text-xs leading-5 text-gray-300">{jsonOutput}</pre>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="flex min-h-[420px] items-center justify-center bg-white/5 border-white/10 text-center text-white">
            <CardContent className="max-w-md space-y-3 pt-6">
              <CalendarDays className="mx-auto h-10 w-10 text-cyan-400" />
              <h2 className="text-xl font-semibold">Generate a practical monthly plan</h2>
              <p className="text-sm leading-6 text-gray-400">
                Add your niche, audience, platforms, tone, and goal. The AI will return publish-ready captions, hashtags, CTAs, content formats, and posting times.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
