# Demo test results

- Recorded: 2026-10-30T12:56:47.205090+00:00 on Linux x64; Node v22.23.4, QVAC SDK 0.22.0, Qwen2.5-1.5B-Instruct Q4_K_M, CPU with 2 threads, 2,030,404 KiB reported total RAM.
- Network isolation: the recorder, browser, app server and QVAC worker share the same isolated Linux network namespace; only `lo`; no IPv4 routes; connection to 1.1.1.1:443 returned `ENETUNREACH` (101) before and after inference. See `offline-proof.json` for the measurement.
- Actual QVAC extraction: candidates 9 and 4 with exact excerpts `nine days` and `four days`, in 36.910 seconds. This was one historical published passage, not an accuracy benchmark or independently authenticated original record. The app requires a person to classify the candidates.
- `npm test`: 12 of 12 passed; browser workflow: 35 checks passed including two real QVAC extractions; reference UI: 53 checks passed; local workflows: 12 checks passed.
- Original captioned demo (`Athar_Offline_Demo.mp4`): H.264, 1280 × 800, 89.36 seconds, no audio. The narrated edit (`Athar_Narrated_Demo.mp4`) is 106.84 seconds with an added opening and AI-generated English voice-over. The screen is a real automated browser recording; command outputs are captured live in a browser-rendered transcript before and after inference. Explanatory captions and the introductory graphic do not speed up or cut the model inference. The host Wi-Fi is not claimed to be off.
- Windows, real-world field deployment, and recovered wages were not tested.
