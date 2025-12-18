/**
 * Medicine Enrichment Service - 2 Layer AI Enrichment System
 * 
 * Layer 1: Raw Data Collection using Gemini
 * Layer 2: Structured JSON Extraction from Raw Data
 */

import { GoogleGenerativeAI } from "@google/generative-ai"

export interface EnrichedMedicineData {
  Batch_ID: string
  "Name of Medicine": string
  Category: string
  "Medicine Forms": string
  Quantity_per_pack: string
  "Cover Disease": string
  Symptoms: string
  "Side Effects": string
  Instructions: string
  "Description in Hinglish": string
}

// Master category list
export const CATEGORY_LIST = [
  "Antipyretics",
  "Analgesics",
  "Antivirals",
  "Antibiotics",
  "Antifungals",
  "Antimalarials",
  "Anthelmintics",
  "Antihistamines",
  "Decongestants",
  "Cough Suppressants",
  "Expectorants",
  "Bronchodilators",
  "Corticosteroids",
  "Immunosuppressants",
  "Anticoagulants",
  "Antiplatelets",
  "Thrombolytics",
  "Antihypertensives",
  "Beta-blockers",
  "ACE Inhibitors",
  "ARBs",
  "Calcium Channel Blockers",
  "Diuretics",
  "Antiarrhythmics",
  "Antianginals",
  "Lipid-lowering Drugs (Statins)",
  "Antidiabetics (Oral)",
  "Insulin",
  "Antacids",
  "Proton Pump Inhibitors",
  "H2 Receptor Blockers",
  "Laxatives",
  "Antidiarrheals",
  "Anti-emetics",
  "Antispasmodics",
  "Antiulcer Agents",
  "Antiseptics",
  "Vaccines",
  "Hormonal Contraceptives",
  "Eye Drops (Lubricant)",
  "Ear Drops (Antifungal)",
  "Nasal Sprays (Decongestant)",
  "Nasal Sprays (Steroid)",
  "Oral Rehydration Salts",
  "Nutritional Supplements",
  "Vitamins",
  "Minerals",
  "Multivitamins",
  "Herbal Medicines",
  "Ayurvedic Medicines",
  "Immunotherapy Agents",
  "Biologics",
  "DMARDs",
  "Disinfectants",
  "Thyroid Medications",
  "Corticosteroid Creams",
  "Topical Antibiotics",
  "Homeopathic Remedies",
  "Antineoplastics (Chemotherapy)",
  "Anti-Gout Medications",
  "Anti-Osteoporosis Drugs",
  "Topical Antifungals",
  "Ear Drops (Antibiotic)",
  "Anti-thyroid Drugs",
  "Eye Drops (Antibiotic)",
  "Ear Drops (Analgesic)",
  "Eye Drops (Antihistamine)",
  "Monoclonal Antibodies",
  "Muscle Relaxants",
  "Antipsychotics",
  "Antidepressants",
  "Anxiolytics",
  "Mood Stabilizers",
  "Cognitive Enhancers (Nootropics)",
  "Stimulants",
  "Smoking Cessation Aids",
  "Antivertigo Drugs",
  "Anti-Motion Sickness Drugs",
  "Anti-Allergic Drugs",
  "Immunomodulators",
  "Blood Products",
  "Antidotes",
  "Local Anesthetics",
  "General Anesthetics",
  "Pain Patches",
  "Combination Drugs (Multi-Action)",
  "Analgesics & Pain Relief",
  "Antacids & Acid Reducers",
  "Multivitamins & Supplements",
  "Antidiabetics",
  "Digestive & Laxatives",
  "Anti-Parkinson Drugs",
  "Antiepileptics",
  "Hypnotics",
  "Sedatives",
  "Weight Loss Medications",
  "Antioxidants",
  "Chelating Agents",
  "Radiopharmaceuticals",
  "Topical Anesthetics",
  "Cough & Cold Medicines",
  "Blood Pressure / Hypertension Medicines",
  "Contrast Agents (Imaging)",
  "Antihistamines & Allergy Medicines",
  "Appetite Stimulants",
  "Electrolyte Replacements",
]

// Master medicine forms list
export const MEDICINE_FORMS_LIST = [
  "Suspension",
  "Effervescent Tablet",
  "Tablet",
  "Injection",
  "Capsule",
  "Cream",
  "Eye Drops",
  "Nasal Spray",
  "Syrup",
  "Inhaler",
  "Nebulizer Solution",
  "Ointment",
  "Sublingual Tablet",
  "Nasal Drops",
  "Transdermal Patch",
  "Enteric Coated Tablet",
  "Powder",
  "Chewable Tablet",
  "Solution",
  "Gel",
  "Spray",
  "Oral + Injection",
  "Implant + IUD",
  "Ear Drops",
  "Powder + Tablet",
  "Oral Drops",
  "Liquid",
  "Intrauterine Device",
  "Juice",
  "Mouthwash",
  "Ring + Patch",
  "Subdermal Implant",
  "Sachet",
  "Vaginal Ring",
  "Paste",
  "Patch",
  "Gum",
  "Transfusion",
  "Oral",
  "Inhalation",
  "Oral Suspension",
  "Lozenge",
  "IV",
  "Gel Patch",
  "IV Solution",
  "IV Additive",
  "Lotion",
]

