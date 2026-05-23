"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const PLATFORMS = ["twitter", "linkedin", "facebook", "instagram", "youtube", "tiktok", "pinterest"];

export default function AutoRepliesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [open, setOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("keyword");
  const [keywords, setKeywords] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [promptTemplate, setPromptTemplate] = useState("Thanks for your comment! {{comment}}");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchRules();
    fetchEvents();
  }, []);

  async function fetchRules() {
    try {
      const res = await fetch("/api/auto-replies");
      if (res.ok) setRules(await res.json());
    } catch (e) {
      toast.error("Failed to load rules");
    } finally {
      setLoading(false);
    }
  };

  async function fetchEvents() {
    try {
      const res = await fetch("/api/auto-replies/events");
      if (res.ok) setEvents(await res.json());
    } catch (e) {
      console.error(e);
    }
  }

  const openCreate = () => {
    setEditingRule(null);
    setName("");
    setTriggerType("keyword");
    setKeywords("");
    setPlatforms([]);
    setPromptTemplate("Thanks for your comment! {{comment}}");
    setIsActive(true);
    setOpen(true);
  };

  const openEdit = (rule: any) => {
    setEditingRule(rule);
    setName(rule.name);
    setTriggerType(rule.triggerType);
    setKeywords(rule.keywords ? rule.keywords.join(", ") : "");
    setPlatforms(rule.platforms || []);
    setPromptTemplate(rule.promptTemplate);
    setIsActive(rule.isActive);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!name || platforms.length === 0 || !promptTemplate) {
      toast.error("Please fill all required fields");
      return;
    }
    
    try {
      const payload = {
        name,
        triggerType,
        keywords: triggerType === 'keyword' ? keywords.split(",").map(k => k.trim()).filter(k => k) : [],
        platforms,
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
        fetchRules();
      } else {
        const error = await res.text();
        if (res.status === 403) {
          toast.error("Plan limit reached. Please upgrade to create more rules.");
        } else {
          toast.error(`Error: ${error}`);
        }
      }
    } catch (e) {
      toast.error("Failed to save rule");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    try {
      const res = await fetch(`/api/auto-replies/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Rule deleted");
        fetchRules();
      }
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  const toggleActive = async (rule: any) => {
    try {
      const res = await fetch(`/api/auto-replies/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive })
      });
      if (res.ok) fetchRules();
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
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
              <label className="text-sm font-medium text-gray-300 block mb-2">Target Platforms</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <Badge 
                    key={p} 
                    variant={platforms.includes(p) ? "default" : "outline"}
                    className={`cursor-pointer capitalize ${platforms.includes(p) ? "bg-purple-600 text-white border-0" : "border-white/20 text-gray-400 hover:text-white"}`}
                    onClick={() => togglePlatform(p)}
                  >
                    {p}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300">AI Prompt Template</label>
              <p className="text-xs text-gray-500 mb-1">Use <code className="text-cyan-400">{`{{comment}}`}</code> to inject the user's comment.</p>
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

            <Button className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 mt-4" onClick={handleSave}>
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
                      <span className="w-20">Platforms:</span>
                      <div className="flex-1 flex flex-wrap gap-1">
                        {rule.platforms?.map((p: string, i: number) => (
                          <span key={i} className="text-xs text-white capitalize">{p}{i < rule.platforms.length - 1 ? ',' : ''}</span>
                        ))}
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
                      <td className="px-4 py-3 max-w-[200px] truncate text-gray-400" title={evt.replyText}>{evt.replyText || '-'}</td>
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
