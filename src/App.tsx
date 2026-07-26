import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  FolderOpen, 
  Save, 
  Printer, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  ZoomIn, 
  ZoomOut,
  Sparkles,
  ExternalLink,
  Loader2,
  Settings as SettingsIcon,
  Trash2,
  Download,
  Upload,
  Wifi,
  WifiOff,
  History,
  Check,
  FileText,
  HelpCircle,
  Copy,
  ChevronDown,
  Calendar,
  BookOpen,
  MoreVertical,
  Type,
  Sun,
  Moon
} from 'lucide-react';
import { parseMarkup } from './utils/parser';
import { paginateDocument } from './utils/paginator';
import { DocumentRenderer, HeaderOnlyRenderer } from './utils/renderer';
import { triggerSystemPrint } from './utils/pdfExport';
import { generateOdtBlob } from './utils/odtGenerator';
import { generateDocxBlob } from './utils/docxGenerator';
import { usePwa } from './utils/usePwa';
import { 
  ParsedPage, 
  ValidationError, 
  UserPreferences, 
  DEFAULT_PREFERENCES,
  RecentDocument
} from './utils/documentModel';

// Injected globals from Vite define, with safe development fallbacks
const APP_VERSION = '1.5.0';
const BUILD_DATE = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : '2026-07-16';
const COMMIT_HASH = typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'f0e2d1c';
const BUILD_ENV = typeof __BUILD_ENV__ !== 'undefined' ? __BUILD_ENV__ : 'development';

const DEFAULT_MARKUP = `H = بسم الله الرحمن الرحيم
B = الحمد لله رب العالمين، الرحمن الرحيم، ملك يوم الدين، إياك نعبد وإياك نستعين، اهدنا الصراط المستقيم، صراط الذين أنعمت عليهم غير المغضوب عليهم ولا الضالين.
F = سورة الفاتحة

P

H = بسم الله الرحمن الرحيم
B = قل هو الله أحد، الله الصمد، لم يلد ولم يولد، ولم يكن له كفوا أحد.
F = سورة الإخلاص

B = قل أعوذ برب الفلق، من شر ما خلق، ومن شر غاسق إذا وقب، ومن شر النفاثات في العقد، ومن شر حاسد إذا حسد.
F = سورة الفلق`;

