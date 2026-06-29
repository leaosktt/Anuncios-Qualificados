import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const VERIFY_TOKEN = "anuncios_qualificados_2024"

serve(async (req) => {
  const url = new URL(req.url)

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode")
    const token = url.searchParams.get("hub.verify_token")
    const challenge = url.searchParams.get("hub.challenge")
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 })
    }
    return new Response("Forbidden", { status: 403 })
  }

  if (req.method === "POST") {
    const body = await req.json()
    console.log("Webhook recebido:", JSON.stringify(body))

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        console.log("Change field:", change.field)
        if (change.field === "leadgen") {
          const pageId = change.value.page_id
          const leadgenId = change.value.leadgen_id
          console.log("Page ID:", pageId, "Leadgen ID:", leadgenId)

          const { data: integration, error: intError } = await supabase
            .from("meta_integrations")
            .select("access_token, user_id")
            .eq("page_id", pageId)
            .single()

          console.log("Integration:", JSON.stringify(integration), "Error:", JSON.stringify(intError))

          if (!integration) {
            console.log("Nenhuma integração encontrada para page_id:", pageId)
            continue
          }

          const leadRes = await fetch(
            `https://graph.facebook.com/v25.0/${leadgenId}?fields=field_data,created_time&access_token=${integration.access_token}`
          )
          const leadData = await leadRes.json()
          console.log("Lead data from Meta:", JSON.stringify(leadData))

          if (!leadData.field_data) {
            console.log("Sem field_data no lead")
            continue
          }

          let name = "Lead Meta Ads"
          let contact = ""
          const formResponses: Record<string, string> = {}

          for (const field of leadData.field_data) {
            const value = field.values?.[0] ?? ""
            formResponses[field.name] = value
            if (field.name === "full_name" || field.name === "name") name = value
            if (field.name === "phone_number" || field.name === "phone") contact = value
          }

          const { error: insertError } = await supabase.from("leads").insert({
            name,
            company: "Meta Ads",
            contact,
            column_id: "col-1",
            priority: "medium",
            tags: ["meta-ads"],
            form_responses: formResponses,
            user_id: integration.user_id
          })

          console.log("Insert error:", JSON.stringify(insertError))
        }
      }
    }

    return new Response("OK", { status: 200 })
  }

  return new Response("Method not allowed", { status: 405 })
})