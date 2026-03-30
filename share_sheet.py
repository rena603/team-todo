"""Share the Team TODO sheet with the service account."""
import gspread

gc = gspread.oauth()
sh = gc.open_by_key('1Vc6qkfGUjTtGBCyCzSKe0kIpX2mr0Qvtf6_u7B4JYZE')
sh.share('todo-bot@claude-sheets-488604.iam.gserviceaccount.com', perm_type='user', role='writer')
print("Shared with service account as editor")
