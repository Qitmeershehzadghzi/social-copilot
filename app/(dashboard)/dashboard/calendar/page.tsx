"use client";

import { useEffect, useState, useCallback, useMemo, useRef, type ComponentType } from "react";
import { Calendar, momentLocalizer, Views, type CalendarProps } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus, Edit2, Trash2, ChevronLeft, ChevronRight,
  Search, Copy, Clock, BarChart2, CheckCircle2,
  XCircle, AlertCircle, Calendar as CalIcon, Layers,
  RefreshCw, Eye
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";

const localizer = momentLocalizer(moment);

/* ─── Constants ─────────────────────────────────────────── */
const PLATFORM_COLORS: Record<string, string> = {
  twitter:   "#1DA1F2",
  linkedin:  "#0077B5",
  facebook:  "#1877F2",
  instagram: "#E4405F",
  youtube:   "#FF0000",
  tiktok:    "#69C9D0",
  pinterest: "#E60023",
  threads:   "#111111",
};

const PLATFORM_ICONS: Record<string, string> = {
  twitter:   "𝕏",
  linkedin:  "in",
  facebook:  "f",
  instagram: "◈",
  youtube:   "▶",
  tiktok:    "♪",
  pinterest: "𝑃",
  threads:   "@",
};

const STATUS_STYLES: Record<string, { badge: string; icon: any; label: string }> = {
  pending:   { badge: "text-amber-400 border-amber-400/40 bg-amber-400/10",   icon: AlertCircle,    label: "Pending" },
  published: { badge: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10", icon: CheckCircle2, label: "Published" },
  failed:    { badge: "text-red-400 border-red-400/40 bg-red-400/10",         icon: XCircle,        label: "Failed" },
};

/* ─── Types ──────────────────────────────────────────────── */
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    post: any;
    platforms: string[];
    primaryPlatform: string;
    extraCount: number;
  };
}

const DnDCalendar = withDragAndDrop<CalendarEvent, object>(
  Calendar as unknown as ComponentType<CalendarProps<CalendarEvent, object>>
);

