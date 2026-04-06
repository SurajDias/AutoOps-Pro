import random
import csv
import time
from datetime import datetime

services = ["payment", "order", "user", "inventory"]

# 🔥 STARTING VALUES (stable baseline)
metrics = {
    "cpu": 70,
    "memory": 75,
    "response_time": 150,
    "requests": 250,
    "error_rate": 1,
    "latency": 120
}

CSV_FILE = "system_metrics.csv"


# 🔥 SMOOTH CHANGE FUNCTION
def fluctuate(value, min_val, max_val, step=5):
    change = random.randint(-step, step)
    new_val = value + change
    return max(min_val, min(max_val, new_val))


def generate_metrics():
    service = random.choice(services)

    # 🔥 SMOOTH UPDATES (NOT RANDOM JUMPS)
    metrics["cpu"] = fluctuate(metrics["cpu"], 20, 95)
    metrics["memory"] = fluctuate(metrics["memory"], 30, 95)
    metrics["response_time"] = fluctuate(metrics["response_time"], 80, 900, step=20)
    metrics["requests"] = fluctuate(metrics["requests"], 100, 500, step=30)
    metrics["error_rate"] = fluctuate(metrics["error_rate"], 0, 5, step=1)
    metrics["latency"] = fluctuate(metrics["latency"], 50, 200, step=10)

    return {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "service": service,
        **metrics
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