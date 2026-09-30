from datetime import datetime, timezone
import hashlib
import json

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy.orm import Session

from database import engine, SessionLocal, Base
from models import Credential, Consumer, Rotation, Verification, Evidence
from schemas import (
    CredentialCreate,
    CredentialResponse,
    ConsumerCreate,
    ConsumerResponse,
    RotationCreate,
    RotationResponse,
    VerificationCreate,
    VerificationResponse,
    EvidenceResponse,
)


# ---------------------------------------------------------
# DATABASE
# ---------------------------------------------------------

Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------
# FASTAPI APP
# ---------------------------------------------------------

app = FastAPI(
    title="KRYPTONITE API",
    description="Credential Lifecycle and Verification Proof Engine",
    version="1.0.0",
)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://kryptonite-production-bf87.up.railway.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# DATABASE SESSION
# ---------------------------------------------------------

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------
# ROOT
# ---------------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "KRYPTONITE API is running",
        "status": "online",
        "version": "1.0.0",
    }


# =========================================================
# CREDENTIALS
# =========================================================

@app.post(
    "/credentials",
    response_model=CredentialResponse
)
def create_credential(
    credential: CredentialCreate,
    db: Session = Depends(get_db)
):
    new_credential = Credential(
        name=credential.name,
        provider=credential.provider,
        masked_value=credential.masked_value,
        status=credential.status,
    )

    db.add(new_credential)
    db.commit()
    db.refresh(new_credential)

    return new_credential


@app.get(
    "/credentials",
    response_model=list[CredentialResponse]
)
def get_credentials(
    db: Session = Depends(get_db)
):
    return db.query(Credential).all()


@app.get(
    "/credentials/{credential_id}",
    response_model=CredentialResponse
)
def get_credential(
    credential_id: int,
    db: Session = Depends(get_db)
):
    credential = (
        db.query(Credential)
        .filter(Credential.id == credential_id)
        .first()
    )

    if not credential:
        raise HTTPException(
            status_code=404,
            detail="Credential not found"
        )

    return credential


# =========================================================
# CONSUMERS
# =========================================================

@app.post(
    "/consumers",
    response_model=ConsumerResponse
)
def create_consumer(
    consumer: ConsumerCreate,
    db: Session = Depends(get_db)
):
    credential = (
        db.query(Credential)
        .filter(Credential.id == consumer.credential_id)
        .first()
    )

    if not credential:
        raise HTTPException(
            status_code=404,
            detail="Credential not found"
        )

    new_consumer = Consumer(
        name=consumer.name,
        type=consumer.type,
        endpoint=consumer.endpoint,
        credential_id=consumer.credential_id,
        status=consumer.status,
    )

    db.add(new_consumer)
    db.commit()
    db.refresh(new_consumer)

    return new_consumer


@app.get(
    "/consumers",
    response_model=list[ConsumerResponse]
)
def get_consumers(
    db: Session = Depends(get_db)
):
    return db.query(Consumer).all()


@app.get(
    "/consumers/{consumer_id}",
    response_model=ConsumerResponse
)
def get_consumer(
    consumer_id: int,
    db: Session = Depends(get_db)
):
    consumer = (
        db.query(Consumer)
        .filter(Consumer.id == consumer_id)
        .first()
    )

    if not consumer:
        raise HTTPException(
            status_code=404,
            detail="Consumer not found"
        )

    return consumer


# =========================================================
# ROTATIONS
# =========================================================

@app.post(
    "/rotations",
    response_model=RotationResponse
)
def create_rotation(
    rotation: RotationCreate,
    db: Session = Depends(get_db)
):
    credential = (
        db.query(Credential)
        .filter(Credential.id == rotation.credential_id)
        .first()
    )

    if not credential:
        raise HTTPException(
            status_code=404,
            detail="Credential not found"
        )

    new_rotation = Rotation(
        credential_id=rotation.credential_id,
        old_credential_status="ACTIVE",
        new_credential_status="CREATED",
        status="PENDING",
    )

    db.add(new_rotation)

    # The real secret is intentionally not stored.
    # Only the rotation lifecycle state is tracked.

    credential.status = "ROTATION_PENDING"

    db.commit()
    db.refresh(new_rotation)

    return new_rotation


@app.get(
    "/rotations",
    response_model=list[RotationResponse]
)
def get_rotations(
    db: Session = Depends(get_db)
):
    return db.query(Rotation).all()


@app.get(
    "/rotations/{rotation_id}",
    response_model=RotationResponse
)
def get_rotation(
    rotation_id: int,
    db: Session = Depends(get_db)
):
    rotation = (
        db.query(Rotation)
        .filter(Rotation.id == rotation_id)
        .first()
    )

    if not rotation:
        raise HTTPException(
            status_code=404,
            detail="Rotation not found"
        )

    return rotation


# =========================================================
# VERIFICATION / PROOF ENGINE
# =========================================================

