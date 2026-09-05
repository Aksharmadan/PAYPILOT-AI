import os
import sys

# Ensure app package is in import path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.database import SessionLocal
from app.models.merchant import Merchant
from app.models.policy import MerchantPolicy
from app.models.revenue import Customer, Payment, RecoveryOpportunity
from app.api.routes.copilot import chat
from app.schemas.revenue import CopilotMessageIn

from app.core.config import settings
print("SETTINGS:", settings.model_dump())
db = SessionLocal()
try:
    payload = CopilotMessageIn(message="what is our revenue at risk?")
    res = chat(payload=payload, db=db, _=None)
    print("SUCCESS:", res)
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
