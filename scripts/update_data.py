"""Refresh the portfolio's live stats.

Pulls public numbers and activity from LeetCode, Codeforces, AtCoder, CodeChef
and GitHub, then writes them to ../data.js so the site works straight from the
file system with no server and no API calls at view time. LeetCode badge images
are saved into ../assets/lc-badges/ for the same reason.

Run:  python scripts/update_data.py
"""
import json
import re
import sys
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

HANDLES = {
    "leetcode": "Gaurrov",
    "github": "gaurrov",
    "atcoder": "gaurrov",
    "codechef": "gaurrov",
    "codeforces": "gaurrov2007",
}

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data.js"
BADGE_DIR = ROOT / "assets" / "lc-badges"
UA = {"User-Agent": "Mozilla/5.0 (portfolio-stats-refresh)"}


def get(url, data=None, headers=None, raw=False):
    req = urllib.request.Request(url, data=data, headers={**UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=25) as r:
        body = r.read()
    return body if raw else body.decode("utf-8", "replace")


def day(ts):
    return datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%d")


def save_badge(url):
    """Download a LeetCode badge icon once; return its path relative to the site root."""
    if url.startswith("/"):
        url = "https://leetcode.com" + url
    name = re.sub(r"[^A-Za-z0-9._-]", "_", url.rsplit("/", 1)[-1])
    path = BADGE_DIR / name
    if not path.exists():
        BADGE_DIR.mkdir(parents=True, exist_ok=True)
        path.write_bytes(get(url, raw=True))
    return f"assets/lc-badges/{name}"


def leetcode(user):
    query = """query($u:String!){
      matchedUser(username:$u){
        profile{ranking}
        submitStatsGlobal{acSubmissionNum{difficulty count}}
        userCalendar{streak totalActiveDays submissionCalendar}
        languageProblemCount{languageName problemsSolved}
        badges{displayName icon creationDate category}
        upcomingBadges{name icon progress}
      }
      userContestRanking(username:$u){rating globalRanking attendedContestsCount topPercentage}
      userContestRankingHistory(username:$u){attended rating ranking problemsSolved totalProblems contest{title startTime}}
      recentAcSubmissionList(username:$u, limit:12){title titleSlug timestamp lang}
      allQuestionsCount{difficulty count}
    }"""
    body = json.dumps({"query": query, "variables": {"u": user}}).encode()
    d = json.loads(get("https://leetcode.com/graphql", body,
                       {"Content-Type": "application/json", "Referer": "https://leetcode.com"}))["data"]
    mu = d["matchedUser"]
    solved = {x["difficulty"]: x["count"] for x in mu["submitStatsGlobal"]["acSubmissionNum"]}
    totals = {x["difficulty"]: x["count"] for x in d["allQuestionsCount"]}
    cal = {int(k): v for k, v in json.loads(mu["userCalendar"]["submissionCalendar"]).items()}
    contest = d.get("userContestRanking") or {}
    langs = sorted(mu["languageProblemCount"], key=lambda x: -x["problemsSolved"])
    badges = [{"name": b["displayName"], "date": b["creationDate"], "icon": save_badge(b["icon"])}
              for b in sorted(mu["badges"], key=lambda b: b["creationDate"], reverse=True)]
    upcoming = [{"name": b["name"], "progress": b["progress"], "icon": save_badge(b["icon"])}
                for b in mu["upcomingBadges"] if b["progress"] > 0]
    history = [{"name": h["contest"]["title"], "date": day(h["contest"]["startTime"]),
                "rating": round(h["rating"]), "rank": h["ranking"],
                "solved": h["problemsSolved"], "of": h["totalProblems"]}
               for h in d["userContestRankingHistory"] if h["attended"]]
    recent = [{"title": s["title"].strip(), "url": f"https://leetcode.com/problems/{s['titleSlug']}/",
               "date": day(int(s["timestamp"])), "lang": s["lang"]} for s in d["recentAcSubmissionList"]]
    return {
        "handle": user,
        "url": f"https://leetcode.com/u/{user}/",
        "ranking": mu["profile"]["ranking"],
        "solved": solved,
        "totals": totals,
        "streak": mu["userCalendar"]["streak"],
        "activeDays": mu["userCalendar"]["totalActiveDays"],
        "submissionsLastYear": sum(cal.values()),
        "calendar": {day(k): v for k, v in cal.items()},
        "contest": {
            "rating": round(contest.get("rating") or 0),
            "globalRanking": contest.get("globalRanking"),
            "attended": contest.get("attendedContestsCount"),
            "topPercentage": contest.get("topPercentage"),
        },
        "contestHistory": history,
        "languages": [{"name": l["languageName"], "count": l["problemsSolved"]} for l in langs[:4]],
        "badges": badges,
        "upcomingBadges": upcoming,
        "recent": recent,
    }


def codeforces(user):
    info = json.loads(get(f"https://codeforces.com/api/user.info?handles={user}"))["result"][0]
    rating = json.loads(get(f"https://codeforces.com/api/user.rating?handle={user}"))["result"]
    subs = json.loads(get(f"https://codeforces.com/api/user.status?handle={user}"))["result"]
    ok = {}
    for s in subs:
        if s.get("verdict") == "OK":
            p = s["problem"]
            ok.setdefault((p.get("contestId"), p["index"]), (p.get("rating"), s["creationTimeSeconds"]))
    by_rating = Counter(r for r, _ in ok.values() if r)
    return {
        "handle": user, "url": f"https://codeforces.com/profile/{user}",
        "rating": info.get("rating"), "maxRating": info.get("maxRating"),
        "rank": info.get("rank"), "maxRank": info.get("maxRank"),
        "solved": len(ok), "submissions": len(subs),
        "calendar": dict(Counter(day(s["creationTimeSeconds"]) for s in subs)),
        "solvedByRating": dict(sorted(by_rating.items())),
        "contestHistory": [{"name": r["contestName"], "id": r["contestId"], "date": day(r["ratingUpdateTimeSeconds"]),
                            "rank": r["rank"], "old": r["oldRating"], "rating": r["newRating"]} for r in rating],
    }


def atcoder(user):
    html = get(f"https://atcoder.jp/users/{user}")
    m = re.search(r"var rating_history=(\[.*?\]);", html)
    hist = json.loads(m.group(1)) if m else []
    solved = None
    try:
        solved = json.loads(get(f"https://kenkoooo.com/atcoder/atcoder-api/v3/user/ac_rank?user={user}"))["count"]
    except Exception:
        pass
    return {
        "handle": user,
        "url": f"https://atcoder.jp/users/{user}",
        "rating": hist[-1]["NewRating"] if hist else None,
        "highest": max((h["NewRating"] for h in hist), default=None),
        "contests": len(hist),
        "solved": solved,
        "history": [h["NewRating"] for h in hist],
        "contestHistory": [{"name": h["ContestName"], "date": day(h["EndTime"]), "rank": h["Place"],
                            "old": h["OldRating"], "rating": h["NewRating"],
                            "url": "https://atcoder.jp" + h["StandingsUrl"].split("?")[0]} for h in hist],
    }


def codechef(user):
    html = get(f"https://www.codechef.com/users/{user}")
    solved = re.search(r"Total Problems Solved:\s*(\d+)", html)
    rating = re.search(r'class="rating-number"[^>]*>\s*(\d+)', html)
    return {
        "handle": user,
        "url": f"https://www.codechef.com/users/{user}",
        "solved": int(solved.group(1)) if solved else None,
        "rating": int(rating.group(1)) if rating else None,
    }


def describe_event(e):
    p, repo = e["payload"], e["repo"]["name"]
    t = e["type"]

    def titled(obj):
        title = (obj or {}).get("title")
        return f" “{title}”" if title else ""

    if t == "PushEvent":
        n = p.get("size") or len(p.get("commits") or [])
        return (f"Pushed {n} commit{'s' if n != 1 else ''} to {repo}" if n else f"Pushed to {repo}"), "push"
    if t == "PullRequestEvent":
        pr = p.get("pull_request", {})
        action = "Merged" if p.get("action") == "closed" and pr.get("merged") else p.get("action", "").capitalize()
        return f"{action} a pull request{titled(pr)} in {repo}", "pr"
    if t in ("PullRequestReviewEvent", "PullRequestReviewCommentEvent"):
        return f"Reviewed a pull request{titled(p.get('pull_request'))} in {repo}", "review"
    if t == "IssueCommentEvent":
        return f"Commented on{titled(p.get('issue')) or ' an issue'} in {repo}", "comment"
    if t == "IssuesEvent":
        return f"{p.get('action', '').capitalize()} an issue{titled(p.get('issue'))} in {repo}", "issue"
    if t == "CreateEvent":
        what = p.get("ref_type", "")
        return (f"Created repository {repo}" if what == "repository" else f"Created {what} in {repo}"), "create"
    if t == "ForkEvent":
        return f"Forked {repo}", "fork"
    if t == "WatchEvent":
        return f"Starred {repo}", "star"
    return None, None


def github(user):
    u = json.loads(get(f"https://api.github.com/users/{user}"))
    repos = json.loads(get(f"https://api.github.com/users/{user}/repos?per_page=100&sort=pushed"))
    own = [r for r in repos if not r["fork"]]
    langs = Counter(r["language"] for r in own if r["language"])
    html = get(f"https://github.com/users/{user}/contributions")
    total = re.search(r"([\d,]+)\s+contributions?\s+in the last year", re.sub(r"\s+", " ", html))
    days = {d: int(l) for d, l in re.findall(r'data-date="([\d-]+)"[^>]*data-level="(\d)"', html)}
    events = json.loads(get(f"https://api.github.com/users/{user}/events/public?per_page=100"))
    activity, prs = [], 0
    for e in sorted(events, key=lambda e: e["created_at"], reverse=True):
        if e["type"] == "PullRequestEvent" and e["payload"].get("action") == "opened":
            prs += 1
        text, kind = describe_event(e)
        if not text or (kind == "create" and not text.startswith("Created repository")):  # skip branch noise
            continue
        date = e["created_at"][:10]
        same = next((a for a in activity if a["text"] == text and a["date"] == date), None)
        if same:  # fold repeats on the same day into one line
            same["times"] += 1
        else:
            activity.append({"text": text, "kind": kind, "date": date, "times": 1,
                             "url": f"https://github.com/{e['repo']['name']}"})
    skip = {"skills-", "Agentic_AI_day", "Langchain_Assignment", "git-foundations-demo", "gaurrov"}
    recent_repos = [{"name": r["name"], "url": r["html_url"], "language": r["language"],
                     "stars": r["stargazers_count"], "pushed": r["pushed_at"][:10],
                     "description": r["description"] or ""}
                    for r in own if not any(r["name"].startswith(s) for s in skip)][:6]
    return {
        "handle": user,
        "url": u["html_url"],
        "publicRepos": u["public_repos"],
        "ownRepos": len(own),
        "forks": len(repos) - len(own),
        "followers": u["followers"],
        "stars": sum(r["stargazers_count"] for r in own),
        "since": u["created_at"][:4],
        "contributionsLastYear": int(total.group(1).replace(",", "")) if total else None,
        "contributionLevels": days,
        "pullRequestsRecent": prs,
        "activity": activity[:14],
        "recentRepos": recent_repos,
        "languages": [{"name": k, "repos": v} for k, v in langs.most_common()],
    }


def main():
    previous = {}
    if OUT.exists():
        txt = OUT.read_text(encoding="utf-8")
        previous = json.loads(txt[txt.index("{"): txt.rindex("}") + 1])

    data = {"updated": datetime.now(timezone.utc).strftime("%Y-%m-%d")}
    for name, fn in [("leetcode", leetcode), ("codeforces", codeforces), ("atcoder", atcoder),
                     ("codechef", codechef), ("github", github)]:
        try:
            data[name] = fn(HANDLES[name])
            print(f"ok    {name}")
        except Exception as e:  # keep the last good snapshot for this source
            data[name] = previous.get(name)
            print(f"kept  {name} (fetch failed: {e})", file=sys.stderr)

    OUT.write_text("// Generated by scripts/update_data.py — do not edit by hand.\n"
                   f"window.PORTFOLIO_DATA = {json.dumps(data, indent=1, ensure_ascii=False)};\n",
                   encoding="utf-8")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
