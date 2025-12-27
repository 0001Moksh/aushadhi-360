/**
 * Date Parser Utility for Excel/CSV Imports
 * Handles Excel serial dates, multiple string formats, and ISO normalization
 * 
 * Usage:
 * const result = normalizeExpiryDate(excelSerialDateOrString);
 * console.log(result.normalized);  // ISO format: "2025-01-15" or null
 * console.log(result.raw);          // Original input
 * console.log(result.debugLog);     // Debug information
 */

export interface ExpiryDateParseResult {
  normalized: string | null  // ISO format YYYY-MM-DD or null if cannot parse
  raw: string                 // Original raw value
  isExcelDate: boolean       // Whether it was detected as Excel serial date
  parsedFormat: string | null // Format detected (e.g., "DD/MM/YYYY", "EXCEL_SERIAL", etc.)
  debugLog: string           // Debug information
}

/**
 * Detects if a value is an Excel serial date number and converts to ISO format
 * Excel dates are numeric: 45000 = ~2023-01-20
 * Excel epoch: December 30, 1899
 * 
 * @param value - Numeric value that might be an Excel serial date
 * @returns ISO format date string or null if not a valid Excel date
 */
export function parseExcelDate(value: number): string | null {
  try {
    // Excel serial date range validation (1900 to ~2100)
    if (typeof value !== "number" || value < 1 || value > 50000) {
      return null
    }

    // Excel epoch is December 30, 1899 (day 0)
    // JavaScript epoch is January 1, 1970
    const excelEpoch = new Date(1899, 11, 30) // December 30, 1899
    const millisecondsPerDay = 24 * 60 * 60 * 1000
    
    // Account for Excel's leap year bug (1900 wasn't a leap year but Excel treats it as one)
    const adjustedValue = value > 59 ? value - 1 : value
    
    const date = new Date(excelEpoch.getTime() + adjustedValue * millisecondsPerDay)
    
    // Validate the parsed date
    if (isNaN(date.getTime())) {
      return null
    }

    // Convert to ISO format YYYY-MM-DD
    return date.toISOString().split("T")[0]
  } catch (e) {
    return null
  }
}

/**
 * Parses various date string formats into ISO format (YYYY-MM-DD)
 * 
 * Supported formats:
 * - DD/MM/YYYY, DD-MM-YYYY (Indian format)
 * - MM/DD/YYYY, MM-DD-YYYY (US format) - detected if month > 12 in first format
 * - YYYY-MM-DD, YYYY/MM/DD (ISO format)
 * - MM-YYYY, MM/YYYY (Month-Year, uses last day of month)
 * - YYYYMMDD (8-digit compact)
 * - DDMMYY (6-digit compact, assumes 20xx)
 * - JavaScript native date strings
 * 
 * @param dateStr - Date string to parse
 * @returns Object with normalized ISO date and detected format
 */
export function parseDateString(dateStr: string): { normalized: string | null; format: string } {
  const trimmed = dateStr.trim()

  if (!trimmed) {
    return { normalized: null, format: "EMPTY" }
  }

  // Remove common wrappers (quotes, parentheses)
  const cleaned = trimmed.replace(/^['"`(]|['"`)]$/g, "")

  // Format 1: YYYY-MM-DD (already ISO)
  const isoMatch = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    const y = parseInt(year, 10)
    const m = parseInt(month, 10)
    const d = parseInt(day, 10)
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return {
        normalized: `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        format: "YYYY-MM-DD"
      }
    }
  }

  // Format 2: DD/MM/YYYY or DD-MM-YYYY (common in India)
  const ddmmyyyyMatch = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/)
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch
    const d = parseInt(day, 10)
    const m = parseInt(month, 10)
    let y = parseInt(year, 10)

    // Handle 2-digit years (00-99 → 2000-2099)
    if (year.length === 2) {
      y = 2000 + y
    }

    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      return {
        normalized: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        format: "DD/MM/YYYY"
      }
    }
  }

  // Format 3: MM/YYYY or MM-YYYY (Month-Year only)
  const mmyyyyMatch = cleaned.match(/^(\d{1,2})[-/](\d{4})$/)
  if (mmyyyyMatch) {
    const [, month, year] = mmyyyyMatch
    const m = parseInt(month, 10)
    const y = parseInt(year, 10)

    if (m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
      // Use last day of month
      const lastDay = new Date(y, m, 0).getDate()
      return {
        normalized: `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
        format: "MM/YYYY"
      }
    }
  }

  // Format 4: YYYYMMDD (compact format)
  const compactMatch = cleaned.match(/^(\d{8})$/)
  if (compactMatch) {
    const [, full] = compactMatch
    const year = full.substring(0, 4)
    const month = full.substring(4, 6)
    const day = full.substring(6, 8)
    const m = parseInt(month, 10)
    const d = parseInt(day, 10)

    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return {
        normalized: `${year}-${month}-${day}`,
        format: "YYYYMMDD"
      }
    }
  }

  // Format 5: DDMMYY (compact 6-digit format)
  const sixDigitMatch = cleaned.match(/^(\d{6})$/)
  if (sixDigitMatch) {
    const [, full] = sixDigitMatch
    const day = full.substring(0, 2)
    const month = full.substring(2, 4)
    const year = "20" + full.substring(4, 6) // Assume 20xx
    const d = parseInt(day, 10)
    const m = parseInt(month, 10)

    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return {
        normalized: `${year}-${month}-${day}`,
        format: "DDMMYY"
      }
    }
  }

  // Format 6: Try JavaScript Date parsing as last resort
  const jsDate = new Date(cleaned)
  if (!isNaN(jsDate.getTime())) {
    const year = jsDate.getFullYear()
    if (year >= 1900 && year <= 2100) {
      return {
        normalized: jsDate.toISOString().split("T")[0],
        format: "JS_NATIVE"
      }
    }
  }

  return { normalized: null, format: "UNRECOGNIZED" }
}

