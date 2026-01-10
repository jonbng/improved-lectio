import type { Cookie as PuppeteerCookie } from "puppeteer";

export interface School {
  id: string;
  name: string;
  url: string;
}

export interface StoredCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export interface CookieStore {
  schoolId: string;
  schoolName: string;
  cookies: StoredCookie[];
  savedAt: number;
}

export interface Config {
  lastSchool?: {
    id: string;
    name: string;
  };
  chromePath?: string;
  defaultOutputDir?: string;
}

export interface SchoolCache {
  schools: School[];
  fetchedAt: number;
}

export interface AuthResult {
  success: boolean;
  cookies: PuppeteerCookie[];
  error?: string;
}

export interface FetchResult {
  status: number;
  url: string;
  headers: Record<string, string>;
  body: string;
  redirected: boolean;
}

export interface SessionStatus {
  authenticated: boolean;
  school?: {
    id: string;
    name: string;
  };
  session?: {
    valid: boolean;
    expiresIn: number; // seconds remaining
    lastActivity: string; // ISO date string
  };
}

export type OutputFormat = "text" | "json";
