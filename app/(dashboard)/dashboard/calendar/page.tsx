"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { Calendar, momentLocalizer, Views, type CalendarProps, type View } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import {
  addDays,
  addMinutes,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  formatDistanceToNow,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORMS } from "@/lib/platforms";

const localizer = momentLocalizer(moment);

type PostStatus = "draft" | "scheduled" | "published" | "failed";
type TargetStatus = "pending" | "published" | "failed";

type PostTarget = {
  id: string;
  platform: string;
  status: TargetStatus;
  errorMessage?: string | null;
  platformPostId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type MediaAsset = {
  id: string;
  url: string;
  type: "image" | "video";
};

type ScheduledPost = {
  id: string;
  content: string;
  status: PostStatus;
  scheduledAt: string | null;
  scheduledEndAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  targets: PostTarget[];
  mediaAssets: MediaAsset[];
};

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    post: ScheduledPost;
    platforms: string[];
    primaryPlatform: string;
    status: PostStatus;
  };
};

type CalendarToolbarProps = {
  date: Date;
  label: string;
  view: View;
  onNavigate: (action: "PREV" | "NEXT" | "TODAY") => void;
  onView: (view: View) => void;
  platformFilters: string[];
  onToggleFilter: (platform: string) => void;
  searchQuery: string;
  onSearch: (value: string) => void;
  stats: {
    total: number;
    draft: number;
    scheduled: number;
    published: number;
    failed: number;
  };
  isRefreshing: boolean;
  onRefresh: () => void;
};

const DnDCalendar = withDragAndDrop<CalendarEvent, object>(
  Calendar as unknown as ComponentType<CalendarProps<CalendarEvent, object>>
);

const PLATFORM_COLORS: Record<string, string> = Object.fromEntries(
  PLATFORMS.map((platform) => [platform.id, platform.dotClass.startsWith("bg-[") ? platform.dotClass.slice(4, -1) : "#8B5CF6"])
);

const ALL_PLATFORMS = Array.from(new Set([...PLATFORMS.map((platform) => platform.id), "threads"]));
const SUPPORTED_VIEWS: View[] = [Views.MONTH, Views.WEEK, Views.DAY];

const STATUS_STYLES: Record<PostStatus, { color: string; bg: string; border: string; label: string; icon: typeof AlertCircle }> = {
  draft: {
    color: "#94a3b8",
    bg: "rgba(148, 163, 184, 0.12)",
    border: "rgba(148, 163, 184, 0.42)",
    label: "Draft",
    icon: Edit2,
  },
  scheduled: {
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.45)",
    label: "Scheduled",
    icon: Clock,
  },
  published: {
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.45)",
    label: "Published",
    icon: CheckCircle2,
  },
  failed: {
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.12)",
    border: "rgba(239, 68, 68, 0.45)",
    label: "Failed",
    icon: XCircle,
  },
};

function getVisibleRange(date: Date, view: View) {
  if (view === Views.WEEK) {
    return {
      start: startOfWeek(date),
      end: endOfWeek(date),
    };
  }

  if (view === Views.DAY) {
    return {
      start: startOfDay(date),
      end: endOfDay(date),
    };
  }

  if (view === Views.AGENDA) {
    return {
      start: startOfDay(date),
      end: endOfDay(addDays(date, 30)),
    };
  }

  return {
    start: startOfWeek(startOfMonth(date)),
    end: endOfWeek(endOfMonth(date)),
  };
}

function getEventDate(post: ScheduledPost) {
  return post.scheduledAt || post.publishedAt;
}

function toEvent(post: ScheduledPost): CalendarEvent | null {
  const dateValue = getEventDate(post);
  if (!dateValue) return null;

  const start = new Date(dateValue);
  if (Number.isNaN(start.getTime())) return null;

  const parsedEnd = post.scheduledEndAt ? new Date(post.scheduledEndAt) : null;
  const end = parsedEnd && !Number.isNaN(parsedEnd.getTime()) && parsedEnd > start
    ? parsedEnd
    : addMinutes(start, 30);
  const platforms = post.targets.map((target) => target.platform);

  return {
    id: post.id,
    title: post.content.trim()
      ? post.content.trim().slice(0, 80) + (post.content.trim().length > 80 ? "..." : "")
      : "Untitled post",
    start,
    end,
    resource: {
      post,
      platforms,
      primaryPlatform: platforms[0] || "draft",
      status: post.status,
    },
  };
}

