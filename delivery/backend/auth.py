import os
from datetime import datetime, timedelta

import bcrypt
from jose import jwt
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

SECRET_KEY = os.getenv("SECRET_KEY", "your_secret_key_here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Set this to the OAuth Client ID from https://console.cloud.google.com/apis/credentials
# (Credentials > OAuth 2.0 Client IDs > Web application). Required for "Continue with Google".
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

# bcrypt truncates the input to 72 bytes internally; passlib's own version-
# detection for bcrypt >= 4.1 raises a spurious error on some setups
# (missing `bcrypt.__about__`), so we call the bcrypt library directly
# instead of going through passlib.
_BCRYPT_MAX_BYTES = 72


def hash_password(password: str) -> str:
    encoded = password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    return bcrypt.hashpw(encoded, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    try:
        encoded = plain_password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
        return bcrypt.checkpw(encoded, hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(data: dict):

    to_encode = data.copy()

    expire = (
        datetime.utcnow()
        + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    to_encode.update(
        {
            "exp": expire
        }
    )

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def verify_google_token(credential: str) -> dict:
    """
    Verifies a Google Identity Services ID token sent from the frontend.
    Returns the decoded payload (contains email, name, sub, etc.) or raises
    ValueError if the token is invalid, expired, or issued for a different client.
    """
    if not GOOGLE_CLIENT_ID:
        raise ValueError(
            "GOOGLE_CLIENT_ID is not configured on the server. "
            "Set it in the backend .env file."
        )

    payload = google_id_token.verify_oauth2_token(
        credential,
        google_requests.Request(),
        GOOGLE_CLIENT_ID,
    )

    if not payload.get("email_verified", True):
        raise ValueError("Google email is not verified.")

    return payload
