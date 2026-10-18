"""Owned, ephemeral FastAPI integration fixture; never modifies user services."""
import json
import socket
import sys
from pathlib import Path

import uvicorn
from fastapi import FastAPI, File, Header, Request, UploadFile
from pydantic import BaseModel, Field


app = FastAPI(title="Live Verification API", version="1")
observed = {}


class User(BaseModel):
    user_id: int = Field(default=0, json_schema_extra={"readOnly": True})
    display_name: str = Field(min_length=1)


class UploadResult(BaseModel):
    byte_values: list[int]
    file_name: str
    client_header: str
    content_type: str


@app.get("/health", operation_id="health")
def health() -> dict[str, bool]:
    return {"ready": True}


@app.post("/users", operation_id="createUser", response_model=User)
async def create_user(user: User, request: Request) -> User:
    observed["user"] = await request.json()
    return User(user_id=42, display_name=user.display_name)


@app.get("/users/{user_id}", operation_id="getUser", response_model=User)
def get_user(user_id: int) -> User:
    return User(user_id=user_id, display_name="Ada")


@app.post("/upload", operation_id="uploadFile", response_model=UploadResult)
async def upload_file(request: Request, file_data: UploadFile = File(...), x_client: str = Header(...)) -> UploadResult:
    return UploadResult(byte_values=list(await file_data.read()), file_name=file_data.filename or "",
                        client_header=x_client, content_type=request.headers["content-type"])


@app.get("/observed", operation_id="observed")
def get_observed() -> dict:
    return observed


if __name__ == "__main__":
    # Bind once to an OS-assigned port, then pass the same socket to uvicorn.
    # No race-prone reserve/close/rebind window and no process discovery/killing.
    listener = socket.socket()
    listener.bind(("127.0.0.1", 0))
    listener.listen(128)
    port_path = Path(sys.argv[1])
    pending = port_path.with_suffix(".tmp")
    pending.write_text(json.dumps({"port": listener.getsockname()[1]}), encoding="utf-8")
    pending.replace(port_path)
    server = uvicorn.Server(uvicorn.Config(app, log_level="info", access_log=True))
    server.run(sockets=[listener])
