// =============================================================
// TODO Bot - Google Apps Script
// =============================================================
// スクリプトプロパティに以下を設定すること:
//   SLACK_BOT_TOKEN  : xoxb-...
//   SLACK_SIGNING_SECRET : （Slack App の Signing Secret）
//   BOT_USER_ID      : BotのSlack User ID（U...）
//   GEMINI_API_KEY   : Google AI Studio で発行したAPIキー

const SHEET_ID        = '1Vc6qkfGUjTtGBCyCzSKe0kIpX2mr0Qvtf6_u7B4JYZE';
const RENA_CHANNEL    = 'C07T6SMD2JD';
const SATSUKI_CHANNEL = 'C0A5HP1HW2H';

// Slack UserID → メンバー情報
const USER_INFO = {
  'U02M0EKD1DJ': { key: 'rena',    sheetName: 'れな',   channel: RENA_CHANNEL },
  'U0A2Y6AM9V4': { key: 'satsuki', sheetName: 'satsuki', channel: SATSUKI_CHANNEL },
};

// 担当者キー → Sheetsの表記
const ASSIGNEE_MAP = {
  rena:    'れな',
  satsuki: 'satsuki',
  ayano:   'Ayano Yo',
  kanako:  'OshinoKanako',
  midori:  'Midori Fukihara',
  tatsuya: 'Tatsuya Eguchi',
  chihiro: 'MorishimaChihiro',
};

// =============================================================
// Slack Events エントリポイント
// =============================================================
function doPost(e) {
  const body = JSON.parse(e.postData.contents);

  // URL認証チャレンジ
  if (body.type === 'url_verification') {
    return ContentService.createTextOutput(body.challenge);
  }

  // 重複イベント防止（Slackのリトライ対策）
  if (body.event_id) {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const props = PropertiesService.getScriptProperties();
      const dupKey = `evt_${body.event_id}`;
      if (props.getProperty(dupKey)) return jsonOk();
      props.setProperty(dupKey, '1');
    } finally {
      lock.releaseLock();
    }
  }

  const event = body.event;
  if (!event) return jsonOk();

  // Bot自身の投稿は無視
  const botUserId = PropertiesService.getScriptProperties().getProperty('BOT_USER_ID');
  if (event.bot_id || event.user === botUserId) return jsonOk();

  if (event.type === 'app_mention') {
    handleMention(event);
  } else if (event.type === 'reaction_added' && event.reaction === 'white_check_mark') {
    handleReaction(event);
  }

  return jsonOk();
}

function jsonOk() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// =============================================================
// @メンション → タスク登録
// =============================================================
function handleMention(event) {
  const botUserId = PropertiesService.getScriptProperties().getProperty('BOT_USER_ID');
  let rawText = event.text;
  // ボットのメンションを除去
  rawText = rawText.replace(new RegExp(`<@${botUserId}>`, 'g'), '');
  // メンバーのメンションを名前に変換（Geminiが担当者を判断できるように）
  Object.entries(USER_INFO).forEach(([uid, info]) => {
    rawText = rawText.replace(new RegExp(`<@${uid}>`, 'g'), info.key);
  });
  // 残った未知メンションを除去
  rawText = rawText.replace(/<@[A-Z0-9]+>/g, '').trim();
  const senderKey = (USER_INFO[event.user] || {}).key || 'rena';

  // 完了メッセージの検出
  if (/完了|できた|終わった|やった|done/i.test(rawText)) {
    handleCompletion(rawText, senderKey, event);
    return;
  }

  const channelProject = getChannelProject(event.channel);
  const tasks = callGemini(rawText, senderKey, channelProject);
  if (!tasks || tasks.length === 0) {
    slackPost(event.channel, 'タスクを読み取れませんでした。もう一度お試しください。\n直接入力する場合は <https://docs.google.com/spreadsheets/d/1Vc6qkfGUjTtGBCyCzSKe0kIpX2mr0Qvtf6_u7B4JYZE/edit?gid=0#gid=0|タスク管理シート> へ。', event.ts);
    return;
  }

  const ws      = getSheet();
  const allRows = ws.getDataRange().getValues();

  tasks.forEach(task => {
    const id           = nextTaskId(allRows);
    const sheetName    = ASSIGNEE_MAP[task.assignee] || task.assignee || ASSIGNEE_MAP[senderKey];
    const row = [
      id, task.name, task.project || '', '未着手',
      task.date || '', '', '',
      sheetName, '', '', sheetName, '', '', 'work',
    ];
    ws.appendRow(row);
    allRows.push(row);
  });

  const lines = tasks.map(t => {
    const proj = t.project ? ` [${t.project}]` : '';
    return `・${t.name}${proj}  担当: ${t.assignee}`;
  }).join('\n');

  slackPost(event.channel, `承知しました。${tasks.length}件タスクに追加しました。\n${lines}`, event.ts);
}

