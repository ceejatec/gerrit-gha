import fastapi

app = fastapi.FastAPI()

@app.get("/speer/")
def read_root():
    return {"Hello": "World!"}

def main() -> None:
    print("Hello from speer!")
