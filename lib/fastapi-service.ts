/**
 * FastAPI Service Module
 * Handles all communication with the Aushadhi 360 FastAPI backend
 * 
 * Base URL: process.env.NEXT_PUBLIC_FASTAPI_URL
 * Environment Variable: NEXT_PUBLIC_FASTAPI_URL
 * Example: http://localhost:8000 or https://api.aushadhi360.com
 * 
 * Core Endpoints:
 * - POST /login - User authentication & embedding status check
 * - GET /get_medicines - Search medicines by query with AI recommendations
 * - GET /embeddings/status/{user_id} - Check embedding build status
 * - POST /embeddings/rebuild/{user_id} - Trigger embedding rebuild (auto-detects changes)
 * - POST /register - User registration
 * - GET /medicines - Browse all medicines with pagination
 * - GET /medicines/{id} - Get medicine details
 * - POST /users/{user_id}/medicines - Add to cart
 * - GET /users/{user_id}/medicines - Get user's cart
 * - DELETE /users/{user_id}/medicines/{medicine_id} - Remove from cart
 * - DELETE /users/{user_id}/medicines/clear - Clear entire cart
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";

// Validate API URL on module load
if (typeof window !== "undefined" && !API_BASE_URL?.startsWith("http")) {
  console.warn(
    "⚠️ NEXT_PUBLIC_FASTAPI_URL is not properly configured. " +
    "Set it in .env.local (e.g., http://localhost:8000)"
  );
}

// ==================== TYPES ====================
export interface LoginResponse {
  status: string;
  message: string;
  embedding_status: "pending" | "ready" | "failed";
  embedding_version: number;
}

export interface MedicineSearchResponse {
  AI?: string;
  "AI Response"?: string;
  Medicines: Medicine[];
  Score?: string;
  overall_instructions?: string;
  overall?: string;
  instructions?: string;
  fallback?: boolean;
  query: string;
}

export interface Medicine {
  _id?: string;
  "S.no"?: number;
  "Name of Medicine"?: string;
  Batch_ID?: string;
  Description?: string;
  "Cover Disease"?: string;
  Symptoms?: string;
  "Side Effects"?: string;
  "Description in Hinglish"?: string;
  Quantity?: string;
  Instructions?: string;
  Price?: string;
  Stock?: number;
  [key: string]: any;
}

export interface EmbeddingStatusResponse {
  status: "pending" | "ready" | "failed" | "not_found";
  version: number;
  metadata?: {
    embedding_version: number;
    num_medicines: number;
    createdAt: string;
  };
  last_update?: string;
}

export interface EmbeddingRebuildResponse {
  status: string;
  message: string;
  user_id: string;
}

// ==================== ERROR HANDLING ====================
export class FastAPIError extends Error {
  constructor(
    public statusCode: number,
    public detail: string
  ) {
    super(detail);
    this.name = "FastAPIError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    try {
      const errorData = await response.json();
      const detail = errorData.detail || `HTTP ${response.status}`;
      throw new FastAPIError(response.status, detail);
    } catch (e) {
      if (e instanceof FastAPIError) throw e;
      throw new FastAPIError(
        response.status,
        `Server error: ${response.statusText || `HTTP ${response.status}`}`
      );
    }
  }

  try {
    return await response.json();
  } catch (e) {
    throw new FastAPIError(500, "Invalid JSON response from server");
  }
}

// ==================== API ENDPOINTS ====================

/**
 * User Login - Authenticates user and checks embedding status
 * @param email - User email
 * @param password - User password
 * @returns Login response with embedding status
 */
export async function loginUser(
  email: string,
  password: string
): Promise<LoginResponse> {
  const url = `${API_BASE_URL}/login?mail=${encodeURIComponent(
    email
  )}&password=${encodeURIComponent(password)}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
    });
    return handleResponse<LoginResponse>(response);
  } catch (error) {
    if (error instanceof FastAPIError) {
      throw error;
    }
    throw new FastAPIError(
      500,
      "Network error: Unable to connect to FastAPI backend"
    );
  }
}

/**
 * Search Medicines - Get AI-powered medicine recommendations
 * @param query - Symptom or medicine query (e.g., "fever and cough")
 * @param email - User email (for user-specific medicines)
 * @param password - User password
 * @returns Search results with AI recommendations
 */
export async function searchMedicines(
  query: string,
  email: string,
  password: string
): Promise<MedicineSearchResponse> {
  const url = `${API_BASE_URL}/get_medicines?query=${encodeURIComponent(
    query
  )}&mail=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
    });
    return handleResponse<MedicineSearchResponse>(response);
  } catch (error) {
    if (error instanceof FastAPIError) {
      throw error;
    }
    throw new FastAPIError(
      500,
      "Network error: Unable to connect to FastAPI backend"
    );
  }
}