function formatDateInput(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function formatTimeInput(date: Date) {
  return format(date, "HH:mm");
}

function combineLocalDateTime(dateValue: string, timeValue: string) {
  const date = new Date(`${dateValue}T${timeValue || "00:00"}:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function updatePostInList(posts: ScheduledPost[], updated: ScheduledPost) {
  return posts.map((post) => post.id === updated.id ? updated : post);
}

function CalendarToolbar({
  label,
  view,
  onNavigate,
  onView,
  platformFilters,
  onToggleFilter,
  searchQuery,
  onSearch,
  stats,
  isRefreshing,
  onRefresh,
}: CalendarToolbarProps) {
  const router = useRouter();

  return (
    <div className="mb-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => onNavigate("PREV")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => onNavigate("TODAY")}>
            Today
          </Button>
          <Button type="button" variant="outline" size="icon" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => onNavigate("NEXT")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="ml-2 text-lg font-semibold tracking-tight text-white sm:text-xl">{label}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-white/10 bg-white/5 p-1">
            {([Views.MONTH, Views.WEEK, Views.DAY] as View[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onView(item)}
                className={`rounded px-3 py-1.5 text-xs font-medium capitalize transition ${view === item ? "bg-cyan-500 text-black" : "text-gray-400 hover:bg-white/10 hover:text-white"}`}
              >
                {item}
              </button>
            ))}
          </div>
          <Button type="button" variant="outline" size="icon" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button type="button" className="bg-gradient-to-r from-purple-600 to-cyan-500 text-white" onClick={() => router.push("/dashboard/create-post")}>
            <Plus className="mr-2 h-4 w-4" />
            New Post
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ["Total", stats.total, "text-white"],
          ["Draft", stats.draft, "text-slate-300"],
          ["Scheduled", stats.scheduled, "text-amber-300"],
          ["Published", stats.published, "text-emerald-300"],
          ["Failed", stats.failed, "text-red-300"],
        ].map(([labelText, value, color]) => (
          <div key={labelText} className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-xs text-gray-500">{labelText}</p>
            <p className={`mt-1 text-lg font-semibold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 md:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search scheduled posts"
            className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-gray-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_PLATFORMS.map((platform) => {
            const active = platformFilters.includes(platform);
            const color = PLATFORM_COLORS[platform] || "#8B5CF6";
            return (
              <button
                key={platform}
                type="button"
                onClick={() => onToggleFilter(platform)}
                className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition ${active ? "text-white" : "border-white/10 text-gray-500 hover:text-gray-300"}`}
                style={active ? { borderColor: `${color}66`, backgroundColor: `${color}1f` } : undefined}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: active ? color : "#475569" }} />
                {platform}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  const platformColor = PLATFORM_COLORS[event.resource.primaryPlatform] || "#8B5CF6";
  const statusStyle = STATUS_STYLES[event.resource.status];

  return (
    <div className="flex h-full min-w-0 items-center gap-1.5 overflow-hidden text-xs">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: platformColor }} />
      <span className="truncate font-medium">{event.title}</span>
      <span className="ml-auto shrink-0 rounded px-1 text-[10px]" style={{ color: statusStyle.color }}>
        {statusStyle.label}
      </span>
    </div>
  );
}

export default function CalendarPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [currentView, setCurrentView] = useState<View>(() => {
    if (typeof window === "undefined") return Views.MONTH;
    const saved = window.localStorage.getItem("social-copilot-calendar-view") as View | null;
    return saved && SUPPORTED_VIEWS.includes(saved) ? saved : Views.MONTH;
  });
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    if (typeof window === "undefined") return new Date();
    const saved = window.localStorage.getItem("social-copilot-calendar-date");
    const parsed = saved ? new Date(saved) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();
  });
  const [platformFilters, setPlatformFilters] = useState<string[]>(ALL_PLATFORMS);
  const [searchQuery, setSearchQuery] = useState("");

  const visibleRange = useMemo(() => getVisibleRange(currentDate, currentView), [currentDate, currentView]);

  const fetchPosts = useCallback(async (options?: { quiet?: boolean }) => {
    if (options?.quiet) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        start: visibleRange.start.toISOString(),
        end: visibleRange.end.toISOString(),
      });
      const res = await fetch(`/api/posts?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as ScheduledPost[];
      setPosts(data);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Failed to load calendar";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [visibleRange.end, visibleRange.start]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchPosts();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchPosts]);

  useEffect(() => {
    window.localStorage.setItem("social-copilot-calendar-view", currentView);
    window.localStorage.setItem("social-copilot-calendar-date", currentDate.toISOString());
  }, [currentDate, currentView]);

  useEffect(() => {
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") void fetchPosts({ quiet: true });
    };
    document.addEventListener("visibilitychange", refreshOnFocus);
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      document.removeEventListener("visibilitychange", refreshOnFocus);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [fetchPosts]);

  const events = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return posts
      .map(toEvent)
      .filter((event): event is CalendarEvent => Boolean(event))
      .filter((event) => !query || event.resource.post.content.toLowerCase().includes(query) || event.resource.platforms.some((platform) => platform.includes(query)))
      .filter((event) => event.resource.platforms.length === 0 || event.resource.platforms.some((platform) => platformFilters.includes(platform)));
  }, [platformFilters, posts, searchQuery]);

  const stats = useMemo(() => ({
    total: events.length,
    draft: events.filter((event) => event.resource.status === "draft").length,
    scheduled: events.filter((event) => event.resource.status === "scheduled").length,
    published: events.filter((event) => event.resource.status === "published").length,
    failed: events.filter((event) => event.resource.status === "failed").length,
  }), [events]);

  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedPostId) || null, [events, selectedPostId]);

  const toggleFilter = (platform: string) => {
    setPlatformFilters((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
  };

  const patchSchedule = useCallback(async (event: CalendarEvent, start: Date, end: Date) => {
    const previousPosts = posts;
    const optimisticPost: ScheduledPost = {
      ...event.resource.post,
      status: event.resource.post.status === "draft" ? "draft" : "scheduled",
      scheduledAt: start.toISOString(),
      scheduledEndAt: end.toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setPosts((current) => updatePostInList(current, optimisticPost));

    try {
      const res = await fetch(`/api/posts/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: start.toISOString(),
          scheduledEndAt: end.toISOString(),
          status: optimisticPost.status,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json() as ScheduledPost;
      setPosts((current) => updatePostInList(current, updated));
      const updatedEvent = toEvent(updated);
      if (updatedEvent && updated.id === selectedPostId) {
        setScheduleDate(formatDateInput(updatedEvent.start));
        setStartTime(formatTimeInput(updatedEvent.start));
        setEndTime(formatTimeInput(updatedEvent.end));
      }
      toast.success("Schedule updated");
    } catch (patchError) {
      setPosts(previousPosts);
      toast.error(patchError instanceof Error ? patchError.message : "Failed to update schedule");
    }
  }, [posts, selectedPostId]);

  const handleEventDrop = useCallback((payload: { event: CalendarEvent; start: Date | string; end: Date | string }) => {
    const start = new Date(payload.start);
    const end = new Date(payload.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      toast.error("Invalid schedule date");
      return;
    }
    void patchSchedule(payload.event, start, end);
  }, [patchSchedule]);

  const handleEventResize = useCallback((payload: { event: CalendarEvent; start: Date | string; end: Date | string }) => {
    const start = new Date(payload.start);
    const end = new Date(payload.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      toast.error("Invalid event duration");
      return;
    }
    void patchSchedule(payload.event, start, end);
  }, [patchSchedule]);

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedPostId(event.id);
    setScheduleDate(formatDateInput(event.start));
    setStartTime(formatTimeInput(event.start));
    setEndTime(formatTimeInput(event.end));
    setSheetOpen(true);
  };

  const handleSelectSlot = ({ start }: { start: Date }) => {
    router.push(`/dashboard/create-post?date=${encodeURIComponent(start.toISOString())}`);
  };

  const saveDrawerSchedule = async () => {
    if (!selectedEvent) return;

    const start = combineLocalDateTime(scheduleDate, startTime);
    const end = combineLocalDateTime(scheduleDate, endTime);
    if (!start || !end || end <= start) {
      toast.error("Choose a valid start and end time");
      return;
    }

    setIsSavingSchedule(true);
    await patchSchedule(selectedEvent, start, end);
    setIsSavingSchedule(false);
  };

  const deletePost = async () => {
    if (!selectedEvent) return;
    if (!confirm("Delete this scheduled post?")) return;

    const previousPosts = posts;
    setPosts((current) => current.filter((post) => post.id !== selectedEvent.id));
    setSheetOpen(false);
    setSelectedPostId(null);

    try {
      const res = await fetch(`/api/posts/${selectedEvent.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Post deleted");
    } catch (deleteError) {
      setPosts(previousPosts);
      toast.error(deleteError instanceof Error ? deleteError.message : "Failed to delete post");
    }
  };

  const copyContent = async () => {
    if (!selectedEvent) return;
    await navigator.clipboard.writeText(selectedEvent.resource.post.content);
    toast.success("Copied to clipboard");
  };

  const eventPropGetter = (event: CalendarEvent) => {
    const status = STATUS_STYLES[event.resource.status];
    const platformColor = PLATFORM_COLORS[event.resource.primaryPlatform] || status.color;

    return {
      style: {
        backgroundColor: status.bg,
        border: `1px solid ${status.border}`,
        borderLeft: `4px solid ${platformColor}`,
        borderRadius: "6px",
        color: "#fff",
        padding: "2px 6px",
        boxShadow: "0 10px 24px rgba(0,0,0,0.16)",
      },
    };
  };

  const selectedStatus = selectedEvent ? STATUS_STYLES[selectedEvent.resource.status] : null;
  const SelectedStatusIcon = selectedStatus?.icon || AlertCircle;

  return (
    <>
      <style>{`
        .rbc-calendar { background: transparent; color: white; font-family: inherit; }
        .rbc-header { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.08) !important; color: #9ca3af; font-weight: 600; font-size: 12px; text-transform: uppercase; padding: 10px 8px; }
        .rbc-month-view, .rbc-time-view, .rbc-agenda-view { border-color: rgba(255,255,255,0.08) !important; border-radius: 8px; overflow: hidden; }
        .rbc-day-bg + .rbc-day-bg, .rbc-month-row, .rbc-month-row + .rbc-month-row, .rbc-timeslot-group, .rbc-time-content, .rbc-time-header-content { border-color: rgba(255,255,255,0.06) !important; }
        .rbc-off-range-bg { background: rgba(0,0,0,0.18); }
        .rbc-today { background: rgba(6,182,212,0.08) !important; }
        .rbc-date-cell { color: #d1d5db; font-size: 12px; padding: 6px 8px; }
        .rbc-date-cell.rbc-now { color: #67e8f9; font-weight: 700; }
        .rbc-time-slot { border-color: rgba(255,255,255,0.04) !important; color: #6b7280; font-size: 11px; }
        .rbc-current-time-indicator { background: #22d3ee; }
        .rbc-show-more { color: #67e8f9; font-size: 11px; font-weight: 600; }
        .rbc-toolbar { display: none; }
        .rbc-event { cursor: grab; transition: transform 160ms ease, box-shadow 160ms ease; }
        .rbc-event:hover { transform: translateY(-1px); }
        .rbc-event:focus, .rbc-selected { outline: 2px solid rgba(34,211,238,0.55) !important; }
        .rbc-event-label { color: rgba(255,255,255,0.72); font-size: 10px; }
        .rbc-slot-selection, .rbc-addons-dnd-over { background: rgba(34,211,238,0.14) !important; border: 1px solid rgba(34,211,238,0.4); }
        .rbc-agenda-table { color: #e5e7eb; border-color: rgba(255,255,255,0.08) !important; }
        .rbc-agenda-table tbody > tr > td, .rbc-agenda-table thead th { border-color: rgba(255,255,255,0.06) !important; }
      `}</style>

      <div className="flex h-[calc(100vh-6rem)] flex-col text-white">
        <CalendarToolbar
          date={currentDate}
          label={format(currentDate, currentView === Views.DAY ? "EEEE, MMMM d, yyyy" : "MMMM yyyy")}
          view={currentView}
          onNavigate={(action) => {
            if (action === "TODAY") setCurrentDate(new Date());
            if (action === "PREV") setCurrentDate((date) => currentView === Views.DAY ? addDays(date, -1) : currentView === Views.WEEK ? addDays(date, -7) : new Date(date.getFullYear(), date.getMonth() - 1, 1));
            if (action === "NEXT") setCurrentDate((date) => currentView === Views.DAY ? addDays(date, 1) : currentView === Views.WEEK ? addDays(date, 7) : new Date(date.getFullYear(), date.getMonth() + 1, 1));
          }}
          onView={setCurrentView}
          platformFilters={platformFilters}
          onToggleFilter={toggleFilter}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          stats={stats}
          isRefreshing={isRefreshing}
          onRefresh={() => void fetchPosts({ quiet: true })}
        />

        <div className="relative min-h-0 flex-1">
          <DnDCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={currentView}
            date={currentDate}
            onNavigate={setCurrentDate}
            onView={setCurrentView}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            selectable
            resizable
            popup
            eventPropGetter={eventPropGetter}
            components={{
              event: EventCard,
              toolbar: () => null,
            }}
            style={{ height: "100%" }}
          />

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40 backdrop-blur-sm">
              <div className="flex items-center gap-2 rounded-md border border-white/10 bg-[#13131a] px-4 py-3 text-sm text-gray-300">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                Loading calendar
              </div>
            </div>
          )}

          {!isLoading && !error && events.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="max-w-sm rounded-md border border-white/10 bg-[#13131a]/95 p-6 text-center shadow-2xl">
                <CalendarIcon className="mx-auto h-9 w-9 text-cyan-400" />
                <h3 className="mt-3 text-lg font-semibold text-white">No posts on this calendar</h3>
                <p className="mt-2 text-sm leading-6 text-gray-400">Create or schedule a post, then it will appear here instantly after the calendar refreshes.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex w-full flex-col overflow-y-auto border-white/10 bg-[#0e0e18] text-white sm:max-w-lg">
          <SheetHeader className="border-b border-white/10 pb-4">
            <SheetTitle className="flex items-center gap-2 text-white">
              <CalendarIcon className="h-5 w-5 text-cyan-400" />
              Schedule Details
            </SheetTitle>
          </SheetHeader>

          {selectedEvent && selectedStatus && (
            <div className="flex flex-1 flex-col gap-5 pt-5">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="outline" className="gap-1.5 border-white/10 px-3 py-1.5" style={{ color: selectedStatus.color, backgroundColor: selectedStatus.bg, borderColor: selectedStatus.border }}>
                  <SelectedStatusIcon className="h-3.5 w-3.5" />
                  {selectedStatus.label}
                </Badge>
                <span className="text-xs text-gray-500">
                  Updated {formatDistanceToNow(new Date(selectedEvent.resource.post.updatedAt), { addSuffix: true })}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-gray-500">Content</p>
                  <button type="button" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white" onClick={copyContent}>
                    <Copy className="h-3 w-3" />
                    Copy
                  </button>
                </div>
                <Textarea value={selectedEvent.resource.post.content} readOnly className="min-h-32 resize-none border-white/10 bg-white/5 text-gray-200" />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-1">
                  <label className="text-xs font-semibold uppercase text-gray-500">Date</label>
                  <Input type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} className="border-white/10 bg-white/5 text-white" disabled={selectedEvent.resource.status === "published"} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-gray-500">Start</label>
                  <Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="border-white/10 bg-white/5 text-white" disabled={selectedEvent.resource.status === "published"} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-gray-500">End</label>
                  <Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="border-white/10 bg-white/5 text-white" disabled={selectedEvent.resource.status === "published"} />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-gray-500">Platforms</p>
                <div className="space-y-2">
                  {selectedEvent.resource.post.targets.length > 0 ? selectedEvent.resource.post.targets.map((target) => {
                    const platformColor = PLATFORM_COLORS[target.platform] || "#8B5CF6";
                    return (
                      <div key={target.id} className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2">
                        <span className="inline-flex items-center gap-2 text-sm capitalize text-gray-200">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: platformColor }} />
                          {target.platform}
                        </span>
                        <Badge variant="outline" className="border-white/10 capitalize text-gray-300">{target.status}</Badge>
                      </div>
                    );
                  }) : (
                    <p className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-gray-400">No platform targets yet.</p>
                  )}
                </div>
              </div>

              <div className="mt-auto flex flex-wrap gap-2 border-t border-white/10 pt-4">
                <Button type="button" className="bg-cyan-500 text-black hover:bg-cyan-400" onClick={saveDrawerSchedule} disabled={isSavingSchedule || selectedEvent.resource.status === "published"}>
                  {isSavingSchedule ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Schedule
                </Button>
                <Button type="button" variant="outline" className="border-white/10 text-white hover:bg-white/10" onClick={() => router.push(`/dashboard/create-post?postId=${selectedEvent.id}`)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Post
                </Button>
                <Button type="button" variant="outline" className="ml-auto border-red-500/30 text-red-300 hover:bg-red-500/10" onClick={deletePost}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
