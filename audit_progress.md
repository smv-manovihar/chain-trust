# App Reliability & Resilience Audit — Final Report

## Artifacts
- **Findings Log**: `audit_progress.md` (This file)
- **Execution Traces**: [audit_traces.md](file:///d:/Coding/ChainTrust/audit_traces.md)

## Current Status

| Field | Value |
|---|---|
| **Status** | Complete (Deep-dive: Backend, AI Service, Auth, Storage, PDF Scalability) |
| **Flows Done** | 15 / 15 |
| **Issues Found** | 67 (C: 22 · H: 20 · M: 18 · L: 7) |

---

## Executive Summary

The audit identified critical reliability risks at the intersection of the AI-service and the Node.js backend. Major findings include **CPU-blocking PDF generation** for large batches, **semantic hallucinations** in AI analytics toolsets, **concurrency risks** in inventory management, and **instructional drift** where AI tutorials don't match reality.

---

## 🚨 CRITICAL FINDINGS

| ID | Severity | Title | Summary |
|---|---|---|---|
| ISSUE-R065 | Critical | CPU Blocking: PDF Generation | Generating labels for large batches (10k+ units) happens in a blocking loop, freezing the backend for all users. |
| ISSUE-R017 | Critical | Race Condition: Non-Atomic Inventory | Medicine inventory updates use `save()` instead of `$inc`, leading to data loss during rapid interactions. |
| ISSUE-R002 | Critical | Hallucinated Analytics Field | AI Service expects `scanCounts` on Batches (non-existent). Reports 0 scans in dashboards always. |
| ISSUE-R001 | Critical | Schema Bypass: AI Writes | AI tool `kwargs` are inserted directly into MongoDB, bypassing Mongoose validation and types. |
| ISSUE-R026 | Critical | Orphaned Access Tokens | JWTs remain valid after logout/revocation. No blacklist check in middleware. |
| ISSUE-R027 | Critical | Security Gate Open | `isApprovedByAdmin` defaults to `true` in registration, bypassing the manufacturer approval gate. |

## 🚨 HIGH FINDINGS

| ID | Severity | Title | Summary |
|---|---|---|---|
| ISSUE-R048 | High | AI Search Performance | `search_prescriptions` re-parses S3 files on every call. $O(N)$ OCR calls per query. |
| ISSUE-R054 | High | N+1 Adherence Streaks | Aggregates full history per dose log. Will fail once users reach 100+ entries. |
| ISSUE-R040 | High | Scalability: No Pagination | Manufacturer batch/product lists have no pagination. Will crash browsers at 1000+ items. |
| ISSUE-R056 | High | Crash Risk: ID Validation | AI Service crashes (500) if passed malformed 24-char hex strings for MongoDB IDs. |
| ISSUE-R007 | High | OCR Silent Truncation | `file_reader.py` clips documents at 5 pages, leading to silent data loss for long prescriptions. |
| ISSUE-R037 | High | Storage Leak: S3 Deletions | S3 cleanup is un-awaited "fire-and-forget". Failures leave orphaned cloud assets permanently. |

## 🚨 MEDIUM FINDINGS

| ID | Severity | Title | Summary |
|---|---|---|---|
| ISSUE-R063 | Medium | UI Timeout: Long PDF Prep | No background tasking for PDF generation. Large batches cause browser timeouts. |
| ISSUE-R050 | Medium | Internal Model Drift | AI tutorials mention fields (`Clinic`, `Hospital`) that don't exist in the database models. |
| ISSUE-R046 | Medium | URL Filter Mismatches | Tutorials suggest `?productId` pre-fills for batches, but frontend logic ignores the param. |
| ISSUE-R023 | Medium | Auth Brute Force | No rate limiting on OTP verification. 4-digit codes risk brute-force compromise. |
| ISSUE-R044 | Medium | Blockchain: Hardcoded Gas | Static gas limits (500k-5M) risk failure during network congestion or contract updates. |

---

## Audit Traces & Evidence

Detailed low-level traces for each flow are maintained in [audit_traces.md](file:///d:/Coding/ChainTrust/audit_traces.md). 

> [!NOTE]
> `validation.ts` has been removed from the repository as it was determined to be unused and contained legacy restrictive patterns that conflicted with current manufacturer workflows.