/**
 * Search Medicines (No Auth) - Search without credentials
 * Used when user email/password not available
 * @param query - Symptom or medicine query
 * @returns Search results (may return fallback results)
 */
export async function searchMedicinesNoAuth(
  query: string
): Promise<MedicineSearchResponse> {
  const url = `${API_BASE_URL}/get_medicines?query=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
    });
    return handleResponse<MedicineSearchResponse>(response);
  } catch (error) {
    if (error instanceof FastAPIError) {
      throw error;
    }
    throw new FastAPIError(
      500,
      "Network error: Unable to connect to FastAPI backend"
    );
  }
}

/**
 * Get Embedding Status - Check if user's embeddings are ready for search
 * @param userId - User email
 * @returns Embedding status (pending|ready|failed|not_found)
 */
export async function getEmbeddingStatus(
  userId: string
): Promise<EmbeddingStatusResponse> {
  try {
    const url = `${API_BASE_URL}/embeddings/status/${encodeURIComponent(userId)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
    });
    return handleResponse<EmbeddingStatusResponse>(response);
  } catch (error) {
    // Fallback: status endpoint may not exist in current backend
    if (error instanceof FastAPIError && error.statusCode === 404) {
      return { status: "not_found", version: 0 };
    }
    throw error;
  }
}

/**
 * Rebuild Embeddings - Trigger embedding rebuild for user
 * Auto-detects if medicines changed and skips if no changes
 * @param userId - User email
 * @returns Rebuild response (will skip if no changes)
 */
