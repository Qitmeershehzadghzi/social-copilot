"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';

interface SettingsProps {
  initialSubscription: any;
  usageStats: {
    posts: number;
    accounts: number;
    autoReplies: number;
  };
}

export default function SettingsClient({ initialSubscription, usageStats }: SettingsProps) {
  const { user, isLoaded } = useUser();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const [notifications, setNotifications] = useState({
    postPublished: false,
    postFailed: true,
    autoReplySent: false,
    weeklyDigest: true
  });
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  const plan = initialSubscription?.plan || 'free';
  const limits = {
    free: { posts: 10, accounts: 2, autoReplies: 10 },
    pro: { posts: 100, accounts: 10, autoReplies: 1000 },
    agency: { posts: 10000, accounts: 100, autoReplies: 100000 }
  }[plan as 'free' | 'pro' | 'agency'] || { posts: 10, accounts: 2, autoReplies: 10 };

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }
  }, [user]);

  useEffect(() => {
    fetch('/api/settings/notifications')
      .then(res => res.json())
      .then(data => {
        if (data.preferences) {
          setNotifications(prev => ({ ...prev, ...data.preferences }));
        }
      })
      .catch(console.error);
  }, []);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      await user.update({ firstName, lastName });
      alert('Profile updated successfully');
    } catch (error: any) {
      alert(error.errors?.[0]?.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSavingNotifications(true);
    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifications),
      });
      if (!res.ok) throw new Error('Failed to save');
      alert('Notification preferences saved');
    } catch (error) {
      alert('Failed to save notifications');
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleUpgrade = () => {
    // In a real app, this would use useClerk().openCheckout or redirect to Stripe
    alert('Clerk Checkout Integration Pending');
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel your subscription?')) {
      alert('Clerk Cancel Subscription Integration Pending');
    }
  };

  if (!isLoaded) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-gray-400">Manage your account settings and preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-lg">
          <TabsTrigger value="profile" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">Profile</TabsTrigger>
          <TabsTrigger value="billing" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">Billing</TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">Notifications</TabsTrigger>
        </TabsList>
        
        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Profile Information</CardTitle>
              <CardDescription className="text-gray-400">Update your personal details here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="w-20 h-20 border-2 border-purple-500">
                  <AvatarImage src={user?.imageUrl} />
                  <AvatarFallback className="bg-purple-600 text-white text-xl">
                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => alert('Use Clerk user profile popup to change image.')}>
                  Change Avatar
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">First Name</Label>
                  <Input 
                    value={firstName} 
                    onChange={e => setFirstName(e.target.value)} 
                    className="bg-black/50 border-white/10 text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Last Name</Label>
                  <Input 
                    value={lastName} 
                    onChange={e => setLastName(e.target.value)} 
                    className="bg-black/50 border-white/10 text-white" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Email Address</Label>
                <Input 
                  value={user?.primaryEmailAddress?.emailAddress || ''} 
                  disabled 
                  className="bg-black/20 border-white/10 text-gray-500 cursor-not-allowed" 
                />
                <p className="text-xs text-gray-500">Your email address is managed by Clerk and cannot be changed here.</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSaveProfile} 
                disabled={isSavingProfile}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSavingProfile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
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
                {plan === 'free' ? 'You are currently on the free tier.' : `Your subscription is active.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-300">Usage this month</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Posts Scheduled/Published</span>
                    <span className="text-white">{usageStats.posts} / {limits.posts}</span>
                  </div>
                  <Progress value={(usageStats.posts / limits.posts) * 100} className="h-2 bg-white/10 [&>div]:bg-purple-500" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Connected Accounts</span>
                    <span className="text-white">{usageStats.accounts} / {limits.accounts}</span>
                  </div>
                  <Progress value={(usageStats.accounts / limits.accounts) * 100} className="h-2 bg-white/10 [&>div]:bg-cyan-500" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Auto-Replies Sent</span>
                    <span className="text-white">{usageStats.autoReplies} / {limits.autoReplies}</span>
                  </div>
                  <Progress value={(usageStats.autoReplies / limits.autoReplies) * 100} className="h-2 bg-white/10 [&>div]:bg-emerald-500" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-4 border-t border-white/10 pt-6">
              {plan === 'free' ? (
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

          <h3 className="text-xl font-bold text-white mt-8 mb-4">Available Plans</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['free', 'pro', 'agency'].map(p => (
              <Card key={p} className={`bg-white/5 border-white/10 flex flex-col ${plan === p ? 'ring-2 ring-purple-500' : ''}`}>
                <CardHeader>
                  <CardTitle className="text-white capitalize">{p}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li>• {p === 'free' ? '10' : p === 'pro' ? '100' : '10,000'} Posts / month</li>
                    <li>• {p === 'free' ? '2' : p === 'pro' ? '10' : '100'} Accounts</li>
                    <li>• {p === 'free' ? '10' : p === 'pro' ? '1,000' : '100,000'} Auto-replies</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant={plan === p ? "secondary" : "outline"} 
                    className="w-full"
                    disabled={plan === p}
                    onClick={handleUpgrade}
                  >
                    {plan === p ? 'Current Plan' : 'Upgrade'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Notification Preferences</CardTitle>
              <CardDescription className="text-gray-400">Choose what you want to be notified about.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-white">Post Published</Label>
                  <p className="text-sm text-gray-400">Receive an email when a post is successfully published.</p>
                </div>
                <Switch 
                  checked={notifications.postPublished} 
                  onCheckedChange={c => setNotifications(prev => ({...prev, postPublished: c}))} 
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-white">Post Failed</Label>
                  <p className="text-sm text-gray-400">Receive an email if a scheduled post fails to publish.</p>
                </div>
                <Switch 
                  checked={notifications.postFailed} 
                  onCheckedChange={c => setNotifications(prev => ({...prev, postFailed: c}))} 
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-white">Auto-Reply Sent</Label>
                  <p className="text-sm text-gray-400">Receive an email when an auto-reply rule is triggered.</p>
                </div>
                <Switch 
                  checked={notifications.autoReplySent} 
                  onCheckedChange={c => setNotifications(prev => ({...prev, autoReplySent: c}))} 
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-white">Weekly Digest</Label>
                  <p className="text-sm text-gray-400">Get a weekly summary of your social media performance.</p>
                </div>
                <Switch 
                  checked={notifications.weeklyDigest} 
                  onCheckedChange={c => setNotifications(prev => ({...prev, weeklyDigest: c}))} 
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSaveNotifications} 
                disabled={isSavingNotifications}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {isSavingNotifications ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Preferences
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
