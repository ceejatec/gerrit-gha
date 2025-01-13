import fastapi
from pydantic import BaseModel
from speer.checks_datamodel import CheckRun
from speer.speer_datamodel import SpeerRequest

from typing import List

app = fastapi.FastAPI()

@app.post("/speer/")
def read_root(data: SpeerRequest) -> List[CheckRun]:
    return [{
        "patchset": data.patchsetNumber,
        "attempt": 1,
        "checkName": f"my check name for {data.patchsetNumber}",
        "checkDescription": "my check description",
        "checkLink": "https://google.com/",
        "status": "COMPLETED",
        "statusLink": "https://microsoft.com/",
        "results": [],
    }]

def main() -> None:
    print("Hello from speer!")
