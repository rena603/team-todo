"""Add tasks from matrix image to Google Sheet."""
import gspread

gc = gspread.oauth()
sh = gc.open_by_key('1Vc6qkfGUjTtGBCyCzSKe0kIpX2mr0Qvtf6_u7B4JYZE')
ws = sh.sheet1

# Get next work ID
rows = ws.get_all_values()
w_ids = [int(r[0][1:]) for r in rows[1:] if r[0].startswith('w') and r[0][1:].isdigit()]
next_w = max(w_ids, default=0) + 1

tasks = [
    # [name, project, status, assignees, stars, hearts, notes]
    ['月例数値作成', '経理', 'todo', 'rena', 0, 2, ''],
    ['クレカチェック', '経理', 'todo', 'rena', 0, 2, ''],
    ['入出金確認', '経理', 'todo', 'rena', 0, 2, ''],
    ['社長探し', '営業活動', 'todo', 'rena', 0, 2, ''],
    ['長期マーケ戦略', '仕事の仕方', 'todo', 'rena', 0, 1, ''],
    ['次回ブログ検討', '勉強', 'todo', 'rena', 0, 1, ''],
    ['True CPAインプット', '勉強', 'todo', 'rena', 0, 1, ''],
    ['グラフアプリ', 'PJT', 'todo', 'rena', 0, 1, ''],
    ['経理業務 内部依頼', '経理', 'todo', 'rena', 1, 2, ''],
    ['相田さん 問い合わせ自動化', 'PJT', 'todo', 'rena', 1, 2, ''],
    ['Manus活用', '勉強', 'todo', 'rena', 1, 1, ''],
    ['TTCS限定インプット', 'リブセンス', 'todo', 'rena', 1, 1, ''],
    ['日本通信部向け素材作成', 'Cellest', 'todo', 'rena', 1, 1, ''],
    ['さつき オルブログ確認', 'PJT', 'todo', 'rena', 1, 1, ''],
    ['PMFの教科書 読破', '勉強', 'todo', 'rena', 0, 0, ''],
    ['TikTokアカウント M&Aの件', 'PJT', 'todo', 'rena', 0, 0, ''],
    ['TTとMeのTT RS仕事マニュアル', 'レバレジーズ', 'todo', 'rena', 0, 0, ''],
    ['請求管理整理', '経理', 'todo', 'rena', 2, 3, ''],
    ['源泉納付', '経理', 'todo', 'rena', 3, 3, ''],
    ['請求書送付', '経理', 'todo', 'rena', 3, 3, ''],
    ['ジュニさん旧記事サーチ', 'ポケアン', 'todo', 'rena', 2, 2, ''],
    ['4/12 イベント', 'PJT', 'todo', 'rena', 2, 2, ''],
    ['ASOレポート', 'ポケアン', 'todo', 'rena', 2, 2, ''],
    ['3/15 イベント', 'PJT', 'todo', 'rena', 3, 2, ''],
    ['3/16 イベント', 'PJT', 'todo', 'rena', 3, 2, ''],
    ['ロープレ準備 依頼', '仕事の仕方', 'todo', 'rena', 2, 1, ''],
    ['会員数配信 最適化CP開始', 'STOCK POINT', 'todo', 'rena', 3, 1, ''],
    ['スケジュール管理', '仕事の仕方', 'todo', 'rena', 0, 1, ''],
    # みどどんさんボール
    ['CPPご提案作成', 'PJT', 'todo', 'Midori Fukihara', 2, 2, ''],
    ['HPのTT記事確認', 'PJT', 'todo', 'Midori Fukihara', 2, 1, ''],
    ['トキバナ TikTok連携', 'PJT', 'todo', 'Midori Fukihara', 1, 1, ''],
]

new_rows = []
for i, t in enumerate(tasks):
    tid = f'w{next_w + i}'
    row = [tid, t[0], t[1], t[2], '', '', '', t[3], t[4], t[5], '', t[6], '既存案件', 'work']
    new_rows.append(row)

ws.append_rows(new_rows)
print(f'{len(new_rows)} tasks added (w{next_w} ~ w{next_w + len(tasks) - 1})')
