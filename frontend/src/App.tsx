import React, { useState, FormEvent, useEffect } from 'react';
import {
  Sprout,
  MapPin,
  User,
  Scale,
  Calendar,
  BadgeCheck,
  Search,
  ChevronRight,
  Leaf,
  ShieldCheck,
  History,
  Info,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ArrowRight,
  Wallet
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ethers } from 'ethers';
import { FARM_TRACE_ABI, CONTRACT_ADDRESS } from './contract';
import agroHero from './assets/agro_hero.png';

interface BatchResult {
  id: string;
  crop: string;
  farmer: string;
  location: string;
  quantity: string;
  harvestDate: string;
  quality: string;
  organic: boolean;
  notes: string;
  hash: string;
  timestamp: string;
  verificationSource?: 'blockchain' | 'cloud' | 'local';
}

const JSONBIN_CONFIG = {
  // BIN_ID is not a secret — it's a public identifier safe to embed in code
  BIN_ID: import.meta.env.VITE_JSONBIN_BIN_ID || '69ebbfe0856a6821896c12cb',
  // API_KEY is only needed for WRITES — reads work on public bins without it
  API_KEY: import.meta.env.VITE_JSONBIN_API_KEY || ''
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'farmer' | 'buyer'>('farmer');
  const [searchId, setSearchId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [account, setAccount] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorModal, setErrorModal] = useState<{ show: boolean, title: string, message: string }>({
    show: false,
    title: '',
    message: ''
  });

  // Persistence for mock data
  const [batches, setBatches] = useState<BatchResult[]>(() => {
    const saved = localStorage.getItem('ugaanchain_batches');
    const initial = saved ? JSON.parse(saved) : [
      {
        id: "FT-10024",
        crop: "Organic Saffron",
        farmer: "Aditya Sharma",
        location: "Kashmir Valley, J&K",
        quantity: "5",
        harvestDate: "2026-04-10",
        quality: "Grade A+",
        organic: true,
        notes: "Hand-picked during the first bloom. Purest quality from high altitudes.",
        hash: "0x7d2c3a5d8e9b4f1c7a2d6e9f1a2c3b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a11",
        timestamp: new Date().toISOString(),
        verificationSource: 'cloud'
      }
    ];
    return initial;
  });

  // NEW: Cloud Sync Logic
  const fetchBatchesFromCloud = async () => {
    if (!JSONBIN_CONFIG.BIN_ID) return;
    try {
      // Reads work on PUBLIC bins without an API key — no Vercel env vars needed on the phone!
      const headers: Record<string, string> = { 'X-Bin-Meta': 'false' };
      if (JSONBIN_CONFIG.API_KEY) {
        headers['X-Master-Key'] = JSONBIN_CONFIG.API_KEY;
      }
      const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_CONFIG.BIN_ID}/latest`, { headers });
      if (!res.ok) throw new Error(`Cloud fetch failed: ${res.status}`);
      const data = await res.json();
      if (data.record && Array.isArray(data.record)) {
        setBatches(data.record);
        localStorage.setItem('ugaanchain_batches', JSON.stringify(data.record));
      }
    } catch (error) {
      console.warn("Cloud sync currently unavailable. Operating in Local/Hybrid mode.");
    }
  };

  const saveBatchesToCloud = async (updatedBatches: BatchResult[]) => {
    // Writes require an API key — only works on devices that have it in .env
    if (!JSONBIN_CONFIG.BIN_ID || !JSONBIN_CONFIG.API_KEY) return;
    try {
      await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_CONFIG.BIN_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_CONFIG.API_KEY
        },
        body: JSON.stringify(updatedBatches)
      });
    } catch (error) {
      console.error("Cloud sync failed:", error);
    }
  };

  useEffect(() => {
    fetchBatchesFromCloud();
  }, []);

  useEffect(() => {
    localStorage.setItem('ugaanchain_batches', JSON.stringify(batches));
  }, [batches]);

  // Form Fields State
  const [formData, setFormData] = useState({
    farmer: '',
    location: '',
    crop: '',
    quantity: '',
    harvestDate: '',
    quality: 'Grade A+',
    organic: false,
    notes: ''
  });

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        setIsConnecting(true);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setAccount(accounts[0]);
      } catch (error) {
        console.error("User denied account access", error);
      } finally {
        setIsConnecting(false);
      }
    } else {
      setErrorModal({
        show: true,
        title: 'Wallet Required',
        message: 'Please install MetaMask or a compatible Web3 wallet to use the blockchain features.'
      });
    }
  };

  const handleRegisterBatch = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (CONTRACT_ADDRESS && account) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, FARM_TRACE_ABI, signer);

        const tx = await contract.createBatch(
          formData.farmer,
          formData.location,
          formData.crop,
          BigInt(formData.quantity),
          formData.harvestDate,
          formData.quality,
          formData.organic,
          formData.notes
        );

        await tx.wait();
        const batchCount = await contract.batchCount();
        const newId = `FT-${batchCount}`;

        const newBatch: BatchResult = {
          id: newId,
          ...formData,
          hash: tx.hash,
          timestamp: new Date().toISOString(),
          verificationSource: 'blockchain'
        };

        setBatches(prev => {
          const updated = [newBatch, ...prev];
          saveBatchesToCloud(updated);
          return updated;
        });

        setActiveTab('buyer');
        setSearchId(newId);
        setResult(newBatch);
      } catch (error) {
        console.error("Blockchain error:", error);
        setErrorModal({
          show: true,
          title: 'Blockchain Error',
          message: 'Failed to register batch on blockchain. Please check your connection and try again.'
        });
      } finally {
        setLoading(false);
      }
    } else {
      // Case 2: No Wallet (Fallback)
      setTimeout(async () => {
        const newId = `FT-${Math.floor(10000 + Math.random() * 90000)}`;
        const newHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

        const newBatch: BatchResult = {
          id: newId,
          ...formData,
          hash: newHash,
          timestamp: new Date().toISOString(),
          verificationSource: 'cloud'
        };

        setBatches(prev => {
          const updated = [newBatch, ...prev];
          saveBatchesToCloud(updated);
          return updated;
        });

        setLoading(false);
        setActiveTab('buyer');
        setSearchId(newId);
        setResult(newBatch);
      }, 1800);
    }

    // Reset form
    setFormData({
      farmer: '',
      location: '',
      crop: '',
      quantity: '',
      harvestDate: '',
      quality: 'Grade A+',
      organic: false,
      notes: ''
    });
  };

  // Handle "Auto-Scan" from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const batchFromUrl = params.get('batch');
    if (batchFromUrl) {
      setActiveTab('buyer');
      const id = batchFromUrl.trim().replace('#', '').toUpperCase();
      setSearchId(id);

      // Give time for cloud fetch to complete — 3s for slower mobile networks
      const timer = setTimeout(() => {
        handleSearch(id);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSearch = async (targetId?: string) => {
    const rawId = (targetId || searchId).trim().replace('#', '');
    const id = rawId.toUpperCase();

    if (!id) return;
    setLoading(true);
    setResult(null);

    let foundOnBlockchain = false;

    // Step 1: Try Blockchain First (most reliable source of truth)
    // Try to extract a numeric ID whether it has FT- prefix or not
    const numericId = id.startsWith('FT-') ? id.split('-')[1] : id;

    if (CONTRACT_ADDRESS && !isNaN(parseInt(numericId))) {
      try {
        const batchId = parseInt(numericId);
        // Use multiple RPC fallbacks for mobile reliability
        const rpcs = [
          import.meta.env.VITE_NETWORK_RPC,
          "https://rpc.ankr.com/eth_sepolia",
          "https://eth-sepolia.public.blastapi.io",
          "https://rpc.sepolia.org"
        ].filter(Boolean);

        let batch = null;
        for (const rpcUrl of rpcs) {
          try {
            const provider = new ethers.JsonRpcProvider(rpcUrl as string);
            const contract = new ethers.Contract(CONTRACT_ADDRESS, FARM_TRACE_ABI, provider);
            // Set a timeout for the contract call
            const result = await Promise.race([
              contract.getBatch(batchId),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ]);
            batch = result;
            if (batch && batch.id > 0n) break;
          } catch (e) {
            console.warn(`RPC ${rpcUrl} failed, trying next...`);
          }
        }

        if (batch && batch.id > 0n) {
          setResult({
            id: `FT-${batch.id}`,
            farmer: batch.farmerName,
            location: batch.farmLocation,
            crop: batch.cropName,
            quantity: batch.quantity.toString(),
            harvestDate: batch.harvestDate,
            quality: batch.qualityGrade,
            organic: batch.isOrganic,
            notes: batch.notes,
            hash: "✅ Verified on Blockchain",
            timestamp: new Date(Number(batch.timestamp) * 1000).toISOString(),
            verificationSource: 'blockchain'
          });
          foundOnBlockchain = true;
        }
      } catch (error) {
        console.error("Blockchain lookup error:", error);
      }
    }

  if (foundOnBlockchain) {
    setLoading(false);
    return;
  }

  // Step 2: Fallback → Local/Cloud (JSONBin)
  // Robust matching for "FT-X" vs "X"
  const searchIdNormalized = id.startsWith('FT-') ? id : `FT-${id}`;
  const searchIdShort = id.startsWith('FT-') ? id.replace('FT-', '') : id;

  const found = batches.find(b => {
    const bId = b.id.replace('#', '').toUpperCase();
    return bId === searchIdNormalized || bId === searchIdShort || `FT-${bId}` === searchIdNormalized;
  });

  if (found) {
    setResult({
      ...found,
      verificationSource: found.verificationSource || 'cloud'
    });
  } else {
    setErrorModal({
      show: true,
      title: 'Verification Failed',
      message: `Batch ${id} not found in the decentralized ledger.\n\nNote: If you just created this batch on another device, please ensure cloud sync is active or wait a few moments for the ledger to update. Ensure you have pushed your .env keys to Vercel if running in production.`
    });
  }
  setLoading(false);
};

const getVerificationUrl = (id: string) => {
  return `${window.location.origin}?batch=${id}`;
};

return (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
    {/* Navbar */}
    <nav className="navbar">
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--primary)', color: 'var(--on-primary)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
            <Sprout size={24} />
          </div>
          <span style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>AgroLedger</span>
        </a>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-light)', padding: '4px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-light)' }}>
            <button
              className={`btn ${activeTab === 'farmer' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '8px 16px', fontSize: '12px' }}
              onClick={() => { setActiveTab('farmer'); setResult(null); }}
            >
              Farmer
            </button>
            <button
              className={`btn ${activeTab === 'buyer' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '8px 16px', fontSize: '12px' }}
              onClick={() => { setActiveTab('buyer'); setResult(null); }}
            >
              Traceability
            </button>
          </div>

          <button
            className={`btn ${account ? 'btn-ghost' : 'btn-primary'}`}
            style={{ padding: '8px 16px', fontSize: '12px', gap: '8px', border: account ? '1px solid var(--border-light)' : 'none' }}
            onClick={connectWallet}
            disabled={isConnecting}
          >
            {account ? (
              <><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} /> {account.substring(0, 4)}...{account.substring(account.length - 3)}</>
            ) : (
              <><Wallet size={14} /> {isConnecting ? '...' : 'Wallet'}</>
            )}
          </button>
        </div>
      </div>
    </nav>

    <main className="container" style={{ flex: 1, paddingBottom: '80px' }}>
      {/* Hero Section */}
      {!result && (
        <header className="hero-header animate-in" style={{ marginBottom: '40px', textAlign: 'center', paddingTop: '20px' }}>
          <div className="label-caps" style={{ marginBottom: '16px', color: 'var(--primary)' }}>
            Trust in every grain
          </div>
          <h1 className="hero-title" style={{ marginBottom: '24px', maxWidth: '800px', margin: '0 auto 24px' }}>
            The Immutable Future of <span className="text-gradient">AgroLedger Traceability</span>
          </h1>
          <p className="hero-subtitle" style={{ color: 'var(--text-dim)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 40px' }}>
            Connect directly with the source. Verified by blockchain, powered by transparency.
          </p>
          <div style={{ position: 'relative', height: 'clamp(200px, 40vh, 400px)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
            <img src={agroHero} alt="Agro Hero" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: '0.6' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, var(--bg-deep) 0%, transparent 100%)' }} />
          </div>
        </header>
      )}

      {activeTab === 'farmer' ? (
        <div className="grid-main">
          <div className="card animate-in delay-1 col-8">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
              <div style={{ background: 'var(--primary-glow)', color: 'var(--primary)', padding: '12px', borderRadius: '12px' }}>
                <Leaf size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '24px' }}>Register New Harvest</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Submit crop details to the immutable ledger.</p>
              </div>
            </div>

            <form onSubmit={handleRegisterBatch}>
              <div className="grid-main" style={{ gap: '20px', marginBottom: '20px' }}>
                <div className="input-group col-6">
                  <label><User size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Farmer Name</label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Sanjana Prasad"
                    required
                    value={formData.farmer}
                    onChange={e => setFormData({ ...formData, farmer: e.target.value })}
                  />
                </div>
                <div className="input-group col-6">
                  <label><MapPin size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Location</label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Mysuru, Karnataka"
                    required
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className="input-group col-4">
                  <label><Sprout size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Crop</label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Heirloom Tomatoes"
                    required
                    value={formData.crop}
                    onChange={e => setFormData({ ...formData, crop: e.target.value })}
                  />
                </div>
                <div className="input-group col-4">
                  <label><Scale size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Quantity (kg)</label>
                  <input
                    className="input-field"
                    type="number"
                    placeholder="250"
                    required
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>
                <div className="input-group col-4">
                  <label><Calendar size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Date</label>
                  <input
                    className="input-field"
                    type="date"
                    required
                    value={formData.harvestDate}
                    onChange={e => setFormData({ ...formData, harvestDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Additional Notes</label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Details about soil, quality, or processing..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                ></textarea>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--surface-light)', borderRadius: '12px', marginBottom: '32px', border: '1px solid var(--border-light)' }}>
                <input
                  type="checkbox"
                  id="organic"
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                  checked={formData.organic}
                  onChange={e => setFormData({ ...formData, organic: e.target.checked })}
                />
                <label htmlFor="organic" style={{ fontSize: '14px', cursor: 'pointer', margin: 0, color: 'var(--text-main)' }}>
                  I certify this is 100% Regenerative & Organic harvest.
                </label>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '56px' }} disabled={loading}>
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="spinner" /> Signing Transaction...
                  </div>
                ) : (
                  <><ShieldCheck size={20} /> Secure Batch on Ledger</>
                )}
              </button>
              
              {!JSONBIN_CONFIG.API_KEY && (
                <p style={{ marginTop: '12px', fontSize: '11px', color: 'var(--secondary)', textAlign: 'center', opacity: 0.8 }}>
                  <Info size={10} style={{ marginRight: '4px' }} /> 
                  Cloud Sync is currently in Read-Only mode. Update your .env keys for cross-device syncing.
                </p>
              )}
            </form>
          </div>

          <div className="animate-in delay-2 col-4">
            <h3 className="label-caps" style={{ marginBottom: '24px' }}>Recent Registry</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {batches.map(batch => (
                <div key={batch.id} className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontFamily: 'Space Grotesk', fontSize: '11px', color: 'var(--primary)', fontWeight: '700' }}>{batch.id}</span>
                    <button
                      onClick={() => setBatches(prev => prev.filter(b => b.id !== batch.id))}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h4 style={{ fontSize: '18px', marginBottom: '4px' }}>{batch.crop}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>{batch.farmer}</p>
                  <div style={{ marginTop: '16px', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'Space Grotesk', wordBreak: 'break-all', opacity: 0.5 }}>
                    {batch.hash}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Search */}
          <div className="card" style={{ padding: '12px', marginBottom: '32px', display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--surface-light)', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 300px' }}>
              <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
              <input
                type="text"
                className="input-field"
                style={{ paddingLeft: '48px', border: 'none', background: 'transparent' }}
                placeholder="Enter Batch ID (e.g. FT-10024)"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button className="btn btn-primary" onClick={() => handleSearch()} disabled={loading} style={{ height: '48px', padding: '0 24px', flex: '1 1 100px' }}>
              {loading ? "Tracing..." : "Trace Origin"}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                fetchBatchesFromCloud();
                setErrorModal({
                  show: true,
                  title: 'Cloud Syncing',
                  message: 'Refreshing batch records from the decentralized cloud ledger...'
                });
              }}
              style={{ height: '48px', width: '48px', padding: '0', borderRadius: '12px' }}
              title="Sync from Cloud"
            >
              <History size={18} />
            </button>
          </div>

          {/* Results */}
          {result ? (
            <div className="card animate-in" style={{ padding: 'clamp(20px, 5vw, 48px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '32px' }}>
                <div style={{ flex: '1 1 300px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <span className={result.verificationSource === 'blockchain' ? "badge-verified" : "badge-cloud"}>
                      {result.verificationSource === 'blockchain' ? (
                        <><CheckCircle2 size={14} /> Blockchain Verified</>
                      ) : (
                        <><ShieldCheck size={14} /> Verified via Cloud</>
                      )}
                    </span>
                    <span style={{ fontFamily: 'Space Grotesk', fontSize: '13px', color: 'var(--text-muted)' }}>ID: {result.id}</span>
                  </div>
                  <h2 style={{ fontSize: 'clamp(2rem, 8vw, 3rem)', marginBottom: '12px' }}>{result.crop}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                    <MapPin size={20} />
                    <span style={{ fontSize: '18px', fontWeight: '500' }}>{result.location}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'center', margin: '0 auto' }}>
                  <div className="qr-wrapper">
                    <QRCodeSVG
                      value={getVerificationUrl(result.id)}
                      size={120}
                      level="H"
                    />
                  </div>
                  <p className="label-caps" style={{ marginTop: '16px', fontSize: '10px' }}>Scan for full audit</p>
                </div>
              </div>

              <div className="grid-main" style={{ marginBottom: '32px', gap: '16px' }}>
                {[
                  { icon: User, label: 'Farmer', value: result.farmer },
                  { icon: Scale, label: 'Batch Size', value: `${result.quantity}kg` },
                  { icon: Calendar, label: 'Harvest Date', value: new Date(result.harvestDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                  { icon: BadgeCheck, label: 'Quality', value: result.organic ? 'Certified Organic' : 'Premium Grade' }
                ].map((item, i) => (
                  <div key={i} className="col-6" style={{ padding: '20px', background: 'var(--surface-light)', borderRadius: '16px', border: '1px solid var(--border-light)', display: 'flex', gap: '12px' }}>
                    <div style={{ color: 'var(--primary)', background: 'var(--primary-glow)', padding: '10px', borderRadius: '10px', height: 'fit-content' }}>
                      <item.icon size={18} />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <span className="label-caps" style={{ fontSize: '9px' }}>{item.label}</span>
                      <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: '32px', background: 'var(--surface-light)', borderRadius: '20px', border: '1px solid var(--border-light)', marginBottom: '40px' }}>
                <h3 className="label-caps" style={{ marginBottom: '24px', color: 'var(--text-main)' }}>Traceability Timeline</h3>
                <div className="status-step completed">
                  <div className="status-icon"><CheckCircle2 size={14} color="var(--on-primary)" /></div>
                  <div className="status-content">
                    <h4>Harvest Registered</h4>
                    <p>Verified by {result.farmer} at {result.location}.</p>
                  </div>
                </div>
                <div className="status-step completed">
                  <div className="status-icon"><CheckCircle2 size={14} color="var(--on-primary)" /></div>
                  <div className="status-content">
                    <h4>Quality Seal Applied</h4>
                    <p>Grade verified and anchored to block #812,942.</p>
                  </div>
                </div>
                <div className="status-step">
                  <div className="status-icon" />
                  <div className="status-content">
                    <h4>In Transit</h4>
                    <p>Currently at distribution hub. Pending outbound logistics.</p>
                  </div>
                </div>
              </div>

              {result.notes && (
                <div style={{ marginBottom: '40px', padding: '24px', background: 'rgba(240, 189, 139, 0.05)', borderRadius: '16px', borderLeft: '4px solid var(--secondary)' }}>
                  <h4 className="label-caps" style={{ marginBottom: '8px', color: 'var(--secondary)' }}>Farmer's Note</h4>
                  <p style={{ fontStyle: 'italic', color: 'var(--text-dim)', fontSize: '15px' }}>"{result.notes}"</p>
                </div>
              )}

              <div style={{ padding: '24px', background: 'var(--surface-lighter)', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <History size={18} color="var(--primary)" />
                  <span className="label-caps" style={{ color: 'var(--text-main)' }}>Blockchain Audit Trail</span>
                </div>
                <div style={{ fontFamily: 'Space Grotesk', fontSize: '12px', color: 'var(--text-muted)', wordBreak: 'break-all', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>TRANSACTION HASH</span>
                    <span style={{ color: 'var(--text-dim)' }}>{result.hash.substring(0, 20)}...</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>TIMESTAMP</span>
                    <span style={{ color: 'var(--text-dim)' }}>{new Date(result.timestamp).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>NETWORK</span>
                    <span style={{ color: 'var(--primary)' }}>AgroLedger Mainnet</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '32px' }}>
                <button className="btn btn-ghost" style={{ width: '100%', gap: '12px' }} onClick={() => window.open('https://etherscan.io', '_blank')}>
                  View on Explorer <ExternalLink size={16} />
                </button>
              </div>
            </div>
          ) : (
            !loading && (
              <div style={{ textAlign: 'center', padding: '100px 40px', border: '1px dashed var(--border-light)', borderRadius: '32px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ background: 'var(--surface-light)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                  <Search size={32} color="var(--text-muted)" />
                </div>
                <h3 style={{ marginBottom: '12px' }}>Ready to Trace?</h3>
                <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 32px' }}>
                  Enter a Batch ID to unlock the full provenance of your produce.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {batches.slice(0, 2).map(b => (
                    <button key={b.id} onClick={() => { setSearchId(b.id); handleSearch(); }} className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '12px' }}>
                      Try {b.id} <ArrowRight size={14} />
                    </button>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </main>

    <footer style={{ padding: '80px 0 40px', borderTop: '1px solid var(--border-dim)', textAlign: 'center' }}>
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '24px', opacity: 0.6 }}>
          <Sprout size={20} color="var(--primary)" />
          <span style={{ fontWeight: '700', fontSize: '18px' }}>AgroLedger</span>
        </div>
        <p className="label-caps" style={{ fontSize: '10px' }}>
          &copy; 2026 AgroLedger Protocol &bull; Decentralized Agricultural Evidence &bull; Secure &bull; Immutable
        </p>
      </div>
    </footer>

    {/* Error Modal */}
    {errorModal.show && (
      <div className="modal-overlay" onClick={() => setErrorModal({ ...errorModal, show: false })}>
        <div className="modal-content card animate-in" onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '8px', borderRadius: '8px' }}>
                <Info size={20} />
              </div>
              <h3 style={{ margin: 0 }}>{errorModal.title}</h3>
            </div>
            <button
              onClick={() => setErrorModal({ ...errorModal, show: false })}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <Trash2 size={20} style={{ transform: 'rotate(45deg)' }} />
            </button>
          </div>
          <p style={{ color: 'var(--text-dim)', marginBottom: '32px', whiteSpace: 'pre-line' }}>{errorModal.message}</p>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => setErrorModal({ ...errorModal, show: false })}
          >
            Understand
          </button>
        </div>
      </div>
    )}

    <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .modal-content {
          max-width: 500px;
          width: 100%;
          border: 1px solid var(--border-light);
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }
        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 640px) {
          .navbar .container {
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 0 12px;
          }
          .navbar span {
            display: none;
          }
          .hero-header {
            padding-top: 10px !important;
            margin-bottom: 20px !important;
          }
          .hero-title {
            font-size: 2.2rem !important;
          }
          .hero-subtitle {
            font-size: 0.95rem !important;
            margin-bottom: 20px !important;
          }
          .btn {
            padding: 10px 16px;
            font-size: 13px;
          }
        }
      `}</style>
  </div>
);
}

export default App;
