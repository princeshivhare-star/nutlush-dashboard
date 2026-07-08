import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Dashboard from "@/components/Dashboard";
import SignOutButton from "@/components/SignOutButton";

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("team_members")
    .select("email")
    .eq("email", user.email)
    .maybeSingle();

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream px-4">
        <div className="max-w-sm bg-white border border-line rounded-xl2 p-8 text-center">
          <p className="text-sm text-ink mb-2 font-medium">Not authorized yet</p>
          <p className="text-sm text-inksoft mb-5">
            {user.email} isn&apos;t on the Nutlush team list. Ask an admin to add your
            email in Supabase under the <code className="text-xs">team_members</code> table.
          </p>
          <SignOutButton />
        </div>
      </div>
    );
  }

  return <Dashboard userEmail={user.email!} />;
}