export class MedicineEnrichmentService {
  private genAI: GoogleGenerativeAI
  private model: any

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
  }

  /**
   * LAYER 1: Collect raw data about medicine using Gemini
   */
  private async collectRawData(medicineName: string): Promise<string> {
    const prompt = `Medicine Name: ${medicineName}

Please provide comprehensive information about this medicine:

1. Category: (select from the most appropriate category)
2. Medicine Forms: (select from forms like Tablet, Capsule, Syrup, Injection, etc.)
3. Quantity per Pack: (e.g., 60ml Bottle, 10 Tablets, 1 Vial, etc.)

Details to collect:

- Cover Disease: (what diseases or conditions the medicine helps to treat or recover from)
- Symptoms: (when this medicine can be taken - which symptoms it addresses)
- Side Effects: (possible adverse effects or side effects)
- Instructions: (how to take/use the medicine correctly - dosage, timing, etc.)
- Description in Hinglish: (a short, 1-line description in Hinglish - mix of Hindi and English)

Please provide detailed information for all these fields.`

    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      return text
    } catch (error) {
      console.error("[Layer1] Raw data collection failed:", error)
      throw new Error(`Failed to collect raw data for ${medicineName}`)
    }
  }

  /**
   * LAYER 2: Extract structured JSON from raw data
   */
  private async extractStructuredData(
    batchNo: string,
    medicineName: string,
    rawData: string
  ): Promise<EnrichedMedicineData> {
    const prompt = `You are a data extraction assistant. Provide ONLY valid JSON output, no Markdown, no extra text, no explanations.

Input:
Batch_no: "${batchNo}"
Medicine name: "${medicineName}"
Raw text: "${rawData}"

Available Categories: ${CATEGORY_LIST.join(", ")}
Available Medicine Forms: ${MEDICINE_FORMS_LIST.join(", ")}

Task:
Extract the following fields strictly:

- Batch_ID
- Name of Medicine
- Category
- Medicine Forms
- Quantity_per_pack
- Cover Disease
- Symptoms
- Side Effects
- Instructions
- Description in Hinglish

Output format (strict JSON):
{
  "Batch_ID": "${batchNo}",
  "Name of Medicine": "${medicineName}",
  "Category": "<select 1 appropriate value from available categories>",
  "Medicine Forms": "<select 1 appropriate value from available forms>",
  "Quantity_per_pack": "<example: 60ml Bottle, 10 Tablets, 1 Vial>",
  "Cover Disease": "<3-4 keywords, comma-separated>",
  "Symptoms": "<3-4 keywords, comma-separated>",
  "Side Effects": "<3-4 keywords, comma-separated>",
  "Instructions": "<full phrase>",
  "Description in Hinglish": "<full phrase>"
}

Rules:
- Do NOT modify Batch_no or Medicine name.
- Provide 3–4 concise keywords for Cover Disease, Symptoms, and Side Effects.
- Provide full phrases for Instructions and Description in Hinglish.
- Choose Category and Medicine Forms from the available lists only.
- Return ONE JSON object per medicine.
- Output ONLY the JSON, no markdown code blocks, no extra text.`

    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      let text = response.text()

      // Clean up response - remove markdown code blocks if present
      text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()

      // Parse JSON
      const enrichedData = JSON.parse(text) as EnrichedMedicineData

      // Validate required fields
      this.validateEnrichedData(enrichedData)

      return enrichedData
    } catch (error) {
      console.error("[Layer2] Structured extraction failed:", error)
      throw new Error(`Failed to extract structured data for ${medicineName}`)
    }
  }

  /**
   * Validate enriched data has all required fields
   */
  private validateEnrichedData(data: EnrichedMedicineData): void {
    const requiredFields: (keyof EnrichedMedicineData)[] = [
      "Batch_ID",
      "Name of Medicine",
      "Category",
      "Medicine Forms",
      "Quantity_per_pack",
      "Cover Disease",
      "Symptoms",
      "Side Effects",
      "Instructions",
      "Description in Hinglish",
    ]

    for (const field of requiredFields) {
      if (!data[field] || data[field].toString().trim() === "") {
        throw new Error(`Missing or empty required field: ${field}`)
      }
    }
  }

  /**
   * Main enrichment function - combines Layer 1 and Layer 2
   */
  async enrichMedicine(
    batchNo: string,
    medicineName: string
  ): Promise<EnrichedMedicineData> {
    console.log(`[Enrichment] Starting enrichment for: ${medicineName} (Batch: ${batchNo})`)

    try {
      // LAYER 1: Collect raw data
      console.log(`[Layer1] Collecting raw data for ${medicineName}...`)
      const rawData = await this.collectRawData(medicineName)
      console.log(`[Layer1] Raw data collected successfully`)

      // LAYER 2: Extract structured data
      console.log(`[Layer2] Extracting structured data for ${medicineName}...`)
      const enrichedData = await this.extractStructuredData(batchNo, medicineName, rawData)
      console.log(`[Layer2] Structured data extracted successfully`)

      return enrichedData
    } catch (error) {
      console.error(`[Enrichment] Failed for ${medicineName}:`, error)
      throw error
    }
  }

  /**
   * Batch enrichment for multiple medicines
   */
  async enrichMedicinesBatch(
    medicines: Array<{ batchNo: string; name: string }>
  ): Promise<EnrichedMedicineData[]> {
    const results: EnrichedMedicineData[] = []
    const errors: Array<{ medicine: string; error: string }> = []

    for (const medicine of medicines) {
      try {
        const enrichedData = await this.enrichMedicine(medicine.batchNo, medicine.name)
        results.push(enrichedData)

        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error) {
        errors.push({
          medicine: medicine.name,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    if (errors.length > 0) {
      console.warn("[Enrichment] Some medicines failed enrichment:", errors)
    }

    return results
  }
}

// Singleton instance
let enrichmentService: MedicineEnrichmentService | null = null

export function getEnrichmentService(): MedicineEnrichmentService {
  if (!enrichmentService) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not found in environment variables")
    }
    enrichmentService = new MedicineEnrichmentService(apiKey)
  }
  return enrichmentService
}
