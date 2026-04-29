/**
 * Crisis hotlines geo-aware catalog.
 *
 * Antes el sistema devolvía siempre 024 (España) y 988 (EE.UU.) hardcoded.
 * Ahora el catálogo cubre los principales países hispanohablantes + EE.UU.,
 * UK, FR, DE, BR. La detección del país viene del header de Cloudflare/Vercel
 * (cf-ipcountry / x-vercel-ip-country) o de un fallback explícito; si no se
 * puede determinar, devolvemos España (origen del producto) como default.
 *
 * Las hotlines se han verificado en webs oficiales en abril 2026. Hay que
 * revisarlas cada 6-12 meses porque algunas líneas cambian de número o
 * proveedor (especialmente en LATAM).
 */

export type Hotline = {
  name: string;
  number: string;
  available?: string; // "24/7 gratis", horario, alcance regional...
  url?: string;
};

export type CountryHotlines = {
  countryCode: string; // ISO 3166-1 alpha-2 uppercase
  countryName: string;
  emergency: string; // número de emergencias (policía/ambulancia)
  suicidePrevention: Hotline; // línea principal
  alternatives?: Hotline[]; // adicionales si las hay
};

const HOTLINES: Record<string, CountryHotlines> = {
  ES: {
    countryCode: "ES",
    countryName: "España",
    emergency: "112",
    suicidePrevention: {
      name: "Línea 024 atención a la conducta suicida",
      number: "024",
      available: "24/7 gratis",
      url: "https://www.sanidad.gob.es/linea024",
    },
    alternatives: [
      { name: "Teléfono de la Esperanza", number: "717 003 717", available: "24/7" },
    ],
  },
  MX: {
    countryCode: "MX",
    countryName: "México",
    emergency: "911",
    suicidePrevention: {
      name: "SAPTEL",
      number: "55 5259 8121",
      available: "24/7",
      url: "https://www.saptel.org.mx",
    },
    alternatives: [
      { name: "Línea de la Vida", number: "800 911 2000", available: "24/7 gratis" },
    ],
  },
  AR: {
    countryCode: "AR",
    countryName: "Argentina",
    emergency: "911",
    suicidePrevention: {
      name: "Centro de Asistencia al Suicida (CAS)",
      number: "135",
      available: "Buenos Aires/AMBA · 24/7 gratis",
      url: "https://www.casbuenosaires.com.ar",
    },
    alternatives: [
      { name: "CAS resto del país", number: "(011) 5275-1135", available: "24/7" },
    ],
  },
  CL: {
    countryCode: "CL",
    countryName: "Chile",
    emergency: "133",
    suicidePrevention: {
      name: "Salud Responde — Programa Nacional de Prevención del Suicidio",
      number: "600 360 7777",
      available: "24/7",
    },
  },
  CO: {
    countryCode: "CO",
    countryName: "Colombia",
    emergency: "123",
    suicidePrevention: {
      name: "Línea 106 (Bogotá)",
      number: "106",
      available: "24/7",
    },
    alternatives: [
      { name: "Línea Calma (hombres)", number: "601 5174224", available: "24/7" },
      { name: "Línea Púrpura (mujeres)", number: "01 8000 112 137", available: "24/7" },
    ],
  },
  PE: {
    countryCode: "PE",
    countryName: "Perú",
    emergency: "105",
    suicidePrevention: {
      name: "Línea 113 MINSA — opción 5 salud mental",
      number: "113",
      available: "24/7",
    },
  },
  VE: {
    countryCode: "VE",
    countryName: "Venezuela",
    emergency: "171",
    suicidePrevention: {
      name: "Línea Esperanza",
      number: "0212-415-7997",
      available: "Lun-Dom 11h-23h",
    },
  },
  EC: {
    countryCode: "EC",
    countryName: "Ecuador",
    emergency: "911",
    suicidePrevention: {
      name: "Línea 171 MSP — opción 6 salud mental",
      number: "171",
      available: "24/7",
    },
  },
  UY: {
    countryCode: "UY",
    countryName: "Uruguay",
    emergency: "911",
    suicidePrevention: {
      name: "Línea Vida",
      number: "0800 0767 / *0767",
      available: "24/7",
    },
  },
  PY: {
    countryCode: "PY",
    countryName: "Paraguay",
    emergency: "911",
    suicidePrevention: {
      name: "Centro de Atención al Suicidio MSP",
      number: "147",
      available: "Lun-Vie 8h-18h",
    },
  },
  BO: {
    countryCode: "BO",
    countryName: "Bolivia",
    emergency: "110",
    suicidePrevention: {
      name: "Hospital de Psiquiatría Dr. José M. Velazco — La Paz",
      number: "(2) 277-2222",
      available: "Horario hospitalario",
    },
  },
  CR: {
    countryCode: "CR",
    countryName: "Costa Rica",
    emergency: "911",
    suicidePrevention: {
      name: "IAFA — Línea de prevención",
      number: "1796",
      available: "24/7",
    },
  },
  PA: {
    countryCode: "PA",
    countryName: "Panamá",
    emergency: "911",
    suicidePrevention: {
      name: "Línea Vida",
      number: "523-3030",
      available: "24/7",
    },
  },
  DO: {
    countryCode: "DO",
    countryName: "República Dominicana",
    emergency: "911",
    suicidePrevention: {
      name: "Línea Vida (Salud Pública)",
      number: "*462",
      available: "24/7",
    },
  },
  GT: {
    countryCode: "GT",
    countryName: "Guatemala",
    emergency: "110",
    suicidePrevention: {
      name: "Línea sin paredes",
      number: "1545",
      available: "24/7",
    },
  },
  HN: {
    countryCode: "HN",
    countryName: "Honduras",
    emergency: "911",
    suicidePrevention: {
      name: "SOS Vida",
      number: "(504) 9942-2200",
      available: "24/7",
    },
  },
  SV: {
    countryCode: "SV",
    countryName: "El Salvador",
    emergency: "911",
    suicidePrevention: {
      name: "Centro de Atención Telefónica",
      number: "132",
      available: "24/7",
    },
  },
  PR: {
    countryCode: "PR",
    countryName: "Puerto Rico",
    emergency: "911",
    suicidePrevention: {
      name: "Línea PAS — Primera Ayuda Sicosocial",
      number: "1-800-981-0023",
      available: "24/7 gratis",
    },
  },
  US: {
    countryCode: "US",
    countryName: "United States",
    emergency: "911",
    suicidePrevention: {
      name: "988 Suicide & Crisis Lifeline",
      number: "988",
      available: "24/7 free",
      url: "https://988lifeline.org",
    },
  },
  GB: {
    countryCode: "GB",
    countryName: "United Kingdom",
    emergency: "999",
    suicidePrevention: {
      name: "Samaritans",
      number: "116 123",
      available: "24/7 free",
      url: "https://www.samaritans.org",
    },
  },
  FR: {
    countryCode: "FR",
    countryName: "France",
    emergency: "112",
    suicidePrevention: {
      name: "3114 — Numéro national de prévention du suicide",
      number: "3114",
      available: "24/7",
      url: "https://3114.fr",
    },
  },
  DE: {
    countryCode: "DE",
    countryName: "Deutschland",
    emergency: "112",
    suicidePrevention: {
      name: "Telefonseelsorge",
      number: "0800 111 0 111",
      available: "24/7",
      url: "https://www.telefonseelsorge.de",
    },
    alternatives: [
      { name: "Telefonseelsorge (alternativa)", number: "0800 111 0 222", available: "24/7" },
    ],
  },
  IT: {
    countryCode: "IT",
    countryName: "Italia",
    emergency: "112",
    suicidePrevention: {
      name: "Telefono Amico",
      number: "02 2327 2327",
      available: "10h-24h",
      url: "https://www.telefonoamico.it",
    },
  },
  PT: {
    countryCode: "PT",
    countryName: "Portugal",
    emergency: "112",
    suicidePrevention: {
      name: "SOS Voz Amiga",
      number: "213 544 545",
      available: "16h-24h",
      url: "https://www.sosvozamiga.org",
    },
  },
  BR: {
    countryCode: "BR",
    countryName: "Brasil",
    emergency: "190",
    suicidePrevention: {
      name: "CVV — Centro de Valorização da Vida",
      number: "188",
      available: "24/7",
      url: "https://www.cvv.org.br",
    },
  },
  CA: {
    countryCode: "CA",
    countryName: "Canada",
    emergency: "911",
    suicidePrevention: {
      name: "Talk Suicide Canada",
      number: "1-833-456-4566",
      available: "24/7 free",
      url: "https://talksuicide.ca",
    },
  },
};

