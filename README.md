# 穿搭建议 Demo

根据用户输入解析「日期/天气、出席场景、颜色/舒适度/薄厚」等条件，通过 **SSE** 流式返回解析结果与多套穿搭推荐；用户可对推荐进行「采纳」「放弃」，反馈数据写入后端供后续优化推荐模型。

## 技术栈

- **前端**：React + TypeScript + Vite  
- **后端**：Node.js (Express)  
- **模型**：Groq 免费 LLM（[llama-3.1-8b-instant](https://console.groq.com)），用于输入解析与文案推荐；图片为占位图（Picsum），便于先跑通流程。

## 步骤概览

1. 用户输入一段话（如：明天阴天 15 度，去面试，希望正式、深色、不要太厚）。
2. 后端用 Groq 解析出：日期天气、场景、偏好。
3. 后端再调用 Groq 生成 3 套穿搭方案（标题 + 描述），并通过 **SSE** 依次推送：`parsed` → 多条 `outfit` → `done`。
4. 前端用 EventSource 消费 SSE，先展示解析结果，再逐条展示穿搭卡片（含占位图）。
5. 用户点击「采纳」或「放弃」后，前端调用 `POST /api/feedback`，后端将记录写入 `server/data/feedback.json`，用于后续优化。

## 本地运行

### 1. 申请 Groq API Key（免费）

1. 打开 [Groq Console](https://console.groq.com) 注册/登录。  
2. 在 **API Keys** 中创建 Key。  
3. 复制 Key，后续在服务端环境变量中使用。

### 2. 安装依赖（使用 pnpm）

在项目根目录执行一次即可安装 frontend 与 server 依赖：

```bash
pnpm install
```

在 `server` 目录下新建 `.env` 文件（可参考 `.env.example`），填入：

```env
GROQ_API_KEY=你的Groq密钥
```

### 3. 启动后端

```bash
cd server
pnpm run dev
```

服务默认运行在 `http://localhost:3000`。

### 4. 启动前端

```bash
cd frontend
pnpm run dev
```

前端默认 `http://localhost:5173`，已配置代理将 `/api`、`/sse` 转发到后端。

### 5. 使用

在页面输入框中输入需求（如：明天 2 月 27 日阴天 15 度，参加面试，希望正式、深色、不要太厚），点击「获取穿搭建议」。  
先会流式出现「解析结果」，随后逐条出现「推荐穿搭」卡片；对每套可点击「采纳」或「放弃」，反馈会写入 `server/data/feedback.json`。

## 项目结构

```
sse-create-cloth/
├── frontend/          # Vite + React + TS
│   ├── src/
│   │   ├── App.tsx    # 输入、SSE 消费、解析结果与穿搭列表、采纳/放弃
│   │   ├── main.tsx
│   │   └── index.css
│   └── ...
├── server/
│   ├── src/
│   │   ├── index.js   # Express：GET /sse/recommend、POST /api/feedback
│   │   └── llm.js     # Groq：解析输入、生成穿搭文案
│   └── data/
│       └── feedback.json   # 采纳/放弃记录（运行后自动创建）
└── README.md
```

## 常见问题

- **Groq 403 Forbidden**：表示 API Key 认证失败。请检查：
  1. 在 [Groq Console](https://console.groq.com) 登录后，在 **API Keys** 中创建或复制 Key；
  2. `server/.env` 中写 `GROQ_API_KEY=你的密钥`，**不要**在值两侧加引号，不要有多余空格或换行；
  3. 修改 `.env` 后需重启后端（`pnpm run dev`）。

## 后续可扩展

- 用反馈数据微调或重训一个小模型，或作为规则/排序特征优化推荐。  
- 将占位图替换为按描述检索的真实穿搭图（如免费图库 API）。  
- 接入本地/其他免费模型（如 Ollama），只需在 `server/src/llm.js` 中替换请求逻辑。
