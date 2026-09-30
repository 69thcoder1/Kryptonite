import { useEffect, useState } from "react";
import axios from "axios";
import {
  LayoutDashboard,
  KeyRound,
  CircleDot,
  RotateCw,
  Check,
  FileText,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Download,
  Eye,
  Activity,
  Server,
  Clock3,
  Fingerprint,
  ChevronUp,
} from "lucide-react";

import "./App.css";

// ==========================================================
// PRODUCTION BACKEND
// ==========================================================

const API_BASE_URL = "https://kryptonite-production.up.railway.app";

function App() {
  const [credentials, setCredentials] = useState([]);
  const [consumers, setConsumers] = useState([]);
  const [rotations, setRotations] = useState([]);
  const [verifications, setVerifications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");

  const [expandedEvidence, setExpandedEvidence] = useState(null);
  const [evidenceData, setEvidenceData] = useState({});

  // Scenario selected for each rotation
  const [scenario, setScenario] = useState({});

  // ==========================================================
  // FETCH DATA
  // ==========================================================

  const fetchDashboardData = async () => {
    try {
      setError("");

      const [
        credentialsResponse,
        consumersResponse,
        rotationsResponse,
        verificationsResponse,
      ] = await Promise.all([
        axios.get(`${API_BASE_URL}/credentials`),
        axios.get(`${API_BASE_URL}/consumers`),
        axios.get(`${API_BASE_URL}/rotations`),
        axios.get(`${API_BASE_URL}/verifications`),
      ]);

      setCredentials(credentialsResponse.data);
      setConsumers(consumersResponse.data);
      setRotations(rotationsResponse.data);
      setVerifications(verificationsResponse.data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);

      setError(
        "Unable to connect to KRYPTONITE backend. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ==========================================================
  // HELPERS
  // ==========================================================

  const getVerificationForRotation = (rotationId) => {
    const matches = verifications.filter(
      (verification) => verification.rotation_id === rotationId
    );

    if (matches.length === 0) {
      return null;
    }

    return matches[matches.length - 1];
  };

  const getConsumerForRotation = (rotation) => {
    return (
      consumers.find(
        (consumer) => consumer.credential_id === rotation.credential_id
      ) || null
    );
  };

  const getCredentialForRotation = (rotation) => {
    return (
      credentials.find(
        (credential) => credential.id === rotation.credential_id
      ) || null
    );
  };

  // ==========================================================
  // STATS
  // ==========================================================

  const verifiedCount = rotations.filter(
    (rotation) => rotation.status === "VERIFIED"
  ).length;

  const partialCount = rotations.filter(
    (rotation) => rotation.status === "PARTIAL"
  ).length;

  const failedCount = rotations.filter(
    (rotation) => rotation.status === "FAILED"
  ).length;

  // ==========================================================
  // VERIFY / RE-VERIFY
  // ==========================================================

  const verifyRotation = async (rotation) => {
    const consumer = getConsumerForRotation(rotation);

    if (!consumer) {
      setError(
        `No consumer mapped to Credential #${rotation.credential_id}`
      );
      return;
    }

    const selectedScenario = scenario[rotation.id] || "VERIFIED";

    try {
      setActionLoading(`verify-${rotation.id}`);
      setError("");

      await axios.post(`${API_BASE_URL}/verify`, {
        rotation_id: rotation.id,
        consumer_id: consumer.id,
        test_mode: selectedScenario,
      });

      await fetchDashboardData();
    } catch (err) {
      console.error("Verification error:", err);

      setError(
        err.response?.data?.detail ||
          "Verification failed. Please check the backend."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================================
  // LOAD EVIDENCE
  // ==========================================================

  const loadEvidence = async (verificationId) => {
    try {
      setActionLoading(`evidence-${verificationId}`);
      setError("");

      const response = await axios.get(
        `${API_BASE_URL}/evidence/${verificationId}`
      );

      setEvidenceData((previous) => ({
        ...previous,
        [verificationId]: response.data,
      }));

      setExpandedEvidence((current) =>
        current === verificationId ? null : verificationId
      );
    } catch (err) {
      console.error("Evidence error:", err);

      setError(
        err.response?.data?.detail || "Unable to load evidence."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================================
  // DOWNLOAD EVIDENCE
  // ==========================================================

  const downloadEvidence = (verificationId) => {
    window.open(
      `${API_BASE_URL}/evidence/${verificationId}/download`,
      "_blank"
    );
  };

  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  const formatDate = (dateString) => {
    if (!dateString) {
      return "Not available";
    }

    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  // ==========================================================
  // STATUS BADGE
  // ==========================================================

  const renderStatusBadge = (status) => {
    if (status === "VERIFIED") {
      return (
        <span className="status-badge verified">
          <Check size={13} />
          VERIFIED
        </span>
      );
    }

    if (status === "PARTIAL") {
      return (
        <span className="status-badge partial">
          <AlertTriangle size={13} />
          PARTIAL
        </span>
      );
    }

    if (status === "FAILED") {
      return (
        <span className="status-badge failed">
          <XCircle size={13} />
          FAILED
        </span>
      );
    }

    return (
      <span className="status-badge pending">
        <Clock3 size={13} />
        PENDING
      </span>
    );
  };

  // ==========================================================
  // SCENARIO DESCRIPTION
  // ==========================================================

  const getScenarioDescription = (value) => {
    if (value === "FAILED") {
      return "Old credential still accepted";
    }

    if (value === "PARTIAL") {
      return "Consumer verification incomplete";
    }

    return "Old rejected • New accepted";
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">
          <RefreshCw size={28} />
        </div>

        <h2>Loading KRYPTONITE</h2>

        <p>Connecting to Proof Engine...</p>
      </div>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="app-container">

      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <aside className="sidebar">

        <div className="sidebar-brand">

          <div className="brand-icon">
            <ShieldCheck size={24} />
          </div>

          <div>
            <div className="brand-name">
              KRYPTONITE
            </div>

            <div className="brand-subtitle">
              Credential Proof Engine
            </div>
          </div>

        </div>

        <nav className="sidebar-nav">

          <div className="nav-item active">
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </div>

          <div className="nav-item">
            <KeyRound size={18} />
            <span>Credentials</span>
          </div>

          <div className="nav-item">
            <CircleDot size={18} />
            <span>Consumers</span>
          </div>

          <div className="nav-item">
            <RotateCw size={18} />
            <span>Rotations</span>
          </div>

          <div className="nav-item">
            <Check size={18} />
            <span>Verification</span>
          </div>

          <div className="nav-item">
            <FileText size={18} />
            <span>Evidence</span>
          </div>

        </nav>

        <div className="sidebar-status">

          <div className="online-dot"></div>

          <div>
            <strong>System Online</strong>
            <span>API Connected</span>
          </div>

        </div>

      </aside>


      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="main-content">

        {/* HEADER */}

        <header className="top-header">

          <div>
            <h1>Dashboard</h1>

            <p>
              Credential lifecycle verification and proof
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={fetchDashboardData}
            disabled={actionLoading !== null}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

        </header>


        {/* ERROR */}

        {error && (
          <div className="error-banner">

            <XCircle size={18} />

            <span>{error}</span>

            <button onClick={() => setError("")}>
              ×
            </button>

          </div>
        )}


        {/* ====================================================
            STATS
        ==================================================== */}

        <section className="stats-grid">

          <div className="stat-card">

            <div className="stat-card-header">

              <span>VERIFIED</span>

              <div className="stat-icon">
                <Check size={17} />
              </div>

            </div>

            <div className="stat-number">
              {verifiedCount}
            </div>

            <div className="stat-description">
              Credentials proven retired
            </div>

          </div>


          <div className="stat-card">

            <div className="stat-card-header">

              <span>PARTIAL</span>

              <div className="stat-icon">
                <AlertTriangle size={17} />
              </div>

            </div>

            <div className="stat-number">
              {partialCount}
            </div>

            <div className="stat-description">
              Verification needs attention
            </div>

          </div>


          <div className="stat-card">

            <div className="stat-card-header">

              <span>FAILED</span>

              <div className="stat-icon">
                <XCircle size={17} />
              </div>

            </div>

            <div className="stat-number">
              {failedCount}
            </div>

            <div className="stat-description">
              Verification failures
            </div>

          </div>


          <div className="stat-card">

            <div className="stat-card-header">

              <span>ROTATIONS</span>

              <div className="stat-icon">
                <RotateCw size={17} />
              </div>

            </div>

            <div className="stat-number">
              {rotations.length}
            </div>

            <div className="stat-description">
              Total credential rotations
            </div>

          </div>

        </section>


        {/* ====================================================
            DASHBOARD GRID
        ==================================================== */}

        <section className="dashboard-grid">

          {/* ==================================================
              PROOF ENGINE
          ================================================== */}

          <div className="panel proof-engine-panel">

            <div className="panel-header">

              <div>

                <div className="panel-eyebrow">
                  PROOF ENGINE
                </div>

                <h2>
                  Verification Overview
                </h2>

              </div>

              <div className="live-badge">
                <span></span>
                LIVE
              </div>

            </div>


            <div className="verification-list">

              {rotations.length === 0 ? (

                <div className="empty-state">

                  <ShieldCheck size={28} />

                  <p>
                    No credential rotations found.
                  </p>

                </div>

              ) : (

                rotations.map((rotation) => {

                  const verification =
                    getVerificationForRotation(rotation.id);

                  const consumer =
                    getConsumerForRotation(rotation);

                  const credential =
                    getCredentialForRotation(rotation);

                  const evidence =
                    verification
                      ? evidenceData[verification.id]
                      : null;

                  const isExpanded =
                    verification &&
                    expandedEvidence === verification.id;

                  const isVerifying =
                    actionLoading ===
                    `verify-${rotation.id}`;

                  const isLoadingEvidence =
                    verification &&
                    actionLoading ===
                    `evidence-${verification.id}`;

                  const selectedScenario =
                    scenario[rotation.id] || "VERIFIED";


                  return (
                    <div
                      className="verification-card"
                      key={rotation.id}
                    >

                      {/* MAIN ROW */}

                      <div className="verification-main">

                        <div className="verification-left">

                          <div
                            className={`verification-icon ${
                              rotation.status === "VERIFIED"
                                ? "verified-icon"
                                : rotation.status === "PARTIAL"
                                ? "partial-icon"
                                : rotation.status === "FAILED"
                                ? "failed-icon"
                                : ""
                            }`}
                          >

                            {rotation.status === "VERIFIED" ? (
                              <Check size={20} />
                            ) : rotation.status === "PARTIAL" ? (
                              <AlertTriangle size={20} />
                            ) : rotation.status === "FAILED" ? (
                              <XCircle size={20} />
                            ) : (
                              <RotateCw size={20} />
                            )}

                          </div>


                          <div className="verification-info">

                            <div className="verification-title">
                              Rotation #{rotation.id}
                            </div>

                            <div className="verification-subtitle">

                              {credential
                                ? credential.name
                                : `Credential #${rotation.credential_id}`}

                              {consumer && (
                                <>
                                  <span className="separator">
                                    •
                                  </span>

                                  {consumer.name}
                                </>
                              )}

                            </div>

                          </div>

                        </div>


                        <div className="verification-actions">

                          {renderStatusBadge(
                            rotation.status
                          )}


                          {/* SCENARIO SELECTOR */}

                          <select
                            className="scenario-select"
                            value={selectedScenario}
                            onChange={(event) =>
                              setScenario((previous) => ({
                                ...previous,
                                [rotation.id]:
                                  event.target.value,
                              }))
                            }
                          >

                            <option value="VERIFIED">
                              🟢 Verified
                            </option>

                            <option value="PARTIAL">
                              🟡 Partial
                            </option>

                            <option value="FAILED">
                              🔴 Failed
                            </option>

                          </select>


                          {/* VERIFY */}

                          <button
                            className="action-button secondary"
                            onClick={() =>
                              verifyRotation(rotation)
                            }
                            disabled={isVerifying}
                          >

                            {isVerifying ? (
                              <RefreshCw
                                size={15}
                                className="spin"
                              />
                            ) : (
                              <RefreshCw size={15} />
                            )}

                            {rotation.status === "VERIFIED"
                              ? "Re-Verify"
                              : "Verify"}

                          </button>


                          {/* EVIDENCE */}

                          {verification && (
                            <button
                              className="action-button evidence-button"
                              onClick={() =>
                                loadEvidence(
                                  verification.id
                                )
                              }
                              disabled={
                                isLoadingEvidence
                              }
                            >

                              {isLoadingEvidence ? (
                                <RefreshCw
                                  size={15}
                                  className="spin"
                                />
                              ) : isExpanded ? (
                                <ChevronUp size={15} />
                              ) : (
                                <Eye size={15} />
                              )}

                              {isExpanded
                                ? "Hide Evidence"
                                : "View Evidence"}

                            </button>
                          )}

                        </div>

                      </div>


                      {/* SCENARIO DESCRIPTION */}

                      <div className="scenario-info">

                        <span>
                          Test Scenario:
                        </span>

                        <strong>
                          {selectedScenario}
                        </strong>

                        <span>
                          —
                        </span>

                        <span>
                          {getScenarioDescription(
                            selectedScenario
                          )}
                        </span>

                      </div>


                      {/* =================================================
                          EVIDENCE
                      ================================================= */}

                      {isExpanded && evidence && (

                        <div className="evidence-panel">

                          <div className="evidence-header">

                            <div>

                              <div className="panel-eyebrow">
                                EVIDENCE RECEIPT
                              </div>

                              <h3>
                                Verification Evidence
                              </h3>

                            </div>

                            <button
                              className="action-button download-button"
                              onClick={() =>
                                downloadEvidence(
                                  verification.id
                                )
                              }
                            >
                              <Download size={15} />
                              Download JSON
                            </button>

                          </div>


                          {/* RESULTS */}

                          <div className="evidence-results">

                            <div className="evidence-result">

                              <span>
                                OLD CREDENTIAL
                              </span>

                              <strong
                                className={
                                  verification.old_credential_result ===
                                  "REJECTED"
                                    ? "result-rejected"
                                    : verification.old_credential_result ===
                                      "ACCEPTED"
                                    ? "result-accepted"
                                    : "result-unknown"
                                }
                              >

                                {verification.old_credential_result ===
                                "REJECTED" ? (
                                  <XCircle size={15} />
                                ) : verification.old_credential_result ===
                                  "ACCEPTED" ? (
                                  <Check size={15} />
                                ) : (
                                  <AlertTriangle size={15} />
                                )}

                                {
                                  verification.old_credential_result
                                }

                              </strong>

                            </div>


                            <div className="evidence-result">

                              <span>
                                NEW CREDENTIAL
                              </span>

                              <strong
                                className={
                                  verification.new_credential_result ===
                                  "ACCEPTED"
                                    ? "result-accepted"
                                    : verification.new_credential_result ===
                                      "REJECTED"
                                    ? "result-rejected"
                                    : "result-unknown"
                                }
                              >

                                {verification.new_credential_result ===
                                "ACCEPTED" ? (
                                  <Check size={15} />
                                ) : verification.new_credential_result ===
                                  "REJECTED" ? (
                                  <XCircle size={15} />
                                ) : (
                                  <AlertTriangle size={15} />
                                )}

                                {
                                  verification.new_credential_result
                                }

                              </strong>

                            </div>


                            <div className="evidence-result">

                              <span>
                                FINAL STATUS
                              </span>

                              <strong
                                className={
                                  verification.status ===
                                  "VERIFIED"
                                    ? "result-verified"
                                    : verification.status ===
                                      "PARTIAL"
                                    ? "result-partial"
                                    : "result-failed"
                                }
                              >

                                {verification.status ===
                                "VERIFIED" ? (
                                  <ShieldCheck size={15} />
                                ) : verification.status ===
                                  "PARTIAL" ? (
                                  <AlertTriangle size={15} />
                                ) : (
                                  <XCircle size={15} />
                                )}

                                {verification.status}

                              </strong>

                            </div>

                          </div>


                          {/* METADATA */}

                          <div className="evidence-metadata">

                            <div className="metadata-item">

                              <Clock3 size={16} />

                              <div>

                                <span>
                                  Timestamp
                                </span>

                                <strong>
                                  {formatDate(
                                    verification.verified_at
                                  )}
                                </strong>

                              </div>

                            </div>


                            <div className="metadata-item">

                              <Fingerprint size={16} />

                              <div>

                                <span>
                                  SHA-256 Evidence Hash
                                </span>

                                <strong className="hash-text">
                                  {evidence.evidence_hash}
                                </strong>

                              </div>

                            </div>


                            <div className="metadata-item">

                              <Server size={16} />

                              <div>

                                <span>
                                  Consumer
                                </span>

                                <strong>
                                  {consumer
                                    ? consumer.name
                                    : `Consumer #${verification.consumer_id}`}
                                </strong>

                              </div>

                            </div>

                          </div>


                          {/* RAW JSON */}

                          <details className="raw-evidence">

                            <summary>
                              <FileText size={15} />
                              View Raw Evidence JSON
                            </summary>

                            <pre>
                              {evidence.evidence_json}
                            </pre>

                          </details>

                        </div>
                      )}

                    </div>
                  );
                })
              )}

            </div>

          </div>


          {/* ==================================================
              SYSTEM OVERVIEW
          ================================================== */}

          <div className="panel system-panel">

            <div className="panel-header">

              <div>

                <div className="panel-eyebrow">
                  SYSTEM OVERVIEW
                </div>

                <h2>
                  Current Resources
                </h2>

              </div>

            </div>


            <div className="resource-list">

              <div className="resource-card">

                <div className="resource-icon">
                  <KeyRound size={19} />
                </div>

                <div className="resource-info">

                  <strong>
                    Credentials
                  </strong>

                  <span>
                    Managed credentials
                  </span>

                </div>

                <div className="resource-count">
                  {credentials.length}
                </div>

              </div>


              <div className="resource-card">

                <div className="resource-icon">
                  <CircleDot size={19} />
                </div>

                <div className="resource-info">

                  <strong>
                    Consumers
                  </strong>

                  <span>
                    Credential consumers
                  </span>

                </div>

                <div className="resource-count">
                  {consumers.length}
                </div>

              </div>


              <div className="resource-card">

                <div className="resource-icon">
                  <RotateCw size={19} />
                </div>

                <div className="resource-info">

                  <strong>
                    Rotations
                  </strong>

                  <span>
                    Rotation operations
                  </span>

                </div>

                <div className="resource-count">
                  {rotations.length}
                </div>

              </div>


              <div className="resource-card">

                <div className="resource-icon">
                  <Activity size={19} />
                </div>

                <div className="resource-info">

                  <strong>
                    Verifications
                  </strong>

                  <span>
                    Proof operations
                  </span>

                </div>

                <div className="resource-count">
                  {verifications.length}
                </div>

              </div>

            </div>

          </div>

        </section>


        {/* ====================================================
            WORKFLOW
        ==================================================== */}

        <section className="workflow-panel">

          <div className="workflow-heading">

            <div className="panel-eyebrow">
              KRYPTONITE WORKFLOW
            </div>

            <h2>
              Credential Lifecycle
            </h2>

          </div>


          <div className="workflow">

            <div className="workflow-step">

              <div className="workflow-number">
                01
              </div>

              <div>
                <strong>DISCOVER</strong>
                <span>
                  Find credentials & consumers
                </span>
              </div>

            </div>


            <div className="workflow-arrow">
              →
            </div>


            <div className="workflow-step">

              <div className="workflow-number">
                02
              </div>

              <div>
                <strong>ROTATE</strong>
                <span>
                  Create controlled replacement
                </span>
              </div>

            </div>


            <div className="workflow-arrow">
              →
            </div>


            <div className="workflow-step">

              <div className="workflow-number">
                03
              </div>

              <div>
                <strong>PROVE</strong>
                <span>
                  Old ✕ / New ✓
                </span>
              </div>

            </div>


            <div className="workflow-arrow">
              →
            </div>


            <div className="workflow-step">

              <div className="workflow-number">
                04
              </div>

              <div>
                <strong>EVIDENCE</strong>
                <span>
                  Hash + timestamp receipt
                </span>
              </div>

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

export default App;