const DEFAULT_COUNTRY = HOTLINES.ES;

/** ISO 3166-1 alpha-2 (case insensitive) → catalog entry, or default ES. */
export function getHotlinesForCountry(code: string | null | undefined): CountryHotlines {
  if (!code) return DEFAULT_COUNTRY;
  const upper = code.trim().toUpperCase();
  return HOTLINES[upper] ?? DEFAULT_COUNTRY;
}

/**
 * Audience-specific hotlines that are more appropriate than the general
 * suicide-prevention line for a given user. Today populated for ES minors;
 * extend per country/audience as needed.
 *
 * Returned as ADDITIONAL resources, not replacements — the general line
 * always stays available. The crisis flow can prepend these when the user's
 * declared age range is "14_17".
 */
export type AudienceHotlines = {
  forMinors?: Hotline[];
  forElders?: Hotline[];
};

const AUDIENCE_HOTLINES: Record<string, AudienceHotlines> = {
  ES: {
    forMinors: [
      {
        name: "Fundación ANAR — ayuda a menores",
        number: "900 20 20 10",
        available: "24/7 gratis y confidencial",
        url: "https://www.anar.org",
      },
    ],
  },
};

export function getAudienceHotlines(code: string | null | undefined): AudienceHotlines {
  if (!code) return AUDIENCE_HOTLINES.ES ?? {};
  const upper = code.trim().toUpperCase();
  return AUDIENCE_HOTLINES[upper] ?? {};
}

/** Compact one-liner for inline injection in crisis assistant responses. */
export function formatHotlinesInline(country: CountryHotlines): string {
  const main = country.suicidePrevention;
  const mainPart = `${main.name} ${main.number}${main.available ? ` (${main.available})` : ""}`;
  const altPart =
    country.alternatives && country.alternatives.length > 0
      ? ` Alternativa: ${country.alternatives
          .map((a) => `${a.name} ${a.number}`)
          .join("; ")}.`
      : "";
  return `Si hay riesgo inmediato, llama al ${country.emergency}. Para apoyo urgente: ${mainPart}.${altPart}`;
}

/**
 * Reads the request country from common edge proxy headers, falling back to
 * an explicit hint (e.g. user.preferences.country) and finally to ES.
 *
 * Headers checked, in priority order:
 *  - cf-ipcountry (Cloudflare)
 *  - x-vercel-ip-country (Vercel edge)
 *  - x-country (custom)
 */
export function detectCountryFromHeaders(
  headers: Headers | { get(name: string): string | null },
  fallback: string | null = null,
): string {
  const candidates = ["cf-ipcountry", "x-vercel-ip-country", "x-country"] as const;
  for (const h of candidates) {
    const value = headers.get(h);
    if (value && value.length === 2 && /^[A-Za-z]{2}$/.test(value)) {
      return value.toUpperCase();
    }
  }
  if (fallback && /^[A-Za-z]{2}$/.test(fallback)) {
    return fallback.toUpperCase();
  }
  return "ES";
}

export { HOTLINES };
