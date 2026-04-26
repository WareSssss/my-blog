import { Bell, Github, MapPin, Moon, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import clsx from "clsx";
import { getWeather, type PublicWeatherResponse } from "../services/api/public";

const navItems = [
  { label: "首页", to: "/" },
  { label: "博客", to: "/blog" },
  { label: "开发工具", to: "/tools" },
  { label: "AI 聊天", to: "/ai" }
];

function readWeatherCache(): PublicWeatherResponse | null {
  if (typeof window === "undefined") return null;
  const cachedRaw = window.localStorage.getItem("weather_cache_v1");
  if (!cachedRaw) return null;
  try {
    const cached = JSON.parse(cachedRaw) as { at: number; data: PublicWeatherResponse };
    if (Date.now() - cached.at < 10 * 60 * 1000) return cached.data;
    return null;
  } catch {
    window.localStorage.removeItem("weather_cache_v1");
    return null;
  }
}

function useIsDark(): [boolean, (next: boolean) => void] {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const persisted = window.localStorage.getItem("theme");
    if (persisted === "dark") return true;
    if (persisted === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    window.localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  return [isDark, setIsDark];
}

export function AppLayout() {
  const [isDark, setIsDark] = useIsDark();
  const location = useLocation();
  const [weather, setWeather] = useState<PublicWeatherResponse | null>(() => readWeatherCache());
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const title = useMemo(() => {
    if (location.pathname.startsWith("/blog")) return "博客";
    if (location.pathname.startsWith("/tools")) return "开发工具";
    if (location.pathname.startsWith("/ai")) return "AI 聊天";
    return "首页";
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname !== "/") return;
    const hasPrompted = window.sessionStorage.getItem("weather_prompted_v1") === "1";
    if (hasPrompted) return;
    window.sessionStorage.setItem("weather_prompted_v1", "1");
    queueMicrotask(() => {
      setWeatherLoading(true);
      setWeatherError(null);
    });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const data = await getWeather({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
          if (data.error) {
            setWeatherError(data.error);
            setWeather(null);
            return;
          }
          setWeather(data);
          window.localStorage.setItem(
            "weather_cache_v1",
            JSON.stringify({ at: Date.now(), data })
          );
        } catch (e) {
          setWeatherError(e instanceof Error ? e.message : "天气获取失败");
          setWeather(null);
        } finally {
          setWeatherLoading(false);
        }
      },
      (err) => {
        setWeatherLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setWeatherError("未授权定位");
          return;
        }
        setWeatherError("定位失败");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  }, [location.pathname]);

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <div className="text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100">扶桑</div>
            <nav className="flex items-center gap-2 text-sm">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      "rounded-md px-3 py-1.5 transition-colors",
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    )
                  }
                  end={item.to === "/"}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {location.pathname === "/" ? (
              <div className="hidden h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 sm:inline-flex dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <MapPin className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                {weatherLoading ? (
                  <span className="text-sm">定位中...</span>
                ) : weather?.current ? (
                  <span className="text-sm">
                    {weather.city} {weather.current.text} {Math.round(weather.current.temperatureC)}°C
                  </span>
                ) : (
                  <span className="text-sm">{weatherError ?? "获取天气"}</span>
                )}
              </div>
            ) : null}

            <button
              type="button"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="通知"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                2
              </span>
            </button>

            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="切换主题"
              onClick={() => setIsDark(!isDark)}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <a
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="sr-only">{title}</div>
        <Outlet />
      </main>
    </div>
  );
}
