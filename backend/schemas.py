from pydantic import BaseModel


# ============================================================
# CREDENTIALS
# ============================================================

class CredentialCreate(BaseModel):
    name: str
    provider: str
    masked_value: str
    status: str = "ACTIVE"


class CredentialResponse(BaseModel):
    id: int
    name: str
    provider: str
    masked_value: str
    status: str

    class Config:
        from_attributes = True


# ============================================================
# CONSUMERS
# ============================================================

class ConsumerCreate(BaseModel):
    name: str
    type: str
    endpoint: str | None = None
    credential_id: int
    status: str = "ACTIVE"


class ConsumerResponse(BaseModel):
    id: int
    name: str
    type: str
    endpoint: str | None
    credential_id: int
    status: str

    class Config:
        from_attributes = True


# ============================================================
# ROTATIONS
# ============================================================

class RotationCreate(BaseModel):
    credential_id: int
    new_credential_value: str


class RotationResponse(BaseModel):
    id: int
    credential_id: int
    old_credential_status: str
    new_credential_status: str
    status: str

    class Config:
        from_attributes = True


# ============================================================
# VERIFICATION
# ============================================================

class VerificationCreate(BaseModel):
    rotation_id: int
    consumer_id: int

    # Controlled MVP test mode.
    # Possible values:
    # - VERIFIED
    # - FAILED
    # - PARTIAL
    test_mode: str = "VERIFIED"


class VerificationResponse(BaseModel):
    id: int
    rotation_id: int
    consumer_id: int
    old_credential_result: str
    new_credential_result: str
    status: str

    class Config:
        from_attributes = True


# ============================================================
# EVIDENCE
# ============================================================

class EvidenceResponse(BaseModel):
    id: int
    verification_id: int
    evidence_json: str
    evidence_hash: str

    class Config:
        from_attributes = True