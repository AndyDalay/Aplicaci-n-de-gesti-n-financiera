const SYSTEM = `Eres un chef cubano con 30 años de experiencia en cocina casera y escribes recetas que cualquiera puede seguir al pie de la letra. Cocinas para una pareja en Cuba con ingredientes accesibles allí (arroz, frijoles, viandas, cerdo, pollo, huevo, picadillo, col, tomate, etc.).

Escribes UNA receta COMPLETA y REALISTA del tipo pedido. Obligatorio:
- Es un plato de verdad de la cocina cubana o criolla (ej.: picadillo, arroz con pollo, frijoles negros, ropa vieja, fricasé, tortilla, boliche, viandas con mojo...). NUNCA "pela y cómelo", ni hervir todo en agua sin sazón.
- Ingredientes COMPLETOS (entre 7 y 12): proteína o base principal + vegetales + sazón. SIEMPRE incluye sal, aceite, ajo y cebolla (o ají/pimiento) cuando el plato lo lleve, más condimentos como comino, orégano, laurel, vinagre, limón o naranja agria. Cada ingrediente con cantidad concreta para 2 personas (g, tazas, cucharadas, dientes, unidades). Proporciones lógicas: ~150-200 g de proteína por persona, ~1/2 taza de arroz crudo por persona, ~1 taza de frijoles cocidos por persona, etc.
- El inventario es una preferencia, no un límite: usa lo que hay, pero el plato debe quedar bien hecho aunque falten ingredientes básicos (sal, ajo, cebolla, aceite, especias se asumen de despensa salvo que estén agotados).
- Entre 6 y 9 pasos, en orden cronológico. Cada paso es 1-3 frases con detalle: tamaño de corte ("pica la cebolla en cuadritos de 0.5 cm", "corta el pollo en trozos de 3-4 cm"), tipo de cocción (sofreír, dorar, hervir a fuego lento, hornear), nivel de fuego, tiempos ("5 minutos hasta que la cebolla esté transparente") y señales de punto ("hasta que el arroz esté seco y suelto"). Incluye marinar/remojar si aplica, el orden en que entran los ingredientes y el reposo final.
- El tiempo total ("minutes") debe ser coherente con los pasos.
- El antojo del usuario es la prioridad absoluta: las 3 ideas deben respetarlo. Si hay ingredientes obligatorios, cada idea debe incluir todos esos ingredientes. Si el antojo exige algo que no hay, dilo en un campo missingNote y propone la alternativa más cercana sin ignorar el antojo.
- Si onlyInventory es true, usa únicamente ingredientes indicados como disponibles, además de sal/agua y condimentos básicos solo si aparecen en el inventario. Nunca presentes como disponible un ingrediente agotado. Ingredientes obligatorios tienen prioridad e indican explícitamente si no están en casa.
- shortName debe tener como máximo 8 palabras y servir como nombre breve de la receta.
- En cada ingrediente devuelve amount numérico y unit (g, ml, u, taza, cda o cdta), productId elegido SOLO entre los IDs del catálogo enviado y note opcional. Si no hay coincidencia, productId debe ser null; no inventes IDs.

Responde SOLO JSON válido, sin texto extra ni markdown, con este formato:
{"scale":"rapido|saludable|elegante","name":"","shortName":"","missingNote":"","emoji":"","minutes":0,"servings":2,"description":"una frase apetitosa","ingredients":[{"name":"","productId":null,"amount":0,"unit":"g","note":""}],"steps":[""]}
Todo en español de Cuba, claro y directo.

EJEMPLO de nivel de detalle esperado (otro plato):
{"scale":"rapido","name":"Picadillo a la cubana","emoji":"🍛","minutes":35,"servings":2,"description":"Carne molida sofrita con aceitunas y pasas, jugosa y de sabor intenso.","ingredients":[{"name":"Carne molida","qty":"350 g"},{"name":"Cebolla","qty":"1 mediana"},{"name":"Ají pimiento","qty":"1/2 unidad"},{"name":"Ajo","qty":"3 dientes"},{"name":"Salsa de tomate","qty":"4 cucharadas"},{"name":"Comino molido","qty":"1/2 cucharadita"},{"name":"Orégano","qty":"1/2 cucharadita"},{"name":"Aceite","qty":"2 cucharadas"},{"name":"Vino seco o vinagre","qty":"2 cucharadas"},{"name":"Sal","qty":"1 cucharadita"},{"name":"Aceitunas","qty":"8 unidades"}],"steps":["Pica la cebolla y el ají en cuadritos de 0.5 cm y machaca los ajos con una pizca de sal hasta hacer una pasta.","Calienta el aceite en una sartén grande a fuego medio. Sofríe la cebolla y el ají 5 minutos, removiendo, hasta que la cebolla esté transparente.","Añade el ajo machacado y cocina 1 minuto más, sin dejar que se queme.","Sube el fuego a medio-alto, agrega la carne y desmenúzala con una cuchara de madera. Cocina 6-8 minutos hasta que pierda el color rosado.","Incorpora el comino, el orégano, la sal y el vino. Mezcla y deja que el líquido casi se evapore, 2 minutos.","Agrega la salsa de tomate y media taza de agua. Baja a fuego lento, tapa y cocina 12 minutos removiendo de vez en cuando, hasta que espese.","Añade las aceitunas, prueba y rectifica la sal. Deja reposar 3 minutos antes de servir con arroz blanco."]}`;