export async function rebuildEmbeddings(
  userId: string
): Promise<EmbeddingRebuildResponse> {
  const url = `${API_BASE_URL}/embeddings/rebuild/${encodeURIComponent(userId)}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
    });
    return handleResponse<EmbeddingRebuildResponse>(response);
  } catch (error) {
    if (error instanceof FastAPIError) {
      throw error;
    }
    throw new FastAPIError(
      500,
      "Network error: Unable to connect to FastAPI backend"
    );
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Poll embedding status until ready or timeout
 * @param userId - User email
 * @param maxAttempts - Maximum number of attempts (default 30)
 * @param retryInterval - Interval between attempts in ms (default 3000)
 * @returns true if ready, false if timeout
 */
export async function waitForEmbeddings(
  userId: string,
  maxAttempts: number = 30,
  retryInterval: number = 3000
): Promise<boolean> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      console.log(
        `Polling embeddings... (Attempt ${attempts}/${maxAttempts})`
      );

      const status = await getEmbeddingStatus(userId);

      if (status.status === "ready") {
        console.log(`✅ Embeddings ready! (Attempts: ${attempts})`);
        return true;
      }

      if (status.status === "failed") {
        console.error("❌ Embedding build failed");
        return false;
      }

      if (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, retryInterval));
      }
    } catch (error) {
      console.warn(`Attempt ${attempts} failed:`, error);
      if (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, retryInterval));
      }
    }
  }

  console.warn(`⚠️ Embeddings not ready after ${attempts} attempts`);
  return false;
}

/**
 * Get user medicines with error handling
 * @param query - Search query
 * @param email - User email
 * @param password - User password
 * @returns Medicines array with proper error messages
 */
export async function getUserMedicines(
  query: string,
  email: string,
  password: string
): Promise<{
  success: boolean;
  medicines: Medicine[];
  error: string | null;
  aiResponse: string | null;
}> {
  try {
    const result = await searchMedicines(query, email, password);
    return {
      success: true,
      medicines: result.Medicines || [],
      error: null,
      aiResponse:
        result["AI Response"] || result.AI || result.overall_instructions || null,
    };
  } catch (error) {
    if (error instanceof FastAPIError) {
      return {
        success: false,
        medicines: [],
        error: getErrorMessage(error.statusCode, error.detail),
        aiResponse: null,
      };
    }

    return {
      success: false,
      medicines: [],
      error: "Network error. Please check your connection.",
      aiResponse: null,
    };
  }
}

/**
 * Enrich medicines with detailed data from MongoDB
 * Takes AI response with basic medicine info and fetches full details from MongoDB
 * @param medicines - Array of medicines with basic info (name, batch ID)
 * @param email - User email for authentication
 * @returns Enriched medicines with prices, categories, side effects, etc.
 */
export async function enrichMedicinesWithDetails(
  medicines: Medicine[],
  email: string
): Promise<Medicine[]> {
  if (!medicines || medicines.length === 0) return [];

  try {
    // Fetch medicine details from MongoDB search API for each medicine
    const enrichedMedicines = await Promise.all(
      medicines.map(async (medicine) => {
        try {
          // Search by medicine name or batch ID
          const searchQuery = medicine["Name of Medicine"] || medicine.Batch_ID || "";
          if (!searchQuery) return medicine;

          const response = await fetch(
            `/api/medicines/search?email=${encodeURIComponent(email)}&query=${encodeURIComponent(searchQuery)}`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            }
          );

          if (!response.ok) {
            console.warn(`Failed to enrich medicine: ${searchQuery}`);
            return medicine;
          }

          const data = await response.json();
          const medicines_list = data.medicines || [];

          // Find exact or best match
          let bestMatch = medicines_list[0];

          if (medicines_list.length > 0) {
            // Try to find exact batch match first
            const exactMatch = medicines_list.find(
              (m: any) => m.Batch_ID === medicine.Batch_ID
            );
            if (exactMatch) {
              bestMatch = exactMatch;
            } else {
              // Use first result as best match
              bestMatch = medicines_list[0];
            }
          }

          // Merge AI response data with MongoDB data
          if (bestMatch) {
            return {
              ...medicine,
              // Preserve AI recommendations
              "Cover Disease": medicine["Cover Disease"] || bestMatch["Cover Disease"],
              Symptoms: medicine.Symptoms || bestMatch.Symptoms,
              Instructions: medicine.Instructions || bestMatch.Instructions,
              // Add MongoDB details
              Description:
                medicine.Description || bestMatch.Description || bestMatch["Description in Hinglish"],
              Category: medicine.Category || bestMatch.Category,
              "Medicine Forms":
                medicine["Medicine Forms"] || bestMatch["Medicine Forms"] || bestMatch.form,
              Price: bestMatch.Price || bestMatch.price,
              "Side Effects":
                medicine["Side Effects"] || bestMatch["Side Effects"] || "Consult doctor",
              Manufacturer: bestMatch.Manufacturer || bestMatch["Manufacturer Name"],
              Composition:
                bestMatch.Composition || bestMatch.Salt || bestMatch["Salt Composition"],
              "Generic Name": bestMatch["Generic Name"],
              Dosage: bestMatch.Dosage || bestMatch["Dosage Strength"],
              "Pack Size": bestMatch["Pack Size"],
              Stock: bestMatch.Stock || bestMatch.Total_Quantity || bestMatch.quantity,
            };
          }

          return medicine;
        } catch (error) {
          console.warn(`Error enriching medicine ${medicine["Name of Medicine"]}:`, error);
          return medicine;
        }
      })
    );

    return enrichedMedicines;
  } catch (error) {
    console.error("Error enriching medicines:", error);
    return medicines;
  }
}

/**
 * Get user-friendly error message based on status code
 */
function getErrorMessage(statusCode: number, detail: string): string {
  const messages: Record<number, string> = {
    400: "Invalid request. Please check your input.",
    401: "Invalid credentials. Please check your email and password.",
    403: "Access denied. This account may not have permission.",
    404: "User not found. Please log in again.",
    500: "Server error. Please try again later.",
    503: "Embeddings are still being prepared. Please wait a moment and try again.",
  };

  return messages[statusCode] || detail || "An error occurred. Please try again.";
}

/**
 * Validate API configuration
 */
export function validateAPIConfig(): {
  isValid: boolean;
  baseUrl: string;
  error?: string;
} {
  if (!API_BASE_URL || API_BASE_URL === "http://localhost:8000") {
    return {
      isValid: false,
      baseUrl: API_BASE_URL,
      error: "NEXT_PUBLIC_FASTAPI_URL not configured. Set it in .env.local",
    };
  }

  return { isValid: true, baseUrl: API_BASE_URL };
}

export default {
  loginUser,
  searchMedicines,
  searchMedicinesNoAuth,
  getEmbeddingStatus,
  rebuildEmbeddings,
  waitForEmbeddings,
  getUserMedicines,
  enrichMedicinesWithDetails,
  validateAPIConfig,
};
