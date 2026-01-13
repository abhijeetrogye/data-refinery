"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Globe, Database, Loader2, CheckCircle } from "lucide-react";

interface Props {
    onJobCreated: () => void;
}

export function SourceIngestion({ onJobCreated }: Props) {
    const [apiUrl, setApiUrl] = useState("");
    const [dataPath, setDataPath] = useState("");
    const [dbQuery, setDbQuery] = useState("SELECT * FROM users LIMIT 100");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    const ingestFromApi = async () => {
        if (!apiUrl) return;
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            await api.post("/sources/ingest", {
                url: apiUrl,
                method: "GET",
                data_path: dataPath
            });
            setSuccess("API data ingested! Check jobs list.");
            setApiUrl("");
            setDataPath("");
            onJobCreated();
        } catch (e: any) {
            setError(e.response?.data?.detail || "Failed to ingest from API");
        } finally {
            setLoading(false);
        }
    };

    const ingestFromDatabase = async () => {
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            await api.post("/sources/database", {
                connection_string: "mock://localhost:5432/demo",
                query: dbQuery,
                db_type: "postgresql"
            });
            setSuccess("Database query executed! Check jobs list.");
            onJobCreated();
        } catch (e: any) {
            setError(e.response?.data?.detail || "Failed to query database");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="premium-card border-0">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-pink-500/20">
                        <Globe className="h-5 w-5 text-orange-400" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">External Data Sources</CardTitle>
                        <CardDescription>Ingest data from APIs or databases</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="api">
                    <TabsList className="glass mb-4 p-1 w-auto inline-flex">
                        <TabsTrigger
                            value="api"
                            className="px-4 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
                        >
                            <Globe className="mr-2 h-4 w-4" />
                            REST API
                        </TabsTrigger>
                        <TabsTrigger
                            value="db"
                            className="px-4 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
                        >
                            <Database className="mr-2 h-4 w-4" />
                            Database
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="api" className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/80">API Endpoint URL</label>
                            <Input
                                placeholder="https://api.example.com/data"
                                value={apiUrl}
                                onChange={(e) => setApiUrl(e.target.value)}
                                className="bg-white/5 border-white/10 focus:border-purple-500/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/80">Data Path (optional)</label>
                            <Input
                                placeholder="e.g., results or data.items"
                                value={dataPath}
                                onChange={(e) => setDataPath(e.target.value)}
                                className="bg-white/5 border-white/10 focus:border-purple-500/50"
                            />
                            <p className="text-xs text-muted-foreground">
                                Path to the data array in the JSON response
                            </p>
                        </div>
                        <Button
                            onClick={ingestFromApi}
                            disabled={!apiUrl || loading}
                            className="btn-gradient text-white"
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
                            Fetch from API
                        </Button>
                    </TabsContent>

                    <TabsContent value="db" className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/80">SQL Query</label>
                            <Input
                                placeholder="SELECT * FROM users LIMIT 100"
                                value={dbQuery}
                                onChange={(e) => setDbQuery(e.target.value)}
                                className="bg-white/5 border-white/10 focus:border-purple-500/50"
                            />
                            <p className="text-xs text-muted-foreground">
                                Demo mode: Returns mock data regardless of query
                            </p>
                        </div>
                        <Button
                            onClick={ingestFromDatabase}
                            disabled={loading}
                            className="btn-gradient text-white"
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                            Execute Query
                        </Button>
                    </TabsContent>
                </Tabs>

                {success && (
                    <Alert className="mt-4 bg-green-500/10 border-green-500/30">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <AlertDescription className="text-green-400">{success}</AlertDescription>
                    </Alert>
                )}

                {error && (
                    <Alert className="mt-4 bg-red-500/10 border-red-500/30">
                        <AlertDescription className="text-red-400">{error}</AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}

