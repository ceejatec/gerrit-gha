import fastapi

app = fastapi.FastAPI()

@app.get("/speer/")
def read_root():
    return [{
        "patchset": 2,
        "attempt": 1,
        "checkName": "my check name",
        "checkDescription": "my check description",
        "checkLink": "https://google.com/",
        "status": "COMPLETED",
        "statusLink": "https://microsoft.com/",
        "results": [],
    }]

def main() -> None:
    print("Hello from speer!")
