# Copy for the AI Yako Build form

## Project name
Athar Attendance — When a Workday Disappears from the Record

## Track
Offline AI apps

## Short description
Athar helps workers and advocates organize attendance evidence offline. QVAC extracts candidate day counts and quotations locally; a person reviews their meaning before comparing records or preparing a draft.

## Problem and solution
Attendance discrepancies can be difficult to document where connectivity is unreliable. Athar keeps cases in the browser, lets an advocate enter attributed counts or dated information, and uses QVAC to find candidate counts in a provided text without a cloud AI service. The interface flags incomplete or duplicate evidence; missing information is not automatically treated as absence. A human reviews every model suggestion and any draft. Athar does not submit claims, verify original records, determine legal entitlement or calculate wages.

The included historical examples are attributed to published reporting, not original independently verified registers. When two values come from one article, the interface states that explicitly. In the News18 example, the recorded January count is unknown and stays unknown.

## QVAC and offline demonstration
The core AI runs using `@qvac/sdk` 0.22.0 and Qwen2.5-1.5B-Instruct Q4_K_M GGUF, invoked via `loadModel` and `completion` in `server.mjs`. After a one-time download of dependencies and the model, the inference requires no internet. The recorded Linux x64 run used CPU with two threads and approximately 1.94 GiB total memory. The browser, server and QVAC worker ran in a loopback-only network namespace with no IPv4 routes. TCP connection to 1.1.1.1:443 returned `ENETUNREACH` before and after the real inference. The model extracted 9 and 4 in 36.910 seconds from a published passage; this is one observed test, not a general accuracy measure. The complete inference is retained in the demo video and the evidence JSON.

## Constraints and disclosures
Linux was tested; Windows setup is provided but remains untested. QVAC runs on CPU in this implementation; GPU is not tested. Browser storage and exports are unencrypted. Model/dependency setup and external source links require a network; the core inference does not after setup. The model and SDK are separately licensed, and the README includes versions, hardware requirements and reproduction steps.

A prior Athar prototype, research and core QVAC integration existed before this design revision and are disclosed as prior work. During the event on 30 October 2026, the interface was redesigned, two additional published-source cases were added, tests were expanded and the updated offline demo was recorded. Confirm the timeline of earlier work before submitting. Generated portraits are fictional illustrations, not the people named in the sources. See `docs/SOURCES.md` for citations and asset details.

## Links and team details
Repository: https://github.com/AbdullahBalfaqih/QVAC-Hackathon. Provide a publicly accessible video URL, actual team members and contact information on DoraHacks. Verify links while signed out; the Build is not submitted until DoraHacks confirms it.
