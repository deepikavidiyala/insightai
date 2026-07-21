from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from chart_engine import *
from fastapi.responses import FileResponse
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Image,
    PageBreak
)
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet
from fastapi.responses import JSONResponse
from fastapi import Request
import uuid
import datetime
from pathlib import Path
import os
from logger import logger
from pydantic import BaseModel
from auth import (
    create_access_token,
    SECRET_KEY,
    ALGORITHM,
    hash_password,
    verify_password,
    verify_google_token
)
from jose import jwt, JWTError
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends

from database import (
    datasets_collection,
    insights_collection,
    users_collection
)

from analysis import (
    read_dataset,
    analyze_dataframe
)

from ai_insights import (
    generate_insights
)

app = FastAPI(
    title="InsightAI API"
)
security = HTTPBearer()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(
        request: Request,
        exc: HTTPException
):
    logger.error(
        f"HTTP Error : {exc.detail}"
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(
        request: Request,
        exc: Exception
):
    logger.error(
        f"Server Error : {str(exc)}"
    )

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal Server Error"
        }
    )
class LoginRequest(
    BaseModel
):
    username: str
    password: str


class RegisterRequest(
    BaseModel
):
    username: str
    email: str
    password: str


class GoogleLoginRequest(
    BaseModel
):
    credential: str


class AvatarRequest(
    BaseModel
):
    avatar: str
def verify_token(
        credentials:
        HTTPAuthorizationCredentials
        = Depends(security)
):

    try:

        payload = jwt.decode(

            credentials.credentials,

            SECRET_KEY,

            algorithms=[ALGORITHM]
        )

        return payload

    except JWTError:

        raise HTTPException(

            status_code=401,

            detail="Invalid token"
        )

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

REPORT_DIR = Path("reports")
REPORT_DIR.mkdir(exist_ok=True)
def _serialize_user(user: dict) -> dict:
    return {
        "username": user.get("username"),
        "email": user.get("email"),
        "auth_provider": user.get("auth_provider", "password"),
        "avatar": user.get("avatar"),
    }


@app.on_event("startup")
async def seed_default_user():
    # Keeps the old admin/admin123 demo login working after the switch to
    # DB-backed accounts, without hardcoding credentials in the request path.
    if users_collection is None:
        return

    existing = await users_collection.find_one({"username": "admin"})
    if not existing:
        await users_collection.insert_one({
            "username": "admin",
            "email": "admin@insightai.dev",
            "password": hash_password("admin123"),
            "auth_provider": "password",
            "created_at": datetime.datetime.utcnow().isoformat(),
        })
        logger.info("Seeded default admin user")


@app.post("/login")
async def login(
        user: LoginRequest
):
    if users_collection is None:
        raise HTTPException(
            status_code=503,
            detail="User database is not configured"
        )

    account = await users_collection.find_one({
        "$or": [
            {"username": user.username},
            {"email": user.username},
        ]
    })

    if not account or not verify_password(user.password, account.get("password", "")):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    token = create_access_token(
        {
            "sub": account["username"]
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _serialize_user(account),
    }


@app.post("/register")
async def register(
        user: RegisterRequest
):
    if users_collection is None:
        raise HTTPException(
            status_code=503,
            detail="User database is not configured"
        )

    username = user.username.strip()
    email = user.email.strip().lower()

    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Enter a valid email address")
    if len(user.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    existing = await users_collection.find_one({
        "$or": [{"username": username}, {"email": email}]
    })
    if existing:
        raise HTTPException(status_code=409, detail="Username or email is already registered")

    account = {
        "username": username,
        "email": email,
        "password": hash_password(user.password),
        "auth_provider": "password",
        "created_at": datetime.datetime.utcnow().isoformat(),
    }
    await users_collection.insert_one(account)

    logger.info(f"New user registered: {username}")

    token = create_access_token({"sub": username})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _serialize_user(account),
    }


@app.post("/auth/google")
async def auth_google(
        payload: GoogleLoginRequest
):
    if users_collection is None:
        raise HTTPException(
            status_code=503,
            detail="User database is not configured"
        )

    try:
        google_payload = verify_google_token(payload.credential)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    email = google_payload["email"].lower()
    name = google_payload.get("name") or email.split("@")[0]

    account = await users_collection.find_one({"email": email})

    if not account:
        # First time signing in with this Google account: auto-register them.
        base_username = name.replace(" ", "").lower() or email.split("@")[0]
        username = base_username
        suffix = 1
        while await users_collection.find_one({"username": username}):
            suffix += 1
            username = f"{base_username}{suffix}"

        account = {
            "username": username,
            "email": email,
            "password": None,
            "auth_provider": "google",
            "avatar": google_payload.get("picture"),
            "created_at": datetime.datetime.utcnow().isoformat(),
        }
        await users_collection.insert_one(account)
        logger.info(f"New Google user registered: {username}")

    token = create_access_token({"sub": account["username"]})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _serialize_user(account),
    }


