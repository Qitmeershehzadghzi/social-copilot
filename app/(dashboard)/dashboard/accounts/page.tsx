"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";
import { PLATFORMS } from "@/lib/platforms";

type ConnectedAccount = {
  id: string;
  platform: string;
  accountName: string;
  accountHandle: string | null;
  profileImageUrl: string | null;
  expiresAt: string | null;
};

type PlatformStatus = {
  id: string;
  configured: boolean;
  callbackUrl: string;
  envVars: string[];
  setupNote: string;
  developerUrl: string;
};

function AccountsPageContent() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [platformStatuses, setPlatformStatuses] = useState<Record<string, PlatformStatus>>({});
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();

  const fetchAccounts = useCallback(async () => {
    try {
      const [accountsRes, platformsRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/platforms'),
      ]);

      if (accountsRes.ok) {
        const data = (await accountsRes.json()) as ConnectedAccount[];
        setAccounts(data);
      }

      if (platformsRes.ok) {
        const data = (await platformsRes.json()) as PlatformStatus[];
        setPlatformStatuses(Object.fromEntries(data.map((platform) => [platform.id, platform])));
      }
    } catch {
      toast.error('Failed to load connected accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchAccounts();
    }, 0);

    // Check for success or error from OAuth redirect
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    const detail = searchParams.get("detail");
    const platform = searchParams.get("platform");

    if (connected === "true" && platform) {
      toast.success(`${platform} account connected successfully!`);
      // Clear URL params
      router.replace("/dashboard/accounts");
    } else if (error) {
      if (error === "plan_limit_reached") {
        toast.error("Plan limit reached. Please upgrade to connect more accounts.");
      } else {
        const message = detail || error.replace(/_/g, ' ');
        toast.error(`Failed to connect account: ${message}`);
      }
      router.replace("/dashboard/accounts");
    }

    return () => window.clearTimeout(timeoutId);
  }, [fetchAccounts, searchParams, router]);

  const disconnectAccount = async (id: string) => {
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Account disconnected');
        fetchAccounts();
      } else {
        toast.error('Failed to disconnect account');
      }
    } catch {
      toast.error('An error occurred');
    }
  };

  const connectAccount = (platformId: string) => {
    // Redirect to generic OAuth initiation endpoint
    window.location.assign(`/api/accounts/oauth/${platformId}`);
  };

  const getInitials = (value: string) => {
    const words = value.trim().split(/\s+/).filter(Boolean);
    const first = words[0]?.[0] || "A";
    const second = words.length > 1 ? words[1][0] : "";
    return `${first}${second}`.toUpperCase();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Connected Accounts</h2>
        <p className="text-muted-foreground text-gray-400">
          Manage your social media accounts to schedule and publish posts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const connectedAccount = accounts.find((a) => a.platform === platform.id);
          const isConnected = !!connectedAccount;
          
          let showWarning = false;
          if (isConnected && connectedAccount.expiresAt) {
            const expires = new Date(connectedAccount.expiresAt);
            const now = new Date();
            const daysLeft = (expires.getTime() - now.getTime()) / (1000 * 3600 * 24);
            if (daysLeft < 7) showWarning = true;
          }

          const Icon = platform.icon;
          const platformStatus = platformStatuses[platform.id];
          const isConfigured = platformStatus?.configured ?? false;

          return (
            <Card key={platform.id} className="bg-[#13131a] border-white/10 text-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-lg font-medium flex items-center space-x-2">
                  <Icon className={`w-5 h-5 ${platform.colorClass}`} />
                  <span>{platform.name}</span>
                </CardTitle>
                {isConnected ? (
                  <Badge className="border-green-500/50 text-green-400 bg-green-500/10">Connected</Badge>
                ) : (
                  <Badge className="border-gray-500/50 text-gray-400 bg-gray-500/10">Not Connected</Badge>
                )}
              </CardHeader>
              <CardContent>
                {isConnected ? (
                  <div className="mt-2 space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar size="lg" className="bg-white/10">
                        {connectedAccount.profileImageUrl && (
                          <AvatarImage
                            src={connectedAccount.profileImageUrl}
                            alt={connectedAccount.accountName}
                          />
                        )}
                        <AvatarFallback className="bg-white/10 text-white">
                          {getInitials(connectedAccount.accountName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {connectedAccount.accountName}
                        </p>
                        {connectedAccount.accountHandle && (
                          <p className="truncate text-xs text-gray-400">
                            @{connectedAccount.accountHandle}
                          </p>
                        )}
                      </div>
                    </div>
                    {showWarning && (
                      <div className="flex items-center text-xs text-orange-400 mt-2 bg-orange-400/10 p-2 rounded border border-orange-400/20">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        Token expires soon
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-gray-400">
                      Connect your {platform.name} account to enable publishing.
                    </p>
                    {!isConfigured && platformStatus && (
                      <div className="rounded border border-orange-400/20 bg-orange-400/10 p-2 text-xs text-orange-300">
                        Missing env: {platformStatus.envVars.join(', ')}
                      </div>
                    )}
                    {platformStatus && (
                      <p className="break-all text-xs text-gray-500">
                        Callback: {platformStatus.callbackUrl}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                {isConnected ? (
                  <Button 
                    variant="destructive" 
                    className="w-full bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all"
                    onClick={() => disconnectAccount(connectedAccount.id)}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all"
                    onClick={() => connectAccount(platform.id)}
                    disabled={!isConfigured}
                  >
                    {isConfigured ? 'Connect' : 'Add env vars first'}
                  </Button>
                )}
              </CardFooter>
              {!isConnected && platformStatus && (
                <div className="border-t border-white/10 px-6 pb-4 text-xs text-gray-400">
                  <p>{platformStatus.setupNote}</p>
                  <a
                    href={platformStatus.developerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-cyan-400 hover:underline"
                  >
                    Developer setup <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-purple-500" /></div>}>
      <AccountsPageContent />
    </Suspense>
  );
}