/* ─── Stat Card ──────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-gray-500 leading-none mb-0.5">{label}</p>
        <p className="text-lg font-bold text-white leading-none">{value}</p>
      </div>
    </div>
  );
}

/* ─── Custom Toolbar ─────────────────────────────────────── */
function CustomToolbar({
  onNavigate, onView, label, view,
  platformFilters, onToggleFilter, allPlatforms,
  searchQuery, onSearch, stats,
}: any) {
  const router = useRouter();

  return (
    <div className="space-y-4 mb-6">
      {/* Top row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate("PREV")}
            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate("TODAY")}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm transition-all"
          >
            Today
          </button>
          <button
            onClick={() => onNavigate("NEXT")}
            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <h2 className="text-white font-bold text-xl ml-2 tracking-tight">{label}</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
            {(["month", "week", "day", "agenda"] as const).map((v) => (
              <button
                key={v}
                onClick={() => onView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  view === v
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                    : "text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <button
            onClick={() => router.push("/dashboard/create-post")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-all shadow-lg shadow-purple-600/20"
          >
            <Plus className="w-4 h-4" />
            New Post
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Layers}       label="Total Posts"  value={stats.total}     color="bg-purple-600/20 text-purple-400" />
        <StatCard icon={AlertCircle}  label="Pending"      value={stats.pending}   color="bg-amber-500/20 text-amber-400" />
        <StatCard icon={CheckCircle2} label="Published"    value={stats.published} color="bg-emerald-500/20 text-emerald-400" />
        <StatCard icon={XCircle}      label="Failed"       value={stats.failed}    color="bg-red-500/20 text-red-400" />
      </div>

      {/* Search + Platform filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search posts…"
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {allPlatforms.map((p: string) => {
            const active = platformFilters.includes(p);
            return (
              <button
                key={p}
                onClick={() => onToggleFilter(p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  active
                    ? "text-white border-transparent"
                    : "text-gray-500 border-white/10 hover:text-gray-300 hover:border-white/20"
                }`}
                style={active ? {
                  backgroundColor: PLATFORM_COLORS[p] + "22",
                  borderColor: PLATFORM_COLORS[p] + "66",
                } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: active ? PLATFORM_COLORS[p] : "#444" }}
                />
                <span className="capitalize">{p}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Event Component ────────────────────────────────────── */
function EventComponent({ event }: { event: CalendarEvent }) {
  const color = PLATFORM_COLORS[event.resource.primaryPlatform] || "#8B5CF6";
  return (
    <div className="flex items-center gap-1.5 text-xs truncate h-full">
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="truncate font-medium">{event.title}</span>
      {event.resource.extraCount > 0 && (
        <span
          className="flex-shrink-0 text-[9px] font-bold px-1 py-0.5 rounded"
          style={{ backgroundColor: color + "33", color }}
        >
          +{event.resource.extraCount}
        </span>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function CalendarPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [currentView, setCurrentView] = useState<any>(Views.MONTH);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [platformFilters, setPlatformFilters] = useState<string[]>(Object.keys(PLATFORM_COLORS));
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => { fetchPosts(); }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch("/api/posts");
      if (res.ok) setPosts(await res.json());
    } catch {
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  }

  const toggleFilter = (platform: string) =>
    setPlatformFilters((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );

  /* Stats */
  const stats = useMemo(() => ({
    total:     posts.length,
    pending:   posts.filter(p => p.targets?.some((t: any) => t.status === "pending")).length,
    published: posts.filter(p => p.targets?.every((t: any) => t.status === "published")).length,
    failed:    posts.filter(p => p.targets?.some((t: any) => t.status === "failed")).length,
  }), [posts]);

  /* Events */
  const events: CalendarEvent[] = useMemo(() => {
    return posts
      .filter((post) => {
        const hasDate = post.scheduledAt || post.publishedAt;
        const matchesSearch = !searchQuery ||
          post.content?.toLowerCase().includes(searchQuery.toLowerCase());
        return hasDate && matchesSearch;
      })
      .map((post) => {
        const platforms: string[] = (post.targets || []).map((t: any) => t.platform);
        const primaryPlatform = platforms[0] || "twitter";
        const extraCount = Math.max(0, platforms.length - 1);
        return {
          id: post.id,
          title: post.content
            ? post.content.slice(0, 60) + (post.content.length > 60 ? "…" : "")
            : "Untitled",
          start: new Date(post.scheduledAt || post.publishedAt),
          end:   new Date(new Date(post.scheduledAt || post.publishedAt).getTime() + 30 * 60000),
          resource: { post, platforms, primaryPlatform, extraCount },
        };
      })
      .filter(
        (evt) =>
          evt.resource.platforms.length === 0 ||
          evt.resource.platforms.some((p) => platformFilters.includes(p))
      );
  }, [posts, platformFilters, searchQuery]);

  /* Drag & Drop reschedule */
  const handleEventDrop = useCallback(async ({ event, start }: any) => {
    try {
      const res = await fetch(`/api/posts/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: start }),
      });
      if (res.ok) {
        toast.success("Post rescheduled!");
        fetchPosts();
      } else {
        toast.error("Failed to reschedule");
      }
    } catch {
      toast.error("Error rescheduling post");
    }
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setSheetOpen(true);
  }, []);

  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    router.push(`/dashboard/create-post?date=${format(start, "yyyy-MM-dd")}`);
  }, [router]);

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Post deleted");
        setSheetOpen(false);
        fetchPosts();
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Error deleting post");
    }
  };

  const copyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const eventPropGetter = useCallback((event: CalendarEvent) => {
    const color = PLATFORM_COLORS[event.resource.primaryPlatform] || "#8B5CF6";
    return {
      style: {
        backgroundColor: color + "22",
        borderLeft: `3px solid ${color}`,
        color: "#fff",
        borderRadius: "8px",
        padding: "2px 6px",
        fontSize: "11px",
        border: `1px solid ${color}33`,
        backdropFilter: "blur(4px)",
      },
    };
  }, []);

  const allPlatforms = Object.keys(PLATFORM_COLORS);

  return (
    <>
      <style>{`
        /* Dark theme overrides for react-big-calendar */
        .rbc-calendar { background: transparent; color: white; font-family: inherit; }
        .rbc-header { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.08) !important; color: #9ca3af; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; padding: 10px 8px; }
        .rbc-month-view, .rbc-time-view, .rbc-agenda-view { border-color: rgba(255,255,255,0.08) !important; border-radius: 16px; overflow: hidden; }
        .rbc-day-bg { background: transparent; }
        .rbc-day-bg + .rbc-day-bg { border-color: rgba(255,255,255,0.06) !important; }
        .rbc-off-range-bg { background: rgba(0,0,0,0.2); }
        .rbc-today { background: rgba(139,92,246,0.08) !important; }
        .rbc-date-cell { color: #d1d5db; font-size: 13px; padding: 6px 10px; }
        .rbc-date-cell.rbc-now { color: #a78bfa; font-weight: 700; }
        .rbc-month-row { border-color: rgba(255,255,255,0.06) !important; }
        .rbc-month-row + .rbc-month-row { border-color: rgba(255,255,255,0.06) !important; }
        .rbc-time-slot { border-color: rgba(255,255,255,0.04) !important; color: #6b7280; font-size: 11px; }
        .rbc-timeslot-group { border-color: rgba(255,255,255,0.06) !important; }
        .rbc-time-content { border-color: rgba(255,255,255,0.08) !important; }
        .rbc-time-header-content { border-color: rgba(255,255,255,0.08) !important; }
        .rbc-current-time-indicator { background: #a78bfa; }
        .rbc-show-more { color: #a78bfa; font-size: 11px; font-weight: 600; }
        .rbc-show-more:hover { color: #c4b5fd; }
        .rbc-agenda-table { color: #e5e7eb; border-color: rgba(255,255,255,0.08) !important; }
        .rbc-agenda-table thead { background: rgba(255,255,255,0.03); }
        .rbc-agenda-table thead th { color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
        .rbc-agenda-table tbody > tr > td { border-color: rgba(255,255,255,0.06) !important; }
        .rbc-agenda-table tbody > tr:hover { background: rgba(255,255,255,0.03); }
        .rbc-agenda-empty { color: #6b7280; padding: 40px; text-align: center; }
        .rbc-selected { outline: 2px solid rgba(139,92,246,0.5) !important; }
        .rbc-event:focus { outline: 2px solid rgba(139,92,246,0.5) !important; }
        .rbc-slot-selection { background: rgba(139,92,246,0.2); border: 1px solid rgba(139,92,246,0.5); }
        .rbc-day-slot .rbc-time-slot { border-color: rgba(255,255,255,0.04) !important; }
        .rbc-label { color: #6b7280; }
        .rbc-toolbar { display: none; }
        .rbc-event { cursor: pointer; }
        .rbc-event-label { font-size: 10px; color: rgba(255,255,255,0.7); }
        .rbc-addons-dnd-drag-preview { opacity: 0.8; transform: scale(1.02); }
        .rbc-addons-dnd-over { background: rgba(139,92,246,0.1) !important; }
      `}</style>

      <div className="space-y-2 text-white h-[calc(100vh-5rem)] flex flex-col">
        <DnDCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={currentView}
          onView={setCurrentView}
          date={currentDate}
          onNavigate={setCurrentDate}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventDrop}
          selectable
          resizable
          eventPropGetter={eventPropGetter}
          components={{
            event: EventComponent,
            toolbar: (toolbarProps: any) => (
              <CustomToolbar
                {...toolbarProps}
                platformFilters={platformFilters}
                onToggleFilter={toggleFilter}
                allPlatforms={allPlatforms}
                searchQuery={searchQuery}
                onSearch={setSearchQuery}
                stats={stats}
              />
            ),
          }}
          style={{ flex: 1, minHeight: 0 }}
        />
      </div>

      {/* ─── Detail Sheet ─────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="bg-[#0e0e18] border-white/10 text-white w-full sm:max-w-md overflow-y-auto flex flex-col">
          <SheetHeader className="pb-4 border-b border-white/10">
            <SheetTitle className="text-white text-lg font-bold flex items-center gap-2">
              <CalIcon className="w-5 h-5 text-purple-400" />
              Post Details
            </SheetTitle>
          </SheetHeader>

          {selectedEvent && (() => {
            const post = selectedEvent.resource.post;
            const overallStatus = post.targets?.every((t: any) => t.status === "published")
              ? "published"
              : post.targets?.some((t: any) => t.status === "failed")
              ? "failed"
              : "pending";
            const StatusInfo = STATUS_STYLES[overallStatus];

            return (
              <div className="space-y-5 mt-5 flex-1">
                {/* Overall status pill */}
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${StatusInfo.badge}`}>
                  <StatusInfo.icon className="w-3.5 h-3.5" />
                  {StatusInfo.label}
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs uppercase text-gray-500 tracking-wider font-semibold">Content</h4>
                    <button
                      onClick={() => copyContent(post.content)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap bg-white/5 border border-white/10 rounded-xl p-4 leading-relaxed text-gray-200">
                    {post.content || "No content"}
                  </p>
                </div>

                {/* Time info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Scheduled
                    </p>
                    <p className="text-sm font-medium text-white">
                      {format(selectedEvent.start, "MMM d, yyyy")}
                    </p>
                    <p className="text-xs text-gray-400">{format(selectedEvent.start, "h:mm a")}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Relative</p>
                    <p className="text-sm font-medium text-white capitalize">
                      {formatDistanceToNow(selectedEvent.start, { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {/* Platform targets */}
                <div className="space-y-2">
                  <h4 className="text-xs uppercase text-gray-500 tracking-wider font-semibold">
                    Platforms ({(post.targets || []).length})
                  </h4>
                  <div className="space-y-2">
                    {(post.targets || []).map((target: any) => {
                      const si = STATUS_STYLES[target.status] || STATUS_STYLES.pending;
                      const color = PLATFORM_COLORS[target.platform] || "#8B5CF6";
                      return (
                        <div
                          key={target.id}
                          className="flex items-center justify-between rounded-xl px-4 py-3 border border-white/10"
                          style={{ background: color + "0d" }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                              style={{ backgroundColor: color + "22", color }}
                            >
                              {PLATFORM_ICONS[target.platform] || "?"}
                            </div>
                            <div>
                              <p className="text-sm font-semibold capitalize">{target.platform}</p>
                              {target.publishedAt && (
                                <p className="text-[10px] text-gray-500">
                                  {format(new Date(target.publishedAt), "MMM d, h:mm a")}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-[10px] ${si.badge}`}>
                            <si.icon className="w-2.5 h-2.5 mr-1" />
                            {si.label}
                          </Badge>
                        </div>
                      );
                    })}
                    {(!post.targets || post.targets.length === 0) && (
                      <p className="text-sm text-gray-500 text-center py-4">No platform targets</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-white/10 sticky bottom-0 bg-[#0e0e18] pb-2">
                  <button
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-all"
                    onClick={() => {
                      setSheetOpen(false);
                      router.push(`/dashboard/create-post?postId=${selectedEvent.id}`);
                    }}
                  >
                    <Edit2 className="w-4 h-4" /> Edit Post
                  </button>
                  <button
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-sm font-medium border border-red-500/20 transition-all"
                    onClick={() => handleDeletePost(selectedEvent.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </>
  );
}
