import { notFound } from "next/navigation";
import { Suspense } from "react";
import DesignPreview from "../components/design-preview";
export default function Preview(){if(process.env.NODE_ENV!=="development"&&process.env.DESIGN_PREVIEW_ENABLED!=="true")notFound();return <Suspense fallback={<p>LOADING WALLET PREVIEW…</p>}><DesignPreview/></Suspense>;}
