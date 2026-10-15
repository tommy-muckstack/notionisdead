import { currentUser } from "@/lib/session";
import { Workspace } from "@/components/notion/Workspace";
export default async function AppHome({ params }: { params: Promise<{ view?: string[] }> }) {
  const user = (await currentUser())!; const { view } = await params;
  return <Workspace uid={user.id} name={user.name} email={user.email} demo={user.demo} view={view ?? []} />;
}
