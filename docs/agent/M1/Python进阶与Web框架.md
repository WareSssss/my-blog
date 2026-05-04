# Python 进阶：面向对象与 Web 框架

在掌握了基础语法后，深入理解面向对象（OOP）思想和 Web 框架（FastAPI vs NestJS）是构建生产级 Agent 系统的关键。

---

## 1. 面向对象编程 (OOP)

### 1.1 为什么 AI 开发需要 OOP？
Agent 系统通常涉及多个模块（记忆、工具、规划）。通过类（Class）封装，可以方便地管理状态和扩展功能。

### 1.2 核心概念
- **封装 (Encapsulation)**: 将工具的逻辑（如爬虫）隐藏在类内部。
- **继承 (Inheritance)**: 定义一个基础 `BaseAgent` 类，让具体的 `CoderAgent` 或 `ResearchAgent` 继承它。
- **多态 (Polymorphism)**: 不同 Agent 都有 `run()` 方法，但执行逻辑各不相同。

---

## 2. 函数装饰器 (Decorators) - 深度复习
装饰器在 Python Web 开发中无处不在（如 FastAPI 的路由）。
```python
def log_tool_usage(func):
    def wrapper(*args, **kwargs):
        print(f"调用工具: {func.__name__}")
        return func(*args, **kwargs)
    return wrapper

@log_tool_usage
def search_juejin(query):
    # 搜索逻辑
    pass
```

---

## 3. Web 框架对比：FastAPI vs NestJS

| 特性 | FastAPI (Python) | NestJS (TS/Node.js) |
| :--- | :--- | :--- |
| **优势** | 性能极高、原生支持异步、自动生成文档 | 架构严谨、模块化设计、适合大型团队 |
| **AI 兼容性** | 极佳（AI 库多为 Python） | 良好（适合全栈开发，如本项目） |
| **核心思想** | Pydantic 类型校验、依赖注入 | 控制反转 (IoC)、装饰器依赖注入 |

### 3.1 本项目选择
本项目后端使用了 **NestJS**。它的模块化思想（Modules -> Controllers -> Services）非常适合管理复杂的 Agent 逻辑。

---

## 4. 异步编程 (AsyncIO)
在 Python 中使用 `async def` 和 `await` 来处理 AI 的高延迟请求。
```python
import asyncio
from fastapi import FastAPI

app = FastAPI()

@app.get("/ask")
async def ask_agent(prompt: str):
    response = await llm.call(prompt) # 非阻塞调用
    return {"reply": response}
```

---

## 5. 学习建议
- **代码重构**: 尝试将你之前写的简单脚本改写为类结构。
- **框架探索**: 如果你对 Python Web 感兴趣，建议尝试用 FastAPI 搭建一个简单的 AI 代理接口。
