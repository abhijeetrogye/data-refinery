"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Settings, Moon, Sun, Server, Database, Bell, Shield, Palette, Trash2, Loader2, Check, X, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api, endpoints } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

export default function SettingsPage() {
    const queryClient = useQueryClient();
    const [darkMode, setDarkMode] = useState(false);
    const [notifications, setNotifications] = useState(true);
    const [autoProcess, setAutoProcess] = useState(false);
    const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
    const [clearing, setClearing] = useState(false);

    // Load all settings from localStorage on mount
    useEffect(() => {
        // Theme
        const savedTheme = localStorage.getItem('theme');
        const isDark = savedTheme === 'dark' || document.documentElement.classList.contains('dark');
        setDarkMode(isDark);
        if (isDark) document.documentElement.classList.add('dark');

        // Other settings
        const savedNotifications = localStorage.getItem('notifications');
        if (savedNotifications !== null) setNotifications(savedNotifications === 'true');

        const savedAutoProcess = localStorage.getItem('autoProcess');
        if (savedAutoProcess !== null) setAutoProcess(savedAutoProcess === 'true');

        // Check API status
        checkApiStatus();
    }, []);

    const checkApiStatus = async () => {
        setApiStatus('checking');
        try {
            await api.get('/jobs/');
            setApiStatus('connected');
        } catch {
            setApiStatus('disconnected');
        }
    };

    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        if (newMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
        toast.success(`Theme changed to ${newMode ? 'dark' : 'light'} mode`);
    };

    const toggleNotifications = (value: boolean) => {
        setNotifications(value);
        localStorage.setItem('notifications', String(value));
        toast.success(value ? 'Notifications enabled' : 'Notifications disabled');
    };

    const toggleAutoProcess = (value: boolean) => {
        setAutoProcess(value);
        localStorage.setItem('autoProcess', String(value));
        // Dispatch custom event so FileUploader in same tab gets notified
        window.dispatchEvent(new Event('localStorageChange'));
        toast.success(value ? 'Auto-processing enabled' : 'Auto-processing disabled');
    };

    const clearAllData = async () => {
        if (!confirm('Are you sure you want to delete all jobs and data? This cannot be undone.')) {
            return;
        }

        setClearing(true);
        try {
            // Get all jobs and delete them
            const response = await api.get<{ id: number }[]>('/jobs/');
            const jobs = response.data;

            for (const job of jobs) {
                await api.delete(`/jobs/${job.id}`);
            }

            queryClient.invalidateQueries({ queryKey: ['jobs'] });
            toast.success(`Deleted ${jobs.length} jobs successfully`);
        } catch (error) {
            toast.error('Failed to clear data');
        } finally {
            setClearing(false);
        }
    };

    return (
        <AppShell>
            <div className="space-y-8 animate-slide-up max-w-4xl mx-auto">

                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Settings className="h-8 w-8 text-primary" />
                        Settings
                    </h1>
                    <p className="text-muted-foreground">Manage your application preferences and configuration.</p>
                </div>

                {/* Appearance Section */}
                <Card className="glass-panel">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Palette className="h-5 w-5 text-primary" />
                            Appearance
                        </CardTitle>
                        <CardDescription>Customize how the application looks</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="dark-mode" className="text-base font-medium">Dark Mode</Label>
                                <p className="text-sm text-muted-foreground">Switch between light and dark theme</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Sun className={`h-4 w-4 ${!darkMode ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                                <Switch
                                    id="dark-mode"
                                    checked={darkMode}
                                    onCheckedChange={toggleDarkMode}
                                />
                                <Moon className={`h-4 w-4 ${darkMode ? 'text-blue-500' : 'text-muted-foreground'}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Processing Preferences */}
                <Card className="glass-panel">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5 text-primary" />
                            Processing Preferences
                        </CardTitle>
                        <CardDescription>Configure data processing behavior</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="auto-process" className="text-base font-medium">Auto-Process Uploads</Label>
                                <p className="text-sm text-muted-foreground">Automatically start processing when a file is uploaded</p>
                            </div>
                            <Switch
                                id="auto-process"
                                checked={autoProcess}
                                onCheckedChange={toggleAutoProcess}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="notifications" className="text-base font-medium">Notifications</Label>
                                <p className="text-sm text-muted-foreground">Receive notifications for job completions and errors</p>
                            </div>
                            <Switch
                                id="notifications"
                                checked={notifications}
                                onCheckedChange={toggleNotifications}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* API Configuration */}
                <Card className="glass-panel">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Server className="h-5 w-5 text-primary" />
                            API Configuration
                        </CardTitle>
                        <CardDescription>Backend connection settings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>API Base URL</Label>
                            <Input
                                value={process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001/api/v1"}
                                readOnly
                                className="bg-muted/50 font-mono text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Request Timeout</Label>
                                <Input value="5 minutes" readOnly className="bg-muted/50" />
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/50">
                                    {apiStatus === 'checking' && (
                                        <>
                                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground">Checking...</span>
                                        </>
                                    )}
                                    {apiStatus === 'connected' && (
                                        <>
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <span className="text-sm text-emerald-600">Connected</span>
                                        </>
                                    )}
                                    {apiStatus === 'disconnected' && (
                                        <>
                                            <X className="h-3 w-3 text-rose-500" />
                                            <span className="text-sm text-rose-600">Disconnected</span>
                                        </>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={checkApiStatus}>
                                        <RefreshCw className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Security */}
                <Card className="glass-panel">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            Security & Data
                        </CardTitle>
                        <CardDescription>Security and privacy settings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                            <div>
                                <p className="font-medium">Data Retention</p>
                                <p className="text-sm text-muted-foreground">Processed files are kept for 30 days</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => toast.info('Data retention settings coming soon')}>
                                Change
                            </Button>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                            <div>
                                <p className="font-medium text-rose-700 dark:text-rose-400">Clear All Data</p>
                                <p className="text-sm text-rose-600/70 dark:text-rose-500/70">Delete all jobs and processed files permanently</p>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={clearAllData}
                                disabled={clearing}
                            >
                                {clearing ? (
                                    <>
                                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                        Clearing...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="h-3 w-3 mr-2" />
                                        Clear All
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </AppShell>
    );
}

