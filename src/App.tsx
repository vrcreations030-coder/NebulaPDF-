import React, { useState, useEffect } from 'react';
import type { ToolId, RecentActivityItem } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import type { UploadedPDFFile } from './components/DropZone';

// Views
import { HomeView } from './views/HomeView';
import { AllToolsView } from './views/AllToolsView';
import { MergeToolView } from './views/MergeToolView';
import { SplitExtractToolView } from './views/SplitExtractToolView';
import { ReorderRotateToolView } from './views/ReorderRotateToolView';
import { PdfToImagesToolView } from './views/PdfToImagesToolView';
import { ImagesToPdfToolView } from './views/ImagesToPdfToolView';
import { CompressToolView } from './views/CompressToolView';
import { WatermarkToolView } from './views/WatermarkToolView';
import { PageNumbersToolView } from './views/PageNumbersToolView';
import { TextExtractorView } from './views/TextExtractorView';
import { PdfPreviewerView } from './views/PdfPreviewerView';
import { PdfCompareView } from './views/PdfCompareView';
import { AnnotationToolView } from './views/AnnotationToolView';
import { OcrToolView } from './views/OcrToolView';
import { AiStudioView } from './views/AiStudioView';
import { HealthCheckView } from './views/HealthCheckView';
import { WorkflowBuilderView } from './views/WorkflowBuilderView';
import { DocumentPackView } from './views/DocumentPackView';
import { FormHelperView } from './views/FormHelperView';
import { PrivacyCenterView } from './views/PrivacyCenterView';
import {
  AboutView,
  ContactView,
  PrivacyPolicyView,
  TermsView,
  DisclaimerView,
} from './views/StaticInfoViews';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<ToolId>('home');
  const [sharedFiles, setSharedFiles] = useState<UploadedPDFFile[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync with browser hash routing for direct Cloudflare / bookmark URLs
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as ToolId;
      if (hash && isValidRoute(hash)) {
        setCurrentRoute(hash);
      }
    };

    if (window.location.hash) {
      handleHashChange();
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const isValidRoute = (r: string): boolean => {
    const valid: ToolId[] = [
      'home',
      'all-tools',
      'merge',
      'split',
      'extract',
      'delete-pages',
      'reorder',
      'rotate',
      'pdf-to-images',
      'images-to-pdf',
      'compress',
      'watermark',
      'page-numbers',
      'preview',
      'compare',
      'annotate',
      'ocr',
      'ai-studio',
      'health-check',
      'workflow',
      'document-pack',
      'form-helper',
      'privacy-center',
      'about',
      'contact',
      'privacy-policy',
      'terms',
      'disclaimer',
    ];
    return valid.includes(r as ToolId);
  };

  const navigateTo = (route: ToolId) => {
    setCurrentRoute(route);
    window.location.hash = route === 'home' ? '' : route;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearSession = () => {
    setSharedFiles([]);
    setToastMessage('Transient memory and active documents flushed.');
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAddSharedFiles = (newFiles: UploadedPDFFile[]) => {
    setSharedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveSharedFile = (index: number) => {
    setSharedFiles((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0D12] text-slate-100">
      {/* Top Navigation Bar */}
      <Header
        currentRoute={currentRoute}
        onNavigate={navigateTo}
        onClearSession={handleClearSession}
        hasActiveFiles={sharedFiles.length > 0}
      />

      {/* Main Content Viewport */}
      <main className="flex-1">
        {currentRoute === 'home' && (
          <HomeView
            onSelectTool={navigateTo}
            sharedFiles={sharedFiles}
            onAddSharedFiles={handleAddSharedFiles}
            onRemoveSharedFile={handleRemoveSharedFile}
            onClearSharedFiles={() => setSharedFiles([])}
          />
        )}

        {currentRoute === 'all-tools' && (
          <AllToolsView onSelectTool={navigateTo} />
        )}

        {currentRoute === 'merge' && (
          <MergeToolView
            onBack={() => navigateTo('all-tools')}
            sharedFiles={sharedFiles}
            onAddSharedFiles={handleAddSharedFiles}
            onRemoveSharedFile={handleRemoveSharedFile}
          />
        )}

        {(currentRoute === 'split' ||
          currentRoute === 'extract' ||
          currentRoute === 'delete-pages') && (
          <SplitExtractToolView
            toolId={currentRoute}
            onBack={() => navigateTo('all-tools')}
            sharedFiles={sharedFiles}
            onAddSharedFiles={handleAddSharedFiles}
          />
        )}

        {(currentRoute === 'reorder' || currentRoute === 'rotate') && (
          <ReorderRotateToolView
            toolId={currentRoute}
            onBack={() => navigateTo('all-tools')}
            sharedFiles={sharedFiles}
            onAddSharedFiles={handleAddSharedFiles}
          />
        )}

        {currentRoute === 'pdf-to-images' && (
          <PdfToImagesToolView
            onBack={() => navigateTo('all-tools')}
            sharedFiles={sharedFiles}
            onAddSharedFiles={handleAddSharedFiles}
          />
        )}

        {currentRoute === 'images-to-pdf' && (
          <ImagesToPdfToolView onBack={() => navigateTo('all-tools')} />
        )}

        {currentRoute === 'compress' && (
          <CompressToolView
            onBack={() => navigateTo('all-tools')}
            sharedFiles={sharedFiles}
            onAddSharedFiles={handleAddSharedFiles}
          />
        )}

        {currentRoute === 'watermark' && (
          <WatermarkToolView
            onBack={() => navigateTo('all-tools')}
            sharedFiles={sharedFiles}
            onAddSharedFiles={handleAddSharedFiles}
          />
        )}

        {currentRoute === 'page-numbers' && (
          <PageNumbersToolView
            onBack={() => navigateTo('all-tools')}
            sharedFiles={sharedFiles}
            onAddSharedFiles={handleAddSharedFiles}
          />
        )}

        {(currentRoute as string) === 'pdf-text' && (
          <TextExtractorView
            onBack={() => navigateTo('all-tools')}
            sharedFiles={sharedFiles}
            onAddSharedFiles={handleAddSharedFiles}
          />
        )}

        {currentRoute === 'preview' && (
          <PdfPreviewerView
            onBack={() => navigateTo('all-tools')}
            sharedFiles={sharedFiles}
            onAddSharedFiles={handleAddSharedFiles}
          />
        )}

        {currentRoute === 'compare' && (
          <PdfCompareView
            onBack={() => navigateTo('all-tools')}
            sharedFiles={sharedFiles}
          />
        )}

        {currentRoute === 'annotate' && (
          <AnnotationToolView
            onBack={() => navigateTo('all-tools')}
            sharedFiles={sharedFiles}
            onAddSharedFiles={handleAddSharedFiles}
          />
        )}

        {currentRoute === 'ocr' && (
          <OcrToolView
            onBack={() => navigateTo('all-tools')}
            sharedFiles={sharedFiles}
          />
        )}

        {currentRoute === 'ai-studio' && (
          <AiStudioView
            onBack={() => navigateTo('home')}
            sharedFiles={sharedFiles}
            onAddSharedFiles={handleAddSharedFiles}
          />
        )}

        {currentRoute === 'health-check' && (
          <HealthCheckView
            onBack={() => navigateTo('all-tools')}
            sharedFiles={sharedFiles}
          />
        )}

        {currentRoute === 'workflow' && (
          <WorkflowBuilderView
            onBack={() => navigateTo('all-tools')}
            sharedFiles={sharedFiles}
          />
        )}

        {currentRoute === 'document-pack' && (
          <DocumentPackView
            onBack={() => navigateTo('all-tools')}
            sharedFiles={sharedFiles}
          />
        )}

        {currentRoute === 'form-helper' && (
          <FormHelperView
            onBack={() => navigateTo('all-tools')}
            sharedFiles={sharedFiles}
          />
        )}

        {currentRoute === 'privacy-center' && (
          <PrivacyCenterView
            onBack={() => navigateTo('home')}
            onClearSession={handleClearSession}
          />
        )}

        {currentRoute === 'about' && (
          <AboutView onBack={() => navigateTo('home')} />
        )}

        {currentRoute === 'contact' && (
          <ContactView onBack={() => navigateTo('home')} />
        )}

        {currentRoute === 'privacy-policy' && (
          <PrivacyPolicyView onBack={() => navigateTo('home')} />
        )}

        {currentRoute === 'terms' && (
          <TermsView onBack={() => navigateTo('home')} />
        )}

        {currentRoute === 'disclaimer' && (
          <DisclaimerView onBack={() => navigateTo('home')} />
        )}
      </main>

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#171329] border border-[#8B5CF6]/50 text-white text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Comprehensive Footer */}
      <Footer onNavigate={navigateTo} onClearSession={handleClearSession} />
    </div>
  );
}