export default function App() {
  // PWA & Connection Manager Hook
  const pwa = usePwa();

  // Document & Code States
  const [code, setCode] = useState<string>(() => {
    const saved = localStorage.getItem('hussayni_markup');
    return saved !== null ? saved : DEFAULT_MARKUP;
  });

  const [docName, setDocName] = useState<string>(() => {
    return localStorage.getItem('hussayni_doc_name') || 'Document_Name';
  });

  // Custom page footer texts
  const [leftFooterText, setLeftFooterText] = useState<string>(() => {
    return localStorage.getItem('hussayni_left_footer') || '';
  });

  const [rightFooterText, setRightFooterText] = useState<string>(() => {
    return localStorage.getItem('hussayni_right_footer') || '';
  });

  // Recent Documents List
  const [recentDocs, setRecentDocs] = useState<RecentDocument[]>(() => {
    const saved = localStorage.getItem('hussayni_recent_docs');
    return saved ? JSON.parse(saved) : [];
  });

  // User Preferences State
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem('hussayni_preferences');
    const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 1024;
    const initialDefault = isMobileViewport 
      ? { ...DEFAULT_PREFERENCES, showLineNumbers: false, zoom: 50 } 
      : DEFAULT_PREFERENCES;

    if (saved) {
      try {
        return { ...initialDefault, ...JSON.parse(saved) };
      } catch (e) {
        return initialDefault;
      }
    }
    return initialDefault;
  });

  // Layout and compiled pages
  const [pages, setPages] = useState<ParsedPage[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isPaginating, setIsPaginating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Interactive Overlays
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showAbout, setShowAbout] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showHowToUse, setShowHowToUse] = useState<boolean>(false);
  const [showRecentMenu, setShowRecentMenu] = useState<boolean>(false);
  const [showFileMenu, setShowFileMenu] = useState<boolean>(false);
  const [isLogCollapsed, setIsLogCollapsed] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 1024;
  });
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [showPrintToast, setShowPrintToast] = useState<boolean>(false);
  const [neverShowAgain, setNeverShowAgain] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [isGeneratingOdt, setIsGeneratingOdt] = useState<boolean>(false);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState<boolean>(false);

  // Storage KB estimation
  const [storageUsage, setStorageUsage] = useState<number>(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsInputRef = useRef<HTMLInputElement>(null);

  // Recalculate localStorage usage
  const updateStorageUsage = () => {
    let totalBytes = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalBytes += (key.length + (localStorage.getItem(key) || '').length) * 2;
      }
    }
    setStorageUsage(Math.round((totalBytes / 1024) * 100) / 100);
  };

  // Sync scroll between line numbers column and textarea
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Cursor positional updates
  const [cursorInfo, setCursorInfo] = useState({ line: 1, col: 1 });
  const handleCursorMove = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const selectionStart = target.selectionStart;
    const textBeforeCursor = target.value.substring(0, selectionStart);
    const linesArr = textBeforeCursor.split('\n');
    const line = linesArr.length;
    const col = linesArr[linesArr.length - 1].length + 1;
    setCursorInfo({ line, col });
  };

  // Extract headers for Header-Only output mode
  const extractedHeaders = React.useMemo(() => {
    const parsed = parseMarkup(code);
    const list = parsed.tokens
      .filter(t => t.type === 'H')
      .map(t => t.text.trim())
      .filter(Boolean);
    return list.length > 0 ? list : [docName || 'عنوان القصيدة'];
  }, [code, docName]);

  // Asynchronous Pagination triggered by content or preference updates
  useEffect(() => {
    let active = true;

    const updateLayout = async () => {
      setIsPaginating(true);
      
      const parsed = parseMarkup(code);
      if (!active) return;
      
      setErrors(parsed.errors);

      // Pass userPreferences into the HTML typesetter layout engine
      const { pages: solvedPages, warnings: layoutWarnings } = await paginateDocument(parsed.documentItems, preferences);
      if (!active) return;

      setPages(solvedPages);
      setErrors([...parsed.errors, ...layoutWarnings]);
      setIsPaginating(false);
    };

    updateLayout();

    return () => {
      active = false;
    };
  }, [code, preferences.minFontSize, preferences.maxFontSize, preferences.paragraphSpacing]);

  // Persist content & updates to Local Storage (Autosave)
  useEffect(() => {
    localStorage.setItem('hussayni_markup', code);
    localStorage.setItem('hussayni_doc_name', docName);
    localStorage.setItem('hussayni_left_footer', leftFooterText);
    localStorage.setItem('hussayni_right_footer', rightFooterText);
    
    const now = new Date();
    localStorage.setItem('hussayni_autosave_time', now.toISOString());
    updateStorageUsage();
  }, [code, docName, leftFooterText, rightFooterText]);

  // Persist preferences to Local Storage
  useEffect(() => {
    localStorage.setItem('hussayni_preferences', JSON.stringify(preferences));
    updateStorageUsage();
  }, [preferences]);

  // Auto-backup to recent documents list on intervals or edits
  useEffect(() => {
    const timer = setTimeout(() => {
      // Avoid duplicate backups or empty backups
      if (!code.trim()) return;

      setRecentDocs(prev => {
        // Remove existing backup of same docName if any
        const filtered = prev.filter(d => d.name !== docName);
        const updated: RecentDocument[] = [
          {
            id: `doc-${Date.now()}`,
            name: docName,
            markup: code,
            leftFooter: leftFooterText,
            rightFooter: rightFooterText,
            lastSaved: new Date().toISOString()
          },
          ...filtered
        ].slice(0, 10); // cap at 10 documents

        localStorage.setItem('hussayni_recent_docs', JSON.stringify(updated));
        return updated;
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [code, docName, leftFooterText, rightFooterText]);

  // Load a document from recent documents
  const handleLoadRecent = (doc: RecentDocument) => {
    setConfirmConfig({
      title: "Load Recent Document?",
      message: `Are you sure you want to open "${doc.name}"? Current modifications will be automatically saved in history.`,
      onConfirm: () => {
        setDocName(doc.name);
        setCode(doc.markup);
        setLeftFooterText(doc.leftFooter || '');
        setRightFooterText(doc.rightFooter || '');
        setShowRecentMenu(false);
        triggerToast(`Opened "${doc.name}" successfully`);
      }
    });
  };

  // Delete a document from recent documents list
  const handleDeleteRecent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = recentDocs.filter(d => d.id !== id);
    setRecentDocs(filtered);
    localStorage.setItem('hussayni_recent_docs', JSON.stringify(filtered));
    triggerToast('Removed document from history');
  };

  // Toast message trigger helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Create a brand new file
  const handleNew = () => {
    setConfirmConfig({
      title: "Create New Document?",
      message: "Are you sure you want to create a new file? Current work will be backed up to your history list.",
      onConfirm: () => {
        setDocName('Document_Name');
        setCode(DEFAULT_MARKUP);
        setLeftFooterText('');
        setRightFooterText('');
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
        triggerToast("Created new document");
      }
    });
  };

  // Open file handler (Import)
  const handleOpenClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const cleanedName = file.name.replace(/\.txt$/i, '').replace(/^main_hussayni_/, '');
        setDocName(cleanedName || 'Imported Document');
        setCode(content);
        triggerToast("Imported successfully");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Helper to format file-friendly timestamp
  const getFormattedTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}_${hours}-${minutes}`;
  };

  const getSanitizedDocName = () => docName.replace(/\s+/g, '_');

  // Export current markup source
  const handleSaveSource = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const hasTimestamp = preferences.includeExportTimestamp === true;
    const baseName = getSanitizedDocName();
    a.download = hasTimestamp 
      ? `${baseName}_${getFormattedTimestamp()}.txt` 
      : `${baseName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast("Saved source file");
  };

  // Trigger browser vector printing (PDF Export)
  const handleLaunchPrint = () => {
    setShowExportModal(false);
    const neverShow = localStorage.getItem('hussayni_never_show_print_toast') === 'true';

    if (neverShow) {
      const originalTitle = document.title;
      const hasTimestamp = preferences.includeExportTimestamp === true;
      const baseName = getSanitizedDocName();
      document.title = hasTimestamp 
        ? `${baseName}_${getFormattedTimestamp()}` 
        : baseName;

      const isHeaderMode = preferences.outputMode === 'H';
      if (isHeaderMode) {
        document.body.classList.add('mode-header-only');
      }

      triggerSystemPrint(
        () => {},
        () => {
          document.title = originalTitle;
          if (isHeaderMode) {
            document.body.classList.remove('mode-header-only');
          }
        }
      );
    } else {
      setShowPrintToast(true);
    }
  };

  // Trigger browser-side ODT compilation and download
  const handleLaunchOdt = async () => {
    if (pages.length === 0) return;
    setIsGeneratingOdt(true);
    try {
      const blob = await generateOdtBlob(
        pages,
        leftFooterText,
        rightFooterText,
        preferences.showPageNumber !== false,
        preferences.footerFontSize || 14
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const hasTimestamp = preferences.includeExportTimestamp === true;
      const baseName = getSanitizedDocName();
      a.download = hasTimestamp 
        ? `${baseName}_${getFormattedTimestamp()}.odt` 
        : `${baseName}.odt`;
      a.click();
      URL.revokeObjectURL(url);
      triggerToast("ODT file compiled successfully!");
    } catch (e) {
      alert("Failed to generate ODT file. Ensure all contents are formatted correctly.");
    } finally {
      setIsGeneratingOdt(false);
      setShowExportModal(false);
    }
  };

  // Trigger browser-side DOCX compilation and download
  const handleLaunchDocx = async () => {
    if (pages.length === 0) return;
    setIsGeneratingDocx(true);
    try {
      const blob = await generateDocxBlob(
        pages,
        leftFooterText,
        rightFooterText,
        preferences.showPageNumber !== false,
        preferences.footerFontSize || 14
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const hasTimestamp = preferences.includeExportTimestamp === true;
      const baseName = getSanitizedDocName();
      a.download = hasTimestamp 
        ? `${baseName}_${getFormattedTimestamp()}.docx` 
        : `${baseName}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      triggerToast("Word document (.docx) compiled successfully!");
    } catch (e) {
      alert("Failed to generate DOCX file. Ensure all contents are formatted correctly.");
    } finally {
      setIsGeneratingDocx(false);
      setShowExportModal(false);
    }
  };

  // Clear all application cache and restore factory preferences
  const handleClearAllData = () => {
    if (window.confirm("CRITICAL WARNING: This will permanently wipe your document history, active editor buffer, and customized font ranges. Continue?")) {
      localStorage.clear();
      setCode(DEFAULT_MARKUP);
      setDocName('Document_Name');
      setLeftFooterText('');
      setRightFooterText('');
      setRecentDocs([]);
      setPreferences(DEFAULT_PREFERENCES);
      setShowSettings(false);
      triggerToast("Application data reset successfully!");
    }
  };

  // Export Application Settings file (.json)
  const handleExportPreferences = () => {
    const backupData = {
      preferences,
      recentDocs,
      activeDocName: docName,
      activeDocMarkup: code,
      activeLeftFooter: leftFooterText,
      activeRightFooter: rightFooterText,
      backupVersion: APP_VERSION,
      backupDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hussayni_settings_backup_${getFormattedTimestamp()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast("Settings exported!");
  };

  // Import Application Settings file (.json)
  const handleImportPreferencesClick = () => {
    settingsInputRef.current?.click();
  };

  const handleImportPreferencesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.preferences) {
          setPreferences(parsed.preferences);
        }
        if (parsed.recentDocs) {
          setRecentDocs(parsed.recentDocs);
          localStorage.setItem('hussayni_recent_docs', JSON.stringify(parsed.recentDocs));
        }
        if (parsed.activeDocMarkup) {
          setCode(parsed.activeDocMarkup);
        }
        if (parsed.activeDocName) {
          setDocName(parsed.activeDocName);
        }
        if (parsed.activeLeftFooter !== undefined) {
          setLeftFooterText(parsed.activeLeftFooter);
        }
        if (parsed.activeRightFooter !== undefined) {
          setRightFooterText(parsed.activeRightFooter);
        }
        triggerToast("Backup profiles imported successfully!");
        setShowSettings(false);
      } catch (err) {
        alert("Invalid backup configuration file. Please ensure it is a valid Hussayni settings backup JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Dynamic Theme Definitions
  const themeClasses = {
    slate: {
      appBg: 'bg-[#0f172a]', // background for shell
      workspaceBg: 'bg-[#f1f5f9]', // background behind paper
      editorBg: 'bg-white',
      editorText: 'text-slate-800',
      editorHeader: 'bg-slate-100 border-slate-200 text-slate-700',
      activeTab: 'bg-white text-slate-900 border-slate-200 border-b-transparent',
      inactiveTab: 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-transparent',
      headerBg: 'bg-slate-950 text-white',
      accentColor: 'text-emerald-500',
      accentBg: 'bg-emerald-500',
      accentHover: 'hover:bg-emerald-600',
      gutterBg: 'bg-slate-50 border-slate-200 text-slate-400',
      cardBg: 'bg-white text-slate-900 border-slate-200',
      docNameText: 'text-[#0f172a]',
      docNamePlaceholder: 'placeholder:text-[#0f172a]/50',
      docSuffixText: 'text-emerald-600',
      footerInputsBg: 'bg-slate-100/90 border-slate-200',
      footerInputBox: 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-300 focus:border-emerald-500 focus:ring-emerald-500',
      footerLabelText: 'text-slate-500',
      validationHeaderBg: 'bg-slate-200/60 border-slate-200 text-slate-600',
      validationBodyBg: 'bg-slate-50/85 border-slate-200',
      validationSuccessText: 'text-emerald-600',
      validationErrorBg: 'bg-rose-100 text-rose-800',
      validationWarningBg: 'bg-amber-100 text-amber-800',
      autosaveText: 'text-slate-400 border-slate-200/40',
    },
    warm: {
      appBg: 'bg-[#2d1f18]',
      workspaceBg: 'bg-[#f4efe8]',
      editorBg: 'bg-[#fcfaf7]',
      editorText: 'text-amber-950',
      editorHeader: 'bg-[#eae3d5] border-[#d8cfbe] text-amber-900',
      activeTab: 'bg-[#fcfaf7] text-amber-950 border-[#d8cfbe] border-b-transparent',
      inactiveTab: 'bg-[#eae3d5]/50 text-amber-700 hover:bg-[#eae3d5] border-transparent',
      headerBg: 'bg-[#3e2723] text-[#fbe9e7]',
      accentColor: 'text-amber-500',
      accentBg: 'bg-amber-600',
      accentHover: 'hover:bg-amber-700',
      gutterBg: 'bg-[#f4eee1] border-[#e0d5c1] text-amber-600/60',
      cardBg: 'bg-[#fcfaf7] text-amber-950 border-[#e4dcce]',
      docNameText: 'text-amber-950',
      docNamePlaceholder: 'placeholder:text-amber-950/50',
      docSuffixText: 'text-emerald-700',
      footerInputsBg: 'bg-[#eae3d5]/70 border-[#d8cfbe]',
      footerInputBox: 'bg-[#fcfaf7] border-[#d8cfbe] text-amber-950 placeholder:text-amber-200/80 focus:border-amber-600 focus:ring-amber-600',
      footerLabelText: 'text-amber-800',
      validationHeaderBg: 'bg-[#eae3d5] border-[#d8cfbe] text-amber-900',
      validationBodyBg: 'bg-[#f4efe8]/90 border-[#d8cfbe]',
      validationSuccessText: 'text-amber-700',
      validationErrorBg: 'bg-[#fbe9e7] text-rose-800',
      validationWarningBg: 'bg-[#fff3e0] text-amber-800',
      autosaveText: 'text-amber-700/60 border-[#d8cfbe]/40',
    },
    dark: {
      appBg: 'bg-[#020617]',
      workspaceBg: 'bg-[#0f172a]',
      editorBg: 'bg-[#1e293b]',
      editorText: 'text-slate-100',
      editorHeader: 'bg-[#334155] border-[#475569] text-slate-200',
      activeTab: 'bg-[#1e293b] text-white border-[#475569] border-b-transparent',
      inactiveTab: 'bg-[#1e293b]/50 text-slate-400 hover:bg-[#334155]/60 border-transparent',
      headerBg: 'bg-[#030712] text-white',
      accentColor: 'text-emerald-400',
      accentBg: 'bg-emerald-600',
      accentHover: 'hover:bg-emerald-500',
      gutterBg: 'bg-[#0f172a] border-[#334155] text-slate-500',
      cardBg: 'bg-[#1e293b] text-slate-100 border-[#334155]',
      docNameText: 'text-slate-100',
      docNamePlaceholder: 'placeholder:text-slate-400',
      docSuffixText: 'text-emerald-400',
      footerInputsBg: 'bg-[#0f172a] border-[#334155]',
      footerInputBox: 'bg-[#1e293b] border-[#334155] text-slate-200 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500',
      footerLabelText: 'text-slate-400',
      validationHeaderBg: 'bg-[#0f172a] border-[#334155] text-slate-300',
      validationBodyBg: 'bg-[#1e293b] border-[#334155]',
      validationSuccessText: 'text-emerald-400',
      validationErrorBg: 'bg-rose-950/50 text-rose-300 border border-rose-500/30',
      validationWarningBg: 'bg-amber-950/50 text-amber-300 border border-amber-500/30',
      autosaveText: 'text-slate-300 border-[#334155]',
    },
    classic: {
      appBg: 'bg-[#000000]',
      workspaceBg: 'bg-[#e5e5e5]',
      editorBg: 'bg-white',
      editorText: 'text-black',
      editorHeader: 'bg-neutral-100 border-neutral-300 text-neutral-800',
      activeTab: 'bg-white text-black border-neutral-300 border-b-transparent',
      inactiveTab: 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100 border-transparent',
      headerBg: 'bg-neutral-900 text-white',
      accentColor: 'text-white',
      accentBg: 'bg-neutral-800',
      accentHover: 'hover:bg-black',
      gutterBg: 'bg-neutral-50 border-neutral-200 text-neutral-400',
      cardBg: 'bg-white text-black border-neutral-300',
      docNameText: 'text-black',
      docNamePlaceholder: 'placeholder:text-neutral-400',
      docSuffixText: 'text-emerald-600',
      footerInputsBg: 'bg-neutral-100 border-neutral-200',
      footerInputBox: 'bg-white border-neutral-300 text-black placeholder:text-neutral-300 focus:border-black focus:ring-black',
      footerLabelText: 'text-neutral-500',
      validationHeaderBg: 'bg-neutral-100 border-neutral-200 text-neutral-800',
      validationBodyBg: 'bg-white border-neutral-300',
      validationSuccessText: 'text-neutral-800 font-bold',
      validationErrorBg: 'bg-neutral-100 text-black border border-black',
      validationWarningBg: 'bg-neutral-100 text-black border border-black',
      autosaveText: 'text-neutral-500 border-neutral-200',
    }
  }[preferences.theme];

  // Determine dominant page font size
  const mainFontSize = pages.length > 0 ? pages[0].fontSize : preferences.maxFontSize;

  // Line count for the left-side gutter
  const linesCount = Math.max(1, code.split('\n').length);
  const lineNumbers = Array.from({ length: linesCount }, (_, i) => i + 1);

  return (
    <div id="app-container" className={`flex flex-col h-screen ${themeClasses.appBg} font-sans overflow-hidden transition-colors duration-200`}>
      
      {/* Dynamic Hidden File Inputs */}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".txt" className="hidden" />
      <input type="file" ref={settingsInputRef} onChange={handleImportPreferencesChange} accept=".json" className="hidden" />

      {/* SERVICE WORKER PWA UPDATE BANNER */}
      {pwa.needRefresh && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-6 py-2.5 flex items-center justify-between shadow-lg z-[99999] select-none shrink-0 border-b border-white/10 animate-fade-in print:hidden">
          <div className="flex items-center gap-3">
            <Sparkles className="text-emerald-300 animate-pulse" size={18} />
            <span className="text-xs font-semibold tracking-wide">
              A newer and more polished version of Hussayni is ready to install!
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pwa.updateServiceWorker(true)}
              className="bg-white text-emerald-800 hover:bg-emerald-50 px-3.5 py-1 rounded-md text-xs font-bold transition-all duration-150 shadow-sm cursor-pointer"
            >
              Update Now
            </button>
            <button
              onClick={() => { triggerToast("Update delayed. Will apply on next visit."); pwa.updateServiceWorker(false); }}
              className="text-white/80 hover:text-white px-3 py-1 rounded text-xs font-medium cursor-pointer"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* HEADER CONTROLS */}
      <header className={`h-14 ${themeClasses.headerBg} flex items-center justify-between px-3 sm:px-6 shadow-md shrink-0 select-none print:hidden z-30`}>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center font-bold text-lg text-white shadow-inner select-none shrink-0">H</div>
          
          {/* App Title & Subtitle */}
          <div className="flex flex-col justify-center select-none">
            <h1 className="text-white font-extrabold text-sm leading-tight tracking-wide">Hussayni</h1>
          </div>

          {/* Connection badge */}
          {pwa.isOffline ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <WifiOff size={10} />
              <span className="hidden sm:inline">Offline Mode</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Wifi size={10} />
              <span className="hidden sm:inline">Connected</span>
            </span>
          )}

          {/* Offline PWA Ready check */}
          {pwa.offlineReady && (
            <span className="text-[10px] text-slate-400 font-medium hidden md:inline select-none">
              (Cached offline)
            </span>
          )}
        </div>

        {/* Workspace Quick Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          
          {/* Recent Document Selector Dropdown */}
          <div className="relative">
            <button 
              onClick={() => {
                setShowRecentMenu(!showRecentMenu);
                setShowFileMenu(false);
              }}
              className="px-2 py-1.5 sm:px-3 sm:py-1.5 hover:bg-white/10 rounded text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 text-slate-200 cursor-pointer"
              title="Switch to previously saved workbooks"
            >
              <History size={13} />
              <span className="hidden md:inline">History</span>
              <ChevronDown size={11} className={`transition-transform duration-150 ${showRecentMenu ? 'rotate-180' : ''}`} />
            </button>
            {showRecentMenu && (
              <div className="absolute top-10 right-[-100px] sm:right-auto sm:left-0 w-64 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-2.5 z-50 text-slate-200 select-none">
                <p className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider border-b border-slate-800">
                  Recent Document Drafts ({recentDocs.length})
                </p>
                <div className="mt-1.5 space-y-0.5 max-h-60 overflow-y-auto">
                  {recentDocs.length === 0 ? (
                    <p className="text-xs text-slate-500 p-3 text-center">No cached document logs found.</p>
                  ) : (
                    recentDocs.map((doc) => (
                      <div 
                        key={doc.id}
                        onClick={() => handleLoadRecent(doc)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-left ${
                          doc.name === docName ? 'bg-emerald-950/40 text-emerald-300' : 'hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                           <FileText size={13} className="shrink-0 text-slate-500" />
                          <div className="overflow-hidden">
                            <p className="text-xs font-medium truncate">{doc.name}</p>
                            <p className="text-[9px] text-slate-500">
                              {new Date(doc.lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => handleDeleteRecent(doc.id, e)}
                          className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                          title="Wipe record"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-slate-700 mx-0.5 sm:mx-1 hidden sm:block"></div>

          {isMobile ? (
            /* Collapsible Mobile Actions Dropdown */
            <div className="relative">
              <button 
                onClick={() => {
                  setShowFileMenu(!showFileMenu);
                  setShowRecentMenu(false);
                }}
                className="px-2 py-1.5 hover:bg-white/10 rounded text-xs font-semibold transition-all duration-150 flex items-center gap-1 text-slate-200 cursor-pointer"
                title="File Actions"
              >
                <MoreVertical size={14} className="text-slate-400" />
                <span>File</span>
                <ChevronDown size={11} className={`transition-transform duration-150 ${showFileMenu ? 'rotate-180' : ''}`} />
              </button>
              {showFileMenu && (
                <div className="absolute top-10 right-0 w-36 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-1 z-50 text-slate-200 select-none">
                  <button
                    onClick={() => {
                      handleNew();
                      setShowFileMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer text-slate-200"
                  >
                    <Plus size={14} className="text-emerald-400" />
                    <span>New</span>
                  </button>
                  <button
                    onClick={() => {
                      handleOpenClick();
                      setShowFileMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer text-slate-200"
                  >
                    <FolderOpen size={14} className="text-blue-400" />
                    <span>Open</span>
                  </button>
                  <button
                    onClick={() => {
                      handleSaveSource();
                      setShowFileMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer text-slate-200"
                  >
                    <Save size={14} className="text-amber-400" />
                    <span>Save</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button 
                onClick={handleNew}
                className="px-2 py-1.5 sm:px-3 sm:py-1.5 hover:bg-white/10 rounded text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 text-slate-200 cursor-pointer"
                title="Create a fresh workbook canvas"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">New</span>
              </button>
              
              <button 
                onClick={handleOpenClick}
                className="px-2 py-1.5 sm:px-3 sm:py-1.5 hover:bg-white/10 rounded text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 text-slate-200 cursor-pointer"
                title="Upload custom text file with Hussayni tags"
              >
                <FolderOpen size={14} />
                <span className="hidden sm:inline">Open</span>
              </button>

              <button 
                onClick={handleSaveSource}
                className="px-2 py-1.5 sm:px-3 sm:py-1.5 hover:bg-white/10 rounded text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 text-slate-200 cursor-pointer"
                title="Download source text file markup directly"
              >
                <Save size={14} />
                <span className="hidden sm:inline">Save</span>
              </button>
            </>
          )}

          <div className="h-4 w-px bg-slate-700 mx-0.5 sm:mx-1 hidden sm:block"></div>

          {/* OUTPUT MODE SWITCH: H (Header Only 1920x1080) vs P (Full Poem A4) */}
          <div className="bg-slate-800/90 p-0.5 rounded-lg border border-slate-700 flex items-center shadow-inner select-none">
            <button
              onClick={() => setPreferences(p => ({ ...p, outputMode: 'H' }))}
              className={`px-2 py-1 rounded text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                preferences.outputMode === 'H'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="Header Only Output Mode (1920x1080 Landscape)"
            >
              <Type size={12} />
              <span className="font-extrabold">H</span>
            </button>
            <button
              onClick={() => setPreferences(p => ({ ...p, outputMode: 'P' }))}
              className={`px-2 py-1 rounded text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                preferences.outputMode !== 'H'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="Full Poem Output Mode (A4 Paginated Document)"
            >
              <FileText size={12} />
              <span className="font-extrabold">P</span>
            </button>
          </div>

          {/* EXPORT OVERLAY ACTION BUTTON */}
          <button 
            onClick={() => setShowExportModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1 sm:gap-1.5 shadow-sm cursor-pointer"
            title="Export compiled document to ODT or high-fidelity A4 vector print PDF"
          >
            <Printer size={13} />
            <span className="hidden xs:inline">Compile &amp; Export</span>
          </button>

          {/* SETTINGS GEAR ICON */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Configure layouts, bounds, and interface preferences"
          >
            <SettingsIcon size={17} />
          </button>
        </div>
      </header>

      {/* MOBILE TAB SWITCHER */}
      {isMobile && (
        <div className={`flex shrink-0 h-11 select-none z-20 print:hidden border-b ${themeClasses.editorHeader}`}>
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex-1 flex items-center justify-center gap-2 text-xs font-bold transition-all duration-150 border-b-2 ${
              activeTab === 'editor'
                ? 'border-emerald-500 bg-emerald-500/5 ' + themeClasses.docNameText
                : 'border-transparent ' + themeClasses.inactiveTab
            }`}
          >
            <FileText size={14} />
            <span>Editor</span>
            {errors.filter(e => e.severity === 'error').length > 0 && (
              <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                {errors.filter(e => e.severity === 'error').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 flex items-center justify-center gap-2 text-xs font-bold transition-all duration-150 border-b-2 ${
              activeTab === 'preview'
                ? 'border-emerald-500 bg-emerald-500/5 ' + themeClasses.docNameText
                : 'border-transparent ' + themeClasses.inactiveTab
            }`}
          >
            <BookOpen size={14} />
            <span>Preview</span>
          </button>
        </div>
      )}

      {/* MAIN WORKSPACE CONTENT */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* LEFT COMPARTMENT: MARKUP TEXT EDITOR */}
        <section className={`w-full lg:w-[450px] flex-1 lg:flex-none flex-col border-r border-slate-200 ${themeClasses.editorBg} print:hidden lg:shrink-0 ${isMobile && activeTab !== 'editor' ? 'hidden' : 'flex'}`}>
          
          {/* EDITOR UTILITIES BAR */}
          <div className={`flex px-4 pt-2.5 justify-between items-end border-b select-none shrink-0 ${themeClasses.editorHeader}`}>
            
            {/* Document Header Name tag */}
            <div className={`px-3 py-1 ${themeClasses.editorBg} rounded-t border border-b-0 border-inherit text-[11px] font-bold tracking-wider flex items-center gap-1 shrink-0 max-w-[220px]`}>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0"></span>
              <input 
                type="text"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                className={`bg-transparent border-none outline-none font-extrabold text-[11px] ${themeClasses.docNameText} ${themeClasses.docNamePlaceholder} focus:ring-0 p-0 m-0 w-28 focus:border-b focus:border-emerald-500/50`}
                title="Click to rename document"
                placeholder="Document_Name"
              />
              <span className={`font-semibold shrink-0 ${themeClasses.docSuffixText}`}>.hussayni</span>
            </div>
            
            {/* Quick Editor RTL / LTR switch toggles */}
            <div className="flex items-center gap-1 pb-1.5 text-[10px] font-medium text-slate-500">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mr-1">RTL Direction:</span>
              <button
                onClick={() => setPreferences(p => ({ ...p, editorRtl: false }))}
                className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded cursor-pointer transition-all ${
                  !preferences.editorRtl 
                    ? `${themeClasses.accentBg} text-white border-transparent shadow-sm` 
                    : 'bg-slate-200/50 hover:bg-slate-200 text-slate-600'
                }`}
              >
                LTR
              </button>
              <button
                onClick={() => setPreferences(p => ({ ...p, editorRtl: true }))}
                className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded cursor-pointer transition-all ${
                  preferences.editorRtl 
                    ? `${themeClasses.accentBg} text-white border-transparent shadow-sm` 
                    : 'bg-slate-200/50 hover:bg-slate-200 text-slate-600'
                }`}
              >
                RTL
              </button>
            </div>
          </div>

          {/* PAGE FOOTER TEXTS INPUTS */}
          <div className={`px-4 py-2.5 border-b grid grid-cols-2 gap-3 shrink-0 select-none ${themeClasses.footerInputsBg}`}>
            <div className="space-y-1">
              <label className={`block text-[10px] font-bold uppercase tracking-wider text-right ${themeClasses.footerLabelText}`} dir="rtl">
                الحاشية اليسرى (Left Footer)
              </label>
              <input 
                type="text"
                value={leftFooterText}
                onChange={(e) => setLeftFooterText(e.target.value)}
                placeholder="محرم 1447"
                className={`w-full text-right border rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:ring-1 transition-all placeholder:text-slate-300 placeholder:font-normal animate-fade-in ${themeClasses.footerInputBox}`}
                dir="rtl"
              />
            </div>
            <div className="space-y-1">
              <label className={`block text-[10px] font-bold uppercase tracking-wider text-right ${themeClasses.footerLabelText}`} dir="rtl">
                الحاشية اليمنى (Right Footer)
              </label>
              <input 
                type="text"
                value={rightFooterText}
                onChange={(e) => setRightFooterText(e.target.value)}
                placeholder="اسم الشاعر"
                className={`w-full text-right border rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:ring-1 transition-all placeholder:text-slate-300 placeholder:font-normal animate-fade-in ${themeClasses.footerInputBox}`}
                dir="rtl"
              />
            </div>
          </div>
          
          {/* SCROLLABLE EDITOR CONTAINER */}
          <div className="flex-1 flex relative overflow-hidden bg-slate-50/20">
            {/* Gutter Line Numbers Column */}
            {preferences.showLineNumbers && (
              <div 
                ref={lineNumbersRef}
                className={`w-11 text-right pr-2.5 pt-4 select-none overflow-hidden font-mono leading-[21px] text-[11px] ${themeClasses.gutterBg}`}
              >
                {lineNumbers.map((num) => (
                  <div key={num} className="h-[21px]">{num}</div>
                ))}
              </div>
            )}

            {/* Standard Markup Text Area */}
            <textarea
              id="editor-textarea"
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onScroll={handleScroll}
              onKeyUp={handleCursorMove}
              onSelect={handleCursorMove}
              onClick={handleCursorMove}
              spellCheck={false}
              dir={preferences.editorRtl ? "rtl" : "ltr"}
              wrap="off"
              className={`flex-1 p-4 bg-transparent resize-none overflow-auto outline-none border-none focus:ring-0 font-mono leading-[21px] whitespace-pre ${themeClasses.editorText}`}
              style={{ fontSize: `${preferences.editorFontSize}px` }}
              placeholder="H = بسم الله الرحمن الرحيم&#10;B = اكتب نص الفقرة هنا...&#10;F = الحاشية السفلية"
            />
          </div>

          {/* BOTTOM ERROR & VALIDATION LOG DRAWER */}
          <div className={`${isLogCollapsed ? 'h-9' : 'h-44'} border-t flex flex-col shrink-0 ${themeClasses.validationBodyBg} transition-all duration-150 overflow-hidden`}>
            <div 
              onClick={() => setIsLogCollapsed(!isLogCollapsed)}
              className={`px-4 py-2 text-[9px] font-bold uppercase tracking-wider flex items-center justify-between select-none ${themeClasses.validationHeaderBg} cursor-pointer hover:bg-black/5 dark:hover:bg-white/5`}
            >
              <div className="flex items-center gap-1.5">
                <ChevronDown size={11} className={`transition-transform duration-150 text-slate-400 ${isLogCollapsed ? '' : 'rotate-180'}`} />
                <span>Hussayni Compilation Log</span>
              </div>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                errors.filter(e => e.severity === 'error').length > 0 
                  ? themeClasses.validationErrorBg 
                  : `${themeClasses.validationSuccessText} bg-emerald-100/10`
              }`}>
                {errors.filter(e => e.severity === 'error').length} Errors
              </span>
            </div>
            
            {!isLogCollapsed && (
              <div className="flex-grow p-3.5 overflow-y-auto font-sans">
                {errors.length === 0 ? (
                  <div className={`flex items-center gap-2 text-xs py-1 ${themeClasses.validationSuccessText}`}>
                    <CheckCircle size={13} />
                    <span>Valid markup syntax! Live layout is successfully typeset.</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {errors.map((err, idx) => (
                      <div 
                        key={idx} 
                        className={`flex items-start gap-2 text-xs ${
                          err.severity === 'error' ? 'text-rose-400' : 'text-amber-400'
                        }`}
                      >
                        <AlertCircle size={13} className="shrink-0 mt-0.5" />
                        <span className={`px-1.5 rounded text-[9px] font-bold shrink-0 ${
                          err.severity === 'error' ? themeClasses.validationErrorBg : themeClasses.validationWarningBg
                        }`}>
                          Line {err.line}
                        </span>
                        <span className="font-medium truncate">{err.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* AUTOSAVE FEEDBACK LINE */}
                <div className={`flex items-center gap-1 text-[10px] mt-3 pt-2 border-t select-none ${themeClasses.autosaveText}`}>
                  <Info size={11} />
                  <span>Autosave active. Cached locally: {storageUsage} KB.</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COMPARTMENT: INTERACTIVE REAL-TIME PAGE TYPESETTER PREVIEW */}
        <section 
          id="preview-section"
          className={`flex-1 ${themeClasses.workspaceBg} p-4 sm:p-6 flex-col items-center overflow-y-auto relative scroll-smooth print:p-0 print:bg-white print:overflow-visible print:absolute print:inset-0 print:w-full print:h-auto transition-colors duration-200 ${isMobile && activeTab !== 'preview' ? 'hidden' : 'flex'}`}
        >
          {preferences.outputMode === 'H' ? (
            <HeaderOnlyRenderer 
              headers={extractedHeaders}
              fontSize={preferences.headerFontSize || 145}
              lineSpacing={preferences.headerLineSpacing || 1.2}
              zoom={preferences.zoom}
              theme={preferences.headerTheme || 'dark'}
            />
          ) : isPaginating && pages.length === 0 ? (
            <div className="m-auto text-center text-slate-400 flex flex-col items-center gap-3 select-none">
              <Loader2 size={32} className="animate-spin text-emerald-500" />
              <p className="text-xs">Recalculating layout using real DOM vectors...</p>
            </div>
          ) : pages.length === 0 ? (
            <div className="m-auto text-center text-slate-400 max-w-sm flex flex-col items-center gap-3 select-none">
              <AlertCircle size={44} className="text-slate-300 stroke-1" />
              <p className="text-xs">Enter valid Hussayni Arabic markup on the left editor panel to typeset live pages.</p>
            </div>
          ) : (
            <DocumentRenderer 
              pages={pages} 
              zoom={preferences.zoom} 
              showDebug={preferences.showDebug} 
              leftFooterText={leftFooterText}
              rightFooterText={rightFooterText}
              showPageNumber={preferences.showPageNumber !== false}
              footerFontSize={preferences.footerFontSize || 14}
            />
          )}

          {/* FLOATING ACTION HUD: ZOOM & RANGE SPECIFICATIONS */}
          <div className="fixed bottom-12 right-4 sm:right-8 flex flex-col sm:flex-row items-end sm:items-center gap-2 print:hidden z-40 select-none">
            {isPaginating && preferences.outputMode !== 'H' && (
              <div className="bg-slate-900 text-white px-3 py-2 rounded-full shadow-lg flex items-center gap-2 text-[11px] font-medium border border-slate-700">
                <Loader2 size={11} className="animate-spin text-emerald-400" />
                <span>Compiling Layout...</span>
              </div>
            )}

            {preferences.outputMode === 'H' ? (
              /* Header Only Options HUD */
              <div className="bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-3.5 text-xs">
                {/* Text Size Control */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-extrabold text-slate-400 tracking-wider uppercase">Text Size</span>
                  <input 
                    type="range"
                    min="32"
                    max="220"
                    value={preferences.headerFontSize || 145}
                    onChange={(e) => setPreferences(p => ({ ...p, headerFontSize: parseInt(e.target.value) }))}
                    className="w-20 sm:w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <span className="text-xs font-extrabold text-slate-700 min-w-[32px]">{preferences.headerFontSize || 145}px</span>
                </div>

                <div className="h-3.5 w-px bg-slate-200 hidden sm:block"></div>

                {/* Line Spacing Control */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-extrabold text-slate-400 tracking-wider uppercase">Line Spacing</span>
                  <input 
                    type="range"
                    min="1.0"
                    max="2.5"
                    step="0.1"
                    value={preferences.headerLineSpacing || 1.2}
                    onChange={(e) => setPreferences(p => ({ ...p, headerLineSpacing: parseFloat(e.target.value) }))}
                    className="w-16 sm:w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <span className="text-xs font-extrabold text-slate-700 min-w-[28px]">{preferences.headerLineSpacing || 1.2}x</span>
                </div>

                <div className="h-3.5 w-px bg-slate-200 hidden sm:block"></div>

                {/* Theme Mode Control (Dark vs Light) */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 select-none">
                  <button
                    onClick={() => setPreferences(p => ({ ...p, headerTheme: 'light' }))}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      preferences.headerTheme === 'light'
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Light Mode (White Background & Black Text)"
                  >
                    <Sun size={11} />
                    <span>Light</span>
                  </button>
                  <button
                    onClick={() => setPreferences(p => ({ ...p, headerTheme: 'dark' }))}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      preferences.headerTheme !== 'light'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Dark Mode (Black Background & White Text)"
                  >
                    <Moon size={11} />
                    <span>Dark</span>
                  </button>
                </div>

                <div className="h-3.5 w-px bg-slate-200 hidden sm:block"></div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-extrabold text-slate-400 tracking-wider uppercase">Zoom</span>
                  <button 
                    onClick={() => setPreferences(p => ({ ...p, zoom: Math.max(50, p.zoom - 10) }))}
                    className="hover:bg-slate-100 p-1 rounded-full text-slate-600 transition-colors cursor-pointer"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <span className="text-xs font-extrabold text-slate-700 min-w-[28px] text-center">{preferences.zoom}%</span>
                  <button 
                    onClick={() => setPreferences(p => ({ ...p, zoom: Math.min(150, p.zoom + 10) }))}
                    className="hover:bg-slate-100 p-1 rounded-full text-slate-600 transition-colors cursor-pointer"
                  >
                    <ZoomIn size={13} />
                  </button>
                </div>
              </div>
            ) : (
              /* Full Poem HUD */
              <>
                {/* Zoom Slider Action panel */}
                <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg border border-slate-200 flex items-center gap-2.5">
                  <span className="text-[9px] font-extrabold text-slate-400 tracking-wider">ZOOM</span>
                  <button 
                    onClick={() => setPreferences(p => ({ ...p, zoom: Math.max(50, p.zoom - 10) }))}
                    className="hover:bg-slate-100 p-1 rounded-full text-slate-600 transition-colors cursor-pointer"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <span className="text-[11px] font-extrabold text-slate-700 min-w-[28px] text-center">{preferences.zoom}%</span>
                  <button 
                    onClick={() => setPreferences(p => ({ ...p, zoom: Math.min(150, p.zoom + 10) }))}
                    className="hover:bg-slate-100 p-1 rounded-full text-slate-600 transition-colors cursor-pointer"
                  >
                    <ZoomIn size={13} />
                  </button>
                </div>

                {/* Dynamic Font Range Indicators */}
                <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-slate-200 flex items-center gap-2">
                  <span className="text-[9px] font-extrabold text-slate-400 tracking-wider">FONT RANGE</span>
                  <span className="text-xs font-bold text-emerald-600">
                    {preferences.minFontSize}-{preferences.maxFontSize}pt
                  </span>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                  <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    Active: {mainFontSize}pt
                  </span>
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      {/* MODERN COMPACT STATUS BAR */}
      <footer className="h-7 bg-slate-100 border-t border-slate-200 px-4 flex items-center justify-between text-[11px] text-slate-500 shrink-0 select-none print:hidden z-20">
        <div className="flex items-center gap-4">
          <span>Ln {cursorInfo.line}, Col {cursorInfo.col}</span>
          <span className="text-emerald-600 flex items-center gap-1 font-semibold">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            HTML-First Paginator
          </span>
          <span className="text-slate-400 hidden sm:inline">Active Theme: {preferences.theme.toUpperCase()}</span>
        </div>
        
        {/* Dynamic bottom action metadata */}
        <div className="flex items-center gap-4 font-medium text-slate-400">
          <span>Hussayni {APP_VERSION}</span>
          <button 
            onClick={() => setShowAbout(true)}
            className="hover:text-slate-600 transition-colors cursor-pointer flex items-center gap-1"
          >
            <HelpCircle size={11} />
            <span>About</span>
          </button>
        </div>
      </footer>

      {/* SYSTEM TOAST ALERTS */}
      {toastMessage && (
        <div className="fixed bottom-20 left-6 z-[9999] bg-slate-900/95 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-2 select-none animate-fade-in">
          <CheckCircle size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SETTINGS PANEL DRAWERS */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-xs flex justify-end animate-fade-in print:hidden select-none">
          <div className="w-96 bg-white shadow-2xl h-full flex flex-col animate-slide-left overflow-hidden">
            {/* Drawer Header */}
            <div className="bg-[#0f172a] text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <SettingsIcon size={18} className="text-slate-400" />
                <h3 className="text-base font-bold tracking-tight">Hussayni settings</h3>
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-base font-medium p-1"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Panel Items */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* Theme Settings Selector */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Visual Interface Theme</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'slate', name: 'Slate Gray', color: 'bg-slate-700' },
                    { id: 'warm', name: 'Warm Sepia', color: 'bg-amber-700' },
                    { id: 'dark', name: 'Cosmic Dark', color: 'bg-slate-950' },
                    { id: 'classic', name: 'Monochrome', color: 'bg-neutral-400' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setPreferences(p => ({ ...p, theme: t.id as any }))}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                        preferences.theme === t.id 
                          ? 'border-emerald-500 bg-emerald-50/10 text-slate-900' 
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${t.color} shrink-0`}></span>
                      <span className="text-xs font-bold">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Document Settings */}
              <div className="space-y-5">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Document Settings</h4>

                {/* Subtitle: Font size */}
                <div className="space-y-3 pl-1">
                  <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Font size</h5>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>Minimum Page Font Size ({preferences.minFontSize}pt)</span>
                    </div>
                    <input 
                      type="range"
                      min="12"
                      max="24"
                      value={preferences.minFontSize}
                      onChange={(e) => setPreferences(p => ({ ...p, minFontSize: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>Maximum Page Font Size ({preferences.maxFontSize}pt)</span>
                    </div>
                    <input 
                      type="range"
                      min="24"
                      max="40"
                      value={preferences.maxFontSize}
                      onChange={(e) => setPreferences(p => ({ ...p, maxFontSize: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                </div>

                {/* Subtitle: Document paragraph spacing */}
                <div className="space-y-2 pl-1 pt-1">
                  <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Document paragraph spacing</h5>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                    {['compact', 'normal', 'relaxed'].map((sp) => (
                      <button
                        key={sp}
                        onClick={() => setPreferences(p => ({ ...p, paragraphSpacing: sp as any }))}
                        className={`py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                          preferences.paragraphSpacing === sp 
                            ? 'bg-white text-slate-900 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {sp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subtitle: Footer settings */}
                <div className="space-y-3 pl-1 pt-1">
                  <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Footer settings</h5>
                  
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-semibold text-slate-700">Display Page Numbers</span>
                    <input 
                      type="checkbox"
                      checked={preferences.showPageNumber !== false}
                      onChange={(e) => setPreferences(p => ({ ...p, showPageNumber: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>Footer Font Size ({preferences.footerFontSize || 14}px)</span>
                    </div>
                    <input 
                      type="range"
                      min="10"
                      max="20"
                      value={preferences.footerFontSize || 14}
                      onChange={(e) => setPreferences(p => ({ ...p, footerFontSize: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                </div>

                {/* Subtitle: Header Only Settings */}
                <div className="space-y-3 pl-1 pt-1 border-t border-slate-100">
                  <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Header Only (1920×1080) Settings</h5>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>Header Text Size ({preferences.headerFontSize || 145}px)</span>
                    </div>
                    <input 
                      type="range"
                      min="32"
                      max="220"
                      value={preferences.headerFontSize || 145}
                      onChange={(e) => setPreferences(p => ({ ...p, headerFontSize: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>Header Line Spacing ({preferences.headerLineSpacing || 1.2}x)</span>
                    </div>
                    <input 
                      type="range"
                      min="1.0"
                      max="2.5"
                      step="0.1"
                      value={preferences.headerLineSpacing || 1.2}
                      onChange={(e) => setPreferences(p => ({ ...p, headerLineSpacing: parseFloat(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>Header Theme</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPreferences(p => ({ ...p, headerTheme: 'light' }))}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border cursor-pointer transition-all ${
                          preferences.headerTheme === 'light'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Sun size={13} />
                        <span>Light (White)</span>
                      </button>
                      <button
                        onClick={() => setPreferences(p => ({ ...p, headerTheme: 'dark' }))}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border cursor-pointer transition-all ${
                          preferences.headerTheme !== 'light'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Moon size={13} />
                        <span>Dark (Black)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Editor panel customizations */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Editor Settings</h4>
                
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-semibold text-slate-700">Display Gutter Line Numbers</span>
                  <input 
                    type="checkbox"
                    checked={preferences.showLineNumbers}
                    onChange={(e) => setPreferences(p => ({ ...p, showLineNumbers: e.target.checked }))}
                    className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-semibold text-slate-700">Show Layout Validation Overlay</span>
                  <input 
                    type="checkbox"
                    checked={preferences.showDebug}
                    onChange={(e) => setPreferences(p => ({ ...p, showDebug: e.target.checked }))}
                    className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Editor Typing Font Size ({preferences.editorFontSize}px)</span>
                  </div>
                  <input 
                    type="range"
                    min="11"
                    max="20"
                    value={preferences.editorFontSize}
                    onChange={(e) => setPreferences(p => ({ ...p, editorFontSize: parseInt(e.target.value) }))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>

              {/* How to Use Guide */}
              <div className="space-y-2.5 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowHowToUse(!showHowToUse)}
                  className="w-full flex items-center justify-between text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-400 uppercase tracking-wider group-hover:text-emerald-600 transition-colors">
                    <BookOpen size={13} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                    <span>How to Use Guide</span>
                  </div>
                  <ChevronDown 
                    size={13} 
                    className={`text-slate-400 transition-transform duration-150 ${showHowToUse ? 'rotate-180' : ''}`} 
                  />
                </button>

                {showHowToUse && (
                  <div className="bg-slate-50 p-3.5 rounded-xl text-xs text-slate-600 leading-relaxed border border-slate-100/80 space-y-2.5 animate-fade-in select-text">
                    <p className="font-bold text-slate-800">
                      Welcome to Hussayni Typesetter System
                    </p>
                    <p>
                      This system compiles specialized Arabic markup text into A4-sized paginated pages in real-time.
                    </p>
                    <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-100">
                      <p className="font-extrabold text-[10px] text-slate-500 uppercase tracking-wide">Essential Markups</p>
                      <ul className="space-y-1.5 pl-0.5">
                        <li className="flex items-start gap-1.5">
                          <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-mono text-[10px] shrink-0 font-bold">H =</code>
                          <span className="text-[11px] text-slate-500">Main Header/Title block. Renders bold centered display text.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-mono text-[10px] shrink-0 font-bold">B =</code>
                          <span className="text-[11px] text-slate-500">Body text block. Renders RTL Arabic paragraphs/verses.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-mono text-[10px] shrink-0 font-bold">F =</code>
                          <span className="text-[11px] text-slate-500">Subtitle/Commentary/Footnotes. Hidden in document exports.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-mono text-[10px] shrink-0 font-bold">P</code>
                          <span className="text-[11px] text-slate-500">Standalone line. Forces an immediate layout page break.</span>
                        </li>
                      </ul>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Adjust font sizes and margins in <strong className="text-slate-700">Document Settings</strong> to resolve horizontal overflows instantly.
                    </p>
                  </div>
                )}
              </div>

              {/* STORAGE AND SETTINGS PREFERENCES ACTIONS */}
              <div className="space-y-2.5 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Local Storage Backup Profiles</h4>
                
                <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                  <span>Used Storage Budget:</span>
                  <span className="font-bold text-slate-700">{storageUsage} KB</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleExportPreferences}
                    className="border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Export all preferences, cache drafts, and window states to file"
                  >
                    <Download size={13} />
                    <span>Export Backup</span>
                  </button>
                  <button
                    onClick={handleImportPreferencesClick}
                    className="border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Import backup files to restore active work states"
                  >
                    <Upload size={13} />
                    <span>Import Backup</span>
                  </button>
                </div>

                {/* Hard reset action */}
                <button
                  onClick={handleClearAllData}
                  className="w-full mt-2 border border-rose-200 hover:bg-rose-50 text-rose-700 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Factory Hard Reset (Wipe Cache)</span>
                </button>
              </div>

              {/* Dynamic PWA Status Badge */}
              <div className="bg-slate-50 p-4 rounded-xl space-y-1.5 select-none text-[11px] text-slate-500 border border-slate-100">
                <p className="font-bold text-slate-700">PWA STATUS MANAGER</p>
                <div className="flex justify-between">
                  <span>Installation state:</span>
                  <span className="font-bold text-slate-700">
                    {pwa.isInstalled ? 'Installed Native App' : 'Web-Standard Browser View'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Offline Service Worker:</span>
                  <span className="font-bold text-slate-700">
                    {pwa.offlineReady ? 'Active Cache Ready' : 'Running Sync Mode'}
                  </span>
                </div>
                {pwa.isInstallable && (
                  <button
                    onClick={pwa.installApp}
                    className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Install Hussayni PWA App
                  </button>
                )}
              </div>
            </div>

            {/* Drawer Footer info */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[10px] text-slate-400">
              <span>Hussayni typesetter engine v1.5.0</span>
              <button 
                onClick={() => { setShowSettings(false); setShowAbout(true); }}
                className="text-emerald-600 font-bold hover:underline cursor-pointer"
              >
                View App About
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT OPTIONS CONSOLE MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col animate-fade-in">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Printer size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight">Compile &amp; Export Document</h3>
                </div>
              </div>
              <button 
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-lg font-medium p-1"
              >
                ✕
              </button>
            </div>

            {/* Options list */}
            <div className="p-6 space-y-4">
              
              {/* Quick Settings within Export Modal */}
              <div className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="text-slate-500 shrink-0">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">File name date &amp; time stamp</h4>
                    <p className="text-[10px] text-slate-500">e.g., filename_2026-07-21_05-05.docx</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={preferences.includeExportTimestamp !== false}
                    onChange={(e) => setPreferences(p => ({ ...p, includeExportTimestamp: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Option A: PDF Vector layout */}
              <div className="border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/5 p-4 rounded-xl transition-all duration-150 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 select-none">
                  <Printer size={18} />
                </div>
                <div className="flex-grow">
                  <h4 className="font-extrabold text-sm text-slate-900">High-Fidelity PDF Document</h4>
                  <button
                    onClick={handleLaunchPrint}
                    className="mt-3 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Printer size={12} />
                    <span>Launch PDF Print Settings</span>
                  </button>
                </div>
              </div>

              {/* Option B: Microsoft Word Document (.docx) */}
              <div className="border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/5 p-4 rounded-xl transition-all duration-150 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 select-none">
                  <FileText size={18} />
                </div>
                <div className="flex-grow">
                  <h4 className="font-extrabold text-sm text-slate-900">Microsoft Word Document (.docx)</h4>
                  <button
                    onClick={handleLaunchDocx}
                    disabled={isGeneratingDocx}
                    className="mt-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-[11px] font-bold px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    {isGeneratingDocx ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Download size={12} />
                    )}
                    <span>{isGeneratingDocx ? "Compiling XML..." : "Compile & Download .docx"}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* SYSTEM ABOUT DIALOG MODAL */}
      {showAbout && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col animate-fade-in">
            {/* Visual Header */}
            <div className="bg-slate-900 text-white p-6 flex flex-col items-center gap-2 relative">
              <button 
                onClick={() => setShowAbout(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer text-base font-medium p-1"
              >
                ✕
              </button>
              
              {/* Scalable logo representation */}
              <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-3xl font-extrabold text-white shadow-xl">
                H
              </div>
              <h3 className="text-lg font-extrabold tracking-tight mt-2">Hussayni</h3>
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">HTML-First typesetting compiler</p>
            </div>

            {/* App Meta Info */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed text-center font-medium">
                A 100% browser-based paginator and formatting typesetter designed for classical Arabic document structures. No external layout models or background databases are required.
              </p>

              <div className="border-t border-b border-slate-100 py-3.5 space-y-2 text-[11px] text-slate-500">
                <div className="flex justify-between">
                  <span>Active Release Version:</span>
                  <span className="font-extrabold text-slate-800">v{APP_VERSION}</span>
                </div>
                <div className="flex justify-between">
                  <span>Production Build Date:</span>
                  <span className="font-extrabold text-slate-800">{BUILD_DATE}</span>
                </div>
                <div className="flex justify-between">
                  <span>Git commit:</span>
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-extrabold">{COMMIT_HASH}</span>
                </div>
                <div className="flex justify-between">
                  <span>Host Target Sandbox:</span>
                  <span className="font-extrabold text-slate-800 uppercase">{BUILD_ENV}</span>
                </div>
                <div className="flex justify-between">
                  <span>Local connection:</span>
                  <span className="font-bold text-slate-700">
                    {pwa.isOffline ? '🔴 Offline Cache Mode' : '🟢 Secure Network Active'}
                  </span>
                </div>
              </div>

              <div className="text-center space-y-1.5">
                <p className="text-[10px] text-slate-400">
                  Copyright © 2026 Hussayni Typesetting Systems.
                </p>
                <a 
                  href="https://github.com/hussayni/compiler" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs font-bold text-emerald-600 hover:underline inline-flex items-center gap-1"
                >
                  <span>Open GitHub Repository</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF PRINT INSTRUCTION TOAST BANNER OVERLAY */}
      {showPrintToast && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none print:hidden">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm text-center border border-slate-100 flex flex-col items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shadow-sm shrink-0 select-none">
              <Printer size={22} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Print settings</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Before printing, please verify the following settings in your browser's dialog:
              </p>
              <ul className="text-left text-[11px] text-slate-600 mt-3 space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-100 list-disc pl-4 font-semibold">
                <li>Printer <span className="text-rose-600 font-bold">Destination</span>: <span className="bg-rose-50 px-1.5 py-0.5 rounded text-rose-800 text-[10px]">Save as PDF</span></li>
                <li>Paper dimensions: <span className="font-bold">A4</span></li>
                <li>Margins: <span className="font-bold">None</span></li>
                <li>Enable <span className="font-bold text-slate-800">Background graphics</span></li>
              </ul>
            </div>

            {/* Interactive controls */}
            <div className="w-full space-y-3.5 mt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 cursor-pointer justify-center select-none">
                <input 
                  type="checkbox" 
                  checked={neverShowAgain} 
                  onChange={(e) => setNeverShowAgain(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 border-slate-300 w-4 h-4 cursor-pointer"
                />
                <span>Never show this again</span>
              </label>

              <div className="flex gap-2.5 w-full">
                <button
                  onClick={() => setShowPrintToast(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (neverShowAgain) {
                      localStorage.setItem('hussayni_never_show_print_toast', 'true');
                    }
                    setShowPrintToast(false);
                    
                    // Trigger native printing
                    const originalTitle = document.title;
                    const hasTimestamp = preferences.includeExportTimestamp === true;
                    const baseName = getSanitizedDocName();
                    document.title = hasTimestamp 
                      ? `${baseName}_${getFormattedTimestamp()}` 
                      : baseName;

                    const isHeaderMode = preferences.outputMode === 'H';
                    if (isHeaderMode) {
                      document.body.classList.add('mode-header-only');
                    }

                    triggerSystemPrint(
                      () => {},
                      () => {
                        document.title = originalTitle;
                        if (isHeaderMode) {
                          document.body.classList.remove('mode-header-only');
                        }
                      }
                    );
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2 rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL OVERLAY */}
      {confirmConfig && (
        <div className="fixed inset-0 z-[1100] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden select-none">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-5 ${themeClasses.cardBg} animate-scale-in`}>
            <h3 className="text-sm font-bold tracking-tight mb-2">{confirmConfig.title}</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">{confirmConfig.message}</p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setConfirmConfig(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-slate-500"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmConfig.onConfirm();
                  setConfirmConfig(null);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all cursor-pointer ${themeClasses.accentBg} ${themeClasses.accentHover}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
