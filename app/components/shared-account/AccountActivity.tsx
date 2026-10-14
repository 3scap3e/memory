"use client";
import { useEffect, useRef, useState } from "react";
import { stageApi } from "./api";
import MemoryActivity from "./MemoryActivity";
import { useWallet } from "../wallet-context";
import DeleteAccount from "./DeleteAccount";
import styles from "./Account.module.css";

type Payment = { stripePayments?:{providerId:string;amountCents:number;refundedCents:number;paidAt:string;invoiceUrl:string|null}[]; id: string; rail: string; mode: string; tierKey: string | null; amountCents: number | null; currency: string; status: string; createdAt: string };
type Entry = { id: string; product: string; description: string; status: string; createdAt: string; input: Record<string, unknown>; checkouts: Payment[] };
const text = (value: unknown) => typeof value === "string" ? value : "";
function Details({ input }: { input: Record<string, unknown> }) {
  const fields: [string,string][] = [];
  for (const key of ["url", "notes", "target", "tierKey"]) if (text(input[key])) fields.push([key,text(input[key])]);
  if (input.parley && typeof input.parley === "object") {
    const parley = input.parley as Record<string, unknown>;
    for (const key of ["intent","request","details","teammates","location","date"]) if (text(parley[key])) fields.push([key,text(parley[key])]);
  }
  return <dl className={styles.activityFields}>{fields.map(([key,value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>;
}
type Booking = { id: string; sentenceText: string; status: string; offeredAmountCents: number; agreedAmountCents: number | null; links: string[] };
type BookingPayment = { id: string; amountCents: number; rail: string; status: string };
export default function AccountActivity({ open, onClose, onDeleted, onLogout, logoutDisabled }: { open: boolean; onClose: () => void; onDeleted: () => void; onLogout?: () => void; logoutDisabled?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [bookings,setBookings] = useState<Booking[]>([]);
  const [bookingPayments,setBookingPayments] = useState<BookingPayment[]>([]);
  const { readOnly, refresh: refreshWallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!open) { dialog.current?.close(); setEntries([]); return; }
    dialog.current?.showModal();
    if(readOnly)return;
    void refreshWallet().catch(()=>{});
    let active = true;
    setLoading(true);setError("");setEntries([]);
    stageApi<{ activity: Entry[]; bookings: Booking[]; bookingPayments: BookingPayment[] }>("/api/stage/activity").then(result => { if (active) { setEntries(result.activity);setBookings(result.bookings);setBookingPayments(result.bookingPayments); } })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : "Unable to load activity"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open,refresh,readOnly,refreshWallet]);
  const activeSubscriptions = entries.flatMap(entry => entry.checkouts.filter(payment => payment.mode.toLowerCase() === "subscription" && payment.status === "ACTIVE").map(payment => ({ entry,payment })));
  return <dialog ref={dialog} className={styles.modal} aria-labelledby="account-activity-title" onClose={onClose} onCancel={onClose}>
    <button type="button" className={styles.close} aria-label="Close activity" onClick={onClose}>×</button>
    <h2 id="account-activity-title">ACCOUNT / ACTIVITY</h2>
    <button type="button" disabled={loading} onClick={() => setRefresh(value => value+1)}>REFRESH HISTORY</button>
    <MemoryActivity />
    {loading ? <p role="status">Loading activity…</p> : error ? <p role="alert">{error}</p> : <>
      <details className={styles.activitySection}>
        <summary>PARLEY · SUBSCRIPTIONS &amp; PAYMENTS</summary>
        <details className={styles.activityEntry}>
          <summary>ACTIVE SUBSCRIPTIONS</summary>
          {activeSubscriptions.length === 0 ? <p>No active subscriptions recorded.</p> : activeSubscriptions.map(({entry,payment}) => <p key={payment.id}>{entry.product} / {payment.tierKey ?? "subscription"} / {payment.status}</p>)}
          {activeSubscriptions.length > 0 && <p>Manage or cancel subscriptions on Parley.</p>}
        </details>
        <details className={styles.activityEntry}>
          <summary>SUBMISSIONS &amp; PAYMENT HISTORY</summary>
          {!entries.length && <p>No Parley activity recorded.</p>}
          {entries.map(entry => <details className={styles.activityEntry} key={entry.id}>
            <summary>{entry.product} / {entry.status} / {new Date(entry.createdAt).toLocaleDateString("en-US")}</summary>
            <p>{entry.description}</p><Details input={entry.input} />
            {!entry.checkouts.length && <p>No payment recorded for this submission.</p>}
            {entry.checkouts.map(payment => <details className={styles.activityPayment} key={payment.id}>
              <summary>{payment.amountCents !== null ? new Intl.NumberFormat("en-US",{style:"currency",currency:payment.currency}).format(payment.amountCents/100) : "Amount not set"} / {payment.status}</summary>
              <p>{payment.mode.toLowerCase() === "subscription" ? "recurring" : "one-time"} / {payment.rail === "stripe" ? "card" : payment.rail === "crypto" ? "coin" : payment.rail}</p>
              {payment.stripePayments?.map(receipt=><p key={receipt.providerId}>${(receipt.amountCents/100).toFixed(2)} / {receipt.providerId}{receipt.refundedCents?` / refunded $${(receipt.refundedCents/100).toFixed(2)}`:""}</p>)}
          {payment.tierKey && <p>Recorded level: {payment.tierKey}</p>}
            </details>)}
          </details>)}
          <p className={styles.paymentNote}>Draft submissions and pending checkouts do not grant a subscriber level. Confirmed wallet subscriptions can be managed on Parley.</p>
        </details>
      </details>
      <details className={styles.activitySection}>
        <summary>DEVREL · BOOKINGS &amp; PAYMENTS</summary>
        <details className={styles.activityEntry}><summary>BOOKINGS</summary>
          {!bookings.length && <p>No DevRel bookings recorded.</p>}
          {bookings.map(booking => <details className={styles.activityEntry} key={booking.id}><summary>{booking.status} / booking</summary><p>{booking.sentenceText}</p><p>${((booking.agreedAmountCents ?? booking.offeredAmountCents)/100).toFixed(2)}</p>{booking.links.map(link => <p key={link}>{link}</p>)}</details>)}
        </details>
        <details className={styles.activityEntry}><summary>PAYMENTS</summary>
          {!bookingPayments.length && <p>No DevRel payments recorded.</p>}
          {bookingPayments.map(payment => <details className={styles.activityPayment} key={payment.id}><summary>${(payment.amountCents/100).toFixed(2)} / {payment.status}</summary><p>{payment.rail === "stripe" ? "card" : "coin"}</p></details>)}
        </details>
      </details>
    </>}
      <details className={styles.activitySection}><summary>ACCOUNT SETTINGS</summary><DeleteAccount onDeleted={onDeleted} onLogout={onLogout} logoutDisabled={logoutDisabled} /></details>
  </dialog>;
}
