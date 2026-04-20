export type PostCategory = "tech" | "notes" | "projects";

export type ToolStatus = "online" | "coming_soon";

export type ChatRole = "user" | "assistant" | "system";

export type Citation = {
  title: string;
  url?: string;
  snippet: string;
  score?: number;
};

export type PostListItem = {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  tags: string[];
  publishedAt?: string;
  readTimeMinutes?: number;
  views?: number;
  likes?: number;
};

export type ToolItem = {
  id: string;
  name: string;
  description?: string;
  status: ToolStatus;
  badgeText?: string;
};