// =============================================================
// 完了メッセージ処理
// =============================================================
function handleCompletion(text, senderKey, event) {
  const ws = getSheet();
  const rows = ws.getDataRange().getValues().slice(1);
  const incomplete = rows.filter(r => r[3] !== '完了' && r[3] !== 'キャンセル' && r[1]);

  if (incomplete.length === 0) {
    slackPost(event.channel, '未完了タスクがありません', event.ts);
    return;
  }

  const taskId = callGeminiForCompletion(text, senderKey, incomplete);
  if (!taskId) {
    slackPost(event.channel, 'どのタスクか特定できませんでした。タスク名をもう少し具体的に教えてください。', event.ts);
    return;
  }

  updateStatus(taskId, '完了');
  const matched = incomplete.find(r => String(r[0]) === String(taskId));
  const taskName = matched ? matched[1] : taskId;
  slackPost(event.channel, `*${taskName}* を完了にしました ✅`, event.ts);
}

function callGeminiForCompletion(text, senderKey, incompleteTasks) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const taskList = incompleteTasks.map(r => `ID:${r[0]} 「${r[1]}」 担当:${r[7]}`).join('\n');

  const prompt = `以下のSlackメッセージはタスクの完了報告です。未完了タスク一覧から最も一致するタスクのIDを1つだけ返してください。

メッセージ: "${text}"
送信者: ${senderKey}

未完了タスク一覧:
${taskList}

一致するタスクのIDのみ返す（数字のみ）。該当なければ "none" と返す。`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0 },
  };

  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const json = JSON.parse(res.getContentText());
    const result = json.candidates[0].content.parts[0].text.trim();
    if (result === 'none' || isNaN(parseInt(result))) return null;
    return parseInt(result);
  } catch (err) {
    console.error('Gemini completion error:', err.toString());
    return null;
  }
}

// =============================================================
// ✅リアクション → 完了
// =============================================================
function handleReaction(event) {
  const props  = PropertiesService.getScriptProperties();
  const key    = `msg_${event.item.channel}_${event.item.ts}`;
  const taskId = props.getProperty(key);
  if (!taskId) return;

  const updated = updateStatus(taskId, '完了');
  if (updated) {
    slackPost(event.item.channel, `タスク *${taskId}* を完了にしました ✅`, event.item.ts);
  }
}

// =============================================================
// 朝9時通知（時間トリガーで呼び出す）
// =============================================================
function sendMorningReport() {
  const ws      = getSheet();
  const rows    = ws.getDataRange().getValues().slice(1);
  const dateStr = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'M/d');
  const today   = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');

  const incomplete = rows.filter(r => r[3] !== '完了' && r[3] !== 'キャンセル' && r[1]);

  const renaTasks    = incomplete.filter(r => String(r[7]).includes('れな') || String(r[7]).includes('rena'));
  const satsukiTasks = incomplete.filter(r =>
    String(r[7]).includes('さつき') || String(r[7]).includes('satsuki') || String(r[7]).includes('IihoshiSatsuki')
  );

  postDailyTasks(RENA_CHANNEL, dateStr, today, renaTasks, satsukiTasks, 'れな');
  postDailyTasks(SATSUKI_CHANNEL, dateStr, today, satsukiTasks, null, 'さつき');
}

function postDailyTasks(channel, dateStr, today, myTasks, otherTasks, myName) {
  const lines = [`本日のタスク（${dateStr}）`];

  if (myTasks.length === 0 && (!otherTasks || otherTasks.length === 0)) {
    slackPost(channel, `本日のタスク（${dateStr}）\n未完了タスクはありません`);
    return;
  }

  const urgent = myTasks.filter(r => r[4] && toDateStr(r[4]) <= today);
  // 期限順にソート（期限なしは末尾）
  const normal = myTasks
    .filter(r => !r[4] || toDateStr(r[4]) > today)
    .sort((a, b) => {
      if (!a[4] && !b[4]) return 0;
      if (!a[4]) return 1;
      if (!b[4]) return -1;
      return toDateStr(a[4]).localeCompare(toDateStr(b[4]));
    });

  if (urgent.length > 0) {
    lines.push(`【本日のタスク】（${urgent.length}件）`);
    lines.push(...formatGroupedTasks(urgent));
  }

  if (normal.length > 0) {
    lines.push(`【その他のタスク】（${normal.length}件）`);
    lines.push(...formatGroupedTasks(normal));
  }

  if (otherTasks && otherTasks.length > 0) {
    lines.push(`【さつきに依頼中タスク】（${otherTasks.length}件）`);
    lines.push(...formatGroupedTasks(otherTasks));
  }

  slackPost(channel, lines.join('\n'));
}

