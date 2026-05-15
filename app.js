'use strict';

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

const db = new Database(path.join(__dirname, 'history.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const insertHistory = db.prepare(
  'INSERT INTO history (type, title, content) VALUES (?, ?, ?)'
);

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

    const text = message.content[0].text;
    insertHistory.run('日報', `${date}の日報`, text);
    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '生成に失敗しました。APIキーを確認してください。' });
  }
});

app.post('/api/generate-plan', async (req, res) => {
  const { type, grade, month, events, prevMonthNote, aim, weekAim, weekActivities, activityName, activityAim } = req.body;

  if (!type || !grade) {
    return res.status(400).json({ error: 'プランの種類とクラスは必須です' });
  }

  let userContent;
  let title;

  if (type === '月案') {
    if (!month) return res.status(400).json({ error: '月は必須です' });
    title = `${grade} ${month}月月案`;
    userContent = `以下の情報から保育指導計画（月案）を作成してください。

対象クラス: ${grade}
対象月: ${month}月
季節・行事: ${events?.join('、') || 'なし'}
前月の子どもの様子: ${prevMonthNote || '特になし'}
担任からのねらい（任意）: ${aim || 'お任せ'}

【出力形式】
・今月のねらい（2〜3項目）
・子どもの姿
・保育者の援助・環境構成
・家庭との連携

保育所保育指針に沿った文体で、${grade}の発達段階に合った内容で作成してください。`;

  } else if (type === '週案') {
    if (!weekAim) return res.status(400).json({ error: '週のねらいは必須です' });
    title = `${grade} 週案`;
    userContent = `以下の情報から保育指導計画（週案）を作成してください。

対象クラス: ${grade}
週のねらい: ${weekAim}
予定している活動: ${weekActivities?.join('、') || 'お任せ'}

【出力形式】
・週のねらい
・月〜金の活動内容（各曜日）
・保育者の援助・留意点

${grade}の発達段階に合った内容で作成してください。`;

  } else if (type === '日案') {
    if (!activityName) return res.status(400).json({ error: '活動名は必須です' });
    title = `${grade} ${activityName}`;
    userContent = `以下の情報から保育指導計画（日案）を作成してください。

対象クラス: ${grade}
活動名: ${activityName}
活動のねらい: ${activityAim || 'お任せ'}

【出力形式】
・活動のねらい
・準備物
・導入（5分程度）
・展開（メインの活動）
・まとめ・振り返り
・保育者の援助・留意点

${grade}の発達段階に合った具体的な内容で作成してください。`;

  } else {
    return res.status(400).json({ error: '不明なプランタイプです' });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: 'あなたは経験豊富な保育士・幼稚園教諭です。厚生労働省の保育所保育指針に沿った、実践的で温かみのある保育指導計画を作成してください。',
      messages: [{ role: 'user', content: userContent }],
    });

    const text = message.content[0].text;
    insertHistory.run(type, title, text);
    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '生成に失敗しました。' });
  }
});

app.get('/api/history', (req, res) => {
  const rows = db.prepare(
    'SELECT id, type, title, created_at FROM history ORDER BY created_at DESC LIMIT 100'
  ).all();
  res.json(rows);
});

app.get('/api/history/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM history WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '見つかりません' });
  res.json(row);
});

app.delete('/api/history/:id', (req, res) => {
  db.prepare('DELETE FROM history WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`サーバー起動: http://localhost:${PORT}`);
});
