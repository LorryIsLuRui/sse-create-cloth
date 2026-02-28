import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// SSE: 根据用户输入流式返回解析结果 + 穿搭推荐
app.get('/sse/recommend', async (req, res) => {
  const userInput = req.query.q || '';
  if (!userInput.trim()) {
    res.status(400).json({ error: '请提供查询 q' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { parseUserInput, getOutfitRecommendations } = await import('./llm.js');

    send('start', { message: '正在分析...' });

    const parsed = await parseUserInput(null, userInput);
    send('parsed', parsed);

    const outfits = await getOutfitRecommendations(null, parsed);
    for (let i = 0; i < outfits.length; i++) {
      send('outfit', { index: i, ...outfits[i] });
    }

    send('done', {});
  } catch (err) {
    send('error', { message: err.message || '服务异常' });
  }
  res.end();
});

// 反馈回收：采纳/放弃
const feedbackDir = path.join(__dirname, '..', 'data');
const feedbackPath = path.join(feedbackDir, 'feedback.json');
if (!fs.existsSync(feedbackDir)) fs.mkdirSync(feedbackDir, { recursive: true });
if (!fs.existsSync(feedbackPath)) {
  fs.writeFileSync(feedbackPath, JSON.stringify([], null, 2));
}

app.post('/api/feedback', (req, res) => {
  const { sessionId, outfitIndex, action } = req.body;
  if (action !== 'adopt' && action !== 'abandon') {
    return res.status(400).json({ error: 'action 需为 adopt 或 abandon' });
  }
  const filePath = feedbackPath;
  let list = [];
  try {
    list = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {}
  list.push({
    sessionId: sessionId || null,
    outfitIndex: outfitIndex,
    action,
    at: new Date().toISOString(),
  });
  fs.writeFileSync(filePath, JSON.stringify(list, null, 2));
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server http://127.0.0.1:${PORT}`);
});
