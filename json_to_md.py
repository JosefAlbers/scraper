#!/usr/bin/env python3
import argparse
import base64
import json
import re
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

KST = timezone(timedelta(hours=9))


def load_items(paths):
    items = []
    for p in paths:
        path = Path(p)
        if not path.exists():
            print(f"warning: {path} not found, skipping", file=sys.stderr)
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            print(f"warning: could not parse {path}: {e}", file=sys.stderr)
            continue
        if isinstance(data, list):
            items.extend(data)
        else:
            items.append(data)
    return items


def _normalize_iso(ts):
    s = ts.replace("Z", "+00:00")
    return re.sub(r"\.(\d{1,6})", lambda m: "." + m.group(1).ljust(6, "0"), s)


def format_timestamp(ts):
    if not ts:
        return None
    try:
        dt = datetime.fromisoformat(_normalize_iso(ts))
        return dt.astimezone(KST).strftime("%Y-%m-%d %H:%M:%S (UTC+9)")
    except (ValueError, AttributeError):
        return ts


def save_thumbnail(data_uri, dest_dir, name):
    if not data_uri or not data_uri.startswith("data:image"):
        return None
    try:
        header, b64data = data_uri.split(",", 1)
        ext = "jpg"
        if "png" in header:
            ext = "png"
        elif "webp" in header:
            ext = "webp"
        dest_dir.mkdir(parents=True, exist_ok=True)
        out_path = dest_dir / f"{name}.{ext}"
        out_path.write_bytes(base64.b64decode(b64data))
        return out_path
    except Exception as e:
        print(f"warning: failed to save thumbnail: {e}", file=sys.stderr)
        return None


def blockquote(text):
    return "\n".join(f"> {line}" if line else ">" for line in text.split("\n"))


def item_to_markdown(item, index, images_dir, embed_images, md_dir):
    title = item.get("title") or "(untitled)"
    url = item.get("url") or ""
    content = (item.get("content") or "").strip()
    remark = (item.get("remark") or "").strip()
    ts = format_timestamp(item.get("timestamp"))

    lines = [f"## [{title}]({url})" if url else f"## {title}"]
    if ts:
        lines.append(f"*Saved: {ts}*")
    lines.append("")
    if remark:
        lines.append(f"*Comment: {remark}*")
        lines.append("")
    if content:
        lines.append(blockquote(content))
        lines.append("")

    if embed_images:
        for img_i, img in enumerate(item.get("images") or []):
            src = img.get("src")
            thumb = img.get("thumbnail")
            saved_path = save_thumbnail(thumb, images_dir, f"{index:04d}_{img_i}") if thumb else None
            if saved_path:
                rel = saved_path.relative_to(md_dir)
                if src:
                    lines.append(f"![thumbnail]({rel}) ([original]({src}))")
                else:
                    lines.append(f"![thumbnail]({rel})")
            elif src:
                lines.append(f"![image]({src})")
        lines.append("")

    lines.append("---")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Convert saved-items JSON exports into a Markdown file.")
    parser.add_argument("inputs", nargs="+", help="One or more JSON files exported from the extension")
    parser.add_argument("-o", "--output", default="notes.md", help="Output Markdown file (default: notes.md)")
    parser.add_argument("--no-images", action="store_true", help="Skip extracting thumbnail images")
    parser.add_argument("--newest-first", action="store_true", help="List newest items first (default: oldest first)")
    args = parser.parse_args()

    items = load_items(args.inputs)
    if not items:
        print("No items found.", file=sys.stderr)
        sys.exit(1)

    if args.newest_first:
        items = list(reversed(items))

    out_path = Path(args.output).resolve()
    images_dir = out_path.parent / f"{out_path.stem}_images"

    blocks = [
        item_to_markdown(item, i, images_dir, not args.no_images, out_path.parent)
        for i, item in enumerate(items)
    ]

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n\n".join(blocks), encoding="utf-8")
    print(f"Wrote {len(items)} item(s) to {out_path}")
    if not args.no_images and images_dir.exists():
        print(f"Saved thumbnails to {images_dir}")


if __name__ == "__main__":
    main()
