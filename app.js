'use strict';

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/generate', async (req, res) => {
  const { date, weather, activities, meal, appetite, memo } = req.body;

  if (!date || !weather || !activities?.length) {
    return res.status(400).json({ error: '日付・天気・活動は必須です' });
  }

  const activitiesText = activities.join('、');
  const userContent = `以下の情報から保育日誌を作成してください。

日付: ${date}
天気: ${weather}
活動内容: ${activitiesText}
給食: ${meal || '未記入'}
食べ具合: ${appetite || '未記入'}
特記事項: ${memo || 'なし'}

200〜300字程度で、保育士らしい自然な文体でまとめてください。`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'あなたは保育士の日報作成を支援するAIです。保育所保育指針に沿った、温かみのある自然な保育日誌を作成してください。子どもたちの様子や成長が伝わる文章を心がけてください。',
      messages: [{ role: 'user', content: userContent }],
    });

    res.json({ text: message.content[0].text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '生成に失敗しました。APIキーを確認してください。' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`サーバー起動: http://localhost:${PORT}`);
});
