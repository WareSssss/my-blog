import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { AiPage } from "./pages/AI/AiPage";
import { BlogDetailPage } from "./pages/Blog/BlogDetailPage";
import { BlogListPage } from "./pages/Blog/BlogListPage";
import { HomePage } from "./pages/Home/HomePage";
import { ExcelDiffPage } from "./pages/Tools/ExcelDiffPage";
import { JsonFormatterPage } from "./pages/Tools/JsonFormatterPage";
import { ToolsPage } from "./pages/Tools/ToolsPage";

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/blog" element={<BlogListPage />} />
        <Route path="/blog/:slug" element={<BlogDetailPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/tools/json" element={<JsonFormatterPage />} />
        <Route path="/tools/excel-diff" element={<ExcelDiffPage />} />
        <Route path="/ai" element={<AiPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
