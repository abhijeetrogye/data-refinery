import axios from "axios";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 300000, // 5 minutes for large files
});

export const endpoints = {
  jobs: "/jobs",
  upload: "/jobs/upload",
  analytics: "/analytics",
};
