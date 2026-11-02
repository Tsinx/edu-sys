# Search and decision ledger

Search date: 2026-11-01. All candidates remain open to rejection. A metadata hit is not a full-text reading.

## Round 1: obtainable data and 2026 research

Crossref queries returned 1,625 2026 issue/online records across Management Science, Organization Science, Strategic Management Journal, Academy of Management Journal, Journal of Marketing Research, Marketing Science, Information Systems Research, and M&SOM. Raw responses are retained. This is bibliographic screening, not a claim that 1,625 articles were read. Issue dates and first-online dates are verified individually for retained neighbors.

| Route | Actual evidence | Current decision |
|---|---|---|
| Reuse journal replication archives as new-research data | MS policy distinguishes verification use from other research; some SMJ replication code depends on licensed Compustat | Source data and reuse rights must be checked individually; archive availability alone does not clear access |
| Consumer reviews and restaurant regulation | Farronato and Zervas, Marketing Science, DOI 10.1287/mksc.2023.0088, first online 2026-04-27, already studies visibility, consumer reviews and compliance | Generic private-review/regulatory-compliance idea not retained. Chicago's 2014 randomized evaluation is a different possible window; root repository listing obtained, actual data not yet assessed |
| Government contracting and worker compliance | Abdurakhmonov/Yu/Shi, Organization Science, DOI 10.1287/orsc.2024.19026; CGIR DOI 10.1111/corg.70035; Kim SSRN 6235439 already uses shutdown/sequestration | Generic government-demand/risk topic not retained. No OSHA/USAspending merge yet; obligations are not payment dates |
| AI/open-source coordination | Multiple 2026 ISR/MS studies concern open-source co-creation, strategic release and team coordination | No distinct measured mechanism or obtained dataset yet; do not count this as a project |
| UK payment disclosure metrics | Official original CSV obtained: 116,643 reports, 10,301 legal entity identifiers, 52 columns; new monetary-duration bands appear under Regimes 2/3 | Active lead: study the allocation implied by invoice-count versus pound-based accountability. Closest full text and an identifying management intervention still required |

## Round 2: UK payment data audit

Original download `2026-11-01-0710-prompt-payments.csv`; saved unchanged as `data/uk-payment-practices-2026-11-01.csv` (104,331,893 bytes), SHA256 `52e8be6fb83749f1df049c7c33640d14411cd1ad01bfbacd2c509e9786e192d8`.

Download source: https://check-payment-practices.service.gov.uk/export/ ; actual Get CSV File href https://check-payment-practices.service.gov.uk/export/csv/ . Footer: Open Government Licence v3.0, except where otherwise stated. Contains public sector information licensed under the Open Government Licence v3.0. Initial downloadMedia timed out while the normal browser download continued; the final complete CSV was subsequently confirmed and copied. No inference uses the partial crdownload file.

Independent code: `analysis/audit_payments.py`; receipt and detailed results: `analysis/payment-audit.json`. Initial exclusions are audit rules, not a frozen causal estimation sample:

- 27 period-end dates later than the retrieval date, 92 filing dates preceding period end, and 3,822 rows involved in same-company/same-period duplicates.
- Keep the latest filing/report ID for identical legal entity and period; preserve the raw original. Date-clean de-duplicated set: 114,556 reports.
- New-regime, positive-value, valid-count-band reports covering 150–215 days: 15,231 reports from 6,164 entities. Of these, 781 entities have one report, 1,702 two, 3,678 three, and three four.
- Count and amount-duration shares are paired for the **same paid-in-period cohort**. The amount of overdue invoices divided by total invoices paid is not used as a share because the cohorts differ.
- 2,225 report-level amount shares for payments after 60 days exceed the corresponding count share by over 5 percentage points; 2,189 show the reverse. At the first new report per entity, the respective counts are 946 and 882. This does not support a universal one-direction story.
- 7,890 reports satisfy the simple headline combination mean days <=45 and <=5% invoices paid after60 days. In 472 of those, over10% of paid value falls in the >60-day band. This is a descriptive metric comparison, not an audit of legal procurement eligibility.

Working contribution question: when market access is tied to invoice-count/mean-day targets, how does the **unit of accountability** shape the allocation of payment delays across invoice sizes? Does reducing a threshold improve broad liquidity allocation or concentrate residual delays? No causal answer is claimed yet.

Verified policy window: PPN018 changes the average-day target from55 to45 for relevant central-government procurements advertised from2025-10-01. It also retains invoice-count thresholds and has scope, framework, action-plan and intercompany provisions. PPN015 alone still says55. Award exposure and policy applicability must be constructed from actual procurement notices, not industry guesses.

## Closest papers: current reading states

| Paper | Verified state | Relevance |
|---|---|---|
| Chuk, Lourie & Yoo, *The Check Is in the Mail*, MS72(6),5027–5047 (2026); first online2025-09-24; DOI10.1287/mnsc.2024.06586 | Published full PDF subsequently obtained through school EBSCO; key theory/design/results/appendix sections read. Receipt: `fulltext-readings.md` | Already examines monetary late balances, supplier importance, financing constraints and consequences; generic disclosure or liquidity stories are covered |
| Cohen et al., *Late Trade Credit Payments to Meet Cash Flow Forecasts*, RAST first online2026-08-07, DOI10.1007/s11142-026-09985-w; SSRN5033337 | Publisher abstract/notes and formal-publication metadata read; full text not yet obtained | Strategic delay for cash-flow targets and supplier-relationship costs already covered |
| Chuk et al., *The Real Effects of Supply Chain Finance Disclosure*, SSRN3890547 revised2026-02-10 | Abstract/metadata read, full text not yet obtained | SCF disclosure and bargaining mechanism already covered |
| Walker & Hyndman, *Late payments, higher prices?*, Decision Sciences56(6),598–621 (2025), DOI10.1111/deci.70006 | Publisher HTML full text available through web; introduction and model extensions read so far; not yet an entire-paper reading | UK reports through2023, competitive procurement model and experiment. Longer announced terms and relationship persistence alone are not a new mechanism |

## Checkpoint after procurement and same-period probes

Subsequent obtained data, computation and the current continuation decision are in `round-2-review.md`. Full-text access/reading states in `fulltext-readings.md` supersede initial access attempts. The goal remains active, with no cleared project.

## Decisive tests

1. Obtain/read the two strongest payment papers' full texts and follow their nearest references.
2. Retrieve actual open procurement notices/awards, audit identifiers and dates, establish a meaningful pre-policy exposure sample.
3. Test changes in both count and amount allocation with a credible comparator; distinguish reporting change, tender selection and genuine reallocation.
4. If these cannot produce a substantive increment, reject this lead and continue the data-first loop with a different obtained dataset.

## Round3: obtained cyber corpus and original notices

Acquired19,771record IDs from the openly licensed Breach Vectors repository at an immutable commit, plus65original Washington AGO-hosted MOVEit notice PDFs. Audited20fixed-sample packets and computed source-grounded stage intervals. The official CA CSV/WA Socrata endpoints still did not yield datasets; the new open corpus is a separately attributed source, with automatic-extraction and date-merging issues.

Continued lead: notification production across a compromised operator, its clients/data owners and recipient cohorts. Closest MS2022published PDF obtained and relevant theory/data/design/contribution passages read; JMIS2024author full-text methods/coding examined. Scope, source receipts, arithmetic and the next finite investment gate: `round-3-cyber-notification.md`. No topic yet cleared.
