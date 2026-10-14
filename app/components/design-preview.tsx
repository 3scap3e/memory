"use client";
import { useMemo,useState } from "react";
import { PREVIEW_STATES,previewFixture,type PreviewState } from "@/lib/preview-fixtures";
import { WalletProvider } from "./wallet-context";
import WalletDock from "./wallet-dock";
import MemoryInterface from "./memory-interface";
export default function DesignPreview(){const[state,setState]=useState<PreviewState>("current");const fixture=useMemo(()=>previewFixture(state),[state]);return <><aside className="design-preview-bar"><p>DESIGN PREVIEW · FAKE ACCOUNTS · NO PAYMENTS</p><label>WALLET STATE<select value={state} onChange={e=>setState(e.target.value as PreviewState)}>{PREVIEW_STATES.map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}</select></label><p>Choose a state, then open ACCOUNT / ACTIVITY → MEMORY or the auction’s $ button.</p><a href="/">BACK TO AUCTIONS</a></aside><WalletProvider fixture={fixture}><WalletDock/><MemoryInterface/></WalletProvider></>;}
