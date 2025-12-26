'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { FileText, Upload, Trash2, Download, ChevronDown, ChevronRight, FolderOpen } from 'lucide-react';
import { useCustomer } from '@/context';
import { projectsApi, phasesApi, documentsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const PHASE_NAMES: Record<string, string> = {
  'onboarding': 'Onboarding',
  'planning_and_design': 'Planning & Design',
  'travel': 'Travel',
  'shopping': 'Shopping',
  'ordering': 'Ordering',
  'production': 'Production',
  'delivery': 'Delivery',
  'installation': 'Installation',
};

export default function DocumentsPage() {
  const { selectedCustomer } = useCustomer();
  const [projects, setProjects] = useState<any[]>([]);
  const [allPhases, setAllPhases] = useState<any[]>([]);
  const [documentsByPhase, setDocumentsByPhase] = useState<Record<string, any[]>>({});
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    if (selectedCustomer) {
      loadData();
    }
  }, [selectedCustomer]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const projectsRes = await projectsApi.list(1, 100, selectedCustomer?._id);
      
      // WORKAROUND: Backend is not filtering by customer_id, so we filter client-side
      const allProjects = projectsRes.data?.projects || [];
      const customerProjects = allProjects.filter((p: any) => {
        const pid = typeof p.customer_id === 'object' ? p.customer_id._id : p.customer_id;
        return pid === selectedCustomer?._id;
      });
      setProjects(customerProjects);

      // Load phases and documents from all projects
      const phases: any[] = [];
      const docsByPhase: Record<string, any[]> = {};
      
      for (const project of customerProjects) {
        try {
          const phasesRes = await phasesApi.listByProject(project._id);
          const projectPhases = phasesRes.data?.phases || [];
          phases.push(...projectPhases.map((p: any) => ({ ...p, projectType: project.project_type, projectId: project._id })));
          
          const docsRes = await documentsApi.listByProject(project._id);
          const docs = docsRes.data?.documents || [];
          console.log(`📄 [Documents Tab] Project "${project.project_type}" has ${docs.length} documents`);
          
          docs.forEach((doc: any) => {
            const phaseId = doc.phase_id?._id || doc.phase_id || doc.metadata?.phase_id || 'unassigned';
            console.log(`📄 [Documents Tab] Document "${doc.file_name}" -> phase_id: ${phaseId}`);
            if (!docsByPhase[phaseId]) docsByPhase[phaseId] = [];
            docsByPhase[phaseId].push({ ...doc, projectType: project.project_type });
          });
        } catch (e) {
          console.error('Failed to load project data:', e);
        }
      }
      
      // Deduplicate phases by _id
      const uniquePhases = Array.from(
        new Map(phases.map(p => [p._id, p])).values()
      );
      console.log(`📄 [Documents Tab] Total phases: ${phases.length}, Unique phases: ${uniquePhases.length}`);
      console.log(`📄 [Documents Tab] Documents by phase:`, docsByPhase);
      
      setAllPhases(uniquePhases);
      setDocumentsByPhase(docsByPhase);
      
      // Expand phases that have documents
      const phasesWithDocs = new Set(Object.keys(docsByPhase).filter(k => docsByPhase[k].length > 0));
      setExpandedPhases(phasesWithDocs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePhase = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  const handleDownload = async (doc: any) => {
    try {
      // Get the S3 presigned URL using the API (which handles auth properly)
      const res = await documentsApi.getDownloadUrl(doc._id);
      const url = res.data?.url;
      
      if (url) {
        // Open the S3 URL - it will download with whatever filename S3 provides
        // The filename issue needs to be fixed in the backend by adding Content-Disposition header
        window.open(url, '_blank');
      }
    } catch (e) { 
      console.error('Failed to download document:', e); 
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await documentsApi.delete(docId);
      loadData();
    } catch (e) { console.error(e); }
  };

  const totalDocs = Object.values(documentsByPhase).reduce((sum, docs) => sum + docs.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground mt-1">{totalDocs} documents across all phases</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      ) : allPhases.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-medium text-lg mb-2">No projects yet</h3>
          <p className="text-muted-foreground">Create a project first to upload documents</p>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {allPhases.map((phase) => {
                const phaseDocs = documentsByPhase[phase._id] || [];
                const isExpanded = expandedPhases.has(phase._id);
                
                return (
                  <div key={phase._id}>
                    <button
                      onClick={() => togglePhase(phase._id)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FolderOpen className="w-5 h-5 text-muted-foreground" />
                        <div className="text-left">
                          <span className="font-medium">{phase.name || PHASE_NAMES[phase.type_of_phase]}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            ({phaseDocs.length} docs) • {phase.projectType}
                          </span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    
                    {isExpanded && (
                      <div className="px-6 pb-4 space-y-2">
                        {phaseDocs.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2">No documents in this phase</p>
                        ) : (
                          phaseDocs.map((doc) => (
                            <div key={doc._id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-sm">{doc.file_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(doc.uploadedAt || doc.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)} title="View/Download">
                                  <FileText className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)} title="Download">
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(doc._id)} title="Delete">
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {showUploadModal && (
        <UploadModal
          projects={projects}
          allPhases={allPhases}
          onClose={() => setShowUploadModal(false)}
          onUploaded={() => { setShowUploadModal(false); loadData(); }}
        />
      )}
    </div>
  );
}

function UploadModal({ projects, allPhases, onClose, onUploaded }: any) {
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [projectId, setProjectId] = useState('');
  const [phaseId, setPhaseId] = useState('');
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');

  const projectPhases = allPhases.filter((p: any) => p.projectId === projectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0 || !projectId || !phaseId) return;
    
    try {
      setIsUploading(true);
      setError('');
      setUploadProgress({ current: 0, total: files.length });
      
      // Upload files sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i + 1, total: files.length });
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('project_id', projectId);
        formData.append('phase_id', phaseId);
        
        await documentsApi.upload(formData);
      }
      
      onUploaded();
    } catch (e: any) { 
      console.error(e);
      setError(e.message || 'Upload failed. Please try again.');
    } finally { 
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <CardHeader><CardTitle>Upload Document</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Project *</label>
              <select required value={projectId} onChange={(e) => { setProjectId(e.target.value); setPhaseId(''); }}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background">
                <option value="">Select project...</option>
                {projects.map((p: any) => <option key={p._id} value={p._id}>{p.project_type}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Phase *</label>
              <select required value={phaseId} onChange={(e) => setPhaseId(e.target.value)}
                disabled={!projectId}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background disabled:opacity-50">
                <option value="">Select phase...</option>
                {projectPhases.map((p: any) => (
                  <option key={p._id} value={p._id}>{p.name || PHASE_NAMES[p.type_of_phase]}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Files *</label>
              <input 
                type="file" 
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []))} 
                className="w-full" 
              />
              {files.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {files.length} file(s) selected
                </p>
              )}
            </div>
            
            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-lg text-sm">
                {error}
              </div>
            )}
            {isUploading && uploadProgress.total > 0 && (
              <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
                Uploading file {uploadProgress.current} of {uploadProgress.total}...
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>Cancel</Button>
              <Button type="submit" disabled={isUploading || files.length === 0 || !projectId || !phaseId}>
                {isUploading ? `Uploading... (${uploadProgress.current}/${uploadProgress.total})` : `Upload ${files.length > 0 ? `(${files.length})` : ''}`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