function formatGroupedTasks(tasks) {
  const groups = {};
  tasks.forEach(r => {
    const proj = r[2] || '（案件なし）';
    if (!groups[proj]) groups[proj] = [];
    groups[proj].push(r);
  });
  const lines = [];
  Object.keys(groups).forEach(proj => {
    lines.push(proj);
    groups[proj].forEach(r => {
      const dateVal = r[4] ? Utilities.formatDate(new Date(r[4]), 'Asia/Tokyo', 'M/d') : '';
      const date = dateVal ? `（${dateVal}）` : '';
      lines.push(`　・${r[1]}${date}`);
    });
  });
  return lines;
}

function formatTaskLine(r) {
  const dateVal = r[4] ? Utilities.formatDate(new Date(r[4]), 'Asia/Tokyo', 'M/d') : '';
  const date    = dateVal ? `（${dateVal}）` : '';
  return `　・${r[1]}${date}`;
}

function toDateStr(val) {
  if (!val) return '';
  return Utilities.formatDate(new Date(val), 'Asia/Tokyo', 'yyyy-MM-dd');
}

// =============================================================
// チャンネルID → 案件名（案件/担当者管理シートから取得）
// =============================================================
function getChannelProject(channelId) {
  const ss   = SpreadsheetApp.openById('1NGMOFP7s4dMVY6Ke8yqxKJZiwRDASK_JFpdvucdB-UU');
  const ws   = ss.getSheets().find(s => s.getSheetId() === 637812337);
  if (!ws) return '';
  const rows = ws.getDataRange().getValues();
  for (let i = 2; i < rows.length; i++) {
    if (rows[i][1] === channelId) return rows[i][0]; // チャンネル名=案件名
  }
  return '';
}

// =============================================================
// Gemini API（タスク解析）
// =============================================================
function callGemini(text, senderKey, channelProject) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const today  = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');

  const channelHint = channelProject ? `投稿されたチャンネルの案件: ${channelProject}` : '';

  const prompt = `
以下のSlackメッセージからタスクを抽出してJSON配列で返してください。
今日の日付: ${today}
メッセージ: "${text}"
送信者: ${senderKey}
${channelHint}

ルール:
- 担当者が明示されていない場合は必ず送信者(${senderKey})を担当者にする。担当者は絶対に空にしない
- 担当者名はrena/satsuki/ayano/kanako/midori/tatsuya/chihiroのいずれかに変換する
- 複数タスクがあれば全て抽出する
- 案件名・クライアント名があれば抽出する（タスク名には含めない）。メッセージに案件名の記載がない場合はチャンネルの案件名を使う
- 期限の変換（YYYY-MM-DD形式で返す）:
  「今日」「今日中」→${today}
  「明日」→翌日
  「今週中」「今週末」→直近金曜日
  「来週中」→翌週金曜日
  「M/D」「M月D日」「X日まで」などの具体的な日付→当年のYYYY-MM-DDに変換（例: 8/5→2026-08-05）
  期限の記述が全くない場合のみ空文字を返す
- タスク名は20文字以内に簡潔にまとめる（「〜の質問の返答」→「質問返答」のように圧縮する）
- タスク名にメッセージに存在しない単語・情報を追加しない

JSON配列のみ返す（説明文・コードブロック不要）:
[{"name":"タスク名(20文字以内)","assignee":"担当者キー","project":"案件名（なければ空文字）","date":"期限YYYY-MM-DD（なければ空文字）"}]`;

  const url     = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0 },
  };

  try {
    const res     = UrlFetchApp.fetch(url, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const json    = JSON.parse(res.getContentText());
    const rawText = json.candidates[0].content.parts[0].text.trim();
    const match   = rawText.match(/\[[\s\S]*\]/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch (err) {
    console.error('Gemini error:', err.toString());
    return null;
  }
}

// =============================================================
// Slack API
// =============================================================
function slackPost(channel, text, threadTs) {
  const token   = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');
  const payload = { channel, text };
  if (threadTs) payload.thread_ts = threadTs;

  const res = UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${token}` },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  return JSON.parse(res.getContentText());
}

// =============================================================
// Google Sheets
// =============================================================
function getSheet() {
  return SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
}

function nextTaskId(allRows) {
  const ids = allRows.slice(1).map(r => parseInt(r[0])).filter(n => !isNaN(n));
  return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

// Gemini接続テスト用（エディタから実行して実行ログで確認）
function testGemini() {
  const result = callGemini('中国銀行 上田さんCRサイズ質問返答 今日中', 'rena');
  console.log('Gemini result:', JSON.stringify(result));
}

function updateStatus(taskId, status) {
  const ws   = getSheet();
  const data = ws.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(taskId)) {
      ws.getRange(i + 1, 4).setValue(status);
      return true;
    }
  }
  return false;
}
