"""The regular data refresh, in one command:

    python -m pipeline.refresh                  # everything below, then commit + push (= deploy)
    python -m pipeline.refresh --no-push        # commit, don't push
    python -m pipeline.refresh --no-git         # update the files only
    python -m pipeline.refresh --prices-only    # skip new phones, spec sheets and DXOMARK
    python -m pipeline.refresh --install-reminder [Saturday 10:00]   # weekly Windows reminder
    python -m pipeline.refresh --remove-reminder

Steps: new phones from GSMArena's brand pages -> missing spec sheets, plus up to
RECHECK sheets still waiting for lab tests -> today's prices -> DXOMARK scores ->
build -> tests -> a summary of what changed -> commit + push.

GSMArena opens a Chrome window; if Lazada blocks the price crawl, you're asked
to paste a snippet into your own Chrome (see prices.py). A step that fails is
reported and the rest carry on with the data already on disk. Nothing is
committed if the tests fail or the ranking shrinks by more than a quarter
(a crawl that silently lost most of its listings).
"""
from __future__ import annotations

import datetime as dt
import json
import shutil
import subprocess
import sys
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PHONES = ROOT / "smartbuy-frontend" / "public" / "phones.json"
DATA_PATHS = ["data", "smartbuy-frontend/public/phones.json"]
RECHECK = 30            # spec sheets re-fetched per run for new lab results
MIN_KEEP = 0.75         # refuse to commit if fewer than this share of phones stay ranked
PRICE_MOVE = 0.05       # report price changes of at least 5%
TASK = "SmartBuy weekly refresh"


def step(name: str, fn):
    print(f"\n== {name}", flush=True)
    try:
        return fn()
    except KeyboardInterrupt:
        raise
    except Exception as e:  # keep going with what's on disk
        traceback.print_exc(limit=2)
        print(f"!! {name} failed ({e}); carrying on with the data already on disk", flush=True)
        return None


def git(*args: str, check: bool = True) -> str:
    r = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True)
    if check and r.returncode:
        raise RuntimeError(f"git {' '.join(args)}: {r.stderr.strip() or r.stdout.strip()}")
    return r.stdout.strip()


