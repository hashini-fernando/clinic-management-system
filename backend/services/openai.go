package services

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	openai "github.com/sashabaranov/go-openai"

	"clinic-system/backend/models"
)

type OpenAIService struct {
	client *openai.Client
}

func NewOpenAIService(apiKey string) *OpenAIService {
	return &OpenAIService{
		client: openai.NewClient(apiKey),
	}
}

/* ===========================
   NORMALIZATION MAPS
=========================== */

// termMap resolves medical abbreviations to standard terms
var termMap = map[string]string{
	// Symptoms & Findings
	"sob":   "Shortness of Breath (SOB)",
	"c/o":   "Complains of",
	"h/o":   "History of",
	"k/c/o": "Known Case of",
	"c/c":   "Chief Complaint",

	// Conditions
	"htn":  "Hypertension (HTN)",
	"dm":   "Diabetes Mellitus (DM)",
	"dm2":  "Type 2 Diabetes Mellitus",
	"ihd":  "Ischaemic Heart Disease (IHD)",
	"urti": "Upper Respiratory Tract Infection (URTI)",
	"lrti": "Lower Respiratory Tract Infection (LRTI)",
	"uti":  "Urinary Tract Infection (UTI)",
	"gerd": "Gastro-Oesophageal Reflux Disease (GERD)",

	// Lab tests
	"fbs":   "FBS",
	"ppbs":  "PPBS",
	"cxr":   "CXR",
	"ufr":   "UFR",
	"esr":   "ESR",
	"lft":   "LFT",
	"tft":   "TFT",
	"rft":   "RFT",
	"kft":   "KFT",
	"lipid": "Lipid Profile",
	"usg":   "Ultrasound",

	// Drugs
	"pcm":  "Paracetamol (PCM)",
	"amox": "Amoxicillin",
	"ibu":  "Ibuprofen",
	"omep": "Omeprazole",
	"met":  "Metformin",
}

// preserveCase keeps medical acronyms in correct case
var preserveCase = map[string]string{
	"cbc":   "CBC",
	"fbc":   "FBC",
	"hba1c": "HbA1c",
	"ecg":   "ECG",
	"echo":  "Echo",
	"mri":   "MRI",
	"ct":    "CT Scan",
	"bp":    "BP",
	"spo2":  "SpO2",
	"f/u":   "F/U",
}

// freqMap — format: "expanded (ABBREV)"
var freqMap = map[string]string{
	"od":    "once daily (OD)",
	"bd":    "twice daily (BD)",
	"bid":   "twice daily (BD)",
	"tds":   "three times daily (TDS)",
	"tid":   "three times daily (TDS)",
	"qid":   "four times daily (QID)",
	"nocte": "at night (Nocte)",
	"prn":   "as needed (PRN)",
	"sos":   "if needed (SOS)",
	"mane":  "in the morning (Mane)",
	"hs":    "at bedtime (HS)",
	"ac":    "before meals (AC)",
	"pc":    "after meals (PC)",
	"stat":  "immediately (Stat)",
}

/* ===========================
   NORMALIZATION HELPERS
=========================== */

// normalizeTerm converts abbreviations to standard medical terms
func normalizeTerm(term string) string {
	trimmed := strings.TrimSpace(term)
	if trimmed == "" {
		return ""
	}

	lower := strings.ToLower(trimmed)

	if val, ok := termMap[lower]; ok {
		return val
	}
	if val, ok := preserveCase[lower]; ok {
		return val
	}

	return trimmed
}

// normalizeFrequency converts frequency abbreviations
func normalizeFrequency(freq string) string {
	trimmed := strings.TrimSpace(freq)
	if trimmed == "" {
		return ""
	}

	lower := strings.ToLower(trimmed)

	if val, ok := freqMap[lower]; ok {
		return val
	}

	// q6h → every 6 hours
	reQH := regexp.MustCompile(`^q\s*(\d+)\s*h$`)
	if m := reQH.FindStringSubmatch(lower); len(m) > 1 {
		return "every " + m[1] + " hours"
	}

	return trimmed
}

// normalizeDuration converts duration shorthand
// Supports Sri Lankan medical notation (3/7, 2/52, 1/12)
func normalizeDuration(duration string) string {
	trimmed := strings.TrimSpace(duration)
	if trimmed == "" {
		return ""
	}

	lower := strings.ToLower(trimmed)

	// x3d → 3 days
	reXD := regexp.MustCompile(`^x\s*(\d+)\s*d$`)
	if m := reXD.FindStringSubmatch(lower); len(m) > 1 {
		return m[1] + " days"
	}

	// x2w → 2 weeks
	reXW := regexp.MustCompile(`^x\s*(\d+)\s*w$`)
	if m := reXW.FindStringSubmatch(lower); len(m) > 1 {
		return m[1] + " weeks"
	}

	// 3/7 → 3 days
	reSlash7 := regexp.MustCompile(`^(\d+)\s*/\s*7$`)
	if m := reSlash7.FindStringSubmatch(lower); len(m) > 1 {
		return m[1] + " days"
	}

	// 2/52 → 2 weeks
	reSlash52 := regexp.MustCompile(`^(\d+)\s*/\s*52$`)
	if m := reSlash52.FindStringSubmatch(lower); len(m) > 1 {
		return m[1] + " weeks"
	}

	// 1/12 → 1 month
	reSlash12 := regexp.MustCompile(`^(\d+)\s*/\s*12$`)
	if m := reSlash12.FindStringSubmatch(lower); len(m) > 1 {
		return m[1] + " month(s)"
	}

	return trimmed
}

