from pydantic import BaseModel
from typing import Optional

# Represents the data that is sent to Speer from the Gerrit plugin
class SpeerRequest(BaseModel):
    repo: str
    branch: str
    changeNumber: int
    patchsetNumber: int
    patchsetSha: str
    commitMessage: Optional[str] = None