@app.get("/me")
async def me(
        token=Depends(verify_token)
):
    if users_collection is None:
        raise HTTPException(status_code=503, detail="User database is not configured")

    account = await users_collection.find_one({"username": token.get("sub")})
    if not account:
        raise HTTPException(status_code=404, detail="User not found")

    return _serialize_user(account)


@app.post("/me/avatar")
async def update_avatar(
        payload: AvatarRequest,
        token=Depends(verify_token)
):
    if users_collection is None:
        raise HTTPException(status_code=503, detail="User database is not configured")

    avatar = payload.avatar or ""

    if not avatar.startswith("data:image/"):
        raise HTTPException(status_code=400, detail="Avatar must be an image data URL")

    # Rough cap so a mis-sized image can't bloat the users collection —
    # base64 inflates size by ~33%, so ~500KB here is roughly a 375KB image.
    max_len = 700_000
    if len(avatar) > max_len:
        raise HTTPException(status_code=400, detail="Image is too large. Please use a smaller photo.")

    account = await users_collection.find_one({"username": token.get("sub")})
    if not account:
        raise HTTPException(status_code=404, detail="User not found")

    await users_collection.update_one(
        {"username": token.get("sub")},
        {"$set": {"avatar": avatar}},
    )

    account["avatar"] = avatar
    logger.info(f"Avatar updated for user: {token.get('sub')}")

    return _serialize_user(account)


@app.delete("/me/avatar")
async def remove_avatar(
        token=Depends(verify_token)
):
    if users_collection is None:
        raise HTTPException(status_code=503, detail="User database is not configured")

    account = await users_collection.find_one({"username": token.get("sub")})
    if not account:
        raise HTTPException(status_code=404, detail="User not found")

    await users_collection.update_one(
        {"username": token.get("sub")},
        {"$unset": {"avatar": ""}},
    )

    account.pop("avatar", None)

    return _serialize_user(account)


@app.get("/")
async def root():

    return {
        "message":
            "InsightAI Backend Running"
    }


