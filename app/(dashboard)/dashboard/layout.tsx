"use client";

import { useState, useEffect } from "react";
import { UserButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Calendar, MessageSquare, Settings, Users, FileText, Menu, X, Plus, Zap, LayoutDashboard, LineChart, Target } from 'lucide-react'
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getUserPlan } from '@/app/actions/user-plan'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useUser();
  const [plan, setPlan] = useState<string>('free');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    getUserPlan().then(setPlan);
    const timeoutId = window.setTimeout(() => setIsMounted(true), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const navItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", route: "/dashboard" },
    { icon: <Calendar className="w-5 h-5" />, label: "Calendar", route: "/dashboard/calendar" },
    { icon: <FileText className="w-5 h-5" />, label: "Content", route: "/dashboard/create-post" },
    { icon: <Target className="w-5 h-5" />, label: "Strategy", route: "/dashboard/strategy" },
    { icon: <MessageSquare className="w-5 h-5" />, label: "Auto Replies", route: "/dashboard/auto-replies" },
    { icon: <Users className="w-5 h-5" />, label: "Accounts", route: "/dashboard/accounts" },
    { icon: <LineChart className="w-5 h-5" />, label: "Analytics", route: "/dashboard/analytics" },
    { icon: <Settings className="w-5 h-5" />, label: "Settings", route: "/dashboard/settings" },
  ];

  const subtitles: Record<string, string> = {
    "Dashboard": "Welcome back! Here's what's happening today.",
    "Calendar": "Manage your scheduled posts and events.",
    "Content": "Create and edit your social media posts.",
    "Strategy": "Generate platform-ready monthly content plans.",
    "Auto Replies": "Configure automated responses for your accounts.",
    "Accounts": "Manage your connected social media profiles.",
    "Analytics": "View insights and performance metrics.",
    "Settings": "Update your preferences and billing details."
  };

  const currentPage = navItems.find(item => item.route === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.route));
  const pageTitle = currentPage?.label || 'Dashboard';
  const pageSubtitle = subtitles[pageTitle] || subtitles["Dashboard"];

  const planColors: Record<string, string> = {
    free: "text-gray-400",
    pro: "text-purple-400",
    agency: "text-cyan-400"
  };

  const planText = plan.charAt(0).toUpperCase() + plan.slice(1) + " Plan";

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Background Gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-cyan-900/10" />
      
      {/* Animated Orbs */}
      <div className="fixed top-1/4 left-1/4 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000" />

      {/* Sidebar - Desktop */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0a0f]/80 backdrop-blur-lg border-r border-white/10">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-white/10">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Social Copilot
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map((item) => {
              const isActive = item.route === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.route);
              return (
                <Button
                  key={item.label}
                  asChild
                  variant="ghost"
                  className={`w-full justify-start ${isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                  <Link href={item.route}>
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                  </Link>
                </Button>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center space-x-3">
              {isMounted ? (
                <UserButton />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/10" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user ? user.fullName : "Loading..."}
                </p>
                <p className={`text-xs truncate ${planColors[plan] || planColors.free}`}>{planText}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64 relative z-10">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 flex items-center h-16 px-4 sm:px-6 bg-[#0a0a0f]/80 backdrop-blur-lg border-b border-white/10">
          <div className="flex items-center justify-between flex-1">
            {/* Mobile Menu Button */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden text-gray-400 hover:text-white" />}>
                <Menu className="w-5 h-5" />
              </SheetTrigger>
              <SheetContent side="left" className="bg-[#0a0a0f] border-r border-white/10 w-64 p-0">
                <div className="flex flex-col h-full">
                  <div className="flex items-center h-16 px-6 border-b border-white/10">
                    <Link href="/dashboard" className="flex items-center space-x-2" onClick={() => setIsMobileMenuOpen(false)}>
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                        Social Copilot
                      </span>
                    </Link>
                    <SheetClose render={<Button variant="ghost" size="icon" className="ml-auto text-gray-400 hover:text-white" />}>
                      <X className="w-5 h-5" />
                    </SheetClose>
                  </div>
                  <nav className="flex-1 px-4 py-6 space-y-1">
                    {navItems.map((item) => {
                      const isActive = item.route === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.route);
                      return (
                        <Button
                          key={item.label}
                          asChild
                          variant="ghost"
                          className={`w-full justify-start ${isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Link href={item.route}>
                            {item.icon}
                            <span className="ml-3">{item.label}</span>
                          </Link>
                        </Button>
                      );
                    })}
                  </nav>
                  <div className="p-4 border-t border-white/10">
                    <div className="flex items-center space-x-3">
                      {isMounted ? (
                        <UserButton />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-white/10" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {user ? user.fullName : "Loading..."}
                        </p>
                        <p className={`text-xs truncate ${planColors[plan] || planColors.free}`}>{planText}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Page Title */}
            <div className="ml-4 lg:ml-0 flex-1">
              <h1 className="text-lg font-semibold text-white">{pageTitle}</h1>
              <p className="text-sm text-gray-400 hidden sm:block">{pageSubtitle}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <Button 
                asChild
                variant="outline" 
                size="sm"
                className="border-white/20 text-white hover:bg-white/10 hidden sm:flex"
              >
                <Link href="/dashboard/create-post">
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule Post
                </Link>
              </Button>
              <Button 
                asChild
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white"
              >
                <Link href="/dashboard/create-post">
                  <Zap className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Create Content</span>
                  <span className="sm:hidden">Create</span>
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
