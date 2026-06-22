from fastapi import FastAPI

app = FastAPI(title="MinimalPOI")


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
