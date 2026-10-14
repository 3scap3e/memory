"use client";
import { useState } from "react";
import { stageApi } from "./api";
import styles from "./Account.module.css";

type Eligibility = { allowed: boolean; reasons: string[]; memoryLinked: boolean };
export default function DeleteAccount({ onDeleted, onLogout, logoutDisabled }: { onDeleted: () => void; onLogout?: () => void; logoutDisabled?: boolean }) {
  const [expanded,setExpanded] = useState(false);
  const [eligibility,setEligibility] = useState<Eligibility | null>(null);
  const [confirmation,setConfirmation] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const check = async () => {
    setExpanded(true);setBusy(true);setError("");
    try { setEligibility(await stageApi<Eligibility>("/api/account/delete")); }
    catch(error) { setError(error instanceof Error ? error.message : "Unable to check account"); }
    finally { setBusy(false); }
  };
  return <section className={styles.deleteAccount}>
    <div className={styles.accountActions}>
      <button type="button" onClick={() => { if (expanded) setExpanded(false); else void check(); }}>delete account</button>
      {onLogout && <button type="button" disabled={logoutDisabled} onClick={onLogout}>log out</button>}
    </div>
    {expanded && <>
      <p>This deletes the linked account records, saved submissions, booking records and sessions. A matched Memory wallet account is included only when it has no paid or unsettled bid records. This action cannot be undone.</p>
      <p>Blockchain transactions cannot be erased. Active bookings, subscriptions and Memory payment records must be resolved first.</p>
      {busy && <p role="status">Checking account…</p>}
      {error && <p role="alert">{error}</p>}
      {eligibility && <>
        {!eligibility.memoryLinked && <p>No Memory account matched this account’s verified wallet. A separate Memory wallet account is not included in this deletion.</p>}
        {eligibility.reasons.map(reason => <p key={reason}>{reason}</p>)}
        {!eligibility.allowed ? <><a href="https://memory.stagerunner.world" target="_blank" rel="noopener noreferrer">open Memory</a>{" "}<button type="button" onClick={() => void check()}>check again</button></> :
          <form onSubmit={async event => {
            event.preventDefault();setBusy(true);setError("");
            try { await stageApi("/api/account/delete",{confirmation});onDeleted(); }
            catch(error) { setError(error instanceof Error ? error.message : "Account was not deleted"); }
            finally { setBusy(false); }
          }}>
            <label className={styles.field}>Type DELETE to confirm<input value={confirmation} autoComplete="off" onChange={event => setConfirmation(event.target.value)} /></label>
            <button type="submit" disabled={busy || confirmation !== "DELETE"}>permanently delete account</button>
          </form>}
      </>}
    </>}
  </section>;
}
