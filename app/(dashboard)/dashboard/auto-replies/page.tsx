"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Edit2, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PLATFORMS as PLATFORM_CONFIGS } from "@/lib/platforms";

const AUTO_REPLY_SUPPORTED_PLATFORMS = new Set(["twitter", "youtube"]);

type ConnectedAccount = {
  id: string;
  platform: string;
  accountName: string;
  accountHandle: string | null;
};

type AutoReplyRule = {
  id: string;
  name: string;
  triggerType: "keyword" | "any";
  keywords: string[] | null;
  promptTemplate: string;
  platforms: string[];
  connectedAccountIds: string[];
  isActive: boolean;
  createdAt: string;
};

type CommentEvent = {
  id: string;
  platform: string;
  commentText: string;
  commentAuthor: string;
  replyText: string | null;
  status: "pending" | "published" | "failed";
  createdAt: string;
};

export default function AutoRepliesPage() {
  const [rules, setRules] = useState<AutoReplyRule[]>([]);
  const [events, setEvents] = useState<CommentEvent[]>([]);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [open, setOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoReplyRule | null>(null);
  
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("keyword");
  const [keywords, setKeywords] = useState("");
  const [connectedAccountIds, setConnectedAccountIds] = useState<string[]>([]);
  const [promptTemplate, setPromptTemplate] = useState("Thanks for your comment! {{comment}}");
  const [isActive, setIsActive] = useState(true);

  const supportedAccounts = accounts.filter((account) => AUTO_REPLY_SUPPORTED_PLATFORMS.has(account.platform));
  const unsupportedConnectedAccounts = accounts.filter((account) => !AUTO_REPLY_SUPPORTED_PLATFORMS.has(account.platform));

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/auto-replies");
      if (res.ok) setRules(await res.json());
    } catch {
      toast.error("Failed to load rules");
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/auto-replies/events");
      if (res.ok) setEvents(await res.json());
    } catch (error) {
      console.error(error);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) setAccounts(await res.json());
    } catch {
      toast.error("Failed to load connected accounts");
    }
  }, []);

  const fetchPageData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchRules(), fetchEvents(), fetchAccounts()]);
    setLoading(false);
  }, [fetchAccounts, fetchEvents, fetchRules]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchPageData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchPageData]);

  const openCreate = () => {
    setEditingRule(null);
    setName("");
    setTriggerType("keyword");
    setKeywords("");
    setConnectedAccountIds(supportedAccounts.length === 1 ? [supportedAccounts[0].id] : []);
    setPromptTemplate("Thanks for your comment! {{comment}}");
    setIsActive(true);
    setOpen(true);
  };

  const openEdit = (rule: AutoReplyRule) => {
    setEditingRule(rule);
    setName(rule.name);
    setTriggerType(rule.triggerType);
    setKeywords(rule.keywords ? rule.keywords.join(", ") : "");
    setConnectedAccountIds(rule.connectedAccountIds || []);
    setPromptTemplate(rule.promptTemplate);
    setIsActive(rule.isActive);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!name || connectedAccountIds.length === 0 || !promptTemplate) {
      toast.error("Please fill all required fields");
      return;
    }
    
    try {
      const payload = {
        name,
        triggerType,
        keywords: triggerType === 'keyword' ? keywords.split(",").map(k => k.trim()).filter(k => k) : [],
        connectedAccountIds,
        promptTemplate,
        isActive
      };

      const url = editingRule ? `/api/auto-replies/${editingRule.id}` : "/api/auto-replies";
      const method = editingRule ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingRule ? "Rule updated" : "Rule created");
        setOpen(false);
        void fetchPageData();
      } else {
        const error = await res.text();
        if (res.status === 403) {
          toast.error("Plan limit reached. Please upgrade to create more rules.");
        } else {
          toast.error(`Error: ${error}`);
        }
      }
    } catch {
      toast.error("Failed to save rule");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    try {
      const res = await fetch(`/api/auto-replies/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Rule deleted");
        void fetchRules();
      }
    } catch {
      toast.error("Failed to delete");
    }
  };

  const toggleActive = async (rule: AutoReplyRule) => {
    try {
      const res = await fetch(`/api/auto-replies/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive })
      });
      if (res.ok) void fetchRules();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const toggleAccount = (accountId: string) => {
    setConnectedAccountIds(prev => prev.includes(accountId) ? prev.filter(x => x !== accountId) : [...prev, accountId]);
  };

  const getPlatformName = (platformId: string) => {
    return PLATFORM_CONFIGS.find((platform) => platform.id === platformId)?.shortName || platformId;
  };

  const getAccountLabel = (accountId: string) => {
    const account = accounts.find((item) => item.id === accountId);
    if (!account) return "Missing account";
    return `${getPlatformName(account.platform)} - @${account.accountHandle || account.accountName}`;
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>;

  return (
    <div className="space-y-6 text-white h-[calc(100vh-8rem)] overflow-y-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Auto Replies</h2>
          <p className="text-sm text-gray-400">Manage AI-powered rules for engaging with comments.</p>
        </div>
        <Button className="bg-gradient-to-r from-purple-600 to-cyan-500 text-white" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Create Rule
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#13131a] border-white/10 text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Rule" : "Create Auto-Reply Rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-300">Rule Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} className="bg-black/50 border-white/10 mt-1" placeholder="E.g., Welcome New Followers" />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Trigger Type</label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 text-sm cursor-pointer">
                  <input type="radio" checked={triggerType === 'keyword'} onChange={() => setTriggerType('keyword')} className="text-purple-500 bg-black/50 border-white/20" />
                  <span>Keyword Match</span>
                </label>
                <label className="flex items-center space-x-2 text-sm cursor-pointer">
                  <input type="radio" checked={triggerType === 'any'} onChange={() => setTriggerType('any')} className="text-purple-500 bg-black/50 border-white/20" />
                  <span>All Comments</span>
                </label>
              </div>
            </div>

            {triggerType === 'keyword' && (
              <div>
                <label className="text-sm font-medium text-gray-300">Keywords (comma-separated)</label>
                <Input value={keywords} onChange={e => setKeywords(e.target.value)} className="bg-black/50 border-white/10 mt-1" placeholder="e.g., price, how much, link" />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Reply From Account</label>
              <div className="space-y-2">
                {supportedAccounts.length === 0 ? (
                  <div className="flex gap-2 rounded-md border border-yellow-400/20 bg-yellow-400/10 p-3 text-sm text-yellow-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Connect a Twitter or YouTube account first. Auto replies currently monitor Twitter mentions and YouTube comments.</span>
                  </div>
                ) : (
                  supportedAccounts.map((account) => {
                    const selected = connectedAccountIds.includes(account.id);
                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => toggleAccount(account.id)}
                        className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                          selected
                            ? "border-purple-400 bg-purple-500/15 text-white"
                            : "border-white/10 bg-black/30 text-gray-300 hover:bg-white/5"
                        }`}
                      >
                        <span>
                          <span className="font-medium">{getPlatformName(account.platform)}</span>
                          <span className="ml-2 text-gray-400">@{account.accountHandle || account.accountName}</span>
                        </span>
                        <Badge className={selected ? "bg-purple-600 text-white" : "border-white/20 text-gray-400"} variant={selected ? "default" : "outline"}>
                          {selected ? "Selected" : "Select"}
                        </Badge>
                      </button>
                    );
                  })
                )}
                {unsupportedConnectedAccounts.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {unsupportedConnectedAccounts.length} connected account(s) are hidden because auto-reply publishing is not implemented for those platforms yet.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300">AI Prompt Template</label>
              <p className="text-xs text-gray-500 mb-1">Use <code className="text-cyan-400">{`{{comment}}`}</code> to inject the user&apos;s comment.</p>
              <Textarea 
                value={promptTemplate} 
                onChange={e => setPromptTemplate(e.target.value)} 
                className="bg-black/50 border-white/10" 
                rows={4} 
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-medium text-gray-300">Active Status</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <Button className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 mt-4" onClick={handleSave} disabled={supportedAccounts.length === 0}>
              Save Rule
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="rules" className="w-full">
        <TabsList className="bg-[#13131a] border border-white/10 p-1">
          <TabsTrigger value="rules" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">Rules List</TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">Recent Activity</TabsTrigger>
        </TabsList>
        
        <TabsContent value="rules" className="mt-6">
          {rules.length === 0 ? (
            <div className="text-center py-10 bg-white/5 border border-white/10 rounded-lg">
              <p className="text-gray-400">No auto-reply rules configured yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rules.map(rule => (
                <div key={rule.id} className="bg-[#13131a] border border-white/10 rounded-xl p-5 relative group">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{rule.name}</h3>
                    <Switch checked={rule.isActive} onCheckedChange={() => toggleActive(rule)} />
                  </div>
                  <div className="space-y-2 mt-4 text-sm">
                    <div className="flex items-center text-gray-400">
                      <span className="w-20">Trigger:</span>
                      <span className="text-white bg-white/10 px-2 py-0.5 rounded capitalize">{rule.triggerType}</span>
                    </div>
                    {rule.triggerType === 'keyword' && (
                      <div className="flex items-start text-gray-400">
                        <span className="w-20">Keywords:</span>
                        <div className="flex-1 flex flex-wrap gap-1">
                          {rule.keywords?.map((k: string, i: number) => (
                            <span key={i} className="text-xs text-white bg-purple-500/20 px-1.5 py-0.5 rounded">{k}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-start text-gray-400">
                      <span className="w-20">Accounts:</span>
                      <div className="flex-1 flex flex-wrap gap-1">
                        {rule.connectedAccountIds?.length ? (
                          rule.connectedAccountIds.map((accountId) => (
                            <span key={accountId} className="text-xs text-white bg-white/10 px-1.5 py-0.5 rounded">{getAccountLabel(accountId)}</span>
                          ))
                        ) : (
                          <span className="text-xs text-yellow-300">No account selected</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 mt-6">
                    <Button variant="outline" size="sm" className="flex-1 border-white/20 hover:bg-white/10 text-white" onClick={() => openEdit(rule)}>
                      <Edit2 className="w-3 h-3 mr-2" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20" onClick={() => handleDelete(rule.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="activity" className="mt-6">
          <div className="bg-[#13131a] border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-400 uppercase bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">Comment</th>
                  <th className="px-4 py-3">Reply Generated</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No recent activity</td>
                  </tr>
                ) : (
                  events.map((evt) => (
                    <tr key={evt.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 capitalize font-medium">{evt.platform}</td>
                      <td className="px-4 py-3">{evt.commentAuthor}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-gray-400" title={evt.commentText}>{evt.commentText}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-gray-400" title={evt.replyText || undefined}>{evt.replyText || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={
                          evt.status === 'published' ? 'text-green-400 border-green-400/50 bg-green-400/10' :
                          evt.status === 'failed' ? 'text-red-400 border-red-400/50 bg-red-400/10' :
                          'text-yellow-400 border-yellow-400/50 bg-yellow-400/10'
                        }>
                          {evt.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(evt.createdAt), 'MMM d, HH:mm')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
