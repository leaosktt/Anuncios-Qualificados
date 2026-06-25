import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const VERIFY_TOKEN = "anuncios_qualificados_2024"

serve(async (req) => {
  const url = new URL(req.url)
  
  // Verificação do webhook pelo Meta
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode")
    const token = url.searchParams.get("hub.verify_token")
    const challenge = url.searchParams.get("hub.challenge")
    
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 })
    }
    return new Response("Forbidden", { status: 403 })
  }

  // Receber leads do Meta
  if (req.method === "POST") {
    const body = await req.json()
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field === "leadgen") {
          const leadData = change.value
          await supabase.from("leads").insert({
            name: leadData.full_name ?? "Lead Meta Ads",
            company: "Meta Ads",
            contact: leadData.email ?? leadData.phone_number ?? "",
            column_id: "col-1",
            priority: "medium",
            tags: ["meta-ads"]
          })
        }
      }
    }
    
    return new Response("OK", { status: 200 })
  }

  return new Response("Method not allowed", { status: 405 })
})