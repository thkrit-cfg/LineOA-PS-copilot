import React, { useState, useEffect } from 'react';
import { CustomerProfile, GroceryProduct, SegmentRule, PushMessageLog } from './types';
import { DataLakeService } from './services/dataLakeService';
import { Header, ActiveTab } from './components/Header';
import { StaffConsole } from './components/StaffConsole';
import { LineAppPreview } from './components/LineAppPreview';
import { SegmentationHub } from './components/SegmentationHub';
import { CrmLineMappingView } from './components/CrmLineMappingView';
import { DataLakeManager } from './components/DataLakeManager';
import { OpsStrategicAuditModal } from './components/OpsStrategicAuditModal';
import { FrontlineOptionComparisonModal } from './components/FrontlineOptionComparisonModal';
import { LiffMobileApp } from './components/LiffMobileApp';
import { StaffInbox } from './components/StaffInbox';
import { AdminPortal } from './admin/AdminPortal';

export default function App() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [products, setProducts] = useState<GroceryProduct[]>([]);
  const [rules, setRules] = useState<SegmentRule[]>([]);
  const [pushLogs, setPushLogs] = useState<PushMessageLog[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('staff_console');
  const [selectedBranch, setSelectedBranch] = useState<string>('All Branches (National)');
  const [showPhonePreview, setShowPhonePreview] = useState<boolean>(true);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [isFrontlineComparisonOpen, setIsFrontlineComparisonOpen] = useState<boolean>(true);

  // Admin portal (HQ) — dedicated /admin route (checked before LIFF mode)
  const isAdminPortal = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

  // Pure-human staff inbox PWA — dedicated /staff route (checked before LIFF mode)
  const isStaffInbox = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('/staff');
  
  // Detect if opened inside LINE LIFF or mobile view
  const [isLiffMode, setIsLiffMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const search = window.location.search.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    const ua = navigator.userAgent.toLowerCase();
    const ref = document.referrer.toLowerCase();
    
    if (search.includes('liff') || search.includes('view=liff') || search.includes('mode=liff') || path.includes('/liff')) {
      return true;
    }
    if (search.includes('liff.state') || search.includes('liffclientid')) {
      return true;
    }
    if (ua.includes('line/') || ua.includes('linesdk') || ref.includes('line.me')) {
      return true;
    }
    if (window.innerWidth <= 640) {
      return true;
    }
    return false;
  });

  // Initialize data lake records
  useEffect(() => {
    DataLakeService.init();
    const loadedCustomers = DataLakeService.getCustomers();
    const loadedProducts = DataLakeService.getProducts();
    const loadedRules = DataLakeService.getSegments();
    const loadedLogs = DataLakeService.getPushLogs();

    setCustomers(loadedCustomers);
    setProducts(loadedProducts);
    setRules(loadedRules);
    setPushLogs(loadedLogs);

    if (loadedCustomers.length > 0) {
      setSelectedCustomerId(loadedCustomers[0].crmCustomerId);
    }
  }, []);

  const refreshAllData = () => {
    const loadedCustomers = DataLakeService.getCustomers();
    const loadedProducts = DataLakeService.getProducts();
    const loadedRules = DataLakeService.getSegments();
    const loadedLogs = DataLakeService.getPushLogs();

    setCustomers(loadedCustomers);
    setProducts(loadedProducts);
    setRules(loadedRules);
    setPushLogs(loadedLogs);
  };

  const handleSelectCustomer = (customer: CustomerProfile) => {
    setSelectedCustomerId(customer.crmCustomerId);
  };

  const handleLinkCustomer = (crmId: string, lineUid: string, name: string) => {
    const updated = DataLakeService.linkLineAccount(crmId, lineUid, name);
    if (updated) {
      refreshAllData();
    }
  };

  const handleUnlinkCustomer = (crmId: string) => {
    const updated = DataLakeService.unlinkLineAccount(crmId);
    if (updated) {
      refreshAllData();
    }
  };

  const handleSendPush = (log: PushMessageLog) => {
    setPushLogs(prev => [log, ...prev]);
  };

  const activeCustomer = customers.find(c => c.crmCustomerId === selectedCustomerId) || customers[0];

  const mappedCount = customers.filter(c => c.lineUid).length;
  const mappingRate = customers.length > 0 ? Math.round((mappedCount / customers.length) * 100) : 0;

  // Admin portal (HQ) — dedicated /admin route, rendered before everything else.
  if (isAdminPortal) {
    return <AdminPortal />;
  }

  // Pure-human staff inbox PWA (dedicated /staff route) — render before the
  // data-lake loading guard so the inbox shows immediately.
  if (isStaffInbox) {
    return <StaffInbox />;
  }

  if (!activeCustomer && customers.length === 0) {
    return (
      <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center text-slate-300">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs">Loading Tops LINE OA Grocery Hub...</p>
        </div>
      </div>
    );
  }

  // Full-Screen Native LIFF Mobile Experience for in-app LINE webviews
  if (isLiffMode) {
    return (
      <LiffMobileApp
        customers={customers}
        products={products}
        onExitToDashboard={() => setIsLiffMode(false)}
        onSendPush={handleSendPush}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans">
      
      {/* Global Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedBranch={selectedBranch}
        setSelectedBranch={setSelectedBranch}
        showPhonePreview={showPhonePreview}
        setShowPhonePreview={setShowPhonePreview}
        onOpenAuditModal={() => setIsAuditModalOpen(true)}
        onOpenFrontlineComparison={() => setIsFrontlineComparisonOpen(true)}
        onOpenLiffView={() => setIsLiffMode(true)}
        mappingRate={mappingRate}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 lg:p-5 flex flex-col lg:flex-row gap-5 overflow-hidden">
        
        {/* Left / Center: Active Operations Manager Module */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeTab === 'staff_console' && activeCustomer && (
            <StaffConsole
              customers={customers}
              selectedCustomer={activeCustomer}
              onSelectCustomer={handleSelectCustomer}
              onSendPush={handleSendPush}
            />
          )}

          {activeTab === 'segmentation' && (
            <SegmentationHub
              customers={customers}
              rules={rules}
              onRulesUpdate={(newRules) => setRules(newRules)}
              onSendPush={handleSendPush}
            />
          )}

          {activeTab === 'mapping' && (
            <CrmLineMappingView
              customers={customers}
              onLink={handleLinkCustomer}
              onUnlink={handleUnlinkCustomer}
            />
          )}

          {activeTab === 'datalake' && (
            <DataLakeManager
              customers={customers}
              products={products}
              onRefreshData={refreshAllData}
            />
          )}
        </div>

        {/* Right: Real-Time LINE Customer Mobile App Simulator */}
        {showPhonePreview && activeCustomer && (
          <div className="shrink-0 flex justify-center">
            <LineAppPreview
              customers={customers}
              activeCustomer={activeCustomer}
              onSelectCustomer={handleSelectCustomer}
              pushLogs={pushLogs}
              onLinkCustomer={handleLinkCustomer}
            />
          </div>
        )}

      </main>

      {/* Ops Strategic Audit ("Grill Me") Modal */}
      <OpsStrategicAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />

      {/* Frontline Staff Mobile UX Architecture Comparison Modal */}
      {activeCustomer && (
        <FrontlineOptionComparisonModal
          isOpen={isFrontlineComparisonOpen}
          onClose={() => setIsFrontlineComparisonOpen(false)}
          customer={activeCustomer}
        />
      )}

    </div>
  );
}
