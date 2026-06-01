import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [hide, setHide] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHide(true), 3000);
    const t2 = setTimeout(() => setGone(true), 3850);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (gone) return null;

  return (
    <div className={hide ? "talos-splash talos-splash-hide" : "talos-splash"}>
      <div className="talos-splash-aurora" />
      <div className="talos-splash-grid" />
      <div className="talos-splash-inner">
        <div className="talos-splash-orb" />
        <div className="talos-splash-logo">TALOS</div>
        <div className="talos-splash-sub">AUTONOMOUS DEFI AGENT // MANTLE NETWORK</div>
        <div className="talos-splash-boot">
          <div className="talos-boot-line tb1">&gt; BOOTING TALOS CORE...</div>
          <div className="talos-boot-line tb2">&gt; CONNECTING TO MANTLE SEPOLIA...</div>
          <div className="talos-boot-line tb3">&gt; LOADING MULTI-AGENT SWARM...</div>
          <div className="talos-boot-line tb4">&gt; ERC-8004 IDENTITY VERIFIED</div>
        </div>
        <div className="talos-splash-bar"><span /></div>
      </div>
    </div>
  );
}
