"use client";

import Image from "next/image";
import AuctionTldr from "./auction-tldr";
import AuctionControls from "./auction-controls";
import { AUCTION_ITEMS } from "@/lib/auction-rules";
import { useState, type CSSProperties } from "react";

const products = [
  { label: "64GB KINGSTON FURY BEAST", image: "/images/64kingston.png", capacity: "2 × 32GB DDR5", condition: "OPEN BOX", imageFraction: 0.64, alt: "64GB Kingston Fury Beast, 2 × 32GB DDR5. Used, open box, tested, very good condition." },
  { label: "128GB CORSAIR DOMINATOR", image: "/images/128corsair.png", capacity: "4 × 32GB DDR5", condition: "OPEN BOX", imageFraction: 0.66, alt: "128GB Corsair Dominator memory and its condition details." },
  { label: "MSI RTX 4090 SUPRIM LIQUID X", image: "/images/4090suprim.png", capacity: "24GB GDDR6X", condition: "UNBOXED", imageFraction: 0.68, alt: "MSI RTX 4090 Suprim Liquid X graphics card and its condition details." },
];

export default function MemoryInterface() {
  const [activeTab, setActiveTab] = useState(0);
  const [featuredProduct, setFeaturedProduct] = useState(0);

  function selectProduct(index: number) {
    setActiveTab(index);
    setFeaturedProduct(index);
  }

  return (
    <main className="memory-page">
      <div className="memory-layout">
        <section className="manifesto" aria-label="Free memory">
          <a className="free-memory-download" href="/pdf/Memory_Wars_FREE-MEMORY.pdf" download aria-label="Download Memory Wars: The First War (PDF)" draggable={false}>
            <Image draggable={false} className="free-memory" src="/images/freememory.png" alt="A glitch-colored Brooklyn street and Blockbuster storefront. Free memory? Not quite. But here's a tip for the next best thing." width={704} height={770} loading="eager" unoptimized />
          </a>
          <p className="manifesto-copy">What we have here is a way to win repeatedly,<br className="desktop-break" /> even if someone else thinks they took it all,<br className="desktop-break" /> and you&apos;ve got nothing left to lose.</p>
          <p className="breadlines">IN THE BREADLINES FOR SCARCE GLOBAL SUPPLY,<br className="desktop-break" /> IT&apos;S A DIFFERENT KIND OF FREE FOR ALL</p>
        </section>

        <section className="auction-column" aria-label="Memory Wars">
          <header className="intro">
            <h1><Image draggable={false} className="memory-logo" src="/images/memorywars.png" alt="Memory Wars" width={472} height={315} loading="eager" unoptimized /></h1>
            <div className="intro-copy">
              <p>Who&apos;s buying tomorrow&apos;s memory<br className="desktop-break" /> before it&apos;s made...</p>
              <p>Who decides what you&apos;ll run<br className="desktop-break" /> and remember tomorrow?</p>
            </div>
          </header>

          <section className="auction-panel" aria-label="Hardware auction preview">
            <div className="product-tabs" aria-label="Choose hardware">
              {products.map((product, index) => (
                <button key={product.label} type="button" className={`product-tab ${activeTab === index ? "is-active" : ""}`} aria-pressed={activeTab === index} onClick={() => selectProduct(index)}>{product.label}</button>
              ))}
            </div>
            <div className="auction-story">
              <p>Software makes someone else rich; now it&apos;s torn apart to feed rich specs to your coding agents.</p>
              <p>Each bid pays for that dev. Another buyer knocks you out of the running?<br className="desktop-break" /> You keep the source of these auctions, the agent specs, too,<br className="desktop-break" /> get your payment back, and a bit extra.</p>
              <AuctionTldr />
            </div>
            <div className="product-preview" aria-live="polite" style={{ "--product-image-width": `${100 / products[featuredProduct].imageFraction}%` } as CSSProperties}>
              <div className="product-artwork">
                <Image draggable={false} src={products[featuredProduct].image} alt={products[featuredProduct].alt} width={1023} height={262} unoptimized />
              </div>
              <div className="mobile-product-details">
                <p>{products[featuredProduct].label}</p>
                <p>{products[featuredProduct].capacity}</p>
                <p>USED<br />{products[featuredProduct].condition}<br />TESTED<br />VERY GOOD CONDITION</p>
              </div>
            </div>
            <AuctionControls productId={AUCTION_ITEMS[featuredProduct].id} title={products[featuredProduct].label} />
          </section>

          <aside className="open-mechanics">
            <p className="destroy-copy">DON&apos;T LIKE THIS INTERFACE? DESTROY IT.</p>
            <p className="open-copy"><a href="https://github.com/3scap3e/memory.git" target="_blank" rel="noopener noreferrer">The mechanics behind these auctions are open. <span className="outward-arrow" aria-hidden="true">↗</span></a></p>
          </aside>
        </section>
      </div>
      <footer>A BURNT EMBER PRODUCTION</footer>
    </main>
  );
}
