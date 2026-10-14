"use client";
import { useEffect, useRef, useState } from "react";
import { stageApi } from "./api";
import DeleteAccount from "./DeleteAccount";
import styles from "./Account.module.css";

type Payment = { id: string; rail: string; mode: string; tierKey: string | null; amountCents: number | null; currency: string; status: string; createdAt: string };
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
type Memory = { linked: boolean; bids: { id: string; title: string; amount: string; status: string; auctionStatus: string; current: boolean; pending: boolean }[] };
export default function AccountActivity({ open, onClose, onDeleted }: { open: boolean; onClose: () => void; onDeleted: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [bookings,setBookings] = useState<Booking[]>([]);
  const [bookingPayments,setBookingPayments] = useState<BookingPayment[]>([]);
  const [memory,setMemory] = useState<Memory>({linked:false,bids:[]});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!open) { dialog.current?.close(); setEntries([]); return; }
    dialog.current?.showModal();
    let active = true;
    setLoading(true);setError("");setEntries([]);
    stageApi<{ activity: Entry[]; bookings: Booking[]; bookingPayments: BookingPayment[]; memory: Memory }>("/api/stage/activity").then(result => { if (active) { setEntries(result.activity);setBookings(result.bookings);setBookingPayments(result.bookingPayments);setMemory(result.memory); } })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : "Unable to load activity"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open,refresh]);
  const activeSubscriptions = entries.flatMap(entry => entry.checkouts.filter(payment => payment.mode.toLowerCase() === "subscription" && payment.status === "ACTIVE").map(payment => ({ entry,payment })));
  return <dialog ref={dialog} className={`${styles.modal} ${styles.activityModal}`} aria-labelledby="account-activity-title" onClose={onClose} onCancel={onClose}>
    <button type="button" className={styles.close} aria-label="Close activity" onClick={onClose}>×</button>
    <h2 id="account-activity-title">Your activity</h2>
    <button type="button" disabled={loading} onClick={() => setRefresh(value => value+1)}>refresh history</button>
    {loading ? <p role="status">Loading activity…</p> : error ? <p role="alert">{error}</p> : <>
      <h3>Active subscriptions</h3>
      {activeSubscriptions.length === 0 ? <p>No active subscriptions recorded.</p> : activeSubscriptions.map(({entry,payment}) => <p key={payment.id}>{entry.product} / {payment.tierKey ?? "subscription"} / {payment.status}</p>)}
      {activeSubscriptions.length > 0 && <p>Subscription cancellation is not connected yet.</p>}
      <h3>Submissions and payment history</h3>
      {!entries.length && <p>No activity yet. Saved DEV, RUN and Parley submissions will appear here.</p>}
      {entries.map(entry => <details className={styles.activityEntry} key={entry.id}>
        <summary>{entry.product} / {entry.status} / {new Date(entry.createdAt).toLocaleDateString("en-US")}</summary>
        <p>{entry.description}</p><Details input={entry.input} />
        {!entry.checkouts.length && <p>No payment recorded for this submission.</p>}
        {entry.checkouts.map(payment => <div className={styles.activityPayment} key={payment.id}>
          <p>{payment.amountCents !== null ? new Intl.NumberFormat("en-US",{style:"currency",currency:payment.currency}).format(payment.amountCents/100) : "Amount not set"} / {payment.mode.toLowerCase() === "subscription" ? "recurring" : "one-time"} / {payment.rail === "stripe" ? "card" : payment.rail === "crypto" ? "coin" : payment.rail} / {payment.status}</p>
          {payment.tierKey && <p>Recorded level: {payment.tierKey}</p>}
        </div>)}
      </details>)}
      <h3>Devrel / bookings and payments</h3>
      {!bookings.length && !bookingPayments.length && <p>No Devrel activity recorded.</p>}
      {bookings.map(booking => <details className={styles.activityEntry} key={booking.id}><summary>{booking.status} / booking</summary><p>{booking.sentenceText}</p><p>${((booking.agreedAmountCents ?? booking.offeredAmountCents)/100).toFixed(2)}</p>{booking.links.map(link => <p key={link}>{link}</p>)}</details>)}
      {bookingPayments.map(payment => <p key={payment.id}>${(payment.amountCents/100).toFixed(2)} / {payment.rail === "stripe" ? "card" : "coin"} / {payment.status}</p>)}
      <h3>Memory / bids</h3>
      {!memory.linked ? <p>No Memory account matched this account’s verified wallet.</p> : !memory.bids.length ? <p>No Memory bids recorded.</p> : memory.bids.map(bid => <details className={styles.activityEntry} key={bid.id}><summary>{bid.title} / {bid.status}</summary><p>{(BigInt(bid.amount)/1000000n).toString()}.{(BigInt(bid.amount)%1000000n).toString().padStart(6,"0")} USDC / auction {bid.auctionStatus}{bid.current ? " / current bid" : ""}{bid.pending ? " / pending bid" : ""}</p><a href="https://memory.stagerunner.world" target="_blank" rel="noopener noreferrer">manage on Memory</a></details>)}
      <p className={styles.paymentNote}>Draft submissions and pending checkouts do not grant a subscriber level. Monthly contribution inputs on DEV do not start recurring billing yet.</p>
      <DeleteAccount onDeleted={onDeleted} />
    </>}
  </dialog>;
}