const SCALES = ["rapido", "saludable", "elegante"] as const;
const SCALE_BRIEF: Record<(typeof SCALES)[number], string> = {
  rapido: 'scale "rapido": plato sustancioso que se hace en menos de 35 minutos.',
  saludable: 'scale "saludable": plato equilibrado con vegetales o viandas y poca fritura.',
  elegante: 'scale "elegante": plato especial para una cena en pareja con buena presentación.',
};
const GROQ_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile", "moonshotai/kimi-k2-instruct", "qwen/qwen3-32b"];
const HF_MODELS = ["Qwen/Qwen2.5-72B-Instruct", "meta-llama/Llama-3.3-70B-Instruct", "deepseek-ai/DeepSeek-V3", "meta-llama/Llama-3.1-8B-Instruct"];
const PROVIDERS = [
  { name: "Groq", url: "https://api.groq.com/openai/v1/chat/completions", env: "GROQ_API_KEY", models: GROQ_MODELS, json: true },
  { name: "Hugging Face", url: "https://router.huggingface.co/v1/chat/completions", env: "HF_API_KEY", models: HF_MODELS, json: false },
] as const;

type RecipeScale = (typeof SCALES)[number];
export type ChefInput = {
  couple: string;
  inventory: string;
  missing: string;
  planned: string;
  slot?: string;
  craving?: string;
  mustUse?: string[];
  onlyInventory?: boolean;
  productCatalog?: { id: string; name: string }[];
  replaceCurrent?: { name: string; ingredients: string[] };
  replaceVariation?: string;
};
type ChefUnit = "g" | "ml" | "u" | "taza" | "cda" | "cdta";
export type ChefRecipe = {
  scale: RecipeScale;
  name: string;
  shortName: string;
  missingNote?: string;
  emoji: string;
  minutes: number;
  servings?: number;
  description: string;
  ingredients: { name: string; productId?: string; amount: number; unit: ChefUnit; qty: string; note?: string }[];
  steps: string[];
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}

