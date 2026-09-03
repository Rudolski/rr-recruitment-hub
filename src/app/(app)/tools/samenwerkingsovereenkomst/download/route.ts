import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/utils/supabase/auth";
import { fillContract, type ContractLang, type ContractValues } from "@/lib/contract";

export async function POST(request: NextRequest) {
  const { supabase, user, organizationId } = await getSessionContext();

  const form = await request.formData();
  const s = (k: string) => String(form.get(k) ?? "").trim();
  const lang: ContractLang = s("lang") === "en" ? "en" : "nl";

  const values: ContractValues = {
    bedrijf: s("bedrijf"),
    voornaam: s("voornaam"),
    achternaam: s("achternaam"),
    titel: s("titel"),
    adres: s("adres"),
    postcode: s("postcode"),
    plaats: s("plaats"),
    vacature: s("vacature"),
    datum: s("datum"),
    percentage: s("percentage"),
    exclusief_tm: s("exclusief_tm"),
  };

  if (!values.bedrijf) {
    return NextResponse.redirect(
      new URL("/tools/samenwerkingsovereenkomst?fout=bedrijf", request.url),
    );
  }

  let docx: Uint8Array;
  try {
    docx = await fillContract(lang, values);
  } catch {
    return NextResponse.redirect(
      new URL("/tools/samenwerkingsovereenkomst?fout=genereren", request.url),
    );
  }

  if (organizationId) {
    await supabase.from("generated_documents").insert({
      organization_id: organizationId,
      created_by: user.id,
      type: "contract",
      title: `Samenwerkingsovereenkomst ${values.bedrijf}`,
      input: { ...values, lang },
      content: `Samenwerkingsovereenkomst (${lang.toUpperCase()}) voor ${
        values.bedrijf
      }${values.vacature ? ` — ${values.vacature}` : ""}, fee ${
        values.percentage
      }%. Gegenereerd als .docx.`,
    });
  }

  const safe = (x: string) => x.replace(/[^a-zA-Z0-9]+/g, "_") || "contract";
  const filename = `Samenwerkingsovereenkomst_${safe(values.bedrijf)}${
    values.vacature ? `_${safe(values.vacature)}` : ""
  }.docx`;

  return new NextResponse(Buffer.from(docx), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
