/**
 * Home page. Manages tab state and coordinates data flow between Configure,
 * Audit, and Monitor screens.
 *
 * @module @veil/dashboard/app/page
 */
"use client";

import { useState, useCallback } from "react";
import { Tabs, type TabId } from "@/components/tabs";
import { Configure } from "@/components/configure";
import { Monitor } from "@/components/monitor";
import { Footer } from "@/components/footer";

function getInitialTab(): TabId {
  if (typeof window === "undefined") return "configure";
  const params = new URLSearchParams(window.location.search);
  if (params.has("intent") || params.get("tab") === "monitor") return "monitor";
  if (params.get("tab") === "configure") return "configure";
  return "configure";
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);

  const handleDeploySuccess = useCallback(
    () => setActiveTab("monitor"),
    [],
  );

  const handleNavigateConfigure = useCallback(() => {
    setActiveTab("configure");
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Tabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasDeployed={true}
      />

      <main className="flex-1">
        {activeTab === "configure" && (
          <Configure onSuccess={handleDeploySuccess} />
        )}
        {activeTab === "monitor" && (
          <Monitor onNavigateConfigure={handleNavigateConfigure} />
        )}
      </main>

      <Footer />
    </div>
  );
}
