# AI Yako — Track 1 submission pack

**Status:** Source, a narrated video, the original recording and test evidence are included in this public-repository package. The DoraHacks submission and any external video-host upload require independent confirmation.

## Title

Athar Attendance — When a Workday Disappears from the Record

## Short description

Athar helps a worker or advocate review differences in attendance information without relying on connectivity after setup. QVAC runs a local Qwen2.5 model to extract candidate day counts with exact excerpts. The person checks the context and classifies each candidate; deterministic code compares the selected inputs, distinguishes unknown from absent, and prepares an editable review request. The app does not send a complaint, verify the source, calculate entitlement or decide wages.

## Problem and evidence

Article 14 reported a historical Rajasthan case in which a paper register showed nine days and the online register four. Athar retains this as a single published source, not as two independently verified original records. The Quint published Vikas Kumar's account of 14 days worked and seven recorded in January 2023. Slate reported Anita Devi's account of six days on the paper list and four in the app. News18 quoted Kesar Devi as reporting 13 days of work in January 2023; the app leaves the corresponding recorded count **unknown** because the article does not specify it. [Source links and image provenance](SOURCES.md).

An MKSS comparison reported by The Hindu found 302 missing labour-days across 14 local councils in September 2022; it is a historic sample, not a national prevalence estimate. The NMMS attendance system itself supports offline operation; we do not claim Athar is the first offline attendance tool or that it fixes the government system.

## QVAC integration and reproducibility

- `server.mjs` imports `@qvac/sdk` 0.22.0, loads the model with `loadModel`, and performs real local inference with `completion` in the `/api/extract` endpoint. The model is unloaded on shutdown.
- Default model: [QuantFactory Qwen2.5-1.5B-Instruct Q4_K_M GGUF, pinned revision](https://huggingface.co/QuantFactory/Qwen2.5-1.5B-Instruct-GGUF/blob/a5012fb3d2b76e78d99b526b397bb19cc908c789/Qwen2.5-1.5B-Instruct.Q4_K_M.gguf). Model SHA-256: `0495b6ad92bab3420f870a001c0add99562d5eb878109ebe8e4cb8de99e0bed5`. It is downloaded once and not bundled in the repository.
- `public/core.mjs` checks that quoted text and numeric tokens appear in the supplied passage; it cannot establish semantic correctness or authenticity. A person must review and classify suggestions.
- Setup, dependencies, hardware, privacy, licensing and an offline reproduction command are in the [README](../README.md). The complete measured execution is in [`evidence/offline-proof.json`](../evidence/offline-proof.json) and the local [the narrated demo](../evidence/Athar_Narrated_Demo.mp4).
- The observed offline run is Linux x64 and CPU-only, with the browser, server and QVAC process inside a loopback-only network namespace, no IPv4 route, and `ENETUNREACH` before and after inference. Exact run time, Node version, memory, CPU threads and outputs are recorded in the proof JSON and shown in the video.
- **Windows is not tested.** Do not assert hardware compatibility without running it. No field deployment, recovered wages or broad accuracy result has been established. The model can misinterpret text, even when a quote matches.

## Assets and work disclosure

The earlier app, research, core logic and QVAC integration existed before this revision and are disclosed as prior work. During the event on 30 October 2026 we redesigned the interface using a user-supplied reference, added the Anita and Kesar published-source cases, expanded tests and recorded the final offline demo. Confirm the timeline of earlier work before submitting. The generated portraits are fictional visual illustrations, not photographs of named people or users, and are labelled in the interface. Code is MIT licensed; fonts are SIL OFL; QVAC SDK 0.22.0 and the referenced model are separately licensed Apache-2.0 according to their respective distributions. Other dependencies retain their own licences. More detail: [SOURCES.md](SOURCES.md).

## External checklist — user account required

1. Verify that the public repository, README, code, tests, licences, source attribution and offline evidence are visible to someone signed out. Never publish model files, dependencies, caches, case exports or credentials.
2. Use the narrated demo in `evidence/Athar_Narrated_Demo.mp4`; if the form requires a video-host URL, upload it to a publicly accessible or unlisted host. Verify playback while signed out. Do not replace the real inference with a simulation.
3. Submit on [DoraHacks](https://dorahacks.io/hackathon/ai-yako/detail): choose the offline AI apps track, provide the public repository and video links, model and SDK versions, hardware details, team information, work/assets disclosure and limitations. WDK applies to the financial application track, not Track 1.
4. Provide actual team members/contact details and follow the current event instructions for remote participation. Do not invent names or claim submission until DoraHacks confirms it.
5. If time permits, test on the actual Windows machine; otherwise keep the Windows limitation prominent.

The official event page is authoritative for deadlines, eligibility and the final form: https://dorahacks.io/hackathon/ai-yako/detail
