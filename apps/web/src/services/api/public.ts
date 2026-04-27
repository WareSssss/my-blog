import { apiGet } from './http';

export type PublicProfile = {
  name?: string;
  alias?: string;
  title?: string;
  intro?: string;
};

export type PublicContacts = {
  email?: string;
  wechat?: string;
  github?: string;
};

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  sort: number;
};

export type PublicAiConfig = {
  title?: string;
  subtitle?: string;
  status?: string;
  quickPrompts?: string[];
  models?: { id: string; label: string }[];
};

export type PublicTool = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  status: "online" | "coming_soon";
  routePath: string | null;
  externalUrl: string | null;
  sort: number;
};

export type PublicWeatherResponse = {
  city: string;
  current: {
    temperatureC: number;
    windSpeedKmh: number;
    weatherCode: number;
    text: string;
    time: string;
  } | null;
  daily: Array<{ date: string; maxC: number; minC: number; weatherCode: number; text: string }>;
  error?: string;
};

export type PublicPostListItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverUrl: string | null;
  category: { name: string; slug: string } | null;
  tags: { name: string; slug: string }[];
  publishedAt: string | null;
  readTimeMinutes: number | null;
  views: number;
  likes: number;
};

export type PublicPostListResponse = {
  items: PublicPostListItem[];
  pageInfo: { page: number; pageSize: number; total: number };
};

export type PublicPostDetailResponse = PublicPostListItem & {
  contentMarkdown: string;
  contentHtml: string;
  toc: { id: string; text: string; level: number }[];
};

export function getProfile() {
  return apiGet<PublicProfile | null>('/api/public/site/profile');
}

export function getTechStack() {
  return apiGet<string[]>('/api/public/site/tech-stack');
}

export function getContacts() {
  return apiGet<PublicContacts | null>('/api/public/site/contacts');
}

export function getCategories() {
  return apiGet<PublicCategory[]>('/api/public/categories');
}

export function getAiConfig() {
  return apiGet<PublicAiConfig | null>('/api/public/site/ai');
}

export function getTools() {
  return apiGet<PublicTool[]>('/api/public/tools');
}

export function getPosts(params?: { category?: string; tag?: string; q?: string; page?: number; pageSize?: number }) {
  const search = new URLSearchParams();
  if (params?.category) search.set('category', params.category);
  if (params?.tag) search.set('tag', params.tag);
  if (params?.q) search.set('q', params.q);
  if (typeof params?.page === 'number') search.set('page', String(params.page));
  if (typeof params?.pageSize === 'number') search.set('pageSize', String(params.pageSize));
  const suffix = search.toString() ? `?${search.toString()}` : '';
  return apiGet<PublicPostListResponse>(`/api/public/posts${suffix}`);
}

export function getPostDetail(slug: string) {
  return apiGet<PublicPostDetailResponse>(`/api/public/posts/${encodeURIComponent(slug)}`);
}

export function getWeather(params: { lat: number; lon: number }) {
  const search = new URLSearchParams();
  search.set('lat', String(params.lat));
  search.set('lon', String(params.lon));
  return apiGet<PublicWeatherResponse>(`/api/public/weather?${search.toString()}`);
}
