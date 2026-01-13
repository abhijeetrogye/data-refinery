"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send, HelpCircle, Bug, Lightbulb, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function FeedbackPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [category, setCategory] = useState("");
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !email || !category || !message) {
            toast.error("Please fill in all fields");
            return;
        }

        setIsSubmitting(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        setIsSubmitting(false);
        setIsSubmitted(true);
        toast.success("Thank you for your feedback!");

        // Reset form after 3 seconds
        setTimeout(() => {
            setName("");
            setEmail("");
            setCategory("");
            setMessage("");
            setIsSubmitted(false);
        }, 3000);
    };

    return (
        <AppShell>
            <div className="space-y-8 animate-slide-up max-w-2xl mx-auto">

                {/* Header */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center justify-center gap-3">
                        <MessageSquare className="h-8 w-8 text-primary" />
                        Feedback & Support
                    </h1>
                    <p className="text-muted-foreground mt-2">We'd love to hear from you! Share your thoughts or report issues.</p>
                </div>

                {/* Feedback Form */}
                <Card className="glass-panel">
                    <CardHeader>
                        <CardTitle>Send us a message</CardTitle>
                        <CardDescription>Your feedback helps us improve Data Refinery</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isSubmitted ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                                </div>
                                <h3 className="text-xl font-semibold">Thank you!</h3>
                                <p className="text-muted-foreground mt-2">We've received your feedback and will get back to you soon.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Your Name</Label>
                                        <Input
                                            id="name"
                                            placeholder="John Doe"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="john@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select value={category} onValueChange={setCategory}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="bug">
                                                <div className="flex items-center gap-2">
                                                    <Bug className="h-4 w-4 text-rose-500" />
                                                    Bug Report
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="feature">
                                                <div className="flex items-center gap-2">
                                                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                                                    Feature Request
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="question">
                                                <div className="flex items-center gap-2">
                                                    <HelpCircle className="h-4 w-4 text-blue-500" />
                                                    General Question
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="other">
                                                <div className="flex items-center gap-2">
                                                    <MessageSquare className="h-4 w-4 text-primary" />
                                                    Other
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="message">Your Message</Label>
                                    <Textarea
                                        id="message"
                                        placeholder="Tell us what's on your mind..."
                                        rows={5}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className="resize-none"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    size="lg"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>Sending...</>
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4 mr-2" />
                                            Send Feedback
                                        </>
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Help Section */}
                <div className="grid grid-cols-3 gap-4">
                    <Card className="glass-panel text-center p-4 hover:border-primary/50 transition-colors cursor-pointer">
                        <HelpCircle className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                        <h4 className="font-medium text-sm">Documentation</h4>
                        <p className="text-xs text-muted-foreground mt-1">Browse our docs</p>
                    </Card>
                    <Card className="glass-panel text-center p-4 hover:border-primary/50 transition-colors cursor-pointer">
                        <Bug className="h-8 w-8 text-rose-500 mx-auto mb-2" />
                        <h4 className="font-medium text-sm">Report a Bug</h4>
                        <p className="text-xs text-muted-foreground mt-1">Help us improve</p>
                    </Card>
                    <Card className="glass-panel text-center p-4 hover:border-primary/50 transition-colors cursor-pointer">
                        <Lightbulb className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                        <h4 className="font-medium text-sm">Feature Ideas</h4>
                        <p className="text-xs text-muted-foreground mt-1">Share your ideas</p>
                    </Card>
                </div>

            </div>
        </AppShell>
    );
}
