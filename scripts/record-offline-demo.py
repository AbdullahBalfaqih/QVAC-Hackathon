"""Record the real application and QVAC in an already-isolated Linux network namespace.
Never run as proof unless the outbound socket check actually returns ENETUNREACH.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64, datetime, errno, hashlib, html, json, os, platform, shlex, shutil, socket, subprocess, tempfile, time

root=Path(__file__).resolve().parent.parent
base='http://127.0.0.1:4174'
model=Path(os.environ['MODEL_PATH'])
result={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(), 'platform':platform.platform(),
        'node':subprocess.check_output(['node','-v'],text=True).strip(),
        'logical_cpus_available':len(os.sched_getaffinity(0)),
        'mem_total_kib':int(next(x.split()[1] for x in Path('/proc/meminfo').read_text().splitlines() if x.startswith('MemTotal:'))),
        'model':model.name,'sdk':'@qvac/sdk 0.22.0'}
with model.open('rb') as f:
    digest=hashlib.sha256()
    while chunk:=f.read(1024*1024):digest.update(chunk)
result['model_sha256']=digest.hexdigest()
routes=subprocess.check_output(['ip','-j','route','show'],text=True).strip()
result['ipv4_routes']=json.loads(routes)
result['interfaces']=json.loads(subprocess.check_output(['ip','-j','link','show'],text=True))
result['interface_names']=[x['ifname'] for x in result['interfaces']]
def connectivity():
    s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.settimeout(2)
    try:return s.connect_ex(('1.1.1.1',443))
    finally:s.close()
result['external_tcp_errno_before']=connectivity()
if result['external_tcp_errno_before'] != errno.ENETUNREACH or result['ipv4_routes'] or result['interface_names'] != ['lo']:
    raise RuntimeError('Not isolated: no video or offline claim will be produced.')

font64=base64.b64encode((root/'public'/'fonts'/'InterVariable.woff2').read_bytes()).decode('ascii')
proof=f'''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:Inter;src:url(data:font/woff2;base64,{font64}) format('woff2');font-weight:100 900}}
*{{box-sizing:border-box}}body{{margin:0;background:#090909;color:#f6f6f4;font-family:Inter,Arial,sans-serif;display:grid;place-items:center;min-height:100vh}}
main{{width:1030px;animation:intro 6s ease both}}@keyframes intro{{0%{{opacity:0;transform:translateY(18px)}}12%,86%{{opacity:1;transform:translateY(0)}}100%{{opacity:0;transform:translateY(-8px)}}}}.label{{font-size:15px;color:#b4b4b2}}.label b{{color:#ffa342}}h1{{font-size:61px;line-height:1.12;letter-spacing:-.05em;font-weight:650;margin:24px 0 15px}}h1 span{{color:#ffa342}}p{{font-size:22px;line-height:1.65;color:#aaa9a8;margin:0}}.box{{background:#1b1b1c;border:1px solid #393432;border-radius:20px;padding:24px 30px;margin-top:36px;display:grid;grid-template-columns:1fr 1fr;gap:25px;font-size:18px;line-height:1.7;color:#eae8e5}}.box small{{display:block;color:#969594;font-size:13px}}.orange{{color:#ffb457}}.foot{{font-size:13px;margin-top:24px;color:#9e9c9a}}
</style></head><body><main><div class="label"><b>●</b> Athar / Recorded offline test</div><h1>Nine days on paper<span>.</span><br>Four in the app<span>.</span></h1><p>Athar reviews a reported attendance discrepancy offline.</p><div class="box"><div><small>Network interface / routes</small>{html.escape(', '.join(result['interface_names']))} / none</div><div><small>Outbound TCP test</small><span class="orange">ENETUNREACH ({result['external_tcp_errno_before']})</span></div><div><small>Model / device</small>Qwen2.5 1.5B Q4 / CPU</div><div><small>SDK / available CPUs</small>QVAC 0.22.0 / {result['logical_cpus_available']}</div></div><p class="foot">Article 14, 5 July 2022. One historical report; original records not independently verified.</p></main></body></html>'''
from urllib.parse import quote


def child_pids(pid):
    """Return current descendants from Linux procfs, without creating simulated processes."""
    try: children = [int(x) for x in Path(f'/proc/{pid}/task/{pid}/children').read_text().split()]
    except (OSError, ValueError): return []
    result = []
    for child in children:
        result.append(child)
        result.extend(child_pids(child))
    return result

def network_terminal(page, stage, server_pid, worker_pid, browser_pid):
    """Run real commands in this namespace and display their unmodified stdout live.

    The display is a browser-rendered transcript, not a physical terminal window.
    It does not fake typing or outputs; each subprocess is run while this is recorded.
    """
    terminal=f'''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:Inter;src:url(data:font/woff2;base64,{font64}) format('woff2');font-weight:100 900}}
*{{box-sizing:border-box}}body{{background:#090909;color:#f5f5f3;margin:0;font-family:Inter,Arial,sans-serif;padding:48px 65px}}
.small{{color:#ffb365;font-size:14px}}h1{{font-size:29px;letter-spacing:-.04em;margin:8px 0}}p{{font-size:13px;color:#9b9b9a;margin:0 0 24px}}
.console{{background:#19191a;border:1px solid #3b3b3c;border-radius:18px;padding:23px 27px;min-height:550px}}
pre{{color:#ece9e5;font:15px/1.75 monospace;white-space:pre-wrap;word-break:break-word;margin:0}}.foot{{color:#a6a4a2;font-size:13px;margin-top:20px}}
</style></head><body><div class="small">Athar / Offline proof</div><h1>Real network checks — {html.escape(stage)}</h1><p>Actual subprocess outputs captured live inside the app's Linux network namespace.</p><div class="console"><pre id="output"></pre></div><div class="foot">The host's Wi-Fi state is not claimed. The browser, app server and QVAC worker share this isolated namespace.</div></body></html>'''
    page.goto('data:text/html;charset=utf-8,'+quote(terminal))
    connection_code=('import errno,socket; s=socket.socket(); s.settimeout(2); '
        'r=s.connect_ex(("1.1.1.1",443)); s.close(); print(errno.errorcode.get(r,"UNKNOWN"),r)')
    commands=[
        (f'readlink /proc/{server_pid}/ns/net  # app server', ['readlink',f'/proc/{server_pid}/ns/net']),
        (f'readlink /proc/{worker_pid}/ns/net  # QVAC worker', ['readlink',f'/proc/{worker_pid}/ns/net']),
        (f'readlink /proc/{browser_pid}/ns/net  # browser', ['readlink',f'/proc/{browser_pid}/ns/net']),
        ('ip -br link', ['ip','-br','link']),
        ('ip -4 route show', ['ip','-4','route','show']),
        (shlex.join([os.sys.executable,'-c',connection_code]), [os.sys.executable,'-c',connection_code]),
    ]
    checks=[]
    for label,argv in commands:
        # Network, namespace and socket checks are all real subprocess calls in this namespace.
        completed=subprocess.run(argv, capture_output=True, text=True, timeout=8, check=True)
        stdout=completed.stdout.rstrip('\n')
        if argv[0]=='readlink' and stdout!=os.readlink('/proc/self/ns/net'):
            raise RuntimeError(f'{label} is not in the recording namespace')
        if argv[:3]==['ip','-4','route'] and stdout:
            raise RuntimeError('A network route exists')
        if argv[0]==os.sys.executable and stdout!=f'ENETUNREACH {errno.ENETUNREACH}':
            raise RuntimeError('The real outbound connection did not return ENETUNREACH')
        shown=stdout if stdout else '(no output — no IPv4 routes)'
        page.locator('#output').evaluate('(el, text) => { el.textContent += text; }', '$ '+label+'\n'+shown+'\n')
        checks.append({'display':label,'argv':argv,'stdout':stdout,'exit_code':completed.returncode})
        page.wait_for_timeout(600)
    page.wait_for_timeout(2500)
    return checks

video_dir=Path(os.environ.get('ATHAR_VIDEO_TMP') or tempfile.mkdtemp(prefix='athar-video-'))
video_dir.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1280,'height':800},record_video_dir=str(video_dir),record_video_size={'width':1280,'height':800})
    page=context.new_page(); start=time.monotonic();timings={}
    page.goto('data:text/html;charset=utf-8,'+quote(proof));page.wait_for_timeout(6000)
    page.goto(base+'/',wait_until='domcontentloaded');page.locator('.status-dot.ready').wait_for(timeout=120000)
    status=page.request.get(base+'/api/status').json()
    if status.get('device')!='cpu' or not isinstance(status.get('threads'),int):raise AssertionError('Missing execution configuration')
    result['cpu_threads_for_inference']=status['threads']
    server_pid=int(os.environ['ATHAR_SERVER_PID'])
    server_children=child_pids(server_pid)
    worker_candidates=[pid for pid in server_children if b'@qvac/sdk/dist/src/worker' in Path(f'/proc/{pid}/cmdline').read_bytes()]
    browser_candidates=[]
    for pid in child_pids(os.getpid()):
        try:
            cmd=Path(f'/proc/{pid}/cmdline').read_bytes()
            exe=os.readlink(f'/proc/{pid}/exe')
            if 'chrome-headless-shell' in exe and b'--type=' not in cmd: browser_candidates.append(pid)
        except OSError: pass
    if not worker_candidates or not browser_candidates:raise RuntimeError('Unable to verify QVAC worker or browser process namespace')
    worker_pid=worker_candidates[0];browser_pid=browser_candidates[0]
    self_net=os.readlink('/proc/self/ns/net')
    namespaces={name:os.readlink(f'/proc/{pid}/ns/net') for name,pid in [('server',server_pid),('qvac_worker',worker_pid),('browser',browser_pid)]}
    if any(net!=self_net for net in namespaces.values()):raise RuntimeError('App, QVAC or browser is outside the isolated namespace')
    result['network_namespace']={'recorder':self_net,**namespaces,'server_pid':server_pid,'qvac_worker_pid':worker_pid,'browser_pid':browser_pid}
    timings['network_before']=round(time.monotonic()-start,2)
    result['live_network_checks_before']=network_terminal(page,'before inference',server_pid,worker_pid,browser_pid)
    timings['overview']=round(time.monotonic()-start,2)
    page.goto(base+'/',wait_until='domcontentloaded');page.locator('.status-dot.ready').wait_for(timeout=120000)
    if page.locator('.metric-number').all_text_contents()!=['9','4','5']:raise AssertionError('Unexpected source case')
    page.wait_for_timeout(4500)
    timings['assistant']=round(time.monotonic()-start,2)
    page.locator('[data-view="assistant"]').first.click();page.wait_for_timeout(3000)
    timings['inference_started']=round(time.monotonic()-start,2)
    with page.expect_response(lambda r:r.url.endswith('/api/extract'),timeout=120000) as response_info:
        page.locator('[data-action="run-ai"]').click()
    response=response_info.value; extracted=response.json()
    if response.status!=200 or [x['value'] for x in extracted['candidates']]!=[9,4]:
        raise AssertionError(f'Unexpected actual extraction: {extracted}')
    page.locator('.candidate').last.wait_for(timeout=30000)
    timings['result']=round(time.monotonic()-start,2)
    page.locator('.candidate').last.scroll_into_view_if_needed();page.wait_for_timeout(5000)
    timings['review']=round(time.monotonic()-start,2)
    page.locator('[data-action="candidate"]').first.click()
    if page.locator('#entry-kind').input_value()!='':raise AssertionError('Classification should require a person')
    page.wait_for_timeout(4500)
    page.locator('#modal [data-action="close-modal"]').first.click()
    timings['records']=round(time.monotonic()-start,2)
    page.locator('[data-view="records"]').first.click();page.wait_for_timeout(4500)
    timings['draft']=round(time.monotonic()-start,2)
    page.locator('[data-view="report"]').first.click();page.wait_for_timeout(4500)
    result['external_tcp_errno_after']=connectivity()
    if result['external_tcp_errno_after']!=errno.ENETUNREACH:raise RuntimeError('Network unexpectedly reachable')
    timings['network_after']=round(time.monotonic()-start,2)
    result['live_network_checks_after']=network_terminal(page,'after inference',server_pid,worker_pid,browser_pid)
    result['qvac_response']=extracted
    result['video_timeline_seconds']=timings
    result['network_proof']='No IPv4 routes, loopback only, TCP connect returned ENETUNREACH before and after inference.'
    result['video_duration_observed_seconds']=round(time.monotonic()-start,2)
    video=page.video
    context.close();video_path=Path(video.path());browser.close()
(root/'evidence').mkdir(exist_ok=True)
shutil.copy2(video_path,root/'evidence'/'Athar_Offline_Recording.webm')
(root/'evidence'/'offline-proof.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