@app.post(
    "/verify",
    response_model=VerificationResponse
)
def verify_rotation(
    verification: VerificationCreate,
    db: Session = Depends(get_db)
):
    rotation = (
        db.query(Rotation)
        .filter(Rotation.id == verification.rotation_id)
        .first()
    )

    if not rotation:
        raise HTTPException(
            status_code=404,
            detail="Rotation not found"
        )

    consumer = (
        db.query(Consumer)
        .filter(Consumer.id == verification.consumer_id)
        .first()
    )

    if not consumer:
        raise HTTPException(
            status_code=404,
            detail="Consumer not found"
        )

    if consumer.credential_id != rotation.credential_id:
        raise HTTPException(
            status_code=400,
            detail="Consumer is not mapped to this credential"
        )

    # -----------------------------------------------------
    # CONTROLLED MVP TEST MODES
    # -----------------------------------------------------

    test_mode = verification.test_mode.upper()

    if test_mode == "VERIFIED":

        old_result = "REJECTED"
        new_result = "ACCEPTED"
        verification_status = "VERIFIED"

    elif test_mode == "PARTIAL":

        old_result = "UNKNOWN"
        new_result = "ACCEPTED"
        verification_status = "PARTIAL"

    elif test_mode == "FAILED":

        old_result = "ACCEPTED"
        new_result = "REJECTED"
        verification_status = "FAILED"

    else:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid test_mode. "
                "Use VERIFIED, PARTIAL, or FAILED."
            )
        )

    # -----------------------------------------------------
    # CREATE VERIFICATION
    # -----------------------------------------------------

    new_verification = Verification(
        rotation_id=verification.rotation_id,
        consumer_id=verification.consumer_id,
        old_credential_result=old_result,
        new_credential_result=new_result,
        status=verification_status,
        verified_at=datetime.now(timezone.utc),
    )

    db.add(new_verification)
    db.flush()

    # -----------------------------------------------------
    # UPDATE ROTATION STATUS
    # -----------------------------------------------------

    rotation.status = verification_status

    if verification_status == "VERIFIED":

        rotation.old_credential_status = "RETIRED"
        rotation.new_credential_status = "ACTIVE"

    elif verification_status == "PARTIAL":

        rotation.old_credential_status = "UNKNOWN"
        rotation.new_credential_status = "ACTIVE"

    elif verification_status == "FAILED":

        rotation.old_credential_status = "ACTIVE"
        rotation.new_credential_status = "REJECTED"

    # -----------------------------------------------------
    # EVIDENCE RECEIPT
    # -----------------------------------------------------

    verification_timestamp = (
        new_verification.verified_at.isoformat()
        if new_verification.verified_at
        else datetime.now(timezone.utc).isoformat()
    )

    evidence_data = {
        "verification_id": new_verification.id,
        "rotation_id": rotation.id,
        "credential_id": rotation.credential_id,
        "consumer_id": consumer.id,
        "consumer_name": consumer.name,
        "old_credential_result": old_result,
        "new_credential_result": new_result,
        "status": verification_status,
        "verification_mode": "CONTROLLED_MVP_TEST",
        "timestamp": verification_timestamp,
    }

    evidence_json = json.dumps(
        evidence_data,
        sort_keys=True,
        indent=2
    )

    evidence_hash = hashlib.sha256(
        evidence_json.encode("utf-8")
    ).hexdigest()

    evidence = Evidence(
        verification_id=new_verification.id,
        evidence_json=evidence_json,
        evidence_hash=evidence_hash,
    )

    db.add(evidence)

    # -----------------------------------------------------
    # COMMIT EVERYTHING
    # -----------------------------------------------------

    db.commit()
    db.refresh(new_verification)

    return new_verification


# =========================================================
# VERIFICATIONS
# =========================================================

@app.get(
    "/verifications",
    response_model=list[VerificationResponse]
)
def get_verifications(
    db: Session = Depends(get_db)
):
    return (
        db.query(Verification)
        .order_by(Verification.id.desc())
        .all()
    )


@app.get(
    "/verifications/{verification_id}",
    response_model=VerificationResponse
)
def get_verification(
    verification_id: int,
    db: Session = Depends(get_db)
):
    verification = (
        db.query(Verification)
        .filter(Verification.id == verification_id)
        .first()
    )

    if not verification:
        raise HTTPException(
            status_code=404,
            detail="Verification not found"
        )

    return verification


# =========================================================
# EVIDENCE
# =========================================================

@app.get(
    "/evidence/{verification_id}",
    response_model=EvidenceResponse
)
def get_evidence(
    verification_id: int,
    db: Session = Depends(get_db)
):
    evidence = (
        db.query(Evidence)
        .filter(
            Evidence.verification_id == verification_id
        )
        .first()
    )

    if not evidence:
        raise HTTPException(
            status_code=404,
            detail="Evidence not found"
        )

    return evidence


@app.get(
    "/evidence/{verification_id}/download"
)
def download_evidence(
    verification_id: int,
    db: Session = Depends(get_db)
):
    evidence = (
        db.query(Evidence)
        .filter(
            Evidence.verification_id == verification_id
        )
        .first()
    )

    if not evidence:
        raise HTTPException(
            status_code=404,
            detail="Evidence not found"
        )

    return Response(
        content=evidence.evidence_json,
        media_type="application/json",
        headers={
            "Content-Disposition": (
                f"attachment; "
                f"filename=evidence_{verification_id}.json"
            )
        },
    )