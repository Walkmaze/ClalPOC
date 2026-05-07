const SENSITIVE_MEMBER_FIELDS = new Set([
  'member_id',
  'member_name',
  'member_name_he',
  'birth_date',
  'phone',
  'email',
  'account_number',
  'account_owner',
  'id_photo_confidence',
  'employer',
  'current_employer',
  'new_employer',
  'employment_end_date',
  'new_employment_start_date',
])

const SENSITIVE_BENEFICIARY_FIELDS = new Set(['name', 'name_he', 'id_number'])

const SENSITIVE_CONTRACT_FIELDS = new Set(['customer_name', 'customer_name_he'])

const BENEFICIARY_KEYS = new Set(['current_beneficiaries', 'new_beneficiaries'])

const REDACTED = '[REDACTED]'

function redactMemberData(memberData) {
  const result = {}
  for (const [key, value] of Object.entries(memberData)) {
    if (SENSITIVE_MEMBER_FIELDS.has(key)) {
      result[key] = REDACTED
    } else if (BENEFICIARY_KEYS.has(key) && Array.isArray(value)) {
      result[key] = value.map(redactBeneficiary)
    } else {
      result[key] = value
    }
  }
  return result
}

function redactBeneficiary(beneficiary) {
  const result = {}
  for (const [key, value] of Object.entries(beneficiary)) {
    result[key] = SENSITIVE_BENEFICIARY_FIELDS.has(key) ? REDACTED : value
  }
  return result
}

function redactContract(contract) {
  const result = {}
  for (const [key, value] of Object.entries(contract)) {
    result[key] = SENSITIVE_CONTRACT_FIELDS.has(key) ? REDACTED : value
  }
  return result
}

export async function callClaude(memberData, contract, regulations, apiKey) {
  const useCase = memberData.use_case || 'withdrawal'
  const useCaseLabels = {
    withdrawal: 'fund withdrawal',
    fund_transfer: 'fund transfer between investment tracks',
    beneficiary_update: 'beneficiary update/change',
    employer_change: 'employer change and fund transfer',
    early_redemption: 'early fund redemption',
  }
  const useCaseLabel = useCaseLabels[useCase] || useCase

  const systemPrompt = `You are a validation engine for an insurance fund management system.
You are processing a "${useCaseLabel}" request.

Given member data, a customer contract (specific terms for this member), and government regulations (apply to all members), determine which validation checks are needed for this specific type of request.

Return ONLY a JSON array of validation objects. No other text. No markdown. No code fences.

Each validation object must have:
{
  "id": "val_001",
  "name": "Short name in English (e.g. 'Age verification')",
  "nameHe": "Short name in Hebrew (e.g. 'אימות גיל')",
  "description": "What this check does in English",
  "descriptionHe": "What this check does in Hebrew",
  "category": "identity" | "eligibility" | "financial" | "regulatory" | "contract",
  "rule": "The specific condition being checked (e.g. 'age >= 67 for male members')",
  "field": "The input field being checked (must match a key in member data)",
  "expected": "What value would pass (e.g. '>= 67', '>= 90%', '<= 100000')",
  "severity": "blocking" | "warning" | "info",
  "source": "Which contract clause or regulation requires this (e.g. 'CL-4.3' or 'REG-2024-07')",
  "requires_hitl": false
}

IMPORTANT: Every validation MUST include both English and Hebrew fields (name/nameHe, description/descriptionHe). Use professional Hebrew insurance terminology.

For validations that require human review (based on contract clauses with consequence "require_hitl", or regulatory requirements that mandate human oversight), set:
- "requires_hitl": true
- "hitl_reason": why human intervention is needed (English)
- "hitl_reasonHe": why human intervention is needed (Hebrew)
- "hitl_steps": an array of 2-4 sequential review steps, each with:
  - "step_id": unique identifier (e.g. "hitl_1")
  - "title": short step name (English)
  - "titleHe": short step name (Hebrew)
  - "description": what the human needs to do (English)
  - "descriptionHe": what the human needs to do (Hebrew)
  - "fields": array of form fields with name, type (text/textarea/select/number/date/checkbox), label, labelHe, and options (for select type)

Design the HITL steps to be logical and progressive:
- Step 1: Usually verification/data gathering
- Step 2: Analysis/review of the specific issue
- Step 3: Decision or resolution
- Optional Step 4: Additional documentation if needed

The fields should be specific to the type of problem, not generic. For example:
- ID verification failure → steps for manual document review, face match assessment, document authenticity
- High-value transaction → steps for compliance check, AML screening, manager approval
- Age/eligibility issue → steps for exception review, documentation verification, policy override decision
- Fraud review → steps for transaction pattern analysis, customer contact verification, risk assessment

IMPORTANT: The final step of every HITL validation MUST include a field named "decision" of type "select" with options ["Approve", "Reject", "Escalate further"].

Analyze ALL contract clauses and regulations provided. Generate validations for every applicable rule.

Standard checks to always include for withdrawal requests:
- Positive balance check (balance > 0)
- Age verification (age >= 18)
- ID photo confidence check (compare id_photo_confidence against threshold from contract/regulations)
- Bank account ownership (account_owner must match member_name)
- Any additional checks from contract clauses and regulations

Order them logically: identity checks first (ID photo, bank account), then eligibility (age), then financial (balance, amounts), then contract-specific, then regulatory. Place HITL validations after the automated checks they relate to.
Generate between 5 and 12 validations depending on the complexity of the scenario.
Make sure validation rules reference the actual field names present in the member data.

PRIVACY NOTE: Personally identifiable values in the member data and contract (such as names, IDs, dates of birth, phones, emails, bank account numbers, employer names, and the ID photo confidence score) are replaced with "[REDACTED]". The field keys are still present. Generate validation rules that reference these field names as usual — the actual values will be evaluated locally, not by you.`

  const redactedMemberData = redactMemberData(memberData)
  const redactedContract = redactContract(contract)

  const userMessage = `Generate validation checks for this ${useCaseLabel} request:

MEMBER DATA:
${JSON.stringify(redactedMemberData, null, 2)}

CUSTOMER CONTRACT (specific terms for this member):
${JSON.stringify(redactedContract, null, 2)}

GOVERNMENT REGULATIONS (apply to all members):
${JSON.stringify(regulations, null, 2)}

Return only the JSON array.`

  const model = 'claude-sonnet-4-20250514'
  const maxTokens = 8000
  const requestedAt = new Date().toISOString()

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    const errorObj = new Error(`Claude API error: ${response.status} — ${err}`)
    errorObj.log = {
      model,
      maxTokens,
      requestedAt,
      respondedAt: new Date().toISOString(),
      system: systemPrompt,
      userMessage,
      rawResponse: err,
      error: true,
      status: response.status,
    }
    throw errorObj
  }

  const data = await response.json()
  const respondedAt = new Date().toISOString()
  const text = data.content[0].text

  const log = {
    model,
    maxTokens,
    requestedAt,
    respondedAt,
    system: systemPrompt,
    userMessage,
    rawResponse: text,
    usage: data.usage || null,
    stopReason: data.stop_reason || null,
  }

  // Parse JSON, handling possible markdown fences
  let jsonStr = text.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  const validations = JSON.parse(jsonStr)
  return { validations, log }
}
