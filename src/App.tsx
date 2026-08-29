import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Minus,
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
  Moon,
  Image,
  X,
  UploadCloud,
  CheckCircle2,
  Globe
} from 'lucide-react';
import { parseMarkup } from './utils/parser';
import { paginateDocument } from './utils/paginator';
import { DocumentRenderer, HeaderOnlyRenderer } from './utils/renderer';
import { triggerSystemPrint } from './utils/pdfExport';
import { generateDocxBlob } from './utils/docxGenerator';
import { exportAllHeaderImages } from './utils/imageExporter';
import { usePwa } from './utils/usePwa';
import { 
  ParsedPage, 
  ValidationError, 
  UserPreferences, 
  DEFAULT_PREFERENCES,
  RecentDocument
} from './utils/documentModel';
import { MobileFooterSheet } from './components/MobileFooterSheet';
import { MobileBottomToolbar } from './components/MobileBottomToolbar';
import { MobilePreviewToolbar, ActivePopup } from './components/MobilePreviewToolbar';
import { DesktopPreviewToolbar } from './components/DesktopPreviewToolbar';
import { DesktopEditorToolbar } from './components/DesktopEditorToolbar';

// Injected globals from Vite define, with safe development fallbacks
const APP_VERSION = '2.0.0';
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
  const [dismissedUpdate, setDismissedUpdate] = useState(false);

  // Document & Code States
  const [code, setCode] = useState<string>(() => {
    const saved = localStorage.getItem('hussayni_markup');
    return saved !== null ? saved : DEFAULT_MARKUP;
  });

  const [docName, setDocName] = useState<string>(() => {
    return localStorage.getItem('hussayni_doc_name') || 'Poem_Name';
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
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // On mobile viewport, default showLineNumbers to false unless explicitly saved as a custom preference
        if (isMobileViewport && parsed.showLineNumbers === undefined) {
          parsed.showLineNumbers = false;
        }
        return { 
          ...DEFAULT_PREFERENCES, 
          ...(isMobileViewport ? { showLineNumbers: false, zoom: 50 } : {}), 
          ...parsed 
        };
      } catch (e) {
        return isMobileViewport ? { ...DEFAULT_PREFERENCES, showLineNumbers: false, zoom: 50 } : DEFAULT_PREFERENCES;
      }
    }
    return isMobileViewport ? { ...DEFAULT_PREFERENCES, showLineNumbers: false, zoom: 50 } : DEFAULT_PREFERENCES;
  });

  // Mobile Preview Active Popup type
  const [activePreviewPopup, setActivePreviewPopup] = useState<ActivePopup>('none');
  const isPreviewPopupOpen = activePreviewPopup !== 'none';

  // Desktop Editor Resizable Width (Minimum 450px)
  const [editorWidth, setEditorWidth] = useState<number>(450);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const handleMouseDownResizer = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(450, Math.min(e.clientX, window.innerWidth - 320));
      setEditorWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Launch Title Splash state: title appears on launch for 2 seconds then smoothly cross-fades to current filename
  const [isSplashTitle, setIsSplashTitle] = useState<boolean>(true);
  // Document save status state: 'saved' | 'saving' | 'unsaved'
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedMarkup, setLastSavedMarkup] = useState<string>('');
  // Mobile Footer Settings Bottom Sheet state
  const [showMobileFooterSheet, setShowMobileFooterSheet] = useState<boolean>(false);

  useEffect(() => {
    // Cross-fade launch title after exactly 2 seconds
    const timer = setTimeout(() => {
      setIsSplashTitle(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Layout and compiled pages
  const [pages, setPages] = useState<ParsedPage[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isPaginating, setIsPaginating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [vvHeight, setVvHeight] = useState<number | null>(null);
  const [isEditorFocused, setIsEditorFocused] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setVvHeight(null);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;

    const handleVvChange = () => {
      setVvHeight(vv.height);
    };

    vv.addEventListener('resize', handleVvChange);
    vv.addEventListener('scroll', handleVvChange);
    handleVvChange();

    return () => {
      vv.removeEventListener('resize', handleVvChange);
      vv.removeEventListener('scroll', handleVvChange);
    };
  }, [isMobile]);

  const isKeyboardActive = isMobile && (isEditorFocused || (vvHeight !== null && (window.innerHeight - vvHeight > 100)));

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

  // Track modifications for save status
  useEffect(() => {
    if (lastSavedMarkup && (code !== lastSavedMarkup)) {
      setSaveStatus('unsaved');
    }
  }, [code, docName, leftFooterText, rightFooterText]);

  // Persist content & updates to Local Storage (Autosave)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSaveStatus('saving');
      localStorage.setItem('hussayni_markup', code);
      localStorage.setItem('hussayni_doc_name', docName);
      localStorage.setItem('hussayni_left_footer', leftFooterText);
      localStorage.setItem('hussayni_right_footer', rightFooterText);
      
      const now = new Date();
      localStorage.setItem('hussayni_autosave_time', now.toISOString());
      updateStorageUsage();
      setLastSavedMarkup(code);

      setTimeout(() => {
        setSaveStatus('saved');
      }, 350);
    }, 1000);

    return () => clearTimeout(timer);
  }, [code, docName, leftFooterText, rightFooterText]);

  // Persist preferences to Local Storage
  useEffect(() => {
    localStorage.setItem('hussayni_preferences', JSON.stringify(preferences));
    updateStorageUsage();
  }, [preferences]);

  // Dynamic theme-color meta tag update for Android PWA / status bar and navigation bar sync
  useEffect(() => {
    let themeColor = '#020617'; // default slate (slate-950)
    if (preferences.theme === 'warm') themeColor = '#3e2723';
    else if (preferences.theme === 'dark') themeColor = '#030712';
    else if (preferences.theme === 'classic') themeColor = '#171717';

    // Update the meta theme-color tag in document head
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.getElementsByTagName('head')[0].appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', themeColor);
  }, [preferences.theme]);

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
        setDocName('Poem_Name');
        setCode('');
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
    if (preferences.outputMode === 'H') {
      triggerToast("PDF Print is disabled in Header Mode (use PNG/JPG slide export)");
      return;
    }
    setShowExportModal(false);
    const neverShow = localStorage.getItem('hussayni_never_show_print_toast') === 'true';

    if (neverShow) {
      const originalTitle = document.title;
      const hasTimestamp = preferences.includeExportTimestamp === true;
      const baseName = getSanitizedDocName();
      document.title = hasTimestamp 
        ? `${baseName}_${getFormattedTimestamp()}` 
        : baseName;

      triggerSystemPrint(
        () => {},
        () => {
          document.title = originalTitle;
        }
      );
    } else {
      setShowPrintToast(true);
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
      setDocName('Poem_Name');
      setLeftFooterText('');
      setRightFooterText('');
      setRecentDocs([]);
      setPreferences(DEFAULT_PREFERENCES);
      setShowSettings(false);
      triggerToast("Application data reset successfully!");
    }
  };

  // Mobile Bottom Toolbar Helpers
  const handleInsertTag = (prefix: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    
    const before = val.substring(0, start);
    const needsNewline = before.length > 0 && !before.endsWith('\n');
    const inserted = (needsNewline ? '\n' : '') + prefix;
    
    // Check if the textarea is focused
    const isFocused = document.activeElement === textarea;
    if (!isFocused) {
      textarea.focus();
    }
    
    try {
      // Execute native insert command to preserve undo/redo history stack!
      const success = document.execCommand('insertText', false, inserted);
      if (!success) {
        throw new Error('execCommand returned false');
      }
    } catch (e) {
      // Fallback to manual insertion if execCommand is not supported
      const after = val.substring(end);
      const newCode = before + inserted + after;
      setCode(newCode);
      
      setTimeout(() => {
        const newPos = start + inserted.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 10);
    }
  };

  const handleUndo = () => {
    if (textareaRef.current) {
      document.execCommand('undo');
    }
  };

  const handleRedo = () => {
    if (textareaRef.current) {
      document.execCommand('redo');
    }
  };

  const handleClearText = () => {
    if (!code.trim()) return;
    setConfirmConfig({
      title: "Clear Editor",
      message: "Are you sure you want to clear all text in the editor?",
      onConfirm: () => {
        setCode('');
        triggerToast("Editor cleared successfully");
      }
    });
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
    <div 
      id="app-container" 
      className={`relative flex flex-col h-screen h-[100dvh] ${themeClasses.appBg} font-sans overflow-hidden transition-colors duration-200`}
      style={{ height: isMobile && vvHeight ? `${vvHeight}px` : undefined }}
    >
      
      {/* Dynamic Hidden File Inputs */}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".txt" className="hidden" />
      <input type="file" ref={settingsInputRef} onChange={handleImportPreferencesChange} accept=".json" className="hidden" />

      {/* SERVICE WORKER PWA UPDATE BANNER */}
      {pwa.needRefresh && !dismissedUpdate && (
        <div className="bg-emerald-700 text-white px-4 sm:px-6 h-[calc(3.5rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] flex items-center justify-between shadow-md z-[99999] select-none shrink-0 border-b border-white/10 animate-fade-in print:hidden">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Sparkles className="text-emerald-300 animate-pulse shrink-0" size={16} />
            <span className="text-xs sm:text-sm font-bold tracking-wide truncate">
              New version available!
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => pwa.updateServiceWorker(true)}
              className="bg-white text-emerald-800 hover:bg-emerald-50 px-3 py-1 rounded-lg text-xs font-black transition-all duration-150 shadow-xs cursor-pointer h-8 flex items-center"
            >
              Update
            </button>
            <button
              onClick={() => { 
                setDismissedUpdate(true); 
                triggerToast("Update delayed. Will apply next time you open the app."); 
                pwa.updateServiceWorker(false);
              }}
              className="text-white/80 hover:text-white px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-white/10 transition-all cursor-pointer h-8 flex items-center"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* HEADER CONTROLS */}
      <header className={`${pwa.needRefresh && !dismissedUpdate ? 'h-14 pt-0' : 'h-[calc(3.5rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)]'} ${themeClasses.headerBg} flex items-center justify-between px-2 sm:px-6 shadow-md shrink-0 select-none print:hidden z-30 relative`}>
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 mr-4">
          
          {/* Logo Button */}
          <div
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-base sm:text-lg text-white shrink-0 bg-emerald-600 shadow-md shadow-emerald-600/20 ring-1 ring-emerald-500/30 select-none"
          >
            H
          </div>
          
          {/* App Title & Subtitle with 2-second Launch Fade Effect to Filename & Save Status */}
          <div className="relative flex items-center min-w-0 flex-1">
            {/* Launch Splash Title: "Hussayni Editor" (0 to 2s) */}
            <div 
              className={`transition-all duration-700 ease-in-out select-none flex items-center ${
                isSplashTitle 
                  ? 'opacity-100 scale-100 pointer-events-auto' 
                  : 'opacity-0 scale-95 pointer-events-none absolute left-0 top-1/2 -translate-y-1/2'
              }`}
            >
              <h1 className="text-white font-extrabold text-xs sm:text-sm leading-tight tracking-wide whitespace-nowrap">
                Hussayni Editor
              </h1>
            </div>

            {/* Filename (Cross-fades in after 2s) */}
            <div 
              className={`flex items-center gap-2 transition-all duration-700 ease-in-out min-w-0 flex-1 ${
                !isSplashTitle 
                  ? 'opacity-100 scale-100 pointer-events-auto' 
                  : 'opacity-0 scale-95 pointer-events-none absolute left-0 top-1/2 -translate-y-1/2'
              }`}
            >
              <input 
                type="text"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                style={{ 
                  width: `${Math.max(8, (docName || '').length + 1)}ch`
                }}
                className="bg-transparent text-white font-mono font-bold text-[11px] min-[400px]:text-xs sm:text-sm outline-none focus:border-b focus:border-emerald-400 p-0 m-0 truncate min-w-0 max-w-[110px] min-[360px]:max-w-[160px] min-[400px]:max-w-[210px] sm:max-w-[280px] md:max-w-[400px] lg:max-w-[550px] xl:max-w-[750px]"
                title="Click to rename document"
                placeholder="Poem_Name"
              />
            </div>
          </div>
        </div>

        {/* Workspace Quick Actions */}
        <div className={`flex items-center gap-1 sm:gap-1.5 shrink-0 transition-opacity duration-500 ${isSplashTitle ? 'opacity-90' : 'opacity-100'}`}>
          
          {/* Recent Document Selector Dropdown (Desktop) */}
          {!isMobile && (
            <div className="relative">
              <button 
                onClick={() => {
                  setShowRecentMenu(!showRecentMenu);
                  setShowFileMenu(false);
                }}
                className="px-2 py-1.5 sm:px-3 sm:py-1.5 hover:bg-white/10 rounded text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 text-slate-200 cursor-pointer"
                title="Switch to previously saved workbooks"
              >
                <History size={14} className="text-purple-400" />
                <span className="hidden md:inline">History</span>
                <ChevronDown size={11} className={`transition-transform duration-150 ${showRecentMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Recent Document Drafts Dropdown directly anchored under History button */}
              {showRecentMenu && (
                <div className="absolute top-full right-0 mt-1.5 w-64 sm:w-72 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-2.5 z-50 text-slate-200 select-none">
                  <p className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
                    <span>Recent Drafts ({recentDocs.length})</span>
                    <button 
                      onClick={() => setShowRecentMenu(false)}
                      className="text-slate-500 hover:text-slate-300 text-xs px-1"
                    >
                      ✕
                    </button>
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
                              <p className="text-xs font-mono font-bold truncate">{doc.name}</p>
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
          )}

          <div className="h-4 w-px bg-slate-700 mx-0.5 sm:mx-1 hidden sm:block"></div>

          {isMobile ? (
            /* Collapsible Mobile Actions Dropdown */
            <div className="relative">
              <button 
                onClick={() => {
                  if (showRecentMenu) {
                    setShowRecentMenu(false);
                  } else {
                    setShowFileMenu(!showFileMenu);
                  }
                }}
                className="p-1.5 min-[400px]:px-2 min-[400px]:py-1.5 hover:bg-white/10 rounded text-xs font-semibold transition-all duration-150 flex items-center gap-1 text-slate-200 cursor-pointer"
                title="File Actions"
              >
                <MoreVertical size={14} className="text-slate-400" />
                <span className="hidden min-[400px]:inline">File</span>
                <ChevronDown size={11} className={`transition-transform duration-150 ${showFileMenu || showRecentMenu ? 'rotate-180' : ''} hidden min-[400px]:inline`} />
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
                  <button
                    onClick={() => {
                      setShowRecentMenu(true);
                      setShowFileMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer text-slate-200"
                  >
                    <History size={14} className="text-purple-400" />
                    <span>History</span>
                  </button>
                </div>
              )}
              {showRecentMenu && (
                <div className="absolute top-10 right-0 w-64 sm:w-72 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-2.5 z-50 text-slate-200 select-none">
                  <p className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
                    <span>Recent Drafts ({recentDocs.length})</span>
                    <button 
                      onClick={() => setShowRecentMenu(false)}
                      className="text-slate-500 hover:text-slate-300 text-xs px-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </p>
                  <div className="mt-1.5 space-y-0.5 max-h-60 overflow-y-auto">
                    {recentDocs.length === 0 ? (
                      <p className="text-xs text-slate-500 p-3 text-center">No cached document logs found.</p>
                    ) : (
                      recentDocs.map((doc) => (
                        <div 
                          key={doc.id}
                          onClick={() => {
                            handleLoadRecent(doc);
                            setShowRecentMenu(false);
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-left ${
                            doc.name === docName ? 'bg-emerald-950/40 text-emerald-300' : 'hover:bg-white/5 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                             <FileText size={13} className="shrink-0 text-slate-500" />
                            <div className="overflow-hidden">
                              <p className="text-xs font-mono font-bold truncate">{doc.name}</p>
                              <p className="text-[9px] text-slate-500">
                                {new Date(doc.lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRecent(doc.id, e);
                            }}
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
          ) : (
            <>
              <button 
                onClick={handleNew}
                className="px-2 py-1.5 sm:px-3 sm:py-1.5 hover:bg-white/10 rounded text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 text-slate-200 cursor-pointer"
                title="Create a fresh workbook canvas"
              >
                <Plus size={14} className="text-emerald-400" />
                <span className="hidden sm:inline">New</span>
              </button>
              
              <button 
                onClick={handleOpenClick}
                className="px-2 py-1.5 sm:px-3 sm:py-1.5 hover:bg-white/10 rounded text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 text-slate-200 cursor-pointer"
                title="Upload custom text file with Hussayni tags"
              >
                <FolderOpen size={14} className="text-blue-400" />
                <span className="hidden sm:inline">Open</span>
              </button>

              <button 
                onClick={handleSaveSource}
                className="px-2 py-1.5 sm:px-3 sm:py-1.5 hover:bg-white/10 rounded text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 text-slate-200 cursor-pointer"
                title="Download source text file markup directly"
              >
                <Save size={14} className="text-amber-400" />
                <span className="hidden sm:inline">Save</span>
              </button>
            </>
          )}

          <div className="h-4 w-px bg-slate-700 mx-0.5 sm:mx-1 hidden sm:block"></div>

          {/* Status Badges Group */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0 select-none">
            {/* Save Status Badge */}
            <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/80 shrink-0">
              {saveStatus === 'saving' && (
                <span className="text-amber-400 flex items-center gap-1 animate-pulse">
                  <Loader2 size={10} className="animate-spin" />
                  <span>Saving…</span>
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={10} />
                  <span>Saved</span>
                </span>
              )}
              {saveStatus === 'unsaved' && (
                <span className="text-slate-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span>Unsaved</span>
                </span>
              )}
            </div>

            {/* Connection badge */}
            {pwa.isOffline ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <WifiOff size={10} />
                <span>Offline</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <Wifi size={10} />
                <span>Connected</span>
              </span>
            )}

            {/* Offline PWA Ready check */}
            {pwa.offlineReady && (
              <span className="text-[10px] text-slate-400 font-medium hidden lg:inline shrink-0">
                (Cached)
              </span>
            )}
          </div>

          <div className="h-4 w-px bg-slate-700 mx-0.5 sm:mx-1 hidden md:block"></div>

          {/* PERSISTENT EXPORT ACTION BUTTON */}
          <button 
            onClick={() => setShowExportModal(true)}
            className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 p-1.5 min-[400px]:px-2.5 min-[400px]:py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 sm:gap-1.5 shadow-md cursor-pointer shrink-0"
            title="Export compiled document to PDF or DOCX"
          >
            <Download size={14} className="shrink-0" />
            <span className="font-black hidden min-[400px]:inline">Export</span>
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

      {/* MAIN WORKSPACE CONTENT */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
        
        {/* OPTION 4: FLOATING OVERLAY SWITCHER FOR MOBILE (Bottom Center) */}
        <AnimatePresence>
          {isMobile && !isPreviewPopupOpen && (
            <motion.div
              key="mobile-tab-switcher"
              initial={{ 
                opacity: 0, 
                y: 15, 
                x: '-50%', 
                scale: 0.9,
                bottom: isKeyboardActive 
                  ? '3.25rem' 
                  : 'calc(3.25rem + env(safe-area-inset-bottom))'
              }}
              animate={{ 
                opacity: 1, 
                y: 0, 
                x: '-50%', 
                scale: 1,
                bottom: isKeyboardActive 
                  ? '3.25rem' 
                  : 'calc(3.25rem + env(safe-area-inset-bottom))'
              }}
              exit={{ 
                opacity: 0, 
                y: 12, 
                scale: 0.92,
                transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } 
              }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="absolute left-1/2 z-[45] bg-slate-900 p-1 rounded-full border border-slate-700/80 flex items-center shadow-2xl select-none print:hidden"
            >
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className="relative px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer overflow-hidden"
              >
                {activeTab === 'editor' && (
                  <motion.div
                    layoutId="activeTabBg"
                    className="absolute inset-0 bg-emerald-500 z-0 rounded-full"
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  />
                )}
                <span className={`relative z-10 flex items-center gap-1.5 transition-colors duration-150 ${
                  activeTab === 'editor' ? 'text-slate-950 font-black' : 'text-slate-300 hover:text-white'
                }`}>
                  <FileText size={13} />
                  <span>Editor</span>
                  {errors.filter(e => e.severity === 'error').length > 0 && (
                    <span className="bg-rose-500 text-white text-[8px] font-black px-1 rounded-full min-w-[14px] text-center">
                      {errors.filter(e => e.severity === 'error').length}
                    </span>
                  )}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className="relative px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer overflow-hidden"
              >
                {activeTab === 'preview' && (
                  <motion.div
                    layoutId="activeTabBg"
                    className="absolute inset-0 bg-emerald-500 z-0 rounded-full"
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  />
                )}
                <span className={`relative z-10 flex items-center gap-1.5 transition-colors duration-150 ${
                  activeTab === 'preview' ? 'text-slate-950 font-black' : 'text-slate-300 hover:text-white'
                }`}>
                  <BookOpen size={13} />
                  <span>Preview</span>
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      
        {/* LEFT COMPARTMENT: MARKUP TEXT EDITOR */}
        <section 
          style={!isMobile ? { width: `${editorWidth}px` } : undefined}
          className={`flex-1 h-full w-full lg:flex-none flex-col border-r border-slate-200 ${themeClasses.editorBg} print:hidden lg:shrink-0 min-h-0 ${isMobile && activeTab !== 'editor' ? 'hidden' : 'flex'}`}
        >
          
          {/* DESKTOP EDITOR TOOLBAR (Desktop only) */}
          {!isMobile && (
            <DesktopEditorToolbar
              onInsertTag={handleInsertTag}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onClear={handleClearText}
              onOpenMore={() => setShowMobileFooterSheet(true)}
            />
          )}
          
          {/* SCROLLABLE EDITOR CONTAINER */}
          <div className={`flex-1 flex relative overflow-hidden bg-transparent min-h-0 ${preferences.editorRtl ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Gutter Line Numbers Column */}
            {preferences.showLineNumbers && (
              <div 
                ref={lineNumbersRef}
                className={`w-8 pt-2.5 sm:pt-4 pb-28 sm:pb-8 select-none overflow-hidden font-mono leading-[21px] text-[11px] shrink-0 ${themeClasses.gutterBg} ${
                  preferences.editorRtl 
                    ? 'text-left pl-1.5 border-l' 
                    : 'text-right pr-1.5 border-r'
                }`}
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
              onFocus={() => setIsEditorFocused(true)}
              onBlur={() => setIsEditorFocused(false)}
              onScroll={handleScroll}
              onKeyUp={handleCursorMove}
              onSelect={handleCursorMove}
              onClick={handleCursorMove}
              spellCheck={false}
              dir={preferences.editorRtl ? "rtl" : "ltr"}
              wrap="off"
              className={`flex-1 p-3.5 pt-2.5 sm:p-4 pb-28 sm:pb-8 bg-transparent resize-none overflow-auto outline-none border-none focus:ring-0 font-mono leading-[21px] whitespace-pre min-w-0 ${themeClasses.editorText}`}
              style={{ fontSize: `${preferences.editorFontSize}px` }}
              placeholder={`H\nالمستهل\nB\nالفقرة\nF\nالرباط`}
            />
          </div>

          {/* BOTTOM ERROR & VALIDATION LOG DRAWER */}
          {preferences.showCompilationLog !== false && (
            <div className={`${isLogCollapsed ? 'h-9' : 'h-44'} border-t flex flex-col shrink-0 ${themeClasses.validationBodyBg} transition-all duration-150 overflow-hidden`}>
              <div 
                onClick={() => setIsLogCollapsed(!isLogCollapsed)}
                className={`px-4 py-2 text-[9px] font-bold uppercase tracking-wider flex items-center justify-between select-none ${themeClasses.validationHeaderBg} cursor-pointer hover:bg-black/5 dark:hover:bg-white/5`}
              >
                <div className="flex items-center gap-1.5">
                  <ChevronDown size={11} className={`transition-transform duration-150 text-slate-400 ${isLogCollapsed ? '' : 'rotate-180'}`} />
                  <span>Hussayni Compilation Log</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    errors.filter(e => e.severity === 'error').length > 0 
                      ? themeClasses.validationErrorBg 
                      : `${themeClasses.validationSuccessText} bg-emerald-100/10`
                  }`}>
                    {errors.filter(e => e.severity === 'error').length} Errors
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreferences(p => ({ ...p, showCompilationLog: false }));
                    }}
                    className="text-slate-400 hover:text-slate-200 p-0.5 rounded cursor-pointer"
                    title="Hide Log Panel"
                  >
                    <X size={12} />
                  </button>
                </div>
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
          )}
        </section>

        {/* DESKTOP RESIZER BAR BETWEEN EDITOR AND PREVIEW */}
        {!isMobile && (
          <div
            onMouseDown={handleMouseDownResizer}
            className={`hidden lg:flex w-2.5 hover:w-3 bg-slate-800/30 hover:bg-emerald-500/80 active:bg-emerald-500 cursor-col-resize shrink-0 transition-all duration-150 items-center justify-center group select-none z-30 border-r border-slate-700/50 ${
              isResizing ? 'bg-emerald-500 w-3' : ''
            }`}
            title="Drag to adjust editor width (Minimum: 450px)"
          >
            <div className="w-0.5 h-10 bg-slate-500 group-hover:bg-white rounded-full transition-colors"></div>
          </div>
        )}

        {/* RIGHT COMPARTMENT: INTERACTIVE REAL-TIME PAGE TYPESETTER PREVIEW */}
        <section 
          id="preview-section"
          onClick={() => {
            if (isMobile && activePreviewPopup !== 'none') {
              setActivePreviewPopup('none');
            }
          }}
          className={`flex-1 ${themeClasses.workspaceBg} p-4 sm:p-6 pb-20 sm:pb-6 flex-col items-center overflow-y-auto relative scroll-smooth print:p-0 print:bg-white print:overflow-visible print:absolute print:inset-0 print:w-full print:h-auto transition-colors duration-200 ${isMobile && activeTab !== 'preview' ? 'hidden' : 'flex'}`}
        >
          {/* RIGHT SIDE FLOATING BAR FOR PREVIEW SECTION (DESKTOP) */}
          <DesktopPreviewToolbar 
            preferences={preferences} 
            setPreferences={setPreferences} 
            onOpenExport={() => setShowExportModal(true)} 
          />
          {(() => {
            const activeZoom = preferences.outputMode === 'H' 
              ? (preferences.zoomH !== undefined ? preferences.zoomH : preferences.zoom)
              : (preferences.zoomP !== undefined ? preferences.zoomP : preferences.zoom);
            return preferences.outputMode === 'H' ? (
              <HeaderOnlyRenderer 
                headers={extractedHeaders}
                fontSize={preferences.headerFontSize || 145}
                lineSpacing={preferences.headerLineSpacing || 1.2}
                zoom={activeZoom}
                theme={preferences.headerTheme || 'dark'}
                docName={docName}
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
                zoom={activeZoom} 
                showDebug={preferences.showDebug} 
                leftFooterText={leftFooterText}
                rightFooterText={rightFooterText}
                showPageNumber={preferences.showPageNumber !== false}
                footerFontSize={preferences.footerFontSize || 14}
              />
            );
          })()}

          {/* Compiling spinner toast if paginating */}
          {isPaginating && (
            <div className="hidden sm:flex fixed top-16 right-6 z-40 bg-slate-900 text-white px-3 py-1.5 rounded-full shadow-lg items-center gap-2 text-[11px] font-medium border border-slate-700 select-none print:hidden">
              <Loader2 size={12} className="animate-spin text-emerald-400" />
              <span>Compiling Layout...</span>
            </div>
          )}
        </section>
      </main>

      {/* SYSTEM TOAST ALERTS */}
      {toastMessage && (
        <div className="fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 sm:bottom-20 sm:left-6 sm:translate-x-0 z-[9999] bg-slate-900/95 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-2 select-none animate-fade-in whitespace-nowrap">
          <CheckCircle size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SETTINGS PANEL DRAWERS */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-xs flex justify-end print:hidden select-none"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="w-full sm:w-[420px] bg-slate-50 shadow-2xl h-full flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Drawer Header */}
            <div className={`${themeClasses.headerBg} px-5 py-4 flex items-center justify-between shrink-0 shadow-md`}>
              <div className="flex items-center gap-2">
                <SettingsIcon size={18} className="text-emerald-400" />
                <h3 className="text-base font-extrabold tracking-tight">Hussayni Settings</h3>
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                className="hover:opacity-80 transition-opacity cursor-pointer text-base font-medium p-1"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Panel Items arranged in structured sections */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* SECTION 1: Application Language */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5">
                <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe size={13} className="text-emerald-500" />
                  <span>Application Language</span>
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPreferences(p => ({ ...p, language: 'en' }))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border cursor-pointer transition-all ${
                      (preferences.language || 'en') === 'en'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-500 shadow-2xs font-extrabold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>English</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferences(p => ({ ...p, language: 'ar' }))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border cursor-pointer transition-all ${
                      preferences.language === 'ar'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-500 shadow-2xs font-extrabold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>العربية</span>
                  </button>
                </div>
              </div>

              {/* SECTION 2: Visual Theme */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5">
                <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sun size={13} className="text-amber-500" />
                  <span>Visual Theme</span>
                </h4>
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
                          ? 'border-emerald-500 bg-emerald-50/20 text-slate-900 font-bold shadow-2xs' 
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${t.color} shrink-0`}></span>
                      <span className="text-xs">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 2: Document Typography & Page Layout */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Type size={13} className="text-blue-500" />
                  <span>Document Typography & Page Layout</span>
                </h4>

                {/* Min Page Font Size */}
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Minimum Font Size</span>
                    <span className="text-[10px] text-slate-400">Page text lower bound</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPreferences(p => ({ ...p, minFontSize: Math.max(12, p.minFontSize - 1) }))}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-extrabold flex items-center justify-center transition-all cursor-pointer border border-slate-200 text-sm select-none"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="text-xs font-extrabold text-slate-800 text-center px-1 min-w-[42px]">
                      {preferences.minFontSize}pt
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreferences(p => ({ ...p, minFontSize: Math.min(24, p.minFontSize + 1) }))}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-extrabold flex items-center justify-center transition-all cursor-pointer border border-slate-200 text-sm select-none"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                {/* Max Page Font Size */}
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Maximum Font Size</span>
                    <span className="text-[10px] text-slate-400">Page text upper bound</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPreferences(p => ({ ...p, maxFontSize: Math.max(24, p.maxFontSize - 1) }))}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-extrabold flex items-center justify-center transition-all cursor-pointer border border-slate-200 text-sm select-none"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="text-xs font-extrabold text-slate-800 text-center px-1 min-w-[42px]">
                      {preferences.maxFontSize}pt
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreferences(p => ({ ...p, maxFontSize: Math.min(40, p.maxFontSize + 1) }))}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-extrabold flex items-center justify-center transition-all cursor-pointer border border-slate-200 text-sm select-none"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                {/* Paragraph Spacing */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-bold text-slate-800 block">Paragraph Spacing</span>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                    {['compact', 'normal', 'relaxed'].map((sp) => (
                      <button
                        key={sp}
                        onClick={() => setPreferences(p => ({ ...p, paragraphSpacing: sp as any }))}
                        className={`py-1.5 rounded-lg text-xs font-extrabold uppercase transition-all cursor-pointer ${
                          preferences.paragraphSpacing === sp 
                            ? 'bg-white text-emerald-700 shadow-2xs border border-slate-200/80' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {sp}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 3: Header Only Mode Settings */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Image size={13} className="text-purple-500" />
                  <span>Header Slide Mode (1920×1080)</span>
                </h4>

                {/* Header Text Size */}
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Header Text Size</span>
                    <span className="text-[10px] text-slate-400">Title font scale</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPreferences(p => ({ ...p, headerFontSize: Math.max(32, (p.headerFontSize || 145) - 5) }))}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-extrabold flex items-center justify-center transition-all cursor-pointer border border-slate-200 text-sm select-none"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="text-xs font-extrabold text-slate-800 text-center px-1 min-w-[48px]">
                      {preferences.headerFontSize || 145}px
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreferences(p => ({ ...p, headerFontSize: Math.min(220, (p.headerFontSize || 145) + 5) }))}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-extrabold flex items-center justify-center transition-all cursor-pointer border border-slate-200 text-sm select-none"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                {/* Header Line Spacing */}
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Header Line Spacing</span>
                    <span className="text-[10px] text-slate-400">Line gap multiplier</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPreferences(p => ({ ...p, headerLineSpacing: Math.max(1.0, parseFloat(((p.headerLineSpacing || 1.2) - 0.1).toFixed(1))) }))}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-extrabold flex items-center justify-center transition-all cursor-pointer border border-slate-200 text-sm select-none"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="text-xs font-extrabold text-slate-800 text-center px-1 min-w-[42px]">
                      {preferences.headerLineSpacing || 1.2}x
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreferences(p => ({ ...p, headerLineSpacing: Math.min(2.5, parseFloat(((p.headerLineSpacing || 1.2) + 0.1).toFixed(1))) }))}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-extrabold flex items-center justify-center transition-all cursor-pointer border border-slate-200 text-sm select-none"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                {/* Header Theme */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-bold text-slate-800 block">Header Canvas Background</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPreferences(p => ({ ...p, headerTheme: 'light' }))}
                      className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 border cursor-pointer transition-all ${
                        preferences.headerTheme === 'light'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Sun size={13} />
                      <span>Light Canvas</span>
                    </button>
                    <button
                      onClick={() => setPreferences(p => ({ ...p, headerTheme: 'dark' }))}
                      className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 border cursor-pointer transition-all ${
                        preferences.headerTheme !== 'light'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Moon size={13} />
                      <span>Dark Canvas</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Page Footers & Numbers */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={13} className="text-emerald-500" />
                  <span>Page Footers & Numbers</span>
                </h4>

                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-bold text-slate-800">Display Page Numbers</span>
                  <input 
                    type="checkbox"
                    checked={preferences.showPageNumber !== false}
                    onChange={(e) => setPreferences(p => ({ ...p, showPageNumber: e.target.checked }))}
                    className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Footer Font Size */}
                <div className="flex items-center justify-between py-1">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Footer Font Size</span>
                    <span className="text-[10px] text-slate-400">Footer text size</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPreferences(p => ({ ...p, footerFontSize: Math.max(10, (p.footerFontSize || 14) - 1) }))}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-extrabold flex items-center justify-center transition-all cursor-pointer border border-slate-200 text-sm select-none"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="text-xs font-extrabold text-slate-800 text-center px-1 min-w-[42px]">
                      {preferences.footerFontSize || 14}px
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreferences(p => ({ ...p, footerFontSize: Math.min(20, (p.footerFontSize || 14) + 1) }))}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-extrabold flex items-center justify-center transition-all cursor-pointer border border-slate-200 text-sm select-none"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 5: Code Editor Preferences */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen size={13} className="text-amber-500" />
                  <span>Code Editor Preferences</span>
                </h4>
                
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Display Gutter Line Numbers</span>
                    <span className="text-[10px] text-slate-400">Left line number bar</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={preferences.showLineNumbers}
                    onChange={(e) => setPreferences(p => ({ ...p, showLineNumbers: e.target.checked }))}
                    className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Display Compilation Log</span>
                    <span className="text-[10px] text-slate-400">Bottom error & syntax logger</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={preferences.showCompilationLog !== false}
                    onChange={(e) => setPreferences(p => ({ ...p, showCompilationLog: e.target.checked }))}
                    className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Layout Validation Overlay</span>
                    <span className="text-[10px] text-slate-400">Debug boxes & metrics</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={preferences.showDebug}
                    onChange={(e) => setPreferences(p => ({ ...p, showDebug: e.target.checked }))}
                    className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Editor Direction</span>
                    <span className="text-[10px] text-slate-400">RTL vs LTR typing alignment</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPreferences(p => ({ ...p, editorRtl: false }))}
                      className={`h-8 px-3 rounded-lg text-xs font-extrabold uppercase transition-all cursor-pointer ${
                        !preferences.editorRtl 
                          ? 'bg-white text-emerald-700 shadow-2xs border border-slate-200/80' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      LTR
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreferences(p => ({ ...p, editorRtl: true }))}
                      className={`h-8 px-3 rounded-lg text-xs font-extrabold uppercase transition-all cursor-pointer ${
                        preferences.editorRtl 
                          ? 'bg-white text-emerald-700 shadow-2xs border border-slate-200/80' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      RTL
                    </button>
                  </div>
                </div>

                {/* Editor Typing Font Size */}
                <div className="flex items-center justify-between py-1">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Editor Typing Font Size</span>
                    <span className="text-[10px] text-slate-400">Monospace editor size</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPreferences(p => ({ ...p, editorFontSize: Math.max(11, p.editorFontSize - 1) }))}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-extrabold flex items-center justify-center transition-all cursor-pointer border border-slate-200 text-sm select-none"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="text-xs font-extrabold text-slate-800 text-center px-1 min-w-[42px]">
                      {preferences.editorFontSize}px
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreferences(p => ({ ...p, editorFontSize: Math.min(20, p.editorFontSize + 1) }))}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-extrabold flex items-center justify-center transition-all cursor-pointer border border-slate-200 text-sm select-none"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 6: How to Use Guide & Backups */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                <button
                  onClick={() => setShowHowToUse(!showHowToUse)}
                  className="w-full flex items-center justify-between text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 uppercase tracking-wider group-hover:text-emerald-600 transition-colors">
                    <BookOpen size={13} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                    <span>How to Use Guide</span>
                  </div>
                  <ChevronDown 
                    size={13} 
                    className={`text-slate-400 transition-transform duration-150 ${showHowToUse ? 'rotate-180' : ''}`} 
                  />
                </button>

                {showHowToUse && (
                  <div className="bg-slate-50 p-3.5 rounded-xl text-xs text-slate-600 leading-relaxed border border-slate-100 space-y-2.5 animate-fade-in select-text">
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
                          <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-extrabold text-[10px] shrink-0">H =</code>
                          <span className="text-[11px] text-slate-500">Main Header/Title block. Renders bold centered display text.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-extrabold text-[10px] shrink-0">B =</code>
                          <span className="text-[11px] text-slate-500">Body text block. Renders RTL Arabic paragraphs/verses.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-extrabold text-[10px] shrink-0">F =</code>
                          <span className="text-[11px] text-slate-500">Subtitle/Commentary/Footnotes. Hidden in document exports.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-extrabold text-[10px] shrink-0">P</code>
                          <span className="text-[11px] text-slate-500">Standalone line. Forces an immediate layout page break.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Used Storage Budget:</span>
                    <span className="font-bold text-slate-700">{storageUsage} KB</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleExportPreferences}
                      className="border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Export Backup</span>
                    </button>
                    <button
                      onClick={handleImportPreferencesClick}
                      className="border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Upload size={13} />
                      <span>Import Backup</span>
                    </button>
                  </div>

                  <button
                    onClick={handleClearAllData}
                    className="w-full border border-rose-200 hover:bg-rose-50 text-rose-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Factory Hard Reset (Wipe Cache)</span>
                  </button>
                </div>
              </div>

              {/* SECTION 7: App Status & Updates (Bottom Section) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5 select-none text-[11px] text-slate-500">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <p className="font-extrabold text-xs text-slate-800">APP STATUS & UPDATES</p>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    pwa.needRefresh ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {pwa.needRefresh ? 'Update Pending' : 'Up to Date'}
                  </span>
                </div>
                
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>App Engine:</span>
                    <button
                      type="button"
                      onClick={() => { setShowSettings(false); setShowAbout(true); }}
                      className="font-bold text-emerald-600 hover:underline cursor-pointer select-text"
                    >
                      v{APP_VERSION}
                    </button>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Installation State:</span>
                    <span className="font-bold text-slate-800">
                      {pwa.isInstalled ? 'Installed Native PWA' : 'Web Browser View'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Offline Worker:</span>
                    <span className="font-bold text-slate-800">
                      {pwa.offlineReady ? 'Active Cache Ready' : 'Online Sync'}
                    </span>
                  </div>
                </div>

                {/* Show Update button ONLY when an update is available */}
                {pwa.needRefresh && (
                  <button
                    onClick={() => pwa.updateServiceWorker(true)}
                    className="w-full mt-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-black py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md animate-bounce"
                  >
                    <Sparkles size={14} />
                    <span>Update Available – Click to Reload</span>
                  </button>
                )}

                {pwa.isInstallable && (
                  <button
                    onClick={pwa.installApp}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download size={13} />
                    <span>Install Hussayni PWA App</span>
                  </button>
                )}
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* EXPORT OPTIONS CONSOLE MODAL */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none print:hidden"
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 shadow-md">
                  <Download size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight">Export</h3>
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

              {/* Option A: PDF Vector layout (Hidden in Header Mode) */}
              {preferences.outputMode !== 'H' && (
                <div className="border-2 border-rose-300 hover:border-rose-500 bg-rose-50/20 p-4 rounded-xl transition-all duration-150 flex items-start gap-3.5 shadow-2xs">
                  <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 select-none">
                    <Printer size={18} />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="font-extrabold text-sm text-slate-900">PDF Document</h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Please set correct print settings
                    </p>
                    <button
                      onClick={handleLaunchPrint}
                      className="mt-3 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Printer size={12} />
                      <span>PDF Print</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Option B: Microsoft Word Document (.docx) (Hidden in Header Mode) */}
              {preferences.outputMode !== 'H' && (
                <div className="border-2 border-blue-300 hover:border-blue-500 bg-blue-50/20 p-4 rounded-xl transition-all duration-150 flex items-start gap-3.5 shadow-2xs">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 select-none">
                    <FileText size={18} />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="font-extrabold text-sm text-slate-900">Microsoft Word Document</h4>
                    <button
                      onClick={handleLaunchDocx}
                      disabled={isGeneratingDocx}
                      className="mt-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-[11px] font-bold px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer max-w-full overflow-hidden"
                    >
                      {isGeneratingDocx ? (
                        <Loader2 size={12} className="animate-spin shrink-0" />
                      ) : (
                        <Download size={12} className="shrink-0" />
                      )}
                      <span className="truncate font-mono font-bold block min-w-0 max-w-[150px] min-[400px]:max-w-[200px] sm:max-w-[340px]">
                        {isGeneratingDocx ? "Compiling XML..." : (docName ? (docName.toLowerCase().endsWith('.docx') ? docName : `${docName}.docx`) : 'document.docx')}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Option C: Header Only Slide Images (PNG / JPG) */}
              <div className="border-2 border-emerald-300 hover:border-emerald-500 bg-emerald-50/20 p-4 rounded-xl transition-all duration-150 flex items-start gap-3.5 shadow-2xs">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 select-none">
                  <Image size={18} />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-extrabold text-sm text-slate-900">Header Only</h4>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      1920 × 1080
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => {
                        exportAllHeaderImages({
                          headers: extractedHeaders,
                          fontSize: preferences.headerFontSize || 145,
                          lineSpacing: preferences.headerLineSpacing || 1.2,
                          theme: preferences.headerTheme || 'dark',
                          format: 'png',
                          docName
                        });
                        setShowExportModal(false);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Download size={13} />
                      <span>PNG{extractedHeaders.length > 1 ? '(s)' : ''}</span>
                    </button>

                    <button
                      onClick={() => {
                        exportAllHeaderImages({
                          headers: extractedHeaders,
                          fontSize: preferences.headerFontSize || 145,
                          lineSpacing: preferences.headerLineSpacing || 1.2,
                          theme: preferences.headerTheme || 'dark',
                          format: 'jpg',
                          docName
                        });
                        setShowExportModal(false);
                      }}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Download size={13} />
                      <span>JPG{extractedHeaders.length > 1 ? '(s)' : ''}</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* SYSTEM ABOUT DIALOG MODAL */}
      <AnimatePresence>
        {showAbout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none print:hidden"
            onClick={() => setShowAbout(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* PDF PRINT INSTRUCTION TOAST BANNER OVERLAY */}
      <AnimatePresence>
        {showPrintToast && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none print:hidden"
            onClick={() => setShowPrintToast(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white p-6 rounded-xl shadow-2xl max-w-sm text-center border border-slate-100 flex flex-col items-center gap-3.5"
              onClick={(e) => e.stopPropagation()}
            >
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

                    triggerSystemPrint(
                      () => {},
                      () => {
                        document.title = originalTitle;
                      }
                    );
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2 rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  Continue
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* CUSTOM CONFIRMATION MODAL OVERLAY */}
      <AnimatePresence>
        {confirmConfig && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[1100] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden select-none"
            onClick={() => setConfirmConfig(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className={`w-full max-w-sm rounded-2xl shadow-2xl border p-5 ${themeClasses.cardBg}`}
              onClick={(e) => e.stopPropagation()}
            >
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* MOBILE BOTTOM EDITING TOOLBAR */}
      {isMobile && activeTab === 'editor' && (
        <MobileBottomToolbar
          onInsertTag={handleInsertTag}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClearText}
          onOpenMore={() => setShowMobileFooterSheet(true)}
          isKeyboardActive={isKeyboardActive}
          theme={preferences.theme}
        />
      )}

      {/* MOBILE BOTTOM PREVIEW TOOLBAR */}
      {isMobile && activeTab === 'preview' && (
        <MobilePreviewToolbar
          preferences={preferences}
          setPreferences={setPreferences}
          activePopup={activePreviewPopup}
          setActivePopup={setActivePreviewPopup}
        />
      )}

      {/* MOBILE FOOTER & SETTINGS BOTTOM SHEET DRAWER */}
      <MobileFooterSheet
        isOpen={showMobileFooterSheet}
        onClose={() => setShowMobileFooterSheet(false)}
        leftFooterText={leftFooterText}
        setLeftFooterText={setLeftFooterText}
        rightFooterText={rightFooterText}
        setRightFooterText={setRightFooterText}
        preferences={preferences}
        setPreferences={setPreferences}
      />

    </div>
  );
}
