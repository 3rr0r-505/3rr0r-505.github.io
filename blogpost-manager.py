#!/usr/bin/env python3
"""
post-img-optimizer.py — WebP image optimizer for 5pyd3r's blog posts
Run from the repo root:

    python post-img-optimizer.py --dir "2026-04-02-thm-kenobi/assets"
    python post-img-optimizer.py --dir "2026-04-02-thm-kenobi/assets" --quality 85

What it does:
  1. Resolves blog/_posts/<dir>
  2. Auto-finds the .md file in the parent folder
  3. Converts PNG/JPG/JPEG/GIF/TIFF/BMP → WebP
  4. Verifies each conversion before touching the .md or deleting originals
  5. Updates image references in the .md file
  6. Deletes originals only after successful conversion + .md update
  7. Prints a full summary with size saved

Skips:
  - Files already in .webp format (silent)
  - Files that fail conversion (kept intact, reported)
"""

import os
import re
import sys
import argparse
import concurrent.futures
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("[!] Pillow is not installed. Run: pip install Pillow")
    sys.exit(1)

# ── Constants ──────────────────────────────────────────────────────────────
POSTS_BASE     = os.path.join("blog", "_posts")
SUPPORTED_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".tiff", ".bmp"}
MAX_WORKERS    = 4   # parallel conversion threads — tune if needed


# ── Helpers ────────────────────────────────────────────────────────────────

def resolve_dirs(user_dir: str):
    """
    Given user input like '2026-04-02-thm-kenobi/assets',
    returns (assets_path, post_dir, md_path) or exits on error.
    """
    assets_path = Path(POSTS_BASE) / user_dir

    if not assets_path.exists():
        print(f"[!] Directory not found: {assets_path}")
        sys.exit(1)

    if not assets_path.is_dir():
        print(f"[!] Not a directory: {assets_path}")
        sys.exit(1)

    # Parent of assets/ is the post folder
    post_dir = assets_path.parent

    # Find .md file in post folder
    md_files = list(post_dir.glob("*.md"))
    if not md_files:
        print(f"[!] No .md file found in {post_dir}")
        sys.exit(1)

    if len(md_files) > 1:
        print(f"[!] Multiple .md files found in {post_dir} — using {md_files[0].name}")

    return assets_path, post_dir, md_files[0]


def find_images(assets_path: Path):
    """Return list of image Paths to convert (non-WebP supported formats)."""
    images = []
    skipped = []

    for f in sorted(assets_path.iterdir()):
        if not f.is_file():
            continue
        ext = f.suffix.lower()
        if ext == ".webp":
            skipped.append(f)
        elif ext in SUPPORTED_EXTS:
            images.append(f)

    return images, skipped


def convert_image(src: Path, quality: int):
    """
    Convert a single image to WebP.
    Returns (src, webp_path, original_size, webp_size, error)
    """
    webp_path = src.with_suffix(".webp")
    original_size = src.stat().st_size

    try:
        with Image.open(src) as img:
            # Preserve transparency for PNG
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                img = img.convert("RGBA")
            else:
                img = img.convert("RGB")

            img.save(webp_path, "webp", quality=quality, method=6)

        # Verify output exists and is non-zero
        if not webp_path.exists() or webp_path.stat().st_size == 0:
            webp_path.unlink(missing_ok=True)
            return (src, None, original_size, 0, "Output file empty or missing")

        webp_size = webp_path.stat().st_size
        return (src, webp_path, original_size, webp_size, None)

    except Exception as e:
        webp_path.unlink(missing_ok=True)
        return (src, None, original_size, 0, str(e))


def update_md_references(md_path: Path, conversions: list):
    """
    Replace image references in the .md file for all successful conversions.
    conversions = list of (src_path, webp_path) tuples.
    Returns True on success, False on error.
    """
    try:
        content = md_path.read_text(encoding="utf-8")
        updated = content

        for src, webp in conversions:
            old_name = src.name          # e.g. banner.png
            new_name = webp.name         # e.g. banner.webp

            # Replace all occurrences of the old filename with new
            # Handles: ![alt](assets/banner.png) and <img src="assets/banner.png">
            updated = updated.replace(old_name, new_name)

        if updated == content:
            # No changes needed — references may already use different paths
            return True

        md_path.write_text(updated, encoding="utf-8")
        return True

    except Exception as e:
        print(f"  [!] Failed to update {md_path.name}: {e}")
        return False


