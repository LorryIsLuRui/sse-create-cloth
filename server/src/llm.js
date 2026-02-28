const OLLAMA_URL = 'http://127.0.0.1:11434/v1/chat/completions';
// 可根据本地实际情况调整模型名称，例如：'llama3.2:3b'、'llama3.1:8b'
const OLLAMA_MODEL = 'llama3.2:3b';

async function ollamaChat(messages) {
  const body = {
    model: OLLAMA_MODEL,
    messages,
    temperature: 0.3,
    stream: false,
  };

  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Ollama ${res.status}: ${text}. 请确认已安装并启动 Ollama，且已执行：ollama pull ${OLLAMA_MODEL}`
    );
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Ollama 无有效回复');
  return content;
}

/**
 * 从用户输入中解析：1.日期、天气 2.出席场景 3.颜色、舒适度、薄厚等要求
 */
export async function parseUserInput(_apiKey, userInput) {
  const system = `你是一个穿搭助手的解析器。从用户的一段话中，严格只输出一个 JSON 对象，不要其他文字。字段如下（若用户未提及则填空字符串）：
- date: 日期，如 "明天"、"2月27日"
- weather: 天气，如 "晴、15度"、"阴冷"
- occasion: 出席场景，如 "面试"、"约会"、"通勤"
- colorPreference: 颜色偏好
- comfortPreference: 舒适度要求
- thicknessPreference: 薄厚要求（如 偏厚、轻薄）`;

  const content = await ollamaChat([
    { role: 'system', content: system },
    { role: 'user', content: userInput },
  ]);

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (_) {
    parsed = {
      date: '',
      weather: '',
      occasion: '',
      colorPreference: '',
      comfortPreference: '',
      thicknessPreference: '',
    };
  }
  return {
    date: String(parsed.date ?? ''),
    weather: String(parsed.weather ?? ''),
    occasion: String(parsed.occasion ?? ''),
    colorPreference: String(parsed.colorPreference ?? ''),
    comfortPreference: String(parsed.comfortPreference ?? ''),
    thicknessPreference: String(parsed.thicknessPreference ?? ''),
  };
}

/**
 * 根据解析结果生成 3 套穿搭推荐（标题 + 描述）。图片用占位图即可。
 */
export async function getOutfitRecommendations(_apiKey, parsed) {
  const system = `你是穿搭顾问。根据下面的条件，给出恰好 3 套穿搭方案。
每套方案只输出一个 JSON 对象，包含：
- title: 简短标题（如 "商务休闲"）
- description: 一两句具体搭配描述（上装、下装、鞋等）

最终你必须只输出一个 JSON 数组，包含 3 个对象，形如：[{"title":"...","description":"..."},{"title":"...","description":"..."},{"title":"...","description":"..."}]
不要 markdown 代码块，不要其他任何文字。`;

  const user = `条件：
日期/天气：${parsed.date} ${parsed.weather}
场景：${parsed.occasion}
颜色偏好：${parsed.colorPreference}
舒适度：${parsed.comfortPreference}
薄厚：${parsed.thicknessPreference}

请输出 3 套穿搭的 JSON 数组。`;

  const content = await ollamaChat([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);

  let list;
  try {
    list = JSON.parse(content);
    if (!Array.isArray(list)) list = [list];
  } catch (_) {
    list = [
      { title: '方案一', description: '根据您的条件推荐的第一套搭配。' },
      { title: '方案二', description: '根据您的条件推荐的第二套搭配。' },
      { title: '方案三', description: '根据您的条件推荐的第三套搭配。' },
    ];
  }
  const outfits = list.slice(0, 3).map((item, i) => ({
    title: String(item.title ?? `方案${i + 1}`),
    description: String(item.description ?? ''),
    imageUrl: `https://picsum.photos/seed/outfit${i + 1}/400/400`,
  }));
  return outfits;
}
