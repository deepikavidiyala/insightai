import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "insightai")

print("Mongo URI :", MONGODB_URI)
print("DB Name :", MONGODB_DB_NAME)

client = None
db = None
datasets_collection = None
insights_collection = None
users_collection = None

if MONGODB_URI:
    client = AsyncIOMotorClient(
        MONGODB_URI,
        serverSelectionTimeoutMS=5000
    )

    db = client[MONGODB_DB_NAME]

    datasets_collection = db["datasets"]
    insights_collection = db["insights"]
    users_collection = db["users"]


async def ping_db():
    if client:
        try:
            await client.admin.command("ping")
            print("MongoDB Connected ✅")
        except Exception as e:
            print("MongoDB Connection Failed:", e)