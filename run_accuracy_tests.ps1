#!/usr/bin/env pwsh
# ================================================
# ABC Health Clinic - AI Accuracy Test Runner
# Runs 10 test cases against the API and generates
# a markdown report with actual results
# ================================================

$BASE_URL   = "http://localhost:8000/api"
$REPORT_FILE = "docs\AI_ACCURACY_REPORT_ACTUAL.md"

Write-Host ""
Write-Host "ABC Health Clinic - AI Accuracy Test Runner"
Write-Host "============================================"
Write-Host ""

# ── Step 1: Create test patient ──────────────────
Write-Host "Creating test patient..."

$patientBody = '{"name":"Test Patient","age":35,"gender":"male","phone":"0771234567","address":"Colombo"}'

try {
    $patientResp = Invoke-RestMethod `
        -Method POST `
        -Uri "$BASE_URL/patients" `
        -ContentType "application/json" `
        -Body $patientBody

    $PATIENT_ID = $patientResp.id
    Write-Host "Test patient created - ID: $PATIENT_ID"
} catch {
    Write-Host "ERROR: Failed to create patient. Is the backend running?"
    Write-Host "Run: cd backend && go run main.go"
    exit 1
}

# ── Test Cases ────────────────────────────────────
$testCases = @(
    @{
        name  = "Basic Fever Case"
        input = "Fever 2 days. PCM 500mg bd. CBC ordered. Follow up in 3 days."
        expected_drugs = 1
        expected_labs  = 1
        expected_obs   = 2
    },
    @{
        name  = "Abbreviations and Vitals"
        input = "HTN k/c/o. BP 150/90. Pulse 88bpm. Amlodipine 5mg od. LFT RFT ordered."
        expected_drugs = 1
        expected_labs  = 2
        expected_obs   = 3
    },
    @{
        name  = "Complex Respiratory Case"
        input = "Cough and SOB x 3 days. Temp 38.5. SpO2 96%. Amoxicillin 500mg tds x7d. Paracetamol 500mg bd prn. CBC, CXR ordered. Likely URTI. F/U 1/52."
        expected_drugs = 2
        expected_labs  = 2
        expected_obs   = 4
    },
    @{
        name  = "Diabetes Management"
        input = "DM patient. HbA1c 9.2%. Known diabetic since 2015. Glucophage 500mg bd with meals. Insulin Mixtard 30 units morning. FBS, PPBS weekly. Review with reports in 2 weeks."
        expected_drugs = 2
        expected_labs  = 2
        expected_obs   = 3
    },
    @{
        name  = "Cardiac Case"
        input = "55 year old male. Chest pain and SOB. BP 155/95. Pulse 92. SpO2 94%. Amlodipine 5mg od. Aspirin 75mg od. Atorvastatin 20mg nocte. ECG, Echo, Troponin, Lipid Profile. Impression: Possible ACS. Refer to cardiologist."
        expected_drugs = 3
        expected_labs  = 4
        expected_obs   = 5
    },
    @{
        name  = "Negations and Negative Findings"
        input = "Patient c/o headache. No fever. Denies vomiting. Without chest pain. BP 120/80 normal. Paracetamol 500mg bd prn. No investigations needed. Review in 1 week if not improving."
        expected_drugs = 1
        expected_labs  = 0
        expected_obs   = 4
    },
    @{
        name  = "Sri Lankan Medical Notation"
        input = "Throat infection. Temp 37.8. Tonsils inflamed. Amoxicillin 250mg tds 5/7. PCM 500mg bd 3/7 prn. Throat swab C&S. FBC. Review 1/52."
        expected_drugs = 2
        expected_labs  = 2
        expected_obs   = 3
    },
    @{
        name  = "Multiple Conditions"
        input = "Known HTN and DM. Poor control. BP 160/100. FBS 14.2 mmol/L. HbA1c 10.1%. Metformin 500mg bd. Amlodipine 10mg od. Losartan 50mg od. HbA1c, FBS, LFT, RFT, Lipid Profile. Diet counselling given. F/U 1/12."
        expected_drugs = 3
        expected_labs  = 5
        expected_obs   = 4
    },
    @{
        name  = "Minimal Input Edge Case"
        input = "fever cough paracetamol blood test"
        expected_drugs = 1
        expected_labs  = 1
        expected_obs   = 2
    },
    @{
        name  = "Conversational Free Text"
        input = "Patient is a 45 year old lady who came with complaints of burning urination for the past 3 days. She also has mild lower abdominal pain. No fever. Temperature 37.1. BP 118/76. Started on Ciprofloxacin 500mg twice daily for 5 days. Also give Paracetamol 500mg as needed for pain. Send urine for full report and culture sensitivity. Review after completing antibiotics."
        expected_drugs = 2
        expected_labs  = 2
        expected_obs   = 
    }
)

