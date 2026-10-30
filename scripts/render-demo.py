"""Add readable timed captions to the real, uncut offline recording.
Requires ffmpeg with libx264 and drawtext. Does not change video speed or splice footage.
Run after scripts/offline-demo.sh has successfully produced a fresh proof and WebM.
"""
from pathlib import Path
import errno
import json
import subprocess

ROOT = Path(__file__).resolve().parent.parent
EVIDENCE = ROOT / 'evidence'
proof = json.loads((EVIDENCE / 'offline-proof.json').read_text())
times = proof['video_timeline_seconds']
if proof['external_tcp_errno_before'] != errno.ENETUNREACH or proof['external_tcp_errno_after'] != errno.ENETUNREACH or proof['ipv4_routes'] or proof['interface_names'] != ['lo']:
    raise SystemExit('Invalid isolation proof; refusing to render the video.')
if [x['value'] for x in proof['qvac_response']['candidates']] != [9, 4]:
    raise SystemExit('Unexpected actual inference output; review the proof before rendering.')
segments = [
    (times['overview'], times['assistant'], 'Published account - both figures come from one source'),
    (times['assistant'], times['inference_started'], 'The source passage is sent to the local QVAC model'),
    (times['inference_started'], times['result'], 'Real QVAC inference - uncut and offline'),
    (times['result'], times['review'], 'Suggestions only - a person reviews the meaning'),
    (times['review'], times['records'], 'A person must classify each suggestion before it is saved'),
    (times['records'], times['draft'], 'Missing information is not treated as absence'),
    (times['draft'], times['network_after'], 'The review draft is editable and is not sent automatically'),
    (times['network_after'], proof['video_duration_observed_seconds'], 'Real network checks after the model response'),
]
font = str((ROOT / 'public/fonts/InterVariable.woff2').resolve()).replace(':', '\\:').replace("'", "\\'")
filters = [f"drawbox=x=0:y=752:w=iw:h=48:color=black@0.90:t=fill:enable='between(t,{times['overview']:.2f},{proof['video_duration_observed_seconds']:.2f})'"]
for start, end, text in segments:
    if end <= start:
        raise SystemExit('Video timeline is invalid.')
    # A short fade in and out changes only the caption, never the underlying recording.
    alpha = f"min(1,max(0,min((t-{start:.2f})/0.25,({end:.2f}-t)/0.25)))"
    filters.append(f"drawtext=fontfile='{font}':text='{text}':x=40:y=768:fontsize=17:fontcolor=white:alpha='{alpha}':enable='between(t,{start:.2f},{end:.2f})'")
command = [
    'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(EVIDENCE / 'Athar_Offline_Recording.webm'),
    '-vf', ','.join(filters), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', str(EVIDENCE / 'Athar_Offline_Demo.mp4')
]
subprocess.run(command, cwd=ROOT, check=True)
print('Rendered', EVIDENCE / 'Athar_Offline_Demo.mp4')