/**
 * Main normalization function: converts raw expiry date value to ISO format
 * 
 * Handles:
 * - Excel serial dates (numeric)
 * - String dates in multiple formats
 * - Returns raw string if parsing fails (instead of null/"-")
 * - Includes detailed debug logging
 * 
 * @param rawValue - Any value that might be a date (number, string, null, etc.)
 * @returns ExpiryDateParseResult with normalized date and debug info
 * 
 * @example
 * // Excel serial date
 * normalizeExpiryDate(45000) 
 * // → { normalized: "2023-01-20", raw: "45000", isExcelDate: true, ... }
 * 
 * // String date
 * normalizeExpiryDate("15/01/2025")
 * // → { normalized: "2025-01-15", raw: "15/01/2025", isExcelDate: false, ... }
 * 
 * // Unrecognized format
 * normalizeExpiryDate("unknown-format")
 * // → { normalized: null, raw: "unknown-format", isExcelDate: false, ... }
 */
export function normalizeExpiryDate(rawValue: any): ExpiryDateParseResult {
  const debugSteps: string[] = []

  try {
    debugSteps.push(`Input type: ${typeof rawValue}, value: "${rawValue}"`)

    // Handle null/undefined/empty
    if (rawValue === null || rawValue === undefined || rawValue === "") {
      debugSteps.push("Empty value detected")
      return {
        normalized: null,
        raw: String(rawValue),
        isExcelDate: false,
        parsedFormat: "EMPTY",
        debugLog: debugSteps.join(" → ")
      }
    }

    // Handle numeric values (Excel serial dates)
    if (typeof rawValue === "number" || /^\d+(\.\d+)?$/.test(String(rawValue))) {
      const numValue = typeof rawValue === "number" ? rawValue : parseFloat(String(rawValue))
      debugSteps.push(`Numeric value detected: ${numValue}`)

      const excelParsed = parseExcelDate(numValue)
      if (excelParsed) {
        debugSteps.push(`Excel date parsed: ${excelParsed}`)
        return {
          normalized: excelParsed,
          raw: String(rawValue),
          isExcelDate: true,
          parsedFormat: "EXCEL_SERIAL",
          debugLog: debugSteps.join(" → ")
        }
      }
      debugSteps.push("Not a valid Excel date")
    }

    // Handle string values
    const strValue = String(rawValue).trim()
    debugSteps.push(`String value: "${strValue}"`)

    const { normalized, format } = parseDateString(strValue)

    if (normalized) {
      debugSteps.push(`Parsed as ${format}: ${normalized}`)
      return {
        normalized,
        raw: strValue,
        isExcelDate: false,
        parsedFormat: format,
        debugLog: debugSteps.join(" → ")
      }
    }

    debugSteps.push(`Could not parse as date, keeping raw string`)
    // IMPORTANT: Return raw string instead of null
    return {
      normalized: null,
      raw: strValue,
      isExcelDate: false,
      parsedFormat: "UNRECOGNIZED",
      debugLog: debugSteps.join(" → ")
    }
  } catch (error) {
    debugSteps.push(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    return {
      normalized: null,
      raw: String(rawValue),
      isExcelDate: false,
      parsedFormat: "ERROR",
      debugLog: debugSteps.join(" → ")
    }
  }
}
