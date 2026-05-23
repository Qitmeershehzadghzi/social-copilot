"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Subscription = {
  plan: "free" | "pro" | "agency";
} | null;

type Preferences = {
  postPublished: boolean;
  postFailed: boolean;
  autoReplySent: boolean;
  autoReplyFailed: boolean;
  weeklyDigest: boolean;
  defaultReplyTone: "friendly" | "professional" | "short";
  requireKeywordsForAutoReplies: boolean;
  pauseAutoReplies: boolean;
  maxReplyLength: number;
};

type SettingsProps = {
  initialSubscription: Subscription;
  usageStats: {
    posts: number;
    accounts: number;
    autoReplies: number;
  };
};

const DEFAULT_PREFERENCES: Preferences = {
  postPublished: false,
  postFailed: true,
  autoReplySent: false,
  autoReplyFailed: true,
  weeklyDigest: true,
  defaultReplyTone: "friendly",
  requireKeywordsForAutoReplies: false,
  pauseAutoReplies: false,
  maxReplyLength: 280,
};

export default function SettingsClient({ initialSubscription, usageStats }: SettingsProps) {
  const { user, isLoaded } = useUser();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [plunkConfigured, setPlunkConfigured] = useState(false);

  const plan = initialSubscription?.plan || "free";
  const limits = {
    free: { posts: 10, accounts: 2, autoReplies: 10 },
    pro: { posts: 100, accounts: 10, autoReplies: 1000 },
    agency: { posts: 10000, accounts: 100, autoReplies: 100000 },
  }[plan];

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (user) {
        setFirstName(user.firstName || "");
        setLastName(user.lastName || "");
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [user]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetch("/api/settings/notifications")
        .then((res) => res.json())
        .then((data) => {
          if (data.preferences) {
            setPreferences((prev) => ({ ...prev, ...data.preferences }));
          }
          setPlunkConfigured(Boolean(data.plunkConfigured));
        })
        .catch(console.error);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSavingProfile(true);
    try {
      await user.update({ firstName, lastName });
      toast.success("Profile updated successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update profile";
      toast.error(message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePreferences = async () => {
    setIsSavingPreferences(true);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      const data = await res.json();
      setPlunkConfigured(Boolean(data.plunkConfigured));
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handleUpgrade = () => {
    toast.info("Clerk Checkout integration is pending");
  };

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel your subscription?")) {
      toast.info("Clerk subscription cancellation is pending");
    }
  };

  if (!isLoaded) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-gray-400">Manage your profile, automation behavior, billing, and notifications.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-lg">
          <TabsTrigger value="profile" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">Profile</TabsTrigger>
          <TabsTrigger value="automation" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">Automation</TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">Notifications</TabsTrigger>
          <TabsTrigger value="billing" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Profile Information</CardTitle>
              <CardDescription className="text-gray-400">Update the identity used across the dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="w-20 h-20 border-2 border-purple-500">
                  <AvatarImage src={user?.imageUrl} />
                  <AvatarFallback className="bg-purple-600 text-white text-xl">
                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => toast.info("Use Clerk profile controls to change your avatar")}>
                  Change Avatar
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">First Name</Label>
                  <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="bg-black/50 border-white/10 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Last Name</Label>
                  <Input value={lastName} onChange={(event) => setLastName(event.target.value)} className="bg-black/50 border-white/10 text-white" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Email Address</Label>
                <Input value={user?.primaryEmailAddress?.emailAddress || ""} disabled className="bg-black/20 border-white/10 text-gray-500 cursor-not-allowed" />
                <p className="text-xs text-gray-500">Your email address is managed by Clerk.</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="bg-purple-600 hover:bg-purple-700 text-white">
                {isSavingProfile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="mt-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Automation Controls</CardTitle>
              <CardDescription className="text-gray-400">Tune how AI replies behave before they go public.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <SettingSwitch
                title="Pause Auto-Replies"
                description="Temporarily stop comment monitors from sending replies."
                checked={preferences.pauseAutoReplies}
                onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, pauseAutoReplies: checked }))}
              />
              <SettingSwitch
                title="Require Keywords"
                description="Keep public replies safer by preferring keyword-triggered rules."
                checked={preferences.requireKeywordsForAutoReplies}
                onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, requireKeywordsForAutoReplies: checked }))}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Default Reply Tone</Label>
                  <select
                    value={preferences.defaultReplyTone}
                    onChange={(event) => setPreferences((prev) => ({ ...prev, defaultReplyTone: event.target.value as Preferences["defaultReplyTone"] }))}
                    className="h-10 w-full rounded-md border border-white/10 bg-black/50 px-3 text-sm text-white"
                  >
                    <option value="friendly">Friendly</option>
                    <option value="professional">Professional</option>
                    <option value="short">Short</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Max Reply Length</Label>
                  <Input
                    type="number"
                    min={80}
                    max={500}
                    value={preferences.maxReplyLength}
                    onChange={(event) => setPreferences((prev) => ({ ...prev, maxReplyLength: Number(event.target.value) }))}
                    className="bg-black/50 border-white/10 text-white"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSavePreferences} disabled={isSavingPreferences} className="bg-purple-600 hover:bg-purple-700 text-white">
                {isSavingPreferences ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Automation Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-white">Notification Preferences</CardTitle>
                <Badge className={plunkConfigured ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-yellow-500/10 text-yellow-300 border-yellow-500/30"} variant="outline">
                  {plunkConfigured ? "Plunk connected" : "Plunk key missing"}
                </Badge>
              </div>
              <CardDescription className="text-gray-400">Email alerts are sent through Plunk when enabled.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <SettingSwitch title="Post Published" description="Receive an email when a post is successfully published." checked={preferences.postPublished} onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, postPublished: checked }))} />
              <SettingSwitch title="Post Failed" description="Receive an email if a scheduled post fails to publish." checked={preferences.postFailed} onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, postFailed: checked }))} />
              <SettingSwitch title="Auto-Reply Sent" description="Receive an email when an auto-reply rule sends a public reply." checked={preferences.autoReplySent} onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, autoReplySent: checked }))} />
              <SettingSwitch title="Auto-Reply Failed" description="Receive an email if a platform token or API error blocks a reply." checked={preferences.autoReplyFailed} onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, autoReplyFailed: checked }))} />
              <SettingSwitch title="Weekly Digest" description="Get a weekly summary of your social activity and automation results." checked={preferences.weeklyDigest} onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, weeklyDigest: checked }))} />
            </CardContent>
            <CardFooter>
              <Button onClick={handleSavePreferences} disabled={isSavingPreferences} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                {isSavingPreferences ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Preferences
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-6 space-y-6">
          <Card className="bg-white/5 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                Current Plan
              </span>
            </div>
            <CardHeader>
              <CardTitle className="text-white capitalize text-2xl">{plan} Plan</CardTitle>
              <CardDescription className="text-gray-400">
                {plan === "free" ? "You are currently on the free tier." : "Your subscription is active."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <UsageBar label="Posts Scheduled/Published" value={usageStats.posts} limit={limits.posts} colorClass="[&>div]:bg-purple-500" />
              <UsageBar label="Connected Accounts" value={usageStats.accounts} limit={limits.accounts} colorClass="[&>div]:bg-cyan-500" />
              <UsageBar label="Auto-Replies Sent" value={usageStats.autoReplies} limit={limits.autoReplies} colorClass="[&>div]:bg-emerald-500" />
            </CardContent>
            <CardFooter className="flex gap-4 border-t border-white/10 pt-6">
              {plan === "free" ? (
                <Button onClick={handleUpgrade} className="bg-gradient-to-r from-purple-600 to-cyan-500 text-white border-0">
                  Upgrade Plan
                </Button>
              ) : (
                <>
                  <Button onClick={handleUpgrade} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    Manage Subscription
                  </Button>
                  <Button onClick={handleCancel} variant="destructive" className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0">
                    Cancel Subscription
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["free", "pro", "agency"] as const).map((item) => (
              <Card key={item} className={`bg-white/5 border-white/10 flex flex-col ${plan === item ? "ring-2 ring-purple-500" : ""}`}>
                <CardHeader>
                  <CardTitle className="text-white capitalize">{item}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li>{item === "free" ? "10" : item === "pro" ? "100" : "10,000"} Posts / month</li>
                    <li>{item === "free" ? "2" : item === "pro" ? "10" : "100"} Accounts</li>
                    <li>{item === "free" ? "10" : item === "pro" ? "1,000" : "100,000"} Auto-replies</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant={plan === item ? "secondary" : "outline"} className="w-full" disabled={plan === item} onClick={handleUpgrade}>
                    {plan === item ? "Current Plan" : "Upgrade"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SettingSwitch({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label className="text-white">{title}</Label>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function UsageBar({ label, value, limit, colorClass }: { label: string; value: number; limit: number; colorClass: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="text-white">{value} / {limit}</span>
      </div>
      <Progress value={(value / limit) * 100} className={`h-2 bg-white/10 ${colorClass}`} />
    </div>
  );
}
