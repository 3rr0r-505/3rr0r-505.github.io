---
title: "HTB Sherlock: CrownJewel"
date: 2025-09-08
platform: HTB
difficulty: Easy
description: "Forensics challenge involving NTDS.dit extraction and ESE database analysis to uncover credential theft from a Domain Controller."
---

## Scenario

A junior member of our security team spotted unusual activity on our Domain Controller. Your task is to investigate a potential credential theft scenario.

## Tools Used

- `esedbexport` — ESE database extraction
- `impacket-secretsdump` — NTDS credential dump analysis
- `sqlite3` — database queries

## Investigation

### Initial Triage

Checking the provided artifacts:

```bash
ls -la artifacts/
# ntds.dit  SYSTEM  SECURITY
```

![Artifact listing](assets/1.png)

### Extracting NTDS.dit

```bash
esedbexport -m tables ntds.dit
# Exports to ntds.dit.export/
```

### Querying the Database

```bash
sqlite3 ntds.dit.export/datatable.4
.tables
```

Relevant columns in `datatable`:

| Column | Description |
|--------|-------------|
| ATTm590045 | SAM Account Name |
| ATTk589879 | NT Hash |
| ATTj589832 | Account flags |

### Dumping Credentials

```bash
impacket-secretsdump -ntds ntds.dit -system SYSTEM LOCAL
```

> *The Domain Admin hash was extracted confirming lateral movement from the compromised workstation.*

## Answers

```
Q1: ntds.dit
Q2: 2023-09-28 17:28:48
Q3: administrator
```

---

*Forensics tip: always preserve original timestamps before touching artifacts.*