function extractObject(raw: unknown): Record<string, unknown> {
  const text = typeof raw === "string" ? raw : Array.isArray(raw)
    ? raw.map((part) => typeof part === "string" ? part : String((part as Record<string, unknown>)?.text ?? "")).join("\n")
    : "";
  const clean = text.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```(?:json)?/gi, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("La IA respondió sin un JSON de receta.");
  let parsed: unknown;
  try { parsed = JSON.parse(clean.slice(start, end + 1)); }
  catch { throw new Error("La IA devolvió una receta con formato JSON inválido."); }
  if (Array.isArray(parsed)) parsed = parsed[0];
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).suggestions)) {
    parsed = ((parsed as Record<string, unknown>).suggestions as unknown[])[0];
  }
  if (!parsed || typeof parsed !== "object") throw new Error("La IA no devolvió una receta válida.");
  return parsed as Record<string, unknown>;
}

function toSteps(raw: unknown): string[] {
  const parts = Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
  return parts.flatMap((part) => {
    const text = typeof part === "string" ? part : String((part as Record<string, unknown>)?.text ?? (part as Record<string, unknown>)?.step ?? "");
    return text.split(/\n+|(?<=[.;])\s+(?=\d{1,2}[.)]\s)|\s+(?=\d{1,2}[.)]\s+[A-ZÁÉÍÓÚÑ])/);
  }).map((step) => step.replace(/^\s*(paso\s*)?\d{1,2}\s*[.):-]\s*/i, "").replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
}

function parseRecipe(raw: unknown, scale: RecipeScale, mustUse: string[], catalog: { id: string; name: string }[]): ChefRecipe {
  const data = extractObject(raw);
  const name = String(data.name ?? "").trim();
  if (!name) throw new Error("La IA no incluyó el nombre de la receta.");
  const rawIngredients = Array.isArray(data.ingredients) ? data.ingredients.filter((item) => item && typeof item === "object" && (item as Record<string, unknown>).name) : [];
  const units: ChefUnit[] = ["g", "ml", "u", "taza", "cda", "cdta"];
  const ingredients = rawIngredients.map((item) => {
    const rawIngredient = item as Record<string, unknown>;
    const ingredientName = String(rawIngredient.name).trim();
    const amount = Number(rawIngredient.amount);
    const unit = String(rawIngredient.unit ?? "") as ChefUnit;
    if (!ingredientName || !Number.isFinite(amount) || amount <= 0 || !units.includes(unit)) {
      throw new Error(`Ingrediente sin cantidad/unidad estructurada válida: ${ingredientName || "sin nombre"}.`);
    }
    const candidateId = typeof rawIngredient.productId === "string" ? rawIngredient.productId : "";
    const product = catalog.find((entry) => entry.id === candidateId)
      ?? catalog.find((entry) => normalize(entry.name) === normalize(ingredientName));
    return {
      name: ingredientName,
      productId: product?.id,
      amount,
      unit,
      qty: `${amount} ${unit}`,
      ...(typeof rawIngredient.note === "string" && rawIngredient.note.trim() ? { note: rawIngredient.note.trim().slice(0, 160) } : {}),
    };
  });
  const normalizedIngredients = ingredients.map((item) => normalize(item.name));
  const absentRequired = mustUse.filter((required) => !normalizedIngredients.some((name) => name.includes(normalize(required)) || normalize(required).includes(name)));
  if (absentRequired.length) throw new Error(`La receta no incluyó los ingredientes obligatorios: ${absentRequired.join(", ")}.`);
  const steps = toSteps(data.steps ?? data.instructions ?? data.preparation);
  if (ingredients.length < 4 || steps.length < 4) throw new Error("La receta está incompleta; faltan ingredientes o pasos.");
  const shortName = String(data.shortName ?? name.split(/\s+/).slice(0, 8).join(" ")).split(/\s+/).slice(0, 8).join(" ");
  return {
    scale,
    name,
    shortName,
    missingNote: typeof data.missingNote === "string" ? data.missingNote.slice(0, 240) : undefined,
    emoji: String(data.emoji ?? "🍲"),
    minutes: Math.max(1, Number(data.minutes) || 30),
    servings: Number(data.servings) || 2,
    description: String(data.description ?? ""),
    ingredients,
    steps,
  };
}

function promptFor(input: ChefInput, scale: RecipeScale): string {
  const required = input.mustUse?.length ? input.mustUse.join(", ") : "ninguno";
  return [
    `Pareja: ${input.couple || "pareja cubana que cocina para 2"}.`,
    `Inventario disponible: ${input.inventory || "casi vacío"}.`,
    input.missing ? `Agotado: ${input.missing}.` : "",
    input.planned ? `Ya planificado esta semana: ${input.planned}. No repitas esos platos.` : "",
    input.replaceCurrent ? `Sustituye únicamente esta comida: ${input.replaceCurrent.name} (ingredientes actuales: ${input.replaceCurrent.ingredients.join(", ")}). No devuelvas el mismo plato ni una variación nominal del actual.` : "",
    input.replaceVariation ? `Enfoque distinto de esta alternativa: ${input.replaceVariation}.` : "",
    input.slot ? `Comida a cubrir: ${input.slot}.` : "",
    `Antojo (prioridad absoluta): ${input.craving?.trim() || "sin preferencia escrita"}. Las tres escalas deben respetarlo.`,
    `Ingredientes obligatorios para esta receta: ${required}. Incluye todos literalmente en ingredients.`,
    `Catálogo válido para productId (elige solo IDs de esta lista): ${JSON.stringify(input.productCatalog ?? [])}.`,
    `Cada ingrediente debe incluir amount como número y unit entre g, ml, u, taza, cda o cdta. Conserva la unidad culinaria real; no conviertas tazas a gramos sin densidad proporcionada.`,
    `Restricción solo inventario: ${input.onlyInventory ? "SÍ, evita todo ingrediente no disponible salvo básicos que sí estén listados" : "NO, se permiten ingredientes faltantes y deben anotarse en missingNote"}.`,
    `Escribe UNA receta. ${SCALE_BRIEF[scale]}`,
  ].filter(Boolean).join("\n");
}

async function complete(model: string, url: string, key: string, prompt: string, json: boolean, system = SYSTEM): Promise<string> {
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(8_000),
    body: JSON.stringify({
      model,
      temperature: 0.5,
      max_tokens: /gpt-oss|qwen3|deepseek/i.test(model) ? 4500 : 2400,
      ...(json ? { response_format: { type: "json_object" } } : {}),
      ...(/gpt-oss/.test(model) ? { reasoning_effort: "medium" } : {}),
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
    }),
  });
  if (!response.ok) throw new Error(`${model} HTTP ${response.status}: ${(await response.text()).slice(0, 180)}`);
  const body = await response.json();
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${model}: respuesta vacía`);
  return typeof content === "string" ? content : JSON.stringify(content);
}

