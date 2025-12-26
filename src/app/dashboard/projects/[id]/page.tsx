'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { 
  ArrowLeft, ChevronDown, ChevronRight, Plus, Trash2, 
  CheckCircle, Clock, Upload, FileText, CalendarDays
} from 'lucide-react';
import { projectsApi, phasesApi, tasksApi, documentsApi, meetingsApi } from '@/lib/api';
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

const PHASE_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' },
];

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [phases, setPhases] = useState<any[]>([]);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [phaseTasks, setPhaseTasks] = useState<Record<string, any[]>>({});
  const [phaseDocuments, setPhaseDocuments] = useState<Record<string, any[]>>({});
  const [meetings, setMeetings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setIsLoading(true);
      const response = await projectsApi.getById(projectId);
      setProject(response.data?.project);
      
      const phasesResponse = await phasesApi.listByProject(projectId);
      const projectPhases = phasesResponse.data?.phases || [];
      setPhases(projectPhases);

      // Expand current phase
      if (response.data?.project?.current_phase) {
        const currentPhase = projectPhases.find(
          (p: any) => p.type_of_phase === response.data.project.current_phase
        );
        if (currentPhase) {
          setExpandedPhases(new Set([currentPhase._id]));
          loadPhaseData(currentPhase._id);
        }
      }

      // Load meetings
      const meetingsResponse = await meetingsApi.listByProject(projectId);
      setMeetings(meetingsResponse.data?.meetings || []);

      // Load documents by phase
      const docsResponse = await documentsApi.listByProject(projectId);
      const docs = docsResponse.data?.documents || [];
      console.log('📄 [Documents] Loaded documents:', docs);
      
      const docsByPhase: Record<string, any[]> = {};
      docs.forEach((doc: any) => {
        // Handle both object and string phase_id
        const phaseId = doc.phase_id?._id || doc.phase_id || doc.metadata?.phase_id;
        console.log(`📄 [Documents] Document "${doc.file_name}" - phase_id:`, phaseId);
        
        if (phaseId) {
          if (!docsByPhase[phaseId]) docsByPhase[phaseId] = [];
          docsByPhase[phaseId].push(doc);
        } else {
          console.warn('⚠️ [Documents] Document has no phase_id:', doc);
        }
      });
      console.log('📄 [Documents] Documents by phase:', docsByPhase);
      setPhaseDocuments(docsByPhase);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPhaseData = async (phaseId: string, force = false) => {
    // Remove cache check to allow refreshing
    if (phaseTasks[phaseId] && !force) return;
    try {
      const tasksResponse = await tasksApi.listByPhase(phaseId);
      setPhaseTasks(prev => ({
        ...prev,
        [phaseId]: tasksResponse.data?.tasks || []
      }));
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const togglePhase = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
      loadPhaseData(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
        <div className="h-48 bg-muted animate-pulse rounded-lg"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push('/dashboard/projects')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </button>

      {/* Project Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{project.project_type}</h1>
              <p className="text-muted-foreground mt-1">{project.project_description}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm ${
              project.status === 'active'
                ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}>
              {project.status}
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {project.location && (
              <div>
                <span className="text-muted-foreground">Location</span>
                <p className="font-medium">{project.location}</p>
              </div>
            )}
            {project.project_level_budget && (
              <div>
                <span className="text-muted-foreground">Budget</span>
                <p className="font-medium">₹{project.project_level_budget.toLocaleString()}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Current Phase</span>
              <p className="font-medium">{PHASE_NAMES[project.current_phase] || project.current_phase}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Created</span>
              <p className="font-medium">{formatDate(project.createdAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phases */}
      <Card>
        <CardHeader>
          <CardTitle>Project Phases</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {phases.map((phase, index) => (
              <PhaseAccordion
                key={phase._id}
                phase={phase}
                index={index}
                isExpanded={expandedPhases.has(phase._id)}
                onToggle={() => togglePhase(phase._id)}
                tasks={phaseTasks[phase._id] || []}
                documents={phaseDocuments[phase._id] || []}
                projectId={projectId}
                onRefresh={loadProject}
                onRefreshPhase={(phaseId: string) => loadPhaseData(phaseId, true)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Meetings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Meetings</CardTitle>
          <MeetingModal projectId={projectId} phases={phases} onCreated={loadProject} />
        </CardHeader>
        <CardContent>
          {meetings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No meetings yet</p>
          ) : (
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <MeetingCard key={meeting._id} meeting={meeting} onRefresh={loadProject} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PhaseAccordion({ phase, index, isExpanded, onToggle, tasks, documents, projectId, onRefresh, onRefreshPhase }: any) {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusIcon = () => {
    if (phase.status === 'completed' || phase.is_completed) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (phase.status === 'in_progress') return <Clock className="w-5 h-5 text-blue-500" />;
    return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setIsUpdating(true);
      await phasesApi.update(phase._id, { 
        status: newStatus,
        is_completed: newStatus === 'completed'
      });
      onRefresh();
    } catch (error) {
      console.error('Failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const currentStatus = PHASE_STATUSES.find(s => s.value === phase.status) || PHASE_STATUSES[0];

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center gap-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div className="text-left">
            <span className="text-sm text-muted-foreground">Phase {index + 1}</span>
            <h3 className="font-medium text-foreground">{phase.name || PHASE_NAMES[phase.type_of_phase]}</h3>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className={`text-xs px-2 py-0.5 rounded-full ${currentStatus.color}`}>
            {currentStatus.label}
          </span>
          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-4">
          {/* Status Dropdown */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Status:</label>
              <select
                value={phase.status || 'pending'}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={isUpdating}
                className="h-9 px-3 rounded-lg border border-input bg-background text-sm"
              >
                {PHASE_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowTaskModal(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Task
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowUploadModal(true)}>
              <Upload className="w-4 h-4 mr-1" />
              Upload Document
            </Button>
          </div>

          {/* Tasks */}
          <div>
            <h4 className="text-sm font-medium mb-2">Tasks ({tasks.length})</h4>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task: any) => (
                  <TaskRow key={task._id} task={task} onRefresh={onRefresh} />
                ))}
              </div>
            )}
          </div>

          {/* Documents */}
          <div>
            <h4 className="text-sm font-medium mb-2">Documents ({documents.length})</h4>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc: any) => (
                  <DocumentRow key={doc._id} document={doc} onRefresh={onRefresh} />
                ))}
              </div>
            )}
          </div>

          {showTaskModal && (
            <CreateTaskModal 
              phaseId={phase._id} 
              onClose={() => setShowTaskModal(false)} 
              onCreated={() => { 
                onRefreshPhase(phase._id); // Force reload tasks for this phase
                setShowTaskModal(false); 
              }} 
            />
          )}
          {showUploadModal && (
            <UploadModal 
              projectId={projectId} 
              phaseId={phase._id} 
              onClose={() => setShowUploadModal(false)} 
              onUploaded={() => { 
                onRefresh(); // Reload entire project to get new documents
                setShowUploadModal(false); 
              }} 
            />
          )}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onRefresh }: any) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleToggle = async () => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await tasksApi.updateStatus(task._id, newStatus);
      onRefresh();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    try {
      await tasksApi.delete(task._id);
      onRefresh();
    } catch (e) { console.error(e); }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'payment': return 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300';
      case 'document_upload': return 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300';
      case 'approval': return 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300';
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Collapsed View - Clickable Header */}
      <div 
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button onClick={(e) => { e.stopPropagation(); handleToggle(); }} className="flex-shrink-0">
          {task.status === 'completed' ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
              {task.name}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(task.type)}`}>
              {task.type?.replace(/_/g, ' ')}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(task.status)}`}>
              {task.status}
            </span>
            {task.required && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                Required
              </span>
            )}
          </div>
        </div>

        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </div>

      {/* Expanded View - All Details */}
      {isExpanded && (
        <div className="p-4 bg-muted/30 border-t border-border space-y-3">
          {/* Dates Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {task.due_date && (
              <div>
                <span className="text-muted-foreground">Due Date:</span>
                <span className="ml-2 font-medium">{formatDate(task.due_date)}</span>
              </div>
            )}
            {task.estimated_start_date && (
              <div>
                <span className="text-muted-foreground">Est. Start:</span>
                <span className="ml-2 font-medium">{formatDate(task.estimated_start_date)}</span>
              </div>
            )}
            {task.estimated_complete_date && (
              <div>
                <span className="text-muted-foreground">Est. Complete:</span>
                <span className="ml-2 font-medium">{formatDate(task.estimated_complete_date)}</span>
              </div>
            )}
            {task.actual_start_date && (
              <div>
                <span className="text-muted-foreground">Actual Start:</span>
                <span className="ml-2 font-medium">{formatDate(task.actual_start_date)}</span>
              </div>
            )}
            {task.actual_complete_date && (
              <div>
                <span className="text-muted-foreground">Actual Complete:</span>
                <span className="ml-2 font-medium">{formatDate(task.actual_complete_date)}</span>
              </div>
            )}
          </div>

          {/* Payment Status */}
          {task.payment_status && (
            <div className="text-sm">
              <span className="text-muted-foreground">Payment Status:</span>
              <span className="ml-2 font-medium capitalize">{task.payment_status.replace(/_/g, ' ')}</span>
            </div>
          )}

          {/* Additional Data */}
          {task.data && (
            <div className="text-sm">
              <span className="text-muted-foreground">Additional Data:</span>
              <pre className="mt-1 p-2 bg-background rounded text-xs overflow-x-auto">
                {typeof task.data === 'string' ? task.data : JSON.stringify(task.data, null, 2)}
              </pre>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={(e) => { e.stopPropagation(); setShowEditModal(true); }}
            >
              <FileText className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <EditTaskModal 
          task={task}
          onClose={() => setShowEditModal(false)}
          onUpdated={() => {
            onRefresh();
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}

function DocumentRow({ document, onRefresh }: any) {
  const handleDownload = async () => {
    try {
      // Get the S3 presigned URL using the API (which handles auth properly)
      const res = await documentsApi.getDownloadUrl(document._id);
      const url = res.data?.url;
      
      if (url) {
        // Open the S3 URL - it will download with whatever filename S3 provides
        window.open(url, '_blank');
      }
    } catch (e) { 
      console.error('Failed to download document:', e); 
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete document?')) return;
    try {
      await documentsApi.delete(document._id);
      onRefresh();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
      <FileText className="w-5 h-5 text-muted-foreground" />
      <div className="flex-1">
        <span>{document.file_name}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={handleDownload}>Download</Button>
      <Button variant="ghost" size="sm" onClick={handleDelete}>
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  );
}

function CreateTaskModal({ phaseId, onClose, onCreated }: any) {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    type: 'action', 
    status: 'pending',
    required: true, 
    payment_status: 'not_required',
    estimated_start_date: '',
    estimated_complete_date: '',
    actual_start_date: '',
    actual_complete_date: '',
    data: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      const payload: any = {
        name: formData.name,
        type: formData.type,
        status: formData.status,
        required: formData.required,
        payment_status: formData.payment_status,
      };
      
      // Only add dates if they're filled
      if (formData.estimated_start_date) payload.estimated_start_date = formData.estimated_start_date;
      if (formData.estimated_complete_date) payload.estimated_complete_date = formData.estimated_complete_date;
      if (formData.actual_start_date) payload.actual_start_date = formData.actual_start_date;
      if (formData.actual_complete_date) payload.actual_complete_date = formData.actual_complete_date;
      if (formData.data) payload.data = formData.data;
      
      await tasksApi.create(phaseId, payload);
      onCreated(); // Refresh data first
      onClose(); // Then close modal
    } catch (e) { 
      console.error('Failed to create task:', e); 
    } finally { 
      setIsCreating(false); 
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto" onClick={onClose}>
      <Card className="w-full max-w-2xl mx-4 my-8" onClick={(e) => e.stopPropagation()}>
        <CardHeader><CardTitle>Add Task</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Task Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Task Name *</label>
              <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background" 
                placeholder="e.g., Upload passport copy" />
            </div>

            {/* Type and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background">
                  <option value="action">Action</option>
                  <option value="document_upload">Document Upload</option>
                  <option value="payment">Payment</option>
                  <option value="approval">Approval</option>
                  <option value="booking">Booking</option>
                  <option value="meeting">Meeting</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status *</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background">
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-sm font-medium mb-1">Payment Status *</label>
              <select value={formData.payment_status} onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background">
                <option value="not_required">Not Required</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Est. Start Date</label>
                <input type="date" value={formData.estimated_start_date} onChange={(e) => setFormData({ ...formData, estimated_start_date: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Est. Complete Date</label>
                <input type="date" value={formData.estimated_complete_date} onChange={(e) => setFormData({ ...formData, estimated_complete_date: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Actual Start Date</label>
                <input type="date" value={formData.actual_start_date} onChange={(e) => setFormData({ ...formData, actual_start_date: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Actual Complete Date</label>
                <input type="date" value={formData.actual_complete_date} onChange={(e) => setFormData({ ...formData, actual_complete_date: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background" />
              </div>
            </div>

            {/* Additional Data */}
            <div>
              <label className="block text-sm font-medium mb-1">Additional Data (JSON or text)</label>
              <textarea value={formData.data} onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                rows={3}
                placeholder='e.g., {"instructions": "Upload front and back pages"}'
                className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none" />
            </div>

            {/* Required Checkbox */}
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="required" 
                checked={formData.required} 
                onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                className="w-4 h-4" 
              />
              <label htmlFor="required" className="text-sm font-medium">Required task</label>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isCreating}>{isCreating ? 'Adding...' : 'Add Task'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function EditTaskModal({ task, onClose, onUpdated }: any) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({ 
    name: task.name || '', 
    type: task.type || 'action', 
    status: task.status || 'pending',
    required: task.required !== undefined ? task.required : true, 
    payment_status: task.payment_status || 'not_required',
    estimated_start_date: task.estimated_start_date ? task.estimated_start_date.split('T')[0] : '',
    estimated_complete_date: task.estimated_complete_date ? task.estimated_complete_date.split('T')[0] : '',
    actual_start_date: task.actual_start_date ? task.actual_start_date.split('T')[0] : '',
    actual_complete_date: task.actual_complete_date ? task.actual_complete_date.split('T')[0] : '',
    data: typeof task.data === 'string' ? task.data : (task.data ? JSON.stringify(task.data, null, 2) : '')
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUpdating(true);
      const payload: any = {
        name: formData.name,
        type: formData.type,
        status: formData.status,
        required: formData.required,
        payment_status: formData.payment_status,
      };
      
      if (formData.estimated_start_date) payload.estimated_start_date = formData.estimated_start_date;
      if (formData.estimated_complete_date) payload.estimated_complete_date = formData.estimated_complete_date;
      if (formData.actual_start_date) payload.actual_start_date = formData.actual_start_date;
      if (formData.actual_complete_date) payload.actual_complete_date = formData.actual_complete_date;
      if (formData.data) payload.data = formData.data;
      
      await tasksApi.update(task._id, payload);
      onUpdated();
    } catch (e) { 
      console.error('Failed to update task:', e); 
    } finally { 
      setIsUpdating(false); 
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto" onClick={onClose}>
      <Card className="w-full max-w-2xl mx-4 my-8" onClick={(e) => e.stopPropagation()}>
        <CardHeader><CardTitle>Edit Task</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Task Name *</label>
              <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background">
                  <option value="action">Action</option>
                  <option value="document_upload">Document Upload</option>
                  <option value="payment">Payment</option>
                  <option value="approval">Approval</option>
                  <option value="booking">Booking</option>
                  <option value="meeting">Meeting</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status *</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background">
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Status *</label>
              <select value={formData.payment_status} onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background">
                <option value="not_required">Not Required</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Est. Start Date</label>
                <input type="date" value={formData.estimated_start_date} onChange={(e) => setFormData({ ...formData, estimated_start_date: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Est. Complete Date</label>
                <input type="date" value={formData.estimated_complete_date} onChange={(e) => setFormData({ ...formData, estimated_complete_date: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Actual Start Date</label>
                <input type="date" value={formData.actual_start_date} onChange={(e) => setFormData({ ...formData, actual_start_date: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Actual Complete Date</label>
                <input type="date" value={formData.actual_complete_date} onChange={(e) => setFormData({ ...formData, actual_complete_date: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Additional Data</label>
              <textarea value={formData.data} onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                rows={3} className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="required-edit" checked={formData.required} 
                onChange={(e) => setFormData({ ...formData, required: e.target.checked })} className="w-4 h-4" />
              <label htmlFor="required-edit" className="text-sm font-medium">Required task</label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isUpdating}>{isUpdating ? 'Updating...' : 'Update Task'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function UploadModal({ projectId, phaseId, onClose, onUploaded }: any) {
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;
    
    try {
      setIsUploading(true);
      setError('');
      setUploadProgress({ current: 0, total: files.length });
      
      console.log(`📤 [Upload] Starting upload of ${files.length} file(s)...`);
      
      // Upload files sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i + 1, total: files.length });
        
        console.log(`📤 [Upload] Uploading file ${i + 1}/${files.length}: ${file.name}`);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('project_id', projectId);
        formData.append('phase_id', phaseId);
        
        await documentsApi.upload(formData);
        console.log(`✅ [Upload] File ${i + 1}/${files.length} uploaded successfully`);
      }
      
      console.log('✅ [Upload] All files uploaded successfully');
      onUploaded(); // Trigger refresh
      onClose(); // Close modal
    } catch (e: any) { 
      console.error('❌ [Upload] Upload failed:', e);
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
              <label className="block text-sm font-medium mb-1">Files *</label>
              <input 
                type="file" 
                multiple
                onChange={(e) => {
                  const selectedFiles = Array.from(e.target.files || []);
                  setFiles(selectedFiles);
                  console.log(`📄 [Upload] ${selectedFiles.length} file(s) selected:`, selectedFiles.map(f => f.name));
                }} 
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
              <Button type="submit" disabled={isUploading || files.length === 0}>
                {isUploading ? `Uploading... (${uploadProgress.current}/${uploadProgress.total})` : `Upload ${files.length > 0 ? `(${files.length})` : ''}`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Meeting Card with Attendees and Action Items
function MeetingCard({ meeting, onRefresh }: any) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete meeting?')) return;
    try {
      await meetingsApi.delete(meeting._id);
      onRefresh();
    } catch (e) { console.error(e); }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="font-semibold">{meeting.title}</h4>
              {meeting.phase_id?.name && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                  {meeting.phase_id.name}
                </span>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground mb-2">
              📅 {formatDate(meeting.meeting_date || meeting.scheduled_at)}
            </div>
            
            {meeting.summary && (
              <div className="text-sm mb-2">
                <strong>Summary:</strong> {meeting.summary}
              </div>
            )}
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-primary hover:underline"
            >
              {isExpanded ? 'Hide details' : 'Show details'}
            </button>
            
            {isExpanded && (
              <div className="mt-3 space-y-3">
                {meeting.attendees?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Attendees:</p>
                    <div className="flex flex-wrap gap-2">
                      {meeting.attendees.map((a: any, i: number) => (
                        <span key={i} className="text-xs px-2 py-1 rounded-full bg-muted">
                          {a.name} {a.role && `(${a.role})`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {meeting.action_items?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Action Items:</p>
                    <ul className="text-sm space-y-1">
                      {meeting.action_items.map((item: any, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          {item.completed ? (
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300 mt-0.5" />
                          )}
                          <span className={item.completed ? 'line-through text-muted-foreground' : ''}>
                            {item.text}
                            {item.assignee && <span className="text-muted-foreground"> - {item.assignee}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <Button variant="ghost" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MeetingModal({ projectId, phases, onCreated }: any) {
  const [showModal, setShowModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    summary: '',
    phase_id: '',
    meeting_date: '',
    attendees: '',       // comma-separated names
    action_items: '',    // comma-separated items
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      
      // Parse attendees
      const attendees = formData.attendees
        ? formData.attendees.split(',').map(name => ({ name: name.trim() }))
        : [];
      
      // Parse action items
      const action_items = formData.action_items
        ? formData.action_items.split(',').map(text => ({ text: text.trim(), completed: false }))
        : [];
      
      await meetingsApi.create({
        project_id: projectId,
        phase_id: formData.phase_id || undefined,
        title: formData.title,
        description: formData.description,
        summary: formData.summary,
        meeting_date: formData.meeting_date || undefined,
        scheduled_at: formData.meeting_date || undefined,
        attendees,
        action_items,
      });
      
      setShowModal(false);
      setFormData({ title: '', description: '', summary: '', phase_id: '', meeting_date: '', attendees: '', action_items: '' });
      onCreated();
    } catch (e) { console.error(e); } finally { setIsCreating(false); }
  };

  return (
    <>
      <Button size="sm" onClick={() => setShowModal(true)}>
        <Plus className="w-4 h-4 mr-1" />
        Add Meeting
      </Button>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader><CardTitle>Add Meeting</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Meeting title"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Phase</label>
                    <select value={formData.phase_id} onChange={(e) => setFormData({ ...formData, phase_id: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background">
                      <option value="">Select phase...</option>
                      {phases.map((p: any) => <option key={p._id} value={p._id}>{p.name || PHASE_NAMES[p.type_of_phase]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Meeting Date</label>
                    <input type="datetime-local" value={formData.meeting_date} onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Summary/Notes</label>
                  <textarea value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    rows={3} placeholder="Meeting summary and notes..."
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Attendees</label>
                  <input value={formData.attendees} onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                    placeholder="Comma-separated: John, Jane, Mike"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background" />
                  <p className="text-xs text-muted-foreground mt-1">Enter names separated by commas</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Action Items</label>
                  <textarea value={formData.action_items} onChange={(e) => setFormData({ ...formData, action_items: e.target.value })}
                    rows={2} placeholder="Comma-separated: Follow up on design, Review contract, Send invoice"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none" />
                  <p className="text-xs text-muted-foreground mt-1">Enter action items separated by commas</p>
                </div>
                
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Add Meeting'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