// applyPreserveCaseInText fixes known medical terms inside free text
func applyPreserveCaseInText(text string) string {
	result := text

	for raw, proper := range preserveCase {
		re := regexp.MustCompile(`(?i)\b` + regexp.QuoteMeta(raw) + `\b`)
		result = re.ReplaceAllString(result, proper)
	}

	reMMol := regexp.MustCompile(`(?i)\bmmol/l\b`)
	result = reMMol.ReplaceAllString(result, "mmol/L")

	return result
}

// expandAbbreviationsInPhrase expands abbreviations word by word
// but skips tokens already inside brackets like (HTN), (DM)
func expandAbbreviationsInPhrase(phrase string) string {
	words := strings.Fields(phrase)

	for i, word := range words {
		clean := strings.Trim(word, ".,;:()")
		if clean == "" {
			continue
		}

		trimmedWord := strings.TrimSpace(word)

		isBracketedAbbrev :=
			strings.HasPrefix(trimmedWord, "(") &&
				(strings.HasSuffix(trimmedWord, ")") ||
					strings.HasSuffix(trimmedWord, ").") ||
					strings.HasSuffix(trimmedWord, "),") ||
					strings.HasSuffix(trimmedWord, ");") ||
					strings.HasSuffix(trimmedWord, "):"))

		if isBracketedAbbrev {
			continue
		}

		expanded := normalizeTerm(clean)
		if expanded != clean {
			words[i] = strings.ReplaceAll(word, clean, expanded)
		}
	}

	return applyPreserveCaseInText(strings.Join(words, " "))
}

// normalizeObservation normalizes text and strips common heading prefixes
func normalizeObservation(note string) string {
	trimmed := strings.TrimSpace(note)
	if trimmed == "" {
		return ""
	}

	original := trimmed
	lower := strings.ToLower(trimmed)

	// Remove common clinical prefixes
	prefixes := []string{
		"impression:",
		"diagnosis:",
		"assessment:",
		"plan:",
		"finding:",
		"note:",
		"clinical note:",
		"observation:",
	}
	for _, prefix := range prefixes {
		if strings.HasPrefix(lower, prefix) {
			original = strings.TrimSpace(original[len(prefix):])
			lower = strings.ToLower(original)
			break
		}
	}

	// Standardize negations to "No X"
	for _, prefix := range []string{"denies ", "without "} {
		if strings.HasPrefix(lower, prefix) {
			base := strings.TrimSpace(original[len(prefix):])
			return "No " + expandAbbreviationsInPhrase(base)
		}
	}

	if strings.HasPrefix(lower, "no ") {
		base := strings.TrimSpace(original[len("no "):])
		return "No " + expandAbbreviationsInPhrase(base)
	}

	return expandAbbreviationsInPhrase(original)
}

// isDemographicObservation blocks age/gender lines from being stored as observations
func isDemographicObservation(note string) bool {
	lower := strings.ToLower(strings.TrimSpace(note))
	if lower == "" {
		return false
	}

	patterns := []*regexp.Regexp{
		regexp.MustCompile(`^\d{1,3}\s*(year|years)\s*old\s*(male|female|lady|man|gentleman|other)$`),
		regexp.MustCompile(`^\d{1,3}\s*y/o\s*(male|female|lady|man|gentleman|other)$`),
		regexp.MustCompile(`^\d{1,3}\s*(year|years)\s*old$`),
		regexp.MustCompile(`^(male|female|lady|man|gentleman|other)$`),
	}

	for _, re := range patterns {
		if re.MatchString(lower) {
			return true
		}
	}

	return false
}

/* ===========================
   VALIDATION + CLEANUP
=========================== */

