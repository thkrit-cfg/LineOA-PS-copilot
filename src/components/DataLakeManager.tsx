import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  RefreshCw, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Table, 
  ShieldCheck,
  TrendingUp,
  Search,
  FileCode,
  Layers
} from 'lucide-react';
import { CustomerProfile, GroceryProduct } from '../types';
import { DataLakeService } from '../services/dataLakeService';

interface DataLakeManagerProps {
  customers: CustomerProfile[];
  products: GroceryProduct[];
  onRefreshData: () => void;
}

export const DataLakeManager: React.FC<DataLakeManagerProps> = ({
  customers,
  products,
  onRefreshData,
}) => {
  const [activeTable, setActiveTable] = useState<'CUSTOMERS' | 'LINE_MAPPING' | 'TRANSACTIONS' | 'CATALOG'>('CUSTOMERS');
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const metrics = DataLakeService.getMetrics();

  const handleExportExcel = () => {
    DataLakeService.exportDataLakeToExcel();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportStatus(null);

    const res = await DataLakeService.importDataLakeFromExcel(file);
    setIsProcessing(false);
    setImportStatus(res);
    onRefreshData();

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleResetData = () => {
    if (window.confirm('Reset Data Lake POC back to default Thai grocery demo records?')) {
      DataLakeService.resetToDefault();
      onRefreshData();
      setImportStatus({ success: true, message: 'Data Lake POC reset to initial benchmark records.' });
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[750px] pr-1">
      
      {/* Top Banner: Excel Data Lake POC Controls */}
      <div className="bg-[#141b26] border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-extrabold text-white">
              Excel Data Lake POC & Schema Workbench
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Stage 1 Proof-of-Concept with spreadsheet tables before transitioning to enterprise BigQuery / Snowflake datalake.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          <button
            id="btn-upload-excel"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>{isProcessing ? 'Ingesting Excel...' : 'Import Excel / CSV'}</span>
          </button>

          <button
            id="btn-export-excel"
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .xlsx Data Lake</span>
          </button>

          <button
            id="btn-reset-datalake"
            onClick={handleResetData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs border border-slate-700 transition-all cursor-pointer"
            title="Reset Data Lake to Default Tops Dataset"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Upload notification */}
      {importStatus && (
        <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
          importStatus.success
            ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
            : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
        }`}>
          {importStatus.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{importStatus.message}</span>
        </div>
      )}

      {/* Data Lake Operational Health & Governance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#141b26] border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">CRM Master Records</span>
          <div className="text-xl font-bold text-white mt-1">
            {metrics.totalCustomers} <span className="text-xs font-normal text-slate-400">Profiles</span>
          </div>
          <span className="text-[10px] text-slate-400">{metrics.totalTransactions} POS & App Orders</span>
        </div>

        <div className="bg-[#141b26] border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">LINE UID Mapping Rate</span>
          <div className="text-xl font-bold text-[#06c755] mt-1">
            {metrics.mappingRatePct}%
          </div>
          <span className="text-[10px] text-slate-400">{metrics.mappedLineCount} of {metrics.totalCustomers} mapped</span>
        </div>

        <div className="bg-[#141b26] border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">PDPA Consent Authorization</span>
          <div className="text-xl font-bold text-blue-400 mt-1">
            {metrics.pdpaRatePct}%
          </div>
          <span className="text-[10px] text-slate-400">{metrics.pdpaConsentedCount} Authorized for marketing</span>
        </div>

        <div className="bg-[#141b26] border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Catalog SKUs Ingested</span>
          <div className="text-xl font-bold text-amber-400 mt-1">
            {metrics.catalogProductCount} <span className="text-xs font-normal text-slate-400">Items</span>
          </div>
          <span className="text-[10px] text-slate-400">6 Supermarket Categories</span>
        </div>
      </div>

      {/* Schema & Table Inspector */}
      <div className="bg-[#141b26] border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
        
        {/* Table Selector Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-1.5 bg-[#0b0f17] p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTable('CUSTOMERS')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTable === 'CUSTOMERS' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CRM_Customers ({customers.length})
            </button>
            <button
              onClick={() => setActiveTable('LINE_MAPPING')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTable === 'LINE_MAPPING' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              LINE_UID_Mapping
            </button>
            <button
              onClick={() => setActiveTable('TRANSACTIONS')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTable === 'TRANSACTIONS' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              POS_LINE_Transactions
            </button>
            <button
              onClick={() => setActiveTable('CATALOG')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTable === 'CATALOG' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Grocery_Catalog ({products.length})
            </button>
            <button
              id="tab-backend-api-status"
              onClick={() => setActiveTable('BACKEND_STATUS' as any)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                (activeTable as any) === 'BACKEND_STATUS' ? 'bg-purple-600 text-white' : 'text-purple-300 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Backend API & Webhook Endpoints</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search table rows..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="bg-[#0b0f17] border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Table Rendering */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          
          {/* 1. CUSTOMERS TABLE */}
          {activeTable === 'CUSTOMERS' && (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#101622] text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">CRM ID</th>
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">LINE UID</th>
                  <th className="p-3">Tier</th>
                  <th className="p-3">Branch</th>
                  <th className="p-3">Total Spend</th>
                  <th className="p-3">AOV</th>
                  <th className="p-3">RFM Segment</th>
                  <th className="p-3">PDPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-[#161f2d]">
                {customers
                  .filter(c => !tableSearch || c.fullName.toLowerCase().includes(tableSearch.toLowerCase()) || c.phone.includes(tableSearch))
                  .map(c => (
                    <tr key={c.crmCustomerId} className="hover:bg-[#1c2738]">
                      <td className="p-3 font-mono font-bold text-emerald-400">{c.crmCustomerId}</td>
                      <td className="p-3 font-semibold text-white">{c.fullName}</td>
                      <td className="p-3 font-mono text-slate-300">{c.phone}</td>
                      <td className="p-3 font-mono text-[11px]">
                        {c.lineUid ? (
                          <span className="text-[#06c755]">{c.lineUid.slice(0, 14)}...</span>
                        ) : (
                          <span className="text-amber-400">UNMAPPED</span>
                        )}
                      </td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] bg-slate-800">{c.tier}</span></td>
                      <td className="p-3 text-slate-400 text-[11px] truncate max-w-[150px]">{c.preferredBranch}</td>
                      <td className="p-3 font-bold text-white font-mono">฿{c.totalSpendLtv.toLocaleString()}</td>
                      <td className="p-3 font-mono text-emerald-400">฿{c.aov}</td>
                      <td className="p-3 text-slate-300">{c.rfmSegment}</td>
                      <td className="p-3">
                        {c.pdpaConsent ? (
                          <span className="text-emerald-400 font-semibold">YES</span>
                        ) : (
                          <span className="text-slate-500">NO</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          {/* 2. LINE MAPPING TABLE */}
          {activeTable === 'LINE_MAPPING' && (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#101622] text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">LINE UID</th>
                  <th className="p-3">LINE Display Name</th>
                  <th className="p-3">CRM Customer ID</th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Verified Mobile Phone</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Authorization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-[#161f2d]">
                {customers.map(c => (
                  <tr key={c.crmCustomerId} className="hover:bg-[#1c2738]">
                    <td className="p-3 font-mono font-bold text-emerald-400">
                      {c.lineUid || 'PENDING_OPT_IN'}
                    </td>
                    <td className="p-3 text-white">{c.lineDisplayName || 'N/A'}</td>
                    <td className="p-3 font-mono text-slate-300">{c.crmCustomerId}</td>
                    <td className="p-3 font-semibold text-white">{c.fullName}</td>
                    <td className="p-3 font-mono text-amber-300">{c.phone}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.lineUid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {c.lineUid ? 'BOUND_ACTIVE' : 'UNMAPPED'}
                      </span>
                    </td>
                    <td className="p-3">
                      {c.pdpaConsent ? 'PDPA_AUTHORIZED' : 'PENDING'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 3. TRANSACTIONS TABLE */}
          {activeTable === 'TRANSACTIONS' && (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#101622] text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Channel</th>
                  <th className="p-3">Branch</th>
                  <th className="p-3">Items Purchased</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-[#161f2d]">
                {customers.flatMap(c => c.transactions.map(t => (
                  <tr key={t.orderId} className="hover:bg-[#1c2738]">
                    <td className="p-3 font-mono font-bold text-blue-400">{t.orderId}</td>
                    <td className="p-3 font-semibold text-white">{c.fullName}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        t.channel === 'LINE_OA' ? 'bg-[#06c755]/20 text-[#06c755]' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {t.channel}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 text-[11px]">{t.branch}</td>
                    <td className="p-3 text-slate-300">
                      {t.items.map(i => `${i.nameEn} (x${i.quantity})`).join(', ')}
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-400">฿{t.totalAmount}</td>
                    <td className="p-3 text-slate-400">{t.paymentMethod}</td>
                    <td className="p-3 text-slate-400 text-[11px]">{t.date}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          )}

          {/* 4. CATALOG TABLE */}
          {activeTable === 'CATALOG' && (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#101622] text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Product Name (EN / TH)</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Retail Price</th>
                  <th className="p-3">Unit</th>
                  <th className="p-3">Stock Status</th>
                  <th className="p-3">Promo Tag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-[#161f2d]">
                {products.map(p => (
                  <tr key={p.sku} className="hover:bg-[#1c2738]">
                    <td className="p-3 font-mono font-bold text-amber-400">{p.sku}</td>
                    <td className="p-3">
                      <div className="font-semibold text-white">{p.nameEn}</div>
                      <span className="text-[10px] text-slate-400">{p.nameTh}</span>
                    </td>
                    <td className="p-3 text-slate-300">{p.category}</td>
                    <td className="p-3 font-mono font-bold text-emerald-400">฿{p.price}</td>
                    <td className="p-3 text-slate-400">{p.unit}</td>
                    <td className="p-3">
                      <span className="text-emerald-400 font-semibold">IN STOCK</span>
                    </td>
                    <td className="p-3">
                      {p.promoTag ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {p.promoTag}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 5. BACKEND API & WEBHOOK STATUS */}
          {(activeTable as any) === 'BACKEND_STATUS' && (
            <div className="p-4 bg-[#111723] text-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Express Backend Server · Port 3000</span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Production-ready endpoints for Central Retail & LINE Official Account integration.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[11px] border border-emerald-500/30">
                  HTTP REST + LINE HMAC-SHA256
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-[#182232] p-3 rounded-xl border border-slate-700/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-emerald-400 font-bold">POST /api/line/webhook</span>
                    <span className="text-[10px] bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded border border-purple-800 font-mono">
                      LINE Developers
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    Receives live 1-on-1 customer & staff chats. Automatically parses <code className="text-amber-300 bg-black/40 px-1 rounded">/crm profile</code> and returns rich Flex Message whisper cards.
                  </p>
                  <div className="text-[10px] font-mono text-slate-400 bg-black/40 p-2 rounded-lg">
                    Header: x-line-signature (HMAC-SHA256 verified)
                  </div>
                </div>

                <div className="bg-[#182232] p-3 rounded-xl border border-slate-700/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-blue-400 font-bold">POST /api/line/push</span>
                    <span className="text-[10px] bg-blue-950 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800 font-mono">
                      Messaging API
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    Dispatches personalized Flex vouchers and product offers directly to customer LINE accounts or falls back to live simulator audit log.
                  </p>
                  <div className="text-[10px] font-mono text-slate-400 bg-black/40 p-2 rounded-lg">
                    Auth: Bearer LINE_CHANNEL_ACCESS_TOKEN
                  </div>
                </div>

                <div className="bg-[#182232] p-3 rounded-xl border border-slate-700/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-emerald-400 font-bold">GET /api/customers</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800 font-mono">
                      CRM Data Lake
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    Returns all customer records, RFM scores, The 1 card numbers, branch preferences, and dietary affinities.
                  </p>
                </div>

                <div className="bg-[#182232] p-3 rounded-xl border border-slate-700/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-purple-400 font-bold">POST /api/customers/map-line</span>
                    <span className="text-[10px] bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded border border-purple-800 font-mono">
                      Identity Linker
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    Links a LINE UID to a CRM customer ID upon LIFF card opening or The 1 verification.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