async function recipeFor(input: ChefInput, scale: RecipeScale, variation?: string): Promise<ChefRecipe> {
  const request = variation ? { ...input, replaceVariation: variation } : input;
  const prompt = promptFor(request, scale);
  const errors: string[] = [];
  for (const provider of PROVIDERS) {
    const key = Deno.env.get(provider.env);
    if (!key) {
      errors.push(`${provider.env} no está configurada`);
      continue;
    }
    for (const model of provider.models) {
      try {
        const recipe = parseRecipe(await complete(model, provider.url, key, prompt, provider.json), scale, input.mustUse ?? [], input.productCatalog ?? []);
        if (input.replaceCurrent && normalize(recipe.name) === normalize(input.replaceCurrent.name)) {
          throw new Error("La IA repitió el plato que se quería sustituir.");
        }
        console.log(`chef recipe ${scale} via ${model}`);
        return recipe;
      } catch (error) {
        const message = String(error);
        errors.push(`${model}: ${message}`);
        console.log(`chef model failed (${scale}, ${model}): ${message}`);
      }
    }
  }
  throw new Error(errors.slice(-8).join(" | ") || "No hay proveedores de IA configurados.");
}

export async function suggestChefRecipes(input: ChefInput): Promise<ChefRecipe[]> {
  const results = await Promise.allSettled(SCALES.map((scale) => recipeFor(input, scale)));
  const suggestions = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  if (suggestions.length !== SCALES.length) {
    const failures = results.flatMap((result) => result.status === "rejected" ? [String(result.reason)] : []);
    throw new Error(`No se pudieron preparar las tres ideas. ${failures.join(" || ")}`);
  }
  return suggestions;
}