# ── Run test cases ────────────────────────────────
Write-Host ""
Write-Host "Running 10 test cases..."
Write-Host ""

$results     = @()
$passedCases = 0

foreach ($tc in $testCases) {
    Write-Host "  $($tc.name)..." -NoNewline

    $body = @{
        patient_id = $PATIENT_ID
        raw_input  = $tc.input
    } | ConvertTo-Json

    try {
        $resp   = Invoke-RestMethod `
            -Method POST `
            -Uri "$BASE_URL/visits/parse" `
            -ContentType "application/json" `
            -Body $body

        $parsed = $resp.parsed_result

        $drugsFound = $parsed.drugs.Count
        $labsFound  = $parsed.lab_tests.Count
        $obsFound   = $parsed.observations.Count

        $dExp = $tc.expected_drugs
        $lExp = $tc.expected_labs
        $oExp = $tc.expected_obs

        # Precision = min(found, expected) / found
        $dPrec = if ($drugsFound -eq 0 -and $dExp -eq 0) { 100 }
                 elseif ($drugsFound -eq 0) { 0 }
                 else { [math]::Round([math]::Min($drugsFound, $dExp) * 100.0 / $drugsFound, 1) }

        $lPrec = if ($labsFound -eq 0 -and $lExp -eq 0) { 100 }
                 elseif ($labsFound -eq 0) { 0 }
                 else { [math]::Round([math]::Min($labsFound, $lExp) * 100.0 / $labsFound, 1) }

        $oPrec = if ($obsFound -eq 0 -and $oExp -eq 0) { 100 }
                 elseif ($obsFound -eq 0) { 0 }
                 else { [math]::Round([math]::Min($obsFound, $oExp) * 100.0 / $obsFound, 1) }

        # Recall = min(found, expected) / expected
        $dRec = if ($dExp -eq 0) { 100 }
                else { [math]::Round([math]::Min($drugsFound, $dExp) * 100.0 / $dExp, 1) }

        $lRec = if ($lExp -eq 0) { 100 }
                else { [math]::Round([math]::Min($labsFound, $lExp) * 100.0 / $lExp, 1) }

        $oRec = if ($oExp -eq 0) { 100 }
                else { [math]::Round([math]::Min($obsFound, $oExp) * 100.0 / $oExp, 1) }

        $macroPrec = [math]::Round(($dPrec + $lPrec + $oPrec) / 3, 1)
        $macroRec  = [math]::Round(($dRec + $lRec + $oRec) / 3, 1)
        $macroF1   = if (($macroPrec + $macroRec) -eq 0) { 0 }
                     else { [math]::Round(2 * $macroPrec * $macroRec / ($macroPrec + $macroRec), 1) }

        $passed = $macroF1 -ge 80
        if ($passed) { $passedCases++ }

        Write-Host " F1: $macroF1%"

        $results += @{
            name       = $tc.name
            input      = $tc.input
            drugNames  = ($parsed.drugs | ForEach-Object { $_.name }) -join ", "
            labNames   = ($parsed.lab_tests | ForEach-Object { $_.name }) -join ", "
            obsNames   = ($parsed.observations | ForEach-Object { $_.note }) -join ", "
            drugsFound = $drugsFound
            labsFound  = $labsFound
            obsFound   = $obsFound
            dPrec      = $dPrec
            lPrec      = $lPrec
            oPrec      = $oPrec
            dRec       = $dRec
            lRec       = $lRec
            oRec       = $oRec
            macroPrec  = $macroPrec
            macroRec   = $macroRec
            macroF1    = $macroF1
            passed     = $passed
            visitId    = $resp.visit_id
        }

    } catch {
        Write-Host " ERROR: $($_.Exception.Message)"
        $results += @{
            name      = $tc.name
            input     = $tc.input
            error     = $_.Exception.Message
            macroF1   = 0
            passed    = $false
        }
    }
}