// ValidateParsedResult cleans, normalizes and validates AI output
func ValidateParsedResult(result *models.ParsedResult) error {
	// Clean & Normalize Drugs
	validDrugs := []models.DrugItem{}
	seenDrugs := map[string]bool{}

	for _, drug := range result.Drugs {
		name := normalizeTerm(drug.Name)
		if name == "" {
			continue
		}

		drug.Name = name
		drug.Dosage = strings.TrimSpace(drug.Dosage)
		drug.Frequency = normalizeFrequency(drug.Frequency)
		drug.Duration = normalizeDuration(drug.Duration)

		key := strings.ToLower(strings.TrimSpace(
			drug.Name + "|" + drug.Dosage + "|" + drug.Frequency + "|" + drug.Duration,
		))
		if seenDrugs[key] {
			continue
		}
		seenDrugs[key] = true
		validDrugs = append(validDrugs, drug)
	}
	result.Drugs = validDrugs

	// Clean & Normalize Lab Tests
	validLabs := []models.LabTestItem{}
	seenLabs := map[string]bool{}

	for _, lab := range result.LabTests {
		name := normalizeTerm(lab.Name)
		if name == "" {
			continue
		}

		lab.Name = name
		lab.Notes = strings.TrimSpace(lab.Notes)

		key := strings.ToLower(strings.TrimSpace(lab.Name + "|" + lab.Notes))
		if seenLabs[key] {
			continue
		}
		seenLabs[key] = true
		validLabs = append(validLabs, lab)
	}
	result.LabTests = validLabs

	// Clean & Normalize Observations
	validObs := []models.ObservationItem{}
	seenObs := map[string]bool{}

	for _, obs := range result.Observations {
		note := normalizeObservation(obs.Note)
		if note == "" {
			continue
		}

		if isDemographicObservation(note) {
			continue
		}

		obs.Note = note
		key := strings.ToLower(strings.TrimSpace(obs.Note))
		if seenObs[key] {
			continue
		}
		seenObs[key] = true
		validObs = append(validObs, obs)
	}
	result.Observations = validObs

	// Reject if completely empty after cleaning
	if len(result.Drugs) == 0 &&
		len(result.LabTests) == 0 &&
		len(result.Observations) == 0 {
		return fmt.Errorf("AI could not extract any medical information from the notes")
	}

	return nil
}

/* ===========================
   MAIN PARSER
=========================== */

// ParseClinicNotes sends notes to OpenAI and returns
// structured, normalized, validated medical data
func (s *OpenAIService) ParseClinicNotes(rawInput string) (*models.ParsedResult, error) {
	prompt := fmt.Sprintf(`You are an expert medical text classifier for a clinic management system.
You have deep knowledge of pharmaceuticals, medical abbreviations, and clinical procedures.

Analyze the following doctor's notes and extract ALL structured medical information.

Doctor's Notes:
"%s"

You MUST respond with ONLY a valid JSON object in exactly this format.
No explanation. No markdown. Just JSON:
{
  "drugs": [
    {
      "name": "drug name (brand or generic)",
      "dosage": "dosage amount or empty string",
      "frequency": "how often or empty string",
      "duration": "how long or empty string",
      "confidence": 0.95
    }
  ],
  "lab_tests": [
    {
      "name": "test name",
      "notes": "special instructions or empty string",
      "confidence": 0.95
    }
  ],
  "observations": [
    {
      "note": "clinical observation, symptom, vital sign, negative finding, impression, or follow-up note",
      "confidence": 0.90
    }
  ]
}

Confidence Score Rules:
- confidence is a float between 0.0 and 1.0
- 0.95 to 1.0 = very clear and explicit in notes
- 0.80 to 0.94 = reasonably clear
- 0.60 to 0.79 = implied or inferred
- below 0.60 = uncertain extraction

Classification Rules:

DRUGS:
- Extract ALL medications: brand names, generic names, and abbreviations
- Common abbreviations include PCM=Paracetamol, Amox=Amoxicillin, etc.
- Extract dosage, frequency, and duration if mentioned
- Frequency abbreviations: BD=twice daily, TDS=three times daily,
  OD=once daily, PRN=as needed, Nocte=at night, Stat=immediately

LAB TESTS:
- Extract ALL investigations: blood tests, urine tests, imaging,
  cultures, biopsies, ECG, Echo, X-Ray, MRI, CT, Ultrasound
- Keep test names short (CBC, LFT, ECG)

OBSERVATIONS:
- Extract ALL symptoms, vitals, clinical findings, negative findings,
  impressions, referrals, and follow-up notes
- Keep negations: "no fever", "denies cough", "without wheeze"
- Include follow-up notes: "review in 1 week", "follow up after antibiotics"
- Include impressions: "likely URTI", "possible ACS", "clinically stable"
- Include referrals/plans: "refer to cardiologist"
- Do NOT include demographic text like age or gender in observations

Return empty array [] if nothing found for a category.
Do NOT invent information not in the notes.`, rawInput)

	resp, err := s.client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model: openai.GPT4oMini,
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    openai.ChatMessageRoleSystem,
					Content: "You are a medical text classifier. Always respond with valid JSON only. Never add markdown, code fences, or explanation.",
				},
				{
					Role:    openai.ChatMessageRoleUser,
					Content: prompt,
				},
			},
			Temperature: 0.1,
		},
	)
	if err != nil {
		return nil, fmt.Errorf("openai API error: %w", err)
	}

	// Strip markdown fences if the model adds them
	responseText := strings.TrimSpace(resp.Choices[0].Message.Content)
	responseText = strings.TrimPrefix(responseText, "```json")
	responseText = strings.TrimPrefix(responseText, "```")
	responseText = strings.TrimSuffix(responseText, "```")
	responseText = strings.TrimSpace(responseText)

	// Parse JSON
	var result models.ParsedResult
	if err := json.Unmarshal([]byte(responseText), &result); err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %w; raw=%s", err, responseText)
	}

	// Validate + normalize AI output only
	if err := ValidateParsedResult(&result); err != nil {
		return nil, err
	}

	return &result, nil
}