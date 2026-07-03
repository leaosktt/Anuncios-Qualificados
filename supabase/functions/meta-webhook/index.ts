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
          const formId = change.value.form_id
          console.log("Page ID:", pageId, "Form ID:", formId, "Leadgen ID:", leadgenId)

          // Buscar integrações que correspondem ao page_id
          const { data: allIntegrations, error: intError } = await supabase
            .from("meta_integrations")
            .select("access_token, user_id, form_id")
            .eq("page_id", pageId)

          console.log("All Integrations found:", JSON.stringify(allIntegrations), "Error:", JSON.stringify(intError))

          if (!allIntegrations || allIntegrations.length === 0) {
            console.log("Nenhuma integração encontrada para page_id:", pageId)
            continue
          }

          // Filtrar integrações aplicáveis:
          // 1. Integrações que correspondem EXATAMENTE ao form_id
          // 2. Integrações "catch-all" onde form_id é nulo ou vazio
          let targetIntegrations = allIntegrations.filter(i => i.form_id === formId)
          if (targetIntegrations.length === 0) {
            targetIntegrations = allIntegrations.filter(i => !i.form_id)
          }

          if (targetIntegrations.length === 0) {
             console.log("Nenhuma integração aplicável encontrada para o form_id:", formId)
             continue
          }

          // Usar o token da primeira integração aplicável para buscar os dados do lead
          const accessToken = targetIntegrations[0].access_token

          const leadRes = await fetch(
            `https://graph.facebook.com/v20.0/${leadgenId}?fields=field_data,created_time&access_token=${accessToken}`
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

          // Inserir um lead para CADA integração aplicável
          for (const integration of targetIntegrations) {
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
            console.log(`Insert result for user ${integration.user_id}:`, JSON.stringify(insertError))
          }
        }
      }
    }

    return new Response("OK", { status: 200 })
  }

  return new Response("Method not allowed", { status: 405 })
})