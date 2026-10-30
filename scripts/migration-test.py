"""Checks the previous built-in Arabic labels migrate without changing user data."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent
base='http://127.0.0.1:4174'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1200,'height':900})
    page.goto(base+'/',wait_until='networkidle')
    page.locator('[data-action="select-case"][data-case-id="published-vikas-2023"]').click()
    page.locator('[data-action="select-case"][data-case-id="published-lakshmi-2022"]').click()
    page.evaluate("""() => {
      const key='athar.attendance.v1', db=JSON.parse(localStorage.getItem(key));
      const c=db.cases.find(x=>x.id==='published-lakshmi-2022');
      c.title='حالة لاكشمي ديفي'; c.scope='من 1 إلى 15 مايو 2022';
      c.description='Previous built-in description';
      localStorage.setItem(key,JSON.stringify(db));
    }""")
    page.reload(wait_until='networkidle')
    assert "Lakshmi Devi’s case" in page.locator('.case-tile.selected').inner_text()
    assert page.locator('.metric-number').all_text_contents()==['9','4','5']
    page.evaluate("""() => {
      const key='athar.attendance.v1', db=JSON.parse(localStorage.getItem(key));
      const c=db.cases.find(x=>x.id==='published-lakshmi-2022');
      c.published=false; c.title='حالة مستخدم محفوظة'; c.description='USER-ENTERED TEXT';
      localStorage.setItem(key,JSON.stringify(db));
    }""")
    page.reload(wait_until='networkidle')
    assert 'حالة مستخدم محفوظة' in page.locator('.case-tile.selected').inner_text()
    page.locator('[data-view="records"]').first.click()
    page.locator('[data-action="edit-case"]').click()
    assert page.locator('#case-desc').input_value()=='USER-ENTERED TEXT'
    browser.close()
result={'untouched_published_seed_labels_migrated':True,'source_counts_preserved':True,'custom_case_content_preserved':True,'pass':True}
(root/'evidence'/'migration-test-en.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
