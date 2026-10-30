# Security and privacy boundaries

Athar is a review prototype, not a secure case-management service.

- Cases live in browser `localStorage` without encryption and are accessible to anyone with access to that browser profile. Backups and drafts downloaded from the app are also unencrypted. Clearing browser data can delete cases. Use a trusted device and appropriate device-level protection.
- The server defaults to `127.0.0.1`; case data is not stored by application server routes. Only the excerpt selected by the user is sent to the local server for inference. The app has no accounts or multi-user isolation. Other local processes or users with device access are outside this protection.
- The preview mode listens on `0.0.0.0` and explicitly warns that inference is remote. Never enter private or sensitive information in a remote preview. Do not enable preview mode on an untrusted network.
- Static assets are allowlisted; dynamic text is escaped; source links are limited to HTTP(S); POST requests require a custom header and same-origin check. These measures are not a security audit.
- QVAC can make semantic mistakes, omit information, or follow malicious text instructions. Literal quote/number checks prevent some unsupported candidates but do not prove correct meaning. Nothing is committed without the user manually selecting and reviewing the category.
- Source labels are self-reported. SHA-256 of an imported CSV helps compare bytes but does not prove authenticity, provenance, time, or legal validity. Files are not retained by the app.
- Install from a trusted copy of the lockfile. The sequential installer downloads fixed npm archives and checks lockfile integrity but depends on system tar and trusts the locked packages. The Windows installation path has not been tested.
- Do not publish private worker records in a repository or video. The included material is limited to attributed published examples and automated test artifacts.
