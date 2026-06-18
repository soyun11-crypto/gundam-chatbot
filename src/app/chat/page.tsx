import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ChatInterface from "@/components/ChatInterface";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: sessions } = await supabase
    .from("chat_sessions")
    .select("id, title, created_at, updated_at, user_id")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(20);

  return <ChatInterface user={user} initialSessions={sessions ?? []} />;
}
