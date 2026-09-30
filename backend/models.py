from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from database import Base


class Credential(Base):
    __tablename__ = "credentials"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    masked_value = Column(String, nullable=False)
    status = Column(String, default="ACTIVE")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Consumer(Base):
    __tablename__ = "consumers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    endpoint = Column(String, nullable=True)
    status = Column(String, default="ACTIVE")
    credential_id = Column(Integer, ForeignKey("credentials.id"), nullable=False)


class Rotation(Base):
    __tablename__ = "rotations"

    id = Column(Integer, primary_key=True, index=True)
    credential_id = Column(Integer, ForeignKey("credentials.id"), nullable=False)
    old_credential_status = Column(String, default="ACTIVE")
    new_credential_status = Column(String, default="CREATED")
    status = Column(String, default="PENDING")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Verification(Base):
    __tablename__ = "verifications"

    id = Column(Integer, primary_key=True, index=True)
    rotation_id = Column(Integer, ForeignKey("rotations.id"), nullable=False)
    consumer_id = Column(Integer, ForeignKey("consumers.id"), nullable=False)

    old_credential_result = Column(String)
    new_credential_result = Column(String)

    status = Column(String, default="PENDING")

    verified_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    verification_id = Column(
        Integer,
        ForeignKey("verifications.id"),
        nullable=False
    )

    evidence_json = Column(Text, nullable=False)
    evidence_hash = Column(String, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )