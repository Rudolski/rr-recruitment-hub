"use client";

import { useMemo, useState } from "react";
import { btnPrimary, inputClass, labelClass } from "@/components/ui";

type ClientOpt = { id: string; name: string };
type ContactOpt = {
  id: string;
  client_id: string;
  name: string;
  role: string | null;
};
type FeeOpt = { client_id: string; percentage: number | null };

export function ContractForm({
  clients,
  contacts,
  fees,
}: {
  clients: ClientOpt[];
  contacts: ContactOpt[];
  fees: FeeOpt[];
}) {
  const [clientId, setClientId] = useState("");
  const [bedrijf, setBedrijf] = useState("");
  const [voornaam, setVoornaam] = useState("");
  const [achternaam, setAchternaam] = useState("");
  const [titel, setTitel] = useState("");
  const [percentage, setPercentage] = useState("");
  const [lang, setLang] = useState<"nl" | "en">("nl");

  const clientContacts = useMemo(
    () => contacts.filter((c) => c.client_id === clientId),
    [contacts, clientId],
  );

  function pickClient(id: string) {
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    if (c) setBedrijf(c.name);
    const fee = fees.find((f) => f.client_id === id);
    if (fee?.percentage != null) setPercentage(String(fee.percentage));
  }

  function pickContact(id: string) {
    const c = clientContacts.find((x) => x.id === id);
    if (!c) return;
    const parts = c.name.trim().split(/\s+/);
    setVoornaam(parts[0] ?? "");
    setAchternaam(parts.slice(1).join(" "));
    if (c.role) setTitel(c.role);
  }

  return (
    <form
      method="post"
      action="/tools/samenwerkingsovereenkomst/download"
      className="mt-6 max-w-2xl space-y-5"
    >
      <div className="flex gap-2">
        {(["nl", "en"] as const).map((l) => (
          <label
            key={l}
            className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm ${
              lang === l
                ? "border-terra bg-terra/10 text-terra"
                : "border-zinc-300 text-zinc-600 dark:border-zinc-700"
            }`}
          >
            <input
              type="radio"
              name="lang"
              value={l}
              checked={lang === l}
              onChange={() => setLang(l)}
              className="sr-only"
            />
            {l === "nl" ? "Nederlands" : "English"}
          </label>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label className={labelClass}>Klant overnemen (optioneel)</label>
          <select
            value={clientId}
            onChange={(e) => pickClient(e.target.value)}
            className={inputClass}
          >
            <option value="">— Kies een klant om velden voor te vullen —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {clientContacts.length > 0 && (
            <select
              defaultValue=""
              onChange={(e) => pickContact(e.target.value)}
              className={`${inputClass} mt-2`}
            >
              <option value="">— Contactpersoon overnemen —</option>
              {clientContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.role ? ` · ${c.role}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        <Field
          label="Bedrijf"
          name="bedrijf"
          value={bedrijf}
          onChange={setBedrijf}
          required
        />
        <Field label="Vacature" name="vacature" placeholder="Supply Chain Manager" />
        <Field
          label="Voornaam contactpersoon"
          name="voornaam"
          value={voornaam}
          onChange={setVoornaam}
        />
        <Field
          label="Achternaam contactpersoon"
          name="achternaam"
          value={achternaam}
          onChange={setAchternaam}
        />
        <Field
          label="Functietitel"
          name="titel"
          value={titel}
          onChange={setTitel}
        />
        <Field
          label="Fee-percentage"
          name="percentage"
          value={percentage}
          onChange={setPercentage}
          placeholder="20"
        />
        <Field label="Adres" name="adres" placeholder="Straatnaam 1" />
        <Field label="Postcode" name="postcode" placeholder="5900 AA" />
        <Field label="Plaats" name="plaats" placeholder="Venlo" />
        <Field label="Datum overeenkomst" name="datum" type="date" />
        <Field label="Exclusiviteit t/m" name="exclusief_tm" type="date" />
      </div>

      <button type="submit" className={btnPrimary}>
        Overeenkomst downloaden (.docx)
      </button>
      <p className="text-xs text-zinc-400">
        Het Word-document wordt gevuld met deze gegevens en gedownload. Elke
        gegenereerde overeenkomst wordt geregistreerd onder de AI-geschiedenis.
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  value?: string;
  onChange?: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const controlled = value !== undefined && onChange !== undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className={labelClass}>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className={inputClass}
        {...(controlled
          ? { value, onChange: (e) => onChange(e.target.value) }
          : {})}
      />
    </div>
  );
}
