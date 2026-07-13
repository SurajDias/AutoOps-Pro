import random
import csv
import time
from collections import deque
from datetime import datetime
from threading import Lock

services = ["payment", "order", "user", "inventory"]

# 🔥 STARTING VALUES (stable baseline)
metrics = {
    "cpu": 45,
    "memory": 58,
    "response_time": 105,
    "requests": 220,
    "error_rate": 1,
    "latency": 90
}

CSV_FILE = "system_metrics.csv"
_lock = Lock()
_metrics_history = deque(maxlen=30)
_scenario = {
    "name": "normal",
    "label": "Normal operations",
    "description": "Baseline production traffic with healthy service behavior.",
    "service": "payment",
}

SCENARIOS = {
    "normal": {
        "label": "Normal operations",
        "description": "Baseline production traffic with healthy service behavior.",
        "service": "payment",
        "targets": {"cpu": 45, "memory": 58, "response_time": 105, "requests": 220, "error_rate": 1, "latency": 90},
    },
    "traffic_spike": {
        "label": "Traffic spike",
        "description": "Incoming request volume climbs before the system fails.",
        "service": "api-gateway",
        "targets": {"cpu": 88, "memory": 81, "response_time": 360, "requests": 720, "error_rate": 3, "latency": 280},
    },
    "database_stress": {
        "label": "Database overload",
        "description": "Connection pool pressure slows payment and order services.",
        "service": "postgres-primary",
        "targets": {"cpu": 82, "memory": 88, "response_time": 520, "requests": 510, "error_rate": 4, "latency": 420},
    },
    "memory_leak": {
        "label": "Memory leak",
        "description": "Auth service memory grows until restarts or OOM become likely.",
        "service": "auth-service",
        "targets": {"cpu": 64, "memory": 94, "response_time": 270, "requests": 360, "error_rate": 2, "latency": 240},
    },
    "fixed": {
        "label": "Fix applied",
        "description": "Capacity and tuning changes are taking effect.",
        "service": "payment",
        "targets": {"cpu": 42, "memory": 55, "response_time": 95, "requests": 245, "error_rate": 0, "latency": 80},
    },
}


# 🔥 SMOOTH CHANGE FUNCTION
def fluctuate(value, min_val, max_val, step=5):
    change = random.randint(-step, step)
    new_val = value + change
    return max(min_val, min(max_val, new_val))


def move_toward(value, target, step):
    if value < target:
        return min(target, value + random.randint(1, step))
    if value > target:
        return max(target, value - random.randint(1, step))
    return value


def set_scenario(name):
    scenario = SCENARIOS.get(name)
    if scenario is None:
        return None

    with _lock:
        _scenario.update({
            "name": name,
            "label": scenario["label"],
            "description": scenario["description"],
            "service": scenario["service"],
        })
    return get_scenario()


def get_scenario():
    with _lock:
        return dict(_scenario)


def get_recent_metrics(limit=12):
    with _lock:
        return list(_metrics_history)[-limit:]


def generate_metrics():
    scenario = get_scenario()
    service = scenario.get("service") or random.choice(services)
    targets = SCENARIOS.get(scenario["name"], SCENARIOS["normal"])["targets"]

    with _lock:
        metrics["cpu"] = move_toward(metrics["cpu"], targets["cpu"], 8)
        metrics["memory"] = move_toward(metrics["memory"], targets["memory"], 6)
        metrics["response_time"] = move_toward(metrics["response_time"], targets["response_time"], 45)
        metrics["requests"] = move_toward(metrics["requests"], targets["requests"], 65)
        metrics["error_rate"] = move_toward(metrics["error_rate"], targets["error_rate"], 2)
        metrics["latency"] = move_toward(metrics["latency"], targets["latency"], 35)

        metrics["cpu"] = fluctuate(metrics["cpu"], 20, 96, step=2)
        metrics["memory"] = fluctuate(metrics["memory"], 30, 96, step=2)
        metrics["response_time"] = fluctuate(metrics["response_time"], 80, 900, step=8)
        metrics["requests"] = fluctuate(metrics["requests"], 100, 800, step=20)
        metrics["error_rate"] = fluctuate(metrics["error_rate"], 0, 8, step=1)
        metrics["latency"] = fluctuate(metrics["latency"], 50, 600, step=8)
        snapshot = dict(metrics)
        _metrics_history.append({
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "cpu": snapshot["cpu"],
            "memory": snapshot["memory"],
            "latency": snapshot["latency"],
        })

    return {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "service": service,
        "scenario": scenario["name"],
        **snapshot
    }


def save_metrics_to_csv(data):
    file_exists = False

    try:
        with open(CSV_FILE, "r"):
            file_exists = True
    except FileNotFoundError:
        pass

    with open(CSV_FILE, "a", newline="") as csvfile:
        fieldnames = [
            "timestamp",
            "service",
            "scenario",
            "cpu",
            "memory",
            "response_time",
            "requests",
            "error_rate",
            "latency"
        ]

        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        if not file_exists:
            writer.writeheader()

        writer.writerow(data)


def update_metrics():
    while True:
        data = generate_metrics()
        save_metrics_to_csv(data)
        time.sleep(2)
