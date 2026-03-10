import pandas as pd

CSV_FILE = "system_metrics.csv"

def get_metrics_history(service=None, limit=50):
    try:
        df = pd.read_csv(CSV_FILE)

        if service:
            df = df[df["service"] == service]

        df = df.tail(limit)

        return df.to_dict(orient="records")

    except FileNotFoundError:
        return []
