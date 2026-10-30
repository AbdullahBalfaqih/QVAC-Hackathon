# Sources and asset provenance

## Published examples

The examples below are historical reports, not authenticated government records or proof of eligibility. Dates in parentheses identify the work period; dates after the publication identify the published article. Athar has not independently verified the statements or obtained the original rolls. Both counts in a two-count example come from the *same* article, not from two independently checked documents.

| Case | What the linked source reports | Scope retained in app | Link |
| --- | --- | --- | --- |
| Lakshmi Devi | 9 days on a physical roll, 4 in the online record | 1–15 May 2022 | [Article 14, 5 July 2022](https://tribe.article-14.com/post/nrega-workers-are-losing-wages-because-of-mandatory-app-attendance--62c39de7b5d3d) |
| Vikas Kumar | He said he worked 14 days and was marked present for 7 | January 2023; individual dates not stated | [The Quint, 10 April 2023](https://www.thequint.com/news/mgnrega-workers-unpaid-wages-app-attendance-workers-states-protest-delhi-jantar-mantar) |
| Anita Devi | She said the physical list had 6 days, but the app showed 4 | January 2023; individual dates not stated | [Slate, 17 April 2023](https://slate.com/technology/2023/04/digital-india-mgnrega-protest.html) |
| Kesar Devi | She said she worked 13 days in January and had not been paid for her January–March work at the time of reporting | January 2023; the number recorded by the app for January is **unknown**, not zero | [News18, updated 18 April 2023](https://www.news18.com/india/pending-wages-drop-in-person-days-attendance-on-app-why-mgnregs-workers-are-protesting-7553455.html) |

Short quotations are attributed and the source URLs are retained with the data. No photographs from those articles, original payroll records, individual daily dates, current claim status, or invented outcomes are bundled. The examples do not represent the current program or national prevalence.

## Visual assets

- `public/avatars/portrait-01.jpg` through `portrait-06.jpg` were generated with an image-generation tool for this interface, then reduced to 256 × 256 JPEG. They depict fictional people. **They are not photographs of the named people in the articles, nor of the app user.** The interface displays this disclosure alongside the cards and in its privacy section.
- The user supplied a dashboard screenshot as a visual design reference; its layout informed the application design. That screenshot is not included in the source distribution. The application does not use that reference's names, tasks, statistics, or logos.
- Interface icons and the Athar mark are project-authored inline vector shapes. The six generated illustrations are not copied from the cited publications. Review the image-generation provider's current terms before redistribution if required.
- Inter and Noto Sans Arabic are bundled locally with their SIL Open Font License files in `public/fonts/`.
- The code is MIT-licensed. QVAC SDK, GGUF model, fonts, and transitive dependencies have their own licences; see `README.md` and the installed packages.

## Work and dependencies

A prior Athar prototype, its research, core comparison logic and QVAC integration existed earlier in this conversation and before this revision; disclose them as prior work rather than presenting the revision as entirely independent. The final interface redesign, additional Anita and Kesar source cases, extended browser tests and updated offline recording were completed on 30 October 2026 during the event. Confirm the earlier work timeline before submission. It relies on QVAC SDK 0.22.0, an externally developed Qwen2.5 model, separately distributed fonts, standard open-source dependencies and the linked reporting. See the lockfile and `docs/AI_YAKO_SUBMISSION.md`. No third-party case photos are supplied.
