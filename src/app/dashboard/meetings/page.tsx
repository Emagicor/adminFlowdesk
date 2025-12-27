'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { CalendarDays, Plus, Trash2, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useCustomer } from '@/context';
import { projectsApi, meetingsApi, phasesApi } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/utils';

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

export default function MeetingsPage() {
  const { selectedCustomer } = useCustomer();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [phases, setPhases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMeetings, setTotalMeetings] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (selectedCustomer) {
      loadData();
    }
  }, [selectedCustomer, page]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Try backend filtering, then client-side filter as safety
      const projectsRes = await projectsApi.list(1, 100, selectedCustomer?._id);
      const allProjects = projectsRes.data?.projects || [];
      
      // Client-side filter to ensure only selected customer's projects
      const customerProjects = allProjects.filter((project: any) => {
        const pid = typeof project.customer_id === 'object' ? project.customer_id._id : project.customer_id;
        return pid === selectedCustomer?._id;
      });
      
      setProjects(customerProjects);

      const allPhases: any[] = [];
      const allMeetings: any[] = [];
      let combinedTotal = 0;
      
      for (const project of customerProjects) {
        try {
          const phasesRes = await phasesApi.listByProject(project._id);
          const projectPhases = phasesRes.data?.phases || [];
          allPhases.push(...projectPhases.map((p: any) => ({ ...p, projectId: project._id })));
          
          const meetingsRes = await meetingsApi.listByProject(project._id, page, limit);
          const meetings = meetingsRes.data?.meetings || [];
          allMeetings.push(...meetings.map((m: any) => ({ ...m, projectType: project.project_type })));
          
          // Accumulate total from pagination
          if (meetingsRes.data?.pagination) {
            combinedTotal += meetingsRes.data.pagination.total;
          }
        } catch (e) {}
      }
      
      setPhases(allPhases);
      setMeetings(allMeetings);
      setTotalMeetings(combinedTotal);
      setTotalPages(Math.ceil(combinedTotal / limit));
    } catch (error) {
      console.error('Failed to load meetings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete meeting?')) return;
    try {
      await meetingsApi.delete(id);
      loadData();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meetings</h1>
          <p className="text-muted-foreground mt-1">{meetings.length} meetings for {selectedCustomer?.name}</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Meeting
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <Card className="p-12 text-center">
          <CalendarDays className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-medium text-lg mb-2">No meetings yet</h3>
          <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Meeting
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => (
            <MeetingCard key={meeting._id} meeting={meeting} onDelete={() => handleDelete(meeting._id)} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && meetings.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({totalMeetings} total meetings)
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {showCreateModal && (
        <CreateMeetingModal
          projects={projects}
          phases={phases}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); setPage(1); loadData(); }}
        />
      )}
    </div>
  );
}

function MeetingCard({ meeting, onDelete }: any) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleActionItem = async (itemIndex: number) => {
    try {
      setIsUpdating(true);
      const updatedActionItems = meeting.action_items.map((item: any, i: number) =>
        i === itemIndex ? { ...item, completed: !item.completed } : item
      );

      await meetingsApi.update(meeting._id, {
        action_items: updatedActionItems
      });

      // Update local state
      meeting.action_items = updatedActionItems;
      setIsUpdating(false);
    } catch (error) {
      console.error('Failed to update action item:', error);
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-lg text-foreground">{meeting.title}</h3>
              {meeting.phase_id?.name && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {meeting.phase_id.name}
                </span>
              )}
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                {meeting.projectType}
              </span>
            </div>
            
            <div className="text-sm text-muted-foreground mb-2">
              📅 {formatDateTime(meeting.meeting_date || meeting.scheduled_at)}
            </div>
            
            {meeting.summary && (
              <div className="text-sm mb-3 p-3 bg-muted/50 rounded-lg">
                <strong>Summary:</strong> {meeting.summary}
              </div>
            )}
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              {isExpanded ? 'Hide details' : 'Show attendees & action items'}
            </button>
            
            {isExpanded && (
              <div className="mt-4 space-y-4">
                {meeting.attendees?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">👥 Attendees ({meeting.attendees.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {meeting.attendees.map((a: any, i: number) => (
                        <span key={i} className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {a.name} {a.role && `• ${a.role}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {meeting.action_items?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">✅ Action Items ({meeting.action_items.length})</p>
                    <ul className="space-y-2">
                      {meeting.action_items.map((item: any, i: number) => (
                        <li 
                          key={i} 
                          className="flex items-start gap-2 p-2 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => !isUpdating && handleToggleActionItem(i)}
                        >
                          {item.completed ? (
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <span className={item.completed ? 'text-muted-foreground' : ''}>
                              {item.text}
                            </span>
                            {item.assignee && (
                              <span className="text-xs text-muted-foreground ml-2">
                                → {item.assignee}
                              </span>
                            )}
                            {item.due_date && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (due: {formatDate(item.due_date)})
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateMeetingModal({ projects, phases, onClose, onCreated }: any) {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    project_id: '',
    phase_id: '',
    meeting_date: '',
    attendees: '',
    action_items: '',
  });

  const selectedProjectPhases = phases.filter((p: any) => p.projectId === formData.project_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_id) return;
    
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
        project_id: formData.project_id,
        phase_id: formData.phase_id || undefined,
        title: formData.title,
        summary: formData.summary,
        meeting_date: formData.meeting_date || undefined,
        scheduled_at: formData.meeting_date || undefined,
        attendees,
        action_items,
      });
      onCreated();
    } catch (e) { console.error(e); } finally { setIsCreating(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardHeader><CardTitle>Add Meeting</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Design Review Meeting"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project *</label>
                <select required value={formData.project_id} onChange={(e) => setFormData({ ...formData, project_id: e.target.value, phase_id: '' })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background">
                  <option value="">Select project...</option>
                  {projects.map((p: any) => <option key={p._id} value={p._id}>{p.project_type}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phase</label>
                <select value={formData.phase_id} onChange={(e) => setFormData({ ...formData, phase_id: e.target.value })}
                  disabled={!formData.project_id}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background disabled:opacity-50">
                  <option value="">Select phase...</option>
                  {selectedProjectPhases.map((p: any) => (
                    <option key={p._id} value={p._id}>{p.name || PHASE_NAMES[p.type_of_phase]}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Meeting Date</label>
              <input type="datetime-local" value={formData.meeting_date} onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background" />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Summary / Notes</label>
              <textarea value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                rows={3} placeholder="Meeting summary, key decisions, notes..."
                className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none" />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Attendees</label>
              <input value={formData.attendees} onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                placeholder="John, Jane, Mike (comma-separated)"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background" />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Action Items</label>
              <textarea value={formData.action_items} onChange={(e) => setFormData({ ...formData, action_items: e.target.value })}
                rows={2} placeholder="Follow up on design, Review contract, Send invoice (comma-separated)"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none" />
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isCreating || !formData.project_id}>
                {isCreating ? 'Creating...' : 'Add Meeting'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
