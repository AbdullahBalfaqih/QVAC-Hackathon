"""Verify legacy two-case libraries are extended without overwriting edited user data."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json

root=Path(__file__).resolve().parent.parent
base='http://127.0.0.1:4174'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1200,'height':900})
    page.goto(base+'/',wait_until='networkidle')
    page.locator('[data-action="select-case"][data-case-id="published-vikas-2023"]').click()
    page.evaluate("""() => {
      const key='athar.attendance.v1', db=JSON.parse(localStorage.getItem(key));
      db.cases=db.cases.filter(c=>['published-lakshmi-2022','published-vikas-2023'].includes(c.id));
      localStorage.setItem(key,JSON.stringify(db));
    }""")
    page.reload(wait_until='networkidle')
    assert page.locator('.case-tile').count()==4
    page.evaluate("""() => {
      const key='athar.attendance.v1', db=JSON.parse(localStorage.getItem(key));
      db.cases=db.cases.filter(c=>['published-lakshmi-2022','published-vikas-2023'].includes(c.id));
      const c=db.cases.find(c=>c.id==='published-lakshmi-2022');
      c.published=false; c.description='CUSTOM USER DATA';
      localStorage.setItem(key,JSON.stringify(db));
    }""")
    page.reload(wait_until='networkidle')
    assert page.locator('.case-tile').count()==2
    page.locator('[data-action="select-case"][data-case-id="published-lakshmi-2022"]').click()
    page.locator('[data-view="records"]').first.click();page.locator('[data-action="edit-case"]').click()
    assert page.locator('#case-desc').input_value()=='CUSTOM USER DATA'
    browser.close()
result={'previous_two_case_library_extended':True,'edited_library_not_implicitly_extended':True,'user_data_preserved':True,'pass':True}
(root/'evidence'/'legacy-library-test.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
