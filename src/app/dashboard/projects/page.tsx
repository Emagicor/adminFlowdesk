'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { FolderKanban, Plus, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCustomer } from '@/context';
import { projectsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function ProjectsPage() {
  const router = useRouter();
  const { selectedCustomer } = useCustomer();
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    project_type: '',
    project_description: '',
    project_level_budget: '',
    location: '',
  });

  useEffect(() => {
    if (selectedCustomer) {
      loadProjects();
    }
  }, [selectedCustomer]);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      console.log('📁 [Projects Page] Loading projects for customer:', selectedCustomer);
      const response = await projectsApi.list(1, 100, selectedCustomer?._id);
      console.log('📁 [Projects Page] Received projects from backend:', response.data?.projects);
      
      // WORKAROUND: Backend is not filtering by customer_id, so we filter client-side
      const allProjects = response.data?.projects || [];
      const filteredProjects = allProjects.filter((project: any) => {
        // Check if project.customer_id is an object or string
        const projectCustomerId = typeof project.customer_id === 'object' 
          ? project.customer_id._id 
          : project.customer_id;
        
        const match = projectCustomerId === selectedCustomer?._id;
        console.log(`📁 Project "${project.project_type}" - customer_id: ${projectCustomerId}, selected: ${selectedCustomer?._id}, match: ${match}`);
        return match;
      });
      
      console.log('📁 [Projects Page] Filtered projects for current customer:', filteredProjects);
      setProjects(filteredProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      await projectsApi.create({
        customer_id: selectedCustomer?._id,
        ...formData,
        project_level_budget: formData.project_level_budget ? Number(formData.project_level_budget) : undefined,
      });
      setShowCreateModal(false);
      setFormData({ project_type: '', project_description: '', project_level_budget: '', location: '' });
      loadProjects();
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300';
      case 'completed': return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
      case 'on_hold': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-1">{selectedCustomer?.name}'s projects</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Projects List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="p-12 text-center">
          <FolderKanban className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-medium text-lg mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-4">Create your first project to get started</p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => (
            <Link key={project._id} href={`/dashboard/projects/${project._id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">{project.project_type}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                  {project.project_description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {project.project_description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Phase: {project.current_phase?.replace(/_/g, ' ')}</span>
                    {project.location && <span>📍 {project.location}</span>}
                    {project.project_level_budget && (
                      <span>💰 ₹{project.project_level_budget.toLocaleString()}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Created {formatDate(project.createdAt)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <Card className="w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Create New Project</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Project Type *</label>
                  <input
                    type="text"
                    required
                    value={formData.project_type}
                    onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                    placeholder="e.g., Home Furniture, Office Setup"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.project_description}
                    onChange={(e) => setFormData({ ...formData, project_description: e.target.value })}
                    rows={3}
                    placeholder="Brief description of the project"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Budget (₹)</label>
                    <input
                      type="number"
                      value={formData.project_level_budget}
                      onChange={(e) => setFormData({ ...formData, project_level_budget: e.target.value })}
                      placeholder="50000"
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Location</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., Delhi"
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create Project'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
