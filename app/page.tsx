import MemoryInterface from "./components/memory-interface";
import WalletDock from "./components/wallet-dock";
import { WalletProvider } from "./components/wallet-context";
export default function Home(){return <WalletProvider><WalletDock /><MemoryInterface /></WalletProvider>;}
