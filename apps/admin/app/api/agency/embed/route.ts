import { NextResponse } from "next/server";
import { asApiResponse, withOperatorTransaction } from "@/lib/api-helpers";
import { findAgencyAgent } from "@/lib/agency-agents";
export const dynamic="force-dynamic";
export async function GET(request:Request) {
 try {
  const id=new URL(request.url).searchParams.get("agent")??"";
  if(!findAgencyAgent(id))return NextResponse.json({error:"Agent inconnu."},{status:404});
  const identity=await withOperatorTransaction(request,async({session,businessId})=>({email:session.user.email,businessId}));
  if(identity.businessId!==process.env.AGENCY_PRIMARY_BUSINESS_ID)return NextResponse.json({error:"Les assistants de cette agence ne sont pas encore activés."},{status:409});
  const secret=process.env.HERMES_COCKPIT_CONNECTOR_KEY;
  if(!secret)return NextResponse.json({error:"Connexion à la WebUI indisponible."},{status:503});
  const upstream=await fetch((process.env.AGENCY_WEBUI_INTERNAL_URL??"http://127.0.0.1:3100")+"/api/v1/hermes/embed-session",{method:"POST",headers:{"content-type":"application/json","x-cockpit-connector-key":secret},body:JSON.stringify({email:identity.email}),cache:"no-store",signal:AbortSignal.timeout(10000)});
  if(!upstream.ok)return NextResponse.json({error:upstream.status===403?"Votre compte Open WebUI doit être activé.":"La WebUI ne répond pas."},{status:upstream.status});
  const data=await upstream.json();
  return NextResponse.json({origin:"https://hermes.dev.4u-corp.com",token:data.token},{headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
 }catch(error){return asApiResponse(error);}
}