export type ChefReplacementInput = Omit<ChefInput, "craving" | "replaceCurrent" | "replaceVariation"> & {
  day: string;
  current: { name: string; ingredients: string[] };
  instruction: string;
  scale: RecipeScale;
};

export async function suggestChefReplacements(input: ChefReplacementInput): Promise<ChefRecipe[]> {
  const recipeInput: ChefInput = {
    couple: input.couple,
    inventory: input.inventory,
    missing: input.missing,
    planned: input.planned,
    slot: input.day ? `${input.day} · ${input.slot ?? "comida"}` : input.slot,
    craving: input.instruction,
    mustUse: input.mustUse,
    onlyInventory: input.onlyInventory,
    productCatalog: input.productCatalog,
    replaceCurrent: input.current,
  };
  const variations = [
    "conserva una técnica casera sencilla y destaca el ingrediente obligatorio",
    "usa una combinación de sabores distinta y una cocción ligera",
    "propón una presentación atractiva con ingredientes y preparación diferentes",
  ];
  const results = await Promise.allSettled(variations.map((variation) => recipeFor(recipeInput, input.scale, variation)));
  const suggestions = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  if (suggestions.length !== variations.length) {
    const failures = results.flatMap((result) => result.status === "rejected" ? [String(result.reason)] : []);
    throw new Error(`No se pudieron preparar las tres alternativas. ${failures.join(" || ")}`);
  }
  const uniqueNames = new Set(suggestions.map((suggestion) => normalize(suggestion.name)));
  if (uniqueNames.size !== variations.length) throw new Error("La IA repitió una alternativa. Vuelve a buscar para obtener tres platos distintos.");
  return suggestions;
}

export async function shortenRecipeNames(recipes: { id: string; name: string }[]): Promise<{ id: string; shortName: string }[]> {
  if (!recipes.length) return [];
  const system = "Eres editor de nombres de recetas en español. Acorta cada nombre para una tarjeta pequeña sin perder el plato principal ni su identidad. Devuelve solo JSON válido.";
  const prompt = `Para cada receta, crea un shortName natural en español de máximo 8 palabras. Conserva exactamente su id. No inventes ni omitas recetas. Responde {\"recipes\":[{\"id\":\"...\",\"shortName\":\"...\"}]}. Recetas: ${JSON.stringify(recipes)}`;
  const errors: string[] = [];
  for (const provider of PROVIDERS) {
    const key = Deno.env.get(provider.env);
    if (!key) continue;
    for (const model of provider.models) {
      try {
        const parsed = extractObject(await complete(model, provider.url, key, prompt, provider.json, system));
        const rawNames = Array.isArray(parsed.recipes) ? parsed.recipes : [];
        const requested = new Map(recipes.map((recipe) => [recipe.id, recipe]));
        const result = rawNames.flatMap((item) => {
          if (!item || typeof item !== "object") return [];
          const value = item as Record<string, unknown>;
          const id = typeof value.id === "string" ? value.id : "";
          const original = requested.get(id);
          const words = typeof value.shortName === "string" ? value.shortName.trim().split(/\s+/).filter(Boolean).slice(0, 8) : [];
          return original && words.length ? [{ id, shortName: words.join(" ") }] : [];
        });
        if (result.length !== recipes.length) throw new Error("La IA no devolvió todos los nombres solicitados.");
        return result;
      } catch (error) {
        errors.push(`${model}: ${String(error)}`);
      }
    }
  }
  throw new Error(errors.slice(-4).join(" | ") || "No hay proveedores de IA configurados.");
}
