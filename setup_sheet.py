"""Create Google Sheet for Team TODO and populate with initial data."""
import gspread

gc = gspread.oauth()

# Create new spreadsheet
sh = gc.create('Team TODO')
ws = sh.sheet1
ws.update_title('tasks')

# Headers
headers = ['id','name','project','status','date','dateStart','dateEnd',
           'assignees','stars','hearts','ballOwner','notes','group','dataset']
ws.append_row(headers)

# Work tasks
work = [
    ['w1','50代CR制作 -バナー','中国銀行','waiting','2026-02-18','2026-02-14','2026-02-24','Ayano Yo,rena',3,2,'先方','','既存案件','work'],
    ['w2','気圧訴求CR 要件定義→杉本さん依頼','青天気','todo','2026-02-20','2026-02-16','2026-02-20','Ayano Yo,rena',1,2,'','','既存案件','work'],
    ['w3','画像/動画CRテキスト変更','青天気','progress','2026-02-24','2026-02-16','2026-02-25','rena,Ayano Yo',0,0,'rena','','既存案件','work'],
    ['w4','TTCS進捗確認','リブセンス','progress','2026-02-25','2026-02-25','2026-02-25','rena,Ayano Yo',0,0,'rena','','既存案件','work'],
    ['w5','Netflix連絡','SA-DNP','waiting','2026-02-27','2026-02-27','2026-02-27','rena',0,0,'先方','','既存案件','work'],
    ['w6','Geminiクレカ登録','社内PJT-app','todo','2026-02-27','2026-02-25','2026-02-27','rena,OshinoKanako',0,0,'rena','','社内タスク','work'],
    ['w7','Meta配信セット','リブセンス','todo','2026-02-27','','','rena,Ayano Yo',0,0,'rena','','既存案件','work'],
    ['w8','SmartNews配信セット','リブセンス','progress','2026-02-27','2026-02-24','2026-02-27','rena,Ayano Yo',0,0,'rena','','既存案件','work'],
    ['w9','Amoad/Gain申し込み','青天気','todo','2026-02-27','2026-02-24','2026-02-28','rena,Ayano Yo',2,2,'rena','','既存案件','work'],
    ['w10','DB入れるデータ項目まとめ','社内PJT-DB','todo','2026-02-27','2026-02-18','2026-02-27','rena,Ayano Yo',0,0,'rena','','社内タスク','work'],
    ['w11','RevXリサイズ','青天気','todo','2026-03-02','2026-02-27','2026-03-01','rena',0,0,'rena','','既存案件','work'],
    ['w12','動画クリエイティブ制作','リブセンス','progress','2026-03-06','2026-02-23','2026-02-27','rena,MorishimaChihiro,Ayano Yo',0,0,'rena','','既存案件','work'],
    ['w13','大雨訴求CR制作','青天気','todo','2026-04-17','2026-04-06','2026-04-17','Ayano Yo,rena',1,2,'','','既存案件','work'],
]

# App tasks
app = [
    ['a1','カメラ機能の分析精度改善','アプリ','progress','2026-02-13','2026-02-10','','rena',0,0,'rena','claude code','','app'],
    ['a2','ロードマップ作成','アプリ','progress','2026-02-13','2026-02-10','','rena,Midori Fukihara',0,0,'rena','','','app'],
    ['a3','アプリのコア機能を見極める','アプリ','todo','2026-02-27','2026-02-16','','rena,MorishimaChihiro,IihoshiSatsuki,OshinoKanako',0,0,'','第三者の意見が欲しい','','app'],
    ['a4','スクリーンショット作成','アプリ','todo','2026-03-13','2026-03-02','','rena',0,0,'杉本さん','杉本さんに依頼したい','','app'],
    ['a5','FBを受けた改善','アプリ','todo','2026-03-06','2026-03-02','','rena',0,0,'rena','','','app'],
    ['a6','自社アプリASO分析','アプリ','todo','2026-03-20','2026-03-09','','rena,OshinoKanako',0,0,'','コア機能決定後','','app'],
    ['a7','アプリ名付決定','アプリ','todo','2026-03-27','2026-03-16','','rena,Tatsuya Eguchi,Ayano Yo',0,0,'','キャッチーで親しみやすく','','app'],
    ['a8','PL作成','アプリ','progress','2026-04-03','2026-03-30','','rena',0,0,'rena','課金と無課金の差のつけどころ','','app'],
    ['a9','課金プランの値段決定','アプリ','todo','2026-04-05','2026-04-01','','',0,0,'','コア機能を加味して','','app'],
    ['a10','課金フロー開発','アプリ','todo','2026-04-10','2026-04-06','','rena',0,0,'rena','claude code','','app'],
    ['a11','課金フローがうまくいくか確認','アプリ','todo','2026-04-17','2026-04-13','','rena,OshinoKanako',0,0,'','claude code','','app'],
    ['a12','リリース','アプリ','todo','2026-04-26','2026-04-19','','rena',0,0,'','申請に2週間ほどかかる可能性あり','','app'],
    ['a13','リリース後の経過確認/簡易レポート','アプリ','todo','2026-05-22','2026-05-11','','',0,0,'','市場検証を受けて','','app'],
    ['a14','マーケティング施策検討','アプリ','todo','2026-05-29','2026-05-25','','',0,0,'','','','app'],
    ['a15','市場検証','アプリ','todo','2026-05-08','2026-04-27','','',0,0,'','PMF確認','','app'],
]

ws.append_rows(work + app)

# Share with anyone who has the link (view)
sh.share('', perm_type='anyone', role='reader')

print(f"Sheet created: {sh.url}")
print(f"Sheet ID: {sh.id}")
