"""Setup routines sheet with recurring task templates."""
import gspread

gc = gspread.oauth()
sh = gc.open_by_key('1Vc6qkfGUjTtGBCyCzSKe0kIpX2mr0Qvtf6_u7B4JYZE')

# routinesシートを作成 or 取得
try:
    rws = sh.worksheet('routines')
    print("routines sheet already exists")
except gspread.exceptions.WorksheetNotFound:
    rws = sh.add_worksheet(title='routines', rows=100, cols=10)
    headers = ['name', 'project', 'assignees', 'ballOwner',
               'stars', 'hearts', 'frequency', 'group', 'dataset', 'notes']
    rws.append_row(headers)
    print("routines sheet created")

# ルーティンタスクのテンプレート
# frequency: weekly（毎週）, monthly（月初の週のみ）, biweekly（隔週）
routines = [
    # name, project, assignees, ballOwner, stars, hearts, frequency, group, dataset, notes
    ['月例数値作成', '経理', 'rena', 'rena', 0, 2, 'monthly', '既存案件', 'work', ''],
    ['クレカチェック', '経理', 'rena', 'rena', 0, 2, 'monthly', '既存案件', 'work', ''],
    ['入出金確認', '経理', 'rena', 'rena', 0, 2, 'weekly', '既存案件', 'work', ''],
    ['請求管理整理', '経理', 'rena', 'rena', 2, 3, 'monthly', '既存案件', 'work', ''],
    ['スケジュール管理', '仕事の仕方', 'rena', 'rena', 0, 1, 'weekly', '既存案件', 'work', ''],
]

rws.append_rows(routines)
print(f"{len(routines)} routine templates added")
print("Google Sheetsの routines シートで追加・編集してください")
