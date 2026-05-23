"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, MessageSquare, Users, TrendingUp, Clock, CheckCircle, Edit, RefreshCw, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  stats: {
    scheduledPosts: number;
    autoReplies: number;
    connectedAccounts: number;
    postsThisMonth: number;
  };
  upcomingPosts: Array<{
    time: string;
    platform: string;
    content: string;
    color: string;
  }>;
  recentActivity: Array<{
    action: string;
    platform: string;
    time: string;
    status: string;
  }>;
  performanceData?: Array<{
    date: string;
    published: number;
    failed: number;
  }>;
}

export default function DashboardClient({ stats, upcomingPosts, recentActivity, performanceData }: DashboardProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const statsCards = [
    {
      title: "Scheduled Posts",
      value: stats.scheduledPosts.toString(),
      change: "In the queue",
      icon: <Calendar className="w-5 h-5" />,
      gradient: "from-purple-600 to-pink-600",
    },
    {
      title: "Auto Replies",
      value: stats.autoReplies.toString(),
      change: "Sent this month",
      icon: <MessageSquare className="w-5 h-5" />,
      gradient: "from-cyan-600 to-blue-600",
    },
    {
      title: "Connected Accounts",
      value: stats.connectedAccounts.toString(),
      change: "Active integrations",
      icon: <Users className="w-5 h-5" />,
      gradient: "from-green-600 to-emerald-600",
    },
    {
      title: "Published",
      value: stats.postsThisMonth.toString(),
      change: "Posts this month",
      icon: <TrendingUp className="w-5 h-5" />,
      gradient: "from-orange-600 to-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <div
            key={stat.title}
            className={`transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: `${index * 100}ms` }}
          >
            <Card className="bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  {stat.title}
                </CardTitle>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                  <div className="text-white">
                    {stat.icon}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <p className="text-xs text-gray-400">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Upcoming Posts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Posts */}
        <div className={`transition-all duration-700 delay-300 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          <Card className="bg-white/5 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Upcoming Posts</CardTitle>
              <CardDescription className="text-gray-400">
                Posts scheduled in the future
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingPosts.length === 0 ? (
                  <p className="text-sm text-gray-500">No upcoming scheduled posts.</p>
                ) : (
                  upcomingPosts.map((post, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-white">{post.time}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className={`w-2 h-2 rounded-full ${post.color}`} />
                            <p className="text-sm text-gray-400">{post.platform} • {post.content}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className={`transition-all duration-700 delay-400 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          <Card className="bg-white/5 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Recent Activity</CardTitle>
              <CardDescription className="text-gray-400">
                Latest auto-replies and posts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-gray-500">No recent activity.</p>
                ) : (
                  recentActivity.map((activity, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${activity.status === 'success' || activity.status === 'published' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="text-sm font-medium text-white">{activity.action}</p>
                          <p className="text-sm text-gray-400">{activity.platform} • {activity.time}</p>
                        </div>
                      </div>
                      {activity.status === 'success' || activity.status === 'published' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Retry
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={`transition-all duration-700 delay-500 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}>
        <Card className="bg-white/5 backdrop-blur-sm border border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-gray-400">
              Get started with these common tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/dashboard/create-post">
                <Button 
                  className="w-full h-auto py-6 flex flex-col items-center justify-center space-y-3 bg-gradient-to-br from-purple-600/20 to-cyan-500/20 border border-purple-500/30 hover:border-purple-500/50 hover:from-purple-600/30 hover:to-cyan-500/30"
                >
                  <Calendar className="w-8 h-8 text-purple-400" />
                  <span className="text-white font-medium">Schedule Post</span>
                  <span className="text-gray-400 text-sm">Plan your content</span>
                </Button>
              </Link>
              <Link href="/dashboard/auto-replies">
                <Button 
                  variant="outline" 
                  className="w-full h-auto py-6 flex flex-col items-center justify-center space-y-3 border-white/20 text-white hover:bg-white/10"
                >
                  <MessageSquare className="w-8 h-8 text-cyan-400" />
                  <span className="font-medium">Create Auto-Reply Rule</span>
                  <span className="text-gray-400 text-sm">Automate responses</span>
                </Button>
              </Link>
              <Link href="/dashboard/accounts">
                <Button 
                  variant="outline" 
                  className="w-full h-auto py-6 flex flex-col items-center justify-center space-y-3 border-white/20 text-white hover:bg-white/10"
                >
                  <Users className="w-8 h-8 text-green-400" />
                  <span className="font-medium">Connect Account</span>
                  <span className="text-gray-400 text-sm">Add social platforms</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      {performanceData && performanceData.length > 0 && (
        <div className={`transition-all duration-700 delay-600 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          <Card className="bg-white/5 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Performance Overview</CardTitle>
              <CardDescription className="text-gray-400">
                Posts published vs failed over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPublished" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(10, 10, 15, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="published" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPublished)" name="Published" />
                    <Area type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorFailed)" name="Failed" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