def format_size(size_bytes: int) -> str:
    """Human-readable file size."""
    if size_bytes < 1024:
        return f"{size_bytes}B"
    elif size_bytes < 1024 ** 2:
        return f"{size_bytes / 1024:.1f}KB"
    else:
        return f"{size_bytes / 1024 ** 2:.2f}MB"


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Convert blog post images to WebP and update .md references."
    )
    parser.add_argument(
        "--dir", required=True,
        help='Post assets folder, e.g. "2026-04-02-thm-kenobi/assets"'
    )
    parser.add_argument(
        "--quality", type=int, default=80,
        help="WebP quality (1-100, default: 80)"
    )
    args = parser.parse_args()

    if not 1 <= args.quality <= 100:
        print("[!] Quality must be between 1 and 100")
        sys.exit(1)

    print("\n5pyd3r // post image optimizer")
    print("=" * 40)

    # ── Resolve paths ──
    assets_path, post_dir, md_path = resolve_dirs(args.dir)
    print(f"  Assets : {assets_path}")
    print(f"  Post   : {md_path.name}")
    print(f"  Quality: {args.quality}")
    print("=" * 40)

    # ── Find images ──
    images, skipped_webp = find_images(assets_path)

    if skipped_webp:
        print(f"  [~] Skipped {len(skipped_webp)} already-WebP file(s)")

    if not images:
        print("  [✓] Nothing to convert — all images already WebP\n")
        sys.exit(0)

    print(f"  [*] Found {len(images)} image(s) to convert\n")

    # ── Convert in parallel ──
    succeeded  = []   # (src, webp, original_size, webp_size)
    failed     = []   # (src, error)

    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(convert_image, img, args.quality): img
            for img in images
        }

        for future in concurrent.futures.as_completed(futures):
            src, webp, orig_size, webp_size, error = future.result()

            if error:
                print(f"  [✗] {src.name} — {error}")
                failed.append((src, error))
            else:
                ratio = (1 - webp_size / orig_size) * 100 if orig_size else 0
                print(f"  [✓] {src.name} → {webp.name}  "
                      f"({format_size(orig_size)} → {format_size(webp_size)}, -{ratio:.0f}%)")
                succeeded.append((src, webp, orig_size, webp_size))

    if not succeeded:
        print("\n[!] No conversions succeeded — .md file unchanged, originals kept.\n")
        sys.exit(1)

    # ── Update .md references ──
    print(f"\n  [*] Updating references in {md_path.name}...")
    md_updated = update_md_references(md_path, [(s, w) for s, w, _, _ in succeeded])

    if not md_updated:
        print("  [!] .md update failed — originals kept to avoid broken references.")
        # Clean up WebP files we created
        for _, webp, _, _ in succeeded:
            webp.unlink(missing_ok=True)
        sys.exit(1)

    print(f"  [✓] References updated")

    # ── Delete originals ──
    print(f"  [*] Removing originals...")
    for src, webp, _, _ in succeeded:
        try:
            src.unlink()
            print(f"  [✓] Deleted {src.name}")
        except Exception as e:
            print(f"  [!] Could not delete {src.name}: {e}")

    # ── Summary ──
    total_orig = sum(o for _, _, o, _ in succeeded)
    total_webp = sum(w for _, _, _, w in succeeded)
    total_saved = total_orig - total_webp
    overall_ratio = (total_saved / total_orig * 100) if total_orig else 0

    print("\n" + "=" * 40)
    print(f"  ✅ Converted : {len(succeeded)}")
    print(f"  ❌ Failed    : {len(failed)}")
    print(f"  ⏭  Skipped   : {len(skipped_webp)} (already WebP)")
    print(f"  💾 Saved     : {format_size(total_saved)} ({overall_ratio:.0f}% reduction)")
    print("=" * 40 + "\n")

    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()