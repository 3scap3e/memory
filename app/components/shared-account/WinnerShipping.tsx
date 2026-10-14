"use client";
import { useCallback,useEffect,useRef,useState } from "react";
import { api } from "@/lib/client/wallet";
import { useWallet } from "../wallet-context";
import type { ShippingAddress } from "@/lib/shipping-rules";
import { shippingLabel,type Shipment } from "@/lib/shipping-types";
import styles from "./Account.styles";
const empty:ShippingAddress={name:"",line1:"",line2:"",city:"",region:"",postalCode:"",country:"",phone:"",email:""};
const fields:[keyof ShippingAddress,string,string][]=[["name","FULL NAME","name"],["line1","STREET ADDRESS","address-line1"],["line2","APARTMENT / UNIT (OPTIONAL)","address-line2"],["city","CITY","address-level2"],["region","STATE / REGION","address-level1"],["postalCode","POSTAL CODE","postal-code"],["country","COUNTRY CODE (US, GB…)","country"],["phone","PHONE (OPTIONAL)","tel"],["email","CONTACT EMAIL (OPTIONAL)","email"]];
export default function WinnerShipping({auctionId,title,compact=false}:{auctionId:string;title:string;compact?:boolean}){
 const {readOnly}=useWallet();const dialog=useRef<HTMLDialogElement>(null);
 const [shipment,setShipment]=useState<Shipment|null>(null);const [address,setAddress]=useState<ShippingAddress>(empty);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 const load=useCallback(async()=>{if(readOnly)return;const data=await api<{shipment:Shipment|null}>(`/api/auctions/${auctionId}/shipping`,undefined,"GET");setShipment(data.shipment);},[auctionId,readOnly]);
 useEffect(()=>{let active=true;const update=()=>load().catch(()=>{if(active)setError("Couldn’t load delivery details. Please try again.");});void update();const timer=setInterval(update,10000);return()=>{active=false;clearInterval(timer);};},[load]);
 const locked=!!shipment?.trackingNumber||["shipped","delivered"].includes(shipment?.status||"");
 async function save(event:React.FormEvent){event.preventDefault();if(readOnly)return;setBusy(true);setError("");try{const data=await api<{shipment:Shipment}>(`/api/auctions/${auctionId}/shipping`,{address},"PUT");setShipment(data.shipment);dialog.current?.close();}catch(e){setError(e instanceof Error?e.message:"Couldn’t save delivery details.");}finally{setBusy(false);}}
 return <div className={compact ? "winner-delivery-compact" : styles.activityEntry}>{!compact&&<p>{title}</p>}
 <button type="button" onClick={()=>{setAddress(shipment?.address||empty);setError("");dialog.current?.showModal();}}>{locked?"VIEW DELIVERY DETAILS":shipment?"EDIT DELIVERY DETAILS":"ADD DELIVERY DETAILS"}</button>
 {!compact&&shipment&&<><p className="bid-state won">{shippingLabel(shipment.status)}</p><p>{shipment.address.name}<br/>{shipment.address.line1}{shipment.address.line2&&<><br/>{shipment.address.line2}</>}<br/>{shipment.address.city}, {shipment.address.region} {shipment.address.postalCode}<br/>{shipment.address.country}</p>{shipment.trackingNumber&&<p>CARRIER: {shipment.carrier}<br/>TRACKING: {shipment.trackingNumber}</p>}<details className={styles.activityEntry} open><summary>SHIPPING UPDATES</summary>{shipment.updates.map((update,index)=><p key={index}><time dateTime={update.date}>{new Date(update.date).toLocaleString("en-US")}</time><br/>{shippingLabel(update.status)}{update.note&&<><br/>{update.note}</>}</p>)}</details></>}
 {error&&!dialog.current?.open&&<p role="alert">{error}</p>}
 <dialog ref={dialog} className={styles.modal} aria-label={`Delivery details for ${title}`}><button type="button" className={styles.close} disabled={busy} aria-label="Close delivery details" onClick={()=>dialog.current?.close()}>×</button><h2>DELIVERY DETAILS</h2><p>{title}</p><form onSubmit={save}><div className={styles.addressGrid}>{fields.map(([key,label,autoComplete])=><label className={styles.field} key={key}>{label}<input type={key==="email"?"email":key==="phone"?"tel":"text"} autoComplete={autoComplete} maxLength={key==="country"?2:200} required={["name","line1","city","country"].includes(key)} value={address[key]} disabled={busy||readOnly||locked} onChange={e=>setAddress(previous=>({...previous,[key]:e.target.value}))}/></label>)}</div>{!locked&&<button type="submit" disabled={busy||readOnly}>{busy?"SAVING…":"SAVE DELIVERY DETAILS"}</button>}{error&&<p role="alert">{error}</p>}</form></dialog>
 </div>;
}
