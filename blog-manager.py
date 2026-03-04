#!/usr/bin/env python3
"""
blog-manager.py — Blog post manifest generator for 5pyd3r's blog
Run from the repo root: python blog-manager.py

Scans blog/_posts/ for:
  - Single .md files:        blog/_posts/2026-03-04-thm-roomname.md
  - Folder-based posts:      blog/_posts/2025-09-08-htb-sherlock/2025-09-08-htb-sherlock.md

Reads YAML frontmatter from each .md and writes blog/posts.json
Ignores anything inside blog/_posts/_drafts/

Frontmatter fields recognised:
  title       (str)  — Post title                      [required]
  date        (str)  — Date in YYYY-MM-DD format        [required]
  platform    (str)  — THM | HTB | CTF | OTHER          [optional, default: OTHER]
  difficulty  (str)  — Easy | Medium | Hard | Insane    [optional]
  description (str)  — Short summary shown on card      [optional]
"""

import os
import json
import re

POSTS_DIR   = os.path.join("blog", "_posts")
OUTPUT_FILE = os.path.join("blog", "posts.json")
DRAFTS_DIR  = os.path.join(POSTS_DIR, "_drafts")


def parse_frontmatter(filepath):
    """Read YAML frontmatter from a .md file. Returns dict of key:value pairs."""
    meta = {}
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        print(f"  [!] Could not read {filepath}: {e}")
        return meta

    # Match --- ... --- block at the start of the file
    match = re.match(r"^---[\r\n](.*?)[\r\n]---[\r\n]?", content, re.DOTALL)
    if not match:
        print(f"  [!] No frontmatter found in {filepath} — skipping")
        return meta

    for line in match.group(1).splitlines():
        if ":" not in line:
            continue
        idx = line.index(":")
        key = line[:idx].strip()
        val = line[idx + 1:].strip().strip('"').strip("'")
        meta[key] = val

    return meta


def collect_posts():
    """Walk POSTS_DIR and return list of post dicts."""
    posts = []

    if not os.path.isdir(POSTS_DIR):
        print(f"[!] Posts directory not found: {POSTS_DIR}")
        return posts

    for entry in os.scandir(POSTS_DIR):

        # Skip _drafts folder entirely
        if entry.path == DRAFTS_DIR or entry.name == "_drafts":
            continue

        # ── Format 1: single .md file ──
        if entry.is_file() and entry.name.endswith(".md"):
            md_path = entry.path.replace("\\", "/")
            meta    = parse_frontmatter(md_path)

            if not meta.get("title") or not meta.get("date"):
                print(f"  [!] Missing title/date in {md_path} — skipping")
                continue

            posts.append({
                "title":       meta["title"],
                "date":        meta["date"],
                "platform":    meta.get("platform", "OTHER").upper(),
                "difficulty":  meta.get("difficulty", ""),
                "description": meta.get("description", ""),
                "path":        md_path,
            })
            print(f"  [+] {meta['title']}  ({md_path})")

        # ── Format 2: folder containing a .md file ──
        elif entry.is_dir():
            # Find the .md file inside the folder (same name as folder)
            folder_name = entry.name
            md_filename = folder_name + ".md"
            md_path     = os.path.join(entry.path, md_filename).replace("\\", "/")

            if not os.path.isfile(md_path):
                # Fallback: find any .md in the folder
                md_files = [
                    f for f in os.listdir(entry.path) if f.endswith(".md")
                ]
                if not md_files:
                    print(f"  [!] No .md file found in folder {entry.path} — skipping")
                    continue
                md_path = os.path.join(entry.path, md_files[0]).replace("\\", "/")

            meta = parse_frontmatter(md_path)

            if not meta.get("title") or not meta.get("date"):
                print(f"  [!] Missing title/date in {md_path} — skipping")
                continue

            posts.append({
                "title":       meta["title"],
                "date":        meta["date"],
                "platform":    meta.get("platform", "OTHER").upper(),
                "difficulty":  meta.get("difficulty", ""),
                "description": meta.get("description", ""),
                "path":        md_path,
            })
            print(f"  [+] {meta['title']}  ({md_path})")

    return posts


def main():
    print("\n5pyd3r // blog manifest generator")
    print("=" * 40)

    posts = collect_posts()

    # Sort by date descending
    posts.sort(key=lambda p: p["date"], reverse=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(posts, f, indent=2, ensure_ascii=False)

    print("=" * 40)
    print(f"[✓] {len(posts)} post(s) written to {OUTPUT_FILE}\n")


if __name__ == "__main__":
    main()