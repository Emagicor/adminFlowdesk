'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { Users, Plus, Trash2, Pencil, Phone, Mail, Briefcase, Lock } from 'lucide-react';
import { useCustomer } from '@/context';
import { projectsApi, phasesApi, crewApi } from '@/lib/api';

export default function CrewPage() {
  const { selectedCustomer } = useCustomer();
  const [crew, setCrew] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [phases, setPhases] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedPhase, setSelectedPhase] = useState<string>('NA');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCrew, setEditingCrew] = useState<any>(null);

  useEffect(() => {
    if (selectedCustomer) {
      loadProjects();
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (selectedProject && selectedProject !== 'NA') {
      loadPhases();
      loadCrew();
    } else {
      setPhases([]);
      setCrew([]);
      setSelectedPhase('NA');
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedProject && selectedProject !== 'NA') {
      loadCrew();
    }
  }, [selectedPhase]);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const response = await projectsApi.list(1, 100, selectedCustomer?._id);
      const allProjects = response.data?.projects || [];
      
      const customerProjects = allProjects.filter((project: any) => {
        const pid = typeof project.customer_id === 'object' ? project.customer_id._id : project.customer_id;
        return pid === selectedCustomer?._id;
      });
      
      setProjects(customerProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPhases = async () => {
    if (!selectedProject || selectedProject === 'NA') return;
    
    try {
      const response = await phasesApi.listByProject(selectedProject);
      setPhases(response.data?.phases || []);
    } catch (error) {
      console.error('Failed to load phases:', error);
    }
  };

  const loadCrew = async () => {
    if (!selectedProject || selectedProject === 'NA') {
      setCrew([]);
      return;
    }

    try {
      setIsLoading(true);
      
      if (selectedPhase === 'NA') {
        // Load all crew for the project
        const response = await crewApi.listByProject(selectedProject);
        setCrew(response.data?.crew || []);
      } else {
        // Load crew for specific phase
        const response = await crewApi.listByPhase(selectedPhase);
        setCrew(response.data?.crew || []);
      }
    } catch (error) {
      console.error('Failed to load crew:', error);
      setCrew([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCrew = async (id: string) => {
    if (!confirm('Are you sure you want to delete this crew member?')) return;

    try {
      await crewApi.delete(id);
      loadCrew();
    } catch (error) {
      console.error('Failed to delete crew member:', error);
      alert('Failed to delete crew member');
    }
  };

  const handleEditClick = (member: any) => {
    setEditingCrew(member);
    setShowEditModal(true);
  };

  const handleUpdateCrew = async (id: string, data: any) => {
    try {
      await crewApi.update(id, data);
      setShowEditModal(false);
      setEditingCrew(null);
      loadCrew();
    } catch (error: any) {
      console.error('Failed to update crew member:', error);
      alert(error.message || 'Failed to update crew member');
    }
  };

  const getRoleLabel = (roles: string | string[]) => {
    if (!roles) return 'N/A';
    if (Array.isArray(roles)) {
      return roles.join(', ');
    }
    return roles;
  };

  if (!selectedCustomer) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Customer Selected</h3>
            <p className="text-muted-foreground">Please select a customer to manage crew members.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="w-8 h-8" />
              Crew Management
            </h1>
            <p className="text-muted-foreground mt-1">{selectedCustomer.name}'s crew members</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            disabled={!selectedProject || selectedProject === 'NA'}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Crew Member
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Project Dropdown */}
              <div>
                <label className="block text-sm font-medium mb-2">Project *</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select Project</option>
                  <option value="NA">N/A</option>
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.project_type} - {project.location}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phase Dropdown - Locked to All Phases */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  Phase
                  <Lock className="w-3 h-3 text-muted-foreground" />
                </label>
                <div className="relative">
                  <select
                    value="NA"
                    disabled
                    className="w-full px-3 py-2 border border-input rounded-lg bg-muted cursor-not-allowed opacity-75"
                  >
                    <option value="NA">All Phases (Locked)</option>
                  </select>
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Crew List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-muted-foreground">Loading crew...</span>
              </div>
            </CardContent>
          </Card>
        ) : !selectedProject || selectedProject === 'NA' ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Select a Project</h3>
              <p className="text-muted-foreground">Choose a project to view and manage crew members.</p>
            </CardContent>
          </Card>
        ) : crew.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Crew Members</h3>
              <p className="text-muted-foreground mb-4">
                {selectedPhase === 'NA' 
                  ? 'No crew members added to this project yet.'
                  : 'No crew members added to this phase yet.'}
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Crew Member
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {crew.map((member) => (
              <Card key={member._id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{member.contact_name}</h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Array.isArray(member.contact_role) && member.contact_role.length > 0 ? (
                            member.contact_role.map((role: string, idx: number) => (
                              <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                {role}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                              {typeof member.contact_role === 'string' ? member.contact_role : 'N/A'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditClick(member)}
                        className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                        title="Edit crew member"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCrew(member._id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                        title="Delete crew member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {member.phase_id && (
                    <div className="mb-3 text-sm text-muted-foreground">
                      <span className="font-medium">Phase:</span> {member.phase_id.name}
                    </div>
                  )}

                  <div className="space-y-2 text-sm">
                    {member.contact_phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>{member.contact_phone}</span>
                      </div>
                    )}
                    {member.contact_email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{member.contact_email}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Crew Modal */}
        {showCreateModal && (
          <CreateCrewModal
            phases={phases}
            selectedPhase={selectedPhase}
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              setShowCreateModal(false);
              loadCrew();
            }}
          />
        )}

        {/* Edit Crew Modal */}
        {showEditModal && editingCrew && (
          <EditCrewModal
            crew={editingCrew}
            phases={phases}
            onClose={() => {
              setShowEditModal(false);
              setEditingCrew(null);
            }}
            onUpdate={handleUpdateCrew}
          />
        )}
      </div>
    </div>
  );
}

// Create Crew Modal Component
function CreateCrewModal({ phases, selectedPhase, onClose, onCreated }: any) {
  const [formData, setFormData] = useState({
    contact_name: '',
    contact_role: '',
    contact_phone: '',
    contact_email: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find the onboarding phase
    const onboardingPhase = phases.find((p: any) => p.type_of_phase === 'onboarding');
    
    if (!onboardingPhase) {
      alert('Onboarding phase not found');
      return;
    }

    try {
      setIsCreating(true);
      
      // Convert comma-separated roles to array
      const rolesArray = formData.contact_role
        .split(',')
        .map((role: string) => role.trim())
        .filter(Boolean);
      
      if (rolesArray.length === 0) {
        alert('Please enter at least one role');
        setIsCreating(false);
        return;
      }
      
      // Always create for onboarding phase only
      await crewApi.create(onboardingPhase._id, {
        contact_name: formData.contact_name,
        contact_role: rolesArray,
        contact_phone: formData.contact_phone || undefined,
        contact_email: formData.contact_email || undefined,
      });
      
      onCreated();
    } catch (error: any) {
      console.error('Failed to create crew member:', error);
      alert(error.message || 'Failed to create crew member');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h2 className="text-2xl font-bold">Add Crew Member</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Phase - Locked to Onboarding */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                Phase *
                <Lock className="w-3 h-3 text-muted-foreground" />
              </label>
              <div className="relative">
                <input
                  type="text"
                  value="Onboarding (Locked)"
                  disabled
                  className="w-full px-3 py-2 border border-input rounded-lg bg-muted cursor-not-allowed opacity-75"
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Name *</label>
              <input
                type="text"
                required
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="John Designer"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium mb-2">Roles *</label>
              <input
                type="text"
                required
                value={formData.contact_role}
                onChange={(e) => setFormData({ ...formData, contact_role: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Director, Manager, Coordinator"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter multiple roles separated by commas
              </p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="+91 98765 43210"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="john@designstudio.com"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Adding...' : 'Add Crew Member'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Crew Modal Component
function EditCrewModal({ crew, phases, onClose, onUpdate }: any) {
  const [formData, setFormData] = useState({
    contact_name: crew.contact_name || '',
    contact_role: Array.isArray(crew.contact_role) ? crew.contact_role.join(', ') : (crew.contact_role || ''),
    contact_phone: crew.contact_phone || '',
    contact_email: crew.contact_email || '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsUpdating(true);
      
      // Convert comma-separated roles to array
      const rolesArray = formData.contact_role
        .split(',')
        .map((role: string) => role.trim())
        .filter(Boolean);
      
      if (rolesArray.length === 0) {
        alert('Please enter at least one role');
        setIsUpdating(false);
        return;
      }
      
      await onUpdate(crew._id, {
        contact_name: formData.contact_name,
        contact_role: rolesArray,
        contact_phone: formData.contact_phone || undefined,
        contact_email: formData.contact_email || undefined,
      });
    } catch (error: any) {
      console.error('Failed to update crew member:', error);
      alert(error.message || 'Failed to update crew member');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h2 className="text-2xl font-bold">Edit Crew Member</h2>
          {crew.phase_id && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Lock className="w-3 h-3" />
              <span>Phase: {crew.phase_id.name} (Locked to Onboarding)</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Name *</label>
              <input
                type="text"
                required
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="John Designer"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium mb-2">Roles *</label>
              <input
                type="text"
                required
                value={formData.contact_role}
                onChange={(e) => setFormData({ ...formData, contact_role: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Director, Manager, Coordinator"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter multiple roles separated by commas
              </p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="+91 98765 43210"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="john@designstudio.com"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={isUpdating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update Crew Member'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