@app.post("/upload")
async def upload_dataset(
    token=Depends(
        verify_token
    ),
        file: UploadFile = File(...)
):
    try:

        logger.info(
            f"Uploading file : {file.filename}"
        )

        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="No file selected"
            )

        allowed_extensions = [
            ".csv",
            ".xlsx",
            ".xls",
            ".json"
        ]

        extension = os.path.splitext(
            file.filename
        )[1].lower()

        if extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type"
            )

        file_bytes = await file.read()

        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty"
            )

        max_size = 10 * 1024 * 1024

        if len(file_bytes) > max_size:
            raise HTTPException(
                status_code=400,
                detail="File size should be less than 10 MB"
            )

        df = read_dataset(
            file_bytes,
            file.filename
        )

        analysis = analyze_dataframe(df)

        file_id = str(
            uuid.uuid4()
        )

        storage_path = (
            UPLOAD_DIR /
            f"{file_id}_{file.filename}"
        )

        storage_path.write_bytes(
            file_bytes
        )

        document = {

            "file_id":
                file_id,

            "filename":
                file.filename,

            "upload_date":
                datetime.datetime.utcnow().isoformat(),

            "storage_path":
                str(storage_path),

            **analysis
        }

        if datasets_collection is not None:
            await(datasets_collection.insert_one(
                document
            ))

    

            logger.info(
                f"Dataset saved : {file_id}"
            )

        response = document.copy()
        if "_id" in response:
            response["_id"] = str(
                response["_id"]
            )

        return {
            "message":
                "Upload Successful",

            **response
        }

    except HTTPException:
        raise

    except Exception as e:

        logger.error(
            f"Upload Error : {str(e)}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
@app.get("/history")
async def history(
    tokens=Depends(
        verify_token
    ),
    page: int = 1,
    limit: int = 10
):

    try:

        logger.info(
            f"History API called | page={page}"
        )

        skip = (page - 1) * limit

        total = await (
            datasets_collection.count_documents({})
        )

        data = []

        cursor = (
            datasets_collection
            .find()
            .sort(
                "upload_date",
                -1
            )
            .skip(skip)
            .limit(limit)
        )

        async for doc in cursor:

            if "_id" in doc:
                doc["_id"] = str(
                    doc["_id"]
                )

            data.append(doc)

        return {

            "page": page,

            "limit": limit,

            "total_records": total,

            "total_pages":
                (
                    total + limit - 1
                ) // limit,

            "datasets": data
        }

    except Exception as e:

        logger.error(
            f"History Error : {str(e)}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
@app.get(
    "/analytics/{file_id}"
)
async def analytics(
        file_id: str,
        token=Depends(
            verify_token
        )
):

    try:

        logger.info(
            f"Analytics requested : {file_id}"
        )

        data = await (
            datasets_collection.find_one(
                {
                    "file_id":
                        file_id
                }
            )
        )

        if not data:
            raise HTTPException(
                status_code=404,
                detail="Dataset not found"
            )

        if "_id" in data:
            data["_id"] = str(
                data["_id"]
            )

        return data

    except HTTPException:
        raise

    except Exception as e:

        logger.error(
            f"Analytics Error : {str(e)}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@app.post(
    "/generate-insights/{file_id}"
)
async def insights(
        file_id: str,
        token=Depends(
            verify_token
        )
):

    try:

        logger.info(
            f"Generating insights : {file_id}"
        )

        data = await (
            datasets_collection.find_one(
                {
                    "file_id":
                        file_id
                }
            )
        )

        if not data:
            raise HTTPException(
                status_code=404,
                detail="Dataset not found"
            )

        df = None
        filepath = data.get("storage_path")
        if filepath and Path(filepath).exists():
            try:
                df = read_dataset(
                    open(filepath, "rb").read(),
                    filepath
                )
            except Exception as e:
                logger.error(f"Could not re-read dataset for insights: {str(e)}")

        result = await (
            generate_insights(
                data,
                df
            )
        )

        # Replace any previous insights for this file rather than accumulating
        # duplicate documents every time "Regenerate" is clicked.
        if insights_collection is not None:

            await (
                insights_collection.update_one(
                    {
                        "file_id":
                            file_id
                    },
                    {
                        "$set": {
                            "file_id": file_id,
                            **result
                        }
                    },
                    upsert=True
                )
            )

        logger.info(
            f"Insights generated : {file_id}"
        )

        return result

    except HTTPException:
        raise

    except Exception as e:

        logger.error(
            f"Insights Error : {str(e)}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
@app.delete(
    "/dataset/{file_id}"
)
async def delete_dataset(
        file_id: str,
        token=Depends(
            verify_token
        )
):

    try:

        data = await (
            datasets_collection.find_one(
                {
                    "file_id":
                        file_id
                }
            )
        )

        if not data:

            raise HTTPException(
                status_code=404,
                detail="Dataset not found"
            )

        if "storage_path" in data:

            path = Path(
                data["storage_path"]
            )

            if path.exists():
                path.unlink()

        await (
            datasets_collection.delete_one(
                {
                    "file_id":
                        file_id
                }
            )
        )

        await (
            insights_collection.delete_many(
                {
                    "file_id":
                        file_id
                }
            )
        )

        logger.info(
            f"Dataset deleted : {file_id}"
        )

        return {
            "message":
                "Deleted Successfully"
        }

    except HTTPException:
        raise

    except Exception as e:

        logger.error(
            f"Delete Error : {str(e)}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
@app.get("/dashboard-stats")
async def dashboard_stats(
    token=Depends(
        verify_token
    )
):

    try:

        logger.info(
            "Dashboard stats requested"
        )

        total_datasets = await (
            datasets_collection
            .count_documents({})
        )

        total_insights = await (
            insights_collection
            .count_documents({})
        )

        total_rows = 0
        quality_sum = 0

        async for doc in (
                datasets_collection.find()
        ):

            total_rows += (
                doc.get(
                    "rows",
                    0
                )
            )

            quality_sum += (
                doc.get(
                    "quality_score",
                    0
                )
            )

        avg_quality = 0

        if total_datasets > 0:

            avg_quality = round(
                quality_sum /
                total_datasets,
                2
            )

        return {

            "total_datasets":
                total_datasets,

            "total_rows":
                total_rows,

            "avg_quality_score":
                avg_quality,

            "total_insights":
                total_insights
        }

    except Exception as e:

        logger.error(
            f"Dashboard Error : {str(e)}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
@app.get("/report/{file_id}")
async def generate_report(
        file_id: str,
        token=Depends(verify_token)
):
    logger.info(
        f"Report requested : {file_id}"
)

    data = await datasets_collection.find_one(
        {
            "file_id": file_id
        }
    )

    if not data:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found"
        )

    insight = await insights_collection.find_one(
        {
            "file_id": file_id
        }
    )

    df = None
    filepath = data.get("storage_path")
    if filepath and Path(filepath).exists():
        try:
            df = read_dataset(
                open(filepath, "rb").read(),
                filepath
            )
        except Exception as e:
            logger.error(f"Could not re-read dataset for report charts: {str(e)}")

    report_path = (
        Path("reports")
        /
        f"{file_id}.pdf"
    )

    doc = SimpleDocTemplate(
        str(report_path)
    )

    styles = getSampleStyleSheet()

    elements = []

    elements.append(
        Paragraph(
            "AI Analytics Report",
            styles["Title"]
        )
    )

    elements.append(
        Spacer(1, 20)
    )

    elements.append(
        Paragraph(
            f"Filename : {data['filename']}",
            styles["BodyText"]
        )
    )

    elements.append(
        Paragraph(
            f"Rows : {data['rows']}",
            styles["BodyText"]
        )
    )

    elements.append(
        Paragraph(
            f"Columns : {data['columns']}",
            styles["BodyText"]
        )
    )

    elements.append(
        Paragraph(
            f"Quality Score : {data['quality_score']}%",
            styles["BodyText"]
        )
    )

    elements.append(
        Spacer(1, 20)
    )

    elements.append(
        Paragraph(
            "AI Insights",
            styles["Heading2"]
        )
    )

    if insight and insight.get("insights"):

        points = insight.get("insights")
        if isinstance(points, str):
            points = [points]

        for point in points:
            elements.append(
                Paragraph(
                    f"\u2713 {point}",
                    styles["BodyText"]
                )
            )
            elements.append(
                Spacer(1, 6)
            )

    else:

        elements.append(
            Paragraph(
                "Insights not generated.",
                styles["BodyText"]
            )
        )

    elements.append(
        Spacer(1, 20)
    )

    elements.append(
        Paragraph(
            "How to Improve Data Quality",
            styles["Heading2"]
        )
    )

    suggestions = data.get("ai_suggestions") or []

    if suggestions:
        for tip in suggestions:
            elements.append(
                Paragraph(
                    f"\u2192 {tip}",
                    styles["BodyText"]
                )
            )
            elements.append(
                Spacer(1, 6)
            )
    else:
        elements.append(
            Paragraph(
                "No specific improvement suggestions for this dataset.",
                styles["BodyText"]
            )
        )

    if df is not None:

        try:
            charts_for_report = generate_chart_data(df)
        except Exception as e:
            logger.error(f"Could not build report charts: {str(e)}")
            charts_for_report = []

        if charts_for_report:

            elements.append(PageBreak())

            elements.append(
                Paragraph(
                    "Visualizations",
                    styles["Heading2"]
                )
            )
            elements.append(Spacer(1, 10))

            for i, chart in enumerate(charts_for_report):
                try:
                    img_buf = render_chart_png(chart)
                    elements.append(
                        Image(img_buf, width=6.2 * inch, height=3.4 * inch)
                    )
                    elements.append(Spacer(1, 14))
                except Exception as e:
                    logger.error(f"Could not render chart '{chart.get('title')}': {str(e)}")

                # Two charts per page keeps each one legible; break before a
                # third would get squeezed onto the same page.
                if (i + 1) % 2 == 0 and i != len(charts_for_report) - 1:
                    elements.append(PageBreak())

    doc.build(elements)

    return FileResponse(
        path=str(report_path),
        filename=f"{file_id}.pdf",
        media_type="application/pdf"
    )
@app.get("/charts/{file_id}")
async def charts(file_id: str,
                 token=Depends(
                     verify_token
                 )):
    logger.info(
        f"Charts requested : {file_id}"
)

    data = await datasets_collection.find_one(
        {"file_id": file_id}
    )

    if not data:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found"
        )

    filepath = data.get("storage_path")

    if not filepath:
        raise HTTPException(
            status_code=404,
            detail="File path missing"
        )

    df = read_dataset(
        open(filepath, "rb").read(),
        filepath
    )

    charts = generate_chart_data(df)

    return {
        "file_id": file_id,
        "charts": charts
    }