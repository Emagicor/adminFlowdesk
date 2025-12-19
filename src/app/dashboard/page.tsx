'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui';
import { FolderKanban, Layers, FileText, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { useCustomer } from '@/context';
import { projectsApi, phasesApi, tasksApi, meetingsApi } from '@/lib/api';

export default function DashboardPage() {
  const { selectedCustomer } = useCustomer();
  const [projectsData, setProjectsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (selectedCustomer) {
      loadDashboardData();
    }
  }, [selectedCustomer]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      const projectsRes = await projectsApi.list(1, 100, selectedCustomer?._id);
      const allProjects = projectsRes.data?.projects || [];
      
      const customerProjects = allProjects.filter((project: any) => {
        const pid = typeof project.customer_id === 'object' ? project.customer_id._id : project.customer_id;
        return pid === selectedCustomer?._id;
      });

      const projectsWithData = await Promise.all(
        customerProjects.map(async (project: any) => {
          try {
            const phasesRes = await phasesApi.listByProject(project._id);
            const phases = phasesRes.data?.phases || [];
            
            let allTasks: any[] = [];
            for (const phase of phases) {
              try {
                const tasksRes = await tasksApi.listByPhase(phase._id);
                const phaseTasks = tasksRes.data?.tasks || [];
                allTasks = [...allTasks, ...phaseTasks];
              } catch (e) {}
            }
            
            const meetingsRes = await meetingsApi.listByProject(project._id);
            const meetings = meetingsRes.data?.meetings || [];
            
            // Find ongoing phases (status = 'in_progress')
            const ongoingPhases = phases.filter((p: any) => p.status === 'in_progress');
            
            // Find ongoing tasks (not completed or cancelled)
            const ongoingTasks = allTasks.filter((t: any) => 
              t.status !== 'completed' && t.status !== 'cancelled'
            );
            
            // Calculate completion percentage
            const completedPhases = phases.filter((p: any) => p.status === 'completed').length;
            const completionPercentage = phases.length > 0 
              ? Math.round((completedPhases / phases.length) * 100) 
              : 0;
            
            // Get current phase (first in_progress phase or last phase)
            const currentPhase = ongoingPhases[0] || phases[phases.length - 1];
            
            return {
              ...project,
              phases,
              ongoingPhases,
              ongoingTasks,
              meetings,
              currentPhase,
              completionPercentage
            };
          } catch (e) {
            return { 
              ...project, 
              phases: [], 
              ongoingPhases: [], 
              ongoingTasks: [], 
              meetings: [], 
              currentPhase: null,
              completionPercentage: 0
            };
          }
        })
      );

      setProjectsData(projectsWithData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (projectsData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <FolderKanban className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Projects Yet</h2>
        <p className="text-muted-foreground mb-6">Create your first project to get started</p>
        <Link href="/dashboard/projects">
          <Button>Go to Projects</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your projects</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projectsData.map((project) => (
          <Card key={project._id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">{project.project_type}</CardTitle>
                  {project.currentPhase && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      <Layers className="w-4 h-4" />
                      {project.currentPhase.name || `Phase ${project.currentPhase.order}`}
                    </div>
                  )}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  project.status === 'active' ? 'bg-green-500/10 text-green-500' :
                  project.status === 'completed' ? 'bg-blue-500/10 text-blue-500' :
                  'bg-gray-500/10 text-gray-500'
                }`}>
                  {project.status}
                </div>
              </div>
              
              {/* Completion Progress Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Project Progress</span>
                  <span className="font-medium">{project.completionPercentage}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${project.completionPercentage}%` }}
                  />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-primary">{project.ongoingPhases.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">In Progress</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-orange-500">{project.ongoingTasks.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Tasks</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-purple-500">{project.meetings.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Meetings</div>
                </div>
              </div>

              {/* Ongoing Phases List */}
              {project.ongoingPhases.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Ongoing Phases:</p>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {project.ongoingPhases.map((phase: any) => (
                      <div key={phase._id} className="text-sm px-2 py-1 rounded bg-primary/5 text-primary">
                        • {phase.name || `Phase ${phase.order}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ongoing Tasks List */}
              {project.ongoingTasks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Ongoing Tasks:</p>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {project.ongoingTasks.slice(0, 3).map((task: any) => (
                      <div key={task._id} className="text-sm px-2 py-1 rounded bg-orange-500/5 text-orange-600">
                        • {task.name}
                      </div>
                    ))}
                    {project.ongoingTasks.length > 3 && (
                      <div className="text-xs text-muted-foreground px-2">
                        +{project.ongoingTasks.length - 3} more tasks
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                <Link href={`/dashboard/projects/${project._id}`} className="flex-1 min-w-[140px]">
                  <Button variant="outline" className="w-full" size="sm">
                    <Layers className="w-4 h-4 mr-2" />
                    View Phases
                  </Button>
                </Link>
                <Link href="/dashboard/documents" className="flex-1 min-w-[140px]">
                  <Button variant="outline" className="w-full" size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    Documents
                  </Button>
                </Link>
                <Link href="/dashboard/meetings" className="flex-1 min-w-[140px]">
                  <Button variant="outline" className="w-full" size="sm">
                    <CalendarDays className="w-4 h-4 mr-2" />
                    Meetings
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