# ── Generate Report ───────────────────────────────
Write-Host ""
Write-Host "Generating report..."

if (-not (Test-Path "docs")) {
    New-Item -ItemType Directory -Path "docs" | Out-Null
}

$date     = Get-Date -Format "yyyy-MM-dd HH:mm"
$avgF1    = [math]::Round(($results | Measure-Object -Property macroF1   -Average).Average, 1)
$avgPrec  = [math]::Round(($results | Measure-Object -Property macroPrec -Average).Average, 1)
$avgRec   = [math]::Round(($results | Measure-Object -Property macroRec  -Average).Average, 1)

$report = @"
# AI Classification Accuracy Report
## ABC Health Clinic - Clinical Notes Parser
### Generated: $date

---

> This report was generated by running actual API calls against the live backend.
> All results are real outputs from the AI classification system.
> Script: run_accuracy_tests.ps1

---

## Test Environment

| Parameter | Value |
|-----------|-------|
| API URL | $BASE_URL |
| Model | GPT-4o Mini |
| Test Cases | 10 |
| Generated | $date |

---

## Overall Results

| Metric | Score |
|--------|-------|
| Macro Precision | $($avgPrec)% |
| Macro Recall | $($avgRec)% |
| Macro F1 Score | $($avgF1)% |
| Cases Passed (F1 >= 80%) | $passedCases / 10 |

---

## Per Test Case Results

"@

$num = 1
foreach ($r in $results) {
    $status = if ($r.passed) { "PASS" } else { "FAIL" }

    if ($r.error) {
        $report += @"

### Test $num - $($r.name) [$status]

**Input:**
``````
$($r.input)
``````

**Error:** $($r.error)

"@
    } else {
        $report += @"

### Test $num - $($r.name) [$status]

**Input:**
``````
$($r.input)
``````

**AI Output:**

| Category | Count | Items |
|----------|-------|-------|
| Drugs | $($r.drugsFound) | $($r.drugNames) |
| Lab Tests | $($r.labsFound) | $($r.labNames) |
| Observations | $($r.obsFound) | $($r.obsNames) |

**Metrics:**

| | Drugs | Labs | Observations | Macro |
|-|-------|------|-------------|-------|
| Precision | $($r.dPrec)% | $($r.lPrec)% | $($r.oPrec)% | $($r.macroPrec)% |
| Recall | $($r.dRec)% | $($r.lRec)% | $($r.oRec)% | $($r.macroRec)% |
| F1 Score | - | - | - | $($r.macroF1)% |

"@
    }
    $num++
}

$report += @"

---

## Summary Table

| # | Test Case | Precision | Recall | F1 | Result |
|---|-----------|-----------|--------|----|--------|
"@

$num = 1
foreach ($r in $results) {
    $result = if ($r.passed) { "PASS" } else { "FAIL" }
    $report += "| $num | $($r.name) | $($r.macroPrec)% | $($r.macroRec)% | $($r.macroF1)% | $result |`n"
    $num++
}

$report += @"
| | **Average** | **$($avgPrec)%** | **$($avgRec)%** | **$($avgF1)%** | |

---

## Methodology

| Term | Formula | Meaning |
|------|---------|---------|
| Precision | min(found, expected) / found x 100 | Of AI found, how many correct |
| Recall | min(found, expected) / expected x 100 | Of real items, how many AI found |
| F1 Score | 2 x P x R / (P + R) | Harmonic mean of Precision and Recall |
| Macro Average | Average across Drugs, Labs, Observations | Standard for multi-label classification |
| Pass Threshold | F1 >= 80% | Minimum acceptable accuracy |

---

*Generated by run_accuracy_tests.ps1*
*Real API results - not manually written*
"@

$report | Out-File -FilePath $REPORT_FILE -Encoding UTF8

Write-Host ""
Write-Host "============================================"
Write-Host "Report saved: $REPORT_FILE"
Write-Host ""
Write-Host "  Macro Precision : $avgPrec%"
Write-Host "  Macro Recall    : $avgRec%"
Write-Host "  Macro F1 Score  : $avgF1%"
Write-Host "  Cases Passed    : $passedCases / 10"
Write-Host "============================================"
Write-Host ""