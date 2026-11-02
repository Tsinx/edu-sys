# ODD source and feasibility reproduction

The original author-provided files stay under`../data/odd/`. The public folder and complete byte/hash receipts are in`../records/odd-document-downloads.json`,`odd-company-download.json`and`odd-archive-download.json`.

The Google Drive connector successfully returned the PDF, original XLSX and190,417,228-byte Stata name mapping. Its256MiB response cap rejected the1.97GB archive. The ordinary public Drive download form was then followed through HTTPS by`obtain_odd_archive.py`; no account, private API, executable download, TLS bypass or permission change was involved. A partial file is retained on failure and must be inspected before retrying.

The name mapping and document materialization used the connector's returned authenticated raw-file reference and streamed its original bytes to disk; expiring download URLs were not retained in repository receipts.

Observed environment: Python3.13, pandas3.0.3, numpy2.4.6, PyMuPDF1.27.2. No new packages were installed for these steps. Work was serial; numerical thread variables are1. The archive expands to29.9GB; the original data frames are read in200k/250k-row chunks, not loaded as full95m-row tables.

From the repository root, after retaining the named original metadata/name files, run sequentially:

```powershell
$env:PYTHONUTF8='1'
python research/management-empirical-2026-11-01/analysis/obtain_odd_archive.py
python research/management-empirical-2026-11-01/analysis/extract_odd_archive.py
python research/management-empirical-2026-11-01/analysis/audit_odd_dataset.py
python research/management-empirical-2026-11-01/analysis/screen_odd_breach_linkage.py
python research/management-empirical-2026-11-01/analysis/extract_odd_breach_pilot.py
python research/management-empirical-2026-11-01/analysis/check_odd_pilot_support.py
python research/management-empirical-2026-11-01/analysis/check_odd_name_coverage.py
python research/management-empirical-2026-11-01/analysis/obtain_odd_incident_sources.py
```

The source audit creates the fixed2000-company sample plan before extracting its outcomes. The linkage screen independently chooses40government-source targets before inspecting their employment outcomes. These are data and source pilots, not a preregistered causal study. The2,000-company plan transparently records that document/schema and first100k composition-row inspection had already happened.

Read`odd-source-audit.json`,`odd-breach-pilot-extraction.json`and`odd-pilot-support-check.json`together. The first audit's finite composition formula check is strengthened by the separate whole-composition pass in the breach-pilot extractor, which also counts missing proportions and nonpositive/missing denominators. Both checks passed. The three source files align at every source-row key; global key uniqueness was checked only in the extracted pilots.

Empirical units differ from some dictionary labels: decode Stata SOC value labels, filter2003–2023explicitly, and treat the released`total_rcid_year`and`percent_with_photo`as occupational-cell fields. Promotion/turnover event composition is not an individual promotion/exit hazard. Keep original source-row ordinals.

The public incident corpus includes automatic extraction/imports. Name matches, government URLs, actual original-PDF acquisition and manual source coding are four distinct states. The dated manual readings live in`../records/odd-incident-source-coding.json`; the source downloader does not automatically certify a case or infer actual notification from a template.

The name mapping has3,339empty strings, missed by the initial NA-only check. The separate name-coverage script checks empty/whitespace strings and scans actual source IDs/years. The original2,000-ID pilot is retained; unnamed identities cannot be labelled known unbreached controls. Source-audit membership counts refer to mapping IDs, not nonblank company names.

No incident-effect model has been estimated. The current research judgment and nearest studies are in`../records/round-7-data-and-workforce-feasibility.md`.
