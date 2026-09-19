"""
Dispatch agent runner.

Usage:
  python dispatch.py crawl https://some-barbershop.com     -> writes profile.json
  python dispatch.py brief trigger.json                    -> writes task_brief.json (first person)
  python dispatch.py brief trigger.json Sam Jordan         -> next person, skipping Sam and Jordan

Env vars:
  ANTHROPIC_API_KEY, DISPATCH_ENV_ID, DISPATCH_CRAWL_AGENT_ID, DISPATCH_MANAGER_AGENT_ID
"""
import json
import os
import sys

from anthropic import Anthropic

client = Anthropic()
ENV_ID = os.environ["DISPATCH_ENV_ID"]
CRAWL_AGENT_ID = os.environ["DISPATCH_CRAWL_AGENT_ID"]
MANAGER_AGENT_ID = os.environ["DISPATCH_MANAGER_AGENT_ID"]


def run_agent(agent_id: str, text: str, title: str) -> str:
    """Start a session, send one message, return the agent's last text message."""
    session = client.beta.sessions.create(agent=agent_id, environment_id=ENV_ID, title=title)
    messages = []
    with client.beta.sessions.events.stream(session.id) as stream:
        client.beta.sessions.events.send(
            session.id,
            events=[{"type": "user.message", "content": [{"type": "text", "text": text}]}],
        )
        for event in stream:
            if event.type == "agent.message":
                messages.append("".join(b.text for b in event.content if b.type == "text"))
            elif event.type == "agent.tool_use":
                print(f"  [tool: {event.name}]")
            elif event.type == "session.status_idle":
                break
    return messages[-1] if messages else ""


def extract_json(text: str) -> dict:
    """Pull the JSON object out of the agent's reply, even if it added extra words."""
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"No JSON in agent reply:\n{text}")
    return json.loads(text[start : end + 1])


def save(path: str, data: dict) -> None:
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Wrote {path}")


def crawl(url: str) -> dict:
    print(f"Crawling {url} ...")
    profile = extract_json(run_agent(CRAWL_AGENT_ID, f"Build the business profile for: {url}", "Dispatch crawl"))
    save("profile.json", profile)
    return profile


def next_brief(trigger: dict, profile: dict, already_called: list[str]) -> dict:
    payload = {"profile": profile, "trigger": trigger, "already_called": already_called}
    print(f"Manager picking next person (skipping: {already_called or 'nobody'}) ...")
    brief = extract_json(run_agent(MANAGER_AGENT_ID, json.dumps(payload), "Dispatch manager"))
    save("task_brief.json", brief)
    return brief


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1]
    if command == "crawl":
        print(json.dumps(crawl(sys.argv[2]), indent=2))
    elif command == "brief":
        with open(sys.argv[2]) as f:
            trigger = json.load(f)
        with open("profile.json") as f:
            profile = json.load(f)
        print(json.dumps(next_brief(trigger, profile, sys.argv[3:]), indent=2))
    else:
        print(__doc__)
