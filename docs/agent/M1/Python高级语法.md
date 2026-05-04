# Python 高级语法：AI 开发必备

在 AI Agent 的开发中，Python 不仅仅是写脚本的工具，更是处理大规模数据和调用大模型 SDK 的核心语言。以下是 M1 阶段必须掌握的高级特性。

---

## 1. 列表推导式 (List Comprehensions)

### 1.1 语法结构
`[expression for item in iterable if condition]`

### 1.2 实战案例：过滤与转换
假设我们有一组抓取回来的原始数据，需要提取出标题并过滤掉空值：
```python
raw_data = [{"title": "NestJS Guide"}, {"title": None}, {"title": "AI Agent"}]
# 传统写法
titles = []
for item in raw_data:
    if item["title"]:
        titles.append(item["title"])

# 列表推导式
titles = [item["title"] for item in raw_data if item["title"]]
# 输出: ['NestJS Guide', 'AI Agent']
```

---

## 2. 装饰器 (Decorators)

### 2.1 核心原理
装饰器本质上是一个接收函数并返回新函数的高阶函数。它在 AI 框架中常用于记录 Token 消耗、权限校验或性能监控。

### 2.3 实战案例：计算运行时间
```python
import time

def timer(func):
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        print(f"执行耗时: {time.time() - start:.4f}s")
        return result
    return wrapper

@timer
def call_llm(prompt):
    # 模拟请求大模型
    time.sleep(1.5)
    return "这是 AI 的回复"

call_llm("你好")
```

---

## 3. 异步编程 (Async/Await)

### 3.1 为什么 AI 必须异步？
大模型请求（LLM API）通常需要数秒甚至数分钟才能返回结果。如果使用同步阻塞方式，整个系统会卡死。

### 3.2 基础语法
```python
import asyncio

async def fetch_ai_response():
    print("正在请求 AI...")
    await asyncio.sleep(2) # 模拟网络等待
    return "回复内容"

async def main():
    result = await fetch_ai_response()
    print(result)

asyncio.run(main())
```

---

## 4. 学习建议
- **实战练习**: 尝试使用 `map()` 和 `filter()` 重写上面的列表推导式，理解两者的异同。
- **关联项目**: 回顾本项目后端 [crawler.service.ts](file:///Users/wares/Desktop/Blog/apps/api/src/modules/crawler/crawler.service.ts) 中的 `async/await` 逻辑，体会 JS 与 Python 在异步思想上的统一。
