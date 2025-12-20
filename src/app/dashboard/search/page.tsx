'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, Button } from '@/components/ui';
import { Search, FileText, FolderOpen, Calendar, ArrowRight } from 'lucide-react';
import { useCustomer } from '@/context';
import { projectsApi, documentsApi, meetingsApi } from '@/lib/api';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { selectedCustomer } = useCustomer();
  const query = searchParams.get('q') || '';
  
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any>({
    projects: [],
    documents: [],
    meetings: []
  });

  useEffect(() => {
    if (query && selectedCustomer) {
      performSearch();
    }
  }, [query, selectedCustomer]);

  const performSearch = async () => {
    if (!selectedCustomer) return;
    
    try {
      setIsSearching(true);
      const keyword = query.toLowerCase();

      // Search projects
      const projectsRes = await projectsApi.list(1, 100, selectedCustomer._id);
      const allProjects = (projectsRes.data?.projects || []).filter((p: any) => {
        const pid = typeof p.customer_id === 'object' ? p.customer_id._id : p.customer_id;
        return pid === selectedCustomer._id;
      });
      
      const matchingProjects = allProjects.filter((p: any) =>
        p.project_type?.toLowerCase().includes(keyword) ||
        p.project_description?.toLowerCase().includes(keyword) ||
        p.status?.toLowerCase().includes(keyword)
      );

      // Search documents - get from all projects
      const allDocuments: any[] = [];
      for (const project of allProjects) {
        try {
          const docsRes = await documentsApi.listByProject(project._id);
          const projectDocs = docsRes.data?.documents || [];
          allDocuments.push(...projectDocs);
        } catch (e) {
          console.error('Failed to load documents for project:', project._id);
        }
      }
      
      const matchingDocuments = allDocuments.filter((d: any) =>
        d.document_name?.toLowerCase().includes(keyword) ||
        d.document_type?.toLowerCase().includes(keyword) ||
        d.status?.toLowerCase().includes(keyword)
      );

      // Search meetings - get from all projects
      const allMeetings: any[] = [];
      for (const project of allProjects) {
        try {
          const meetingsRes = await meetingsApi.listByProject(project._id);
          const projectMeetings = meetingsRes.data?.meetings || [];
          allMeetings.push(...projectMeetings);
        } catch (e) {
          console.error('Failed to load meetings for project:', project._id);
        }
      }
      
      const matchingMeetings = allMeetings.filter((m: any) =>
        m.title?.toLowerCase().includes(keyword) ||
        m.description?.toLowerCase().includes(keyword) ||
        m.summary?.toLowerCase().includes(keyword)
      );

      setResults({
        projects: matchingProjects,
        documents: matchingDocuments,
        meetings: matchingMeetings
      });
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const highlightText = (text: string, keyword: string) => {
    if (!text || !keyword) return text;
    const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">{part}</mark>
      ) : (
        part
      )
    );
  };

  const totalResults = results.projects.length + results.documents.length + results.meetings.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Search Results</h1>
        <p className="text-muted-foreground mt-1">
          {isSearching ? 'Searching...' : `Found ${totalResults} results for "${query}"`}
        </p>
      </div>

      {isSearching ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      ) : totalResults === 0 ? (
        <Card className="p-12 text-center">
          <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-medium text-lg mb-2">No results found</h3>
          <p className="text-muted-foreground">Try different keywords or check your spelling</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Projects */}
          {results.projects.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                Projects ({results.projects.length})
              </h2>
              <div className="space-y-3">
                {results.projects.map((project: any) => (
                  <Card key={project._id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-lg">
                            {highlightText(project.project_type || 'Unnamed Project', query)}
                          </h3>
                          {project.project_description && (
                            <p className="text-muted-foreground text-sm mt-1">
                              {highlightText(project.project_description, query)}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              project.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' :
                              project.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            }`}>
                              {highlightText(project.status, query)}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dashboard/projects/${project._id}`)}
                        >
                          View <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {results.documents.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documents ({results.documents.length})
              </h2>
              <div className="space-y-3">
                {results.documents.map((doc: any) => (
                  <Card key={doc._id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium">
                            {highlightText(doc.document_name || 'Unnamed Document', query)}
                          </h3>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">
                              {highlightText(doc.document_type || 'Unknown Type', query)}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              doc.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' :
                              doc.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            }`}>
                              {highlightText(doc.status, query)}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push('/dashboard/documents')}
                        >
                          View <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Meetings */}
          {results.meetings.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Meetings ({results.meetings.length})
              </h2>
              <div className="space-y-3">
                {results.meetings.map((meeting: any) => (
                  <Card key={meeting._id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium">
                            {highlightText(meeting.title || 'Unnamed Meeting', query)}
                          </h3>
                          {meeting.description && (
                            <p className="text-muted-foreground text-sm mt-1">
                              {highlightText(meeting.description, query)}
                            </p>
                          )}
                          {meeting.summary && (
                            <p className="text-muted-foreground text-sm mt-1">
                              Summary: {highlightText(meeting.summary, query)}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push('/dashboard/meetings')}
                        >
                          View <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
