export async function callClaude(memberData, policies, regulations, apiKey) {
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

Given member data, insurance policies, and regulations, determine which validation checks are needed for this specific type of request.

Return ONLY a JSON array of validation objects. No other text. No markdown. No code fences.

Each validation object must have:
{
  "id": "val_001",
  "name": "Short name (e.g. 'Age verification')",
  "description": "What this check does",
  "category": "identity" | "eligibility" | "financial" | "regulatory" | "policy",
  "rule": "The specific condition being checked (e.g. 'age >= 67 for male members')",
  "field": "The input field being checked (must match a key in member data)",
  "expected": "What value would pass (e.g. '>= 67', '>= 90%', '<= 100000')",
  "severity": "blocking" | "warning" | "info",
  "source": "Which policy clause or regulation requires this (e.g. 'CL-4.3' or 'REG-2024-07')"
}

Analyze ALL policies and regulations provided. Generate validations for every applicable rule.

Standard checks to always include for withdrawal requests:
- Positive balance check (balance > 0)
- Age verification (age >= 18)
- ID photo confidence check (compare id_photo_confidence against threshold from regulations/policies)
- Bank account ownership (account_owner must match member_name)
- Any additional checks from policies and regulations

Order them logically: identity checks first (ID photo, bank account), then eligibility (age), then financial (balance, amounts), then policy-specific, then regulatory.
Generate between 5 and 12 validations depending on the complexity of the scenario.
Make sure validation rules reference the actual field names present in the member data.`

  const userMessage = `Generate validation checks for this ${useCaseLabel} request:

MEMBER DATA:
${JSON.stringify(memberData, null, 2)}

INSURANCE POLICIES:
${JSON.stringify(policies, null, 2)}

REGULATIONS:
${JSON.stringify(regulations, null, 2)}

Return only the JSON array.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error: ${response.status} — ${err}`)
  }

  const data = await response.json()
  const text = data.content[0].text

  // Parse JSON, handling possible markdown fences
  let jsonStr = text.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  return JSON.parse(jsonStr)
}