def new_phones() -> list[str]:
    from . import discover

    cands, new = discover.merge(discover.discover(fresh_pages=1))
    discover.OUT.write_text(json.dumps(cands, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"{len(cands)} candidates; new: " + (", ".join(c["name"] for c in new) or "none"))
    return [c["name"] for c in new]


def spec_sheets(on_sale: set[str]) -> None:
    from . import specs

    recs = specs.fetch_all(recheck=RECHECK, priority=on_sale)
    specs.OUT.write_text(json.dumps(recs, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"{len(recs)} spec sheets -> {specs.OUT.relative_to(ROOT)}")


def dxomark() -> None:
    from . import labs

    data = labs.fetch_dxomark()
    labs.DXO_FILE.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"{len(data['phones'])} DXOMARK camera scores")


def changes(before: dict, after: dict) -> list[str]:
    """What a reader of the site would notice: phones in/out, price moves, the best buys."""
    old = {p["id"]: p for p in before.get("phones", [])}
    new = {p["id"]: p for p in after["phones"]}
    lines = [f"{len(new)} phones ranked (was {len(old)}), {len(after['awaiting'])} awaiting prices"]
    added = [p for i, p in new.items() if i not in old]
    gone = [p for i, p in old.items() if i not in new]
    if added:
        lines.append("Now ranked: " + ", ".join(f"{p['short_name']} (S${p['price']['sgd']:.0f})" for p in added))
    if gone:
        lines.append("No longer on sale: " + ", ".join(p["short_name"] for p in gone))
    moves = []
    for i, p in new.items():
        if i in old:
            a, b = old[i]["price"]["sgd"], p["price"]["sgd"]
            if abs(b - a) >= PRICE_MOVE * a:
                moves.append((abs(b - a) / a, f"{p['short_name']} S${a:.0f} -> S${b:.0f}"))
    if moves:
        lines.append(f"Price changes of {PRICE_MOVE:.0%}+: " + "; ".join(m for _, m in sorted(moves, reverse=True)))
    from .build import best_buy_ladder
    lines.append("Best buys (Balanced, any storage): " + ", ".join(
        f"{p['short_name']} S${p['price']['typical_sgd']:.0f}" for p in best_buy_ladder(after)))
    if after["crawl"]["note"]:
        lines.append(after["crawl"]["note"])
    return lines


def refresh(argv: list[str]) -> int:
    from . import build, prices

    use_git = "--no-git" not in argv
    full = "--prices-only" not in argv
    date = dt.date.today().isoformat()
    if use_git:
        branch = git("rev-parse", "--abbrev-ref", "HEAD")
        if branch == "main":
            step("Update from GitHub", lambda: print(git("pull", "--ff-only") or "up to date"))
        else:
            print(f"On branch {branch!r}, not main: will commit here but not push")
    before = json.loads(PHONES.read_text(encoding="utf-8")) if PHONES.exists() else {}
    on_sale = {p["id"] for p in before.get("phones", [])}

    found = step("New phones (GSMArena)", new_phones) if full else None
    if full:
        step("Spec sheets (GSMArena)", lambda: spec_sheets(on_sale))
    crawl = step("Prices (Lazada, Apple, Google)", lambda: prices.crawl(date))
    if full:
        step("Lab scores (DXOMARK)", dxomark)
    print("\n== Build", flush=True)
    data = build.write()
    print("\n== Tests", flush=True)
    tests_ok = subprocess.run([sys.executable, "-m", "pytest", "-q", "tests"], cwd=ROOT).returncode == 0
    if shutil.which("node"):  # the site's ranking engine, checked against the new data
        tests_ok &= subprocess.run(["node", "--test"], cwd=ROOT / "smartbuy-frontend").returncode == 0
    else:
        print("node not found: skipped the site's engine tests")

    summary = changes(before, data)
    if found:
        summary.insert(1, "New on GSMArena: " + ", ".join(found))
    if crawl and crawl["no_specs"]:
        summary.append(f"{crawl['no_specs']} official listings have no spec sheet yet "
                       f"(data/listings_without_specs.json)")
    if crawl and crawl.get("under_reference"):
        summary.append("Well under GSMArena's price, check they're the right phone: "
                       + "; ".join(crawl["under_reference"]))
    print("\n== Summary\n" + "\n".join("  " + s for s in summary))

    problems = []
    if not tests_ok:
        problems.append("tests failed")
    if before.get("phones") and len(data["phones"]) < MIN_KEEP * len(before["phones"]):
        problems.append(f"only {len(data['phones'])} phones ranked, down from {len(before['phones'])}")
    if problems:
        print(f"\nNot committing: {'; '.join(problems)}. The updated files are left for a look "
              f"(git diff), or run again.")
        return 1
    if not use_git:
        return 0
    git("add", *DATA_PATHS)
    if not git("diff", "--cached", "--name-only"):
        print("\nNothing changed; nothing to commit.")
        return 0
    git("commit", "-q", "-m", f"Data refresh {date}: {len(data['phones'])} phones ranked", "-m", "\n".join(summary))
    print(f"\nCommitted: {git('log', '-1', '--format=%h %s')}")
    if "--no-push" in argv or git("rev-parse", "--abbrev-ref", "HEAD") != "main":
        print("Not pushed (git push to publish).")
        return 0
    git("push", "-q")
    print("Pushed: GitHub Pages rebuilds the site in a couple of minutes.")
    return 0


def install_reminder(day: str = "Saturday", at: str = "10:00") -> None:
    """A weekly Windows task that opens a terminal offering to run the refresh
    (it needs you there: GSMArena's Chrome window and maybe Lazada's captcha).
    Runs at the next logon if the computer was off at that time."""
    command = (f"Set-Location '{ROOT}'; Read-Host 'SmartBuy weekly data refresh. Press Enter to start, "
               f"or close this window to skip'; & '{sys.executable}' -m pipeline.refresh")
    ps = (f"$a = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument \"-NoExit -Command {command}\"; "
          f"$t = New-ScheduledTaskTrigger -Weekly -DaysOfWeek {day} -At {at}; "
          "$s = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries "
          "-DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero); "
          f"Register-ScheduledTask -TaskName '{TASK}' -Action $a -Trigger $t -Settings $s -Force "
          "-Description 'Reminds you to refresh SmartBuy prices (python -m pipeline.refresh)' | Out-Null")
    subprocess.run(["powershell", "-NoProfile", "-Command", ps], check=True)
    print(f"Reminder set: every {day} at {at} a window offers to run the refresh "
          f"(remove with: python -m pipeline.refresh --remove-reminder)")


def remove_reminder() -> None:
    subprocess.run(["powershell", "-NoProfile", "-Command",
                    f"Unregister-ScheduledTask -TaskName '{TASK}' -Confirm:$false"], check=True)
    print("Reminder removed")


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--install-reminder" in args:
        rest = args[args.index("--install-reminder") + 1:]
        install_reminder(*[a for a in rest if not a.startswith("--")][:2])
    elif "--remove-reminder" in args:
        remove_reminder()
    else:
        sys.exit(refresh(args))
