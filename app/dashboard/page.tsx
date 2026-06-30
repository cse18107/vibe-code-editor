import AddNewButton from "@/features/dashboard/components/add-new-btn";
import AddRepo from "@/features/dashboard/components/add-repo";

import ProjectTable from "@/features/dashboard/components/project-table";
import { getAllPlaygroundForUser , deleteProjectById ,editProjectById , duplicateProjectById} from "@/features/playground/actions";
import { getSharedPlaygrounds } from "@/features/collaboration/actions";
import { CollaborationBar } from "@/features/collaboration/components/collaboration-bar";
import { FolderOpen } from "lucide-react";

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-200 text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
      <FolderOpen className="h-6 w-6" />
    </div>
    <h2 className="text-base font-semibold tracking-tight">No projects yet</h2>
    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
      Create a new playground to get started.
    </p>
  </div>
);

const DashboardMainPage = async () => {
  const [playgrounds, shared] = await Promise.all([
    getAllPlaygroundForUser(),
    getSharedPlaygrounds(),
  ]);

  return (
    <div className="flex flex-col justify-start items-center min-h-screen mx-auto max-w-7xl px-4 py-10">
      <CollaborationBar />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <AddNewButton />
        <AddRepo />
      </div>

      <div className="mt-10 flex flex-col justify-center items-center w-full">
        {playgrounds && playgrounds.length === 0 ? (
          <EmptyState />
        ) : (
          // @ts-ignore
          <ProjectTable
            projects={playgrounds || []}
            onDeleteProject={deleteProjectById}
            onUpdateProject={editProjectById}
            onDuplicateProject={duplicateProjectById}
          />
        )}
      </div>

      {shared && shared.length > 0 && (
        <div className="mt-10 flex flex-col w-full">
          <h2 className="text-lg font-semibold mb-3">Shared with me</h2>
          {/* @ts-ignore */}
          <ProjectTable
            projects={shared}
            onDeleteProject={deleteProjectById}
            onUpdateProject={editProjectById}
            onDuplicateProject={duplicateProjectById}
          />
        </div>
      )}
    </div>
  );
};

export default DashboardMainPage;
