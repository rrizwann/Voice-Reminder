import os
from azure.storage.blob import BlobServiceClient, ContentSettings

CONNECTION_STRING = os.environ["AZURE_STORAGE_CONNECTION_STRING"]
CONTAINER = os.environ.get("AZURE_STORAGE_CONTAINER", "reminders")

_client = BlobServiceClient.from_connection_string(CONNECTION_STRING)


def upload_mp3(data: bytes, user_id: str, file_name: str) -> str:
    """Upload MP3 bytes and return the public blob URL."""
    blob_path = f"reminders/{user_id}/{file_name}"
    container_client = _client.get_container_client(CONTAINER)
    container_client.upload_blob(
        name=blob_path,
        data=data,
        overwrite=True,
        content_settings=ContentSettings(content_type="audio/mpeg"),
    )
    account_name = _client.account_name
    return f"https://{account_name}.blob.core.windows.net/{CONTAINER}/{blob_path}"
