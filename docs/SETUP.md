# Setup and reproducibility

## Requirements

- Node.js 22.17 or later and system `tar`.
- Linux x64 tested; Windows 10/11 x64 is a target, **not tested**. QVAC documents Vulkan 1.4+ on Windows even for CPU operation.
- QVAC recommends at least 4 GB RAM and approximately 5 GB free disk; allow at least 6 GB for this setup. The recorded Linux VM had about 1.94 GiB RAM; this does not guarantee operation elsewhere.
- An internet connection is needed once for dependencies and the model (about 986 MB). Neither is included in this repository.

## Install and run

Linux:

```bash
node --version
node scripts/install-locked.mjs
node scripts/download-model.mjs
node server.mjs
```

Windows PowerShell, untested:

```powershell
node --version
node .\scripts\install-locked.mjs
node .\scripts\download-model.mjs
node .\server.mjs
```

Open `http://127.0.0.1:4174` on the same device, and wait for `QVAC ready`. `Setup-Athar.cmd` and `Start-Athar.cmd` are untested Windows convenience launchers. The sequential installer verifies locked package integrity and will not overwrite an existing `node_modules` directory.

The default model is `Qwen2.5-1.5B-Instruct.Q4_K_M.gguf`. Its pinned SHA-256 is `0495b6ad92bab3420f870a001c0add99562d5eb878109ebe8e4cb8de99e0bed5`. Set `MODEL_PATH` to an already downloaded compatible file. Set `ATHAR_THREADS` to a positive integer no greater than the process's available logical CPUs; the recorded run used `2`. Other model files and GPU execution have not been verified.

## Optional smaller model

```bash
node scripts/download-model.mjs --small
MODEL_PATH="$PWD/models/Qwen2.5-0.5B-Instruct.Q4_K_M.gguf" node server.mjs
```

In one Linux trial the smaller model returned the two numbers in reverse order; the UI still requires human interpretation. This is not a general quality comparison.

## CSV import

Use UTF-8 with these headers:

```text
date,side,status,source
```

`date` is `YYYY-MM-DD` inside the case period. `side` is `worker` or `register`. Worker status must be `worked`; register status can be `present`, `absent` or `unknown`. `source` is a real source description. Preview rows before import. The SHA-256 fingerprint compares file bytes; it does not prove origin, time or authenticity.

## Reproduce the offline recording on Linux

Install Python Playwright and Chromium, FFmpeg and `iproute2`; enable user and network namespaces. From the repository root:

```bash
MODEL_PATH="$PWD/models/Qwen2.5-1.5B-Instruct.Q4_K_M.gguf" ./scripts/offline-demo.sh
python scripts/render-demo.py
```

The first command records a new automated browser run and proof, failing if the isolation checks fail; the second produces a captioned, silent version of that new recording. The shipped narrated edit additionally contains an opening graphic and AI-generated voice-over, and preserves the full inference. Runtime and outputs can differ on another machine. See [`../evidence/README.md`](../evidence/README.md).
